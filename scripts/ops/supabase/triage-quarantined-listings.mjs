#!/usr/bin/env node
/**
 * scripts/ops/supabase/triage-quarantined-listings.mjs
 *
 * Surgical CLI for reviewing listings quarantined by the Master-Inventory
 * publishability cascade (publish_status = 'REVIEW_REQUIRED').
 *
 *   · List them in a terminal table (default, dry-run safe)
 *   · --approve <id>            publish_status → 'PUBLISHABLE' + status → 'active'
 *   · --update-price <id> <new> price → newPrice
 *   · --delete <id>             remove the listing row
 *   · --apply                   actually commit mutations (WITHOUT it everything is a dry run)
 *
 * NOTE on --approve: the brief said 'PUBLISHED', but the publishability
 * cascade (supabase/migrations/20260929_013) and the public publish gate
 * (20261002_020: "publish_status = 'PUBLISHABLE'") only ever surface
 * PUBLISHABLE rows — 'PUBLISHED' is not a value anywhere in the schema, so
 * approving with it would leave listings invisible to the public. This tool
 * therefore writes PUBLISHABLE + status='active', mirroring
 * scripts/promote-master-inventory-to-publishable.mjs.
 *
 * Privacy lock: owner/broker phone numbers are deliberately NOT selected or
 * displayed by this tool (confidential contacts go to 01092048333 only).
 *
 * Env contract (same as scripts/promote-master-inventory-to-publishable.mjs):
 *   SUPABASE_SERVICE_ROLE_KEY      required for live queries
 *   NEXT_PUBLIC_SUPABASE_URL      optional, defaults to the production project
 *
 * Offline contract check (no credentials needed):  node triage-quarantined-listings.mjs --selftest
 *
 * Examples:
 *   node scripts/ops/supabase/triage-quarantined-listings.mjs                  # dry-run table
 *   node scripts/ops/supabase/triage-quarantined-listings.mjs --limit 25
 *   node scripts/ops/supabase/triage-quarantined-listings.mjs --approve abc123 --apply
 *   node scripts/ops/supabase/triage-quarantined-listings.mjs --update-price abc123 45000 --apply
 *   node scripts/ops/supabase/triage-quarantined-listings.mjs --delete abc123 --apply
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
for (const envFile of ['.env.local', '.env', 'workflows/.env']) {
  const p = path.join(ROOT, envFile);
  if (fs.existsSync(p)) dotenv.config({ path: p });
}

const URL_DEFAULT = 'https://gaxfqcietzoonlmatiot.supabase.co';
const DEFAULT_STATUS = 'REVIEW_REQUIRED';
const DISPLAY_COLUMNS = 'id, title, unit_code, price, deal_type, compound, property_type, status, updated_at';

// ── CLI parsing ─────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    approve: [],          // [{id}]
    updatePrice: [],      // [{id, price}]
    delete: [],           // [{id}]
    apply: false,
    limit: 50,
    status: DEFAULT_STATUS,
    help: false,
    selftest: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--approve':
        args.approve.push({ id: requireValue(argv, ++i, a) });
        break;
      case '--update-price': {
        const id = requireValue(argv, ++i, a);
        const price = requireValue(argv, ++i, a);
        args.updatePrice.push({ id, price });
        break;
      }
      case '--delete':
        args.delete.push({ id: requireValue(argv, ++i, a) });
        break;
      case '--apply':
        args.apply = true;
        break;
      case '--limit': {
        const n = Number(requireValue(argv, ++i, a));
        if (!Number.isInteger(n) || n <= 0) throw new Error(`--limit must be a positive integer (got "${n}")`);
        args.limit = n;
        break;
      }
      case '--status':
        args.status = requireValue(argv, ++i, a).toUpperCase();
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      case '--selftest':
        args.selftest = true;
        break;
      default:
        throw new Error(`Unknown argument "${a}" (see --help)`);
    }
  }
  return args;
}

function requireValue(argv, index, flag) {
  const v = argv[index];
  if (v === undefined || v.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return v;
}

function printHelp() {
  console.log(`
triage-quarantined-listings — review & resolve publish_status='REVIEW_REQUIRED' listings

USAGE
  node scripts/ops/supabase/triage-quarantined-listings.mjs [flags]

FLAGS
  (none)                          List quarantined listings (dry-run, safe)
  --limit <n>                     Max rows to list (default 50)
  --status <VALUE>                publish_status to triage (default REVIEW_REQUIRED)
  --approve <id>                  Queue approve: publish_status→'PUBLISHABLE', status→'active'
  --update-price <id> <newPrice>  Queue price update for listing <id>
  --delete <id>                   Queue deletion of listing <id>
  --apply                         Commit all queued mutations (omit = dry run)
  --selftest                      Offline contract check (no credentials needed)
  --help                          This help

MUTATIONS ARE DRY-RUN BY DEFAULT — add --apply to commit.`);
}

// ── Table rendering (dependency-free) ───────────────────────────────────────

function trunc(s, width) {
  const str = String(s ?? '');
  return str.length <= width ? str : `${str.slice(0, Math.max(0, width - 1))}…`;
}

function renderTable(rows, { maxWidth = 110 } = {}) {
  // Column budget: id 36 (uuid), title flexible, unit_code 12, price 12, deal 6, compound 20
  const fixed = [
    { key: 'idx', label: '#', align: 'end', width: 4 },
    { key: 'id', label: 'id', align: 'start', width: 13 },
    { key: 'unit_code', label: 'unit_code', align: 'start', width: 12 },
    { key: 'price', label: 'price', align: 'end', width: 12 },
    { key: 'deal_type', label: 'deal', align: 'start', width: 6 },
    { key: 'compound', label: 'compound', align: 'start', width: 20 },
  ];
  const usedFixed = fixed.reduce((n, c) => n + c.width + 3, 0) + 3;
  const titleWidth = Math.max(10, Math.min(34, maxWidth - usedFixed));
  const cols = [
    fixed[0],
    fixed[1],
    { key: 'title', label: 'title', align: 'start', width: titleWidth },
    ...fixed.slice(2),
  ];

  const line = '─'.repeat(Math.min(maxWidth, usedFixed + titleWidth));
  const cell = (col, row) =>
    col.align === 'end'
      ? String(row[col.key] ?? '').padStart(col.width).slice(-col.width)
      : trunc(row[col.key], col.width).padEnd(col.width);

  const header = cols.map((c) => trunc(c.label, c.width).padEnd(c.width)).join(' │ ');
  console.log(line);
  console.log(header);
  console.log(line);
  for (const [i, row] of rows.entries()) {
    console.log(cols.map((c) => cell(c, { ...row, idx: i + 1 })).join(' │ '));
  }
  console.log(line);
}

function priceDisplay(p) {
  if (p === null || p === undefined || p === '') return '—';
  const n = Number(p);
  if (!Number.isFinite(n)) return String(p);
  return n.toLocaleString('en-EG');
}

function toDisplayRows(listings) {
  return listings.map((l) => ({
    id: String(l.id ?? '').slice(0, 13),
    title: l.title || (l.property_type ? `${l.property_type} — ${l.compound || ''}` : '—'),
    unit_code: l.unit_code || l.code || '—',
    price: priceDisplay(l.price),
    deal_type: (l.deal_type || '—').replace(/^(RENT|SALE)_?.*/i, (m) => m.slice(0, 6)).toUpperCase(),
    compound: l.compound || '—',
  }));
}

// ── Offline contract check (no credentials, no network) ─────────────────────

function selftest() {
  const fixture = [
    { id: 'f3b1c2d4-0000-1111-2222-333344445555', title: 'Standalone Villa Fifth Settlement', unit_code: 'SE-1042', price: 4800000, deal_type: 'SALE', compound: 'Mountain View iCity', property_type: 'Villa' },
    { id: 'a1b2c3d4-0000-1111-2222-333344445555', title: '', unit_code: null, price: 22500, deal_type: 'RENT_MONTHLY', compound: 'CAIRO_GATE', property_type: 'Apartment' },
  ];
  console.log('── selftest: CLI parsing ──');
  const parsed = parseArgs(['--approve', 'id-1', '--update-price', 'id-2', '45000', '--delete', 'id-3', '--apply', '--limit', '10']);
  const okParse =
    parsed.approve[0].id === 'id-1' &&
    parsed.updatePrice[0].id === 'id-2' && parsed.updatePrice[0].price === '45000' &&
    parsed.delete[0].id === 'id-3' && parsed.apply === true && parsed.limit === 10;
  console.log(`  flag parsing (approve/update-price/delete/apply/limit): ${okParse ? 'PASS' : 'FAIL'}`);
  let threw = false;
  try { parseArgs(['--approve']); } catch { threw = true; }
  console.log(`  missing value rejected:                                  ${threw ? 'PASS' : 'FAIL'}`);

  console.log('── selftest: table rendering (fixture rows, dry-run view) ──');
  renderTable(toDisplayRows(fixture));
  console.log('── selftest: privacy lock — owner phone never rendered ──');
  const leak = JSON.stringify(toDisplayRows([{ ...fixture[0], owner_phone: '01000000000' }]));
  console.log(`  owner_phone absent from output:                          ${!leak.includes('01000000000') ? 'PASS' : 'FAIL'}`);

  const allPass = okParse && threw && !leak.includes('01000000000');
  console.log(`\nselftest: ${allPass ? 'ALL CHECKS PASS' : 'FAILURES PRESENT'}`);
  return allPass ? 0 : 1;
}

// ── Live mode ───────────────────────────────────────────────────────────────

async function liveMain(args) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || URL_DEFAULT;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY — set it in .env.local (never commit it).');
    console.error('   (Offline contract check available: --selftest)');
    return 1;
  }
  const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1. Query quarantined listings (privacy-safe columns only).
  const { data: listings, error } = await sb
    .from('listings')
    .select(DISPLAY_COLUMNS)
    .eq('publish_status', args.status)
    .order('updated_at', { ascending: false })
    .limit(args.limit);
  if (error) throw new Error(`Query failed: ${error.message}`);

  console.log(`\n publish_status = '${args.status}' — ${listings.length} row(s)${args.apply ? ' · APPLY MODE' : ' · DRY RUN (add --apply to commit mutations)'}\n`);
  if (listings.length === 0) {
    console.log('Nothing to triage — queue is empty. 🎉');
  } else {
    renderTable(toDisplayRows(listings));
  }

  // 2. Execute queued mutations (only under --apply).
  const mutations = [
    ...args.approve.map((m) => ({ kind: 'approve', ...m })),
    ...args.updatePrice.map((m) => ({ kind: 'update-price', ...m })),
    ...args.delete.map((m) => ({ kind: 'delete', ...m })),
  ];
  if (mutations.length === 0) return 0;

  if (!args.apply) {
    for (const m of mutations) {
      if (m.kind === 'approve') console.log(`[dry-run] would approve ${m.id}: publish_status→'PUBLISHABLE', status→'active'`);
      if (m.kind === 'update-price') console.log(`[dry-run] would update price of ${m.id} → ${m.price}`);
      if (m.kind === 'delete') console.log(`[dry-run] would DELETE listing ${m.id}`);
    }
    console.log('\nDRY RUN complete — re-run with --apply to commit.');
    return 0;
  }

  let failures = 0;
  for (const m of mutations) {
    let result;
    if (m.kind === 'approve') {
      result = await sb.from('listings').update({ publish_status: 'PUBLISHABLE', status: 'active' }).eq('id', m.id);
    } else if (m.kind === 'update-price') {
      const price = Number(String(m.price).replace(/[^\d.]/g, ''));
      if (!Number.isFinite(price) || price <= 0) {
        console.error(`✗ update-price ${m.id}: invalid price "${m.price}"`);
        failures++;
        continue;
      }
      result = await sb.from('listings').update({ price }).eq('id', m.id);
    } else {
      result = await sb.from('listings').delete().eq('id', m.id);
    }
    if (result.error) {
      console.error(`✗ ${m.kind} ${m.id}: ${result.error.message}`);
      failures++;
    } else {
      console.log(`✓ ${m.kind} ${m.id} committed`);
    }
  }
  console.log(`\n${mutations.length - failures}/${mutations.length} mutation(s) committed${failures ? ` — ${failures} FAILED` : ''}.`);
  return failures ? 1 : 0;
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return 0;
  }
  if (args.selftest) {
    return selftest();
  }
  return liveMain(args);
}

// Run directly (not under --selftest import in tests).
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    },
  );
}
