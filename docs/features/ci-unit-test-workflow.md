# Add Unit Test Enforcement to CI

## Problem

Unit tests (4 layers: backend C#, OCR Python, parser Python, frontend build) currently run **only locally** via the pre-push git hook. A developer can bypass this with `git push --no-verify` and push broken code that only fails when integration tests run in CI — or worse, doesn't get caught at all if the breakage is in business logic not covered by BDD scenarios.

The integration workflow (`integration.yml`) only runs the full Docker BDD stack. There is no CI enforcement of unit tests.

## Affected Files

- `.github/workflows/integration.yml` — existing CI workflow (BDD only)
- `scripts/run-unit-tests.sh` — existing unit test runner (local only)

## Proposed Solution

Add a new GitHub Actions workflow (`.github/workflows/unit-tests.yml`) that runs on every PR to `main`, executing the same 4 layers as the local pre-push hook:

1. **Backend**: `dotnet test backend/`
2. **OCR sidecar**: `pip install -r requirements-test.txt && pytest ocr-service/tests/`
3. **Ingredient parser**: `pip install ... && pytest ingredient-parser/tests/`
4. **Frontend**: `cd frontend && npm ci && npm run build`

### Considerations

- Layers 1-3 can run in parallel (separate jobs) for speed
- Layer 4 (frontend build) can also run in parallel
- No Docker needed — unit tests mock all heavy dependencies
- Should be fast (~2-3 minutes total)
- Add this as a required status check in branch protection alongside the BDD check

## Acceptance Criteria

- New workflow runs on every PR to `main`
- All 4 unit test layers execute
- Workflow fails if any layer fails
- Status check name added to branch protection documentation
- `[skip ci]` bypass still works
