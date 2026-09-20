import 'server-only';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

/**
 * Minimal Twilio WhatsApp sender over the REST API (no SDK dependency, mirroring
 * lib/server/n8n-client.ts). Sends a WhatsApp message from one of the dedicated
 * sender numbers.
 *
 * Provider priority (ops decision 2026-09: "try Twilio first"):
 *   1. Twilio WhatsApp REST API   — primary, when real credentials are present
 *   2. OpenWA / custom gateway    — WHATSAPP_API_URL (EC2 WhatsApp Web bridge)
 *   3. Graceful simulation        — dev/preview only, never throws
 *
 * Each real provider degrades to the next on failure, so a Twilio outage or a
 * misconfigured Messaging Service SID can never stall the queue worker.
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;

// Known .env.example placeholder SIDs. Treating them as configured made every
// send burn a 10s timeout on a guaranteed 401 before the gateway fallback ran.
const KNOWN_PLACEHOLDER_ACCOUNT_SIDS = new Set(['AC1234567890abcdef1234567890abcdef']);
const KNOWN_PLACEHOLDER_MESSAGING_SIDS = new Set(['MG1234567890abcdef1234567890abcdef']);

export const twilioConfigured = Boolean(
  TWILIO_ACCOUNT_SID &&
    TWILIO_AUTH_TOKEN &&
    !KNOWN_PLACEHOLDER_ACCOUNT_SIDS.has(TWILIO_ACCOUNT_SID),
);
export const customWhatsAppGatewayConfigured = Boolean(WHATSAPP_API_URL);

/** Messaging Service SID to use, or undefined when it is a placeholder. */
function effectiveMessagingServiceSid(): string | undefined {
  if (!TWILIO_MESSAGING_SERVICE_SID) return undefined;
  if (KNOWN_PLACEHOLDER_MESSAGING_SIDS.has(TWILIO_MESSAGING_SERVICE_SID)) return undefined;
  return TWILIO_MESSAGING_SERVICE_SID;
}

function publicSiteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
}

/**
 * The exact URL handed to Twilio as StatusCallback when sending. The status
 * webhook route validates X-Twilio-Signature against this SAME url — Twilio's
 * signature covers the literal callback URL, so the two call sites must never
 * drift apart. Centralized here for that reason; don't inline it elsewhere.
 * Returns undefined when no public base URL is configured (e.g. local dev).
 */
export function getTwilioStatusCallbackUrl(): string | undefined {
  const base = publicSiteBase();
  return base.startsWith('http') ? `${base}/api/webhooks/twilio-status` : undefined;
}

/**
 * The exact URL configured in the Twilio Console / Messaging Service as the
 * inbound "incoming message" webhook for each of the 4 WABA senders. The
 * twilio-inbound route validates X-Twilio-Signature against this SAME url —
 * same drift hazard as the status callback above. Centralized for that reason.
 */
export function getTwilioInboundWebhookUrl(): string | undefined {
  const base = publicSiteBase();
  return base.startsWith('http') ? `${base}/api/webhooks/twilio-inbound` : undefined;
}

/**
 * Validates Twilio's X-Twilio-Signature on an inbound webhook request.
 * Computes HMAC-SHA1 over the sorted parameter payload using constant-time comparison.
 *
 * @param url     The exact URL Twilio was given (getTwilioStatusCallbackUrl()),
 *                NOT the request's own URL — proxies/rewrites can alter that.
 */
export function isValidTwilioSignature(
  signatureHeader: string | null,
  url: string,
  params: Record<string, string>,
  authTokenOverride?: string,
): boolean {
  const token = authTokenOverride || process.env.TWILIO_AUTH_TOKEN;
  if (!signatureHeader || !token) return false;
  try {
    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], url);
    const expected = crypto
      .createHmac('sha1', token)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');
    const sigBuf = Buffer.from(signatureHeader);
    const expBuf = Buffer.from(expected);
    return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
  } catch (err) {
    logger.error('Twilio signature validation error:', err);
    return false;
  }
}

export interface TwilioSendResult {
  sid: string;
  simulated: boolean;
}

function toWhatsApp(addr: string): string {
  return addr.startsWith('whatsapp:') ? addr : `whatsapp:${addr}`;
}

/**
 * @param fromPhone  E.164 sender (one of the 4 WABA numbers). Ignored when a
 *                   Messaging Service SID is configured (Twilio picks the sender).
 * @param toPhone    E.164 recipient.
 * @param body       Message text.
 * @param statusCallback  Optional URL Twilio posts delivery/read status to.
 */
export async function sendWhatsApp(
  fromPhone: string,
  toPhone: string,
  body: string,
  statusCallback?: string,
): Promise<TwilioSendResult> {
  // 1. Twilio FIRST (ops decision: try Twilio before the OpenWA gateway).
  if (twilioConfigured) {
    try {
      const form = new URLSearchParams();
      form.set('To', toWhatsApp(toPhone));
      const messagingServiceSid = effectiveMessagingServiceSid();
      if (messagingServiceSid) {
        form.set('MessagingServiceSid', messagingServiceSid);
      } else {
        form.set('From', toWhatsApp(fromPhone));
      }
      form.set('Body', body);
      if (statusCallback) form.set('StatusCallback', statusCallback);

      const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: form.toString(),
          signal: AbortSignal.timeout(10000),
        },
      );

      const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string; code?: number };
      if (!res.ok || !data.sid) {
        throw new Error(`Twilio send failed (${res.status}): ${data.message || 'unknown error'}`);
      }
      return { sid: data.sid, simulated: false };
    } catch (err: any) {
      // Degrade to the next provider instead of failing the job — the queue
      // worker treats a throw as a permanent job failure.
      logger.warn(`[whatsapp-client] Twilio send failed, falling back to gateway: ${err?.message}`);
    }
  }

  // 2. Direct custom WhatsApp Gateway (AWS EC2 OpenWA / Custom URL) — env-configured only
  const openwaUrl = WHATSAPP_API_URL || (process.env.OPENWA_HOST ? `http://${process.env.OPENWA_HOST}:${process.env.OPENWA_PORT || '3000'}` : undefined);
  const openwaKey = WHATSAPP_API_TOKEN || process.env.OPENWA_ADMIN_API_KEY;
  const openwaSession = process.env.OPENWA_SESSION_ID || 'session-default';

  if (!openwaUrl || !openwaKey) {
    logger.warn('[OpenWA Gateway] Not configured (OPENWA_HOST/OPENWA_ADMIN_API_KEY unset) — skipping gateway channel');
  }

  try {
    if (!openwaUrl || !openwaKey) {
      throw new Error('gateway_not_configured');
    }
    const rawDigits = toPhone.replace(/\D/g, '');
    const chatId = rawDigits.includes('@') ? rawDigits : `${rawDigits}@c.us`;
    const openwaEndpoint = `${openwaUrl.replace(/\/+$/, '')}/api/sessions/${openwaSession}/messages/send-text`;

    const res = await fetch(openwaEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': openwaKey,
      },
      body: JSON.stringify({
        chatId,
        text: body,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const sid = data.id || data.messageId || `OPENWA_${Date.now()}`;
      logger.info(`[OpenWA Gateway] Message sent successfully to ${toPhone} (SID: ${sid})`);
      return { sid, simulated: false };
    }

    const errData = await res.json().catch(() => ({}));
    logger.warn(`[OpenWA Gateway] (${res.status}): ${errData.message || 'client not connected'}`);
  } catch (err: any) {
    logger.debug(`[OpenWA Gateway] Connection failed: ${err.message}`);
  }

  // 3. Fallback: Graceful Simulation in dev/preview
  logger.warn(`⚠️ [whatsapp-client] Neither Twilio nor custom WHATSAPP_API_URL delivered — simulating send to ${toPhone}`);
  return { sid: `SIMULATED_${Date.now()}_${Math.floor(Math.random() * 1e6)}`, simulated: true };
}
