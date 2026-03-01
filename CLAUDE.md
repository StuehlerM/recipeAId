# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

```
recipeaid/
├── Agents.md          # Phase tracker and full API reference
├── build-ocr.ps1      # PowerShell helper — builds ocr-service image with BuildKit caching
├── ocr-service/       # Python EasyOCR sidecar (FastAPI, port 8001)
├── backend/           # ASP.NET Core 9 Web API
│   ├── RecipeAId.sln
│   ├── src/
│   │   ├── RecipeAId.Core/   # Entities, interfaces, DTOs, services (no infra deps)
│   │   ├── RecipeAId.Data/   # EF Core + SQLite, repositories, migrations
│   │   └── RecipeAId.Api/    # Controllers, OCR services, middleware, Program.cs
│   └── tests/
│       └── RecipeAId.Tests/  # xUnit + Moq — references Core only
└── frontend/          # React 19 + Vite 7 + TypeScript + Tailwind CSS v4
    └── src/
        ├── api/            # client.ts, mockData.ts, types.ts
        ├── components/     # Shared: NavBar (bottom tab bar), OcrCaptureButton
        ├── hooks/          # Shared: useOcrCapture.ts
        └── features/       # Feature-based modules
            ├── recipes/    # RecipeListPage, RecipeDetailPage (+ CSS modules)
            ├── search/     # IngredientSearchPage (+ CSS module)
            ├── upload/     # UploadPage (+ CSS module)
            ├── add-recipe/ # AddRecipePage (4-step wizard), StepIndicator, UnitCombobox
            └── planner/    # PlannerPage, usePlanner.ts, quantityAggregator.ts
```

## Backend commands

All backend commands run from `backend/`.

```bash
# Run the API (SQLite DB auto-created on first run)
dotnet run --project src/RecipeAId.Api

# Run all tests
dotnet test

# Run a single test class
dotnet test --filter "ClassName=UnitConversionServiceTests"

# Run a single test method
dotnet test --filter "FullyQualifiedName~ConvertCupsToMillilitres"

# Add a new EF Core migration (run from backend/)
dotnet ef migrations add <MigrationName> --project src/RecipeAId.Data --startup-project src/RecipeAId.Api
```

API explorer (Development only): `https://localhost:<port>/scalar/v1`
OpenAPI spec: `https://localhost:<port>/openapi/v1.json`

## Frontend commands

All frontend commands run from `frontend/`.

```bash
npm run dev      # Vite dev server at https://localhost:5173 (self-signed cert via @vitejs/plugin-basic-ssl)
npm run build    # tsc + vite build
npm run lint     # ESLint
```

To point the frontend at a real backend, set `VITE_API_BASE_URL=http://localhost:<port>` in a `.env.local` file. Without it, `client.ts` falls back to mock data automatically for all endpoints.

**Styling:** Tailwind CSS v4 via `@tailwindcss/vite`. Custom color tokens are defined in `src/index.css` under `@theme`. Key tokens: `spruce` (#0c4e13), `spruce-dark` (#071f08), `spruce-mid` (#163d1c), `olive` (#a7b16f), `walnut` (#61210f). New pages use Tailwind classes; existing pages keep their CSS Modules.

## OCR sidecar commands

All sidecar commands run from `ocr-service/`.

```bash
# Install dependencies (one-time; first run also downloads the ~200 MB EasyOCR model)
pip install -r requirements.txt

# Start the sidecar (required for POST /api/v1/recipes/from-image to work)
uvicorn main:app --port 8001
```

## Docker commands

Run the full stack (backend + ocr-service + frontend) from the repo root:

```bash
# Build and start all three services
docker compose up --build

# Start without rebuilding
docker compose up

# Stop and remove containers
docker compose down

# Stop and also remove the SQLite volume (wipes database)
docker compose down -v
```

Services after `docker compose up`:
- Frontend: https://localhost:3443 (HTTP on :3000 redirects automatically; self-signed cert — accept the browser warning once)
- Backend API: http://localhost:8080
- OCR sidecar: http://localhost:8001

**Note:** The first `docker compose build` for `ocr-service` downloads the ~200 MB EasyOCR model into the image layer. Subsequent builds use the Docker cache and are fast.

**Rebuilding only the OCR image (faster):** Use `build-ocr.ps1` instead of `docker compose up --build`. It sets `DOCKER_BUILDKIT=1`, which activates the `--mount=type=cache` pip cache in the Dockerfile so torch/EasyOCR wheels are not re-downloaded when requirements change.

```powershell
.\build-ocr.ps1            # normal build (uses layer + pip cache)
.\build-ocr.ps1 -NoCache   # fully clean rebuild
.\build-ocr.ps1 -Pull      # also refresh the python:3.11-slim base image
```

**Note:** The frontend Docker image generates a self-signed TLS cert at build time using `openssl`. nginx serves HTTP on port 80 (redirect only) and HTTPS on port 443. Host mappings: `3000:80` and `3443:443`. The `/api/` proxy block sets `client_max_body_size 10m` (matching the backend limit) and `proxy_read_timeout 35s` (covering OCR's 30-second processing).

## Architecture

**Dependency rule:** `Api → Core ← Data`. Core has zero infrastructure dependencies; all interfaces live there.

**Backend service lifetimes:**
- `UnitConversionService` — `AddSingleton` (stateless lookup tables)
- Everything else (services, repositories, OCR services) — `AddScoped`

**DTO organization:** one record per file in `Core/DTOs/`. `OcrResult` (returned by `IOcrService`) also lives in DTOs.

**Service layer consistency:** all controllers depend on service interfaces, not repositories directly. `IIngredientService` / `IngredientService` handles ingredient queries; `IRecipeService` / `RecipeService` handles recipe CRUD. `RecipeService` uses a private `BuildIngredientsAsync` helper to avoid duplicating ingredient normalization logic between create and update.

**Key architectural decision — `IRecipeRepository.UpdateAsync`:** takes an explicit `newIngredients` list. The repository deletes all existing `RecipeIngredient` rows and re-inserts to avoid EF Core change-tracking conflicts.

**OCR architecture:** `PythonOcrService` (in `RecipeAId.Api/OcrServices/`) implements `IOcrService` by forwarding images to the Python EasyOCR sidecar via a named `HttpClient` (30-second timeout). `OcrParserService` (in `RecipeAId.Core/Services/`) implements `IOcrParser` with pure string logic — no infra deps, fully unit-tested. Regex patterns use `[GeneratedRegex]` source generators for performance. Three ingredient patterns are tried in order: `amount unit name` ("2 cups flour"), `name amount unit` ("Flour 200 g"), and `name amount` ("Eggs 2"). German section headers are supported ("Zutaten", "Zubereitung"). The sidecar URL is configurable via `OcrService:BaseUrl` in `appsettings.json` (default: `http://localhost:8001`). Image uploads are limited to 10 MB. The sidecar converts PIL images to numpy arrays via `np.array()` before passing to EasyOCR's `readtext` (EasyOCR does not accept PIL Image objects).

**Frontend image handling:** `useOcrCapture.ts` converts all captured images to JPEG via Canvas before uploading. This handles iPhone HEIC format (which Pillow/EasyOCR cannot read natively) and downscales images larger than 2048px for faster uploads. No images are stored — they are disposed after text extraction.

**Frontend API client (`src/api/client.ts`):** uses `VITE_API_BASE_URL` to toggle between real fetch calls and mock data. All endpoints — including OCR — fall back to mock data when `VITE_API_BASE_URL` is not set.

**Error handling:** all error responses use `ProblemDetails` (RFC 7807) — both inline controller validation and the global `ExceptionHandlingMiddleware`. The `detail` field is only populated in Development for unhandled exceptions.

**Database indexes:** `Ingredient.Name` (unique), `Recipe.Title` (non-unique, for title filter queries).

**CORS:** `DevPolicy` is applied globally (not environment-gated). Origins are configured via `Cors:AllowedOrigins` — defaulting to `["http://localhost:5173", "https://localhost:5173"]` in Development (`appsettings.Development.json`) and `https://localhost:3443` in Docker (`docker-compose.yml`). Since nginx proxies `/api/` to the backend on the same origin, CORS is not exercised in the Docker setup anyway.

## Before committing and pushing

**ALWAYS update these three files before every commit/push — no exceptions:**

- **`CLAUDE.md`** — keep the repository layout, architecture notes, and conventions accurate for the AI agent
- **`Agents.md`** — the authoritative phase tracker and API reference; update phase checkboxes, database schema, and API table to reflect every change
- **`README.md`** — the human-facing project overview; update features, project structure, and API reference so the owner always has an accurate picture

Failing to update these before committing leaves the project documentation out of sync, which makes future work harder.

## Testing conventions

- Test project references `RecipeAId.Core` only — tests must not depend on `RecipeAId.Data` or `RecipeAId.Api`.
- Services under test live in `RecipeAId.Core/Services/`; corresponding tests are in `tests/RecipeAId.Tests/Services/`.
- Use xUnit + Moq. Mock `IRecipeRepository`/`IIngredientRepository` for service tests.
- Unit tests are required for all service/business logic before marking a phase complete.
