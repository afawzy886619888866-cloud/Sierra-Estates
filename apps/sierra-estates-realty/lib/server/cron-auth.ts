/**
 * Shared authentication guard for scheduled (cron) routes.
 *
 * Fails CLOSED. Every cron route previously used this pattern:
 *
 *     if (cronSecret && authHeader !== `Bearer ${cronSecret}`) → 401
 *
 * which silently no-ops when CRON_SECRET is unset — so with no env var the
 * job ran for ANY anonymous caller. Verified in production: an unauthenticated
 * GET to /api/cron/maintenance returned 200 and actually executed the job.
 * That turns every cron into a publicly-triggerable production endpoint, and
 * would have made the master-sheet sync an open Firestore write path as soon
 * as its Google credentials were configured.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when
 * the CRON_SECRET environment variable is set on the project, so the correct
 * posture is: no secret configured → refuse to run.
 *
 * NOTE: this means cron routes return 503 until CRON_SECRET is set in the
 * Vercel project. That is deliberate — a scheduled job that cannot
 * authenticate its caller should not execute.
 */
import { NextRequest, NextResponse } from 'next/server';

/**
 * Returns a NextResponse to short-circuit with when the caller is not an
 * authorized cron invocation, or `null` when the request may proceed.
 *
 * Usage:
 *   const denied = denyUnlessCron(req);
 *   if (denied) return denied;
 */
export function denyUnlessCron(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  // Fail closed: an unconfigured secret must not mean "open to everyone".
  if (!cronSecret) {
    return NextResponse.json(
      {
        error: 'Cron authentication is not configured',
        detail:
          'CRON_SECRET is not set on this deployment, so scheduled jobs cannot verify their caller and refuse to run. Set CRON_SECRET in the Vercel project settings; Vercel Cron then sends it automatically as an Authorization: Bearer header.',
      },
      { status: 503 },
    );
  }

  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
