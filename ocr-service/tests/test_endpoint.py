"""
Unit tests for the OCR sidecar FastAPI endpoints.

PaddleOCR is mocked at the module level (see conftest.py), so `main.ocr` is a
MagicMock.  Individual tests patch `main.ocr.predict` to control what the OCR
"model" returns without touching any real weights.

Tests cover:
  - GET /health                          → always 200
  - POST /ocr  happy path               → 200, raw_text assembled from mock
  - POST /ocr  non-image content type   → 415
  - POST /ocr  empty file body          → 400
  - POST /ocr  corrupt image bytes      → 422
  - POST /ocr  OCR returns no results   → 200, empty raw_text
  - POST /ocr  multiple text blocks     → 200, blocks joined by newline
"""

import io
from unittest.mock import patch, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image

# conftest.py has already mocked paddleocr before this import.
import main as ocr_main
from main import app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_png_bytes(width: int = 100, height: int = 60) -> bytes:
    """Return a minimal valid PNG (white image) as bytes."""
    buf = io.BytesIO()
    Image.new("RGB", (width, height), "white").save(buf, format="PNG")
    return buf.getvalue()


def make_jpeg_bytes(width: int = 100, height: int = 60) -> bytes:
    """Return a minimal valid JPEG as bytes."""
    buf = io.BytesIO()
    Image.new("RGB", (width, height), "white").save(buf, format="JPEG")
    return buf.getvalue()


def fake_ocr_result(texts: list[str], scores: list[float] | None = None) -> list[dict]:
    """Build a minimal PaddleOCR result dict matching the shape main.py expects."""
    if scores is None:
        scores = [0.99] * len(texts)
    polys = [[[0, i * 25], [200, i * 25], [200, i * 25 + 20], [0, i * 25 + 20]] for i in range(len(texts))]
    return [{"rec_texts": texts, "rec_scores": scores, "rec_polys": polys}]


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health_returns_ok():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# POST /ocr — input validation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ocr_rejects_non_image_content_type():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/ocr",
            files={"file": ("doc.pdf", b"%PDF-1.4 fake", "application/pdf")},
        )
    assert resp.status_code == 415


@pytest.mark.asyncio
async def test_ocr_rejects_empty_file():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/ocr",
            files={"file": ("photo.jpg", b"", "image/jpeg")},
        )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_ocr_rejects_corrupt_image_bytes():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/ocr",
            files={"file": ("photo.jpg", b"not-an-image", "image/jpeg")},
        )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# POST /ocr — happy path
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ocr_returns_raw_text_from_single_block():
    with patch.object(ocr_main.ocr, "predict", return_value=fake_ocr_result(["2 cups flour"])):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/ocr",
                files={"file": ("recipe.png", make_png_bytes(), "image/png")},
            )
    assert resp.status_code == 200
    assert resp.json()["raw_text"] == "2 cups flour"


@pytest.mark.asyncio
async def test_ocr_returns_multiple_lines_joined_by_newline():
    texts = ["Chocolate Cake", "2 cups flour", "1 cup sugar"]
    with patch.object(ocr_main.ocr, "predict", return_value=fake_ocr_result(texts)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/ocr",
                files={"file": ("recipe.png", make_png_bytes(), "image/png")},
            )
    assert resp.status_code == 200
    raw = resp.json()["raw_text"]
    assert "Chocolate Cake" in raw
    assert "2 cups flour" in raw
    assert "1 cup sugar" in raw


@pytest.mark.asyncio
async def test_ocr_accepts_jpeg_upload():
    with patch.object(ocr_main.ocr, "predict", return_value=fake_ocr_result(["Pancakes"])):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/ocr",
                files={"file": ("recipe.jpg", make_jpeg_bytes(), "image/jpeg")},
            )
    assert resp.status_code == 200
    assert "Pancakes" in resp.json()["raw_text"]


# ---------------------------------------------------------------------------
# POST /ocr — edge cases
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ocr_returns_empty_text_when_model_finds_nothing():
    with patch.object(ocr_main.ocr, "predict", return_value=[]):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/ocr",
                files={"file": ("blank.png", make_png_bytes(), "image/png")},
            )
    assert resp.status_code == 200
    assert resp.json()["raw_text"] == ""


@pytest.mark.asyncio
async def test_ocr_returns_empty_text_when_rec_texts_is_empty():
    with patch.object(ocr_main.ocr, "predict", return_value=[{"rec_texts": [], "rec_scores": [], "rec_polys": []}]):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/ocr",
                files={"file": ("blank.png", make_png_bytes(), "image/png")},
            )
    assert resp.status_code == 200
    assert resp.json()["raw_text"] == ""


@pytest.mark.asyncio
async def test_ocr_response_has_raw_text_field():
    """Verify the response schema always includes the raw_text key."""
    with patch.object(ocr_main.ocr, "predict", return_value=fake_ocr_result(["test"])):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/ocr",
                files={"file": ("recipe.png", make_png_bytes(), "image/png")},
            )
    assert "raw_text" in resp.json()
