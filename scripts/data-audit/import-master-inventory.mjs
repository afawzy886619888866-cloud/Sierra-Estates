#!/usr/bin/env node
/**
 * scripts/data-audit/import-master-inventory.mjs — Sierra Blu Phase 2 importer
 * ────────────────────────────────────────────────────────────────────────────
 * Consumes the Phase-1 canonical CSV (data/MASTER_INVENTORY_V1.csv — NEVER the
 * raw XLSX/TSVs) and upserts the canonical units into public.listings.
 *
 * Pipeline: PARSE CSV -> VALIDATE -> MAP -> (dry-run | upsert) -> REPORT
 *
 * Safety rules (Master Execution Command):
 *   1. Only non-DUPLICATE rows are imported (DUPLICATE rows stay in the CSV as
 *      the audit trail — they are never written).
 *   2. Every imported row lands as status='draft', verified=false,
 *      publish_to_client=false — the public RLS policy (status='active')
 *      guarantees unverified inventory can NEVER reach a client.
 *   3. Idempotent: conflict key is ref_id (= unit_id). Re-runs update in place,
 *      never duplicate.
 *   4. Every run writes an import report with full reconciliation
 *      (seen = duplicated + valid + invalid; valid = inserted + updated + rejected).
 *
 * Column modes:
 *   --columns full (default) base columns + 011 (data_quality_score, stale) +
 *              013 (source_verified_at, availability, publish_status).
 *              Requires supabase/migrations/20260924_011 + 20260929_013 applied.
 *   --columns base  schema.sql baseline only (freshness/publishability data
 *              still preserved inside raw_data JSONB).
 *
 * Flags:
 *   --write        perform the DB upsert (default is dry-run)
 *   --csv <path>   input CSV (default data/MASTER_INVENTORY_V1.csv)
 *   --batch <n>    upsert batch size (default 250)
 *   --limit <n>    debug: import at most n rows
 *   --columns mode  base | full (default full)
 *   --json         also dump the machine-readable report (.json)
 *
 * Env (same resolution order as sync-all-to-supabase-and-map.mjs):
 *   NEXT_PUBLIC_SUPABASE_URL | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_CSV = path.join(ROOT, 'data', 'MASTER_INVENTORY_V1.csv');
const REPORTS_DIR = path.join(ROOT, 'data', 'reports');
const PIPELINE_VERSION = 'phase1-v1.1+phase2-v1';

// ─── CLI ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name, fallback = undefined) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};
const OPTS = {
  write: argv.includes('--write'),
  csv: path.resolve(String(flag('csv', DEFAULT_CSV))),
  batch: Math.max(10, parseInt(String(flag('batch', '250')), 10) || 250),
  limit: parseInt(String(flag('limit', '0')), 10) || 0,
  columns: String(flag('columns', 'full')) === 'base' ? 'base' : 'full',
  json: argv.includes('--json'),
};

// ─── env (identical to the legacy importer) ─────────────────────────────────
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const envPath = path.join(ROOT, file);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

// ─── RFC4180 CSV parser (quoted fields, embedded commas/newlines) ───────────
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); if (row.length > 1 || row[0] !== '') rows.push(row); }
  const [header, ...data] = rows;
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

// ─── field helpers ──────────────────────────────────────────────────────────
const num = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};
const int = (v) => {
  const n = num(v);
  return n === null ? null : Math.trunc(n);
};
const str = (v) => (v === undefined || v === null ? null : String(v).trim() || null);
const FINISHING = new Set(['fully_finished', 'semi_finished', 'core_shell']);

function mapRecord(r, columnsMode) {
  const dealType = ['sale', 'rent'].includes(r.deal_type) ? r.deal_type : null;
  if (!dealType) return { error: `unsupported deal_type '${r.deal_type}'` };

  const compound = str(r.compound) || str(r.district) || 'New Cairo';
  const district = str(r.district) || compound;
  const ptype = str(r.property_type) || 'Unknown';
  const price = num(r.price);
  const beds = int(r.bedrooms), baths = int(r.bathrooms), area = num(r.area_sqm);
  const lat = num(r.latitude), lng = num(r.longitude);
  const quality = int(r.quality_score);
  const ob = str(r.owner_or_broker) || 'UNKNOWN';
  const isOwner = ob === 'OWNER_DIRECT';
  const isBroker = ob === 'BROKER' || ob === 'PARTNER';
  const contactName = str(r.contact_name);
  const phone = str(r.phone);
  const photos = (str(r.photos) || '').split(',').map((p) => p.trim()).filter(Boolean);

  // Freshness: the source's last evidence date (NOT staff verification).
  const lva = str(r.last_verified_at);
  const sourceVerifiedAt = lva ? new Date(`${lva}T00:00:00Z`).toISOString() : null;

  const raw = {
    pipeline: PIPELINE_VERSION,
    source_file: path.basename(OPTS.csv),
    unit_id: str(r.unit_id),
    deal_subtype: str(r.deal_subtype),
    price_validity: str(r.price_validity),
    price_fix_applied: str(r.price_fix_applied) || null,
    usd_suspected: r.usd_suspected === 'True',
    phone_state: str(r.phone_state),
    whatsapp: str(r.whatsapp),
    freshness: str(r.freshness),
    view: str(r.view), floor: str(r.floor),
    district, area: str(r.area),
    notes: str(r.notes),
    compound_unresolved: !str(r.compound),
    imported_at: new Date().toISOString(),
  };

  const rec = {
    // identity — conflict key is unit_id (globally unique after the Phase-2 fix)
    ref_id: str(r.unit_id),
    reference_code: str(r.unit_id),
    code: str(r.public_code) || str(r.unit_id),
    title: `${ptype} in ${compound} (${dealType.toUpperCase()})`,
    compound,
    location_area: district,
    city: 'Cairo',
    property_type: ptype,
    deal_type: dealType,
    price: price ?? 0,
    price_currency: str(r.currency) || 'EGP',
    bedrooms: beds ?? 0,
    bathrooms: baths ?? 0,
    area_sqm: area ?? 0,
    finishing_type: FINISHING.has(str(r.finishing)) ? str(r.finishing) : null,
    // publication gate — see safety rule 2
    status: 'draft',
    verified: false,
    publish_to_client: false,
    tag: ob,
    owner_type: isOwner ? 'Owner' : ob === 'PARTNER' ? 'Partner' : isBroker ? 'Broker' : null,
    owner_name: isOwner ? contactName : null,
    owner_phone: isOwner ? phone : null,
    broker_name: isBroker ? contactName : null,
    broker_phone: isBroker ? phone : null,
    source_channel: ob,
    sync_source: str(r.source) || 'master_inventory_v1',
    latitude: lat,
    longitude: lng,
    photos,
    dupe_check_hash: str(r.fingerprint),
    raw_data: raw,
    updated_at: new Date().toISOString(),
  };

  if (columnsMode === 'full') {
    rec.data_quality_score = quality ?? 0;                       // 011
    rec.stale = ['Stale', 'Verification Required'].includes(r.freshness); // 011
    rec.source_verified_at = sourceVerifiedAt;                  // 013
    rec.availability = str(r.availability) || 'unknown';        // 013
    rec.publish_status = str(r.publish_status);                  // 013
  }
  return { rec };
}

// ─── report ─────────────────────────────────────────────────────────────────
function writeReport(report) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const md = [
    `# IMPORT REPORT — Master Inventory V1`,
    ``,
    `| Field | Value |`,
    `|---|---|`,
    `| Generated at | ${report.generatedAt} |`,
    `| Mode | ${report.dryRun ? 'DRY RUN (no DB writes)' : 'LIVE WRITE'} |`,
    `| Column mode | ${report.columnsMode} |`,
    `| Source CSV | ${report.sourceCsv} |`,
    `| Pipeline | ${PIPELINE_VERSION} |`,
    ``,
    `## Reconciliation`,
    ``,
    `| Metric | Count |`,
    `|---|---|`,
    `| records_seen | ${report.records_seen} |`,
    `| records_duplicated (excluded) | ${report.records_duplicated} |`,
    `| records_valid | ${report.records_valid} |`,
    `| records_invalid (rejected) | ${report.records_invalid} |`,
    `| records_inserted | ${report.records_inserted ?? 'n/a (dry-run, no DB access)'} |`,
    `| records_updated | ${report.records_updated ?? 'n/a (dry-run, no DB access)'} |`,
    `| records_rejected (DB errors) | ${report.records_rejected} |`,
    ``,
    `**Checks**`,
    `- seen == duplicated + valid + invalid : ${report.checks.balance ? 'PASS' : 'FAIL'} (${report.records_seen} = ${report.records_duplicated} + ${report.records_valid} + ${report.records_invalid})`,
    `- valid == inserted + updated + rejected : ${
      report.checks.validSplit === null ? 'N/A (dry-run without DB access — inserted/updated unknown)'
      : report.checks.validSplit ? 'PASS' : 'FAIL'} (${report.records_valid} = ${report.records_inserted ?? '?'} + ${report.records_updated ?? '?'} + ${report.records_rejected})`,
    ``,
    `## Invalid-row reasons`,
    ``,
    ...Object.entries(report.invalidReasons).map(([k, v]) => `- ${k}: ${v}`),
    ``,
    `## Imported population (valid rows)`,
    ``,
    `| Dimension | Breakdown |`,
    `|---|---|`,
    ...Object.entries(report.breakdowns).map(([k, v]) => `| ${k} | ${JSON.stringify(v)} |`),
  ].join('\n');
  const base = path.join(REPORTS_DIR, `IMPORT_REPORT_${stamp}`);
  fs.writeFileSync(`${base}.md`, md, 'utf8');
  if (OPTS.json) fs.writeFileSync(`${base}.json`, JSON.stringify(report, null, 2), 'utf8');
  return `${base}.md`;
}

// ─── main ───────────────────────────────────────────────────────────────────
async function main() {
  loadEnv();
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  SIERRA BLU — PHASE 2 MASTER INVENTORY IMPORT');
  console.log(`  mode=${OPTS.write ? 'WRITE' : 'DRY-RUN'} columns=${OPTS.columns} csv=${path.relative(ROOT, OPTS.csv)}`);
  console.log('════════════════════════════════════════════════════════════════\n');

  if (!fs.existsSync(OPTS.csv)) throw new Error(`CSV not found: ${OPTS.csv}`);
  const rows = parseCsv(fs.readFileSync(OPTS.csv, 'utf8'));
  console.log(`Parsed ${rows.length} CSV rows`);
  if (OPTS.limit > 0) rows.length = Math.min(rows.length, OPTS.limit);

  const invalidReasons = {};
  const valid = [];
  const seenUnitIds = new Set();
  let duplicated = 0;
  let invalid = 0;

  for (const r of rows) {
    if (r.publish_status === 'DUPLICATE') { duplicated++; continue; }
    const uid = str(r.unit_id);
    if (!uid) { invalid++; invalidReasons['missing unit_id'] = (invalidReasons['missing unit_id'] || 0) + 1; continue; }
    if (seenUnitIds.has(uid)) { invalid++; invalidReasons[`duplicate unit_id in file: ${uid}`] = (invalidReasons[`duplicate unit_id in file: ${uid}`] || 0) + 1; continue; }
    seenUnitIds.add(uid);
    const { rec, error } = mapRecord(r, OPTS.columns);
    if (error || !rec) { invalid++; invalidReasons[error || 'unmappable'] = (invalidReasons[error || 'unmappable'] || 0) + 1; continue; }
    valid.push(rec);
  }
  console.log(`Validation: ${valid.length} valid | ${duplicated} duplicates excluded | ${invalid} invalid`);

  // breakdowns of the importable population
  const breakdown = (key) => valid.reduce((acc, v) => {
    const k = key === 'status' ? v.status : (v.raw_data[key] ?? v[key] ?? 'null');
    acc[k] = (acc[k] || 0) + 1; return acc;
  }, {});
  const breakdowns = {
    deal_type: breakdown('deal_type'),
    owner_type: breakdown('owner_type'),
    publish_status: breakdown('publish_status'),
    price_state: breakdown('price_validity'),
  };

  // ─── DB stage ─────────────────────────────────────────────────────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let inserted = null, updated = null, rejected = 0;

  if (!OPTS.write) {
    console.log('\nDRY RUN — no database writes performed.');
    if (url && key) {
      // classify projected inserts/updates even in dry-run when creds exist
      const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const existing = new Set();
      const ids = valid.map((v) => v.ref_id);
      for (let i = 0; i < ids.length; i += 5000) {
        const { data, error } = await supabase.from('listings').select('ref_id').in('ref_id', ids.slice(i, i + 5000));
        if (error) throw new Error(`existing-ref_id probe failed: ${error.message}`);
        for (const d of data || []) existing.add(d.ref_id);
      }
      inserted = valid.filter((v) => !existing.has(v.ref_id)).length;
      updated = valid.length - inserted;
      console.log(`Projected: ${inserted} inserts + ${updated} updates (existing ref_ids probed)`);
    } else {
      console.log('No Supabase credentials found — inserted/updated classification unavailable.');
    }
  } else {
    if (!(url && key)) throw new Error('--write requires NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const ids = valid.map((v) => v.ref_id);
    const existing = new Set();
    for (let i = 0; i < ids.length; i += 5000) {
      const { data, error } = await supabase.from('listings').select('ref_id').in('ref_id', ids.slice(i, i + 5000));
      if (error) throw new Error(`existing-ref_id probe failed: ${error.message}`);
      for (const d of data || []) existing.add(d.ref_id);
    }
    inserted = 0; updated = 0;
    for (let i = 0; i < valid.length; i += OPTS.batch) {
      const chunk = valid.slice(i, i + OPTS.batch);
      const { error } = await supabase.from('listings').upsert(chunk, { onConflict: 'ref_id' });
      if (error) {
        if (/PGRST204|column .* does not exist/i.test(error.message)) {
          throw new Error(
            `Column drift detected (batch ${Math.floor(i / OPTS.batch) + 1}): ${error.message}\n` +
            `→ apply supabase/migrations/20260924_011_inventory_os_v2.sql + 20260929_013_master_inventory_activation.sql first,\n` +
            `  or re-run with --columns=base`);
        }
        rejected += chunk.length;
        console.error(`Batch ${Math.floor(i / OPTS.batch) + 1} failed: ${error.message}`);
        continue;
      }
      for (const c of chunk) (existing.has(c.ref_id) ? updated++ : inserted++);
      if ((i / OPTS.batch) % 8 === 0 || i + OPTS.batch >= valid.length) {
        console.log(`  ⚡ ${Math.min(i + OPTS.batch, valid.length)}/${valid.length} upserted`);
      }
    }
    console.log(`Wrote: ${inserted} inserted + ${updated} updated + ${rejected} rejected`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: !OPTS.write,
    columnsMode: OPTS.columns,
    sourceCsv: path.relative(ROOT, OPTS.csv),
    pipeline: PIPELINE_VERSION,
    records_seen: rows.length,
    records_duplicated: duplicated,
    records_valid: valid.length,
    records_invalid: invalid,
    records_inserted: inserted,
    records_updated: updated,
    records_rejected: rejected,
    invalidReasons,
    breakdowns,
    checks: {
      balance: rows.length === duplicated + valid.length + invalid,
      validSplit: inserted === null || updated === null ? null : valid.length === inserted + updated + rejected,
    },
  };
  const reportPath = writeReport(report);
  console.log(`\nReport written: ${reportPath}`);

  if (report.checks.balance === false) {
    console.error('RECONCILIATION FAILED: seen != duplicated + valid + invalid');
    process.exitCode = 1;
  } else if (report.checks.validSplit === false) {
    console.error('RECONCILIATION FAILED: valid != inserted + updated + rejected');
    process.exitCode = 1;
  } else {
    console.log('RECONCILIATION PASSED ✓');
  }
}

main().catch((err) => {
  console.error(`❌ Import failed: ${err.message}`);
  process.exitCode = 1;
});
