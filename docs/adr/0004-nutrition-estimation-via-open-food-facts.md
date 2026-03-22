# ADR 0004: Nutrition Estimation via Open Food Facts Public API

## Status

Proposed

## Context

Issue #XX requires showing estimated nutrition macros (protein, carbs, fat, fiber) on the recipe
detail view. The data must come from somewhere: the database schema stores only ingredient names
and amounts (strings), not nutritional data. There is no existing nutrition database in the system.

Options for sourcing nutrition data:
1. **Embed a local nutrition database** (e.g., USDA FoodData Central CSV, ~250 MB) — downloaded
   at build time and queried locally.
2. **Call a public nutrition API** at request time — Open Food Facts, Nutritionix, Edamam, etc.
3. **Use an LLM** (Mistral AI, already integrated) to estimate macros from ingredient names.
4. **Store nutrition data manually** — admin enters macros per recipe.

This decision is needed now because the choice affects the infrastructure footprint, the latency
profile of `GET /api/v1/recipes/{id}`, the caching strategy, and the DI registration pattern in
`Program.cs`.

The system is a personal hobby project (single user, low call volume). The precedent of calling
external public APIs is already established: Mistral AI is called for OCR (ADR 0003) and
ingredient parsing (ADR 0002).

## Decision

Use the **Open Food Facts public API** (`https://world.openfoodfacts.org/api/v2/search?q=...`) as
the nutrition data source.

### Boundary placement

| Component | Layer | Responsibility |
|-----------|-------|----------------|
| `NutritionSummaryDto` | `Core/DTOs/` | Data shape for totalled recipe macros |
| `INutritionEstimator` | `Core/Interfaces/` | Contract: ingredient list → `NutritionSummaryDto?` |
| `IRecipeDetailService` | `Core/Interfaces/` | Contract: recipe id → enriched `RecipeDto?` |
| `RecipeDetailService` | `Core/Services/` | Facade: calls `IRecipeService` + `INutritionEstimator`; returns `recipe with { NutritionSummary = ... }` |
| `OpenFoodFactsEstimator` | `Api/NutritionServices/` | HTTP implementation of `INutritionEstimator`; caches per-ingredient results |

`Core` gains two new interfaces and one new DTO but remains infrastructure-free.

### API call strategy

- One call per ingredient, run in parallel via `Task.WhenAll`, bounded by `SemaphoreSlim(4, 4)`.
- Endpoint: `GET https://world.openfoodfacts.org/api/v2/search?q={ingredient}&page_size=1`
- Extract `nutriments` from the top product hit.
- Sum per-100g macros × (amount / 100) for each ingredient where amount is parseable as grams.
  For non-gram units (cups, pieces, cloves) the gram conversion is omitted in v1; affected
  ingredients contribute zero to the total. Per-serving values are deferred to a future feature.

### Caching

`IMemoryCache` (in-process) inside `OpenFoodFactsEstimator`, keyed by normalized ingredient name.
Sliding expiry: 1 hour. Absolute expiry: 24 hours. This matches the Phase 14 caching approach
used for the ingredient-parser health check.

### Failure handling

`INutritionEstimator.EstimateAsync` must never throw. All `HttpRequestException`,
`TaskCanceledException`, and JSON parse failures are caught and return `null`. If `null` is
returned, `RecipeDetailService` returns the recipe with `NutritionSummary = null`. The controller
still returns `200 OK` with the full recipe; the nutrition field is simply absent. The frontend
guards the display section on a non-null check.

### HTTP client registration

Named client `"OpenFoodFactsApi"` registered in `Program.cs` following the existing "MistralOcrApi"
and "MistralApi" pattern. Timeout: 10 seconds. `User-Agent: RecipeAId/1.0` is required by the
Open Food Facts API terms.

### What is NOT stored

Nutrition data is computed on every read and cached in-process. It is **not** persisted to the
LiteDB document. Persisting it would require either cache invalidation logic or accepting stale
data after ingredient edits — both add complexity that is not justified at this scale.

## Consequences

### Positive

- **Zero infrastructure overhead** — no extra Docker service, no local data file to maintain,
  no volume. The stack footprint stays identical to today.
- **Always up-to-date nutrition data** — OFF is community-maintained and updated continuously;
  local embeddings would go stale.
- **Consistent with established pattern** — `INutritionEstimator` / `OpenFoodFactsEstimator`
  follows the exact same Core interface / Api implementation split as OCR and ingredient parsing.
- **Graceful degradation** — nutrition is optional enrichment; the feature cannot block recipe
  retrieval.
- **No API key required** — Open Food Facts is a fully open public API; no secrets to manage.

### Negative / Trade-offs

- **External dependency** — nutrition lookup requires outbound HTTPS to `world.openfoodfacts.org`.
  If unreachable, nutrition is silently absent (acceptable — it is optional enrichment).
- **Latency on cache miss** — first request for a recipe with N unique ingredients adds up to
  ≤ 10 seconds worst case (bounded by the `HttpClient` timeout and `SemaphoreSlim` concurrency).
  Subsequent requests for the same recipe hit the in-process cache and add ~0 ms overhead.
- **Unit coverage for gram conversion is limited in v1** — non-gram units (cups, pieces) contribute
  zero macros. This is a known limitation documented in the UI.
- **Process restart clears cache** — `IMemoryCache` is in-process and not persisted. A container
  restart means the first request after restart will re-fetch from OFF for all ingredients seen
  before the restart. Acceptable at hobby scale.
- **OFF data quality** — Open Food Facts is community-contributed; nutritional values may be
  absent or inaccurate for less common ingredients. The UI should label the values as "estimated".

### Migration impact

- `RecipeDto` gains a new optional positional parameter with default `null`; no callsite changes
  required.
- `RecipesController.GetById` is updated to call `IRecipeDetailService` instead of `IRecipeService`.
- `Program.cs` gains three new registrations: `AddHttpClient`, `AddMemoryCache`,
  `AddScoped<INutritionEstimator>`, `AddScoped<IRecipeDetailService>`.
- All existing unit tests and BDD scenarios pass unchanged.

## Alternatives Considered

### Local USDA FoodData Central database

- **Why not chosen:** ~250 MB CSV file to download, parse, and index at startup. Adds build
  complexity (download step in Dockerfile), increases image size, and requires periodic refresh.
  The infrastructure simplicity goal (established in ADR 0001 and ADR 0002) would be compromised.

### Nutritionix or Edamam APIs

- **Why not chosen:** Both require API key registration and have request-count limits on free
  tiers that are less generous than Open Food Facts (which has no account requirement at all).
  Open Food Facts is also open-source / open-data and aligned with the project's ethos.

### Mistral AI LLM estimation

- **Why not chosen:** The Mistral AI integration is already in use for OCR and ingredient parsing.
  Using it for nutrition estimation would mean a third category of LLM prompt with no ground-truth
  backing — the model can hallucinate plausible-sounding macro values that are factually wrong.
  A real food database is more appropriate for factual nutritional data.

### Persist nutrition data in the LiteDB document

- **Why not chosen:** Requires cache invalidation when ingredients are edited, or accepting
  stale data. Adds write complexity for a derived value that is cheap to compute on read (especially
  with the in-process cache). The LiteDB schema flexibility (ADR 0001) makes this technically
  easy, but the data lifecycle complexity is not worth it at hobby scale.

### Serving-count-based per-serving values (v1)

- **Why deferred:** `Recipe` documents do not store a serving count. Deriving it from free-text
  instructions requires NLP. Deferring per-serving values to a v2 where `ServingCount` is added
  as an optional field to `CreateRecipeRequest` and the recipe document.
