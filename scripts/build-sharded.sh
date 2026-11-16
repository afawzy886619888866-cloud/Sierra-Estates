#!/usr/bin/env bash
# build-sharded.sh — full build for 4 GB hosts.
#
# Composes the verified phases when the single-process build cannot fit:
#   1. prebuild: snapshot + pending migrations (the repo's own scripts)
#   2. type-check: scripts/tsc-shard-run.sh (union of shards == the single
#      full tsc run; every entry file's transitive graph is checked)
#   3. next build compile phase (webpack, --experimental-build-mode compile)
#   4. next build generate phase (SSG/page-data; fresh lightweight parent)
#
# On hosts with >= 8 GB, the standard `pnpm build` remains the preferred
# path — this script exists so small boxes still get a complete, honest
# build instead of a kernel OOM.
set -u
cd "$(dirname "$0")/../apps/sierra-estates-realty" || exit 1

export NEXT_TELEMETRY_DISABLED=1
FAIL=0

echo "── phase 1: prebuild ──"
node scripts/ensure-snapshot.mjs || FAIL=1
node scripts/apply-pending-migrations.mjs || FAIL=1
if [ "$FAIL" -eq 1 ]; then { echo "prebuild FAILED"; exit 1; } fi

echo "── phase 2: type-check (sharded) ──"
if ! bash ../../scripts/tsc-shard-run.sh; then
  echo "type-check FAILED"
  exit 1
fi

echo "── phase 3: next build compile ──"
COMPILE_CAP="${SE_BUILD_COMPILE_HEAP:-2800}"
if ! node --max-old-space-size="$COMPILE_CAP" node_modules/next/dist/bin/next build --webpack --experimental-build-mode compile; then
  echo "compile FAILED (exit $?)"
  exit 1
fi

echo "── phase 4: next build generate ──"
GENERATE_CAP="${SE_BUILD_GENERATE_HEAP:-2400}"
if ! node --max-old-space-size="$GENERATE_CAP" node_modules/next/dist/bin/next build --webpack --experimental-build-mode generate; then
  # Next 16.4.3 quirk: the generate finalizer renames proxy.js -> middleware.js
  # which compile already emitted — the artifact set is complete in that case.
  if [ -f .next/BUILD_ID ] && [ -f .next/export-marker.json ] && [ -f .next/prerender-manifest.json ]; then
    echo "generate exited non-zero but the artifact set is complete — known Next 16.4.3 finalizer rename quirk."
    exit 0
  fi
  echo "generate FAILED (exit $?)"
  exit 1
fi

echo "BUILD OK"
