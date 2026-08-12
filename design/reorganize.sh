#!/usr/bin/env bash
# ============================================================================
# Sierra Estates — repo reorganizer
# Archives dead weight + old frontends into ./archive/ and consolidates docs.
# NON-DESTRUCTIVE: uses `git mv` (history preserved). Nothing is deleted.
#
# Usage (run from the repo root):
#   bash scripts/reorganize.sh            # DRY RUN — shows the plan only
#   bash scripts/reorganize.sh --apply    # actually move things
#   bash scripts/reorganize.sh --apply --branch   # + create a chore/reorg branch first
#
# Review the DRY RUN output before using --apply.
# ============================================================================
set -euo pipefail

APPLY=0
MAKE_BRANCH=0
for a in "$@"; do
  case "$a" in
    --apply)  APPLY=1 ;;
    --branch) MAKE_BRANCH=1 ;;
    *) echo "Unknown option: $a"; exit 2 ;;
  esac
done

# ── sanity checks ───────────────────────────────────────────────────────────
if [ ! -d .git ]; then echo "ERROR: run this from the repository root (no .git here)."; exit 1; fi
INGIT=1
say(){ printf '%s\n' "$*"; }
hr(){ printf -- '────────────────────────────────────────────────────────\n'; }

if [ "$APPLY" = "1" ]; then
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "ERROR: working tree is not clean. Commit or stash first."; exit 1
  fi
  if [ "$MAKE_BRANCH" = "1" ]; then
    git checkout -b chore/reorg-clean 2>/dev/null || git checkout chore/reorg-clean
    say "On branch: $(git rev-parse --abbrev-ref HEAD)"
  fi
fi

mode(){ [ "$APPLY" = "1" ] && echo "APPLY" || echo "DRY-RUN"; }
say "Mode: $(mode)"; hr

# move helper: move PATH -> archive/DEST  (existence-guarded, space-safe)
mv_into(){
  local src="$1" destdir="$2"
  if [ ! -e "$src" ]; then return 0; fi
  local dest="$destdir/$(basename "$src")"
  say "  archive: $src  ->  $dest"
  if [ "$APPLY" = "1" ]; then
    mkdir -p "$destdir"
    if git ls-files --error-unmatch "$src" >/dev/null 2>&1; then
      git mv -k "$src" "$dest"
    else
      mv "$src" "$dest"
    fi
  fi
}

# ── 1. dead-weight directories → archive/ ────────────────────────────────────
say "[1] Archiving dead-weight directories → archive/"
DEAD_DIRS=(
  ".archive" "_archive" "backups" "artifacts" "other"
  "project_brain" "Agents memory workflow"
  "Design apartment – Houzez_files"
  ".agent"                 # 7.5k generic skill scaffolding (edit if you use it)
)
for d in "${DEAD_DIRS[@]}"; do mv_into "$d" "archive"; done
hr

# ── 2. superseded frontends → archive/frontends/ ─────────────────────────────
say "[2] Archiving superseded frontends → archive/frontends/"
OLD_FRONTENDS=(
  "apps/sierra-estates-admin-portal"   # old Vite admin (replaced by apps/admin)
  "apps/sierra-estates-realty"         # old Next.js site+admin (client page comes later)
)
for d in "${OLD_FRONTENDS[@]}"; do mv_into "$d" "archive/frontends"; done
hr

# ── 3. stray root files → archive/misc/ ──────────────────────────────────────
say "[3] Archiving stray root files → archive/misc/"
STRAY_FILES=(
  "Design apartment – Houzez.html"
  "admin-design-preview (7).html"
  "property-finder-integration.htm"
  "Untitled-1.txt" "Untitled-2.txt" "Untitled-3.txt"
  "gemini-code-1782696520128.txt"
  "build-error.log" "diff.txt"
  "fix.py" "fix_duplicates.js" "fix_mobile.js"
  "extract_all_styles.js" "extract_styles.js" "rewrite_workflows.js"
  "legacy-animations-reference.ts"
  "FILE_MANIFEST.txt" "FILES_CREATED_PHASES_2-6.txt" "MIDDLEWARE_TEMPLATE.ts"
)
for f in "${STRAY_FILES[@]}"; do mv_into "$f" "archive/misc"; done
# any DeepSeek-named Arabic html at root
for f in *DeepSeek*.html; do [ -e "$f" ] && mv_into "$f" "archive/misc"; done
hr

# ── 4. consolidate redundant root docs → docs/ ───────────────────────────────
say "[4] Consolidating root *.md docs → docs/  (keeping core docs at root)"
KEEP_DOCS="README.md|CONTRIBUTING.md|SECURITY.md|LICENSE.md|CHANGELOG.md"
for f in *.md; do
  [ -e "$f" ] || continue
  if [[ "$f" =~ ^($KEEP_DOCS)$ ]]; then continue; fi
  mv_into "$f" "docs"
done
# localized / stray doc variants
for f in *.vi.md sierra_estates_OVERVIEW.md replit.md; do
  [ -e "$f" ] && mv_into "$f" "docs"
done
hr

# ── 5. verify the target app layout is present ───────────────────────────────
say "[5] Verifying clean app layout"
for p in "apps/admin/index.html" "apps/client/index.html"; do
  if [ -e "$p" ]; then say "  OK   $p"; else say "  MISSING $p  (copy it from the sierra-estates-clean bundle first)"; fi
done
hr

say "Done ($(mode))."
if [ "$APPLY" = "0" ]; then
  say ""
  say "This was a DRY RUN. Review the plan above, then run:"
  say "    bash scripts/reorganize.sh --apply --branch"
  say "After applying: pnpm install  &&  commit  &&  bash scripts/setup-branches.sh"
fi
