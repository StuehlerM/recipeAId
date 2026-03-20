# RecipeAId Copilot Instructions

## Build, test, and lint commands

Run from the repo root unless noted otherwise.

- Full unit/build gate: `./scripts/run-unit-tests.sh`
- Full app stack: `docker compose up --build`
- Stop app stack: `docker compose down` or `docker compose down -v`
- Full BDD stack: `docker compose -f docker-compose.integration.yml up --build`
- Stop BDD stack: `docker compose -f docker-compose.integration.yml down -v`

### Backend (`backend/`)

- Run API: `dotnet run --project src/RecipeAId.Api`
- Run all tests: `dotnet test`
- Run a single test class: `dotnet test --filter "ClassName=OcrParserServiceTests"`
- Run a single test method: `dotnet test --filter "FullyQualifiedName~Parse_StructuredRecipe_ExtractsAllSections"`

### Frontend (`frontend/`)

- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Run all tests: `npm test`
- Run a single test file: `npm test -- src/features/settings/tests/ThemeContext.test.ts`
- Run a single test by name: `npm test -- -t "getStoredTheme returns 'light' when localStorage has no entry"`

Set `VITE_API_BASE_URL=http://localhost:<port>` in `frontend/.env.local` to talk to a real backend. If it is unset in local dev, `src/api/client.ts` falls back to mock data.

### OCR sidecar (`ocr-service/`)

- Install deps: `pip install paddlepaddle==3.2.0 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/ && pip install -r requirements.txt`
- Run service: `uvicorn main:app --port 8001`
- Run all tests: `pip install -r requirements-test.txt && pytest tests/ -v`
- Run a single test: `python -m pytest tests/test_endpoint.py::test_health_returns_ok -v`

### BDD integration tests (`integration/`)

- Install deps: `npm install`
- Install browser: `npm run install:browsers`
- Run all scenarios: `npm test`
- Run headed: `npm run test:headed`
- Run a single feature: `npm run test:feature -- features/settings.feature`
- Run a single scenario: `npm run test:feature -- features/settings.feature --name "Dark theme preference is restored after page reload"`

## High-level architecture

RecipeAId is a mobile-first recipe app with a React 19 frontend, an ASP.NET Core 9 backend, a Python OCR sidecar, and LiteDB as the embedded database. The backend follows `Api -> Core <- Data`: controllers depend on service interfaces in `Core`, and `Data` implements repositories against LiteDB.

The main photo-to-recipe flow spans multiple projects. The frontend captures or uploads an image, optionally crops it, and posts it to `POST /api/v1/recipes/from-image`. The backend forwards the image to the OCR sidecar, parses raw OCR text into a draft, and returns that draft immediately. If `refine=true` and ingredients were found, the backend starts a background ingredient-refinement task and returns a `sessionId`; the frontend then subscribes to `GET /api/v1/ocr-sessions/{sessionId}/events` over SSE for `processing`, `done`, or `failed` updates.

Ingredient parsing is no longer handled by a local sidecar in the active architecture. `PublicLlmIngredientParserService` calls the Mistral public API directly through a named `HttpClient`, using `INGREDIENT_PARSER_API_KEY` and optional `MISTRAL_BASE_URL` override for integration tests. The old `ingredient-parser/` project and `docker-compose.llm.yml` are legacy/reference material, not the default runtime path.

Recipes are stored as LiteDB documents with ingredients embedded directly in each recipe. Recipe images are also stored in the same LiteDB file via `FileStorage`: temporary OCR uploads use `temp/{guid}` keys, then move to permanent `recipe/{id}/{slot}` keys when the recipe is saved. Ingredient search is therefore a full recipe scan, with fuzzy matching implemented in `RecipeMatchingService` using Damerau-Levenshtein scoring.

The frontend is a PWA. In production it uses same-origin `/api/...` calls behind nginx; in local Vite development it uses mock data unless `VITE_API_BASE_URL` is provided. Integration tests use Docker Compose to start frontend, backend, OCR, and a mock Mistral service together.

## Key conventions

- For implementation work, use the repo's worktree/PR workflow from `CLAUDE.md`. Docs-only or instruction-only changes are the explicit exception.
- Follow the repo's strict test-first flow: unit tests first, then BDD scenarios for user-facing behavior, then implementation.
- When changing backend code, preserve the layer boundary: `Core` has no infrastructure dependencies, controllers should call services rather than repositories, and interfaces belong in `Core`.
- Backend DTOs are organized as one record per file under `backend/src/RecipeAId.Core/DTOs/`.
- Backend errors should surface as `ProblemDetails`; the existing middleware and controller patterns already enforce that shape.
- LiteDB is the source of truth. Ingredients are embedded in recipe documents, so do not introduce assumptions about a separate ingredient table or ORM-style tracking.
- Frontend organization is feature-based under `frontend/src/features/`. New UI work should use Tailwind utility classes; existing pages that already use CSS Modules should generally keep that approach.
- `frontend/src/api/client.ts` intentionally supports offline/mock development. Be careful not to break the `VITE_API_BASE_URL` switch or assume a live backend is always present.
- Heavy external dependencies are mocked in tests: PaddleOCR is mocked in `ocr-service/tests/conftest.py`, backend tests mock repository/http dependencies, and integration tests point the backend at a mock Mistral API.
- Integration hooks delete all recipes before each scenario, so tests should rely on scenario-local setup rather than shared persisted state.
- If a change affects architecture, API routes, or setup behavior, update `docs/architecture.md`, the relevant `CLAUDE.md`, and `README.md` as required by the repository guidance.
