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
        img_array = np.array(image)
        results = list(ocr.predict(img_array))
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
