# ingredient-parser/Dockerfile
# Multi-stage: borrow the Ollama binary, then build a slim Python image.

FROM ollama/ollama:latest AS ollama

FROM python:3.11-slim

# Copy Ollama binary from the official image
COPY --from=ollama /usr/bin/ollama /usr/bin/ollama

# Install curl for the entrypoint wait-loop
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY *.py /app/

EXPOSE 8002

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
