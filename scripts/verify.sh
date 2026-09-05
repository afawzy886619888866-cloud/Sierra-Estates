#!/usr/bin/env bash
#
# Local quality gate — the checks CI would run, run here instead.
#
# GitHub Actions in this repository has been unable to execute jobs since
# 2026-08-25 (every run ends in startup_failure before any job starts), so
# nothing is gating pushes server-side. This script is the stand-in. Keep it
# in sync with .github/workflows/ci.yml so the two agree once Actions is back.
#
#   pnpm verify              run everything
#   SKIP_TESTS=1 pnpm verify skip the test suite (faster inner loop)
#
set -uo pipefail
cd "$(dirname "$0")/.."

FAILED=()
run () {
  local name="$1"; shift
  printf '\n\033[1m── %s ─────────────────────────────────\033[0m\n' "$name"
  if "$@"; then
    printf '\033[32m✓ %s\033[0m\n' "$name"
  else
    printf '\033[31m✗ %s\033[0m\n' "$name"
    FAILED+=("$name")
  fi
}

run "type-check" pnpm turbo run type-check
run "lint"       pnpm turbo run lint

if [ "${SKIP_TESTS:-0}" = "1" ]; then
  printf '\n\033[33m⊘ tests skipped (SKIP_TESTS=1)\033[0m\n'
else
  run "tests (packages)" pnpm turbo run test:ci
  run "tests (root)"     pnpm exec vitest run
fi

# Workflow linting. A duplicate key or a bad `choice` option makes a workflow
# invalid, and GitHub reports that only as a startup failure with no logs and
# no jobs — a YAML parser will NOT catch it (duplicate keys parse fine, last
# one wins). Install: https://github.com/rhysd/actionlint/releases
if command -v actionlint >/dev/null 2>&1; then
  run "workflows (actionlint)" actionlint -shellcheck= -pyflakes=
else
  printf '\n\033[33m⊘ actionlint not installed — skipping workflow validation\033[0m\n'
  printf '  Install it to catch invalid workflow files before pushing:\n'
  printf '  https://github.com/rhysd/actionlint/releases\n'
fi

printf '\n────────────────────────────────────────\n'
if [ ${#FAILED[@]} -eq 0 ]; then
  printf '\033[32mAll checks passed.\033[0m\n'
  exit 0
fi
printf '\033[31mFailed: %s\033[0m\n' "${FAILED[*]}"
exit 1
