# Frontend Accessibility Improvements

## Problem

While most interactive elements have `aria-label` attributes, several accessibility gaps exist:

### 1. CropModal lacks focus management
- No `role="dialog"` attribute
- No focus trapping — keyboard users can tab behind the modal
- No `aria-modal="true"`

### 2. IngredientSearchPage suggestion selection
- Suggestions use `onMouseDown` instead of `onClick` — keyboard-only users cannot select suggestions
- No `role="listbox"` / `role="option"` on the suggestion dropdown

### 3. StepIndicator missing step semantics
- No `aria-current="step"` on the active step
- Steps are visually distinguishable but not programmatically

### 4. CameraCapture decorative elements
- `LevelIndicator` has `aria-label` but is non-interactive — should be `aria-hidden="true"` or use `role="status"` for live updates

## Affected Files

- `src/components/CropModal.tsx` — focus trapping, dialog role
- `src/features/search/IngredientSearchPage.tsx` — keyboard suggestion selection
- `src/features/add-recipe/StepIndicator.tsx` — aria-current
- `src/components/CameraCapture.tsx` — decorative element roles

## Proposed Solution

1. **CropModal**: Add `role="dialog"`, `aria-modal="true"`, and implement focus trap (or use a library like `@radix-ui/react-dialog`)
2. **Suggestions**: Add `role="listbox"` to container, `role="option"` to items, handle `onKeyDown` for arrow navigation + Enter selection
3. **StepIndicator**: Add `aria-current="step"` to active step element
4. **LevelIndicator**: Change to `aria-hidden="true"` (decorative) or `role="status"` with `aria-live="polite"` (informational)

## Acceptance Criteria

- CropModal traps focus and announces as dialog
- Suggestion list navigable with keyboard (arrow keys + Enter)
- Active step programmatically identifiable
- No WCAG 2.1 AA violations in affected components
- `npm run build` passes
