#!/usr/bin/env bash
# ==============================================================================
# Sierra Estates — Vercel Ignored Build Step (rate-limit guard)
#
# Set in Vercel Dashboard -> Project Settings -> Git -> Ignored Build Step.
# The command runs INSIDE the project's Root Directory (Vercel docs), and the
# script re-anchors itself to the repository root, so any relative path works:
#
#   Client portal  (Root Directory = repository root):
#       bash scripts/vercel-ignore-build.sh client
#   Admin (Next.js from apps/sierra-estates-realty):
#       bash scripts/vercel-ignore-build.sh admin
#   Admin if Root Directory = deploy (static SPA):
#       bash ../scripts/vercel-ignore-build.sh admin
#   Static fallback portal (Root Directory = deploy):
#       bash ../scripts/vercel-ignore-build.sh static
#
# Vercel semantics (docs/kb "Ignored Build Step" + "System environment
# variables"):
#   Exit 0        -> SKIP the build (saves the daily deploy quota)
#   Exit 1 (any)  -> PROCEED with the build
# Any ambiguity is treated as PROCEED (fail-open): a wasted build costs quota,
# a wrongly skipped build ships stale production code.
#
# Requires project setting "Enable access to System Environment Variables"
# (exposes VERCEL_GIT_COMMIT_SHA / VERCEL_GIT_PREVIOUS_SHA).
#
# Roles:
#   client  apps/sierra-estates-realty + workspace packages + root build config
#   admin   same codebase as client PLUS the static deploy/ fallback SPA
#           (superset on purpose: the admin project serves the Next.js codebase
#           today, and must never go stale whichever root directory it uses)
#   static  deploy/ only (pure static fallback portal, no build inputs elsewhere)
# ==============================================================================

# No `set -e`: every exit path below is explicit, and an unexpected failure
# must fall through to "proceed" (exit 1), not silently skip a build.
set -u

ROLE="${1:-${DEPLOY_ROLE:-}}"

# Escape hatch: FORCE_BUILD=1 in project env vars always proceeds.
if [ "${FORCE_BUILD:-}" = "1" ]; then
  echo "FORCE_BUILD=1 — proceeding with build."
  exit 1
fi

# Re-anchor to the repository root (works from any Root Directory).
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ] || [ ! -d "$REPO_ROOT/.git" ]; then
  echo "Cannot locate the git repository root; proceeding with build."
  exit 1
fi
cd "$REPO_ROOT"

# Resolve the role if it was not passed explicitly.
if [ -z "$ROLE" ]; then
  # VERCEL_PROJECT_NAME is a documented system env var (needs "Enable access
  # to System Environment Variables"). Match the admin project by name.
  case "${VERCEL_PROJECT_NAME:-}" in
    *admin*) ROLE="admin" ;;
    sierra-estates-client-portal|sierra-estates-client-page) ROLE="client" ;;
    *) ROLE="" ;;
  esac
fi
if [ -z "$ROLE" ]; then
  echo "No role given (pass 'client', 'admin' or 'static' as argv[1]) and VERCEL_PROJECT_NAME='${VERCEL_PROJECT_NAME:-}' is unrecognized."
  echo "Proceeding with build (fail-open)."
  exit 1
fi

echo "Vercel ignored-build check — project='${VERCEL_PROJECT_NAME:-unknown}' role=$ROLE"
echo "Repo: $(git rev-parse --show-toplevel)"
echo "Commit: ${VERCEL_GIT_COMMIT_SHA:-$(git rev-parse HEAD)}"

# First deployment for the branch: no previous successful deployment exists.
if [ -z "${VERCEL_GIT_PREVIOUS_SHA:-}" ]; then
  echo "VERCEL_GIT_PREVIOUS_SHA empty (first deployment for this branch); proceeding with build."
  exit 1
fi

# Diff against the last SUCCESSFUL deployment of this project/branch. Falls
# back to the parent commit (Vercel clones with --depth=10, so a very old
# previous SHA may be missing), and finally to "proceed".
CHANGED_FILES="$(git diff --name-only "$VERCEL_GIT_PREVIOUS_SHA" "$VERCEL_GIT_COMMIT_SHA" 2>/dev/null || true)"
DIFF_SOURCE="last successful deployment (${VERCEL_GIT_PREVIOUS_SHA:0:12})"
if [ -z "$CHANGED_FILES" ] && ! git cat-file -e "$VERCEL_GIT_PREVIOUS_SHA^{commit}" 2>/dev/null; then
  CHANGED_FILES="$(git diff --name-only HEAD^ HEAD 2>/dev/null || true)"
  DIFF_SOURCE="parent commit (HEAD^)"
fi
if [ -z "$CHANGED_FILES" ]; then
  echo "Could not compute a changed-file list (shallow clone or empty diff); proceeding with build (fail-open)."
  exit 1
fi

echo "Changed files ($DIFF_SOURCE):"
echo "$CHANGED_FILES"

# --- Role path sets -----------------------------------------------------------
# client: the Next.js portal compiles apps/sierra-estates-realty plus the
# workspace packages it transpiles, pnpm patches, and the root build inputs
# consumed by scripts/vercel-build.sh and vercel.json.
CLIENT_PATHS='^(apps/sierra-estates-realty/|packages/|patches/|package\.json$|pnpm-lock\.yaml$|pnpm-workspace\.yaml$|turbo\.json$|vercel\.json$|\.npmrc$|\.pnpmrc$|\.nvmrc$|scripts/vercel-build\.sh$|scripts/ci-preflight\.sh$|scripts/sync-inventory-snapshot\.mjs$)'
# admin: client inputs PLUS the static deploy/ fallback SPA (see header).
ADMIN_PATHS='^(apps/sierra-estates-realty/|packages/|patches/|deploy/|package\.json$|pnpm-lock\.yaml$|pnpm-workspace\.yaml$|turbo\.json$|vercel\.json$|\.npmrc$|\.pnpmrc$|\.nvmrc$|scripts/vercel-build\.sh$|scripts/ci-preflight\.sh$|scripts/sync-inventory-snapshot\.mjs$)'
# static: the deploy/ SPA has no build step and reads nothing else.
STATIC_PATHS='^deploy/'

case "$ROLE" in
  client) RELEVANT="$CLIENT_PATHS" ;;
  admin)  RELEVANT="$ADMIN_PATHS" ;;
  static) RELEVANT="$STATIC_PATHS" ;;
  *)
    echo "Unknown role '$ROLE'; proceeding with build (fail-open)."
    exit 1
    ;;
esac

RELEVANT_CHANGED="$(echo "$CHANGED_FILES" | grep -E "$RELEVANT" || true)"
if [ -n "$RELEVANT_CHANGED" ]; then
  echo "Relevant files changed for role '$ROLE':"
  echo "$RELEVANT_CHANGED"
  echo "Proceeding with build."
  exit 1
fi

echo "No files relevant to role '$ROLE' changed — skipping Vercel build to protect the daily deploy quota."
exit 0
