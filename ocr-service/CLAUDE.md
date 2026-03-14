# OCR Service — CLAUDE.md

Python FastAPI sidecar using PaddleOCR for text extraction from recipe images.

## Commands

```bash
# Install dependencies (one-time; first run downloads PaddleOCR models ~50 MB)
pip install paddlepaddle==3.2.0 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/
pip install -r requirements.txt

# Run the sidecar
uvicorn main:app --port 8001
```

Swagger UI: `http://localhost:8001/docs`

**Docker build (faster rebuilds):**
```powershell
.\build-ocr.ps1            # BuildKit pip cache active
.\build-ocr.ps1 -NoCache   # Fully clean rebuild
.\build-ocr.ps1 -Pull      # Refresh base image
```

## Architecture

- FastAPI on port 8001, single endpoint `POST /ocr` + `GET /health`
- PaddleOCR PP-OCRv5 with `lang="de"` — loads the latin model covering English + German (45 Latin-script languages)
- `predict()` with bounding-box y-coordinate grouping to reconstruct proper line breaks (text blocks on same visual line merged, separate lines get `\n`)
- PIL images converted to numpy arrays via `np.array()` before PaddleOCR
- Dockerfile: Python 3.11-slim, BuildKit pip cache mount

## Preprocessing pipeline

Applied before PaddleOCR inference, in order:

1. **Perspective correction** — Canny edge detection + largest-quadrilateral contour + `getPerspectiveTransform`
2. **Median blur denoising** — 3x3 kernel to remove paper-texture noise
3. **Deskewing** — `HoughLinesP` dominant angle rotation
4. **Gaussian adaptive thresholding** — resolution-relative block size

Each step falls back to the unmodified image when no usable geometry is found. Requires `opencv-python-headless`.

All numeric tuning values are defined as module-level constants at the top of `main.py` (e.g. `CANNY_LOW_THRESHOLD`, `HOUGH_THRESHOLD`, `ADAPTIVE_BLOCK_SIZE_DIVISOR`). Adjust constants there rather than hunting through function bodies.

## Logging

Logs per request: image dimensions, preprocessing timing, PaddleOCR inference timing, confidence score stats (avg/min), total pipeline timing. Format: `[%(levelname)s] %(message)s` via `log_config.json` (passed to uvicorn as `--log-config /app/log_config.json`).

## Testing

Tests in `tests/`. PaddleOCR is mocked in `conftest.py` — tests run without the model.

```bash
pip install -r requirements-test.txt   # one-time
pytest tests/ -v                        # 36 tests
```

Covers: preprocessing pipeline (corner ordering, line grouping, denoise, deskew, adaptive threshold), endpoint validation (content type, empty file, corrupt image, JPEG, empty OCR result).
