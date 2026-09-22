import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { verifyCronRequest } from '@/lib/server/cron-auth';
import { logger } from '@/lib/logger';

/**
 * CRON / OPS: APPLY PENDING SCHEMA MIGRATIONS
 * ────────────────────────────────────────────
 * Applies pending SQL files from supabase/migrations/ at RUNTIME, where the
 * sensitive POSTGRES_URL env is available (Vercel excludes Sensitive values
 * from the BUILD environment, so the prebuild script cannot see them — this
 * route is the runtime half of that mechanism; whichever sees a usable
 * connection first wins, the other no-ops).
 *
 * Safety:
 *  - Fail-closed CRON_SECRET auth (verifyCronRequest), same as every cron.
 *  - Postgres advisory lock serializes concurrent appliers (multi-instance
 *    serverless + the build-time script can never race).
 *  - public.schema_migrations tracks applied files by name + checksum;
 *    each migration runs in ONE transaction (rollback on error).
 *
 * Scheduled daily at 03:00 UTC via vercel.json — also the self-healing path:
 * dropping a new migration file into supabase/migrations/ is enough, it will
 * be applied within 24h (or immediately via a manual authenticated call).
 */
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const ADVISORY_LOCK_KEY = 940011; // same key as scripts/apply-pending-migrations.mjs

function migrationsDir(): string | null {
  // Prebuild mirrors repo-root supabase/migrations into the app at
  // ./supabase/migrations so output-file tracing bundles them into the
  // serverless function (repo-root paths are unreachable at runtime).
  const candidates = [
    path.join(process.cwd(), 'supabase', 'migrations'),
    path.join(process.cwd(), '..', 'supabase', 'migrations'),
    path.join(process.cwd(), '..', '..', 'supabase', 'migrations'),
    path.join(process.cwd(), '..', '..', '..', 'supabase', 'migrations'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

function sslFor(url: string): { ssl?: { rejectUnauthorized: false } } {
  try {
    const host = new URL(url.replace('postgres://', 'http://').replace('postgresql://', 'http://')).hostname;
    if (host === 'localhost' || host === '127.0.0.1') return {};
    return { ssl: { rejectUnauthorized: false } };
  } catch {
    return { ssl: { rejectUnauthorized: false } };
  }
}

/** pg lets sslmode/channel_binding URL params override programmatic ssl config
 * (which turned verify on against Supabase's own CA). Strip them so the
 * explicit `ssl: { rejectUnauthorized: false }` below is authoritative. */
function cleanUrl(url: string): string {
  return url
    .replace(/[?&]sslmode=[^&]*/g, '')
    .replace(/[?&]channel_binding=[^&]*/g, '')
    .replace(/[?&]sslrootcert=[^&]*/g, '')
    .replace(/\?$/, '');
}

export async function GET(req: NextRequest) {
  const denied = verifyCronRequest(req);
  if (denied) return denied;

  const rawCandidates = [process.env.POSTGRES_URL_NON_POOLING, process.env.POSTGRES_URL].filter(
    Boolean
  ) as string[];

  if (rawCandidates.length === 0) {
    return NextResponse.json({ success: true, skipped: true, reason: 'no POSTGRES_URL at runtime' });
  }

  const dir = migrationsDir();
  if (!dir) {
    return NextResponse.json({ success: true, skipped: true, reason: 'supabase/migrations not found' });
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  if (files.length === 0) {
    return NextResponse.json({ success: true, skipped: true, reason: 'no migrations present' });
  }

  // Try each connection string with TLS forced permissive (Supabase presents
  // its own CA). First strategy that connects wins.
  const client = new Client({
    connectionString: cleanUrl(rawCandidates[0]),
    statement_timeout: 50_000,
    ...sslFor(rawCandidates[0]),
  });

  try {
    await client.connect();
  } catch (err: unknown) {
    const firstMessage = err instanceof Error ? err.message : String(err);
    logger.error('[apply-migrations] connection failed:', firstMessage);
    // Fallback: the other connection string (pooler vs direct).
    if (rawCandidates.length > 1) {
      const fallback = new Client({
        connectionString: cleanUrl(rawCandidates[1]),
        statement_timeout: 50_000,
        ...sslFor(rawCandidates[1]),
      });
      try {
        await fallback.connect();
      } catch (err2: unknown) {
        const secondMessage = err2 instanceof Error ? err2.message : String(err2);
        logger.error('[apply-migrations] fallback connection failed:', secondMessage);
        return NextResponse.json(
          {
            success: false,
            error: `both connection strings failed`,
            attempts: [
              { url: 'primary', error: firstMessage },
              { url: 'fallback', error: secondMessage },
            ],
          },
          { status: 502 }
        );
      }
      return applyPending(fallback, dir, files);
    }
    return NextResponse.json(
      { success: false, error: `connection failed: ${firstMessage}` },
      { status: 502 }
    );
  }

  return applyPending(client, dir, files);
}

async function applyPending(client: Client, dir: string, files: string[]): Promise<NextResponse> {
  const appliedNow: string[] = [];
  try {
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        name       TEXT PRIMARY KEY,
        checksum   TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const { rows } = await client.query('SELECT name, checksum FROM public.schema_migrations');
    const applied = new Map(rows.map((r: { name: string; checksum: string }) => [r.name, r.checksum]));

    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex').slice(0, 16);
      const seen = applied.get(file);
      if (seen === checksum) continue;
      if (seen && seen !== checksum) {
        logger.error(`[apply-migrations] ${file} checksum mismatch (edited after apply?) — skipping file`);
        continue;
      }
      logger.info(`[apply-migrations] applying ${file}`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO public.schema_migrations (name, checksum) VALUES ($1, $2)', [
          file,
          checksum,
        ]);
        await client.query('COMMIT');
        appliedNow.push(file);
      } catch (err: unknown) {
        await client.query('ROLLBACK');
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`[apply-migrations] ${file} FAILED: ${message}`);
        return NextResponse.json(
          { success: false, error: `${file} failed: ${message}`, applied: appliedNow },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      applied: appliedNow,
      appliedCount: appliedNow.length,
      tracked: files.length,
      timestamp: new Date().toISOString(),
    });
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
    } catch {
      /* already disconnected */
    }
    await client.end().catch(() => {});
  }
}
