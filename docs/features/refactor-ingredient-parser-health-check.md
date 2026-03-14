# Refactor: Ingredient Parser Health Check Efficiency

## Problem

The ingredient-parser `/health` endpoint calls Ollama's `/api/tags` endpoint on **every invocation** (every 15 seconds via Docker health check). This:

- Adds unnecessary load to the Ollama daemon
- Risks health check timeouts if Ollama is busy with inference
- Could cause the container to be marked unhealthy during heavy processing

The `/status` endpoint already exists as a lightweight alternative (returns in-memory state, no external calls), but Docker health checks use `/health`.

## Affected Files

- `ingredient-parser/main.py` — `/health` endpoint (lines ~212-227)

## Proposed Solution

Cache the model availability state after first successful check:

```python
_model_loaded = False

@app.get("/health")
async def health() -> dict:
    global _model_loaded
    if not _model_loaded:
        # Check Ollama + model availability (expensive)
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_URL}/api/tags")
            resp.raise_for_status()
            tags = resp.json()
            model_names = [m.get("name", "") for m in tags.get("models", [])]
            if not any(MODEL_NAME in n for n in model_names):
                raise HTTPException(503, detail=f"Model {MODEL_NAME!r} not yet loaded.")
            _model_loaded = True
    return {"status": "ok", "model": MODEL_NAME, "active_requests": _active_requests}
```

Once the model is confirmed loaded, subsequent health checks are instant. The model doesn't unload itself, so caching is safe.

## Acceptance Criteria

- Health check calls Ollama only until model is confirmed loaded
- Subsequent health checks return instantly from cache
- Container still reports unhealthy if model isn't loaded on startup
- All ingredient-parser unit tests pass
