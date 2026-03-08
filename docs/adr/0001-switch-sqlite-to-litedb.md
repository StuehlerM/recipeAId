# ADR 0001 — Replace SQLite + EF Core with LiteDB

**Date:** 2026-03-08
**Status:** Accepted

---

## Context

RecipeAId originally persisted data using **SQLite** via **EF Core** (relational model, code-first migrations). The schema normalised ingredients into a shared `Ingredient` table so that multiple recipes could reference the same ingredient entity, and used a separate `RecipeIngredient` join table with `Amount` and `Unit` columns.

The team wanted to experiment with a **document-oriented storage model** to gain first-hand experience of its trade-offs compared to a relational approach. The goals were:

1. Understand how embedding related data (ingredients inside a recipe document) affects read and write patterns.
2. Evaluate whether schema flexibility speeds up iteration.
3. Explore built-in binary/file storage as a replacement for a separate media store.
4. Keep infrastructure simple — no additional Docker services, no migrations.

Additionally, the product requirement evolved to attach **three images per recipe** (one each for the title page, ingredients page, and instructions page of the source cookbook). These images need to be stored and retrieved alongside the recipe data.

---

## Decision

Replace SQLite + EF Core with **[LiteDB](https://www.litedb.org/)** (v5), an embedded, serverless, document database for .NET.

### Storage model

| Concern | Approach |
|---|---|
| Recipe documents | LiteDB `ILiteCollection<Recipe>` — ingredients embedded as a list inside the document |
| Images (3 per recipe) | LiteDB built-in `ILiteStorage<string>` — files stored as chunks in the same `.db` file, keyed by `recipe/{id}/title`, `recipe/{id}/ingredients`, `recipe/{id}/instructions` |

### What stays the same

- All `Core` interfaces (`IRecipeRepository`, `IIngredientRepository`, DTOs, service layer)
- All API contracts (controllers, routes, request/response shapes)
- All frontend code

### What changes

- `RecipeAId.Data` — EF Core repositories replaced with LiteDB implementations
- No more `dotnet ef migrations` — schema changes are applied in code
- `Ingredient` is no longer a shared entity; it is embedded in each recipe document

---

## Consequences

### Benefits

- **Zero infrastructure overhead** — one `.db` file, no migration history, no connection strings beyond a file path
- **Simpler CRUD** — reading a recipe returns a fully hydrated document in one call; no JOINs or `Include()` chains
- **Flexible schema** — adding new fields requires no migration; old documents simply lack the field
- **Co-located images** — `LiteStorage` keeps binary data in the same file as documents; no separate media server or filesystem management required
- **Pure C# library** — no native binaries, works anywhere .NET runs

### Trade-offs accepted

- **Ingredient search degrades** — the `/search` endpoint (find recipes by ingredient name) now requires a full collection scan. With SQLite, a query hit a dedicated `Ingredient` table with a unique index. With embedded documents, every recipe document must be loaded and its ingredient list checked. Acceptable at hobby scale; would require a secondary index strategy at production scale.
- **No referential integrity** — deleting or renaming an ingredient inside one recipe has no effect on others. Ingredient data is duplicated across recipe documents.
- **No EF Core LINQ provider** — complex query composition (multi-field filters, projections) is done via LiteDB's LINQ-over-documents or its BsonExpression query language, which is less mature than EF Core's query translator.
- **File size grows with images** — storing JPEG images inside the `.db` file increases its size significantly. For a personal/hobby app this is acceptable; for a shared or cloud deployment a dedicated object store (e.g. MinIO, S3) would be more appropriate.
- **Concurrency model** — LiteDB uses a file lock; only one writer at a time. Sufficient for a single-user app; not suitable for high-concurrency scenarios.

### Rationale for accepting trade-offs

This change is explicitly made **for learning purposes**. The production risk is zero — this is a personal hobby project with a single user. The trade-offs are well understood and are themselves part of the learning objective: experiencing them firsthand with a real codebase is more valuable than reading about them.

---

## Alternatives considered

| Option | Reason not chosen |
|---|---|
| Keep SQLite + EF Core | No learning value; status quo |
| MongoDB | Requires a separate Docker service; more operational overhead than desired |
| MongoDB GridFS | Same issue as above; also overkill for 3 images per recipe |
| LiteDB + filesystem images | Splits storage across two locations; LiteStorage is simpler for this scale |
| CouchDB | HTTP-based, adds network layer; no .NET-native embedded option |
