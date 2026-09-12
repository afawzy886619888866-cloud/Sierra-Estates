import 'server-only';
import crypto from 'crypto';
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
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;

export const twilioConfigured = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN);
export const customWhatsAppGatewayConfigured = Boolean(WHATSAPP_API_URL);

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
  // 1. Direct custom WhatsApp Gateway (AWS EC2 OpenWA / Custom URL)
  const openwaUrl = WHATSAPP_API_URL || `http://${process.env.OPENWA_HOST || '18.232.148.172'}:${process.env.OPENWA_PORT || '3000'}`;
  const openwaKey = WHATSAPP_API_TOKEN || process.env.OPENWA_ADMIN_API_KEY || 'owa_k1_ced32b1c630618c321e9249439b7da90e5408506b7979a7da3e3ff71d375dbbe';
  const openwaSession = process.env.OPENWA_SESSION_ID || '3e5c5f78-da22-4793-bd51-d648b552cd17';

  try {
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

  // 2. Twilio WhatsApp REST API
  if (twilioConfigured) {
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

  // 3. Fallback: Graceful Simulation in dev/preview
  logger.warn(`⚠️ [whatsapp-client] Neither custom WHATSAPP_API_URL nor Twilio configured — simulating send to ${toPhone}`);
  return { sid: `SIMULATED_${Date.now()}_${Math.floor(Math.random() * 1e6)}`, simulated: true };
}
