/**
 * POST /api/admin/leads/sync-pf  (admin-authenticated)
 *
 * Phase 13 / audit B12 fix: the admin CRM's "Sync Property Finder" button used
 * to call /api/cron/sync-leads DIRECTLY from the browser, attaching a
 * client-inlined cron secret with a guessable fallback literal — exposing the
 * secret to every visitor of the admin bundle.
 *
 * The browser now calls THIS route with no secret at all: the session cookie
 * authenticates the admin, and the cron endpoint is invoked IN-PROCESS with
 * the server-side CRON_SECRET header (same pattern as the Phase 11
 * dispatcher). The secret never crosses the trust boundary.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // In-process invocation of the cron route: clean URL, server-side secret.
    const { GET: syncLeads } = await import('../../../../api/cron/sync-leads/route');
    const url = new URL('/api/cron/sync-leads', req.nextUrl.origin);
    const cronSecret = process.env.CRON_SECRET;
    const subRequest = new NextRequest(url, {
      headers: cronSecret ? { authorization: `Bearer ${cronSecret}` } : {},
    });
    const response = await syncLeads(subRequest);

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (response.status >= 200 && response.status < 300) {
      logger.info('[admin/sync-pf] Property Finder lead sync completed');
      return NextResponse.json({ success: true, summary: body ?? {} });
    }
    logger.warn(`[admin/sync-pf] cron sync-leads answered ${response.status}`);
    return NextResponse.json(
      { success: false, error: (body as { error?: string } | null)?.error ?? `Upstream status ${response.status}` },
      { status: 502 },
    );
  } catch (err) {
    logger.error('[admin/sync-pf] failed:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 },
    );
  }
}
