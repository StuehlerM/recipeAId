# RecipeAId — Gap Analysis & Future Roadmap

This document combines a gap analysis of items tracked in `Agents.md` that are not yet implemented
with broader roadmap ideas. Each section notes its source so nothing gets lost.

---

## Gap Analysis (from Agents.md)

### Documentation Drift — Fix Before Next Feature Work

These are inconsistencies between `Agents.md` and the actual codebase state.
They do not require code changes but must be corrected to keep the AI agent accurate.

| # | Location | Issue |
|---|----------|-------|
| 1 | Phase 9 & 10 | Say LLM refinement is "temporarily disabled" and `SessionId` always null — but commit `741c176` re-enabled the async SSE pipeline. `Agents.md` must be updated to reflect the active SSE flow. |
| 2 | Phase 7 | References `src/utils/imageEnhance.ts` as existing. `CLAUDE.md` says it was removed; all OCR preprocessing now runs server-side in the sidecar. Phase 7 checkbox for `imageEnhance.ts` should be struck through and a note added. |
| 3 | Phase 7 | Says "replaced emoji with lucide-react icons (BookOpen, Search, Plus, Camera, CalendarDays)". `CLAUDE.md` says NavBar uses flat inline SVG icons. One of these is wrong — verify and correct `Agents.md`. |
| 4 | Phase 9 | Says `mistral:latest` via Ollama. `CLAUDE.md` and MEMORY.md say `ministral:3b`. Update `Agents.md` to match. |
| 5 | API Reference | `POST /from-image` row says "LLM refinement currently disabled" — update to reflect re-enabled async SSE pipeline. |
| 6 | Known Issues | Says "none yet" — add tech debt items if any are identified during the above fixes. |

---

### Open Items Tracked in Agents.md

These are explicitly marked `[ ]` in `Agents.md` and have no corresponding implementation work.

#### 1. Ingredient Fuzzy Matching
**Source:** Agents.md — Open / Future Decisions
**Status:** Interface seam exists (`IRecipeMatchingService`); current impl uses exact string match.

**What is missing:**
- Levenshtein distance or Damerau-Levenshtein for typo tolerance in ingredient search
- OR a synonym / alias table in the DB (e.g., "capsicum" = "bell pepper")
- Matching service updated to use fuzzy score instead of strict equality
- Unit tests for new matching logic

**Scope notes:**
- Keep it in `RecipeAId.Core/Services/RecipeMatchingService.cs` (no infra deps)
- Synonym table approach fits better with EF Core (new `IngredientAlias` entity); Levenshtein approach is pure in-memory
- `GET /api/v1/recipes/search/by-ingredients` should transparently improve — no API surface change needed

---

#### 2. LLM Recipe Suggestion
**Source:** Agents.md — Open / Future Decisions
**Status:** `IRecipeSuggestionService` interface exists as a seam; no implementation.

**What is missing:**
- `RecipeSuggestionService` implementation in `Core/Services/`
- Uses existing ingredients in DB + optional free-text prompt → calls ingredient-parser sidecar or a new LLM endpoint
- New controller action or standalone endpoint: `POST /api/v1/recipes/suggest`
- Frontend entry point (likely on the Search or Planner page — "suggest a recipe with what I have")
- Unit tests mocking the LLM service

**Scope notes:**
- Can reuse the ingredient-parser sidecar (`POST /parse`) or add a new `/suggest` endpoint to it
- Consider SSE for streaming suggestions (reuse `OcrSessionStore` pattern)
- `IRecipeSuggestionService` is already registered as a stub — check its current signature before designing

---

#### 3. Image Storage
**Source:** Agents.md — Open / Future Decisions
**Status:** `ImagePath` column exists on `Recipe` but images are never stored — they are discarded after OCR.

**What is missing:**
- `IImageStorageService` interface in `Core/Interfaces/` (already mentioned as a future seam)
- Local filesystem implementation: save uploaded image to a configurable path, return relative URL
- `Recipe.ImagePath` populated on `POST /from-image` save confirmation
- `GET /api/v1/recipes/{id}/image` endpoint to serve the stored image
- Frontend: display recipe image on `RecipeDetailPage` when `imageUrl` is present
- Unit tests for storage service (mock filesystem or use temp directory)

**Scope notes:**
- Start with local filesystem; the interface allows swapping to Azure Blob / S3 later
- Docker: mount a named volume for the image store directory
- Images should be resized/compressed server-side before storage (already downscaled to max 2048px on client — decide whether server should re-compress)
- Privacy: no images stored currently (a feature for some users); make storage opt-in or document it clearly

---

#### 4. Authentication / Multi-User Support
**Source:** Agents.md — Open / Future Decisions; also in PLAN.md (previous version)
**Status:** Single-user SQLite app; no auth.

**Proposed simple approach (device-based, no login screen):**
- Client generates a UUID on first visit, stores in `localStorage` as `recipeaid_user_id`
- Sends `X-User-Id` header with every API request
- Backend validates header, filters all recipe queries by `UserId`
- Add `UserId` (GUID, NOT NULL after migration) foreign key to `Recipe`
- No user profiles, no passwords, no login flow

**Migration path:**
1. Add `UserId` column to `Recipe` (nullable)
2. Populate existing rows with a default UUID
3. Make `UserId` NOT NULL
4. Update all repository queries to filter by `UserId`

**Future (only if multi-user sharing is needed):**
- Real auth: email/password + JWT (ASP.NET Core Identity)
- Shared recipe collections
- User profiles / settings

---

## Existing Roadmap Items (carried forward)

### Database Improvements

- Performance: profile slow queries (ingredient matching, recipe search); add indexes beyond `Ingredient.Name` and `Recipe.Title` if needed
- Full-text search: consider SQLite FTS5 for recipe title and instruction search
- Data validation: strengthen DB constraints (CHECK constraints for amounts/units); validate ingredient/recipe relationships at DB level
- Backup strategy: document SQLite backup for production Docker deployments; consider automatic daily volume backups

### Translation Support

**Current state:** English + German OCR (PP-OCRv5 latin model); no recipe translation.

- Add `Language` field (`nvarchar(10)`, ISO 639-1) to `Recipe` — default `"en"`
- Store ingredient names in the recipe's language
- Frontend: language badge on recipe cards; language selector on create/edit
- Backend: filter recipes by user AND language
- OCR: already supports German; extend via `lang=` param in sidecar for more languages
- Stretch: AI-powered recipe translation via LLM sidecar

---

## Priority / Ordering Suggestion

| Priority | Item | Effort | Value |
|----------|------|--------|-------|
| 1 | Fix Agents.md documentation drift (items 1–6 above) | Low | High — keeps AI agent accurate |
| 2 | Ingredient fuzzy matching | Medium | High — directly improves core search UX |
| 3 | Image storage | Medium | Medium — nice for recipe detail richness |
| 4 | LLM recipe suggestion | High | High — differentiating AI feature |
| 5 | Multi-user / device auth | High | Medium — needed for shared deployments |
| 6 | Translation support | High | Low — niche, defer until users request |

---

## Implementation Notes

- Each feature must be developed in its own git worktree and opened as a PR (never merge directly to main)
- Update `CLAUDE.md`, `Agents.md`, and `README.md` before every commit
- Unit tests required for all service/business logic before marking any phase complete
- Run `./scripts/run-unit-tests.sh` before every push
