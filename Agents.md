# recipeAId — Implementation Tracker

## About
**recipeAId** is a recipe management application. Take a photo of a physical recipe card; OCR reads the title, ingredients, and instructions, which are stored in a database. Later, search for recipes by title or by the ingredients you have on hand.

## Status Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete

---

## Architecture Overview

```
recipeaid/
├── backend/                    # ASP.NET Core 9 Web API
│   ├── RecipeAId.sln
│   └── src/
│       ├── RecipeAId.Core/     # Entities, interfaces, DTOs, business logic
│       ├── RecipeAId.Data/     # EF Core, SQLite, repositories, migrations
│       └── RecipeAId.Api/      # Controllers, OCR services, DI host
├── ocr-service/                # Python FastAPI + EasyOCR (port 8001)
└── frontend/                   # React (Vite + TypeScript)
```

**Tech stack:**
- Backend: ASP.NET Core 9, Entity Framework Core 9, SQLite
- OCR: Python EasyOCR sidecar (FastAPI, :8001) — upgrade path: Azure AI Document Intelligence
- Frontend: React with Vite, TypeScript, TanStack Query, React Router v6

**Dependency rule:** `Api → Core ← Data`. Core has no infrastructure dependencies.

---

## Phase 1: Foundation
- [x] Solution and project scaffolding (`dotnet new sln`, `classlib`, `webapi`)
- [x] Core entities: `Recipe`, `Ingredient`, `RecipeIngredient`
- [x] Core interfaces: `IRecipeRepository`, `IIngredientRepository`, `IOcrService`, `IOcrParser`, `IRecipeSuggestionService` (stub)
- [x] Core DTOs: `CreateRecipeRequest`, `RecipeDto`, `RecipeIngredientDto`, `RecipeOcrDraftDto`, `IngredientSearchResultDto`
- [x] `AppDbContext` with EF Core fluent configuration
- [x] EF Core initial migration + SQLite DB creation (auto-applied on startup)
- [x] Repository implementations: `RecipeRepository`, `IngredientRepository`
- [x] DI registration in `Program.cs`

## Phase 2: CRUD API
- [x] `RecipeService` (orchestration, ingredient normalization to lowercase)
- [x] `RecipesController`: `GET /api/v1/recipes`, `GET /api/v1/recipes/{id}`, `POST`, `PUT`, `DELETE`
- [x] Swagger / OpenAPI configured (Scalar UI at `/scalar/v1` in Development)
- [x] CORS configured (allow `http://localhost:5173` Vite dev origin)
- [x] Global error handling middleware (`ExceptionHandlingMiddleware`)
- [ ] Manual tested via Swagger UI

## Phase 3: Unit Conversion
- [x] `IUnitConversionService` interface in Core (converts quantity strings between unit systems)
- [x] `UnitConversionService` implementation in Core:
  - Imperial → metric: cups, tbsp, tsp → mL; oz, lb → g/kg; °F → °C
  - Metric → imperial (reverse mappings)
  - Parse quantity string (e.g. `"2 cups"`) into value + unit, convert, return formatted string
  - Ingredient-aware density table for volume↔mass conversions (e.g. `"1 cup flour"` → `"120 g"`)
- [x] DI registration of `UnitConversionService`
- [x] `POST /api/v1/convert` — accept `{ value, fromUnit, toUnit, ingredient? }`, return converted result
- [x] Unit tests for `UnitConversionService` (imperial→metric, metric→imperial, edge cases, unknown units)

## Phase 4: Search API
- [x] `RecipeMatchingService` (LINQ ranked by ingredient match count, then match ratio)
- [x] `GET /api/v1/recipes/search/by-ingredients?ingredients=...&minMatch=1&limit=20`
- [x] `GET /api/v1/ingredients` (autocomplete list)
- [x] Unit tests for `RecipeMatchingService`

## Phase 5: OCR Integration
- [x] Python EasyOCR sidecar (`ocr-service/main.py`, FastAPI on :8001) — replaces Tesseract.NET
- [x] `PythonOcrService` implementing `IOcrService` (calls sidecar via named `HttpClient`)
- [x] `OcrParserService` implementing `IOcrParser`:
  - Title: first non-empty line or line after "Recipe:" header
  - Ingredients: numbered/bulleted lines or lines under "Ingredients:" header
  - Instructions: lines after "Instructions:"/"Directions:"/"Method:" header
- [x] `POST /api/v1/recipes/from-image` — multipart upload → OCR → return draft (does NOT save)
- [x] Two-phase save: draft returned → user edits → `POST /api/v1/recipes` confirms
- [x] Unit tests for `OcrParserService` (13 cases)
- [x] Frontend `uploadRecipeImage` wired to real endpoint (`USE_MOCK` fallback when `VITE_API_BASE_URL` unset)

## Phase 6: React Frontend
- [x] Vite + React + TypeScript scaffold in `frontend/`
- [x] API client (typed fetch wrappers) + TanStack Query setup
- [x] React Router v6 routing
- [x] Recipe list page (browse all, title search)
- [x] Recipe detail page (title, ingredients, instructions)
- [x] Ingredient search page (chip input, ranked results with match counts)
- [x] Camera/upload page: `<input capture="environment">` for mobile camera, file picker fallback; OCR draft review + edit + confirm save
- Note: CRUD, search, and OCR calls are wired to the real backend when `VITE_API_BASE_URL` is set; mock data is used as fallback when running without a backend

---

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/recipes` | List recipes, optional `?q=` title filter |
| GET | `/api/v1/recipes/{id}` | Single recipe |
| POST | `/api/v1/recipes` | Create recipe (JSON) |
| PUT | `/api/v1/recipes/{id}` | Update recipe |
| DELETE | `/api/v1/recipes/{id}` | Delete recipe |
| POST | `/api/v1/recipes/from-image` | Upload image → return OCR draft |
| GET | `/api/v1/recipes/search/by-ingredients` | Ranked ingredient search |
| GET | `/api/v1/ingredients` | All known ingredients |
| POST | `/api/v1/convert` | Convert a quantity between unit systems |

---

## Database Schema

### Recipe
| Column | Type | Notes |
|--------|------|-------|
| Id | INTEGER PK | |
| Title | TEXT NOT NULL | |
| Instructions | TEXT NULL | Free-form cooking steps |
| ImagePath | TEXT NULL | Relative path to stored photo |
| RawOcrText | TEXT NULL | Raw OCR output for reprocessing |
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
| Quantity | TEXT NULL | Raw string e.g. "2 cups" |
| SortOrder | INTEGER | |

---

## Docker / Deployment

- [x] `backend/Dockerfile` — multi-stage build (SDK → ASP.NET runtime); SQLite DB persisted via named volume
- [x] `frontend/Dockerfile` — multi-stage build (Node → nginx); accepts `VITE_API_BASE_URL` build arg
- [x] `ocr-service/Dockerfile` — Python 3.11-slim; EasyOCR model pre-downloaded at build time (~200 MB layer)
- [x] `docker-compose.yml` — all three services wired together:
  - `ocr-service` exposes :8001
  - `backend` depends on `ocr-service`; `OcrService__BaseUrl=http://ocr-service:8001`; CORS allows `http://localhost:3000`
  - `frontend` depends on `backend`; built with `VITE_API_BASE_URL=http://localhost:8080`

---

## Open / Future Decisions
- `[ ]` OCR upgrade path: replace EasyOCR sidecar with Azure AI Document Intelligence for higher accuracy on handwritten cards (swap `PythonOcrService` implementation only — interface unchanged)
- `[ ]` Ingredient fuzzy matching: Levenshtein distance or synonym table (Phase 4)
- `[ ]` LLM recipe suggestion: `IRecipeSuggestionService` interface exists as a seam; implement when needed
- `[ ]` Image storage: local filesystem for now; Azure Blob / S3 upgrade path via `IImageStorageService`
- `[ ]` Authentication / multi-user support (not in scope currently)

---

## Development Guidelines
- **Unit tests are required** for all service and business logic implementations to prevent regressions. Write tests alongside each phase's service layer before marking tasks complete.

## Known Issues / Tech Debt
*(none yet)*
