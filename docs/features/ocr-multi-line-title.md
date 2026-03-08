# Feature: OCR multi-line title merging

## Problem

Recipe titles often span two printed lines on a cookbook page, e.g.:

```
Spring chickpea stew
with salted lemons
```

The current `OcrParserService` treats only the **first** non-empty line as the title and silently discards the second line (or misclassifies it as an instruction).

## Goal

When the first two lines before any section header both look like title continuation text (not ingredients, not a section header), merge them into a single title string joined with a space.

## Acceptance criteria

1. **Two-line title merged** — `"Spring chickpea stew\nwith salted lemons"` → title `"Spring chickpea stew with salted lemons"`.
2. **Single-line title unchanged** — existing behaviour for single-line titles is preserved.
3. **Second line that looks like an ingredient is NOT merged** — e.g. `"Pasta bake\n200g spaghetti"` keeps `"Pasta bake"` as the title and `"200g spaghetti"` is classified as an ingredient.
4. **Section header on line 2 is NOT merged** — `"Pasta bake\nIngredients:"` keeps title `"Pasta bake"`.
5. **More than two title lines are NOT merged** — only the first two candidates are considered; a third short line is classified normally (ingredient or instruction).
6. Works in both **structured** (with section headers) and **unstructured** (heuristic) parsing paths.

## Heuristic: is a line a title continuation?

A line qualifies as a title continuation if ALL of the following hold:

- It is not a recognised section header (ingredient / instruction keywords).
- It does not look like an ingredient line (`LooksLikeIngredient` returns `false`).
- It is reasonably short — ≤ 60 characters (titles rarely exceed this).
- It does not end with a period or colon (those signal sentences / headers).

## Implementation notes

- Extract a private `IsTitleContinuation(string line)` helper in `OcrParserService`.
- In `ParseUnstructured`: after picking `title` (line 0), peek at line 1 and call `IsTitleContinuation`; if true, join with `" "` and skip line 1 from the `rest` enumeration.
- In `ParseStructured`: same logic when collecting the title lines before the first section header.
- Unit tests in `OcrParserServiceTests` — one test per acceptance criterion above.
- No API, DTO, or database changes required.
