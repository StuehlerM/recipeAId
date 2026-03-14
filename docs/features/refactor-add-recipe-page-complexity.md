# Refactor: Reduce AddRecipePage Complexity

## Problem

`AddRecipePage.tsx` (219 lines) is the most complex component in the frontend. It manages:

- All 4 steps' state (title, ingredients, instructions, bookTitle)
- Step navigation logic
- Ingredient mapping + replace confirmation dialog
- OCR integration for 3 different steps
- Save mutation with image key commitment
- Inline Tailwind style strings for buttons (repeated in PlannerPage too)
- Rendering of all 4 step sub-components with heavy prop drilling (8 props to StepIngredients)

This makes the component hard to read, test, and extend.

## Affected Files

- `src/features/add-recipe/AddRecipePage.tsx` — god component
- `src/features/add-recipe/StepIngredients.tsx` — receives 8+ props
- `src/features/planner/PlannerPage.tsx` — duplicates button/input style strings

## Proposed Solution

### 1. Extract wizard state into a custom hook

```typescript
// useAddRecipeWizard.ts
function useAddRecipeWizard() {
  // All state: step, title, ingredients, instructions, bookTitle, touched
  // All handlers: nextStep, prevStep, updateIngredient, addIngredient, removeIngredient
  // Replace confirmation: replaceConfirm, pendingDraft, handleConfirmReplace, handleDismissReplace
  // Save mutation
  return { state, handlers, mutation };
}
```

### 2. Extract shared Tailwind class strings

```typescript
// src/styles/shared.ts
export const inputBase = "...";
export const btnPrimary = "...";
export const btnSecondary = "...";
```

### 3. Consider extracting shared IngredientRowInput component

`UploadPage` and `StepIngredients` both render nearly identical ingredient row UIs (name + amount + unit + remove button). Extract to a shared component.

## Acceptance Criteria

- AddRecipePage is under 100 lines
- No prop drilling deeper than 3 levels
- Button/input style strings defined once, imported where needed
- Shared `IngredientRowInput` component used by both AddRecipePage and UploadPage
- All existing behavior preserved
- `npm run build` passes
