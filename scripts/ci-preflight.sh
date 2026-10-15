#!/usr/bin/env bash
# ============================================================================
# scripts/ci-preflight.sh — the single CI door for SE-Vercel-deploy-main.
# ============================================================================
# Runs INSIDE the Vercel production build (see vercel.json buildCommand), so
# every deploy is gated by exactly the checks .github/workflows/ci.yml used
# to run on GitHub Actions. The Actions job is demoted to a manual
# (workflow_dispatch) fallback after the Free-plan minute quota was exhausted
# — see docs/GITHUB_ACTIONS_SPENDING_LIMIT_GUIDE.md section 0.
#
# Gates (mirror ci.yml 1:1, same order) plus gate 0, which regenerates the
# master-inventory CSV the phase13-data-qa suite pins against:
#   0. master inventory regeneration (python3, openpyxl bootstrapped if needed)
#   1. build workspace packages
#   2. type-check workspace packages
#   3. type-check the realty app
#   4. canonical backend policy
#   5. public environment safety
#   6. legacy runtime boundary
#   7. lint the realty app
#   8. unit tests (realty app test:ci)
# The app production build itself follows as the buildCommand tail.
#
# Requires node + pnpm with dependencies already installed (Vercel runs
# installCommand first; locally: pnpm install --frozen-lockfile).
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

command -v pnpm >/dev/null 2>&1 || {
  echo 'FATAL: pnpm not found on PATH (Vercel images ship it via corepack; locally: corepack enable)' >&2
  exit 1
}

# Same env contract as ci.yml: real Vercel values when present, placeholder
# values otherwise — the backend-policy stage is presence-only.
: "${NEXT_PUBLIC_SUPABASE_URL:=https://example.supabase.co}"
: "${NEXT_PUBLIC_SUPABASE_ANON_KEY:=ci-test-anon-key}"
: "${SUPABASE_SERVICE_ROLE_KEY:=ci-test-service-role-key}"
export NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY
export PUPPETEER_SKIP_DOWNLOAD=true PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export NODE_OPTIONS="--max-old-space-size=7168"

T0="$SECONDS"
gate() { echo; echo "════════ gate $1/8: $2 ════════"; }

gate 0 'master inventory regeneration (phase13 data source)'
SE_PY=python3
if ! python3 -c 'import openpyxl' >/dev/null 2>&1; then
  echo 'openpyxl missing — bootstrapping (PEP 668-safe cascade)'
  # Vercel build images increasingly ship externally-managed Python (uv), which
  # refuses bare "pip install" with "externally-managed-environment" (PEP 668).
  # Bootstrap in order of preference — never fabricate a success:
  #   1. classic --user install      (older images, no PEP 668)
  #   2. isolated venv                (PEP 668-safe, keeps interpreter clean)
  #   3. --break-system-packages      (last resort on managed interpreters)
  if ! python3 -m pip install --user --quiet openpyxl 2>/dev/null; then
    if python3 -m venv /tmp/se-py3venv >/dev/null 2>&1 \
       && /tmp/se-py3venv/bin/pip install --quiet openpyxl >/dev/null 2>&1; then
      echo 'openpyxl installed into isolated venv /tmp/se-py3venv'
      SE_PY=/tmp/se-py3venv/bin/python3
    else
      echo 'venv bootstrap unavailable — falling back to --break-system-packages'
      python3 -m pip install --quiet --break-system-packages openpyxl \
        || pip install --quiet --break-system-packages openpyxl
    fi
  fi
fi
"$SE_PY" scripts/data-audit/build_master_inventory.py

gate 1 'build workspace packages'
pnpm --filter "./packages/*" run build

gate 2 'type-check workspace packages'
pnpm --filter "./packages/*" run type-check

gate 3 'type-check the realty app'
pnpm --filter sierra-estates-client-page type-check

gate 4 'canonical backend policy'
pnpm check:backend

gate 5 'public environment safety'
pnpm check:public-env

gate 6 'legacy runtime boundary'
pnpm check:legacy-runtime

gate 7 'lint the realty app'
pnpm --filter sierra-estates-client-page lint

gate 8 'unit tests (realty app)'
pnpm --filter sierra-estates-client-page test:ci

echo
echo "════════ PREFLIGHT PASSED — 8/8 gates green in $((SECONDS - T0))s ════════"
