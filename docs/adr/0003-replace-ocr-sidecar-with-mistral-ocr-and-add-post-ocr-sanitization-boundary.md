# ADR 0003: Replace OCR Sidecar with Mistral OCR and Add Post-OCR Sanitization Boundary

## Status

Accepted

## Context

Issue #34 requires replacing the current OCR sidecar integration with Mistral OCR while preserving existing backend and frontend API contracts.

Current OCR ingestion flow returns raw OCR text that is consumed directly by:
- `IOcrParser` (regex draft extraction), and
- `IIngredientParserService` (LLM refinement path).

This creates implicit coupling between OCR-provider output quirks and downstream parsing behavior.  
To keep the OCR provider swappable and parsing behavior stable, a provider-agnostic sanitization boundary is needed between OCR extraction and all downstream parsing/refinement.

## Decision

1. Keep `IOcrService` as the stable OCR contract in Core.
2. Replace the Api-layer OCR adapter implementation from Python sidecar integration to a Mistral OCR adapter behind `IOcrService`.
3. Introduce a new Core boundary for normalized OCR text (sanitization service/interface) that is applied exactly once after OCR extraction success.
4. Feed sanitized OCR text into both:
   - `IOcrParser.Parse(...)`, and
   - `IIngredientParserService.ParseAsync(...)`.
5. Preserve existing HTTP API contracts for `/api/v1/recipes/from-image` and SSE session flow.

## Consequences

Positive:
- OCR provider can change without rewriting downstream parser behavior.
- Clear ownership boundary for OCR text normalization rules.
- Reduced prompt-injection and malformed-text propagation risk in refinement path.
- Better testability: sanitization can be unit-tested independently from OCR provider and parser adapters.

Negative:
- Adds one extra service abstraction and migration work in OCR ingestion orchestration.
- Requires updating tests and docs to reflect the new boundary.

Migration impact:
- Api DI wiring changes for OCR adapter.
- OCR ingestion flow updated to sanitize text before parse/refine calls.
- No frontend or external API contract changes expected.

## Alternatives Considered

- Keep raw OCR text flow and only adjust Mistral OCR prompting
- Implement sanitization inside each downstream parser separately
