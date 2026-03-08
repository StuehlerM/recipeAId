# Backend — CLAUDE.md

ASP.NET Core 9 Web API with Entity Framework Core 9 and SQLite.

## Commands

All commands run from `backend/`.

```bash
dotnet run --project src/RecipeAId.Api          # Run the API (SQLite DB auto-created)
dotnet test                                      # Run all tests (39 tests)
dotnet test --filter "ClassName=OcrParserServiceTests"  # Single test class
dotnet test --filter "FullyQualifiedName~ParseTitle"    # Single test method

# EF Core migration
dotnet ef migrations add <Name> --project src/RecipeAId.Data --startup-project src/RecipeAId.Api
```

API explorer (Development only): `https://localhost:<port>/scalar/v1`
OpenAPI spec: `https://localhost:<port>/openapi/v1.json`

## Project structure

```
backend/
├── src/
│   ├── RecipeAId.Core/        # Entities, interfaces, DTOs (one per file), services — NO infra deps
│   ├── RecipeAId.Data/        # EF Core + SQLite, repositories, migrations
│   └── RecipeAId.Api/         # Controllers, OcrServices/, ParserServices/, OcrSessions/, middleware, Program.cs
└── tests/
    └── RecipeAId.Tests/       # xUnit + Moq — references Core only
```

**Dependency rule:** `Api → Core ← Data`. Core has zero infrastructure dependencies; all interfaces live there.

## Architecture

**Service layer:** All controllers depend on service interfaces, not repositories directly. `IIngredientService` / `IngredientService` handles ingredient queries; `IRecipeService` / `RecipeService` handles recipe CRUD. `RecipeService` uses a private `BuildIngredientsAsync` helper to avoid duplicating ingredient normalization logic between create and update.

**DI lifetimes:** All services, repositories, OCR services — `AddScoped`.

**DTO organization:** One record per file in `Core/DTOs/`. Key DTOs: `CreateRecipeRequest` (with `BookTitle`), `UpdateRecipeRequest`, `RecipeDto`, `RecipeIngredientDto` (Amount + Unit), `RecipeSummaryDto`, `RecipeOcrDraftDto` (with optional `SessionId`), `OcrResult`, `IngredientLineDto(Name, Amount, Unit)`, `IngredientParseRequest`, `IngredientParseResult`.

**`IRecipeRepository.UpdateAsync`:** Takes an explicit `newIngredients` list. The repository deletes all existing `RecipeIngredient` rows and re-inserts to avoid EF Core change-tracking conflicts.

**Logging:** Serilog (`Serilog.AspNetCore` + `Serilog.Formatting.Compact`). Development = human-readable text; Production = compact JSON. `RecipesController.FromImage` logs OCR+LLM pipeline with per-stage timing.

**Error handling:** All error responses use `ProblemDetails` (RFC 7807) — both inline controller validation and `ExceptionHandlingMiddleware`. The `detail` field is only populated in Development. The middleware checks `Response.HasStarted` before setting headers (safe for SSE streams).

**CORS:** `DevPolicy` applied globally. Origins via `Cors:AllowedOrigins` — `["http://localhost:5173", "https://localhost:5173"]` in Development, `https://localhost` in Docker.

## OCR integration

`PythonOcrService` (in `Api/OcrServices/`) implements `IOcrService` — forwards images to the OCR sidecar via named `HttpClient` (30s timeout). Image uploads limited to 10 MB.

`OcrParserService` (in `Core/Services/`) implements `IOcrParser` — pure string logic, fully unit-tested. Uses `[GeneratedRegex]` source generators. Three ingredient patterns tried in order: `amount unit name` ("2 cups flour"), `name amount unit` ("Flour 200 g"), `name amount` ("Eggs 2"). German section headers supported ("Zutaten", "Zubereitung"). Run-on lines split at quantity+unit boundaries.

## Async SSE pipeline (OCR + LLM)

`POST /from-image` accepts `?refine=true` (default). When true and ingredients were detected:
1. OCR + regex parse → draft returned immediately with `sessionId`
2. LLM fires in background via `Task.Run` using fresh DI scope (`IServiceScopeFactory`)
3. Frontend opens `GET /api/v1/ocr-sessions/{sessionId}/events` (SSE)
4. SSE sends `processing` → `done` (with refined ingredients) or `failed`

When `refine=false` or no ingredients found → `SessionId = null`, no background task.

Key classes:
- `OcrSessionStore` — singleton `ConcurrentDictionary<string, Session>` with `TaskCompletionSource`
- `OcrSessionCleanupService` — `BackgroundService`, removes stale sessions every 60s (5-min max age)
- `OcrSessionsController` — SSE endpoint, polls parser `/status` every 30s, 15-min hard timeout

## Ingredient parser integration

`LlmIngredientParserService` (in `Api/ParserServices/`) implements `IIngredientParserService`. Named HttpClient "IngredientParser" (200s timeout). Calls sidecar at `IngredientParser:BaseUrl` (default `http://localhost:8002`). Also exposed standalone via `POST /api/v1/ingredients/parse`.

## API reference

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/recipes` | List recipes, optional `?q=` title filter |
| GET | `/api/v1/recipes/{id}` | Single recipe |
| POST | `/api/v1/recipes` | Create recipe (JSON) |
| PUT | `/api/v1/recipes/{id}` | Update recipe |
| DELETE | `/api/v1/recipes/{id}` | Delete recipe |
| POST | `/api/v1/recipes/from-image` | Upload image → OCR+LLM pipeline (see SSE section above) |
| GET | `/api/v1/ocr-sessions/{sessionId}/events` | SSE stream for LLM refinement results |
| GET | `/api/v1/recipes/search/by-ingredients` | Ranked ingredient search (`?ingredients=&minMatch=1&limit=20`) |
| GET | `/api/v1/ingredients` | All known ingredients (autocomplete) |
| POST | `/api/v1/ingredients/parse` | Parse raw ingredient text via LLM sidecar |

## Database schema

### Recipe
| Column | Type | Notes |
|--------|------|-------|
| Id | INTEGER PK | |
| Title | TEXT NOT NULL | Indexed (non-unique) |
| Instructions | TEXT NULL | |
| ImagePath | TEXT NULL | Currently unused |
| RawOcrText | TEXT NULL | |
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

## Testing conventions

- Test project references `RecipeAId.Core` only — no `Data` or `Api` dependencies
- Services under test live in `Core/Services/`; tests in `tests/RecipeAId.Tests/Services/`
- Use xUnit + Moq. Mock `IRecipeRepository`/`IIngredientRepository` for service tests
- 39 tests covering OcrParserService, RecipeService, RecipeMatchingService
