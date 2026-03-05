# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

```
recipeaid/
├── Agents.md          # Phase tracker and full API reference
├── build-ocr.ps1      # PowerShell helper — builds ocr-service image with BuildKit caching
├── ocr-service/       # Python PaddleOCR sidecar (FastAPI, port 8001)
├── backend/           # ASP.NET Core 9 Web API
│   ├── RecipeAId.sln
│   ├── src/
│   │   ├── RecipeAId.Core/   # Entities, interfaces, DTOs, services (no infra deps)
│   │   ├── RecipeAId.Data/   # EF Core + SQLite, repositories, migrations
│   │   └── RecipeAId.Api/    # Controllers, OCR services, middleware, Program.cs
│   └── tests/
│       └── RecipeAId.Tests/  # xUnit + Moq — references Core only
├── frontend/          # React 19 + Vite 7 + TypeScript + Tailwind CSS v4
│   └── src/
│       ├── api/            # client.ts, mockData.ts, types.ts
│       ├── components/     # Shared: NavBar (bottom tab bar), OcrCaptureButton, CropModal, CameraCapture
│       ├── hooks/          # Shared: useOcrCapture.ts
│       ├── utils/          # imageAnalysis.ts (sharpness variance + shadow detection for live camera)
│       └── features/       # Feature-based modules
│           ├── recipes/    # RecipeListPage, RecipeDetailPage (+ CSS modules)
│           ├── search/     # IngredientSearchPage (+ CSS module)
│           ├── upload/     # UploadPage (+ CSS module)
│           ├── add-recipe/ # AddRecipePage (4-step wizard), StepIndicator, UnitCombobox
│           │               # Step components: StepTitle, StepIngredients, StepInstructions, StepBook
│           │               # types.ts — shared IngredientRow type { name, amount, unit }
│           └── planner/    # PlannerPage, usePlanner.ts, quantityAggregator.ts
└── integration/       # BDD integration tests (Cucumber.js + Playwright)
    ├── features/          # Gherkin .feature files (recipes, detail, create, search, planner)
    ├── src/steps/         # Step definitions (TypeScript)
    ├── src/support/       # World class, hooks (server lifecycle, DB cleanup)
    ├── cucumber.config.cjs # Cucumber.js config (ESM via tsx/esm)
    ├── nginx-integration.conf # Plain HTTP nginx override for Docker tests
    └── Dockerfile
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

**Styling:** Tailwind CSS v4 via `@tailwindcss/vite`. Custom color tokens are defined in `src/index.css` under `@theme`. The app uses a **light theme**. Key tokens:
- `canvas` (#faf9f7) — page background
- `card` (#ffffff) — surfaces / nav bar
- `tint` (#f5f3ef) — subtle fills
- `edge` (#e0dbd4) — borders
- `sage` (#5c7a52) — primary accent (active states, CTAs, FAB)
- `sage-light` (#7a9870) — lighter accent
- `ink` (#1a1917) — primary text
- `ghost` (#6b6560) — secondary text / placeholders
- `rose` (#b54f4f) — destructive
- `rose-dark` (#8b3a3a) — destructive hover

New pages use Tailwind classes; existing pages keep their CSS Modules.

**Frontend dependencies:** sonner (toast notifications), react-image-crop (crop modal), @tailwindcss/vite, TanStack Query v5, React Router v6. NavBar uses flat inline SVG icons.

## OCR sidecar commands

All sidecar commands run from `ocr-service/`.

```bash
# Install dependencies (one-time; first run also downloads the PaddleOCR models ~50 MB)
pip install paddlepaddle==3.2.0 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/
pip install -r requirements.txt

# Start the sidecar (required for POST /api/v1/recipes/from-image to work)
uvicorn main:app --port 8001
```

Swagger UI: `http://localhost:8001/docs` — lets you test the `/ocr` endpoint directly with image uploads.

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
- OCR sidecar: http://localhost:8001 (Swagger UI at `/docs`)

**Note:** The first `docker compose build` for `ocr-service` downloads PaddleOCR and PaddlePaddle wheels. Subsequent builds use the Docker cache and are fast.

**Rebuilding only the OCR image (faster):** Use `build-ocr.ps1` instead of `docker compose up --build`. It sets `DOCKER_BUILDKIT=1`, which activates the `--mount=type=cache` pip cache in the Dockerfile so PaddlePaddle wheels are not re-downloaded when requirements change.

```powershell
.\build-ocr.ps1            # normal build (uses layer + pip cache)
.\build-ocr.ps1 -NoCache   # fully clean rebuild
.\build-ocr.ps1 -Pull      # also refresh the python:3.11-slim base image
```

**Note:** The frontend Docker image generates a self-signed TLS cert at build time using `openssl`. nginx serves HTTP on port 80 (redirect only) and HTTPS on port 443. Host mappings: `3000:80` and `3443:443`. The `/api/` proxy block sets `client_max_body_size 10m` (matching the backend limit) and `proxy_read_timeout 35s` (covering OCR's 30-second processing).

## Integration tests (BDD)

BDD integration tests use Cucumber.js + Playwright (headless Chromium). Run from the repo root:

```bash
# Docker (recommended) — builds backend, frontend (plain HTTP), and test container
docker compose -f docker-compose.integration.yml up --build

# Clean up after
docker compose -f docker-compose.integration.yml down -v
```

```bash
# Local (from integration/) — auto-starts backend + frontend
cd integration
npm install
npm run install:browsers   # one-time Chromium download
npm test
```

**Key details:**
- Config: `integration/cucumber.config.cjs` — ESM module loading via `tsx/esm` (package.json has `"type": "module"`)
- Each scenario cleans all recipes via API `Before` hook — no manual DB reset needed
- Docker uses `nginx-integration.conf` (plain HTTP on port 80, no HTTPS redirect) mounted into the frontend container
- Feature files: `recipes`, `recipe-detail`, `create-recipe`, `ingredient-search`, `planner` (14 scenarios, 90 steps)
- HTML report: `integration/reports/report.html` (mounted out of Docker)

## Architecture

**Dependency rule:** `Api → Core ← Data`. Core has zero infrastructure dependencies; all interfaces live there.

**Backend service lifetimes:**
- `UnitConversionService` — `AddSingleton` (stateless lookup tables)
- Everything else (services, repositories, OCR services) — `AddScoped`

**DTO organization:** one record per file in `Core/DTOs/`. `OcrResult` (returned by `IOcrService`) also lives in DTOs.

**Service layer consistency:** all controllers depend on service interfaces, not repositories directly. `IIngredientService` / `IngredientService` handles ingredient queries; `IRecipeService` / `RecipeService` handles recipe CRUD. `RecipeService` uses a private `BuildIngredientsAsync` helper to avoid duplicating ingredient normalization logic between create and update.

**Key architectural decision — `IRecipeRepository.UpdateAsync`:** takes an explicit `newIngredients` list. The repository deletes all existing `RecipeIngredient` rows and re-inserts to avoid EF Core change-tracking conflicts.

**OCR architecture:** `PythonOcrService` (in `RecipeAId.Api/OcrServices/`) implements `IOcrService` by forwarding images to the Python PaddleOCR sidecar via a named `HttpClient` (30-second timeout). `OcrParserService` (in `RecipeAId.Core/Services/`) implements `IOcrParser` with pure string logic — no infra deps, fully unit-tested. Regex patterns use `[GeneratedRegex]` source generators for performance. Three ingredient patterns are tried in order: `amount unit name` ("2 cups flour"), `name amount unit` ("Flour 200 g"), and `name amount` ("Eggs 2"). German section headers are supported ("Zutaten", "Zubereitung"). Run-on ingredient lines (OCR with no newlines) are split at quantity+unit boundaries and case transitions before parsing. The sidecar uses PaddleOCR's `predict()` with bounding-box y-coordinate grouping to reconstruct proper line breaks from the image layout (text blocks on the same visual line are merged, separate lines get `\n`). PIL images are converted to numpy arrays via `np.array()` before passing to PaddleOCR. The `lang="de"` setting loads the latin PP-OCRv5 model which covers both German and English (45 Latin-script languages). The sidecar URL is configurable via `OcrService:BaseUrl` in `appsettings.json` (default: `http://localhost:8001`). Image uploads are limited to 10 MB. **Sidecar preprocessing pipeline** (applied before PaddleOCR): (1) perspective correction via Canny edge detection + largest-quadrilateral contour + `getPerspectiveTransform`; (2) median blur denoising (3×3) to remove paper-texture noise; (3) deskewing via `HoughLinesP` dominant angle rotation; (4) Gaussian adaptive thresholding with resolution-relative block size. Each step falls back to the unmodified image when no usable geometry is found. Requires `opencv-python-headless`.

**Frontend image handling:** When `getUserMedia` is available, tapping Scan opens `CameraCapture` — a fullscreen `z-[70]` overlay with a live `getUserMedia` video stream (environment-facing, 1080p ideal). It provides four overlays: (1) a guide frame with corner accents and scrim, (2) a `LevelIndicator` sub-component with a bubble that moves with device tilt (DeviceOrientationEvent, iOS 13+ permission-gated), (3) shadow detection badge (high-contrast lighting heuristic via `imageAnalysis.ts`), (4) blur detection badge (Laplacian variance — capture button disabled when blurry). Torch toggle is shown when `track.getCapabilities()?.torch` is present. On capture, a full-res canvas JPEG is passed to `handleCameraCapture` → `CropModal` opens while the camera stream stays alive (`hidden` prop instead of unmount, z-[60]). After crop confirm or cancel, `setShowCamera(false)` stops the stream. If `getUserMedia` is unavailable (desktop without webcam, permission denied), `useOcrCapture` falls back to a hidden `<input type="file" capture="environment">` (existing OS picker flow). `imageAnalysis.ts` exports `computeSharpnessVariance` (Laplacian variance over center 50% of frame) and `detectShadow` (mean luma + dark/bright pixel ratio heuristic). On crop confirm, the cropped canvas is converted to JPEG (quality 0.92) and downscaled to max 2048px via `toJpeg` in `useOcrCapture.ts` — purely for network efficiency. All OCR-specific image preprocessing (perspective correction, denoising, deskewing, adaptive thresholding) runs server-side in the OCR sidecar (`imageEnhance.ts` has been removed). No images are stored — they are disposed after text extraction. Both `OcrCaptureButton` (used in AddRecipePage steps) and `UploadPage` (which has its own file input) share the same crop modal.

**Frontend API client (`src/api/client.ts`):** uses `VITE_API_BASE_URL` to toggle between real fetch calls and mock data. All endpoints — including OCR — fall back to mock data when `VITE_API_BASE_URL` is not set.

**Error handling:** all error responses use `ProblemDetails` (RFC 7807) — both inline controller validation and the global `ExceptionHandlingMiddleware`. The `detail` field is only populated in Development for unhandled exceptions.

**Database indexes:** `Ingredient.Name` (unique), `Recipe.Title` (non-unique, for title filter queries).

**CORS:** `DevPolicy` is applied globally (not environment-gated). Origins are configured via `Cors:AllowedOrigins` — defaulting to `["http://localhost:5173", "https://localhost:5173"]` in Development (`appsettings.Development.json`) and `https://localhost:3443` in Docker (`docker-compose.yml`). Since nginx proxies `/api/` to the backend on the same origin, CORS is not exercised in the Docker setup anyway.

## Implementation workflow

When starting any implementation task, always use a git worktree:

```bash
# 1. Create a worktree with a new branch
git worktree add .worktrees/<feature-name> -b <feature-name>

# 2. Do all work and commits inside the worktree directory
cd .worktrees/<feature-name>

# 3. Once done, go back to main and merge
cd ../..
git merge <feature-name>

# 4. Clean up the worktree and branch
git worktree remove .worktrees/<feature-name>
git branch -d <feature-name>
```

This keeps main clean and all in-progress work isolated.

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
