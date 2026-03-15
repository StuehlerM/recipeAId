# ADR 0002 — Replace Ingredient-Parser Sidecar with Mistral AI Public API

**Date:** 2026-03-15
**Status:** Accepted

---

## Context

RecipeAId's ingredient-parsing pipeline used a local Python sidecar that ran **Ministral 3B via Ollama** inside a Docker container. The sidecar had significant operational costs for a hobby-scale deployment:

- A dedicated `ollama-models` Docker volume of **~4 GB** that had to be downloaded on every fresh VM or CI environment.
- A `start_period: 120s` healthcheck delay, meaning `docker compose up` blocked for two minutes on first boot while the model was pulled and loaded.
- A **6–10 GB memory reservation** on the host, preventing the stack from running on smaller VMs.
- A separate Python service to maintain (dependencies, tests, Docker image, security patches).

The sidecar's only job was a single synchronous HTTP call from the backend: send raw ingredient text, receive a structured JSON list. The entire sidecar existed to wrap one LLM call.

---

## Decision

Replace the `ingredient-parser/` Python sidecar with a **direct call from the backend to the Mistral AI public API**.

### Provider: Mistral AI

**Model:** `mistral-small-latest`

**Why Mistral AI over other options:**

| Option | Reason not chosen |
|---|---|
| Keep self-hosted Ollama | Defeats the goal; same operational cost |
| Anthropic Claude API | No free tier; cost per call |
| OpenAI API | No free tier; cost per call |
| Google Gemini API | Free tier exists but less aligned with original model family |
| **Mistral AI API** | **Free tier available; same Ministral model family as the original sidecar (Ministral 3B → Mistral Small); direct continuity** |

Mistral AI provides a hosted API for the same model family (`Ministral`/`Mistral`) that the sidecar was already using, with a free tier that covers the expected call volume of a hobby recipe app. This gives us the same model quality without the local infrastructure.

### What changes

- `ingredient-parser/` directory deleted; `build-ingredient-parser.ps1` deleted.
- `docker-compose.yml`: `ingredient-parser` service and `ollama-models` volume removed; `backend` no longer depends on a sidecar health check.
- A new `PublicLlmIngredientParserService` in `RecipeAId.Core/Services/` replaces `LlmIngredientParserService` in `RecipeAId.Api/ParserServices/`. It calls `https://api.mistral.ai/v1/chat/completions` directly via `HttpClient`.
- `IIngredientParserService` and `IngredientParseResult` are unchanged — the controller and SSE pipeline are unaffected.
- The API key is read from the `INGREDIENT_PARSER_API_KEY` environment variable. It is injected at deploy time via a `.env` file on the VM (written by the GitHub Actions deploy workflow from a repository secret). The key never appears in any tracked file.

### Security layers preserved from the sidecar

The original Python sidecar implemented four prompt-injection defences. All four are ported into `PublicLlmIngredientParserService`:

1. **Input sanitisation** — truncation at 10,000 chars, control-character stripping, role-marker removal (`system:`, `user:`, `assistant:`, `<|...|>` variants).
2. **XML delimiters** — user content is wrapped in `<ingredients>…</ingredients>` tags in the prompt, separating it from instructions.
3. **Schema validation** — the model's response must deserialise to `List<{name, amount, unit}>`. Responses that do not conform are discarded.
4. **Semantic sanity bounds** — max 50 items, name ≤ 100 chars, numeric amounts in 0–5,000 range.

---

## Consequences

### Benefits

- **No model volume** — `ollama-models` volume (~4 GB) is dropped. `docker compose up` starts in seconds.
- **No memory reservation** — the 6–10 GB RAM requirement is gone; the stack can run on a 2 GB VM.
- **One fewer container** — simpler `docker-compose.yml`, shorter startup, fewer things to fail.
- **No Python sidecar to maintain** — one less test suite, one less Dockerfile, one less set of Python dependencies.
- **Free at hobby scale** — Mistral AI free tier covers the expected call volume.

### Trade-offs accepted

- **External API dependency** — ingredient parsing now requires outbound HTTPS to `api.mistral.ai`. If the API is unreachable, parsing fails gracefully (`502 Bad Gateway` from the endpoint, `failed` SSE event from the stream); the regex-parsed draft is still returned immediately.
- **API key management** — the key must be rotated if compromised and must be present in the VM's `.env` file before the first deploy. Missing key → parsing unavailable, but the rest of the app functions normally.
- **Latency** — a round-trip to a public API adds network latency (typically 1–3s). The sidecar was co-located and faster for warm requests, but had a 120s cold-start penalty. Net improvement for the common case.
- **Cost at higher scale** — the free tier is sufficient at hobby scale. If call volume grew significantly, costs would need monitoring.

### Rationale

For a personal hobby project with a single user, eliminating 4 GB of Docker volume, 10 GB of RAM reservation, and a 120-second startup delay is a clear win. The trade-offs (external dependency, API key) are standard practice and are handled securely.

---

## Alternatives considered

See the provider comparison table above. Self-hosted options were rejected because they replicate the original problem. Paid APIs without free tiers were rejected because Mistral AI provides equivalent quality for free at this scale.
