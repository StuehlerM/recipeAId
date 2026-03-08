# RecipeAId — Gap Analysis & Future Roadmap

This document combines a gap analysis of items tracked in `Agents.md` that are not yet implemented
with broader roadmap ideas. Each section notes its source so nothing gets lost.

---

## Open Items

### 1. Ingredient Fuzzy Matching
**Source:** Agents.md — Open / Future Decisions
**Status:** `IRecipeMatchingService` exists; current impl uses exact string match.

**What is missing:**
- Levenshtein distance or Damerau-Levenshtein for typo tolerance in ingredient search
- OR a synonym / alias table (e.g., "capsicum" = "bell pepper")
- Matching service updated to use fuzzy score instead of strict equality
- Unit tests for new matching logic

**Scope notes:**
- Keep it in `RecipeAId.Core/Services/RecipeMatchingService.cs` (no infra deps)
- Levenshtein approach is pure in-memory — preferred now that we are on LiteDB (no relational `IngredientAlias` entity)
- `GET /api/v1/recipes/search/by-ingredients` should transparently improve — no API surface change needed

---

### 2. Image Storage *(planned — see ADR 0001)*
**Source:** Agents.md — Open / Future Decisions; ADR 0001
**Status:** Images are currently discarded after OCR. ADR 0001 (accepted) mandates storing **three images per recipe** (title page, ingredients page, instructions page) using LiteDB's built-in `ILiteStorage<string>`.

**What is needed:**
- Store images in `ILiteStorage<string>` keyed by `recipe/{id}/title`, `recipe/{id}/ingredients`, `recipe/{id}/instructions`
- `POST /from-image` (and the save confirmation flow) persist the uploaded image under the appropriate key
- `GET /api/v1/recipes/{id}/images/{slot}` endpoint to retrieve a stored image (`slot` ∈ `title | ingredients | instructions`)
- Frontend: display stored images on `RecipeDetailPage` when present
- Unit tests for the storage path (mock `ILiteStorage`)

**Scope notes:**
- Blocked on the LiteDB migration (ADR 0001) — implement as part of that phase
- No separate Docker volume needed — images live inside the `.db` file

---

### 3. Authentication / Multi-User Support
**Source:** Agents.md — Open / Future Decisions
**Status:** Single-user app; no auth.

**Proposed simple approach (device-based, no login screen):**
- Client generates a UUID on first visit, stores in `localStorage` as `recipeaid_user_id`
- Sends `X-User-Id` header with every API request
- Backend validates header, filters all recipe queries by `UserId`
- Add `UserId` field to the `Recipe` document
- No user profiles, no passwords, no login flow

**Future (only if multi-user sharing is needed):**
- Real auth: email/password + JWT (ASP.NET Core Identity)
- Shared recipe collections
- User profiles / settings

---

### 4. Translation Support

**Current state:** English + German OCR (PP-OCRv5 latin model); no recipe translation.

- Add `Language` field (ISO 639-1) to `Recipe` document — default `"en"`
- Store ingredient names in the recipe's language
- Frontend: language badge on recipe cards; language selector on create/edit
- Backend: filter recipes by user AND language
- OCR: already supports German; extend via `lang=` param in sidecar for more languages
- Stretch: AI-powered recipe translation via LLM sidecar

---

## Priority / Ordering Suggestion

| Priority | Item | Effort | Value |
|----------|------|--------|-------|
| 1 | LiteDB migration (ADR 0001) | High | High — unblocks image storage, simplifies schema |
| 2 | Image storage (3 per recipe) | Medium | High — core product requirement per ADR |
| 3 | Ingredient fuzzy matching | Medium | High — directly improves core search UX |
| 4 | Multi-user / device auth | High | Medium — needed for shared deployments |
| 5 | Translation support | High | Low — niche, defer until users request |

---

## Implementation Notes

- Each feature must be developed in its own git worktree and opened as a PR (never merge directly to main)
- Update `CLAUDE.md`, `Agents.md`, and `README.md` before every commit
- Unit tests required for all service/business logic before marking any phase complete
- Run `./scripts/run-unit-tests.sh` before every push
