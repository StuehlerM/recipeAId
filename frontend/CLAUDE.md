# Frontend — CLAUDE.md

React 19 + Vite 7 + TypeScript + Tailwind CSS v4.

## Commands

All commands run from `frontend/`.

```bash
npm run dev      # Vite dev server at https://localhost:5173 (self-signed cert)
npm run build    # tsc + vite build
npm run lint     # ESLint
```

Set `VITE_API_BASE_URL=http://localhost:<port>` in `.env.local` to point at a real backend. Without it, `client.ts` falls back to mock data for all endpoints.

## Dependencies

sonner (toast notifications), react-image-crop (crop modal), @tailwindcss/vite, TanStack Query v5, React Router v6, lucide-react (NavBar icons), vite-plugin-pwa.

## Folder structure

```
src/
├── api/               # client.ts, types.ts, mockData.ts
├── components/        # Shared: NavBar, OcrCaptureButton, CropModal, CameraCapture
├── hooks/             # Shared: useOcrCapture.ts
├── utils/             # imageAnalysis.ts (sharpness + shadow detection)
└── features/          # Feature-based modules
    ├── recipes/       # RecipeListPage, RecipeDetailPage (+ CSS modules)
    ├── search/        # IngredientSearchPage (+ CSS module)
    ├── upload/        # UploadPage (+ CSS module)
    ├── add-recipe/    # AddRecipePage wizard, StepIndicator, UnitCombobox
    │                  # Steps: StepTitle, StepIngredients, StepInstructions, StepBook
    │                  # types.ts — IngredientRow { name, amount, unit }
    ├── planner/       # PlannerPage, usePlanner.ts, quantityAggregator.ts
    └── settings/      # SettingsPage, ThemeContext.tsx (dark/light toggle)
```

New pages use Tailwind classes; existing pages keep their CSS Modules.

## Styling — Tailwind CSS v4

Custom `@theme` tokens defined in `src/index.css`. Supports **light and dark themes** via Tailwind's `class` strategy — `ThemeContext` toggles a `dark` class on `<html>`. Preference persisted to `localStorage` key `recipeaid_theme_v1`.

| Token | Hex | Usage |
|-------|-----|-------|
| `canvas` | #faf9f7 | Page background |
| `card` | #ffffff | Surfaces / nav bar |
| `tint` | #f5f3ef | Subtle fills |
| `edge` | #e0dbd4 | Borders |
| `sage` | #5c7a52 | Primary accent (active states, CTAs, FAB) |
| `sage-light` | #7a9870 | Lighter accent |
| `ink` | #1a1917 | Primary text |
| `ghost` | #6b6560 | Secondary text / placeholders |
| `rose` | #b54f4f | Destructive |
| `rose-dark` | #8b3a3a | Destructive hover |

## Pages & navigation

| Route | Component | Notes |
|-------|-----------|-------|
| `/` | RecipeListPage | Title search + book filter dropdown + book badge on cards |
| `/recipes/:id` | RecipeDetailPage | Ingredients + instructions + delete + bookTitle |
| `/search` | IngredientSearchPage | Chip input, ranked results with match counts |
| `/upload` | UploadPage | Camera/file → OCR draft → edit → save |
| `/add` | AddRecipePage | 4-step wizard: Title → Ingredients → Instructions → Book |
| `/planner` | PlannerPage | Recipe browser + weekly plan + shopping list |
| `/settings` | SettingsPage | Dark theme toggle (persisted to localStorage) |

**NavBar:** Fixed bottom tab bar (5 tabs: Recipes / Search / **Add** (FAB) / Upload / Planner). Uses lucide-react icons (BookOpen, Search, Plus, Camera, CalendarDays). `env(safe-area-inset-bottom)` for iPhone home bar. `<main className="pb-20">` clears it.

**PWA:** `vite-plugin-pwa`, installable, `display: standalone`, SVG icon at `public/icon.svg`.

## Image handling (camera → OCR)

**CameraCapture** (`src/components/CameraCapture.tsx`): Fullscreen `z-[70]` overlay with live `getUserMedia` video stream (environment-facing, 1080p). Overlays: (1) guide frame with corner accents + scrim, (2) `LevelIndicator` bubble (DeviceOrientationEvent, iOS 13+ permission-gated), (3) shadow detection badge, (4) blur badge + capture button disabled when blurry. Torch toggle when `track.getCapabilities()?.torch` is present. `hidden` prop keeps stream alive under CropModal.

**CropModal** (`src/components/CropModal.tsx`): Fullscreen crop overlay (`react-image-crop`, z-[60]). Passes cropped image directly to OCR — no client-side preprocessing (all preprocessing is server-side in the OCR sidecar).

**useOcrCapture** (`src/hooks/useOcrCapture.ts`): Opens CameraCapture when `getUserMedia` available; falls back to hidden `<input type="file" capture="environment">`. Accepts `{ refine?: boolean }` (default true). Exposes `loadingStage: 'ocr' | 'llm' | null`. On crop confirm, image is converted to JPEG (0.92 quality) and downscaled to max 2048px.

**OcrCaptureButton** (`src/components/OcrCaptureButton.tsx`): Camera icon button with spinner. Accepts `refine?: boolean` prop. Stage-specific labels: "Reading image…" (ocr), "Translating…" (llm). StepTitle and StepInstructions pass `refine={false}`.

**imageAnalysis.ts** (`src/utils/imageAnalysis.ts`): `computeSharpnessVariance` (Laplacian variance, center 50% of frame, threshold=30) + `detectShadow` (mean luma + dark/bright pixel ratio). Analysis at 320x240.

## API client

`src/api/client.ts` uses `VITE_API_BASE_URL` to toggle real fetch vs mock data.

Key functions:
- `uploadRecipeImage(file, refine=true)` — appends `?refine=false` when needed
- `subscribeToOcrSession(sessionId, onDone, onFailed)` — EventSource for SSE, returns cleanup function
- `checkOk` logs `[API] <label> → <status>` to `console.error` on non-2xx

Logging: `useOcrCapture` logs `[OCR]` prefix; `CameraCapture` logs `[Camera]` prefix.

## Planner utilities

- `quantityAggregator.ts` — `aggregateIngredients(recipes)`: same-unit quantities summed; mixed/unparseable concatenated
- `usePlanner.ts` — localStorage key `recipeaid_planner_v1`, array of recipe IDs, lazy-initialised
