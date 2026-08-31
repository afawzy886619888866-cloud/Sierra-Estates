#!/usr/bin/env bash
# Prepares a fresh Claude Code / CI-style checkout so builds and tests can run.
#
# Two things bite a clean container:
#   1. node_modules is empty, so every turbo task fails before it starts.
#   2. Node 22+ built-in fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY is
#      set. next/font/google fetches at build time, so behind a proxy the client
#      build dies with SELF_SIGNED_CERT_IN_CHAIN / "Failed to fetch <font>".
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -n "${HTTPS_PROXY:-${https_proxy:-}}" ]; then
  export NODE_USE_ENV_PROXY=1
fi

if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "[session-start] installing workspace dependencies…"
  pnpm install --no-frozen-lockfile
else
  echo "[session-start] node_modules present — skipping install."
fi
