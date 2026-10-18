#!/usr/bin/env bash
set -e

# Resolve repo root
if [ -f "scripts/ci-preflight.sh" ]; then
  ROOT_DIR="."
elif [ -f "../../scripts/ci-preflight.sh" ]; then
  ROOT_DIR="../.."
else
  ROOT_DIR="."
fi

cd "$ROOT_DIR"
if [ -f "scripts/ci-preflight.sh" ]; then
  bash scripts/ci-preflight.sh
fi

export NODE_OPTIONS="--max-old-space-size=7168"
pnpm --filter sierra-estates-client-page build
