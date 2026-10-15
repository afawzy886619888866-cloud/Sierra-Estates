/**
 * GET /api/cron/redeploy-static-portal
 *
 * Weekly cron that triggers a redeploy of the static portal project
 * (sierra-estates-static-portal) via Vercel Deploy Hook. Without this, the
 * static portal's production deployment expires after 30 days of inactivity
 * on the Hobby plan.
 *
 * Auth: Vercel's standard cron auth — sends `Authorization: Bearer <CRON_SECRET>`.
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

const STATIC_PORTAL_DEPLOY_HOOK = process.env.STATIC_PORTAL_DEPLOY_HOOK_URL;

export async function GET(req: Request) {
  // Verify Vercel cron auth: Authorization header OR ?secret= query param
  const authHeader = req.headers.get('authorization') || '';
  const url = new URL(req.url);
  const querySecret = url.searchParams.get('secret') || '';
  const expectedSecret = process.env.CRON_SECRET;

  const authed =
    (expectedSecret && authHeader === `Bearer ${expectedSecret}`) ||
    (expectedSecret && querySecret === expectedSecret);

  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }

  if (!STATIC_PORTAL_DEPLOY_HOOK) {
    return NextResponse.json(
      { error: 'STATIC_PORTAL_DEPLOY_HOOK_URL is not configured' },
      { status: 503, headers: NO_STORE }
    );
  }

  try {
    const response = await fetch(STATIC_PORTAL_DEPLOY_HOOK, { method: 'POST' });
    const data = await response.json();
    return NextResponse.json(
      { ok: true, triggered: true, jobId: data?.job?.id, state: data?.job?.state },
      { headers: NO_STORE }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 502, headers: NO_STORE }
    );
  }
}
