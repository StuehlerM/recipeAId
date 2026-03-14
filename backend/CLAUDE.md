# Backend — CLAUDE.md

ASP.NET Core 9 Web API with LiteDB (embedded document database).

## Commands

All commands run from `backend/`.

```bash
dotnet run --project src/RecipeAId.Api          # Run the API (LiteDB file auto-created)
dotnet test                                      # Run all tests (68 tests)
dotnet test --filter "ClassName=OcrParserServiceTests"  # Single test class
dotnet test --filter "FullyQualifiedName~ParseTitle"    # Single test method
```

API explorer (Development only): `https://localhost:<port>/scalar/v1`
OpenAPI spec: `https://localhost:<port>/openapi/v1.json`

## Project structure

```
backend/
├── src/
│   ├── RecipeAId.Core/        # Entities, interfaces, DTOs (one per file), services — NO infra deps
│   ├── RecipeAId.Data/        # LiteDB repositories (no migrations)
│   └── RecipeAId.Api/         # Controllers, OcrServices/, ParserServices/, OcrSessions/, middleware, Program.cs
└── tests/
    └── RecipeAId.Tests/       # xUnit + Moq — references Core only
```

**Dependency rule:** `Api → Core ← Data`. Core has zero infrastructure dependencies; all interfaces live there.

## Architecture

**Service layer:** All controllers depend on service interfaces, not repositories directly. `IIngredientService` / `IngredientService` handles ingredient queries; `IRecipeService` / `RecipeService` handles recipe CRUD. `RecipeService` uses a private `BuildIngredients` static helper to build embedded ingredient lists from `IngredientLineDto`. `RecipeMatchingService` uses Damerau-Levenshtein (OSA, distance ≤ 2) for fuzzy ingredient matching — exact matches score 1.0, fuzzy matches score 0.8; results ranked by total score then score/ingredient ratio.

**DI lifetimes:** `ILiteDatabase` — `AddSingleton` (one file lock). Repositories and services — `AddScoped`. `ILiteDatabase` is resolved eagerly at startup (`app.Services.GetRequiredService<ILiteDatabase>()`) so a corrupt or missing database file crashes the container immediately rather than silently 500-ing on the first request.

**DTO organization:** One record per file in `Core/DTOs/`. Key DTOs: `CreateRecipeRequest` (with `BookTitle`), `UpdateRecipeRequest`, `RecipeDto`, `RecipeIngredientDto` (Amount + Unit), `RecipeSummaryDto`, `RecipeOcrDraftDto` (with optional `SessionId`), `OcrResult`, `IngredientLineDto(Name, Amount, Unit)`, `IngredientParseRequest`, `IngredientParseResult`.

**`IRecipeRepository.UpdateAsync`:** Takes an explicit `newIngredients` list. The repository replaces `recipe.RecipeIngredients` and calls `Recipes.Update(recipe)` — no EF tracking concerns.

**Logging:** Serilog (`Serilog.AspNetCore`). Uniform `[LEVEL] message` plain-text format in all environments (no JSON). Noisy namespaces (`Microsoft.AspNetCore`, `System.Net.Http.HttpClient`) suppressed to `Warning` in appsettings. `RecipesController.FromImage` logs OCR+LLM pipeline with per-stage timing.

**Error handling:** All error responses use `ProblemDetails` (RFC 7807) — both inline controller validation and `ExceptionHandlingMiddleware`. The `detail` field is only populated in Development. The middleware checks `Response.HasStarted` before setting headers (safe for SSE streams).

**CORS:** `DevPolicy` applied globally. Origins via `Cors:AllowedOrigins` — `["http://localhost:5173", "https://localhost:5173"]` in Development, `https://localhost` in Docker.

## Data model (LiteDB)

Recipes are stored as documents in a LiteDB collection (`"recipes"`). Each document embeds its ingredients directly — no separate ingredient collection or join table.

```
Recipe document
├── Id          (int, auto-increment)
├── Title       (string)
├── Instructions (string?)
├── ImagePath   (string?)
├── RawOcrText  (string?)
├── BookTitle   (string?)
├── CreatedAt   (DateTime)
├── UpdatedAt   (DateTime)
└── RecipeIngredients []
    ├── Name        (string, normalized lowercase)
    ├── Amount      (string?)
    ├── Unit        (string?)
    └── SortOrder   (int)
```

`IIngredientRepository.GetAllAsync` returns distinct ingredient names by scanning all recipe documents (full collection scan — acceptable at hobby scale; see ADR 0001).

`IIngredientRepository.GetOrCreateAsync` is retained for interface compatibility but is a no-op; ingredient persistence happens when the recipe document is saved.

## OCR integration

`PythonOcrService` (in `Api/OcrServices/`) implements `IOcrService` — forwards images to the OCR sidecar via named `HttpClient` (30s timeout). Image uploads limited to 10 MB.

`OcrParserService` (in `Core/Services/`) implements `IOcrParser` — pure string logic, fully unit-tested. Uses `[GeneratedRegex]` source generators. Three ingredient patterns tried in order: `amount unit name` ("2 cups flour"), `name amount unit` ("Flour 200 g"), `name amount` ("Eggs 2"). German section headers supported ("Zutaten", "Zubereitung"). Run-on lines split at quantity+unit boundaries. **Multi-line title merging**: if the second line before any section header qualifies as a title continuation (≤ 60 chars, no trailing `.`/`:`, not a section header, not starting with a quantity or bullet), it is joined to the first line with a space — works in both structured and unstructured paths.

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
| POST | `/api/v1/recipes/from-image` | Upload image → OCR+LLM pipeline; response includes `imageKey` for later commit |
| GET | `/api/v1/ocr-sessions/{sessionId}/events` | SSE stream for LLM refinement results |
| GET | `/api/v1/recipes/search/by-ingredients` | Ranked ingredient search (`?ingredients=&minMatch=1&limit=20`) |
| GET | `/api/v1/ingredients` | All known ingredients (autocomplete) |
| POST | `/api/v1/ingredients/parse` | Parse raw ingredient text via LLM sidecar |
| GET | `/api/v1/recipes/{id}/images/{slot}` | Retrieve stored recipe image (`slot` = `title \| ingredients \| instructions`) |
| PUT | `/api/v1/recipes/{id}/images/{slot}` | Upload image directly to a recipe slot (multipart/form-data) |

## Testing conventions

- Test project references `RecipeAId.Core` only — no `Data` or `Api` dependencies
- Services under test live in `Core/Services/`; tests in `tests/RecipeAId.Tests/Services/`
- Use xUnit + Moq. Mock `IRecipeRepository` for `RecipeService` tests; mock `IImageStorage` for `RecipeImageService` tests
- 68 tests covering OcrParserService (incl. multi-line title merging), RecipeService, RecipeMatchingService (incl. fuzzy matching), RecipeImageService
