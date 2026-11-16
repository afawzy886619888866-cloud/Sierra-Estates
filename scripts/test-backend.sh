#!/usr/bin/env bash
# Backend test runner for Sierra Estates.
#
# Runs:
#   1. Python backend tests (apps/api/) — pytest
#   2. Firebase Cloud Functions tests (functions/) — jest
#
# Both must pass. Exits non-zero on any failure.
#
# Usage:
#   ./scripts/test-backend.sh          # run all
#   ./scripts/test-backend.sh --python # python only
#   ./scripts/test-backend.sh --js     # js only
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_PYTHON=1
RUN_JS=1

if [[ "${1:-}" == "--python" ]]; then RUN_JS=0; fi
if [[ "${1:-}" == "--js" ]]; then RUN_PYTHON=0; fi

EXIT_CODE=0

# ─────────────────────────────────────────────────────────────────────────────
# Python backend (apps/api/)
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$RUN_PYTHON" == "1" ]]; then
  echo "==============================================================="
  echo "PYTHON BACKEND TESTS (apps/api/)"
  echo "==============================================================="
  cd "$ROOT/apps/api"
  if ! command -v pytest &>/dev/null; then
    echo "pytest not installed. Installing..."
    pip install --quiet pytest fastapi uvicorn pydantic python-dotenv httpx
  fi
  if python3 -m pytest -v; then
    echo "[PYTHON] ✅ all tests passed"
  else
    echo "[PYTHON] ❌ tests failed"
    EXIT_CODE=1
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Firebase Cloud Functions (functions/)
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$RUN_JS" == "1" ]]; then
  echo ""
  echo "==============================================================="
  echo "FIREBASE FUNCTIONS TESTS (functions/)"
  echo "==============================================================="
  cd "$ROOT/functions"
  if [[ ! -d node_modules ]]; then
    echo "node_modules missing — installing (jest, firebase-admin, firebase-functions, typescript)..."
    npm install --no-audit --no-fund --no-workspaces --install-strategy=nested \
      jest@^29 firebase-admin@^13 firebase-functions@^6 typescript@^5 @types/node@^20 --no-save
  fi
  # Compile TypeScript to lib/ (required for the v2 tests)
  if [[ -f tsconfig.json ]]; then
    echo "Compiling TypeScript..."
    ./node_modules/.bin/tsc
  fi
  if npx jest; then
    echo "[JS] ✅ all tests passed"
  else
    echo "[JS] ❌ tests failed"
    EXIT_CODE=1
  fi
fi

echo ""
if [[ "$EXIT_CODE" == "0" ]]; then
  echo "✅ ALL BACKEND TESTS PASSED"
else
  echo "❌ SOME TESTS FAILED (see above)"
fi
exit $EXIT_CODE
