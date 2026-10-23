#!/usr/bin/env bash
# ==============================================================================
# git-sync-main.sh
# Safely inspects, previews, and synchronizes branches targeting main.
# ==============================================================================
set -euo pipefail

BASE_BRANCH="main"
REMOTE="origin"
DRY_RUN=false
VERBOSE=false

print_usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Options:
  -d, --dry-run     Simulate actions without making any changes or merges
  -b, --base        Base branch to sync against (default: main)
  -r, --remote      Remote name (default: origin)
  -v, --verbose     Enable verbose output
  -h, --help        Show this help message
EOF
}

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--dry-run)
      DRY_RUN=true
      shift
      ;;
    -b|--base)
      BASE_BRANCH="$2"
      shift 2
      ;;
    -r|--remote)
      REMOTE="$2"
      shift 2
      ;;
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      print_usage >&2
      exit 1
      ;;
  esac
done

echo "=========================================================="
echo " git-sync-main — Branch Synchronization Tool"
echo "=========================================================="
echo " Remote:      $REMOTE"
echo " Base Branch: $BASE_BRANCH"
echo " Dry Run:     $DRY_RUN"
echo "=========================================================="

# Ensure we are inside a git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: Not inside a Git repository." >&2
  exit 1
fi

# Fetch remote refs
echo "Fetching latest refs from $REMOTE..."
git fetch "$REMOTE" --prune >/dev/null 2>&1 || {
  echo "Warning: Could not fetch from $REMOTE. Continuing with local refs..."
}

# Ensure base branch exists on remote
if ! git rev-parse --verify "$REMOTE/$BASE_BRANCH" >/dev/null 2>&1; then
  echo "Error: Remote branch $REMOTE/$BASE_BRANCH does not exist." >&2
  exit 1
fi

PLANNED_COUNT=0
UP_TO_DATE_COUNT=0
CONFLICT_COUNT=0

echo ""
echo "Evaluating branches relative to $REMOTE/$BASE_BRANCH:"
echo "----------------------------------------------------------"

# List candidate remote branches (excluding HEAD and base branch)
BRANCHES=$(git for-each-ref --format="%(refname:short)" "refs/remotes/$REMOTE/" | grep -v -E "(HEAD|$BASE_BRANCH)$" || true)

if [[ -z "$BRANCHES" ]]; then
  echo "No other remote branches found on $REMOTE."
  exit 0
fi

while IFS= read -r full_branch; do
  [[ -z "$full_branch" ]] && continue
  
  # Strip remote prefix for display
  branch_short="${full_branch#"$REMOTE/"}"
  
  # Check how many commits ahead and behind
  ahead=$(git rev-list --count "$REMOTE/$BASE_BRANCH..$full_branch" 2>/dev/null || echo "0")
  behind=$(git rev-list --count "$full_branch..$REMOTE/$BASE_BRANCH" 2>/dev/null || echo "0")
  
  if [[ "$ahead" -eq 0 ]]; then
    UP_TO_DATE_COUNT=$((UP_TO_DATE_COUNT + 1))
    if [[ "$VERBOSE" == "true" ]]; then
      echo "  ✓ $branch_short: Up to date / already merged into $BASE_BRANCH (behind: $behind)"
    fi
    continue
  fi
  
  # Test mergeability using merge-tree
  merge_base=$(git merge-base "$REMOTE/$BASE_BRANCH" "$full_branch" 2>/dev/null || true)
  has_conflict=false
  
  if [[ -n "$merge_base" ]]; then
    if git merge-tree "$merge_base" "$REMOTE/$BASE_BRANCH" "$full_branch" 2>&1 | grep -q "<<<<<<<"; then
      has_conflict=true
    fi
  fi
  
  if [[ "$has_conflict" == "true" ]]; then
    CONFLICT_COUNT=$((CONFLICT_COUNT + 1))
    echo "  ⚠ [CONFLICT] $branch_short ($ahead commit(s) ahead, behind $behind) — Requires manual resolution"
  else
    PLANNED_COUNT=$((PLANNED_COUNT + 1))
    echo "  → [PLANNED]  $branch_short ($ahead commit(s) ahead, behind $behind) — Clean merge possible"
  fi
done <<< "$BRANCHES"

echo "----------------------------------------------------------"
echo "Summary:"
echo "  Planned clean merges: $PLANNED_COUNT"
echo "  Branches with conflicts: $CONFLICT_COUNT"
echo "  Branches already merged: $UP_TO_DATE_COUNT"
echo "----------------------------------------------------------"

if [[ "$DRY_RUN" == "true" ]]; then
  echo ""
  echo "✔ [DRY RUN] Simulation complete. No branches were modified or pushed."
  exit 0
fi

if [[ "$PLANNED_COUNT" -eq 0 ]]; then
  echo "No clean merges to perform."
  exit 0
fi

echo "To execute these merges, create pull requests via scripts/git-create-prs.sh"
echo "or merge individual branches with git merge."
exit 0
