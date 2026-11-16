import 'server-only';

/**
 * OPENWA MEDIA ADAPTER (Phase 2 — photo/media support)
 *
 * Explicit adapter interface for downloading real attached media from the
 * OpenWA (wa-multi-session / whatsapp-web.js) gateway.
 *
 * Why an adapter: the repo documents the gateway's send/QR/pairing/settings
 * endpoints (services/openwa/README.md) but NOT a media-download endpoint,
 * and the deployed version's exact media API cannot be verified from code.
 * The master execution command requires: "If media download requires an
 * unsupported or unavailable provider capability, finish the code around an
 * explicit adapter interface, test all achievable paths, and report the
 * exact live blocker."
 *
 * Supported TODAY without any remote capability:
 *  - gateway payloads that already embed base64 media (envelope `media`
 *    field / `mediaBase64`) — stored immediately;
 *  - the EC2 harvester path (owners-harvester posts base64 directly to
 *    /api/ingest/whatsapp), which already works.
 *
 * Attempted remotely (ordered by likelihood for wa-multi-session):
 *  GET {base}/api/sessions/{sid}/messages/{messageId}/media
 *  GET {base}/api/sessions/{sid}/messages/{messageId}
 * A 404/405 on both is reported as `unsupported` — an explicit, honest
 * blocker surfaced to the caller instead of a fabricated photo.
 */

import { logger } from '@/lib/logger';

export interface DownloadedMedia {
  data: string;      // base64
  mimeType: string;
}

export type MediaDownloadResult =
  | { status: 'ok'; media: DownloadedMedia[] }
  | { status: 'not_present' }
  | { status: 'unsupported'; detail: string }
  | { status: 'error'; detail: string };

function gatewayBase(): string | null {
  const host = process.env.OPENWA_HOST || process.env.WHATSAPP_API_URL;
  if (!host) return null;
  const base = host.replace(/\/+$/, '');
  return /^https?:\/\//.test(base) ? base : `http://${base}`;
}

function gatewayKey(): string | null {
  return process.env.WHATSAPP_API_TOKEN || process.env.OPENWA_ADMIN_API_KEY || null;
}

/** Extract media already embedded in an OpenWA message payload, if any. */
export function embeddedMediaFromEnvelope(data: Record<string, any>): DownloadedMedia[] {
  const out: DownloadedMedia[] = [];
  const candidates = [data?.media, data?.mediaBase64, data?.base64];
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 64) {
      const b64 = c.includes(',') ? c.split(',').pop()! : c;
      out.push({ data: b64, mimeType: data?.mimetype || data?.mediaMimetype || 'image/jpeg' });
    }
  }
  return out;
}

/**
 * Attempt to download the real attached media for a message id from the
 * gateway. Tries the known wa-multi-session endpoint shapes; anything the
 * deployed gateway does not expose is reported as `unsupported` (the exact
 * live blocker), never as a fake download.
 */
export async function downloadOpenwaMedia(
  messageId: string,
  sessionId?: string | null,
): Promise<MediaDownloadResult> {
  const base = gatewayBase();
  const key = gatewayKey();
  if (!base || !key) {
    return { status: 'unsupported', detail: 'OPENWA_HOST / WHATSAPP_API_TOKEN not configured' };
  }
  const sid = sessionId || process.env.OPENWA_SESSION_ID || 'sierra-main';
  const paths = [
    `/api/sessions/${encodeURIComponent(sid)}/messages/${encodeURIComponent(messageId)}/media`,
    `/api/sessions/${encodeURIComponent(sid)}/messages/${encodeURIComponent(messageId)}`,
  ];

  const errors: string[] = [];
  for (const p of paths) {
    try {
      const res = await fetch(`${base}${p}`, {
        headers: { 'X-API-Key': key },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.status === 404 || res.status === 405) {
        errors.push(`${p} → ${res.status}`);
        continue;
      }
      if (!res.ok) {
        errors.push(`${p} → ${res.status}`);
        continue;
      }
      const contentType = res.headers.get('content-type') || '';
      if (/^image\//i.test(contentType)) {
        const buf = Buffer.from(await res.arrayBuffer());
        return { status: 'ok', media: [{ data: buf.toString('base64'), mimeType: contentType }] };
      }
      // JSON shape: look for common media fields.
      const body = (await res.json().catch(() => ({}))) as Record<string, any>;
      const found = embeddedMediaFromEnvelope(body?.data ?? body);
      if (found.length > 0) {
        return { status: 'ok', media: found };
      }
      errors.push(`${p} → 200 without media payload`);
    } catch (err: any) {
      errors.push(`${p} → ${err?.message ?? 'connection failed'}`);
    }
  }

  logger.warn(`[OpenWAMediaAdapter] no usable media endpoint for message ${messageId}: ${errors.join('; ')}`);
  return {
    status: 'unsupported',
    detail: `gateway exposed no media-download endpoint for message ${messageId} (tried: ${errors.join('; ')})`,
  };
}
