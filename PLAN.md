# Future Roadmap

This document outlines potential improvements and features for RecipeAId. These are not prioritized — consider them a backlog of ideas for future work.

## Database Improvements

**Goal:** Better schema design, performance, and data integrity.

- Add database migrations for future schema changes
  - Consider: timestamp columns (`CreatedAt`, `UpdatedAt`) on all entities
  - Consider: soft deletes for recipes/ingredients (audit trail)

- Performance optimizations
  - Profile slow queries (especially ingredient matching, recipe search)
  - Add indexes on frequently filtered columns beyond `Ingredient.Name` and `Recipe.Title`
  - Consider: full-text search for recipe titles and instructions

- Data validation
  - Strengthen database constraints (NOT NULL, CHECK constraints for amounts/units)
  - Add cascade delete rules where appropriate
  - Validate ingredient/recipe relationships at the DB level

- Backup and recovery
  - Document SQLite backup strategy for production deployments
  - Consider: automatic daily backups in Docker volumes

## User Handling (Multiple Users)

**Goal:** Support multiple users without over-engineering.

**Current state:** Single-user SQLite app. No authentication.

**Proposed approach (simple):**
- Add a `User` entity with `UserId` (GUID) and optional `Name` field
- Add `UserId` foreign key to `Recipe`, `Ingredient` (or just `Recipe` if ingredients are shared)
- No full auth system yet — use device ID / simple token in localStorage for now
  - Client generates a UUID on first visit, stores in localStorage (`recipeaid_user_id`)
  - Send `X-User-Id` header with every API request
  - Backend validates the header and filters recipes by user

- Keep it simple:
  - No login screen, no password management
  - No user profiles or settings pages
  - Just device-based isolation of recipes

- Migration path:
  - Add `UserId` column to `Recipe` table (nullable initially)
  - Populate existing recipes with a default user ID
  - Make `UserId` NOT NULL after migration
  - Update all recipe queries to filter by current user

**Future (if needed):**
- Optional: Add actual user accounts (email/password) with proper auth
- Optional: Shared recipes, recipe collections, user profiles

## Converter in Backend

**Goal:** Evaluate whether unit conversion belongs in the backend.

**Current state:** `UnitConversionService` in `RecipeAId.Core/Services/` — singleton with lookup tables for conversion factors.

**Questions to investigate:**
- Is unit conversion ever called from the frontend? (Search for `POST /api/v1/recipes/convert` usage)
- Could conversions be moved client-side to reduce server load?
- Are there scenarios where server-side conversion is necessary (e.g., planner shopping list aggregation)?
- Could a lightweight conversion library (e.g., npm package) replace server-side logic?

**Possible outcomes:**
- Keep as-is: Backend conversion is fine for planner + future recipe scaling features
- Remove: Move conversions to frontend, reduce API surface
- Refactor: Only expose conversion as a helper for internal services (planner), not a public endpoint

## Translation Support for Recipes

**Goal:** Support multilingual recipes and ingredient names.

**Current state:** English + German OCR support; no recipe translation.

**Proposed approach (simple):**
- Add `Language` field to `Recipe` (e.g., `Language` enum or `nvarchar(10)` for ISO 639-1 codes)
  - Default: `"en"` (English)
  - Support: `"en"`, `"de"` (German) initially

- Add `Language` field to `Ingredient` (or share recipe language)
  - Ingredient names stored in recipe's language

- Frontend updates:
  - Show recipe language as a badge / indicator
  - Allow user to select language when creating recipes
  - Optional: Add a "Translate" feature (integrates with LLM sidecar or external API)

- Backend:
  - Filter recipes by user AND language
  - Support multi-language search (stretch goal)

- OCR:
  - Already supports German (PP-OCRv5 latin model)
  - Could extend to other languages via `lang="..." parameter in sidecar

- Migration:
  - Add `Language` column to `Recipe` (default `"en"`)
  - Add `Language` column to `Ingredient` (default to recipe's language)

**Future (if needed):**
- AI-powered translation of recipes using LLM sidecar
- Community translation contributions
- Right-to-left language support (Arabic, Hebrew)

---

**Notes:**
- These improvements should not block current functionality
- Each feature should be started in its own git worktree
- Update `CLAUDE.md`, `Agents.md`, and `README.md` before every commit (per project guidelines)
- Unit tests required for all service/business logic
