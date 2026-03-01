# recipeAId

A recipe management app that reads physical recipe cards with your camera. Point your phone at a recipe card, and the OCR pipeline extracts the title, ingredients, and instructions into a searchable database. Later, search by title or by the ingredients you actually have in the kitchen.

---

## Features

- **Scan recipe cards** — upload a photo or use your phone camera (iPhone HEIC supported); OCR extracts title, ingredients (supports both "2 cups flour" and "Flour 200 g" formats), and instructions automatically (English + German section headers)
- **Review before saving** — the OCR result comes back as a draft you can edit before confirming
- **4-step recipe wizard** — add recipes manually in four focused steps: Title → Ingredients → Instructions → Book; OCR capture available at every step
- **Browse & search** — filter recipes by title or by cookbook/book title; search by the ingredients you have on hand (ranked by match count)
- **Weekly planner** — select recipes for the week; a shopping list is generated automatically with ingredient quantities summed across recipes
- **Unit conversion** — convert quantities between imperial and metric (cups → mL, oz → g, °F → °C, and more)
- **PWA / mobile-first** — installable on iOS and Android; bottom tab bar navigation with safe-area support

---

## Quick start (Docker)

The easiest way to run the whole stack is Docker Compose. You need [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

```bash
git clone https://github.com/StuehlerM/recipeAId.git
cd recipeAId
docker compose up --build
```

> **First build takes a few minutes** — the OCR image downloads PyTorch and the ~200 MB EasyOCR model. Subsequent builds are fast thanks to Docker's layer cache and the BuildKit pip cache. The backend waits for the OCR sidecar's health check before starting.
>
> **Rebuilding only the OCR image:** Use `.\build-ocr.ps1` (PowerShell) instead of `docker compose up --build`. It sets `DOCKER_BUILDKIT=1` so the pip cache is active and wheels are not re-downloaded on every build.

Once running:

| Service  | URL                                                                 |
|----------|---------------------------------------------------------------------|
| Frontend | https://localhost:3443 (HTTP on :3000 redirects automatically)      |
| Backend  | http://localhost:8080                                               |
| OCR      | http://localhost:8001                                               |

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
pip install -r requirements.txt   # downloads ~200 MB EasyOCR model on first run
uvicorn main:app --port 8001
```

The sidecar must be running for the upload feature to work.

### 2. Backend API

```bash
cd backend
dotnet run --project src/RecipeAId.Api
```

The SQLite database is created automatically on first run. The interactive API explorer is available at `http://localhost:<port>/scalar/v1`.

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
├── docker-compose.yml
├── docker-compose.integration.yml
├── ocr-service/           # Python FastAPI + EasyOCR (port 8001)
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── backend/               # ASP.NET Core 9 Web API
│   ├── RecipeAId.sln
│   ├── src/
│   │   ├── RecipeAId.Core/    # Entities, interfaces, DTOs (one per file), services
│   │   ├── RecipeAId.Data/    # EF Core + SQLite, repositories, migrations
│   │   └── RecipeAId.Api/     # Controllers, OCR services, middleware
│   ├── tests/
│   │   └── RecipeAId.Tests/   # xUnit + Moq
│   └── Dockerfile
├── frontend/              # React 19 + Vite 7 + TypeScript
│   ├── src/
│   │   ├── api/               # client.ts, types.ts, mockData.ts
│   │   ├── components/        # Shared: NavBar, OcrCaptureButton
│   │   ├── hooks/             # Shared: useOcrCapture.ts
│   │   └── features/          # Feature-based modules
│   │       ├── recipes/       # RecipeListPage, RecipeDetailPage
│   │       ├── search/        # IngredientSearchPage
│   │       ├── upload/        # UploadPage
│   │       ├── add-recipe/    # AddRecipePage wizard, StepIndicator, UnitCombobox
│   │       └── planner/       # PlannerPage, usePlanner, quantityAggregator
│   └── Dockerfile
└── integration/           # BDD integration tests (Cucumber + Playwright)
    ├── features/              # Gherkin .feature files
    ├── src/
    │   ├── steps/             # Step definitions (TypeScript)
    │   └── support/           # World, hooks, server lifecycle
    ├── reports/               # HTML test report (generated, gitignored)
    ├── cucumber.config.js
    └── Dockerfile
```

---

## API reference

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/v1/recipes` | List recipes; optional `?q=` title filter |
| `GET` | `/api/v1/recipes/{id}` | Single recipe with ingredients |
| `POST` | `/api/v1/recipes` | Create recipe (JSON body) |
| `PUT` | `/api/v1/recipes/{id}` | Update recipe |
| `DELETE` | `/api/v1/recipes/{id}` | Delete recipe |
| `POST` | `/api/v1/recipes/from-image` | Upload image → returns OCR draft (does **not** save) |
| `GET` | `/api/v1/recipes/search/by-ingredients` | Ranked search by ingredients (`?ingredients=egg,flour&minMatch=1`) |
| `GET` | `/api/v1/ingredients` | All known ingredients (for autocomplete) |
| `POST` | `/api/v1/convert` | Convert a quantity (`{ "value": "2 cups", "toUnit": "ml" }`) |

All error responses use the [RFC 7807 ProblemDetails](https://datatracker.ietf.org/doc/html/rfc7807) format. Image uploads are limited to 10 MB (enforced by both the backend and the nginx proxy).

The interactive Scalar explorer (`/scalar/v1`) is available in Development mode and lets you try every endpoint in the browser.

---

## Running tests

```bash
cd backend
dotnet test
```

Tests live in `RecipeAId.Tests` and cover all service and business logic. They reference `RecipeAId.Core` only — no database or HTTP required.

---

## Integration tests (BDD)

End-to-end tests are written in [Gherkin](https://cucumber.io/docs/gherkin/) and executed by [Cucumber.js](https://github.com/cucumber/cucumber-js) driving a headless Chromium browser via [Playwright](https://playwright.dev/).

```
integration/
├── features/                  # Human-readable scenarios
│   ├── recipes.feature        # Recipe list + title search
│   ├── recipe-detail.feature  # Detail view + delete
│   ├── create-recipe.feature  # Manual recipe creation form
│   └── ingredient-search.feature
├── src/
│   ├── steps/                 # Cucumber step definitions (TypeScript)
│   └── support/               # World, global hooks, server lifecycle
└── reports/report.html        # Generated after each run (gitignored)
```

> **Note:** The integration tests cover the frontend UI and backend API only. The OCR upload scenario is excluded because it requires the heavy EasyOCR model; use the unit tests in `RecipeAId.Tests` for OCR parsing logic.

### Option A — Docker Compose profile (recommended)

The integration tests are defined as a Docker Compose profile. The normal `docker compose up` starts only frontend + backend + OCR. Adding `--profile integration` also builds and runs the test container.

```bash
# Normal stack only
docker compose up --build

# Stack + integration tests (exits when tests finish)
docker compose --profile integration up --build
```

Use `docker compose --profile integration down -v` to clean up and wipe the test database between runs.

```bash
# First run (or after changes): build all images
docker compose -f docker-compose.integration.yml build

# Run the tests — exits with the integration container's exit code
docker compose -f docker-compose.integration.yml up --exit-code-from integration

# View the HTML report (written to integration/reports/report.html)
# Open the file in your browser after the run.

# Clean up containers AND the isolated test database when done
docker compose -f docker-compose.integration.yml down -v
```

Always run `down -v` between test runs to start from a clean database. Without `-v`, data seeded by a previous run persists and can cause false failures in scenarios that assert a record is absent.

### Option B — Local (no Docker)

When you want faster feedback during development the test runner can start the backend and frontend for you automatically (set by `SPAWN_SERVERS`, which defaults to `true`).

**Prerequisites:** .NET 9 SDK, Node.js 24+, npm.

```bash
cd integration
npm install
npm run install:browsers   # download Playwright's Chromium (one-time)
npm test                   # starts backend + frontend, runs all scenarios
```

The runner:
1. Deletes any leftover `recipeaid-test.db` from the previous run.
2. Starts the ASP.NET backend (`dotnet run`) with `ASPNETCORE_ENVIRONMENT=Development` pointing at the isolated test DB, then waits until `/openapi/v1.json` responds.
3. Starts the Vite dev server (`npm run dev`) and waits until it responds.
4. Runs all Cucumber scenarios in series (one browser context per scenario).
5. Shuts both servers down and writes `reports/report.html`.

To run a single feature file:

```bash
npm run test:feature -- features/recipes.feature
```

To run with a visible browser window (useful for debugging):

```bash
npm run test:headed
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, TypeScript, Tailwind CSS v4, TanStack Query v5, React Router v6 |
| PWA | vite-plugin-pwa (installable, standalone, theme-color) |
| Backend | ASP.NET Core 9, Entity Framework Core 9, SQLite |
| OCR | Python 3.11, EasyOCR (English + German), FastAPI, uvicorn |
| Container | Docker Compose (three services + optional integration profile) |
| TLS | Self-signed cert (nginx, generated at image build time); `@vitejs/plugin-basic-ssl` for the Vite dev server |
