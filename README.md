# recipeAId

A recipe management app that reads physical recipe cards with your camera. Point your phone at a recipe card, and the OCR pipeline extracts the title, ingredients, and instructions into a searchable database. Later, search by title or by the ingredients you actually have in the kitchen.

---

## Features

- **Scan recipe cards** — a custom fullscreen camera overlay provides a live viewfinder with a recipe-card guide frame; real-time indicators warn you about blur and shadow while a bubble level helps you hold the phone steady; tap the capture button to snap, then crop to just the text area; OCR pipeline extracts title, ingredients (supports both "2 cups flour" and "Flour 200 g" formats), and instructions automatically (English + German section headers); falls back to the OS file picker on desktop or when camera permission is denied
- **Review before saving** — the OCR result comes back as a draft you can edit before confirming
- **4-step recipe wizard** — add recipes manually in four focused steps: Title → Ingredients → Instructions → Book; OCR capture available at every step
- **Browse & search** — filter recipes by title or by cookbook/book title; search by the ingredients you have on hand (ranked by match count)
- **Weekly planner** — select recipes for the week; a shopping list is generated automatically with ingredient quantities summed across recipes
- **Dark theme** — toggle in Settings; preference persisted across sessions via localStorage
- **PWA / mobile-first** — installable on iOS and Android; bottom tab bar navigation with safe-area support

---

## Quick start (Docker)

The easiest way to run the whole stack is Docker Compose. You need [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

```bash
git clone https://github.com/StuehlerM/recipeAId.git
cd recipeAId
docker compose up --build
```

> **First build takes a few minutes** — the OCR image downloads PaddlePaddle and PaddleOCR; the ingredient-parser image downloads Ministral 3B (~4 GB) on first container startup into the `ollama-models` Docker volume. Subsequent builds and starts are fast. The backend waits for both sidecars' health checks before starting.
>
> **Rebuilding only the OCR image:** Use `.\build-ocr.ps1` (PowerShell) instead of `docker compose up --build`. It sets `DOCKER_BUILDKIT=1` so the pip cache is active and wheels are not re-downloaded on every build.

Once running:

| Service           | URL                                                                 |
|-------------------|---------------------------------------------------------------------|
| Frontend          | https://localhost (HTTP on :80 redirects automatically)              |
| Backend           | http://localhost:8080                                               |
| OCR               | http://localhost:8001 (Swagger UI at `/docs`)                       |
| Ingredient parser | Docker-internal only (port 8002, no host mapping)                   |

> **Self-signed certificate:** Your browser will show a security warning on first visit. Click **Advanced → Proceed to localhost** to continue. On iOS Safari, tap **Show Details → visit this website**. You only need to do this once per browser/device.

To stop:

```bash
docker compose down          # stop containers, keep database
docker compose down -v       # stop containers AND wipe the database
```

---

## Manual setup (development)

Run each service individually when you want hot-reload and the interactive API explorer.

### Prerequisites

| Tool | Version |
|------|---------|
| .NET SDK | 9.0+ |
| Node.js | 24+ |
| Python | 3.10+ |

### 1. OCR sidecar

```bash
cd ocr-service
pip install paddlepaddle==3.2.0 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/
pip install -r requirements.txt   # downloads PaddleOCR models on first run
uvicorn main:app --port 8001
```

The sidecar must be running for the upload feature to work. Swagger UI is available at `http://localhost:8001/docs` for testing the OCR endpoint directly.

### 2. Backend API

```bash
cd backend
dotnet run --project src/RecipeAId.Api
```

The LiteDB database is created automatically on first run. The interactive API explorer is available at `http://localhost:<port>/scalar/v1`.

### 3. Frontend

```bash
cd frontend

# Create a .env.local pointing at your local backend
echo "VITE_API_BASE_URL=http://localhost:<port>" > .env.local

npm install
npm run dev
```

Open https://localhost:5173 (the dev server uses a self-signed cert via `@vitejs/plugin-basic-ssl`; accept the browser warning once). Without `VITE_API_BASE_URL` set, the frontend runs entirely on built-in mock data — useful for UI work without a backend.

---

## Project structure

```
recipeaid/
├── .github/
│   └── workflows/
│       └── integration.yml    # CI: BDD integration tests on every PR to main
├── .githooks/
│   └── pre-push               # Local git hook: runs unit tests before every push
├── scripts/
│   ├── run-unit-tests.sh      # Runs all four unit-test layers (called by the hook)
│   └── install-hooks.sh       # One-time setup: activates the pre-push hook
├── docker-compose.yml
├── docker-compose.integration.yml
├── ocr-service/               # Python FastAPI + PaddleOCR (port 8001)
│   ├── main.py
│   ├── requirements.txt
│   ├── requirements-test.txt  # Test-only deps (pytest, httpx, pillow…)
│   ├── tests/                 # Unit tests (PaddleOCR mocked)
│   └── Dockerfile
├── ingredient-parser/         # Python FastAPI + Ministral 3B/Ollama (port 8002, Docker-internal)
│   ├── main.py                #   POST /parse, GET /health, GET /status
│   ├── sanitizer.py           #   4-layer prompt injection defense
│   ├── prompt.py              #   hardcoded system prompt + XML delimiters
│   ├── requirements.txt
│   ├── entrypoint.sh          #   starts Ollama, pulls model, starts uvicorn
│   ├── Dockerfile
│   └── tests/                 # Unit tests (Ollama mocked)
├── backend/                   # ASP.NET Core 9 Web API
│   ├── RecipeAId.sln
│   ├── src/
│   │   ├── RecipeAId.Core/    # Entities, interfaces, DTOs (one per file), services
│   │   ├── RecipeAId.Data/    # LiteDB, repositories
│   │   └── RecipeAId.Api/     # Controllers, OCR + parser services, middleware
│   ├── tests/
│   │   └── RecipeAId.Tests/   # xUnit + Moq
│   └── Dockerfile
├── frontend/                  # React 19 + Vite 7 + TypeScript
│   ├── src/
│   │   ├── api/               # client.ts, types.ts, mockData.ts
│   │   ├── components/        # Shared: NavBar, OcrCaptureButton, CropModal, CameraCapture
│   │   ├── hooks/             # Shared: useOcrCapture.ts
│   │   ├── utils/             # imageAnalysis.ts (blur/shadow detection)
│   │   └── features/          # Feature-based modules
│   │       ├── recipes/       # RecipeListPage, RecipeDetailPage
│   │       ├── search/        # IngredientSearchPage
│   │       ├── upload/        # UploadPage
│   │       ├── add-recipe/    # AddRecipePage wizard, StepIndicator, UnitCombobox
│   │       ├── planner/       # PlannerPage, usePlanner, quantityAggregator
│   │       └── settings/      # SettingsPage, ThemeContext (dark/light toggle)
│   └── Dockerfile
└── integration/               # BDD integration tests (Cucumber + Playwright)
    ├── features/              # Gherkin .feature files
    ├── src/
    │   ├── steps/             # Step definitions (TypeScript)
    │   └── support/           # World, global hooks, server lifecycle
    ├── reports/               # HTML test report (generated, gitignored)
    ├── cucumber.config.cjs
    ├── nginx-integration.conf # Plain HTTP nginx config for Docker tests
    └── Dockerfile
```

---

## Testing

The project uses a two-layer test strategy: **unit tests run locally before every push** (fast, ~45 s), and **integration tests run automatically on every pull request** via GitHub Actions (thorough, ~8-10 min).

### Test layers

| # | Layer | What it tests | How | Speed |
|---|-------|--------------|-----|-------|
| 1 | **Backend unit tests** | OcrParserService, RecipeService, RecipeMatchingService, UnitConversionService | `dotnet test` | ~5 s |
| 2 | **OCR sidecar unit tests** | Preprocessing pipeline, line-grouping, endpoint validation (PaddleOCR mocked) | `pytest ocr-service/tests/` | ~3 s |
| 3 | **Ingredient parser unit tests** | Sanitizer, LLM output parsing, sanity bounds, endpoint behaviour (Ollama mocked) | `pytest ingredient-parser/tests/` | ~3 s |
| 4 | **Frontend build** | TypeScript compilation, no type errors, Vite bundle succeeds | `npm run build` | ~25 s |
| 5 | **BDD integration tests** | Full stack end-to-end: browser UI, backend API, database, real Docker services | Cucumber + Playwright | ~8-10 min |

### Running unit tests manually

```bash
# Run all four unit-test layers at once
./scripts/run-unit-tests.sh

# Or run each layer individually:
dotnet test backend/
python -m pytest ocr-service/tests/ -v
python -m pytest ingredient-parser/tests/ -v
cd frontend && npm run build
```

For the Python layers, install the test dependencies once:
```bash
pip install -r ocr-service/requirements-test.txt
pip install fastapi pydantic python-multipart pytest pytest-asyncio httpx
```

### Pre-push hook (automatic unit tests)

After cloning, run the one-time setup to activate the git hook:

```bash
./scripts/install-hooks.sh
```

From that point on, `git push` automatically runs all unit tests first. A failed layer blocks the push and shows which layer failed. **The hook is never a surprise** — you always see what it is running.

**Bypass (for trivial changes):**
```bash
git push --no-verify   # skip unit tests for this push only
```

Use `--no-verify` deliberately for small changes like tweaking a config value or fixing a typo. The integration tests in CI still run when you open a PR.

### Integration tests (BDD)

End-to-end tests are written in [Gherkin](https://cucumber.io/docs/gherkin/) and executed by [Cucumber.js](https://github.com/cucumber/cucumber-js) driving a headless Chromium browser via [Playwright](https://playwright.dev/).

Feature files:

| File | Scenarios |
|------|-----------|
| `recipes.feature` | Recipe list, title search |
| `recipe-detail.feature` | Detail view, delete |
| `create-recipe.feature` | 4-step wizard |
| `ingredient-search.feature` | Chip input, ranked results |
| `planner.feature` | Weekly planner, shopping list |
| `settings.feature` | Dark theme toggle, preference restored after reload |
| `image-storage.feature` | Image slot 404, invalid slot 400, stored image visible |

**Run locally (Docker — recommended):**

```bash
# Build and run all integration tests
docker compose -f docker-compose.integration.yml up --build

# View the HTML report
open integration/reports/report.html

# Clean up
docker compose -f docker-compose.integration.yml down -v
```

Each scenario automatically cleans all recipes via the API before running — no manual database reset needed.

---

## CI / CD (GitHub Actions)

### What runs and when

| Event | Workflow | What it does |
|-------|----------|--------------|
| Pull request to `main` | `integration.yml` | Builds the full Docker stack, runs all BDD scenarios |

The integration workflow uploads an HTML test report as a build artifact (retained for 14 days) so you can inspect failures without re-running locally.

**This is free** — the repository is public, so GitHub Actions usage is unlimited at no cost.

### Branch protection (required setup)

To enforce the PR-before-merge rule, configure branch protection in **GitHub → Settings → Branches → Add rule** for the `main` branch:

| Setting | Value |
|---------|-------|
| Require a pull request before merging | ✅ enabled |
| Require status checks to pass before merging | ✅ enabled |
| Status check to require | `BDD integration tests (Docker)` |
| Do not allow bypassing the above settings | ❌ **leave unchecked** — see bypass below |

> **One-time setup:** The `BDD integration tests (Docker)` check only appears in the dropdown after the workflow has run at least once. Open a test PR, let CI run, then come back and add the check.

### Bypass for small changes (admin only)

Because "Do not allow bypassing" is **not** checked, repository admins (you) can push directly to `main` without opening a PR. This is the escape hatch for trivial changes:

```bash
# Small change: push directly to main, skip unit tests, skip CI
git commit -m "tweak temperature parameter [skip ci]"
git push --no-verify
```

Two explicit flags required — `--no-verify` skips the local pre-push hook, and `[skip ci]` in the commit message tells GitHub Actions to skip the integration workflow. Forgetting either one still provides a safety net.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, TypeScript, Tailwind CSS v4, TanStack Query v5, React Router v6, sonner (toasts) |
| PWA | vite-plugin-pwa (installable, standalone, theme-color) |
| Backend | ASP.NET Core 9, LiteDB v5 (embedded document DB) |
| OCR | Python 3.11, PaddleOCR PP-OCRv5 (English + German), FastAPI, uvicorn |
| Ingredient parser | Python 3.11, Ollama + Ministral 3B, FastAPI, uvicorn; 4-layer prompt injection defense; transient-failure retry logic (3 attempts, exponential backoff) |
| Testing | xUnit + Moq (backend), pytest + httpx (Python sidecars), Cucumber.js + Playwright (BDD) |
| CI | GitHub Actions (integration tests on every PR to main, free for public repos) |
| Container | Docker Compose (four services); dedicated `docker-compose.integration.yml` for BDD tests |
| TLS | Self-signed cert (nginx, generated at image build time); `@vitejs/plugin-basic-ssl` for the Vite dev server |
