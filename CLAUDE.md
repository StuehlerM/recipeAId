# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

```
recipeaid/
├── Agents.md          # Phase tracker and full API reference
├── ocr-service/       # Python EasyOCR sidecar (FastAPI, port 8001)
├── backend/           # ASP.NET Core 9 Web API
│   ├── RecipeAId.sln
│   ├── src/
│   │   ├── RecipeAId.Core/   # Entities, interfaces, DTOs, services (no infra deps)
│   │   ├── RecipeAId.Data/   # EF Core + SQLite, repositories, migrations
│   │   └── RecipeAId.Api/    # Controllers, OCR services, middleware, Program.cs
│   └── tests/
│       └── RecipeAId.Tests/  # xUnit + Moq — references Core only
└── frontend/          # React 19 + Vite 7 + TypeScript
    └── src/
        ├── api/        # client.ts, mockData.ts, types.ts
        ├── components/
        └── pages/      # RecipeListPage, RecipeDetailPage, IngredientSearchPage, UploadPage
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
npm run dev      # Vite dev server at http://localhost:5173
npm run build    # tsc + vite build
npm run lint     # ESLint
```

To point the frontend at a real backend, set `VITE_API_BASE_URL=http://localhost:<port>` in a `.env.local` file. Without it, `client.ts` falls back to mock data automatically for all endpoints.

## OCR sidecar commands

All sidecar commands run from `ocr-service/`.

```bash
# Install dependencies (one-time; first run also downloads the ~200 MB EasyOCR model)
pip install -r requirements.txt

# Start the sidecar (required for POST /api/v1/recipes/from-image to work)
uvicorn main:app --port 8001
```

## Architecture

**Dependency rule:** `Api → Core ← Data`. Core has zero infrastructure dependencies; all interfaces live there.

**Backend service lifetimes:**
- `UnitConversionService` — `AddSingleton` (stateless lookup tables)
- Everything else (services, repositories, OCR services) — `AddScoped`

**Key architectural decision — `IRecipeRepository.UpdateAsync`:** takes an explicit `newIngredients` list. The repository deletes all existing `RecipeIngredient` rows and re-inserts to avoid EF Core change-tracking conflicts.

**OCR architecture:** `PythonOcrService` (in `RecipeAId.Api/OcrServices/`) implements `IOcrService` by forwarding images to the Python EasyOCR sidecar via a named `HttpClient`. `OcrParserService` (in `RecipeAId.Core/Services/`) implements `IOcrParser` with pure string logic — no infra deps, fully unit-tested. The sidecar URL is configurable via `OcrService:BaseUrl` in `appsettings.json` (default: `http://localhost:8001`).

**Frontend API client (`src/api/client.ts`):** uses `VITE_API_BASE_URL` to toggle between real fetch calls and mock data. All endpoints — including OCR — fall back to mock data when `VITE_API_BASE_URL` is not set.

**Error handling:** `ExceptionHandlingMiddleware` catches all unhandled exceptions and returns `ProblemDetails` JSON. The `detail` field is only populated in Development.

**CORS:** `DevPolicy` (`http://localhost:5173`) is applied globally (not environment-gated) so the frontend works against the API in any environment.

## Testing conventions

- Test project references `RecipeAId.Core` only — tests must not depend on `RecipeAId.Data` or `RecipeAId.Api`.
- Services under test live in `RecipeAId.Core/Services/`; corresponding tests are in `tests/RecipeAId.Tests/Services/`.
- Use xUnit + Moq. Mock `IRecipeRepository`/`IIngredientRepository` for service tests.
- Unit tests are required for all service/business logic before marking a phase complete.
