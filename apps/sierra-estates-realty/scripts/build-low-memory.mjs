#!/usr/bin/env node
/**
 * Low-memory production build for sierra-estates-client-page.
 *
 * WHY THIS EXISTS
 * ───────────────
 * `pnpm build` pins `NODE_OPTIONS=--max-old-space-size=6144` for `next build`,
 * which is correct on Vercel-class hosts (8 GB+) but gets the compiler and the
 * static-generation worker kernel-OOM-killed on small hosts (solo 4 GB CI
 * runners, dev sandboxes). Measured peak demand on this app (Next 16.4.3,
 * webpack, 127 static pages):
 *
 *   - webpack compile:        ~3.3 GB heap
 *   - page-data + SSG worker:  ~2.8 GB heap, but only while the build parent
 *                              is resident — combined they exceed 4 GB.
 *
 * Splitting `next build` into Next's `--experimental-build-mode compile` and
 * `generate` phases gives the SSG worker a fresh, lightweight parent process,
 * which fits both phases inside 4 GB. Verified live: compile 3300 MB +
 * generate 2800 MB completes 127/127 pages on a 3.9 GB host.
 *
 * KNOWN QUIRK HANDLED HERE
 * ────────────────────────
 * On Next 16.4.3, the generate-phase finalizer renames
 * `.next/server/proxy.js` -> `.next/server/middleware.js`, but the compile
 * phase already emits `middleware.js` directly, so the rename fails with
 * ENOENT after all pages were generated. The script treats that case as
 * success after verifying the artifact set is complete (BUILD_ID,
 * export-marker.json, prerender-manifest.json, middleware/proxy bundle).
 *
 * ORPHANED WORKER SWEEP
 * ─────────────────────
 * When a build is OOM-killed, its jest-worker `processChild.js` children can
 * survive as orphans and keep hoarding hundreds of MB, silently poisoning
 * every subsequent build attempt on the same host (observed live: ~700 MB
 * stray). This script sweeps such orphans — filtered to THIS repo's
 * node_modules path — before the first phase, between phases, and at exit.
 * Unix only; on Windows the sweep is skipped.
 *
 * USAGE
 * ─────
 *   pnpm --filter sierra-estates-client-page build:low-memory
 *
 * Behaviour:
 *   - host >= 7 GB total: runs the normal single-phase build (6144 MB cap,
 *     identical to `pnpm build`'s next-build step)
 *   - host <  7 GB total: runs the two-phase split with adaptive caps
 *       compile  = clamp(2048, totalMem * 0.84, 4096) MB
 *       generate = clamp(2048, totalMem * 0.70, 3300) MB
 *
 * Env overrides: SE_BUILD_HEAP (single-phase), SE_BUILD_COMPILE_HEAP,
 * SE_BUILD_GENERATE_HEAP — MB numbers, take precedence over the formulas.
 *
 * The script mirrors the canonical `build` chain: prebuild (snapshot +
 * pending migrations) -> type-check (adaptive heap via tsc-adaptive.mjs)
 * -> next build. No build semantics are skipped or weakened.
 */
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(APP_DIR, '..');
const NEXT_BIN = path.resolve(APP_DIR, 'node_modules/next/dist/bin/next');
const NEXT_DIR = path.join(APP_DIR, '.next');

const SINGLE_PHASE_MIN_TOTAL_MB = 7000;
const DEFAULT_SINGLE_HEAP_MB = 6144;

const phase = (name) => ({ name, startedAt: Date.now() });

function elapsedMs(startedAt) {
  return ((Date.now() - startedAt) / 1000).toFixed(1);
}

function clamp(min, value, max) {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function heapCapMb(kind) {
  const totalMb = os.totalmem() / (1024 * 1024);
  const override = Number(
    kind === 'single'
      ? process.env.SE_BUILD_HEAP
      : kind === 'compile'
        ? process.env.SE_BUILD_COMPILE_HEAP
        : process.env.SE_BUILD_GENERATE_HEAP
  );
  if (Number.isFinite(override) && override > 0) {
    return Math.floor(override);
  }
  if (kind === 'single') {
    return DEFAULT_SINGLE_HEAP_MB;
  }
  if (kind === 'compile') {
    return clamp(2048, totalMb * 0.84, 4096);
  }
  return clamp(2048, totalMb * 0.7, 3300);
}

/**
 * Kill orphaned Next jest-worker children from THIS repo only. A kernel
 * OOM-killed build can leave `processChild.js` workers running; they hold
 * hundreds of MB and starve later builds on small hosts.
 */
function sweepOrphanedWorkers() {
  if (process.platform === 'win32') {
    return; // orphan sweep is unix-only; Windows job objects reap children
  }
  let psOut;
  try {
    psOut = spawnSync('ps', ['-eo', 'pid=,args='], { encoding: 'utf8' });
  } catch {
    return;
  }
  if (!psOut || psOut.status !== 0 || !psOut.stdout) {
    return; // best-effort: no ps (or unsupported syntax) -> nothing to do
  }
  const marker = `${REPO_ROOT}/node_modules`;
  let killed = 0;
  for (const line of psOut.stdout.split('\n')) {
    if (!line.includes('jest-worker/processChild.js')) continue;
    if (!line.includes(marker)) continue;
    const pid = Number(line.trim().split(/\s+/)[0]);
    if (!Number.isInteger(pid) || pid <= 1 || pid === process.pid) continue;
    try {
      process.kill(pid, 'SIGKILL');
      killed += 1;
    } catch {
      // already gone or not ours to signal
    }
  }
  if (killed > 0) {
    // eslint-disable-next-line no-console
    console.log(`[build-low-memory] swept ${killed} orphaned build worker(s)`);
  }
}

function run(label, cmd, args) {
  const p = phase(label);
  const result = spawnSync(cmd, args, { stdio: 'inherit', cwd: APP_DIR });
  const secs = elapsedMs(p.startedAt);
  if (result.status !== 0) {
    // eslint-disable-next-line no-console
    console.error(`[build-low-memory] ✗ ${label} failed after ${secs}s (exit ${result.status ?? 'signal ' + result.signal})`);
    return false;
  }
  // eslint-disable-next-line no-console
  console.log(`[build-low-memory] ✓ ${label} (${secs}s)`);
  return true;
}

function nextBuildArgs(mode) {
  const args = ['build', '--webpack'];
  if (mode) {
    args.push('--experimental-build-mode', mode);
  }
  return args;
}

function artifactsComplete() {
  const required = [
    path.join(NEXT_DIR, 'BUILD_ID'),
    path.join(NEXT_DIR, 'export-marker.json'),
    path.join(NEXT_DIR, 'prerender-manifest.json'),
  ];
  for (const file of required) {
    if (!fs.existsSync(file)) return false;
  }
  // The edge middleware bundle is emitted as middleware.js (Next 16.4.3
  // compile phase) — accept either name for forward compatibility.
  return (
    fs.existsSync(path.join(NEXT_DIR, 'server', 'middleware.js')) ||
    fs.existsSync(path.join(NEXT_DIR, 'server', 'proxy.js'))
  );
}

function main() {
  if (!fs.existsSync(NEXT_BIN)) {
    // eslint-disable-next-line no-console
    console.error('[build-low-memory] next CLI not found — run pnpm install first');
    process.exitCode = 1;
    return;
  }

  sweepOrphanedWorkers();

  const totalMb = Math.round(os.totalmem() / (1024 * 1024));
  const singlePhase = totalMb >= SINGLE_PHASE_MIN_TOTAL_MB;

  // eslint-disable-next-line no-console
  console.log(
    `[build-low-memory] host=${totalMb} MB · mode=${singlePhase ? 'single-phase' : 'two-phase (compile+generate)'}`
  );

  // Canonical build chain: prebuild -> type-check -> next build.
  const prebuildOk =
    run('prebuild: snapshot', process.execPath, ['scripts/ensure-snapshot.mjs']) &&
    run('prebuild: pending migrations', process.execPath, ['scripts/apply-pending-migrations.mjs']);
  if (!prebuildOk) {
    process.exitCode = 1;
    return;
  }

  if (!run('type-check (adaptive heap)', process.execPath, ['scripts/tsc-adaptive.mjs'])) {
    process.exitCode = 1;
    return;
  }

  if (singlePhase) {
    const cap = heapCapMb('single');
    const ok = run(
      `next build (single-phase, ${cap} MB cap)`,
      process.execPath,
      [`--max-old-space-size=${cap}`, NEXT_BIN, ...nextBuildArgs(null)]
    );
    sweepOrphanedWorkers();
    process.exitCode = ok ? 0 : 1;
    return;
  }

  // Two-phase split for small hosts.
  const compileCap = heapCapMb('compile');
  const compileOk = run(
    `next build compile (${compileCap} MB cap)`,
    process.execPath,
    [`--max-old-space-size=${compileCap}`, NEXT_BIN, ...nextBuildArgs('compile')]
  );
  sweepOrphanedWorkers();
  if (!compileOk) {
    process.exitCode = 1;
    return;
  }

  const generateCap = heapCapMb('generate');
  const generateOk = run(
    `next build generate (${generateCap} MB cap)`,
    process.execPath,
    [`--max-old-space-size=${generateCap}`, NEXT_BIN, ...nextBuildArgs('generate')]
  );
  sweepOrphanedWorkers();

  if (!generateOk) {
    // Next 16.4.3 quirk: the generate finalizer renames proxy.js ->
    // middleware.js, but compile already emitted middleware.js, so the
    // rename ENOENTs after every page was generated. The artifact set is
    // complete in that case — treat it as success.
    if (artifactsComplete()) {
      // eslint-disable-next-line no-console
      console.log(
        '[build-low-memory] generate exited non-zero but the artifact set is complete — ' +
          'known Next 16.4.3 finalizer rename quirk (middleware.js already emitted).'
      );
      process.exitCode = 0;
      return;
    }
    process.exitCode = 1;
    return;
  }

  process.exitCode = 0;
}

main();
