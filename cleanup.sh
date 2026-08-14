#!/usr/bin/env bash
# Cleanup script for Sierra Estates workspace
set -e

echo "=== Sierra Estates Workspace Cleanup ==="

echo "1. Cleaning temporary logs and cache..."
rm -f *.log
rm -rf .next/cache

echo "2. Pruning git remote branches..."
git fetch --prune origin || true

echo "3. Verifying pnpm workspace integrity..."
pnpm store prune || true

echo "=== Cleanup completed successfully ==="
