import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { logger } from '@/lib/logger';

/**
 * TEMPORARY OPS TRIGGER — deleted once migrations 027/028 are applied
 * (2026-10-11). Do not extend, do not reuse this pattern.
 *
 * Auth model: the caller presents a 256-bit preimage in the x-apply-key
 * header; only its SHA-256 commitment is committed here. The preimage is
 * never written to the repo, so this route is inert to anyone without it.
 * The body applies the SAME reviewed, idempotent migration set as
 * /api/cron/apply-migrations (advisory lock + schema_migrations ledger +
 * one transaction per file) — duplicated here so the tested cron route is
 * not touched; this whole file is reverted away after use.
 */
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const KEY_HASH = 'da6c0b751cbe10956dc8d69b60fe3453ed7c8729c440d9e490604394f6159d27';
const ADVISORY_LOCK_KEY = 940011; // same key as every other applier

function authorized(req: NextRequest): boolean {
  const given = (req.headers.get('x-apply-key') || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(given)) return false;
  const hash = crypto.createHash('sha256').update(given, 'utf8').digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(KEY_HASH, 'hex'));
}

function migrationsDir(): string | null {
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

function cleanUrl(url: string): string {
  return url
    .replace(/[?&]sslmode=[^&]*/g, '')
    .replace(/[?&]channel_binding=[^&]*/g, '')
    .replace(/[?&]sslrootcert=[^&]*/g, '')
    .replace(/\?$/, '');
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  const client = new Client({
    connectionString: cleanUrl(rawCandidates[0]),
    statement_timeout: 50_000,
    ...sslFor(rawCandidates[0]),
  });

  try {
    await client.connect();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[ops/apply-pending] connection failed:', message);
    return NextResponse.json({ success: false, error: `connection failed: ${message}` }, { status: 502 });
  }

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
      const checksum = crypto.createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex').slice(0, 16);
      const seen = applied.get(file);
      if (seen === checksum) continue;
      if (seen && seen !== checksum) {
        logger.error(`[ops/apply-pending] ${file} checksum mismatch — skipping file`);
        continue;
      }
      logger.info(`[ops/apply-pending] applying ${file}`);
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
        logger.error(`[ops/apply-pending] ${file} FAILED: ${message}`);
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
      /* connection already gone */
    }
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}
