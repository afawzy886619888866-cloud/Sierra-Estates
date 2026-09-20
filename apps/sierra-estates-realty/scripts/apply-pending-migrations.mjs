/**
 * DEPLOY-TIME MIGRATION RUNNER
 * ────────────────────────────
 * Applies pending SQL migrations from supabase/migrations/ during the Vercel
 * build step, where the sensitive POSTGRES_URL env is available. This makes
 * schema shipping independent of the (currently blocked) GitHub Actions
 * Deploy-Supabase workflow — the app deploys its own schema, idempotently,
 * exactly once per migration.
 *
 * Behaviour:
 *  - No POSTGRES_URL / POSTGRES_URL_NON_POOLING  → local dev: log + exit 0.
 *  - Uses a Postgres advisory lock so the two Vercel projects (client portal +
 *    admin) building concurrently never race; one waits, then no-ops.
 *  - Tracks applied migrations in public.schema_migrations (name + checksum).
 *  - Each migration runs in one transaction; any failure rolls back and fails
 *    the build with a clear message.
 *
 * The `pg` dependency is intentionally a devDependency: it is only used by
 * build tooling, never bundled into the Next.js runtime.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', '..', 'supabase', 'migrations');
// In-app mirror consumed by /api/cron/apply-migrations at RUNTIME (the
// serverless bundle cannot read repo-root paths, so prebuild copies the
// migration files into the app for output-file-tracing to pick up).
const APP_MIGRATIONS_DIR = path.resolve(__dirname, '..', 'supabase', 'migrations');
const ADVISORY_LOCK_KEY = 940011; // arbitrary constant, shared by all appliers
const STATEMENT_TIMEOUT_MS = 180_000;

// Always mirror migrations into the app first — the runtime applier needs
// them present even when this script cannot reach the database (Vercel
// excludes Sensitive env values like POSTGRES_URL from the BUILD env).
if (fs.existsSync(MIGRATIONS_DIR)) {
  fs.mkdirSync(APP_MIGRATIONS_DIR, { recursive: true });
  let copied = 0;
  for (const f of fs.readdirSync(MIGRATIONS_DIR)) {
    if (f.endsWith('.sql')) {
      fs.copyFileSync(path.join(MIGRATIONS_DIR, f), path.join(APP_MIGRATIONS_DIR, f));
      copied++;
    }
  }
  console.log(`[migrations] mirrored ${copied} migration file(s) into the app bundle.`);
}

const candidates = [
  process.env.POSTGRES_URL_NON_POOLING, // direct connection — best for DDL
  process.env.POSTGRES_URL, // session/transaction pooler
].filter(Boolean);

if (candidates.length === 0) {
  console.log('[migrations] no POSTGRES_URL in build env (Sensitive vars are build-excluded');
  console.log('[migrations] on Vercel) — runtime applier /api/cron/apply-migrations will apply.');
  process.exit(0);
}

if (!fs.existsSync(MIGRATIONS_DIR)) {
  console.log(`[migrations] ${MIGRATIONS_DIR} not found — nothing to apply.`);
  process.exit(0);
}

const files = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('[migrations] no .sql files present — skipping.');
  process.exit(0);
}

async function connect() {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (const url of candidates) {
      const client = new Client({
        connectionString: url,
        statement_timeout: STATEMENT_TIMEOUT_MS,
      });
      try {
        await client.connect();
        return client;
      } catch (err) {
        lastErr = err;
        console.warn(
          `[migrations] connect attempt ${attempt} failed (${err.code || err.message}); retrying…`
        );
      }
    }
    await new Promise((r) => setTimeout(r, 3000 * attempt));
  }
  throw lastErr;
}

const client = await connect();
try {
  // Serialize concurrent builders (client portal + admin build the same repo).
  await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      name       TEXT PRIMARY KEY,
      checksum   TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rows } = await client.query('SELECT name, checksum FROM public.schema_migrations');
  const applied = new Map(rows.map((r) => [r.name, r.checksum]));

  let pending = 0;
  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex').slice(0, 16);
    const seen = applied.get(file);

    if (seen === checksum) continue; // applied, unchanged
    if (seen && seen !== checksum) {
      // Same name, different content — someone edited an applied migration.
      // Fail loudly rather than silently re-running a mutated migration.
      console.error(
        `[migrations] ✋ ${file} was already applied with a different checksum ` +
          `(applied=${seen}, file=${checksum}). Create a NEW migration file instead of editing one.`
      );
      process.exit(1);
    }

    pending++;
    console.log(`[migrations] applying ${file} …`);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO public.schema_migrations (name, checksum) VALUES ($1, $2)', [
        file,
        checksum,
      ]);
      await client.query('COMMIT');
      console.log(`[migrations] ✅ ${file} applied.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[migrations] ❌ ${file} FAILED: ${err.message}`);
      if (err.detail) console.error(`[migrations]    detail: ${err.detail}`);
      if (err.hint) console.error(`[migrations]    hint: ${err.hint}`);
      process.exit(1);
    }
  }

  if (pending === 0) {
    console.log(`[migrations] schema is up to date (${files.length} tracked, 0 pending).`);
  } else {
    console.log(`[migrations] done: ${pending} applied, ${files.length} tracked.`);
  }
} finally {
  try {
    await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
  } catch {
    /* connection may already be gone */
  }
  await client.end().catch(() => {});
}
