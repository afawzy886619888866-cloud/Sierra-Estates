#!/usr/bin/env bash
# ==============================================================================
# make-demo-repo.sh
# Creates a temporary mock git repository to safely test git-sync-main.sh.
# ==============================================================================
set -euo pipefail

DEMO_DIR="${1:-./demo-sync-repo}"

echo "Creating demo repo at $DEMO_DIR..."
rm -rf "$DEMO_DIR"
mkdir -p "$DEMO_DIR"
cd "$DEMO_DIR"

git init -b main
git config user.name "Demo User"
git config user.email "demo@example.com"

echo "# Demo Repo" > README.md
git add README.md
git commit -m "initial commit"

# Create feature-1 branch
git checkout -b feat/demo-feature-1
echo "feature 1 update" >> feature1.txt
git add feature1.txt
git commit -m "feat: add feature 1"

# Create feature-2 branch
git checkout main
git checkout -b feat/demo-feature-2
echo "feature 2 update" >> feature2.txt
git add feature2.txt
git commit -m "feat: add feature 2"

git checkout main
echo "Demo repo successfully initialized at $DEMO_DIR with 2 feature branches."
