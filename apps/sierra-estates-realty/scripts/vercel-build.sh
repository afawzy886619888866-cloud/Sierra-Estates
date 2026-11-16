#!/usr/bin/env bash
set -e

# Resolve repo root
if [ -f "scripts/sync-inventory-snapshot.mjs" ]; then
  ROOT_DIR="."
elif [ -f "../../scripts/sync-inventory-snapshot.mjs" ]; then
  ROOT_DIR="../.."
else
  ROOT_DIR="."
fi

cd "$ROOT_DIR"
node scripts/sync-inventory-snapshot.mjs || true
export NODE_OPTIONS="--max-old-space-size=7168"
pnpm --filter sierra-estates-client-page build
