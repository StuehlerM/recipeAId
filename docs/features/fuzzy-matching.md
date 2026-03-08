# Feature: Ingredient Fuzzy Matching

**Status:** Not started
**Priority:** 3 — directly improves core search UX

## Summary

The current ingredient search (`GET /api/v1/recipes/search/by-ingredients`) uses exact string matching. Adding fuzzy matching would tolerate typos and spelling variations.

## What is needed

- Levenshtein distance or Damerau-Levenshtein for typo tolerance
- OR a synonym / alias table (e.g., "capsicum" = "bell pepper")
- `RecipeMatchingService` updated to use fuzzy score instead of strict equality
- Unit tests for new matching logic

## Scope notes

- Keep it in `RecipeAId.Core/Services/RecipeMatchingService.cs` (no infra deps)
- Levenshtein approach is pure in-memory — preferred now that we are moving to LiteDB (no relational entity for aliases)
- `GET /api/v1/recipes/search/by-ingredients` should transparently improve — no API surface change needed
