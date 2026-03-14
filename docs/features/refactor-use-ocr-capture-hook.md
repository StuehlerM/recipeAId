# Refactor: Split useOcrCapture Hook

## Problem

`useOcrCapture` (`src/hooks/useOcrCapture.ts`, 194 lines) has too many responsibilities:

1. File input creation and click handling
2. Camera vs file-picker fallback detection
3. Image conversion to JPEG (canvas + quality settings)
4. Image downscaling (max 2048px)
5. API call to OCR endpoint
6. SSE subscription for LLM refinement (with fallback to regex-only)
7. Loading states (OCR vs LLM stage)
8. Error handling and cleanup

It returns 12 items, making it hard to understand the API surface.

## Affected Files

- `src/hooks/useOcrCapture.ts` — bloated hook

## Proposed Solution

Split into focused utilities:

### 1. Extract image conversion utility
```typescript
// src/utils/imageConversion.ts
export function toJpeg(file: File, maxDimension?: number): Promise<Blob>
```

### 2. Keep useOcrCapture focused on orchestration
After extracting `toJpeg`, the hook becomes:
- Camera/file input management
- Call `toJpeg` + API upload
- SSE subscription
- State management

This should reduce the hook to ~120 lines and make the image conversion logic independently testable.

## Acceptance Criteria

- `toJpeg` extracted to `src/utils/imageConversion.ts`
- `useOcrCapture` uses the extracted utility
- Hook returns are unchanged (no breaking API)
- `npm run build` passes
