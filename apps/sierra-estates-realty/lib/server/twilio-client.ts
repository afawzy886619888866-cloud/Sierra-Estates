import 'server-only';
import { validateRequest } from 'twilio';
import { logger } from '@/lib/logger';

/**
 * Minimal Twilio WhatsApp sender over the REST API (no SDK dependency, mirroring
 * lib/server/n8n-client.ts). Sends a WhatsApp message from one of the dedicated
 * sender numbers. Degrades gracefully: when credentials are absent it logs and
 * returns a simulated SID instead of throwing, so the queue worker still drains
 * in dev/preview without live Twilio.
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;

export const twilioConfigured = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN);

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
 * Delegates to the official `twilio` package's validateRequest — Twilio's own
 * docs explicitly recommend against hand-rolling this HMAC check, and there's
 * no published test vector to verify a homegrown implementation against.
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 *
 * @param url     The exact URL Twilio was given (getTwilioStatusCallbackUrl()),
 *                NOT the request's own URL — proxies/rewrites can alter that.
 */
export function isValidTwilioSignature(
  signatureHeader: string | null,
  url: string,
  params: Record<string, string>,
): boolean {
  if (!signatureHeader || !TWILIO_AUTH_TOKEN) return false;
  return validateRequest(TWILIO_AUTH_TOKEN, signatureHeader, url, params);
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
  if (!twilioConfigured) {
    logger.warn(`⚠️ [twilio] Not configured — simulating send to ${toPhone}`);
    return { sid: `SIMULATED_${Date.now()}_${Math.floor(Math.random() * 1e6)}`, simulated: true };
  }

  const form = new URLSearchParams();
  form.set('To', toWhatsApp(toPhone));
  if (TWILIO_MESSAGING_SERVICE_SID) {
    form.set('MessagingServiceSid', TWILIO_MESSAGING_SERVICE_SID);
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
}
