# RecipeAId — Architecture Overview

Living document describing the current system architecture. Updated alongside code changes.

---

## System overview

**recipeAId** is a recipe management application. Take a photo of a physical recipe card; OCR reads the title, ingredients, and instructions, which are stored in a database. Later, search for recipes by title or by the ingredients you have on hand.

### Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | ASP.NET Core 9, Entity Framework Core 9, SQLite |
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
| POST | `/api/v1/recipes/from-image` | Upload image → OCR + LLM pipeline (async SSE when `refine=true`) |
| GET | `/api/v1/ocr-sessions/{sessionId}/events` | SSE stream for LLM refinement results |
| GET | `/api/v1/recipes/search/by-ingredients` | Ranked ingredient search (`?ingredients=&minMatch=1&limit=20`) |
| GET | `/api/v1/ingredients` | All known ingredients (autocomplete) |
| POST | `/api/v1/ingredients/parse` | Parse raw ingredient text via LLM sidecar |

---

## Database schema (SQLite + EF Core)

> **Note:** ADR 0001 (accepted) plans migration to LiteDB. Schema below reflects the current SQLite implementation.

### Recipe
| Column | Type | Notes |
|--------|------|-------|
| Id | INTEGER PK | |
| Title | TEXT NOT NULL | Indexed (non-unique) |
| Instructions | TEXT NULL | Free-form cooking steps |
| ImagePath | TEXT NULL | Currently unused |
| RawOcrText | TEXT NULL | Raw OCR output for reprocessing |
| BookTitle | TEXT NULL | Source cookbook name |
| CreatedAt | DATETIME | |
| UpdatedAt | DATETIME | |

### Ingredient
| Column | Type | Notes |
|--------|------|-------|
| Id | INTEGER PK | |
| Name | TEXT UNIQUE | Normalized lowercase |

### RecipeIngredient (join)
| Column | Type | Notes |
|--------|------|-------|
| RecipeId | FK → Recipe | CASCADE DELETE |
| IngredientId | FK → Ingredient | |
| Amount | TEXT NULL | e.g. "2" |
| Unit | TEXT NULL | e.g. "cups" |
| SortOrder | INTEGER | |

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

---

## Open / future decisions

- Ingredient fuzzy matching — see `docs/features/fuzzy-matching.md`
- Image storage — see `docs/features/image-storage.md` and ADR 0001
- Multi-user support — see `docs/features/multi-user.md`
- Translation support — see `docs/features/translation-support.md`
- LiteDB migration — see `docs/adr/0001-switch-sqlite-to-litedb.md` and `docs/features/litedb-migration.md`
