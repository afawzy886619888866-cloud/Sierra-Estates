/**
 * Shared auth guard for the scheduled cron routes.
 *
 * Every /api/cron/* route previously inlined:
 *
 *     if (cronSecret && authHeader !== `Bearer ${cronSecret}`) → 401
 *
 * which is FAIL-OPEN: with CRON_SECRET unset the check is skipped entirely and
 * the endpoint is publicly triggerable. These routes kick off Google Sheets
 * syncs, Property Finder imports and portfolio maintenance writes, so an
 * unconfigured deployment left real work exposed to anonymous callers.
 *
 * This guard fails CLOSED in production (503 when the secret is missing) while
 * keeping the unauthenticated path in development, so `pnpm dev` can still hit
 * the routes without configuring a secret. It mirrors the /api/orchestrate
 * gate in proxy.ts.
 */
import { NextResponse } from 'next/server';
import { safeEqual } from '@/lib/auth';

/**
 * Returns a response to send back when the request must be rejected, or `null`
 * when the caller is authorised and the route should proceed.
 */
export function verifyCronRequest(req: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Cron is not configured' },
        { status: 503 },
      );
    }
    // Development: no secret configured, allow the call through.
    return null;
  }

  if (!safeEqual(req.headers.get('authorization') || '', `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return cronOwnerGuard();
}

/**
 * Mirrored-project guard for scheduled work.
 *
 * Two Vercel projects (client portal and admin dashboard) build from this same
 * directory, so both register the vercel.json cron definitions and both would
 * execute every scheduled job — doubling Property Finder API usage and write
 * volume. The client project owns scheduled execution: set
 * CRON_OWNER_PROJECT_ID on both projects and only the deployment whose
 * VERCEL_PROJECT_ID matches proceeds past this guard. Everyone else gets an
 * idempotent 200 "skipped" so Vercel's scheduler does not report failures.
 *
 * Inert locally (VERCEL_PROJECT_ID is only injected on Vercel) and inert
 * anywhere CRON_OWNER_PROJECT_ID is unset, so existing behaviour and the
 * pinned contract tests are unchanged.
 */
function cronOwnerGuard(): NextResponse | null {
  const ownerProject = process.env.CRON_OWNER_PROJECT_ID;
  const thisProject = process.env.VERCEL_PROJECT_ID;

  if (!ownerProject || !thisProject) return null;
  if (thisProject === ownerProject) return null;

  return NextResponse.json(
    { skipped: true, reason: 'cron-owner-mismatch', project: thisProject },
    { status: 200 },
  );
}
