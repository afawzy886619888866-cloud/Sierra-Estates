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

interface GatewaySession {
  id: string;
  name: string;
  status: string;
  phone?: string | null;
  pushName?: string | null;
  lastActive?: string | null;
  engineLoaded?: boolean;
  totalSent?: number;
  hasQr?: boolean;
  qrDataUrl?: string | null;
  error?: string | null;
}

interface GatewayInfo {
  reachable: boolean;
  endpoint?: string;
  tunnelUrl?: string | null;
  status?: string;
  phone?: string;
  pushName?: string;
  lastActive?: string;
  engineLoaded?: boolean;
  sessions?: GatewaySession[];
  activeSessions?: number;
  totalSessions?: number;
  error?: string;
}

function normalizeUrl(raw: string, defaultPort = '2785'): string {
  if (!raw) return '';
  let url = raw.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }
  url = url.replace(/\/+$/, '');
  // If no port and not https / trycloudflare, check if we need port
  if (!url.includes('trycloudflare.com') && !url.includes('.net') && !url.includes('.com') && !/:[0-9]+$/.test(url)) {
    url = `${url}:${defaultPort}`;
  }
  return url;
}

function getCandidateEndpoints(): string[] {
  const endpoints: string[] = [];
  // 1. Local gateway (worker daemon on port 2785)
  endpoints.push('http://127.0.0.1:2785');

  // 2. Explicit WHATSAPP_GATEWAY_URL / WHATSAPP_API_URL
  if (process.env.WHATSAPP_GATEWAY_URL) {
    endpoints.push(normalizeUrl(process.env.WHATSAPP_GATEWAY_URL));
  }
  if (process.env.WHATSAPP_API_URL) {
    endpoints.push(normalizeUrl(process.env.WHATSAPP_API_URL));
  }

  // 3. Cloudflare tunnel if configured
  if (process.env.CLOUDFLARE_TUNNEL_URL) {
    endpoints.push(normalizeUrl(process.env.CLOUDFLARE_TUNNEL_URL));
  }

  // 4. OPENWA_HOST (+ OPENWA_PORT)
  if (process.env.OPENWA_HOST) {
    const port = process.env.OPENWA_PORT || '2785';
    endpoints.push(normalizeUrl(`${process.env.OPENWA_HOST}:${port}`));
  }

  return Array.from(new Set(endpoints.filter(Boolean)));
}

async function fetchGatewayStatus(): Promise<GatewayInfo> {
  const endpoints = getCandidateEndpoints();
  const key = process.env.OPENWA_ADMIN_API_KEY || process.env.WHATSAPP_API_KEY || 'sierra-admin-secret';

  let lastError = 'No gateway endpoints configured';

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${endpoint}/api/sessions`, {
        headers: key ? { 'X-API-Key': key } : {},
        signal: AbortSignal.timeout(3500),
        cache: 'no-store',
      });

      if (!res.ok) {
        lastError = `endpoint_${endpoint}_status_${res.status}`;
        continue;
      }

      const rawList = await res.json().catch(() => null);
      if (!Array.isArray(rawList)) {
        lastError = `endpoint_${endpoint}_malformed_response`;
        continue;
      }

      const sessions: GatewaySession[] = rawList.map((s: any) => ({
        id: String(s.id || ''),
        name: String(s.name || s.id || ''),
        status: String(s.status || 'unknown'),
        phone: s.phone ? String(s.phone) : null,
        pushName: s.pushName ? String(s.pushName) : null,
        lastActive: s.lastActive ? String(s.lastActive) : null,
        engineLoaded: Boolean(s.engineLoaded),
        totalSent: Number(s.totalSent || 0),
        hasQr: Boolean(s.hasQr),
        qrDataUrl: s.qrDataUrl ? String(s.qrDataUrl) : null,
        error: s.error ? String(s.error) : null,
      }));

      // Enrich QR data for awaiting lines if not attached
      for (const s of sessions) {
        if (s.hasQr && !s.qrDataUrl) {
          try {
            const detailRes = await fetch(`${endpoint}/api/sessions/${s.id}`, {
              headers: key ? { 'X-API-Key': key } : {},
              signal: AbortSignal.timeout(2000),
              cache: 'no-store',
            });
            if (detailRes.ok) {
              const detail = await detailRes.json();
              if (detail.qrDataUrl) s.qrDataUrl = detail.qrDataUrl;
            }
          } catch (_) {}
        }
      }

      const readySessions = sessions.filter((s) => s.status === 'ready');
      const awaitingQrSessions = sessions.filter((s) => s.status === 'scan_qr' || s.hasQr);
      const overallStatus = readySessions.length > 0 ? 'ready' : awaitingQrSessions.length > 0 ? 'scan_qr' : (sessions[0]?.status || 'starting');

      const primary = readySessions[0] || sessions[0];
      const tunnelUrl = endpoints.find((e) => e.includes('trycloudflare.com')) || null;

      return {
        reachable: true,
        endpoint,
        tunnelUrl,
        status: overallStatus,
        phone: primary?.phone || undefined,
        pushName: primary?.pushName || undefined,
        lastActive: primary?.lastActive || undefined,
        engineLoaded: sessions.some((s) => s.engineLoaded),
        sessions,
        activeSessions: readySessions.length,
        totalSessions: sessions.length,
      };
    } catch (err: any) {
      lastError = err?.message || 'timeout';
    }
  }

  return {
    reachable: false,
    error: lastError,
    sessions: [],
    activeSessions: 0,
    totalSessions: 0,
  };
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

    // Counters over the recent window
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
      provider: (process.env.WHATSAPP_PROVIDER || 'openwa_multisession').toLowerCase(),
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

    // 1. Drain Queue action
    if (action === 'drain') {
      const summary = await drainWhatsAppQueue();
      return NextResponse.json({ success: true, action, summary });
    }

    // 2. Gateway Direct Actions: restart_session
    if (action === 'restart_session') {
      const sessionId = body?.sessionId as string;
      if (!sessionId) {
        return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
      }
      const endpoints = getCandidateEndpoints();
      const key = process.env.OPENWA_ADMIN_API_KEY || 'sierra-admin-secret';
      let triggered = false;
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(`${endpoint}/api/sessions/${encodeURIComponent(sessionId)}/restart`, {
            method: 'POST',
            headers: key ? { 'X-API-Key': key } : {},
            signal: AbortSignal.timeout(4000),
          });
          if (res.ok) {
            triggered = true;
            break;
          }
        } catch (_) {}
      }
      return NextResponse.json({ success: triggered, action, sessionId });
    }

    // 3. Gateway Direct Action: test_send
    if (action === 'test_send') {
      const { sessionId, phone, text } = body;
      if (!phone || !text) {
        return NextResponse.json({ success: false, error: 'phone and text are required' }, { status: 400 });
      }
      const endpoints = getCandidateEndpoints();
      const key = process.env.OPENWA_ADMIN_API_KEY || 'sierra-admin-secret';
      let sendResult: any = null;
      for (const endpoint of endpoints) {
        try {
          const path = sessionId ? `/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text` : `/api/messages/send-text`;
          const res = await fetch(`${endpoint}${path}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(key ? { 'X-API-Key': key } : {}),
            },
            body: JSON.stringify({ chatId: phone, text }),
            signal: AbortSignal.timeout(6000),
          });
          if (res.ok) {
            sendResult = await res.json();
            break;
          }
        } catch (_) {}
      }
      if (sendResult) {
        return NextResponse.json({ success: true, action, result: sendResult });
      }
      return NextResponse.json({ success: false, error: 'Failed to send test message via active gateway' }, { status: 502 });
    }

    // 4. Gateway Direct Action: simulate_broker
    if (action === 'simulate_broker') {
      const endpoints = getCandidateEndpoints();
      let simResult: any = null;
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(`${endpoint}/api/harvester/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body?.text ? { text: body.text } : {}),
            signal: AbortSignal.timeout(4000),
          });
          if (res.ok) {
            simResult = await res.json();
            break;
          }
        } catch (_) {}
      }
      return NextResponse.json({ success: Boolean(simResult?.ok), action, result: simResult });
    }

    // 5. Batch queue item operations: retry, cancel
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((i: unknown) => typeof i === 'string') : [];
    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: 'ids array is required for batch operations' }, { status: 400 });
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
