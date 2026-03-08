# Feature: LiteDB Migration

**Status:** Planned (ADR accepted)
**ADR:** `docs/adr/0001-switch-sqlite-to-litedb.md`
**Priority:** 1 — unblocks image storage, simplifies schema

## Summary

Replace SQLite + EF Core with LiteDB (v5), an embedded document database for .NET. Ingredients become embedded documents inside recipes instead of a normalized relational schema.

## What changes

- `RecipeAId.Data` — EF Core repositories replaced with LiteDB implementations
- No more `dotnet ef migrations` — schema changes applied in code
- `Ingredient` is no longer a shared entity; embedded in each recipe document
- Images stored via `ILiteStorage<string>` (see `docs/features/image-storage.md`)

## What stays the same

- All `Core` interfaces (`IRecipeRepository`, `IIngredientRepository`, DTOs, service layer)
- All API contracts (controllers, routes, request/response shapes)
- All frontend code

## Key trade-offs (accepted)

- Ingredient search requires full collection scan (vs indexed table in SQLite)
- No referential integrity — ingredient data duplicated across recipes
- Database file grows with stored images
- Single-writer concurrency model (sufficient for single-user app)

See ADR 0001 for full rationale.
