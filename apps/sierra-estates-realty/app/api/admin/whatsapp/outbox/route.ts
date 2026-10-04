import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { listRecords, updateRecord, type WhereClause } from '@sierra-estates/db';
import { drainWhatsAppQueue } from '@/lib/server/whatsapp-drain';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * WHATSAPP OUTBOX — admin control surface for the message queue.
 *
 * GET  → live gateway session status + queue counters + the latest jobs.
 *        Query params: ?status=&purpose=&limit= (defaults: all, all, 100).
 * POST → { action: 'drain' }                 run the queue drain now
 *        { action: 'retry',  ids: [...] }    requeue failed jobs
 *        { action: 'cancel', ids: [...] }    mark queued jobs as failed/cancelled
 *
 * The status check constraint on public.whatsapp_queue only allows
 * ('pending','queued','processing','sending','sent','delivered','read','failed'),
 * so cancel writes status='failed' with an explicit error message instead of
 * inventing a new status.
 */

interface GatewayInfo {
  reachable: boolean;
  status?: string;
  phone?: string;
  pushName?: string;
  lastActive?: string;
  engineLoaded?: boolean;
  error?: string;
}

async function fetchGatewayStatus(): Promise<GatewayInfo> {
  const base = process.env.WHATSAPP_API_URL
    || (process.env.OPENWA_HOST ? `http://${process.env.OPENWA_HOST}:${process.env.OPENWA_PORT || '3000'}` : '');
  const key = process.env.OPENWA_ADMIN_API_KEY;
  const sessionId = process.env.OPENWA_SESSION_ID;
  if (!base || !key || !sessionId) {
    return { reachable: false, error: 'gateway_not_configured' };
  }
  try {
    const res = await fetch(
      `${base.replace(/\/+$/, '')}/api/sessions/${sessionId}`,
      { headers: { 'X-API-Key': key }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return { reachable: false, error: `gateway_http_${res.status}` };
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      reachable: true,
      status: (data.status as string) || 'unknown',
      phone: data.phone as string | undefined,
      pushName: data.pushName as string | undefined,
      lastActive: data.lastActive as string | undefined,
      engineLoaded: Boolean(data.engineLoaded),
    };
  } catch (err: any) {
    return { reachable: false, error: err?.message || 'gateway_unreachable' };
  }
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse('Authorized personnel only');

  try {
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status') || undefined;
    const purposeFilter = url.searchParams.get('purpose') || undefined;
    const limit = Math.min(Number(url.searchParams.get('limit') || 100), 200);

    const where: WhereClause[] = [];
    if (statusFilter && statusFilter !== 'all') where.push({ column: 'status', value: statusFilter });
    if (purposeFilter && purposeFilter !== 'all') where.push({ column: 'purpose', value: purposeFilter });

    const [jobs, gateway] = await Promise.all([
      listRecords<Record<string, any>>('whatsapp_queue', {
        ...(where.length ? { where } : {}),
        limit,
        select: '*',
      }),
      fetchGatewayStatus(),
    ]);

    // Counters over the recent window (cheap: single scan of the same table).
    const allRecent = await listRecords<{ status?: string; sentAt?: string; createdAt?: string }>(
      'whatsapp_queue',
      { limit: 500, select: 'status,sentAt,createdAt' },
    );
    const dayStartIso = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const stats = {
      queued: allRecent.filter((r) => r.status === 'queued').length,
      sending: allRecent.filter((r) => r.status === 'sending').length,
      sent: allRecent.filter((r) => r.status === 'sent').length,
      failed: allRecent.filter((r) => r.status === 'failed').length,
      sentToday: allRecent.filter((r) => r.status === 'sent' && (r.sentAt || r.createdAt || '') >= dayStartIso).length,
    };

    return NextResponse.json({
      success: true,
      provider: (process.env.WHATSAPP_PROVIDER || 'auto').toLowerCase(),
      gateway,
      stats,
      jobs,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[WHATSAPP_OUTBOX_GET]', error?.message);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse('Authorized personnel only');

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (action === 'drain') {
      const summary = await drainWhatsAppQueue();
      return NextResponse.json({ success: true, action, summary });
    }

    const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((i: unknown) => typeof i === 'string') : [];
    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: 'ids array is required' }, { status: 400 });
    }

    if (action === 'retry') {
      let retried = 0;
      for (const id of ids) {
        await updateRecord('whatsapp_queue', id, {
          status: 'queued',
          errorMessage: null,
          attempts: 0,
          updatedAt: new Date().toISOString(),
        });
        retried++;
      }
      return NextResponse.json({ success: true, action, retried });
    }

    if (action === 'cancel') {
      let cancelled = 0;
      for (const id of ids) {
        // No 'cancelled' status in the DB check constraint — 'failed' with an
        // explicit message is the honest equivalent for an operator action.
        await updateRecord('whatsapp_queue', id, {
          status: 'failed',
          errorMessage: 'Cancelled by admin',
          updatedAt: new Date().toISOString(),
        });
        cancelled++;
      }
      return NextResponse.json({ success: true, action, cancelled });
    }

    return NextResponse.json({ success: false, error: `unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    logger.error('[WHATSAPP_OUTBOX_POST]', error?.message);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
