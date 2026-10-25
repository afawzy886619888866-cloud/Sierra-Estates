#!/usr/bin/env node
/**
 * Adaptive TypeScript heap sizing.
 *
 * `tsc --noEmit` on this app needs more than the Node default heap on large
 * projects, but a hardcoded `--max-old-space-size=4096` gets the process
 * kernel-OOM-killed on smaller hosts (e.g. 4 GB CI runners / sandboxed
 * environments) because the cap can exceed physical memory. This wrapper
 * picks the largest heap cap that fits the host instead of a fixed number:
 *
 *   - default cap: 4096 MB (previous behavior, kept on hosts that afford it)
 *   - on smaller hosts: totalMem * 0.82, clamped to [2048, 4096] MB
 *   - override: TSC_MAX_OLD_SPACE=<MB> forces a specific cap
 *
 * Usage (from package.json):
 *   "type-check": "node scripts/ensure-snapshot.mjs && node scripts/tsc-adaptive.mjs"
 */
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DEFAULT_CAP_MB = 4096;
const MIN_HEAP_MB = 2048;

function resolveHeapCapMb() {
  const override = Number(process.env.TSC_MAX_OLD_SPACE);
  if (Number.isFinite(override) && override > 0) {
    return Math.floor(override);
  }
  const totalMb = os.totalmem() / (1024 * 1024);
  const fitted = Math.floor(totalMb * 0.82);
  return Math.max(MIN_HEAP_MB, Math.min(DEFAULT_CAP_MB, fitted));
}

const heapCapMb = resolveHeapCapMb();
const here = path.dirname(fileURLToPath(import.meta.url));
const tscEntry = path.resolve(here, '../node_modules/typescript/bin/tsc');

const args = [
  `--max-old-space-size=${heapCapMb}`,
  tscEntry,
  '--noEmit',
  ...process.argv.slice(2),
];

if (process.env.SE_TSC_VERBOSE === '1') {
  // eslint-disable-next-line no-console
  console.log(`[tsc-adaptive] heap cap = ${heapCapMb} MB (totalmem=${Math.round(os.totalmem() / 1024 / 1024)} MB)`);
}

const child = spawn(process.execPath, args, { stdio: 'inherit' });
child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
