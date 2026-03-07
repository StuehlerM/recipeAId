#!/usr/bin/env bash
# run-unit-tests.sh
#
# Runs all four unit-test layers in sequence.
# Exit code 0 = all pass.  Non-zero = at least one layer failed.
#
# Usage:
#   ./scripts/run-unit-tests.sh          # from repo root
#   SKIP_FRONTEND=1 ./scripts/run-unit-tests.sh  # skip the frontend build
#
# Each layer is run independently so you see which layer failed.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAILED=()

run_layer() {
  local name="$1"
  shift
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ▶  $name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if "$@"; then
    echo "  ✓  $name passed"
  else
    echo "  ✗  $name FAILED"
    FAILED+=("$name")
  fi
}

# ── Layer 1: Backend C# unit tests ─────────────────────────────────────────
run_layer "Backend (dotnet test)" \
  dotnet test "$REPO_ROOT/backend/" --nologo -v q

# ── Layer 2: OCR sidecar Python unit tests ──────────────────────────────────
run_layer "OCR sidecar (pytest)" \
  python -m pytest "$REPO_ROOT/ocr-service/tests/" -v --tb=short

# ── Layer 3: Ingredient parser Python unit tests ────────────────────────────
run_layer "Ingredient parser (pytest)" \
  python -m pytest "$REPO_ROOT/ingredient-parser/tests/" -v --tb=short

# ── Layer 4: Frontend TypeScript build ─────────────────────────────────────
if [[ "${SKIP_FRONTEND:-0}" != "1" ]]; then
  run_layer "Frontend (npm run build)" \
    bash -c "cd '$REPO_ROOT/frontend' && npm run build --silent"
else
  echo ""
  echo "  –  Frontend build skipped (SKIP_FRONTEND=1)"
fi

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ ${#FAILED[@]} -eq 0 ]]; then
  echo "  ✓  All unit tests passed"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
else
  echo "  ✗  Failed layers: ${FAILED[*]}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
