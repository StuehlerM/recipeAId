# ADR 0004 — Nutrition Estimation via Open Food Facts

**Date:** 2026-03-22
**Status:** Accepted

---

## Context

RecipeAId stores structured ingredients (name, amount, unit) for every recipe. Users who plan meals want a quick nutritional overview — protein, carbs, fat, and fiber — without leaving the app. An estimation based on the existing ingredient list is a natural and low-friction extension.

Several approaches were considered:

1. **Embed a static nutrition database** — include a bundled USDA/NCCDB lookup table. Large (~50 MB), requires licensing, needs periodic updates.
2. **Call a paid nutrition API** (e.g. Edamam, Spoonacular) — accurate but introduces cost, rate-limit risk, and an additional API key to manage.
3. **Open Food Facts public API** — free, open-data (ODbL), actively maintained, no auth required for read access. Trade-off: product-centric (not always a perfect match for generic ingredient names), 10 req/min for search, community-contributed quality.

---

## Decision

Use the **Open Food Facts (OFF) public API v2** as the nutrition data source, integrated exclusively on the backend behind an `IOpenFoodFactsClient` interface.

### Key design choices

- **Backend-only** — no frontend → OFF calls. Keeps rate-limit control, caching, and attribution logic server-side. Consistent with the precedent set by Mistral OCR and ingredient-parser integrations.
- **`IRecipeDetailService`** orchestrates enrichment for `GET /api/v1/recipes/{id}` — calls `IRecipeService.GetByIdAsync` then `INutritionEstimator.EstimateAsync`. The controller calls one interface; enrichment is fully encapsulated.
- **`INutritionEstimator` / `IOpenFoodFactsClient`** — two-level abstraction. The estimator handles aggregation logic (scaling, per-serving division, partial-match handling); the client handles HTTP + caching. Both are swappable without touching the controller.
- **Parallel lookups with bounded concurrency** — `Task.WhenAll` + `SemaphoreSlim(4)` to stay polite to a free public API while avoiding sequential latency for recipes with many ingredients.
- **`IMemoryCache`** inside `OpenFoodFactsClient` — 1 h sliding / 24 h absolute TTL per normalised ingredient name. Nutrition for "flour" does not change hour-to-hour; caching is essential for acceptable response times.
- **Graceful degradation** — if OFF is unreachable or no ingredients match, `nutritionSummary` is `null` in the response. The recipe is always returned successfully. The frontend distinguishes `null` (tried, unavailable) from `undefined` (field absent), rendering an inline "unavailable" message in the first case and hiding the panel in the second.
- **Amount scaling** — per-100g OFF values are scaled by the ingredient's amount when the unit is `g` or `kg`. Non-gram units fall back to a 100g default, keeping estimates honest even when exact quantities are unresolvable.
- **Attribution** — ODbL requires attribution. The `NutritionPanel` component links "Data from Open Food Facts" to `https://world.openfoodfacts.org`, co-located with the estimate disclaimer.

---

## Consequences

### Positive
- Zero cost, no API key required, open license.
- Nutrition estimates appear automatically for any recipe whose ingredients are in the OFF database.
- Full abstraction layer makes it straightforward to swap the data source (USDA, Edamam, etc.) later.
- Caching eliminates repeat OFF calls for common ingredients across multiple recipe views.
- Partial matches still return useful data — a recipe with 6 ingredients where 4 are found shows macros for the 4, labelled as estimates.

### Negative / Trade-offs
- OFF is product-centric — generic ingredient names (e.g. "flour") may match a branded product rather than a generic nutrient profile.
- Nutrition data quality is community-contributed and variable; all values are labelled as estimates in the UI.
- Cold-start latency for recipes with many novel ingredients (first request, empty cache) is bounded by the 5s HTTP timeout × up to 4 parallel batches.
- OFF search endpoint is limited to 10 req/min; `SemaphoreSlim(4)` and caching mitigate but do not eliminate the risk of hitting this limit under heavy concurrent load.

### Out of scope for this ADR
- Micronutrients, vitamins, sodium, % daily value.
- User-specific calorie goals or dietary recommendations.
- Bulk/offline nutrition data from OFF nightly dumps — appropriate if usage scales to require low-latency or offline behaviour.
