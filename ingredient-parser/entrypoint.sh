#!/bin/sh
set -e

# 1. Start Ollama daemon in the background
ollama serve &

# 2. Wait until the Ollama HTTP API is ready
echo "Waiting for Ollama daemon..."
until curl -sf http://localhost:11434 > /dev/null 2>&1; do
    sleep 1
done
echo "Ollama is ready."

# 3. Pull the model (no-op if already present in the ollama-models volume)
echo "Pulling model gemma2:2b (skipped if already cached)..."
ollama pull gemma2:2b

# 4. Start the FastAPI service
echo "Starting ingredient-parser on port 8002..."
exec uvicorn main:app --host 0.0.0.0 --port 8002
