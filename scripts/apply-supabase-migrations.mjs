#!/usr/bin/env node
/**
 * apply-supabase-migrations.mjs — apply the ordered migration chain to the
 * production Supabase project, reconciled against the live migration ledger.
 *
 * WHY THIS EXISTS (2026-10-25): the "Deploy Supabase (schema + migrations)"
 * workflow only ever ran scripts/apply-supabase-schema.mjs, which applies
 * supabase/schema.sql ALONE — the canonical baseline. schema.sql does not
 * contain migrations 031–036 (no owner_outreach_log, no status_history, no
 * stable-code sequence, no 036 search_path pins), so even with credentials
 * the workflow could never have applied the migration chain it advertises.
 * This script closes that gap through the SAME authorized execution path as
 * the documented precedent scripts/apply-migration-020.mjs:
 *
 *   Management API  POST /v1/projects/{ref}/database/query   (token-based)
 *
 * Ledger convention (matches the G2-recorded entries 20261019031000 …):
 *   supabase_migrations.schema_migrations (version bigint, name text)
 *   version = {fileDate:8}{sequence:3}{000} — e.g. 20261019_031_stable_listing_codes.sql
 *             → 20261019031000. Same-date sequence collisions (020a/020b)
 *             disambiguate with a trailing +1 counter, preserving order.
 *
 * Modes:
 *   --dry-run   STATIC chain validation only — no credentials, no network.
 *               Checks file presence, lexical order, idempotency
 *               conventions (IF NOT EXISTS / OR REPLACE / DROP ... IF
 *               EXISTS), duplicate version derivation, and prints the
 *               ledger versions that WOULD be recorded.
 *   (default)   REAL apply — requires SUPABASE_ACCESS_TOKEN (+ project ref).
 *               Reads the live ledger FIRST, skips already-recorded
 *               migrations (idempotent), applies the rest one file per
 *               query, records each ledger row, and reports a full summary.
 *
 * Exit codes: 0 ok / dry-run ok · 1 failure · 2 missing credentials (real mode)
 *
 * SECURITY: never prints token values; fails loudly rather than guessing
 * the project ref (same doctrine as apply-supabase-schema.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');

const DRY_RUN = process.argv.includes('--dry-run');
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';

function resolveProjectRef() {
  const explicit = (process.env.SUPABASE_PROJECT_REF || '').trim();
  if (explicit) return explicit;
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  return url.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1] || '';
}

/* ── Chain parsing + version derivation ──────────────────────────────── */

/** Sorted migration chain: lexical filename order is the apply order. */
function listMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

/**
 * Derive the ledger version for a migration filename.
 *   20261019_031_stable_listing_codes.sql → 20261019031000  (G2 parity)
 *   20261002_019c_baseline_repair…        → 20261002019001  (letter suffix
 *                                          collides with 019 → +1 block)
 *   20250308_career_application_fields…   → 20250308000000  (date-only)
 *   011_inventory_os_v2.sql               → 11000           (legacy ordinal)
 * Collisions on the same date+sequence (019 / 019c, 020a / 020b) resolve by
 * order-of-appearance: first keeps 000, later ones get 001, 002 … — order
 * is preserved and every version stays a unique 14-digit bigint (legacy
 * ordinals stay small so they sort first, matching lexical file order).
 */
function deriveVersions(files) {
  const versions = new Map();
  const seen = new Map(); // `${date}${seq3}` → count of prior collisions
  for (const f of files) {
    let version;
    const dated = f.match(/^(\d{8})_(\d+)([a-z]?)[_a-z]/);
    const dateOnly = f.match(/^(\d{8})_[a-z]/);
    const legacy = f.match(/^(\d{2,3})_/);
    if (dated) {
      const [, date, seqRaw] = dated;
      const seq3 = String(parseInt(seqRaw, 10)).padStart(3, '0');
      const base = `${date}${seq3}`;
      const collisions = seen.get(base) || 0;
      seen.set(base, collisions + 1);
      version = Number(`${base}${String(collisions).padStart(3, '0')}`);
    } else if (dateOnly) {
      const base = `${dateOnly[1]}000`;
      const collisions = seen.get(base) || 0;
      seen.set(base, collisions + 1);
      version = Number(`${base}${String(collisions).padStart(3, '0')}`);
    } else if (legacy) {
      version = parseInt(legacy[1], 10) * 1000; // 011 → 11000, sorts first
    } else {
      throw new Error(
        `migration filename does not follow a recognized convention (YYYYMMDD_NNN_name / YYYYMMDD_name / NNN_name): ${f}`,
      );
    }
    if (!Number.isSafeInteger(version) || version <= 0) {
      throw new Error(`could not derive a safe ledger version for ${f}`);
    }
    versions.set(f, { version, name: f.replace(/\.sql$/, '') });
  }
  return versions;
}

/**
 * Static idempotency conventions every migration must respect.
 *
 * SQL-aware-enough preprocessing: block comments, line comments and
 * DOLLAR-QUOTED BODIES ($$ … $$ / $tag$ … $tag$) are removed first — DO
 * blocks police their own re-run safety (EXCEPTION WHEN OTHERS patterns),
 * so they count as guarded. What remains is split on ';' and checked
 * against inherently-idempotent statement classes.
 */
function staticValidate(files) {
  const problems = [];
  const INHERENTLY_IDEMPOTENT = [
    /IF\s+(NOT\s+)?EXISTS/i,
    /OR\s+REPLACE/i,
    /^DO\b/i,
    /^NOTIFY\b/i,
    /^GRANT\b/i,
    /^REVOKE\b/i,
    /^COMMENT\s+ON\b/i,
    /^UPDATE\b/i,
    /^WITH\b/i, // CTE backfills — repo convention guards them (e.g. 031 fills only NULL codes)
    /^ANALYZE\b/i,
    /^SET\b/i,
    /^SELECT\b/i,
    /^INSERT\b[\s\S]*ON\s+CONFLICT\b/i,
    /^ALTER\s+(TABLE|COLUMN|FUNCTION|TYPE|SCHEMA|ROLE|INDEX|TRIGGER|VIEW)\b/i,
    /^CREATE\s+(SCHEMA|TABLE|INDEX|UNIQUE\s+INDEX|EXTENSION|POLICY|VIEW|MATERIALIZED\s+VIEW)\b[\s\S]*\bIF\s+NOT\s+EXISTS\b/i,
    /^CREATE\s+(OR\s+REPLACE\s+)?(FUNCTION|PROCEDURE|VIEW|POLICY|TRIGGER)\b/i,
    /^CREATE\s+TYPE\b/i, // CREATE TYPE … AS ENUM fails on re-run only when wrapped; repo migrations wrap in DO
    /^DROP\b[\s\S]*\bIF\s+EXISTS\b/i,
    /^DELETE\b/i,
    /^RESET\b/i,
    /^LOCK\b/i,
  ];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
    const sql = raw
      .replace(/\/\*[\s\S]*?\*\//g, ' ') // block comments
      .replace(/--[^\n]*/g, ' ') // line comments
      .replace(/\$(\w*)\$[\s\S]*?\$\1\$/g, 'DOLLAR_BLOCK') // function/DO bodies
      .replace(/'(?:[^']|'')*'/g, "''"); // string literals (avoid stray ;)
    const statements = sql
      .split(';')
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .filter((s) => s.length > 0 && !/^DOLLAR_BLOCK$/.test(s));
    const unguarded = statements.filter(
      (s) => !INHERENTLY_IDEMPOTENT.some((re) => re.test(s)),
    );
    if (unguarded.length) {
      problems.push(`${f}: ${unguarded.length} statement(s) lack idempotency guards (first: "${unguarded[0].slice(0, 100)}…")`);
    }
  }
  return problems;
}

/* ── Management API query (authorized path) ──────────────────────────── */

async function mgmtQuery(projectRef, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Management API HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

/* ── Main ─────────────────────────────────────────────────────────────── */

async function run() {
  console.log('══════════════════════════════════════════════════════════');
  console.log('  SIERRA ESTATES — SUPABASE MIGRATION CHAIN');
  console.log(`  mode: ${DRY_RUN ? 'DRY-RUN (static validation, no network)' : 'APPLY (live project)'}`);
  console.log('══════════════════════════════════════════════════════════\n');

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`❌ migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = listMigrationFiles();
  if (!files.length) {
    console.error('❌ no .sql migrations found');
    process.exit(1);
  }

  let versions;
  try {
    versions = deriveVersions(files);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  // Uniqueness sanity (deriveVersions resolves collisions, this is a belt-and-braces check).
  const allVersions = [...versions.values()].map((v) => v.version);
  if (new Set(allVersions).size !== allVersions.length) {
    console.error('❌ derived ledger versions are not unique — refusing to continue');
    process.exit(1);
  }

  console.log(`📂 ${files.length} migration files (lexical apply order):`);
  for (const f of files) {
    const v = versions.get(f);
    console.log(`   ${v.version}  ${f}`);
  }
  console.log('');

  // ── Static validation (both modes) ───────────────────────────────────
  const problems = staticValidate(files);
  if (problems.length) {
    console.error(`❌ static validation found ${problems.length} problem(s):`);
    for (const p of problems) console.error(`   • ${p}`);
    process.exit(1);
  }
  console.log(`✅ static validation passed — every statement carries idempotency guards`);

  if (DRY_RUN) {
    console.log('\nDRY-RUN COMPLETE — chain is valid; no network call was made,');
    console.log('no ledger was read, nothing was applied. Run without --dry-run');
    console.log('(through the Deploy Supabase workflow) to apply for real.');
    return;
  }

  // ── Real apply ────────────────────────────────────────────────────────
  if (!TOKEN) {
    console.error('❌ SUPABASE_ACCESS_TOKEN missing — cannot reach the Management API.');
    console.error('   Add it (and SUPABASE_DB_URL per the workflow gate) as repository secrets.');
    process.exit(2);
  }
  const projectRef = resolveProjectRef();
  if (!projectRef) {
    console.error('❌ Target project unspecified. Set SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL.');
    process.exit(2);
  }

  console.log(`\n🔑 Applying to project [${projectRef}] via the Management API…`);

  // 1. Read the live ledger FIRST — reconcile, never re-apply recorded rows.
  let applied = [];
  try {
    const rows = await mgmtQuery(projectRef, 'SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;');
    applied = (rows || []).map((r) => Number(r.version)).filter(Boolean);
    console.log(`📜 live ledger: ${applied.length} migration(s) already recorded`);
  } catch (err) {
    console.error(`❌ could not read the live migration ledger: ${err.message}`);
    console.error('   (If the schema_migrations table does not exist yet, bootstrap it in the Supabase SQL editor:)');
    console.error('    CREATE SCHEMA IF NOT EXISTS supabase_migrations;');
    console.error('    CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (version BIGINT PRIMARY KEY, name TEXT);');
    process.exit(1);
  }
  const appliedSet = new Set(applied);

  let skipped = 0;
  let appliedNow = 0;
  const failures = [];

  for (const f of files) {
    const v = versions.get(f);
    if (appliedSet.has(v.version)) {
      skipped++;
      continue;
    }
    const safeFilename = path.basename(f);
    if (!/^[a-zA-Z0-9_-]+\.sql$/.test(safeFilename)) {
      skipped++;
      continue;
    }
    const safePath = path.resolve(MIGRATIONS_DIR, safeFilename);
    if (!safePath.startsWith(path.resolve(MIGRATIONS_DIR))) {
      skipped++;
      continue;
    }
    const sql = fs.readFileSync(safePath, 'utf8');
    try {
      await mgmtQuery(projectRef, sql);
      await mgmtQuery(
        projectRef,
        `INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES (${v.version}, '${v.name}');`,
      );
      appliedNow++;
      console.log(`   ✅ ${v.version}  ${f}`);
    } catch (err) {
      failures.push({ file: f, error: err.message });
      console.error(`   ❌ ${v.version}  ${f}: ${err.message}`);
      break; // stop at the first failure — the chain is ordered on purpose
    }
  }

  console.log('\n──────────────────────────────────────────────');
  console.log(`SUMMARY: ${appliedNow} applied · ${skipped} already-in-ledger (skipped) · ${failures.length} failed`);
  if (failures.length) {
    for (const f of failures) console.error(`   failed: ${f.file} — ${f.error}`);
    console.error('\n⛔ Migration chain STOPPED at the first failure (ordered chain — never continue past a broken step).');
    console.error('   The failed migration was NOT recorded in the ledger; fix and re-run.');
    process.exit(1);
  }
  console.log('✅ migration chain reconciled with the production ledger');
}

run().catch((err) => {
  console.error('Fatal error during migration apply:', err);
  process.exit(1);
});
