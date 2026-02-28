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
├── backend/                    # ASP.NET Core 8 Web API
│   └── src/
│       ├── RecipeAId.Core/     # Entities, interfaces, DTOs, business logic
│       ├── RecipeAId.Data/     # EF Core, SQLite, repositories, migrations
│       └── RecipeAId.Api/      # Controllers, OCR services, DI host
└── frontend/                   # Flutter (iOS, Android, Web)
```

**Tech stack:**
- Backend: ASP.NET Core 8, Entity Framework Core 8, SQLite
- OCR: Tesseract.NET (Phase 1) → Azure AI Document Intelligence (Phase 2 upgrade)
- Frontend: Flutter with `image_picker`, `riverpod`, `dio`

**Dependency rule:** `Api → Core ← Data`. Core has no infrastructure dependencies.

---

## Phase 1: Foundation
- [ ] Solution and project scaffolding (`dotnet new sln`, `classlib`, `webapi`)
- [ ] Core entities: `Recipe`, `Ingredient`, `RecipeIngredient`
- [ ] Core interfaces: `IRecipeRepository`, `IIngredientRepository`, `IOcrService`, `IOcrParser`, `IRecipeSuggestionService` (stub)
- [ ] Core DTOs: `CreateRecipeRequest`, `RecipeDto`, `RecipeIngredientDto`, `RecipeOcrDraftDto`, `IngredientSearchResultDto`
- [ ] `AppDbContext` with EF Core fluent configuration
- [ ] EF Core initial migration + SQLite DB creation verified
- [ ] Repository implementations: `RecipeRepository`, `IngredientRepository`
- [ ] DI registration in `Program.cs`

## Phase 2: CRUD API
- [ ] `RecipeService` (orchestration, ingredient normalization to lowercase)
- [ ] `RecipesController`: `GET /api/v1/recipes`, `GET /api/v1/recipes/{id}`, `POST`, `PUT`, `DELETE`
- [ ] Swagger / OpenAPI configured
- [ ] CORS configured (allow Flutter dev origin)
- [ ] Global error handling middleware
- [ ] Manual tested via Swagger UI

## Phase 3: Search API
- [ ] `RecipeMatchingService` (LINQ ranked by ingredient match count, then match ratio)
- [ ] `GET /api/v1/recipes/search/by-ingredients?ingredients=...&minMatch=1&limit=20`
- [ ] `GET /api/v1/ingredients` (autocomplete list)
- [ ] Unit tests for `RecipeMatchingService`

## Phase 4: OCR Integration
- [ ] Tesseract.NET NuGet package + `eng.traineddata` tessdata setup
- [ ] `TesseractOcrService` implementing `IOcrService`
- [ ] `OcrParserService` implementing `IOcrParser`:
  - Title: first non-empty line or line after "Recipe:" header
  - Ingredients: numbered/bulleted lines or lines under "Ingredients:" header
  - Instructions: lines after "Instructions:"/"Directions:"/"Method:" header
- [ ] `POST /api/v1/recipes/from-image` — multipart upload → OCR → return draft (does NOT save)
- [ ] Two-phase save: draft returned → user edits → `POST /api/v1/recipes` confirms

## Phase 5: Flutter Frontend
- [ ] Flutter project scaffold in `frontend/`
- [ ] API client (`dio`) configured, typed wrappers for all endpoints
- [ ] State management with `riverpod`
- [ ] Recipe list screen (browse all, title search)
- [ ] Recipe detail screen (title, ingredients, instructions)
- [ ] Ingredient search screen (chip input, ranked results with match counts)
- [ ] Camera capture screen (`image_picker`) + OCR draft review + confirm/edit + save

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

## Open / Future Decisions
- `[ ]` OCR upgrade trigger: switch to Azure AI Document Intelligence when Tesseract accuracy is insufficient for handwritten cards
- `[ ]` Ingredient fuzzy matching: Levenshtein distance or synonym table (Phase 2)
- `[ ]` LLM recipe suggestion: `IRecipeSuggestionService` interface exists as a seam; implement when needed
- `[ ]` Image storage: local filesystem for now; Azure Blob / S3 upgrade path via `IImageStorageService`
- `[ ]` Authentication / multi-user support (not in scope currently)

---

## Known Issues / Tech Debt
*(none yet)*
