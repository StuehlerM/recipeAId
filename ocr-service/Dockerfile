# ── Runtime image ─────────────────────────────────────────────────────────────
FROM python:3.11-slim

# System libraries required by OpenCV (used internally by PaddleOCR)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies.
# The BuildKit cache mount keeps the pip HTTP cache between builds so that
# large wheels (paddlepaddle ~200 MB) are not re-downloaded when requirements change.
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install paddlepaddle==3.2.0 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/ \
    && pip install -r requirements.txt

# Models are NOT pre-downloaded here.  They are stored in a named Docker
# volume mounted at /root/.paddleocr (see docker-compose.yml), so they survive
# image rebuilds and are only downloaded once on first container startup.

COPY main.py .

EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
