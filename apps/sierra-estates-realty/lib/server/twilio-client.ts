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
  // 1. Direct custom WhatsApp Gateway (AWS EC2 / Lambda / Baileys / WPP / Open-WA)
  if (WHATSAPP_API_URL) {
    try {
      const endpoint = WHATSAPP_API_URL.endsWith('/send') || WHATSAPP_API_URL.endsWith('/messages')
        ? WHATSAPP_API_URL
        : `${WHATSAPP_API_URL.replace(/\/+$/, '')}/send`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (WHATSAPP_API_TOKEN) {
        headers['Authorization'] = `Bearer ${WHATSAPP_API_TOKEN}`;
        headers['x-api-key'] = WHATSAPP_API_TOKEN;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: toPhone.replace(/^whatsapp:/, ''),
          from: fromPhone.replace(/^whatsapp:/, ''),
          body,
          text: body,
          message: body,
          statusCallback,
        }),
        signal: AbortSignal.timeout(12000),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(`WhatsApp Gateway (${endpoint}) failed with status ${res.status}: ${JSON.stringify(data)}`);
      }

      const sid = data.id || data.sid || data.messageId || `WA_GW_${Date.now()}`;
      logger.info(`[WhatsApp Gateway] Message sent successfully to ${toPhone} (SID: ${sid})`);
      return { sid, simulated: false };
    } catch (err: any) {
      logger.error(`[WhatsApp Gateway] Error sending to ${toPhone}:`, err);
      // If Twilio is also configured, let it fall through, otherwise rethrow
      if (!twilioConfigured) {
        throw err;
      }
      logger.warn(`[WhatsApp Gateway] Falling back to Twilio for ${toPhone}...`);
    }
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
