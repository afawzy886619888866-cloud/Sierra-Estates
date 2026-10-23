#!/usr/bin/env bash
# ==============================================================================
# git-create-prs.sh
# Creates GitHub pull requests for branches ahead of main.
# ==============================================================================
set -euo pipefail

BASE_BRANCH="main"
REMOTE="origin"
DRY_RUN=false

print_usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Options:
  -d, --dry-run     Preview pull requests without creating them
  -b, --base        Target base branch (default: main)
  -r, --remote      Remote name (default: origin)
  -h, --help        Show this help message
EOF
}

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
echo " git-create-prs — PR Automation Tool"
echo "=========================================================="
echo " Base Branch: $BASE_BRANCH"
echo " Dry Run:     $DRY_RUN"
echo "=========================================================="

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is required but not installed." >&2
  exit 1
fi

BRANCHES=$(git for-each-ref --format="%(refname:short)" "refs/remotes/$REMOTE/" | grep -v -E "(HEAD|$BASE_BRANCH)$" || true)

while IFS= read -r full_branch; do
  [[ -z "$full_branch" ]] && continue
  branch_short="${full_branch#"$REMOTE/"}"
  
  ahead=$(git rev-list --count "$REMOTE/$BASE_BRANCH..$full_branch" 2>/dev/null || echo "0")
  if [[ "$ahead" -eq 0 ]]; then
    continue
  fi
  
  # Check if PR already exists
  existing_pr=$(gh pr list --head "$branch_short" --base "$BASE_BRANCH" --json number -q '.[0].number' 2>/dev/null || true)
  if [[ -n "$existing_pr" ]]; then
    echo "  [EXISTS] PR #$existing_pr already exists for $branch_short"
    continue
  fi
  
  title="Merge $branch_short into $BASE_BRANCH"
  body="Automated PR to sync \`$branch_short\` ($ahead commit(s) ahead) into \`$BASE_BRANCH\`."
  
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  [DRY RUN] Would create PR: '$title' for $branch_short"
  else
    echo "  [CREATING] Creating PR for $branch_short..."
    gh pr create --head "$branch_short" --base "$BASE_BRANCH" --title "$title" --body "$body"
  fi
done <<< "$BRANCHES"

echo "Done."
