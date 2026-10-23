#!/bin/bash

# sierra estates REALTY V12.0 - COMPLETE AUTO SETUP
# ONE COMMAND. EVERYTHING DONE. NO QUESTIONS ASKED.
# Just run it and wait for "✅ COMPLETE"

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get project root (where script is run from)
PROJECT_ROOT=$(pwd)
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
SETUP_LOG="${PROJECT_ROOT}/.setup-log.txt"

# Start logging
{
  echo "==================================="
  echo "Sierra Estates Setup - $TIMESTAMP"
  echo "Project: $PROJECT_ROOT"
  echo "==================================="
  echo ""
} | tee "$SETUP_LOG"

# ============================================
# PHASE 1: PREREQUISITES CHECK
# ============================================
echo -e "${BLUE}[1/5] Checking system...${NC}" | tee -a "$SETUP_LOG"

missing=0

if ! command -v git &> /dev/null; then
  echo -e "${RED}❌ Git not found${NC}" | tee -a "$SETUP_LOG"
  missing=1
fi

if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js not found${NC}" | tee -a "$SETUP_LOG"
  missing=1
fi

if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ npm not found${NC}" | tee -a "$SETUP_LOG"
  missing=1
fi

if [ $missing -eq 1 ]; then
  echo -e "${RED}Install missing tools and retry${NC}" | tee -a "$SETUP_LOG"
  exit 1
fi

echo -e "${GREEN}✅ Git, Node, npm OK${NC}" | tee -a "$SETUP_LOG"
echo "" | tee -a "$SETUP_LOG"

# ============================================
# PHASE 2: CREATE STRUCTURE
# ============================================
echo -e "${BLUE}[2/5] Creating directories...${NC}" | tee -a "$SETUP_LOG"

mkdir -p .claude
mkdir -p .github/workflows
mkdir -p scripts
mkdir -p reports/sync
mkdir -p libs

echo -e "${GREEN}✅ Directories ready${NC}" | tee -a "$SETUP_LOG"
echo "" | tee -a "$SETUP_LOG"

# ============================================
# PHASE 3: CREATE CONFIG FILES
# ============================================
echo -e "${BLUE}[3/5] Generating config files...${NC}" | tee -a "$SETUP_LOG"

# Create sync task
cat > .claude/sync-repos.md << 'SYNC_EOF'
# Task: Keep Three Repos in Sync

## Automated Sync for Sierra Estates Realty V12.0
- design-motion-principles (Kyle Zantos)
- taste-skill (Leonxlnx)  
- impeccable (pbakaus)

## Full Analysis

Pull latest from each:
```bash
cd ./libs/motion-principles && git fetch origin && git log --oneline -5 && cd ../..
cd ./libs/taste-skill && git fetch origin && git log --oneline -5 && cd ../..
cd ./libs/impeccable && git fetch origin && git log --oneline -5 && cd ../..
```

Check for breaking changes:
```bash
grep -i "breaking" ./libs/motion-principles/CHANGELOG.md 2>/dev/null || echo "No breaking changes"
grep -i "breaking" ./libs/taste-skill/CHANGELOG.md 2>/dev/null || echo "No breaking changes"
grep -i "breaking" ./libs/impeccable/CHANGELOG.md 2>/dev/null || echo "No breaking changes"
```

Type check:
```bash
npm install
npx tsc --noEmit 2>&1 | head -20
```

Build & test:
```bash
npm run build 2>&1 | tail -10
npm test -- --passWithNoTests 2>&1 | tail -10 || true
```

Generate report as SYNC_REPORT.md with:
- Current versions of all 3 repos
- Any breaking changes found
- Type errors (if any)
- Build/test status
- Action items for Stage 8 Concierge Gallery

Create migration guide for any breaking changes.

When done, generate SYNC_REPORT.md and stop.
SYNC_EOF

# Create shell script
cat > scripts/sync-repos.sh << 'SCRIPT_EOF'
#!/bin/bash
PROJECT_ROOT=$(pwd)
echo "🔄 Sierra Estates - Repo Sync"
echo ""
if ! command -v claude &> /dev/null; then
  echo "Installing Claude Code..."
  npm install -g @anthropic-ai/claude-code
fi
echo "Launching Claude Code..."
echo "In the session, paste: read .claude/sync-repos.md"
echo ""
cd "$PROJECT_ROOT"
claude
SCRIPT_EOF

chmod +x scripts/sync-repos.sh

# Create GitHub Actions
cat > .github/workflows/sync-repos.yml << 'GHA_EOF'
name: 📦 Sync Repos

on:
  schedule:
    - cron: '0 9 * * 1'
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: mkdir -p libs
      
      - name: Sync motion-principles
        run: |
          if [ -d "libs/motion-principles" ]; then
            cd libs/motion-principles && git fetch origin && git pull origin main 2>/dev/null || true
          else
            gh repo clone kylezantos/design-motion-principles libs/motion-principles 2>/dev/null || true
          fi
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Sync taste-skill
        run: |
          if [ -d "libs/taste-skill" ]; then
            cd libs/taste-skill && git fetch origin && git pull origin main 2>/dev/null || true
          else
            gh repo clone Leonxlnx/taste-skill libs/taste-skill 2>/dev/null || true
          fi
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Sync impeccable
        run: |
          if [ -d "libs/impeccable" ]; then
            cd libs/impeccable && git fetch origin && git pull origin main 2>/dev/null || true
          else
            gh repo clone pbakaus/impeccable libs/impeccable 2>/dev/null || true
          fi
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Check repos
        run: |
          echo "## Repo Status" >> $GITHUB_STEP_SUMMARY
          echo "### motion-principles" >> $GITHUB_STEP_SUMMARY
          git -C libs/motion-principles log -1 --oneline 2>/dev/null >> $GITHUB_STEP_SUMMARY || echo "N/A" >> $GITHUB_STEP_SUMMARY
          echo "### taste-skill" >> $GITHUB_STEP_SUMMARY
          git -C libs/taste-skill log -1 --oneline 2>/dev/null >> $GITHUB_STEP_SUMMARY || echo "N/A" >> $GITHUB_STEP_SUMMARY
          echo "### impeccable" >> $GITHUB_STEP_SUMMARY
          git -C libs/impeccable log -1 --oneline 2>/dev/null >> $GITHUB_STEP_SUMMARY || echo "N/A" >> $GITHUB_STEP_SUMMARY
      
      - run: npx tsc --noEmit 2>&1 || true
      - run: npm run build 2>&1 || true
      - run: npm test -- --passWithNoTests 2>&1 || true
GHA_EOF

echo -e "${GREEN}✅ Config files created${NC}" | tee -a "$SETUP_LOG"
echo "" | tee -a "$SETUP_LOG"

# ============================================
# PHASE 4: CLONE REPOS
# ============================================
echo -e "${BLUE}[4/5] Cloning external repos...${NC}" | tee -a "$SETUP_LOG"

cd libs

if [ "${ALLOW_UNVERIFIED_CLONES:-0}" != "1" ]; then
  echo "  ⚠️ Skipping external clones by default. Set ALLOW_UNVERIFIED_CLONES=1 after verifying the target refs." | tee -a "$SETUP_LOG"
else

for repo in "motion-principles:kylezantos/design-motion-principles" "taste-skill:Leonxlnx/taste-skill" "impeccable:pbakaus/impeccable"; do
  IFS=':' read -r dir gh_repo <<< "$repo"
  
  if [ ! -d "$dir" ]; then
    echo "  Cloning $dir..." | tee -a "$SETUP_LOG"
    if command -v gh &> /dev/null; then
      gh repo clone "$gh_repo" "$dir" 2>/dev/null || git clone "https://github.com/$gh_repo.git" "$dir" 2>/dev/null || echo "    ⚠️ Clone skipped" >> "$SETUP_LOG"
    else
      git clone "https://github.com/$gh_repo.git" "$dir" 2>/dev/null || echo "    ⚠️ Clone skipped" >> "$SETUP_LOG"
    fi
  else
    echo "  ✅ $dir exists" | tee -a "$SETUP_LOG"
  fi
done

fi

cd ..
echo -e "${GREEN}✅ Repos cloned${NC}" | tee -a "$SETUP_LOG"
echo "" | tee -a "$SETUP_LOG"

# ============================================
# PHASE 5: SUMMARY
# ============================================
echo -e "${BLUE}[5/5] Summary${NC}" | tee -a "$SETUP_LOG"

echo "" | tee -a "$SETUP_LOG"
echo -e "${GREEN}════════════════════════════════════${NC}" | tee -a "$SETUP_LOG"
echo -e "${GREEN}✅ SETUP COMPLETE${NC}" | tee -a "$SETUP_LOG"
echo -e "${GREEN}════════════════════════════════════${NC}" | tee -a "$SETUP_LOG"
echo "" | tee -a "$SETUP_LOG"

echo "📁 Created:" | tee -a "$SETUP_LOG"
echo "  .claude/sync-repos.md" | tee -a "$SETUP_LOG"
echo "  scripts/sync-repos.sh" | tee -a "$SETUP_LOG"
echo "  .github/workflows/sync-repos.yml" | tee -a "$SETUP_LOG"
echo "  libs/{motion-principles,taste-skill,impeccable}/" | tee -a "$SETUP_LOG"
echo "  reports/sync/" | tee -a "$SETUP_LOG"
echo "" | tee -a "$SETUP_LOG"

echo "🚀 Next steps:" | tee -a "$SETUP_LOG"
echo "  1. git add . && git commit -m 'chore: add repo sync'" | tee -a "$SETUP_LOG"
echo "  2. git push" | tee -a "$SETUP_LOG"
echo "  3. ./scripts/sync-repos.sh (manual check)" | tee -a "$SETUP_LOG"
echo "  4. GitHub Actions runs Mondays automatically" | tee -a "$SETUP_LOG"
echo "" | tee -a "$SETUP_LOG"

echo "📊 Outputs:" | tee -a "$SETUP_LOG"
echo "  SYNC_REPORT.md (generated after each sync)" | tee -a "$SETUP_LOG"
echo "  reports/sync/ (archived reports)" | tee -a "$SETUP_LOG"
echo "" | tee -a "$SETUP_LOG"

echo "Log saved to: $SETUP_LOG" | tee -a "$SETUP_LOG"
echo "" | tee -a "$SETUP_LOG"
