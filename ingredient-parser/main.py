"""
FastAPI service that wraps Ministral 3B (via Ollama) as an ingredient parser.

POST /parse  — parse a raw ingredient text block into structured JSON
GET  /health — liveness probe (checks Ollama is reachable + model is loaded)
"""

import asyncio
import json
import logging

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator

from prompt import build_prompt
from sanitizer import sanitize

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="Ingredient Parser", version="1.0.0")

# ── Processing state ──────────────────────────────────────────────────────────
_active_requests = 0

OLLAMA_URL = "http://localhost:11434"
MODEL_NAME = "ministral-3:3b"
OLLAMA_TIMEOUT = 720.0  # seconds — 3B on CPU can be slow

# ── Known cooking units (EN + DE allow-list) ────────────────────────────────
KNOWN_UNITS: frozenset[str] = frozenset(
    [
        # English
        "g", "kg", "mg", "ml", "l", "dl", "cl",
        "oz", "lb", "cup", "cups", "tbsp", "tsp",
        "tablespoon", "tablespoons", "teaspoon", "teaspoons",
        "pinch", "dash", "slice", "slices", "clove", "cloves",
        "can", "bunch", "handful", "stick", "package", "pkg",
        "piece", "pieces", "large", "medium", "small",
        # German
        "el", "tl", "stk", "stück", "prise", "bund",
        "scheibe", "scheiben", "dose", "päckchen", "becher", "messerspitze", "msp",
    ]
)

MAX_INGREDIENTS = 50
MAX_NAME_LENGTH = 100
MAX_VALUE = 5000.0


# ── Request / Response models ────────────────────────────────────────────────

class ParseRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    lang: str = Field(default="en", max_length=10)


class IngredientItem(BaseModel):
    name: str = Field(..., max_length=200)
    value: float
    unit: str = Field(..., max_length=200)

    @field_validator("name", "unit", mode="before")
    @classmethod
    def coerce_to_str(cls, v: object) -> str:
        return str(v) if not isinstance(v, str) else v


class ParseResponse(BaseModel):
    ingredients: list[IngredientItem]


# ── Sanity bounds ────────────────────────────────────────────────────────────

def _apply_sanity_bounds(items: list[IngredientItem]) -> list[IngredientItem]:
    """Clamp/sanitize values that are physically unreasonable."""
    sanitized: list[IngredientItem] = []
    for item in items[:MAX_INGREDIENTS]:
        # Clamp value
        value = max(0.0, min(item.value, MAX_VALUE))

        # Clear unknown units
        unit = item.unit.strip().lower()
        unit_out = item.unit if unit in KNOWN_UNITS else ""

        # Truncate long names (likely OCR garbage)
        name = item.name[:MAX_NAME_LENGTH]

        sanitized.append(IngredientItem(name=name, value=value, unit=unit_out))
    return sanitized


# ── Ollama helpers ────────────────────────────────────────────────────────────

async def _call_ollama(prompt: str) -> str:
    """Send *prompt* to Ollama and return the raw text response.

    Retries up to 3 times with exponential backoff (1s, 2s, 4s) on transient failures.
    """
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "options": {"temperature": 0.1},
    }
    logger.info("LLM INPUT:\n%s", prompt)

    max_retries = 3
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
                resp = await client.post(f"{OLLAMA_URL}/api/generate", json=payload)
                resp.raise_for_status()
                data = resp.json()
                raw = data.get("response", "")
            logger.info("LLM OUTPUT:\n%s", raw)
            return raw
        except httpx.HTTPError as exc:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # 1s, 2s, 4s
                logger.warning("Ollama request failed (attempt %d/%d), retrying in %ds: %s",
                    attempt + 1, max_retries, wait_time, exc)
                await asyncio.sleep(wait_time)
            else:
                raise  # Re-raise on final attempt


def _parse_llm_output(raw: str) -> list[IngredientItem]:
    """Parse and validate the LLM JSON response."""
    parsed = json.loads(raw)
    if isinstance(parsed, dict):
        # Accept {"ingredients": [...]} or any wrapper dict containing a list
        for val in parsed.values():
            if isinstance(val, list):
                parsed = val
                break
        else:
            # Model returned a single ingredient object — wrap it in a list
            parsed = [parsed]

    if not isinstance(parsed, list):
        raise ValueError("Expected a JSON array from LLM")

    items: list[IngredientItem] = []
    for entry in parsed:
        if not isinstance(entry, dict):
            continue
        # Accept "amount" as the primary key (model's natural output) or "value" as fallback
        if "amount" in entry and "value" not in entry:
            entry = {**entry, "value": entry["amount"]}
        allowed = {"name", "value", "unit"}
        filtered = {k: v for k, v in entry.items() if k in allowed}
        items.append(IngredientItem(**filtered))

    return items


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/parse", response_model=ParseResponse)
async def parse_ingredients(request: ParseRequest) -> ParseResponse:
    global _active_requests

    clean_text = sanitize(request.text)
    if not clean_text:
        raise HTTPException(status_code=422, detail="Text is empty after sanitization.")

    prompt = build_prompt(clean_text, request.lang)

    _active_requests += 1
    try:
        try:
            raw_response = await _call_ollama(prompt)
        except httpx.HTTPError as exc:
            logger.error("Ollama unreachable: %s", exc)
            raise HTTPException(status_code=503, detail="LLM service is unavailable.") from exc

        try:
            items = _parse_llm_output(raw_response)
        except (json.JSONDecodeError, ValueError, KeyError) as exc:
            logger.warning("Failed to parse LLM output: %s | raw=%r", exc, raw_response)
            raise HTTPException(status_code=422, detail="LLM returned unparseable output.") from exc

        items = _apply_sanity_bounds(items)
        return ParseResponse(ingredients=items)
    finally:
        _active_requests -= 1


@app.get("/health")
async def health() -> dict:
    """Return 200 if Ollama is reachable and the model is available."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_URL}/api/tags")
            resp.raise_for_status()
            tags = resp.json()
            model_names = [m.get("name", "") for m in tags.get("models", [])]
            if not any(MODEL_NAME in n for n in model_names):
                raise HTTPException(status_code=503, detail=f"Model {MODEL_NAME!r} not yet loaded.")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail=f"Ollama unreachable: {exc}") from exc

    return {"status": "ok", "model": MODEL_NAME, "active_requests": _active_requests}


@app.get("/status")
async def status() -> dict:
    """Return current service state: healthy, processing status, active requests."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_URL}/api/tags")
            resp.raise_for_status()
            ollama_ok = True
    except httpx.HTTPError:
        ollama_ok = False

    return {
        "ollama_reachable": ollama_ok,
        "active_requests": _active_requests,
        "processing": _active_requests > 0,
    }
