"""
RecipeAId OCR sidecar service.

Accepts an image upload and returns the extracted text using EasyOCR.
The .NET backend calls this service; all recipe parsing happens there.

Supported languages: English (en), German (de).

Run:
    uvicorn main:app --port 8001

First run will download the EasyOCR English and German models (~200 MB each).
"""

import io
import logging

import easyocr
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RecipeAId OCR Service")

# Initialise once at startup — model download happens here on first run.
reader = easyocr.Reader(["en"], gpu=False, verbose=False)


@app.post("/ocr")
async def extract_text(file: UploadFile = File(...)) -> JSONResponse:
    """Extract text from an uploaded image.

    Returns:
        { "raw_text": "<extracted text>" }
    """
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
        results = reader.readtext(np.array(image), detail=1, paragraph=False)
    except Exception as exc:
        logger.error("EasyOCR failed: %s", exc)
        raise HTTPException(status_code=500, detail="OCR processing failed") from exc

    raw_text = "\n".join(_group_into_lines(results))
    logger.info("OCR extracted %d chars from %s", len(raw_text), file.filename)
    return JSONResponse({"raw_text": raw_text})


def _group_into_lines(results: list, y_threshold_ratio: float = 0.5) -> list[str]:
    """Group OCR text blocks into lines based on y-coordinate proximity.

    Uses bounding-box y-centers to decide which blocks share a visual line,
    then sorts each line left-to-right and joins with spaces.
    Lines are returned top-to-bottom — preserving the recipe's visual layout.
    """
    if not results:
        return []

    blocks = []
    for bbox, text, _conf in results:
        y_top = min(bbox[0][1], bbox[1][1])
        y_bottom = max(bbox[2][1], bbox[3][1])
        x_left = min(bbox[0][0], bbox[3][0])
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


@app.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok"})
