# Refactor: CSS Module / Tailwind Color Consistency

## Problem

The frontend uses two styling systems with no shared color source:

- **CSS Modules** (RecipeListPage, RecipeDetailPage, IngredientSearchPage, UploadPage) hardcode hex colors like `#5c7a52` directly in `.module.css` files.
- **Tailwind** (AddRecipePage, PlannerPage) uses `@theme` tokens like `text-sage`.

The same color palette is defined in `src/index.css` as Tailwind `@theme` tokens, but CSS Modules don't reference these variables. If `sage` changes from `#5c7a52` to something else, updates are needed in 4+ CSS Module files manually.

## Affected Files

- `src/features/recipes/RecipeListPage.module.css` — hardcoded hex colors
- `src/features/recipes/RecipeDetailPage.module.css` — hardcoded hex colors
- `src/features/search/IngredientSearchPage.module.css` — hardcoded hex colors
- `src/features/upload/UploadPage.module.css` — hardcoded hex colors
- `src/index.css` — Tailwind `@theme` token definitions (source of truth)

## Proposed Solution

Update all CSS Module files to reference the CSS custom properties that Tailwind v4 already generates from `@theme`:

```css
/* Before */
.button { background-color: #5c7a52; }

/* After */
.button { background-color: var(--color-sage); }
```

This keeps CSS Modules as-is (no migration to Tailwind needed) while ensuring a single source of truth for colors.

## Scope

- Replace all hardcoded hex values in `.module.css` files with `var(--color-*)` references
- Verify that Tailwind v4's `@theme` block exposes these as CSS custom properties (it does by default)
- No functional changes — purely cosmetic refactor

## Acceptance Criteria

- No hardcoded hex colors remain in any `.module.css` file
- All colors reference `var(--color-*)` custom properties
- Visual appearance is identical before and after
- `npm run build` passes
