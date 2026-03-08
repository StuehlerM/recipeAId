# Feature: Image Storage

**Status:** Planned (blocked on LiteDB migration)
**ADR:** `docs/adr/0001-switch-sqlite-to-litedb.md`
**Priority:** 2 — core product requirement per ADR

## Summary

Store three images per recipe (title page, ingredients page, instructions page) using LiteDB's built-in `ILiteStorage<string>`. Currently images are discarded after OCR.

## What is needed

- Store images in `ILiteStorage<string>` keyed by `recipe/{id}/title`, `recipe/{id}/ingredients`, `recipe/{id}/instructions`
- `POST /from-image` (and save confirmation flow) persist the uploaded image under the appropriate key
- `GET /api/v1/recipes/{id}/images/{slot}` endpoint to retrieve a stored image (`slot` = `title | ingredients | instructions`)
- Frontend: display stored images on `RecipeDetailPage` when present
- Unit tests for the storage path (mock `ILiteStorage`)

## Scope notes

- Blocked on the LiteDB migration — implement as part of that phase
- No separate Docker volume needed — images live inside the `.db` file
- Images already downscaled to max 2048px on client; decide whether server should re-compress
