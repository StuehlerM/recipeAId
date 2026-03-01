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
        results = reader.readtext(image, detail=0, paragraph=True)
    except Exception as exc:
        logger.error("EasyOCR failed: %s", exc)
        raise HTTPException(status_code=500, detail="OCR processing failed") from exc

    raw_text = "\n".join(results)
    logger.info("OCR extracted %d chars from %s", len(raw_text), file.filename)
    return JSONResponse({"raw_text": raw_text})


@app.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok"})
