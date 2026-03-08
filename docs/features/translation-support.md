# Feature: Translation Support

**Status:** Not started
**Priority:** 5 — niche, defer until users request

## Current state

English + German OCR (PP-OCRv5 latin model); no recipe translation.

## What is needed

- Add `Language` field (ISO 639-1) to Recipe document — default `"en"`
- Store ingredient names in the recipe's language
- Frontend: language badge on recipe cards; language selector on create/edit
- Backend: filter recipes by user AND language
- OCR: already supports German; extend via `lang=` param in sidecar for more languages
- Stretch: AI-powered recipe translation via LLM sidecar
