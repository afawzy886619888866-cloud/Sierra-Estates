#!/usr/bin/env node
/**
 * validate-migration-037.mjs — replay the production migration chain for
 * migration 037 (Unified Admin Command Center) against a REAL PostgreSQL
 * (embedded-postgres 18), proving:
 *
 *   P1. 037 applies cleanly on a production-shaped database
 *       (consolidated schema.sql + migrations 011/013, which contribute the
 *       stale / publish_status / status-machine columns 037's guards check).
 *   P2. 037 is idempotent — a second run is a clean no-op.
 *   P3. The objects work: refresh_all_listing_freshness() RPC returns stats,
 *       se_code uniqueness is enforced (dupes rejected, NULLs coexist),
 *       the applicants view reads through RLS, webhook_logs is staff-only.
 *   P4. The "manual applicants table already exists" hazard is survived
 *       (guarded view creation skips instead of failing the migration).
 *
 * Supabase platform pieces are stubbed the way supabase/tests/harness.sql
 * does it (roles, auth schema, vector domain) plus PostGIS stand-ins, and a
 * few rewrites make vanilla-PG-incompatible syntax apply (extension creates
 * dropped, uuid_generate_v4 → gen_random_uuid, vector(N) → vector domain,
 * hnsw/gist/ivfflat indexes removed). Everything else — every table, function,
 * policy and the migration under test — runs exactly as written.
 *
 * Usage (from a scratch dir — the two deps are not workspace dependencies):
 *   mkdir -p /tmp/pgcheck && cd /tmp/pgcheck
 *   npm init -y && npm install embedded-postgres pg
 *   cp <repo>/scripts/validate-migration-037.mjs .
 *   node validate-migration-037.mjs
 *
 * Exit code 0 = all 15 checks passed.
 */
import EmbeddedPostgres from 'embedded-postgres';
import { Client } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const DATA_DIR = process.env.PG_DATA_DIR ?? '/tmp/sierra-migration-check';
const PORT = Number(process.env.PG_PORT ?? 5434);
const CONN = `postgres://postgres:password@localhost:${PORT}/postgres`;

const results = [];
function check(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => results.push([name, true, '']))
    .catch((err) => results.push([name, false, err.message]));
}

// ─── Platform stubs (extension of supabase/tests/harness.sql) ───────────────
const STUBS = `
DO $$
DECLARE r TEXT;
BEGIN
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
            EXECUTE format('CREATE ROLE %I NOLOGIN', r);
        END IF;
    END LOOP;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE auth.users (id UUID PRIMARY KEY);

CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;

-- pgvector / PostGIS stand-ins (domains over TEXT)
CREATE DOMAIN vector AS TEXT;
CREATE DOMAIN geometry AS TEXT;
CREATE DOMAIN geography AS TEXT;

CREATE FUNCTION ST_MakePoint(x float8, y float8) RETURNS text
  LANGUAGE sql IMMUTABLE AS $$ SELECT $1::text || ',' || $2::text; $$;
CREATE FUNCTION ST_SetSRID(g text, srid int) RETURNS text
  LANGUAGE sql IMMUTABLE AS $$ SELECT g; $$;
CREATE FUNCTION ST_DWithin(a text, b text, r float8) RETURNS boolean
  LANGUAGE sql IMMUTABLE AS $$ SELECT false; $$;

-- pgcrypto's digest() (migration 011 fingerprints); md5-backed stand-in is
-- deterministic, which is all the fingerprint needs for replay testing.
CREATE FUNCTION digest(data text, algo text) RETURNS bytea
  LANGUAGE sql IMMUTABLE AS $$ SELECT decode(md5(data), 'hex'); $$;
CREATE FUNCTION digest(data bytea, algo text) RETURNS bytea
  LANGUAGE sql IMMUTABLE AS $$ SELECT decode(md5(encode(data, 'escape')), 'hex'); $$;

-- Supabase pre-creates this publication; schema.sql and migration 037 ALTER it.
CREATE PUBLICATION supabase_realtime;
`;

/** Vanilla-PG rewrites — mirrors what run-rls-tests.sh does for its harness. */
function rewriteSql(sql, { stripPublishGate = false } = {}) {
  if (stripPublishGate) {
    // Pre-existing schema.sql inconsistency: the publish-gate policy references
    // listings.publish_status, but that column only arrives with migration 013.
    // Strip it from the consolidated replay; migration 020 re-creates it once
    // the column exists (the exact order production evolved in).
    sql = sql.replace(
      /DROP POLICY IF EXISTS "Public can view active listings" ON public\.listings;[\s\S]*?OR public\.is_staff\(\)\s*\);/,
      '',
    );
  }
  // hnsw (pgvector), gist (PostGIS) and ivfflat (pgvector) access methods do
  // not exist on a vanilla server — remove those whole CREATE INDEX statements
  // (they never contain inner semicolons, so [^;] is a safe span).
  sql = sql.replace(/CREATE\s+INDEX\s+[^;]*?USING\s+(?:hnsw|gist|ivfflat)[^;]*;/gis, '');

  const lines = sql
    // Extensions are platform-provided (uuid-ossp/pgcrypto stripped with the
    // rest; gen_random_uuid() is core since PG13).
    .replace(/^CREATE EXTENSION[^\n]*;\s*$/gm, '')
    .replace(/\buuid_generate_v4\(\)/g, 'gen_random_uuid()')
    // pgvector columns → stub domain; dimension drops
    .replace(/\bvector\(\s*\d+\s*\)/g, 'vector')
    // PostGIS typed column → stub domain
    .replace(/\bgeometry\(\s*Point\s*,\s*4326\s*\)/g, 'geometry')
    .split('\n');

  // Pre-existing schema.sql ordering quirk: the idx_inquiries_* creates sit in
  // the early index section (line ~366) while public.inquiries is only created
  // at line ~691 — defer them to the end so a fresh apply succeeds.
  const deferred = lines.filter((line) =>
    /^CREATE INDEX IF NOT EXISTS idx_inquiries/.test(line.trim()),
  );
  const body = lines.filter(
    (line) => !/^CREATE INDEX IF NOT EXISTS idx_inquiries/.test(line.trim()),
  );
  return [...body, ...deferred].join('\n');
}

/** Apply a SQL file (or inline SQL) with the vanilla-PG rewrites. */
async function applyFile(client, file, label) {
  const raw = fs.readFileSync(file, 'utf8');
  await client.query(rewriteSql(raw));
  console.log(`  ✓ applied ${label}`);
}

async function main() {
  fs.rmSync(DATA_DIR, { recursive: true, force: true });

  console.log('Booting embedded PostgreSQL 18…');
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: 'postgres',
    password: 'password',
    port: PORT,
    persistent: false,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('sierra');
  const client = new Client({ connectionString: CONN.replace(/\/postgres$/, '/sierra') });
  await client.connect();
  console.log('  ✓ postgres up, database sierra created\n');

  try {
    // ── Base platform stubs ────────────────────────────────────────────────
    await check('platform stubs apply', () => client.query(STUBS));

    // ── Production-shaped base: consolidated schema WITHOUT the 037 tail ──
    const schemaRaw = fs.readFileSync(path.join(REPO, 'supabase/schema.sql'), 'utf8');
    const cut = schemaRaw.indexOf('-- Migration 037 — UNIFIED ADMIN COMMAND CENTER (additive; mirrored from');
    if (cut === -1) throw new Error('schema.sql 037 marker not found — regenerate the tail');
    const pre037 = schemaRaw.slice(0, cut);
    await check('schema.sql (pre-037 consolidated) applies', () =>
      client.query(rewriteSql(pre037, { stripPublishGate: true })),
    );

    // Migrations that contribute the guarded columns (stale, publish_status,
    // verified_at, the status machine) — the production drift 037 rides on.
    await check('migration 011 (inventory os v2) applies', () =>
      applyFile(client, path.join(REPO, 'supabase/migrations/011_inventory_os_v2.sql'), '011'),
    );
    await check('migration 013 (master inventory activation) applies', () =>
      applyFile(
        client,
        path.join(REPO, 'supabase/migrations/20260929_013_master_inventory_activation.sql'),
        '013',
      ),
    );
    // 020 re-creates the publish-gate policy stripped above — the production
    // order (013 adds the column, 020 gates on it).
    await check('migration 020 (public publish gate) applies', () =>
      applyFile(
        client,
        path.join(REPO, 'supabase/migrations/20261002_020_public_publish_gate.sql'),
        '020',
      ),
    );

    // ── Seed production-like rows (incl. duplicate legacy codes) ───────────
    await check('seed rows insert', async () => {
      await client.query(`
        INSERT INTO public.listings (id, title, compound, price, area_sqm, status, code, reference_code, updated_at, verified_at)
        VALUES
          ('seed-1', 'Villa Mivida', 'Mivida', 22000000, 420, 'active',  'HP-VL-01', 'REF-001', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
          ('seed-2', 'Villa Mivida dupe', 'Mivida', 24000000, 420, 'active', 'HP-VL-01', NULL, NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days'),
          ('seed-3', 'Apartment Eastown', 'Eastown', 9800000, 210, 'active', '  SE-APT-9  ', 'REF-003', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
          ('seed-4', 'Apartment Taj City', 'Taj City', 7600000, 180, 'available', NULL, 'REF-004', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),
          -- codeless rows: never touched by the se_code backfill, so their
          -- freshness decays from updated_at and the 30-day stale SLA applies.
          ('seed-5', 'Studio Madinaty', 'Madinaty', 3200000, 90, 'active', NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
          ('seed-6', 'Duplex Villette', 'Villette', 12500000, 260, 'active', NULL, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
          ('seed-7', 'Old villa Hyde Park', 'Hyde Park', 18000000, 500, 'active', NULL, NULL, NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days'),
          ('seed-8', 'Old apartment Katameya', 'Katameya', 5400000, 150, 'available', NULL, NULL, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days');
      `);
      await client.query(`
        INSERT INTO public.career_applications (id, name, phone, position, experience, status)
        VALUES ('app-1', 'Mahmoud Saeed', '+201000000001', 'Senior Sales Consultant', '6', 'reviewed');
      `);
    });

    // ── P1: migration 037 applies on the production-shaped database ────────
    const migrationPath = path.join(REPO, 'supabase/migrations/20261031_037_unified_command_center.sql');
    await check('P1: migration 037 applies cleanly', () => applyFile(client, migrationPath, '037'));

    // ── P2: idempotency ────────────────────────────────────────────────────
    await check('P2: migration 037 re-run is a clean no-op', () =>
      applyFile(client, migrationPath, '037 (again)'),
    );

    // ── P3: functional checks ──────────────────────────────────────────────
    await check('P3a: se_code backfill resolved duplicates + trimmed', async () => {
      const { rows } = await client.query(
        `SELECT id, se_code, freshness_score FROM public.listings ORDER BY id`,
      );
      const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
      // One owner for the duplicated legacy code HP-VL-01 — deterministically
      // the lowest id (seed-1 < seed-2) via the ORDER BY tiebreaker.
      const hpOwners = rows.filter((r) => r.se_code === 'HP-VL-01');
      if (hpOwners.length !== 1 || hpOwners[0].id !== 'seed-1') {
        throw new Error(`HP-VL-01 owners: ${JSON.stringify(hpOwners.map((r) => r.id))}`);
      }
      if (byId['seed-2'].se_code !== null) throw new Error('duplicate owner got a code');
      // Trimmed code stored without whitespace
      if (byId['seed-3'].se_code !== 'SE-APT-9') throw new Error('se_code not trimmed');
      if (byId['seed-4'].se_code !== 'REF-004') throw new Error('reference_code fallback missed');
      // The backfills are derived writes — app.skip_updated_at keeps the clock
      // running, so EVERY row decays from its real updated_at regardless of
      // whether the se_code backfill assigned it a code:
      // 1 day → 98, 2 days → 96, 40/60 days → floor 20.
      const expect = { 'seed-1': 96, 'seed-2': 20, 'seed-3': 98, 'seed-4': 20, 'seed-5': 98, 'seed-6': 96, 'seed-7': 20, 'seed-8': 20 };
      // And updated_at itself must be untouched by the migration's backfills.
      const clocks = await client.query(
        `SELECT id, updated_at FROM public.listings WHERE id IN ('seed-1','seed-7')`,
      );
      for (const row of clocks.rows) {
        const ageHours = (Date.now() - new Date(row.updated_at).getTime()) / 3_600_000;
        const expected = row.id === 'seed-1' ? 48 : 960;
        if (Math.abs(ageHours - expected) > 2) {
          throw new Error(`${row.id}: updated_at clock restarted (${ageHours.toFixed(1)}h old, expected ~${expected}h)`);
        }
      }
      for (const [id, want] of Object.entries(expect)) {
        const got = byId[id].freshness_score;
        if (got !== want) throw new Error(`${id}: expected freshness ${want}, got ${got}`);
      }
    });

    await check('P3b: se_code uniqueness enforced, NULLs coexist', async () => {
      await client.query(
        `INSERT INTO public.listings (id, title, compound, price, area_sqm, status, se_code)
         VALUES ('null-a', 'A', 'X', 1, 1, 'active', NULL), ('null-b', 'B', 'X', 1, 1, 'active', NULL)`,
      );
      let rejected = false;
      try {
        await client.query(
          `INSERT INTO public.listings (id, title, compound, price, area_sqm, status, se_code)
           VALUES ('dupe', 'C', 'X', 1, 1, 'active', 'HP-VL-01')`,
        );
      } catch (err) {
        rejected = /idx_listings_se_code_unique|unique constraint/i.test(String(err.message));
      }
      if (!rejected) throw new Error('duplicate se_code was NOT rejected');
    });

    await check('P3c: refresh_all_listing_freshness() RPC works', async () => {
      const { rows } = await client.query('SELECT * FROM public.refresh_all_listing_freshness()');
      const r = rows[0];
      if (!r || !('refreshed' in r) || !('avg_freshness' in r) || !('fresh_over_90' in r) || !('stale_flagged' in r)) {
        throw new Error(`unexpected RPC result: ${JSON.stringify(r)}`);
      }
      // seed-7 (40 days) and seed-8 (60 days) are live-status, codeless and
      // untouched → the 30-day stale SLA flags them.
      if (Number(r.stale_flagged) < 2) throw new Error(`expected >= 2 stale flags, got ${r.stale_flagged}`);
      const stale = await client.query(`SELECT id FROM public.listings WHERE stale = TRUE ORDER BY id`);
      const ids = stale.rows.map((row) => row.id);
      if (!ids.includes('seed-7') || !ids.includes('seed-8')) {
        throw new Error(`stale flags on unexpected rows: ${JSON.stringify(ids)}`);
      }
    });

    await check('P3d: applicants view reads base table through RLS', async () => {
      const { rows } = await client.query('SELECT id, name, cv_url FROM public.applicants');
      if (rows.length !== 1 || rows[0].id !== 'app-1') throw new Error(`view returned ${rows.length} rows`);
      // security_invoker: a non-staff authenticated role must see 0 rows
      await client.query('SET ROLE authenticated');
      try {
        const r2 = await client.query('SELECT count(*)::int AS n FROM public.applicants');
        if (r2.rows[0].n !== 0) throw new Error(`non-staff saw ${r2.rows[0].n} applicant rows through the view`);
      } finally {
        await client.query('RESET ROLE');
      }
    });

    await check('P3e: webhook_logs is staff-only', async () => {
      await client.query(
        `INSERT INTO public.webhook_logs (source, event_type, status, latency_ms)
         VALUES ('whatsapp', 'message', 'processed', 18)`,
      );
      const own = await client.query('SELECT count(*)::int AS n FROM public.webhook_logs');
      if (own.rows[0].n !== 1) throw new Error('insert or read failed');
      await client.query('SET ROLE authenticated');
      try {
        const r = await client.query('SELECT count(*)::int AS n FROM public.webhook_logs');
        if (r.rows[0].n !== 0) throw new Error(`non-staff saw ${r.rows[0].n} webhook log rows`);
      } finally {
        await client.query('RESET ROLE');
      }
    });

    // ── P5: heal semantics — a fabricated 100 from an earlier apply recovers ─
    await check('P5: fabricated DEFAULT-100 scores heal on re-apply', async () => {
      // Simulate the earlier (pre-fix) version of this migration having run:
      // column exists, every score fabricated to the column DEFAULT 100. A
      // DEFAULT fill never fires triggers, so fabricate without restarting
      // the clock (same GUC the derived writes use).
      await client.query(`SET app.skip_updated_at = 'on'`);
      await client.query(
        `UPDATE public.listings SET freshness_score = 100 WHERE id IN ('seed-7','seed-8')`,
      );
      await client.query(`RESET app.skip_updated_at`);
      await client.query(fs.readFileSync(migrationPath, 'utf8')); // re-apply raw
      const { rows } = await client.query(
        `SELECT id, freshness_score FROM public.listings WHERE id IN ('seed-7','seed-8') ORDER BY id`,
      );
      // 40/60-day-old clocks must heal to the floored decay value (20), not 100.
      for (const row of rows) {
        if (row.freshness_score !== 20) {
          throw new Error(`${row.id}: expected healed score 20, got ${row.freshness_score}`);
        }
      }
      // …and their clocks must still be intact (derived writes only).
      const clocks = await client.query(
        `SELECT id, ROUND(EXTRACT(EPOCH FROM (NOW() - updated_at)) / 3600)::int AS age_hours
           FROM public.listings WHERE id IN ('seed-7','seed-8')`,
      );
      for (const row of clocks.rows) {
        if (row.age_hours < 900) throw new Error(`${row.id}: clock restarted (${row.age_hours}h)`);
      }
    });

    // ── P4: pre-existing applicants TABLE hazard ───────────────────────────
    await check('P4: 037 survives a pre-existing applicants table', async () => {
      await client.query(
        `DROP VIEW IF EXISTS public.applicants;
         CREATE TABLE public.applicants (id TEXT PRIMARY KEY, legacy_note TEXT);
         INSERT INTO public.applicants (id, legacy_note) VALUES ('legacy-1', 'manually created')`,
      );
      await client.query(fs.readFileSync(migrationPath, 'utf8')); // raw — table hazards only
      // The guard must have skipped replacing the table.
      const { rows } = await client.query(
        `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public' AND tablename='applicants'`,
      );
      if (rows[0].n !== 1) throw new Error('applicants table vanished');
      const stillThere = await client.query(`SELECT id FROM public.applicants WHERE id='legacy-1'`);
      if (stillThere.rows.length !== 1) throw new Error('legacy applicants row lost');
    });
  } finally {
    await client.end().catch(() => {});
    try {
      await pg.stop();
    } catch {
      // already stopped
    }
  }

  console.log('\n──────────────────────────────────────────────');
  let failed = 0;
  for (const [name, ok, msg] of results) {
    console.log(`${ok ? '✓ PASS' : '✗ FAIL'}  ${name}${ok ? '' : `\n        ${msg}`}`);
    if (!ok) failed += 1;
  }
  console.log('──────────────────────────────────────────────');
  console.log(`${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('VALIDATOR CRASHED:', err);
  process.exit(1);
});
