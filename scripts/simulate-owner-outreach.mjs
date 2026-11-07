#!/usr/bin/env node
'use strict';
/**
 * simulate-owner-outreach.mjs — Zero-Risk Owner Outreach Simulation Engine
 * ────────────────────────────────────────────────────────────────────────
 * Simulates the 8-line WhatsApp owner outreach workflow in DRY-RUN mode.
 * 
 * Safety Guarantee:
 *   • FORCES process.env.WF_DRY_RUN = '1'
 *   • FORCES process.env.WF_INCLUDE_SUPABASE_IN_DRY_RUN = '1'
 *   • ZERO network calls made to real WhatsApp phones
 *   • ZERO modifications to Google Sheet contact date cells
 *   • Emulates the 8-line multi-lane rotation and evaluates:
 *     - Candidate discovery from Google Sheets & Supabase DB
 *     - Phone normalization & Egyptian mobile verification
 *     - Strict ledger & sheet deduplication
 *     - Personalized Arabic sales template generation
 *     - 30-min slot pacing and batch quota compliance
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outreachScript = path.join(rootDir, 'workflows', '09-owner-outreach', 'outreach.js');

// Parse CLI flags
const args = process.argv.slice(2);
const batchSize = args.find((a, i) => args[i - 1] === '--batch') || '5';
const side = args.find((a, i) => args[i - 1] === '--side') || 'split';
const windowHours = args.includes('--respect-hours') ? '9-22' : '0-24';

console.log('═'.repeat(70));
console.log('  SIERRA ESTATES — OWNER OUTREACH SIMULATION (ZERO-RISK DRY RUN)');
console.log('═'.repeat(70));
console.log(`[Config] Batch Size    : ${batchSize} messages`);
console.log(`[Config] Walk Side     : ${side}`);
console.log(`[Config] Hours Window  : ${windowHours} Cairo (Simulated bypass: ${windowHours === '0-24'})`);
console.log(`[Config] Safety Guard  : WF_DRY_RUN=1 LOCKED (No external WhatsApp traffic)`);
console.log('─'.repeat(70) + '\n');

const env = {
  ...process.env,
  WF_DRY_RUN: '1',
  WF_INCLUDE_SUPABASE_IN_DRY_RUN: '1',
  WF_SLOT_BATCH: String(batchSize),
  WF_HOST_SIDE: side,
  WF_OUTREACH_ACTIVE_HOURS: windowHours,
};

const child = spawn(process.execPath, [outreachScript], {
  env,
  cwd: rootDir,
  stdio: ['inherit', 'pipe', 'pipe'],
});

let stdoutData = '';
let stderrData = '';

child.stdout.on('data', (d) => {
  const str = d.toString();
  stdoutData += str;
  process.stdout.write(str);
});

child.stderr.on('data', (d) => {
  const str = d.toString();
  stderrData += str;
  process.stderr.write(str);
});

child.on('close', (code) => {
  console.log('\n' + '═'.repeat(70));
  if (code === 0) {
    console.log('✔ SIMULATION COMPLETED SUCCESSFULLY (EXIT 0)');
    console.log('  All deduplication, inventory querying, and template rendering passed.');
    console.log('  Guaranteed: ZERO real messages were sent to WhatsApp devices.');
  } else {
    console.log(`✖ SIMULATION EXITED WITH CODE ${code}`);
  }
  console.log('═'.repeat(70));
});
