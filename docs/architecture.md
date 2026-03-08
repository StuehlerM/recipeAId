# RecipeAId — Architecture Overview

Living document describing the current system architecture. Updated alongside code changes.

---

## System overview

**recipeAId** is a recipe management application. Take a photo of a physical recipe card; OCR reads the title, ingredients, and instructions, which are stored in a database. Later, search for recipes by title or by the ingredients you have on hand.

### Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | ASP.NET Core 9, LiteDB 5 (embedded document database) |
| OCR sidecar | Python 3.11, PaddleOCR PP-OCRv5 (English + German), FastAPI, port 8001 |
| Ingredient parser sidecar | Python 3.11, Ollama + Ministral 3B (`ministral-3:3b`), FastAPI, port 8002 (Docker-internal) |
| Frontend | React 19, Vite 7, TypeScript, Tailwind CSS v4, TanStack Query v5, React Router v6 |
| PWA | vite-plugin-pwa (installable, standalone) |
| Testing | xUnit + Moq (backend), pytest (sidecars), Cucumber.js + Playwright (BDD) |
| CI | GitHub Actions — BDD integration tests on every PR to main |
| Container | Docker Compose (4 services) |

### Dependency rule

```
Api → Core ← Data
```

Core has zero infrastructure dependencies. All interfaces live in Core.

---

## API reference

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/recipes` | List recipes, optional `?q=` title filter |
| GET | `/api/v1/recipes/{id}` | Single recipe |
| POST | `/api/v1/recipes` | Create recipe (JSON) |
| PUT | `/api/v1/recipes/{id}` | Update recipe |
| DELETE | `/api/v1/recipes/{id}` | Delete recipe |
| POST | `/api/v1/recipes/from-image` | Upload image → OCR + LLM pipeline; response includes `imageKey` for later commit |
| GET | `/api/v1/ocr-sessions/{sessionId}/events` | SSE stream for LLM refinement results |
| GET | `/api/v1/recipes/search/by-ingredients` | Ranked ingredient search (`?ingredients=&minMatch=1&limit=20`) |
| GET | `/api/v1/ingredients` | All known ingredients (autocomplete) |
| POST | `/api/v1/ingredients/parse` | Parse raw ingredient text via LLM sidecar |
| GET | `/api/v1/recipes/{id}/images/{slot}` | Retrieve stored recipe image (`slot` = `title \| ingredients \| instructions`) |
| PUT | `/api/v1/recipes/{id}/images/{slot}` | Upload image directly to a recipe slot (multipart/form-data) |

---

## Data model (LiteDB)

Recipes are stored as documents in a LiteDB collection (`"recipes"`). Ingredients are embedded inside each recipe document — there is no separate ingredient collection or join table.

```
Recipe document
├── Id             (int, auto-increment)
├── Title          (string)
├── Instructions   (string?)
├── ImagePath      (string?)
├── RawOcrText     (string?)
├── BookTitle      (string?)
├── CreatedAt      (DateTime, UTC)
├── UpdatedAt      (DateTime, UTC)
└── RecipeIngredients []
    ├── Name       (string, normalized lowercase)
    ├── Amount     (string?  e.g. "2")
    ├── Unit       (string?  e.g. "cups")
    └── SortOrder  (int)
```

**Image storage:** Recipe photos are stored in LiteDB `FileStorage` (same `.db` file, no extra volume). Keys follow the pattern `recipe/{id}/{slot}` (slots: `title`, `ingredients`, `instructions`). During the OCR flow, images are temporarily stored under `temp/{guid}` and committed to their permanent slot when the recipe is saved (client sends back the `imageKey` from the OCR response in `CreateRecipeRequest.ImageKeys`). Images can also be uploaded directly via `PUT /api/v1/recipes/{id}/images/{slot}`.

**Trade-off (accepted):** Ingredient search (`/search/by-ingredients`) requires a full collection scan because ingredients are embedded, not indexed separately. See ADR 0001 for full rationale.

**DB file:** `recipeaid.db` (path configurable via `ConnectionStrings:DefaultConnection`). No migrations — schema changes are applied in code. `ILiteDatabase` is resolved eagerly at startup so a corrupt file crashes the container at boot (visible in logs) rather than silently failing on the first request.

---

## Docker / Deployment

### Services

| Service | Port | Notes |
|---------|------|-------|
| frontend | 80 (HTTP→HTTPS redirect), 443 | nginx, self-signed cert |
| backend | 8080 | ASP.NET Core, depends on both sidecars |
| ocr-service | 8001 | PaddleOCR, health check on `/health` |
| ingredient-parser | — (internal) | Ollama + Ministral 3B, 120s start period, `ollama-models` volume |

### Key Docker details

- `ocr-service` health check: `/health`, 60s start period
- `ingredient-parser` health check: `/health`, 120s start period (first-time model pull ~4 GB)
- Backend waits for both sidecars' health checks via `depends_on: condition: service_healthy`
- nginx SSE location block (`/api/v1/ocr-sessions/`): `proxy_buffering off`, `proxy_read_timeout 220s`
- nginx API location block (`/api/`): `client_max_body_size 10m`, `proxy_read_timeout 210s`
- HTTPS: self-signed cert generated at build time; `VM_HOST` build arg adds VM IP as SAN

---

## Phase history

All phases are complete.

| Phase | Description |
|-------|-------------|
| 1 | Foundation — entities, interfaces, DTOs, EF Core, repositories |
| 2 | CRUD API — RecipeService, RecipesController, OpenAPI, CORS, error handling |
| 3 | *(removed)* Unit conversion — deleted, never used by frontend |
| 4 | Search API — RecipeMatchingService, ingredient search endpoint |
| 5 | OCR Integration — PaddleOCR sidecar, OcrParserService, from-image endpoint |
| 6 | React Frontend — pages, API client, TanStack Query |
| 7 | Mobile-First Design + PWA — Tailwind, camera capture, planner, bottom nav |
| 8 | Integration Tests (BDD) — Cucumber.js + Playwright, 14 scenarios |
| 9 | LLM Ingredient Parser Sidecar — Ministral 3B, prompt injection defense |
| 10 | Async SSE OCR+LLM Pipeline — background task, SSE delivery, health polling |
| 11 | LiteDB Migration — replaced SQLite + EF Core with LiteDB; ingredients embedded in recipe documents |
| 12 | Image Storage — recipe photos stored in LiteDB `FileStorage`; temp→commit flow; GET/PUT image endpoints; RecipeDetailPage displays stored title image |

---

## Open / future decisions

- Ingredient fuzzy matching — see `docs/features/fuzzy-matching.md`
- Multi-user support — see `docs/features/multi-user.md`
- Translation support — see `docs/features/translation-support.md`
