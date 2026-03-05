"""
RecipeAId OCR sidecar service.

Accepts an image upload and returns the extracted text using PaddleOCR (PP-OCRv5).
The .NET backend calls this service; all recipe parsing happens there.

Supported languages: English (en), German (de) — via the latin PP-OCRv5 model.

Run:
    uvicorn main:app --port 8001

First run will download the PaddleOCR models (~50 MB).
"""

import io
import logging
import math

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from paddleocr import PaddleOCR
from PIL import Image
from pydantic import BaseModel

app = FastAPI(title="RecipeAId OCR Service", docs_url="/docs")


class OcrResponse(BaseModel):
    raw_text: str


class HealthResponse(BaseModel):
    status: str

# Initialise once at startup — model download happens here on first run.
# lang="de" loads the latin PP-OCRv5 model which covers all 45 Latin-script
# languages including both German and English.
# Orientation/unwarping models are disabled — recipe card photos are taken
# right-way-up and don't need the extra PP-LCNet and UVDoc models.
ocr = PaddleOCR(
    lang="de",
    device="cpu",
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
)

# Re-apply logging config after PaddleOCR init, which resets the root logger.
logging.basicConfig(level=logging.INFO, force=True)
logger = logging.getLogger(__name__)


@app.post("/ocr", response_model=OcrResponse)
async def extract_text(file: UploadFile = File(...)) -> OcrResponse:
    """Extract text from an uploaded image."""
    logger.info("Request received: %s (%s)", file.filename, file.content_type)
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="File must be an image")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as exc:
        logger.warning("Failed to open image: %s", exc)
        raise HTTPException(status_code=422, detail="Cannot read image file") from exc

    try:
        img_bgr = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        img_preprocessed = preprocess(img_bgr)
        results = list(ocr.predict(img_preprocessed))
    except Exception as exc:
        logger.error("PaddleOCR failed: %s", exc)
        raise HTTPException(status_code=500, detail="OCR processing failed") from exc

    if not results:
        logger.info("OCR found no text in %s", file.filename)
        return OcrResponse(raw_text="")

    # Access the result directly as a dict — .json wraps everything under 'res'
    # which loses the top-level rec_texts/rec_polys keys.
    result = results[0]
    texts = result.get("rec_texts", [])
    if not texts:
        logger.info("OCR found no text in %s", file.filename)
        return OcrResponse(raw_text="")

    raw_text = "\n".join(
        _group_into_lines(
            texts,
            result.get("rec_scores", []),
            result.get("rec_polys", []),
        )
    )
    logger.info("OCR extracted %d chars from %s", len(raw_text), file.filename)
    return OcrResponse(raw_text=raw_text)


# ---------------------------------------------------------------------------
# Preprocessing pipeline
# ---------------------------------------------------------------------------

def preprocess(img_bgr: np.ndarray) -> np.ndarray:
    """Apply a four-stage preprocessing pipeline to reduce character error rate.

    1. Perspective correction — warp to a top-down rectangle if a card-shaped
       quadrilateral is detected via Canny edge detection + contour analysis.
    2. Denoising — median filter removes salt-and-pepper noise from physical
       card textures without smearing text edges.
    3. Deskewing — Hough line analysis finds the dominant text-line angle and
       rotates to straighten before feeding PaddleOCR.
    4. Adaptive thresholding — Gaussian adaptive threshold handles uneven
       lighting and yellowed paper better than global binarization.

    Every step falls back to the input image when no usable geometry is found,
    so the pipeline is safe for high-quality flat photos as well.

    Returns a 3-channel uint8 array (H×W×3) suitable for PaddleOCR.
    """
    img = _correct_perspective(img_bgr)
    img = _denoise(img)
    img = _deskew(img)
    img = _adaptive_threshold(img)
    return img


def _correct_perspective(img_bgr: np.ndarray) -> np.ndarray:
    """Warp the image to a top-down rectangle if a card-shaped quad is found.

    Detection strategy:
      - Gaussian blur → Canny edges → dilate to close gaps → find external contours
      - Take the 5 largest contours; keep the first that approximates to exactly
        4 vertices and covers at least 20% of the image area.
      - Apply getPerspectiveTransform to map it to a clean rectangle.

    Falls back to the unmodified input if no suitable quadrilateral is detected.
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)

    # Dilate edges to close small gaps between card border segments
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return img_bgr

    image_area = img_bgr.shape[0] * img_bgr.shape[1]
    quad = None
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:5]:
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(approx) == 4 and cv2.contourArea(approx) > 0.20 * image_area:
            quad = approx.reshape(4, 2).astype(np.float32)
            break

    if quad is None:
        return img_bgr

    quad = _order_corners(quad)

    width = int(max(
        np.linalg.norm(quad[1] - quad[0]),  # top edge
        np.linalg.norm(quad[2] - quad[3]),  # bottom edge
    ))
    height = int(max(
        np.linalg.norm(quad[3] - quad[0]),  # left edge
        np.linalg.norm(quad[2] - quad[1]),  # right edge
    ))

    dst_corners = np.array(
        [[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]],
        dtype=np.float32,
    )
    matrix = cv2.getPerspectiveTransform(quad, dst_corners)
    warped = cv2.warpPerspective(img_bgr, matrix, (width, height))
    quad_ratio = cv2.contourArea(quad.reshape(-1, 1, 2)) / image_area
    logger.info("Perspective correction applied (quad/image area: %.2f)", quad_ratio)
    return warped


def _order_corners(pts: np.ndarray) -> np.ndarray:
    """Return 4 corner points in [top-left, top-right, bottom-right, bottom-left] order.

    Uses coordinate sums and differences:
      - Top-left: smallest (x+y)   — Bottom-right: largest (x+y)
      - Top-right: smallest (y-x)  — Bottom-left: largest (y-x)
    """
    ordered = np.zeros((4, 2), dtype=np.float32)
    coord_sum = pts.sum(axis=1)
    coord_diff = np.diff(pts, axis=1).ravel()
    ordered[0] = pts[np.argmin(coord_sum)]   # top-left
    ordered[2] = pts[np.argmax(coord_sum)]   # bottom-right
    ordered[1] = pts[np.argmin(coord_diff)]  # top-right
    ordered[3] = pts[np.argmax(coord_diff)]  # bottom-left
    return ordered


def _denoise(img_bgr: np.ndarray) -> np.ndarray:
    """Apply a 3×3 median filter to remove salt-and-pepper noise from card textures.

    Median filtering preserves hard text edges better than Gaussian blurring
    while still smoothing out isolated bright/dark pixels from paper grain.
    """
    return cv2.medianBlur(img_bgr, 3)


def _deskew(img_bgr: np.ndarray) -> np.ndarray:
    """Rotate the image to correct text skew using probabilistic Hough lines.

    Steps:
      - Canny edge detection on the grayscale image
      - HoughLinesP to find line segments
      - Keep only near-horizontal lines (angle within ±45°)
      - Rotate by the median angle; skip if |angle| < 0.5° (negligible skew)
      - Uses BORDER_REPLICATE to avoid black border artefacts after rotation

    Falls back to the unmodified input when no dominant angle can be found.
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLinesP(
        edges, rho=1, theta=np.pi / 180, threshold=80,
        minLineLength=50, maxLineGap=10,
    )
    if lines is None or len(lines) == 0:
        return img_bgr

    angles: list[float] = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        dx, dy = x2 - x1, y2 - y1
        if abs(dx) < 1:
            continue
        angle_deg = math.degrees(math.atan2(dy, dx))
        if -45.0 <= angle_deg <= 45.0:
            angles.append(angle_deg)

    if not angles:
        return img_bgr

    median_angle = float(np.median(angles))
    if abs(median_angle) < 0.5:
        return img_bgr

    height, width = img_bgr.shape[:2]
    center = (width / 2, height / 2)
    rotation_matrix = cv2.getRotationMatrix2D(center, median_angle, 1.0)
    rotated = cv2.warpAffine(
        img_bgr, rotation_matrix, (width, height),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REPLICATE,
    )
    logger.info("Deskew applied: %.2f°", median_angle)
    return rotated


def _adaptive_threshold(img_bgr: np.ndarray) -> np.ndarray:
    """Binarize using Gaussian adaptive thresholding.

    Unlike global Otsu binarization, adaptive thresholding computes a local
    threshold for each pixel from its neighbourhood mean, making it robust to:
      - Shadows and uneven lamp/flash illumination
      - Yellowed or stained paper that shifts the global intensity distribution
      - Gradients from curved card surfaces

    Block size is derived from image height (~2.5% of rows, rounded to the
    nearest odd number) so the neighbourhood scales with image resolution.
    A constant C=10 is subtracted from each local mean to bias toward white
    backgrounds.

    Returns a 3-channel image so PaddleOCR receives the expected H×W×3 array.
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # Block size must be odd and at least 11
    raw_block_size = max(11, gray.shape[0] // 40)
    block_size = raw_block_size if raw_block_size % 2 == 1 else raw_block_size + 1

    binary = cv2.adaptiveThreshold(
        gray,
        maxValue=255,
        adaptiveMethod=cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        thresholdType=cv2.THRESH_BINARY,
        blockSize=block_size,
        C=10,
    )
    return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)


# ---------------------------------------------------------------------------
# Line grouping
# ---------------------------------------------------------------------------

def _group_into_lines(
    texts: list[str],
    scores: list[float],
    polys: list,
    y_threshold_ratio: float = 0.5,
) -> list[str]:
    """Group OCR text blocks into lines based on y-coordinate proximity.

    Uses bounding-box y-centers to decide which blocks share a visual line,
    then sorts each line left-to-right and joins with spaces.
    Lines are returned top-to-bottom — preserving the recipe's visual layout.

    Each poly is [[x1,y1],[x2,y2],[x3,y3],[x4,y4]] (quadrilateral).
    """
    if not texts:
        return []

    blocks = []
    for i, text in enumerate(texts):
        poly = polys[i]  # four corner points: top-left, top-right, bottom-right, bottom-left
        y_top = float(min(poly[0][1], poly[1][1]))
        y_bottom = float(max(poly[2][1], poly[3][1]))
        x_left = float(min(poly[0][0], poly[3][0]))
        blocks.append({
            "text": text,
            "y_center": (y_top + y_bottom) / 2,
            "x_left": x_left,
            "height": y_bottom - y_top,
        })

    blocks.sort(key=lambda b: b["y_center"])
    avg_height = sum(b["height"] for b in blocks) / len(blocks)
    threshold = avg_height * y_threshold_ratio

    lines: list[list[dict]] = [[blocks[0]]]
    for block in blocks[1:]:
        if abs(block["y_center"] - lines[-1][0]["y_center"]) <= threshold:
            lines[-1].append(block)
        else:
            lines.append([block])

    output = []
    for line in lines:
        line.sort(key=lambda b: b["x_left"])
        output.append(" ".join(b["text"] for b in line))
    return output


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")
