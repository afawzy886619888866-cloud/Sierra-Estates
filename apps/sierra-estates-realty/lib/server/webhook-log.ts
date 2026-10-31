/**
 * Unified inbound webhook ledger (public.webhook_logs — migration 037).
 *
 * Every call of /api/webhooks/whatsapp and /api/telegram/webhook writes one
 * row here: source, event type, payload, signature validity and the final
 * processing status + latency. The /admin/bots operations desk tails the
 * table live over Supabase Realtime, which is why the writes must never —
 * under any circumstance — break the webhook itself:
 *
 *   · every function is best-effort: failures are logged and swallowed;
 *   · the @sierra-estates/db import is DYNAMIC, so route-level test mocks
 *     that stub only specific exports (or none of them) are unaffected;
 *   · the payload is size-capped and redacted (no auth material is stored).
 */

import type { NextRequest } from 'next/server';

/** Hard cap on the JSON payload we persist per webhook event. */
const MAX_PAYLOAD_CHARS = 24_000;

/** Header names whose values must never reach the ledger. */
const REDACTED_HEADER_KEYS = new Set([
  'authorization',
  'x-hub-signature-256',
  'x-hub-signature',
  'x-telegram-bot-api-secret-token',
  'x-api-key',
  'x-vercel-signature',
  'cookie',
]);

export type WebhookSource = 'whatsapp' | 'telegram' | 'other';

export interface WebhookLogEntry {
  source: WebhookSource;
  eventType?: string;
  externalId?: string;
  payload?: unknown;
  signatureValid?: boolean;
}

function redactHeaders(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    out[key] = REDACTED_HEADER_KEYS.has(key.toLowerCase()) ? '[redacted]' : value;
  });
  return out;
}

/** Clone-safe JSON preview of the request body (never consumes the stream). */
async function readPayloadPreview(req: NextRequest): Promise<unknown> {
  try {
    const clone = req.clone();
    const text = await clone.text();
    if (!text) return null;
    const capped = text.length > MAX_PAYLOAD_CHARS ? text.slice(0, MAX_PAYLOAD_CHARS) : text;
    try {
      return JSON.parse(capped);
    } catch {
      return { raw: capped };
    }
  } catch {
    return null;
  }
}

/**
 * Ledger INSERT at webhook entry. Returns the row id (or null when the ledger
 * is unavailable — the caller then simply skips the finalize step).
 */
export async function logWebhookReceived(
  req: NextRequest,
  entry: WebhookLogEntry,
): Promise<string | null> {
  try {
    const payload = (await readPayloadPreview(req)) ?? {};
    const body = {
      source: entry.source,
      eventType: entry.eventType ?? req.headers.get('x-webhook-event') ?? 'message',
      externalId: entry.externalId ?? null,
      payload: {
        ...(payload && typeof payload === 'object' ? payload : { raw: payload }),
        _sierraMeta: {
          method: req.method,
          url: req.nextUrl.pathname + req.nextUrl.search,
          headers: redactHeaders(req),
        },
      },
      signatureValid: entry.signatureValid ?? null,
      status: 'received' as const,
    };

    const db = await import('@sierra-estates/db');
    const created = await db.insertRecord<{ id: string }>('webhook_logs', body);
    return created?.id ?? null;
  } catch (err) {
    console.warn(
      `[webhook-log] ledger insert skipped (${entry.source}):`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export type WebhookFinalStatus = 'processed' | 'duplicate' | 'rejected' | 'error';

/**
 * Ledger UPDATE after the route decided its response. `startedAt` feeds the
 * stored latency_ms so the operations desk can spot slow provider retries.
 */
export async function finalizeWebhookLog(
  logId: string | null,
  status: WebhookFinalStatus,
  startedAt: number,
  error?: unknown,
): Promise<void> {
  if (!logId) return;
  try {
    const db = await import('@sierra-estates/db');
    await db.updateRecord('webhook_logs', logId, {
      status,
      latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
      error:
        error === undefined || error === null
          ? null
          : error instanceof Error
            ? error.message.slice(0, 900)
            : String(error).slice(0, 900),
    });
  } catch (err) {
    console.warn(
      `[webhook-log] ledger finalize skipped (${logId}):`,
      err instanceof Error ? err.message : err,
    );
  }
}
