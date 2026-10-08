import 'server-only';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

/**
 * Minimal Twilio WhatsApp sender over the REST API (no SDK dependency, mirroring
 * lib/server/n8n-client.ts). Sends a WhatsApp message from one of the dedicated
 * sender numbers.
 *
 * Provider priority (V3.0 master workflow, 2026-10):
 *   · WHATSAPP_PROVIDER=openwa  → the OpenWA gateway is PRIMARY and Twilio only
 *     runs as an outage fallback. This is the live production posture: the
 *     gateway on 54.89.162.250:2785 is the paired Sierra Estates number, and
 *     the Twilio vars are placeholders.
 *   · anything else (legacy "try Twilio first"):
 *     1. Twilio WhatsApp REST API — primary, when real credentials are present
 *     2. OpenWA / custom gateway  — WHATSAPP_API_URL (EC2 WhatsApp Web bridge)
 *     3. Graceful simulation      — dev/preview only, never throws
 *
 * Each real provider degrades to the next on failure, so a gateway outage or a
 * misconfigured Messaging Service SID can never stall the queue worker.
 */

export type WhatsAppSendProvider = 'openwa' | 'twilio' | 'simulated';

/**
 * Resolves the configured provider priority from WHATSAPP_PROVIDER.
 * 'openwa' → gateway-first (production posture). Any other/missing value keeps
 * the legacy Twilio-first order so existing preview/dev stacks do not flip.
 */
export function getConfiguredWhatsAppProvider(): 'openwa' | 'legacy-twilio-first' {
  return (process.env.WHATSAPP_PROVIDER || '').trim().toLowerCase() === 'openwa'
    ? 'openwa'
    : 'legacy-twilio-first';
}

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
  /** Which channel actually delivered — observability for the outbox UI. */
  provider?: WhatsAppSendProvider;
  /** Gateway session (line) that delivered, when provider=openwa. */
  session?: string;
}

// ─── OpenWA gateway sender (shared by the direct path AND the queue drain) ──

const openwaUrlConfigured = () =>
  WHATSAPP_API_URL ||
  (process.env.OPENWA_HOST ? `http://${process.env.OPENWA_HOST}:${process.env.OPENWA_PORT || '3000'}` : undefined);

// OpenWA v0.23.x: the message endpoints require the session UUID, while
// OPENWA_SESSION_ID is operator-facing and usually a NAME ('session-default').
// Resolve name -> UUID once per process (cache-busted on 400 so a re-created
// gateway database picks up the new UUID transparently).
let openwaSessionUuidCache: string | null = null;
const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// ─── 4-line sender pool (Oct 2026) ──
// Pool source, in order: explicit `sessions` argument (drain passes
// system_config whatsapp_outreach.gatewaySessions) → env OPENWA_SESSION_IDS
// (comma-separated names or UUIDs, matching the Lines sheet). Empty pool ⇒
// exactly the legacy single-session behavior below.
const OPENWA_POOL_CACHE_TTL_MS = 5 * 60_000;
const OPENWA_SESSION_BACKOFF_MS = 2 * 60_000;
let openwaPoolMapCache: { at: number; map: Map<string, string> } | null = null; // name → uuid
const openwaBenchedUntil = new Map<string, number>(); // uuid → retry-after epoch ms
let openwaPoolCursor = 0;

function openwaPoolCandidatesFromEnv(): string[] {
  return String(process.env.OPENWA_SESSION_IDS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
}

async function fetchOpenwaSessionMap(): Promise<Map<string, string>> {
  if (openwaPoolMapCache && Date.now() - openwaPoolMapCache.at < OPENWA_POOL_CACHE_TTL_MS) {
    return openwaPoolMapCache.map;
  }
  const map = new Map<string, string>();
  const openwaUrl = openwaUrlConfigured();
  const openwaKey = WHATSAPP_API_TOKEN || process.env.OPENWA_ADMIN_API_KEY;
  if (openwaUrl && openwaKey) {
    try {
      const res = await fetch(`${openwaUrl.replace(/\/+$/, '')}/api/sessions`, {
        headers: { 'X-API-Key': openwaKey },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const list = (await res.json().catch(() => [])) as Array<{ id?: string; name?: string }>;
        for (const s of Array.isArray(list) ? list : []) {
          if (s?.id && s?.name) map.set(s.name, s.id);
        }
      }
    } catch {
      // unresolved this run — callers degrade gracefully
    }
  }
  openwaPoolMapCache = { at: Date.now(), map };
  return map;
}

/** Names → UUIDs (unresolvable names are dropped with a warning, never guessed). */
async function resolveOpenwaSessionIds(candidates: string[]): Promise<string[]> {
  const out: string[] = [];
  const pending: string[] = [];
  for (const raw of candidates) {
    if (isUuid(raw)) out.push(raw);
    else pending.push(raw);
  }
  if (pending.length) {
    const map = await fetchOpenwaSessionMap();
    for (const name of pending) {
      const uuid = map.get(name);
      if (uuid) out.push(uuid);
      else logger.warn(`[OpenWA Gateway] pool session "${name}" not found on gateway — skipped`);
    }
  }
  return out;
}

async function resolveOpenwaSessionId(): Promise<string> {
  const openwaUrl = openwaUrlConfigured();
  const openwaKey = WHATSAPP_API_TOKEN || process.env.OPENWA_ADMIN_API_KEY;
  const openwaSession = process.env.OPENWA_SESSION_ID || 'session-default';
  if (isUuid(openwaSession)) return openwaSession;
  if (openwaSessionUuidCache) return openwaSessionUuidCache;
  if (!openwaUrl || !openwaKey) return openwaSession;
  try {
    const listRes = await fetch(`${openwaUrl.replace(/\/+$/, '')}/api/sessions`, {
      headers: { 'X-API-Key': openwaKey },
      signal: AbortSignal.timeout(8000),
    });
    if (!listRes.ok) return openwaSession;
    const list = (await listRes.json().catch(() => [])) as Array<{ id?: string; name?: string }>;
    const arr = Array.isArray(list) ? list : [];
    const found = arr.find((s) => s.name === openwaSession) || arr[0];
    if (found?.id) {
      openwaSessionUuidCache = found.id;
      return found.id;
    }
  } catch {
    // fall through — the direct send will surface the connection error
  }
  return openwaSession;
}

export interface GatewaySendResult {
  ok: boolean;
  sid?: string;
  error?: string;
  /** Session that actually carried the send (pool observability). */
  session?: string;
}

/**
 * Sends one text message through the OpenWA gateway (the paired Sierra
 * Estates device). Exported so the queue drain can use the exact same
 * session-resolution and error semantics as the direct fallback path.
 *
 * 4-line pool: when `sessions` (or OPENWA_SESSION_IDS) is configured the send
 * round-robins across healthy sessions — a session that answers 400 "not
 * active" or a 5xx is benched for 2 minutes and the next line takes over;
 * other 4xx failures are treated as permanent for that chatId (no pool burn).
 */
export async function sendViaOpenwaGateway(
  toPhone: string,
  body: string,
  sessions?: string[],
): Promise<GatewaySendResult> {
  const openwaUrl = openwaUrlConfigured();
  const openwaKey = WHATSAPP_API_TOKEN || process.env.OPENWA_ADMIN_API_KEY;
  if (!openwaUrl || !openwaKey) {
    return { ok: false, error: 'gateway_not_configured' };
  }

  try {
    const rawDigits = toPhone.replace(/\D/g, '');
    const chatId = rawDigits.includes('@') ? rawDigits : `${rawDigits}@c.us`;
    const sendBase = openwaUrl.replace(/\/+$/, '');
    const sendVia = async (sessionId: string) =>
      fetch(`${sendBase}/api/sessions/${sessionId}/messages/send-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': openwaKey,
        },
        body: JSON.stringify({ chatId, text: body }),
        signal: AbortSignal.timeout(8000),
      });

    // ── 4-line pool path ──
    const poolCandidates = sessions && sessions.length ? sessions : openwaPoolCandidatesFromEnv();
    if (poolCandidates.length) {
      const pool = await resolveOpenwaSessionIds(poolCandidates);
      if (!pool.length) {
        return { ok: false, error: 'pool sessions unresolvable on gateway' };
      }
      const now = Date.now();
      const healthy = pool.filter((id) => (openwaBenchedUntil.get(id) || 0) <= now);
      if (!healthy.length) {
        return { ok: false, error: 'all pool sessions benched (backoff active)' };
      }
      const start = openwaPoolCursor % healthy.length;
      const ordered = healthy.slice(start).concat(healthy.slice(0, start));
      let lastError: string | undefined;
      for (const uuid of ordered) {
        let res: Response;
        try {
          res = await sendVia(uuid);
        } catch (e: any) {
          lastError = e?.message || 'gateway connection failed';
          openwaBenchedUntil.set(uuid, now + OPENWA_SESSION_BACKOFF_MS);
          continue;
        }
        if (res.ok) {
          openwaPoolCursor++;
          const data = (await res.json().catch(() => ({}))) as { id?: string; messageId?: string };
          const sid = data.id || data.messageId || `OPENWA_${Date.now()}`;
          logger.info(`[OpenWA Gateway] Message sent to ${toPhone} via session ${uuid.slice(0, 8)} (SID: ${sid})`);
          return { ok: true, sid, session: uuid };
        }
        const errData = (await res.json().catch(() => ({}))) as { message?: string };
        const msg = `(${res.status}): ${errData.message || 'client not connected'}`;
        // 400 "not active" = this SESSION is down, not the chatId — bench it
        // and let the next line take the send.
        if (res.status === 400 && /not active|session/i.test(errData.message || msg)) {
          openwaBenchedUntil.set(uuid, now + OPENWA_SESSION_BACKOFF_MS);
          lastError = msg;
          continue;
        }
        if (res.status >= 400 && res.status < 500) {
          // Permanent for this chatId (bad number/opt-out etc.) — do NOT burn
          // the rest of the pool on it.
          return { ok: false, error: msg, session: uuid };
        }
        // 5xx / odd status: bench briefly, try the next line
        openwaBenchedUntil.set(uuid, now + OPENWA_SESSION_BACKOFF_MS);
        lastError = msg;
      }
      logger.warn(`[OpenWA Gateway] pool exhausted: ${lastError}`);
      return { ok: false, error: lastError || 'pool exhausted' };
    }

    // ── Legacy single-session path (unchanged) ──
    let res = await sendVia(await resolveOpenwaSessionId());

    // Session database may have been rebuilt since the UUID was cached — bust
    // the cache and re-resolve exactly once before giving up on the gateway.
    const openwaSession = process.env.OPENWA_SESSION_ID || 'session-default';
    if (!res.ok && res.status === 400 && !isUuid(openwaSession)) {
      openwaSessionUuidCache = null;
      res = await sendVia(await resolveOpenwaSessionId());
    }

    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as { id?: string; messageId?: string };
      const sid = data.id || data.messageId || `OPENWA_${Date.now()}`;
      logger.info(`[OpenWA Gateway] Message sent successfully to ${toPhone} (SID: ${sid})`);
      return { ok: true, sid };
    }

    const errData = (await res.json().catch(() => ({}))) as { message?: string };
    const msg = `(${res.status}): ${errData.message || 'client not connected'}`;
    logger.warn(`[OpenWA Gateway] ${msg}`);
    return { ok: false, error: msg };
  } catch (err: any) {
    logger.debug(`[OpenWA Gateway] Connection failed: ${err?.message}`);
    return { ok: false, error: err?.message || 'gateway connection failed' };
  }
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
 * @param opts       Optional extras. `gatewaySessions` lists the 4-line pool
 *                   (names or UUIDs) — typically system_config
 *                   whatsapp_outreach.gatewaySessions threaded from the drain.
 */
export async function sendWhatsApp(
  fromPhone: string,
  toPhone: string,
  body: string,
  statusCallback?: string,
  opts?: { gatewaySessions?: string[] },
): Promise<TwilioSendResult> {
  // 0. Gateway-FIRST posture (WHATSAPP_PROVIDER=openwa): the paired Sierra
  //    Estates device is the primary channel; Twilio degrades to fallback.
  if (getConfiguredWhatsAppProvider() === 'openwa') {
    const gw = await sendViaOpenwaGateway(toPhone, body, opts?.gatewaySessions);
    if (gw.ok) {
      return { sid: gw.sid!, simulated: false, provider: 'openwa', session: gw.session };
    }
    logger.warn(`[whatsapp-client] gateway-first send failed (${gw.error}) — trying Twilio fallback`);
  }

  // 1. Twilio (legacy primary, gateway-mode fallback).
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
      return { sid: data.sid, simulated: false, provider: 'twilio' };
    } catch (err: any) {
      // Degrade to the next provider instead of failing the job — the queue
      // worker treats a throw as a permanent job failure.
      logger.warn(`[whatsapp-client] Twilio send failed, falling back to gateway: ${err?.message}`);
    }
  }

  // 2. Gateway as FALLBACK in the legacy posture (already tried above when
  //    provider=openwa) — still honours the degrade chain.
  if (getConfiguredWhatsAppProvider() !== 'openwa') {
    const gw = await sendViaOpenwaGateway(toPhone, body, opts?.gatewaySessions);
    if (gw.ok) {
      return { sid: gw.sid!, simulated: false, provider: 'openwa', session: gw.session };
    }
  }

  // 3. Fallback: Graceful Simulation in dev/preview
  logger.warn(`⚠️ [whatsapp-client] Neither Twilio nor custom WHATSAPP_API_URL delivered — simulating send to ${toPhone}`);
  return { sid: `SIMULATED_${Date.now()}_${Math.floor(Math.random() * 1e6)}`, simulated: true, provider: 'simulated' };
}
