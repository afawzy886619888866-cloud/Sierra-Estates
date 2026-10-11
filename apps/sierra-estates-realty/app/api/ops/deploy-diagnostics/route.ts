import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

/**
 * TEMPORARY OPS DIAGNOSTIC — do not keep beyond the 2026-10-12 migration
 * window. Read-only, exposes ONLY booleans / counts / public file names so
 * the pending-cron question (why did the 10:25 UTC apply-migrations fire
 * not land?) can be answered without Vercel dashboard access:
 *   - is a direct Postgres URL present at serverless runtime?
 *   - did output-file tracing bundle supabase/migrations?
 *   - would the cron owner-guard skip this project?
 * No secret VALUES are returned under any circumstance.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  // Mirrors migrationsDir() from ../api/cron/apply-migrations/route.ts
  const candidates = [
    path.join(process.cwd(), 'supabase', 'migrations'),
    path.join(process.cwd(), '..', 'supabase', 'migrations'),
    path.join(process.cwd(), '..', '..', 'supabase', 'migrations'),
    path.join(process.cwd(), '..', '..', '..', 'supabase', 'migrations'),
  ];
  const dir = candidates.find((d) => fs.existsSync(d)) ?? null;
  const files = dir
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
    : [];

  const ownerGuard = process.env.CRON_OWNER_PROJECT_ID ?? null;
  const thisProject = process.env.VERCEL_PROJECT_ID ?? null;

  return NextResponse.json(
    {
      marker: 'cron-swap-2 (12:25 UTC fire)',
      nodeEnv: process.env.NODE_ENV ?? null,
      postgresUrl: Boolean(process.env.POSTGRES_URL),
      postgresUrlNonPooling: Boolean(process.env.POSTGRES_URL_NON_POOLING),
      cronSecretSet: Boolean(process.env.CRON_SECRET),
      migrationsDirFound: Boolean(dir),
      migrationsDirRelative: dir ? path.relative(process.cwd(), dir) : null,
      migrationFileCount: files.length,
      latestMigrations: files.slice(-3),
      cronOwnerProjectIdSet: ownerGuard !== null,
      vercelProjectIdSet: thisProject !== null,
      ownerGuardWouldSkip: ownerGuard !== null && thisProject !== null && ownerGuard !== thisProject,
    },
    { headers: { 'cache-control': 'no-store' } }
  );
}
