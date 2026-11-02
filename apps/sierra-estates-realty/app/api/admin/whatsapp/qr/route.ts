import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * WHATSAPP QR PROXY — auth-guarded broker between the admin console and the
 * local 8-line OpenWA gateway (apps/agents/whatsapp-multi-session, port 2785).
 *
 * The browser cannot reach the owner's local gateway directly (it sits on the
 * Windows workstation, exposed via a Cloudflare tunnel), so every QR asset is
 * proxied through this route with the gateway API key attached server-side.
 *
 * GET /api/admin/whatsapp/qr?line=line-3
 *     → JSON { success, line, status, hasQr, qrDataUrl, phone, error? }
 *       qrDataUrl is a data:image/png;base64 URL from the gateway, ready for
 *       <img src>. Refreshed by the client every ~5s while pairing.
 *
 * GET /api/admin/whatsapp/qr?target=pair-info
 *     → JSON { success, pairUrl, reachable } — the public /pair portal URL of
 *       the gateway (mobile pairing page), as captured by the worker itself.
 *
 * GET /api/admin/whatsapp/qr?target=pair-link
 *     → PNG passthrough of a QR code that encodes the /pair portal URL, so the
 *       admin sidebar can render "scan to open the pairing portal on a phone"
 *       exactly like the ITQANE diagnostic reference layout.
 */

function normalizeUrl(raw: string, defaultPort = '2785'): string {
  if (!raw) return '';
  let url = raw.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }
  try {
    const parsed = new URL(url);
    if (!parsed.port && (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost')) {
      parsed.port = String(defaultPort);
    }
    return parsed.origin;
  } catch {
    return url.replace(/\/+$/, '');
  }
}

function getCandidateEndpoints(): string[] {
  const endpoints: string[] = [];
  if (process.env.WHATSAPP_API_URL) endpoints.push(normalizeUrl(process.env.WHATSAPP_API_URL));
  if (process.env.WHATSAPP_GATEWAY_URL) endpoints.push(normalizeUrl(process.env.WHATSAPP_GATEWAY_URL));
  if (process.env.CLOUDFLARE_TUNNEL_URL) endpoints.push(normalizeUrl(process.env.CLOUDFLARE_TUNNEL_URL));
  if (process.env.OPENWA_HOST) {
    const port = process.env.OPENWA_PORT || '2785';
    endpoints.push(normalizeUrl(`${process.env.OPENWA_HOST}:${port}`));
  }
  endpoints.push('http://127.0.0.1:2785');
  return Array.from(new Set(endpoints.filter(Boolean)));
}

function gatewayKey(): string {
  return process.env.OPENWA_ADMIN_API_KEY || process.env.WHATSAPP_API_KEY || 'sierra-admin-secret';
}

async function firstReachableEndpoint(): Promise<string | null> {
  const key = gatewayKey();
  for (const endpoint of getCandidateEndpoints()) {
    try {
      const res = await fetch(`${endpoint}/api/health`, {
        headers: { 'X-API-Key': key },
        signal: AbortSignal.timeout(3000),
        cache: 'no-store',
      });
      if (res.ok) return endpoint;
    } catch (_) {
      // try next candidate
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse('Authorized personnel only');

  try {
    const url = new URL(req.url);
    const line = url.searchParams.get('line');
    const target = url.searchParams.get('target');
    const key = gatewayKey();

    // ── Mode 1: pairing QR for a specific line ─────────────────────────────
    if (line) {
      const lineId = String(line).trim();
      if (!/^[a-zA-Z0-9_-]{1,32}$/.test(lineId)) {
        return NextResponse.json({ success: false, error: 'Invalid line id' }, { status: 400 });
      }

      const endpoint = await firstReachableEndpoint();
      if (!endpoint) {
        return NextResponse.json(
          { success: false, reachable: false, error: 'Gateway unreachable — start the local 8-line worker (port 2785) or its Cloudflare tunnel' },
          { status: 502 },
        );
      }

      const res = await fetch(`${endpoint}/api/sessions/${encodeURIComponent(lineId)}`, {
        headers: { 'X-API-Key': key },
        signal: AbortSignal.timeout(4000),
        cache: 'no-store',
      });
      if (!res.ok) {
        return NextResponse.json(
          { success: false, reachable: true, error: `Gateway returned HTTP ${res.status} for ${lineId}` },
          { status: 502 },
        );
      }
      const detail = await res.json().catch(() => null);
      if (!detail) {
        return NextResponse.json({ success: false, reachable: true, error: 'Malformed gateway response' }, { status: 502 });
      }

      return NextResponse.json({
        success: true,
        reachable: true,
        endpoint,
        line: lineId,
        status: String(detail.status || 'unknown'),
        hasQr: Boolean(detail.hasQr || detail.qrDataUrl),
        qrDataUrl: detail.qrDataUrl ? String(detail.qrDataUrl) : null,
        phone: detail.phone ? String(detail.phone) : null,
        fetchedAt: new Date().toISOString(),
      });
    }

    // ── Mode 2: /pair portal info (JSON) ───────────────────────────────────
    if (target === 'pair-info') {
      const endpoint = await firstReachableEndpoint();
      if (!endpoint) {
        return NextResponse.json({ success: false, reachable: false, pairUrl: null }, { status: 200 });
      }
      try {
        const res = await fetch(`${endpoint}/api/pair/info`, {
          headers: { 'X-API-Key': key },
          signal: AbortSignal.timeout(3000),
          cache: 'no-store',
        });
        if (res.ok) {
          const info = await res.json().catch(() => null);
          if (info && info.pairUrl) {
            return NextResponse.json({ success: true, reachable: true, pairUrl: String(info.pairUrl) });
          }
        }
      } catch (_) {
        // fall through to endpoint-derived guess
      }
      return NextResponse.json({ success: true, reachable: true, pairUrl: `${endpoint}/pair` });
    }

    // ── Mode 3: /pair portal link QR (PNG passthrough) ─────────────────────
    if (target === 'pair-link') {
      const endpoint = await firstReachableEndpoint();
      if (!endpoint) {
        return new NextResponse('', { status: 502, headers: { 'Content-Type': 'image/png' } });
      }
      const res = await fetch(`${endpoint}/api/pair/link-qr.png`, {
        headers: { 'X-API-Key': key },
        signal: AbortSignal.timeout(4000),
        cache: 'no-store',
      });
      if (!res.ok || !res.body) {
        return new NextResponse('', { status: 502, headers: { 'Content-Type': 'image/png' } });
      }
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Missing ?line= or ?target= parameter' },
      { status: 400 },
    );
  } catch (error: any) {
    logger.error('[WHATSAPP_QR_PROXY]', error?.message);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
