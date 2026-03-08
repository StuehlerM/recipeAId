# Ingredient Parser — CLAUDE.md

Python FastAPI sidecar using Ollama + Ministral 3B for structured ingredient extraction from OCR text.

## Architecture

- FastAPI on port 8002 (Docker-internal, no host port mapping)
- Ollama model: `ministral-3:3b`
- Model weights stored in `ollama-models` Docker volume (~4 GB, persists across rebuilds)
- Backend connects via `IngredientParser:BaseUrl` (default `http://localhost:8002`)

## Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/parse` | Sanitize → prompt → Ollama → Pydantic validate → sanity bounds → return |
| GET | `/health` | Ollama reachable + model loaded; includes `active_requests` count |
| GET | `/status` | Detailed: `ollama_reachable`, `active_requests`, `processing` boolean |

## Prompt injection defense (4 layers)

1. **`sanitizer.py`** — Strip control chars, truncate to 2000 chars, remove role markers and injection phrases, collapse whitespace
2. **`prompt.py`** — User text wrapped in `<ingredients>` XML delimiters with hardcoded system prompt
3. **Pydantic schema validation** — LLM output must match name/value/unit schema
4. **Semantic sanity bounds** — value clamped 0–5000, unit cleared if not in allow-list, name truncated at 100 chars, max 50 items

## Retry logic

`_call_ollama` retries up to 3 times with exponential backoff (1s, 2s, 4s) on transient `httpx.HTTPError` failures.

## Request tracking

`_active_requests` counter tracks concurrent LLM parses. Incremented on `/parse` entry, decremented in `finally` block. Exposed via `/health` and `/status` for backend health monitoring (SSE controller polls `/status` every 30s).

## Docker

- Multi-stage build: borrows Ollama binary from `ollama/ollama:latest`, python:3.11-slim, BuildKit pip cache
- `entrypoint.sh`: starts Ollama daemon → waits for readiness → pulls `ministral-3:3b` (no-op if cached) → starts uvicorn
- `docker-compose.yml`: 120s `start_period` (first-time model pull); backend `depends_on` with health check

**Build helper:**
```powershell
.\build-ingredient-parser.ps1            # BuildKit pip cache active
.\build-ingredient-parser.ps1 -NoCache   # Fully clean rebuild
.\build-ingredient-parser.ps1 -Pull      # Refresh base image
```

## Testing

Tests in `tests/`. Ollama is mocked via `unittest.mock.patch`.

```bash
pip install fastapi pydantic python-multipart pytest pytest-asyncio httpx  # one-time
pytest tests/ -v                                                            # 26 tests
```

Covers: sanitizer (control chars, role markers, truncation), LLM parsing (success, prompt injection, Ollama unavailable, unparseable output, empty text).
