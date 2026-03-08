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
│       ├── RecipeAId.Core/     # Entities, interfaces, DTOs (one per file), services
│       ├── RecipeAId.Data/     # EF Core, SQLite, repositories, migrations
│       └── RecipeAId.Api/      # Controllers, OCR services, DI host
├── ocr-service/                # Python FastAPI + PaddleOCR (port 8001)
├── ingredient-parser/          # Python FastAPI + Ministral 3B/Ollama (port 8002, internal)
├── frontend/                   # React (Vite + TypeScript, feature-based folder structure)
└── integration/                # BDD tests (Cucumber.js + Playwright, headless Chromium)
```

**Tech stack:**
- Backend: ASP.NET Core 9, Entity Framework Core 9, SQLite
- OCR: Python PaddleOCR sidecar (FastAPI, :8001), English + German (latin PP-OCRv5 model)
- Ingredient parser: Python Ministral 3B/Ollama sidecar (FastAPI, :8002, Docker-internal), 4-layer prompt injection defense
- Frontend: React 19, Vite 7, TypeScript, Tailwind CSS v4, TanStack Query v5, React Router v6
- PWA: `vite-plugin-pwa` (installable, standalone)

**Dependency rule:** `Api → Core ← Data`. Core has no infrastructure dependencies.

---

## Phase 1: Foundation
- [x] Solution and project scaffolding (`dotnet new sln`, `classlib`, `webapi`)
- [x] Core entities: `Recipe`, `Ingredient`, `RecipeIngredient`
- [x] Core interfaces: `IRecipeRepository`, `IIngredientRepository`, `IRecipeService`, `IIngredientService`, `IRecipeMatchingService`, `IOcrService`, `IOcrParser`, `IRecipeSuggestionService` (stub)
- [x] Core DTOs (one record per file): `CreateRecipeRequest` (with `BookTitle`), `UpdateRecipeRequest` (with `BookTitle`), `RecipeDto`, `RecipeIngredientDto` (Amount + Unit), `RecipeSummaryDto` (with `BookTitle`), `RecipeOcrDraftDto`, `OcrResult`, `IngredientSearchResultDto`, `IngredientLineDto(Name, Amount, Unit)`, `IngredientDto`
- [x] `AppDbContext` with EF Core fluent configuration
- [x] EF Core initial migration + SQLite DB creation (auto-applied on startup)
- [x] Repository implementations: `RecipeRepository`, `IngredientRepository`
- [x] DI registration in `Program.cs`

## Phase 2: CRUD API
- [x] `RecipeService` (orchestration, ingredient normalization via shared `BuildIngredientsAsync` helper)
- [x] `RecipesController`: `GET /api/v1/recipes`, `GET /api/v1/recipes/{id}`, `POST`, `PUT`, `DELETE`
- [x] Swagger / OpenAPI configured (Scalar UI at `/scalar/v1` in Development)
- [x] CORS configured (allow `http://localhost:5173` Vite dev origin)
- [x] Global error handling middleware (`ExceptionHandlingMiddleware`); all error responses use `ProblemDetails` (RFC 7807)
- [ ] Manual tested via Swagger UI

## Phase 3: Unit Conversion *(removed)*
- [x] ~~`UnitConversionService`, `IUnitConversionService`, `ConvertController`, unit tests — removed~~ The converter was never called by the frontend and has been deleted. `ConvertRequest`/`ConvertResult` DTOs also removed.

## Phase 4: Search API
- [x] `RecipeMatchingService` (LINQ ranked by ingredient match count, then match ratio)
- [x] `GET /api/v1/recipes/search/by-ingredients?ingredients=...&minMatch=1&limit=20`
- [x] `GET /api/v1/ingredients` (autocomplete list, served by `IIngredientService`)
- [x] Unit tests for `RecipeMatchingService`

## Phase 5: OCR Integration
- [x] Python PaddleOCR sidecar (`ocr-service/main.py`, FastAPI on :8001) — PP-OCRv5 latin model (English + German)
- [x] `PythonOcrService` implementing `IOcrService` (calls sidecar via named `HttpClient`)
- [x] `OcrParserService` implementing `IOcrParser` (uses `[GeneratedRegex]` source generators):
  - Title: first non-empty line or line after "Recipe:" header
  - Ingredients: numbered/bulleted lines or lines under "Ingredients:"/"Zutaten:" header; three regex patterns tried: `amount unit name`, `name amount unit`, `name amount` (no unit)
  - Instructions: lines after "Instructions:"/"Directions:"/"Method:"/"Zubereitung:"/"Anleitung:" header
- [x] `POST /api/v1/recipes/from-image` — multipart upload → OCR → return draft (does NOT save); 10 MB upload limit; 30s HTTP client timeout; sidecar uses PaddleOCR `predict()` with bounding-box y-coordinate grouping to reconstruct line breaks; PIL→numpy array conversion
- [x] Two-phase save: draft returned → user edits → `POST /api/v1/recipes` confirms
- [x] Unit tests for `OcrParserService` (18 cases — including name-amount-unit order, German headers, and run-on line splitting)
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

## Phase 7: Mobile-First Design + PWA
- [x] Tailwind CSS v4 (`@tailwindcss/vite`) with custom `@theme` palette: `dark-spruce` (#0c4e13), `muted-olive` (#a7b16f), `dark-walnut` (#61210f)
- [x] PWA via `vite-plugin-pwa` — installable, `display: standalone`, `theme_color: #0c4e13`, SVG icon
- [x] `viewport-fit=cover` + `env(safe-area-inset-bottom)` for iPhone notch/home-bar compatibility
- [x] Bottom tab bar navigation (fixed, 5 tabs: Recipes / Search / Add / Upload / Planner) — FAB-style Add button
- [x] 4-step recipe wizard at `/add`: Title → Ingredients → Instructions → Book, step indicator, `useMutation` → navigate on success; OCR capture available at every step (`OcrCaptureButton`, `useOcrCapture`)
- [x] Weekly planner at `/planner`: recipe browser with search, this-week list, aggregated shopping list
- [x] `src/features/planner/quantityAggregator.ts` — same-unit quantities summed; mixed/unparseable quantities concatenated (uses Amount + Unit fields)
- [x] `src/features/planner/usePlanner.ts` — localStorage-backed (`recipeaid_planner_v1`), lazy-initialised
- [x] `src/hooks/useOcrCapture.ts` — opens `CameraCapture` when `getUserMedia` available, falls back to hidden file-input; `handleCameraCapture`/`handleCameraClose` wired to camera state; `submitCroppedImage`/`cancelCrop` stop stream via `setShowCamera(false)`
- [x] `src/components/OcrCaptureButton.tsx` — camera icon button with spinner and inline error display; renders `CameraCapture` (z-[70]) and `CropModal` (z-[60])
- [x] `src/components/CameraCapture.tsx` — fullscreen live camera overlay: `getUserMedia` video stream, guide frame with corner accents + scrim, `LevelIndicator` sub-component (DeviceOrientationEvent bubble, iOS 13+ permission-gated), shadow badge, blur badge + capture button disabled when blurry, torch toggle (capability-gated), `hidden` prop keeps stream alive under CropModal
- [x] `src/utils/imageAnalysis.ts` — `computeSharpnessVariance` (Laplacian variance, center 50% of frame) + `detectShadow` (mean luma + dark/bright pixel ratio); exported `SHARPNESS_THRESHOLD=30`, `ANALYSIS_WIDTH/HEIGHT=320×240`
- [x] ~~`src/components/CropModal.tsx` — fullscreen crop overlay (`react-image-crop`); applies automatic image enhancement before OCR upload~~ — image enhancement removed; `CropModal` now passes the cropped image directly to OCR; all preprocessing runs server-side in the OCR sidecar
- [x] ~~`src/utils/imageEnhance.ts` — Canvas-based image preprocessing pipeline: BT.601 grayscale, histogram-stretch auto-contrast (1% percentile clipping), unsharp-mask sharpening~~ — removed; preprocessing moved to OCR sidecar
- [x] `src/features/add-recipe/StepIndicator.tsx` — 4-step progress indicator (clickable for completed/current steps to enable backwards navigation; title required before forward navigation from step 1)
- [x] `src/features/add-recipe/UnitCombobox.tsx` — datalist-based unit picker (extracted from AddRecipePage)
- [x] Feature-based folder structure: `src/features/{recipes,search,upload,add-recipe,planner}/`
- [x] `RecipeListPage`: book filter dropdown + `BookTitle` badge on recipe cards
- [x] `RecipeDetailPage`: displays `BookTitle`; `RecipeIngredientDto` uses `amount` + `unit`
- [x] `UploadPage`: updated for Amount + Unit ingredient model
- [x] OCR `main.py` docstring updated for English + German language support
- [x] Error & success notifications: sonner toast library (top-center); error toasts on save/delete/OCR failures, success toast on save/delete
- [x] Navigation icons: replaced emoji with lucide-react icons (BookOpen, Search, Plus, Camera, CalendarDays)

## Phase 8: Integration Tests (BDD)
- [x] Cucumber.js v11 + Playwright test suite in `integration/`
- [x] ESM module loading via `tsx/esm` (`"type": "module"` in package.json, `cucumber.config.cjs`)
- [x] Docker Compose setup (`docker-compose.integration.yml`): backend + frontend (plain HTTP) + test container
- [x] `nginx-integration.conf` — plain HTTP nginx config override for Docker tests (no HTTPS redirect)
- [x] Per-scenario DB cleanup via `Before` hook (deletes all recipes via API)
- [x] Feature files: `recipes.feature` (list + search), `recipe-detail.feature` (view + delete), `create-recipe.feature` (4-step wizard), `ingredient-search.feature` (chip search + ranking), `planner.feature` (add/remove plan items + shopping list)
- [x] 14 scenarios, 90 steps — all passing
- [x] HTML report at `integration/reports/report.html` (volume-mounted from Docker)

## Phase 9: LLM Ingredient Parser Sidecar
- [x] `ingredient-parser/` Python sidecar: FastAPI, Ministral 3B via Ollama, port 8002 (Docker-internal)
- [x] `sanitizer.py` — 4-layer prompt injection defense: strip control chars, truncate 2000 chars, remove role markers/injection phrases, collapse whitespace
- [x] `prompt.py` — hardcoded system prompt, user text wrapped in `<ingredients>` XML delimiters
- [x] `main.py` — `POST /parse` (sanitize → prompt → Ollama → Pydantic validate → sanity bounds → return); `GET /health` (includes `active_requests` count); `GET /status` (detailed state: `ollama_reachable`, `active_requests`, `processing` boolean)
- [x] **Transient failure handling:** `_call_ollama` retries up to 3 times with exponential backoff (1s, 2s, 4s) on `httpx.HTTPError`; handles brief Ollama unavailability gracefully
- [x] **Request tracking:** `_active_requests` counter tracks concurrent LLM parses; incremented on `/parse` entry, decremented in `finally` block; exposed via `/health` and `/status` endpoints for backend health monitoring
- [x] `Dockerfile` — multi-stage: borrows Ollama binary from `ollama/ollama:latest`, python:3.11-slim; BuildKit pip cache
- [x] `entrypoint.sh` — starts Ollama daemon, waits for readiness, pulls `ministral-3:3b` (no-op if cached), starts uvicorn
- [x] `ingredient-parser/tests/test_sanitizer.py` + `tests/test_main.py` — pytest, mocked Ollama
- [x] `build-ingredient-parser.ps1` — mirrors `build-ocr.ps1`; sets `DOCKER_BUILDKIT=1`
- [x] `Core/DTOs/IngredientParseRequest.cs` + `IngredientParseResult.cs`
- [x] `Core/Interfaces/IIngredientParserService.cs`
- [x] `Api/ParserServices/LlmIngredientParserService.cs` — named HttpClient "IngredientParser", 200s timeout, float→string conversion, graceful fallback
- [x] `RecipesController.FromImage` — accepts `?refine=true` (default); fires LLM in background via `OcrSessionStore`/`IServiceScopeFactory`; returns regex draft immediately with `SessionId`; returns `SessionId = null` when `refine=false` or no ingredients detected
- [x] `IngredientsController` — added `POST /api/v1/ingredients/parse` standalone endpoint
- [x] `docker-compose.yml` — `ingredient-parser` service (no host port, `ollama-models` volume, 120s start period), backend `depends_on` it
- [x] `appsettings.json` — `IngredientParser:BaseUrl` default `http://localhost:8002`

## Phase 10: Async SSE OCR+LLM Pipeline
- [x] **Problem:** `POST /from-image` was blocking for OCR (~5–30s) + LLM (~60–200s) synchronously; Ollama OOM caused 503s and request timeouts
- [x] **Solution:** LLM moved to a background `Task`; OCR+regex draft returned immediately; LLM result delivered via Server-Sent Events
- [x] `Api/OcrSessions/OcrSessionStore.cs` — singleton `ConcurrentDictionary<string, Session>` keyed by GUID; holds `TaskCompletionSource<IngredientParseResult>` per active scan; `CreateSession()`, `TryGetTcs()`, `Complete()`, `Remove()`, `CleanupStale(maxAge)`
- [x] `Api/OcrSessions/OcrSessionCleanupService.cs` — `BackgroundService` that runs every 60s, removes sessions older than 5 minutes (calls `TrySetCanceled()` on stale TCS)
- [x] `Api/Controllers/OcrSessionsController.cs` — `GET /api/v1/ocr-sessions/{sessionId}/events` SSE endpoint: sends `{"status":"processing"}` immediately, then polls ingredient-parser every 30s via `/status` endpoint; awaits TCS with 5s polling intervals; sends `{"status":"done","ingredients":[...]}` on success or `{"status":"failed"}` on error; hard 15-minute (900s) timeout as safety net; fails with `"error":"ingredient parser lost"` if parser becomes unreachable after initially reachable; removes session in `finally`
- [x] `RecipesController.FromImage` — accepts `?refine=true` (default); `OcrSessionStore` and `IServiceScopeFactory` injected; fires LLM as background `Task.Run` via fresh DI scope; returns regex draft immediately with `SessionId`; when `refine=false` or no ingredients detected returns `SessionId = null` directly
- [x] `Core/DTOs/RecipeOcrDraftDto.cs` — added `string? SessionId = null` as optional last parameter (all existing callers unaffected)
- [x] `Program.cs` — registered `OcrSessionStore` (singleton) and `OcrSessionCleanupService` (hosted service)
- [x] `frontend/nginx.conf` — added dedicated SSE location block (`/api/v1/ocr-sessions/`) **before** the generic `/api/` block; `proxy_buffering off`, `proxy_cache off`, `proxy_read_timeout 220s`, `proxy_http_version 1.1`
- [x] `frontend/src/api/types.ts` — added `sessionId: string | null` to `RecipeOcrDraftDto`
- [x] `frontend/src/api/client.ts` — `uploadRecipeImage(file, refine=true)` appends `?refine=false` when needed; added `subscribeToOcrSession(sessionId, onDone, onFailed)` using `EventSource`; returns cleanup function; mock mode: EventSource fails → `onFailed()` → regex draft used
- [x] `frontend/src/hooks/useOcrCapture.ts` — accepts `{ refine?: boolean }` option; added `loadingStage: 'ocr' | 'llm' | null` state; added `esCleanupRef` for EventSource cleanup; `isLoading` stays true until SSE resolves; callback fires only once with final LLM result (or regex draft as silent fallback on `failed`)
- [x] `frontend/src/components/OcrCaptureButton.tsx` — accepts `refine?: boolean` prop (default true); stage-specific loading labels: "Reading image…" (ocr), "Translating…" (llm), "Scanning…" (otherwise)
- [x] `StepTitle.tsx` + `StepInstructions.tsx` — `refine={false}` on `OcrCaptureButton` (LLM not needed for title or instructions steps)
- [x] UX: user stays blocked at Step 2 (Ingredients) with meaningful status messages; regex gibberish never shown; silent regex fallback on LLM failure
- [x] **SSE health polling fix:** `OcrSessionsController` now calls ingredient-parser's `/status` every 30s instead of hard-timeout at 215s; allows slow LLM requests (180+ seconds) to complete as long as Ollama is reachable; `ExceptionHandlingMiddleware` checks `Response.HasStarted` to avoid "Headers are read-only" errors on SSE client disconnects

---

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/recipes` | List recipes, optional `?q=` title filter |
| GET | `/api/v1/recipes/{id}` | Single recipe |
| POST | `/api/v1/recipes` | Create recipe (JSON) |
| PUT | `/api/v1/recipes/{id}` | Update recipe |
| DELETE | `/api/v1/recipes/{id}` | Delete recipe |
| POST | `/api/v1/recipes/from-image` | Upload image → OCR → regex draft returned immediately with sessionId; LLM refinement fires in background when refine=true (default) and ingredients found; returns SessionId=null when refine=false |
| GET | `/api/v1/ocr-sessions/{sessionId}/events` | SSE stream — sends processing/done/failed events; awaits background LLM result; 15-min hard timeout |
| GET | `/api/v1/recipes/search/by-ingredients` | Ranked ingredient search |
| GET | `/api/v1/ingredients` | All known ingredients |
| POST | `/api/v1/ingredients/parse` | Parse raw ingredient text via LLM sidecar |

---

## Database Schema

### Recipe
| Column | Type | Notes |
|--------|------|-------|
| Id | INTEGER PK | |
| Title | TEXT NOT NULL | Indexed for title filter queries |
| Instructions | TEXT NULL | Free-form cooking steps |
| ImagePath | TEXT NULL | Relative path to stored photo |
| RawOcrText | TEXT NULL | Raw OCR output for reprocessing |
| BookTitle | TEXT NULL | Source cookbook / recipe book name |
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
| Amount | TEXT NULL | Numeric/textual amount e.g. "2" |
| Unit | TEXT NULL | Unit string e.g. "cups" |
| SortOrder | INTEGER | |

---

## Docker / Deployment

- [x] `backend/Dockerfile` — multi-stage build (SDK → ASP.NET runtime); SQLite DB persisted via named volume
- [x] `frontend/Dockerfile` — multi-stage build (Node → nginx); accepts `VITE_API_BASE_URL` build arg
- [x] `ocr-service/Dockerfile` — Python 3.11-slim; PaddleOCR + PaddlePaddle (CPU); models cached in Docker volume; Swagger UI at `/docs`
- [x] `build-ocr.ps1` — PowerShell helper script; sets `DOCKER_BUILDKIT=1` so the pip cache mount is active (avoids re-downloading PaddlePaddle wheels on every requirements change); supports `-NoCache` and `-Pull` flags
- [x] `docker-compose.yml` — all three services wired together:
  - `ocr-service` exposes :8001
  - `backend` depends on `ocr-service` with `condition: service_healthy` (health check on `/health`, 60s start period); `OcrService__BaseUrl=http://ocr-service:8001`; CORS allows `https://localhost`
  - `frontend` depends on `backend`; HTTP :80 redirects to HTTPS :443; self-signed cert generated at image build time; nginx has a dedicated SSE location block for `/api/v1/ocr-sessions/` (`proxy_buffering off`, `proxy_read_timeout 220s`) before the generic `/api/` proxy block (`client_max_body_size 10m`, `proxy_read_timeout 210s`)
- [x] HTTPS support:
  - Dev server: `@vitejs/plugin-basic-ssl` → `https://localhost:5173`; `appsettings.Development.json` adds `https://localhost:5173` to CORS
  - Docker: nginx serves HTTP on :80 (redirects to HTTPS) and HTTPS on :443 with a self-signed cert; host ports `80:80` and `443:443`

---

## Open / Future Decisions
- `[x]` OCR upgrade: replaced EasyOCR with PaddleOCR (PP-OCRv5) for better accuracy and faster inference; latin model covers English + German
- `[ ]` Ingredient fuzzy matching: Levenshtein distance or synonym table (Phase 4)
- `[ ]` LLM recipe suggestion: `IRecipeSuggestionService` interface exists as a seam; implement when needed
- `[ ]` Image storage: local filesystem for now; Azure Blob / S3 upgrade path via `IImageStorageService`
- `[ ]` Authentication / multi-user support (not in scope currently)

---

## Development Guidelines
- **Unit tests are required** for all service and business logic implementations to prevent regressions. Write tests alongside each phase's service layer before marking tasks complete.

## Known Issues / Tech Debt
- `imageEnhance.ts` removed from frontend; `Agents.md` Phase 7 checkbox updated to reflect removal — no code change needed
- Model name in docs was incorrect (`mistral:latest`) — corrected to `ministral-3:3b` to match `ingredient-parser/main.py` and `entrypoint.sh`
- NavBar icon description in CLAUDE.md was incorrect ("flat inline SVG") — corrected to lucide-react
