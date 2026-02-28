# ── Runtime image ─────────────────────────────────────────────────────────────
FROM python:3.11-slim

# System libraries required by OpenCV (used internally by EasyOCR)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the EasyOCR English model (~200 MB) at build time so the
# container starts quickly and doesn't need internet access at runtime.
RUN python -c "import easyocr; easyocr.Reader(['en'], gpu=False, verbose=False)"

COPY main.py .

EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
