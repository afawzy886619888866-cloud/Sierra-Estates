#!/usr/bin/env bash
# ============================================================================
# Sierra Estates — branch-per-part setup
# Creates one branch per part of the project, all based off the current
# (cleaned) branch, and optionally pushes them to origin.
#
# Usage (run from the repo root, ideally after reorganize.sh --apply):
#   bash scripts/setup-branches.sh                 # DRY RUN — shows the plan
#   bash scripts/setup-branches.sh --apply         # create branches locally
#   bash scripts/setup-branches.sh --apply --push  # create + push to origin
# ============================================================================
set -euo pipefail

APPLY=0; PUSH=0
for a in "$@"; do case "$a" in
  --apply) APPLY=1 ;; --push) PUSH=1 ;;
  *) echo "Unknown option: $a"; exit 2 ;;
esac; done

[ -d .git ] || { echo "ERROR: run from the repository root."; exit 1; }

# The parts you asked for (edit freely):
BRANCHES=(
  "admin-page"           # apps/admin — the uploaded admin portal
  "clients-page"         # apps/client — client hub (uploaded later)
  "backend-agents-bots"  # apps/api, apps/agents, services/*, functions/*
  "workflows"            # workflows/, n8n, openclaw
  "infra-deploy"         # firebase.json, vercel.json, .env, CI
)

BASE="$(git rev-parse --abbrev-ref HEAD)"
echo "Base branch: $BASE"
echo "Mode: $([ "$APPLY" = 1 ] && echo APPLY || echo DRY-RUN)  Push: $([ "$PUSH" = 1 ] && echo yes || echo no)"
echo "────────────────────────────────────────────────────────"

if [ "$APPLY" = 1 ]; then
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "ERROR: working tree not clean. Commit or stash first."; exit 1
  fi
fi

HAS_ORIGIN=0
git remote get-url origin >/dev/null 2>&1 && HAS_ORIGIN=1

for b in "${BRANCHES[@]}"; do
  if git show-ref --verify --quiet "refs/heads/$b"; then
    echo "  exists:  $b"
  else
    echo "  create:  $b   (from $BASE)"
    [ "$APPLY" = 1 ] && git branch "$b" "$BASE"
  fi
  if [ "$PUSH" = 1 ]; then
    if [ "$HAS_ORIGIN" = 1 ]; then
      echo "  push:    $b -> origin"
      [ "$APPLY" = 1 ] && git push -u origin "$b"
    else
      echo "  (no 'origin' remote configured — skipping push for $b)"
    fi
  fi
done

echo "────────────────────────────────────────────────────────"
git checkout "$BASE" >/dev/null 2>&1 || true
echo "Done. Branches based on '$BASE':"
printf '  %s\n' "${BRANCHES[@]}"
if [ "$APPLY" = 0 ]; then
  echo ""
  echo "DRY RUN only. To create locally:      bash scripts/setup-branches.sh --apply"
  echo "To create and push to GitHub:         bash scripts/setup-branches.sh --apply --push"
fi
