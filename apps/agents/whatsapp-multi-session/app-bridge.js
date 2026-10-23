'use strict';

/**
 * Sierra Estates — App Bridge (inbound webhook forwarder + heartbeat)
 * ─────────────────────────────────────────────────────────────────────────
 * Wires the 8-line worker into the Sierra Estates production app so inbound
 * WhatsApp traffic flows WITHOUT the old EC2 gateway box:
 *
 *   1. WEBHOOK FORWARDING — every inbound message (DM or group) is POSTed to
 *      the app's webhook in the exact OpenWA envelope contract the route
 *      already parses:
 *        { event: 'message.received', sessionId, data: { id, chatId, body,
 *          type, sender, hasMedia, mimetype, ... } }
 *      Authenticated with the shared secret header `x-sbr-secret-key`.
 *      The app flattens the envelope once, records a 'syncing' heartbeat,
 *      routes DMs to the Scribe/Laila conversation layer, and silently skips
 *      auto-replies inside broker groups (its own policy — forward everything
 *      and let the app decide).
 *
 *   2. HEARTBEAT — while at least one line is READY the worker pulses
 *      POST /api/whatsapp/heartbeat every 60 s (`status: 'alive'` → recorded
 *      as 'active'). Zero READY lines ⇒ no pulses ⇒ /api/whatsapp/health
 *      honestly goes `stale` — the heartbeat never lies about inbound being
 *      up when no line is paired.
 *
 * Configuration (worker .env — see .env.example):
 *   SE_APP_WEBHOOK_URL   Target webhook. DEFAULT: the ADMIN production domain
 *                        (https://admin.sierra-estates.net/api/webhooks/whatsapp)
 *                        because SBR_SECRET_KEY is project-scoped and the two
 *                        Vercel projects hold DIFFERENT values — the ADMIN
 *                        value (sierra-sec…) is the one inbound has always
 *                        used. Do NOT point this at the client-portal domain
 *                        unless you deliberately re-keyed that project.
 *   SBR_SECRET_KEY       Shared secret for the x-sbr-secret-key header. Must
 *                        be the ADMIN project's value (Vercel → admin-dashboard
 *                        → Settings → Environment Variables).
 *   SE_HEARTBEAT_URL     DEFAULT: https://sierra-estates.net/api/whatsapp/heartbeat
 *   SE_BRIDGE_DISABLE    Set to "1" to disable forwarding + heartbeat.
 *   SE_BRIDGE_TIMEOUT_MS Per-request timeout (default 10000).
 *
 * Reliability contract:
 *   · Fire-and-forget — forwarding NEVER throws into the harvester/message
 *     path; failures are logged and retried (3 attempts, capped backoff).
 *   · No blocking — an unreachable app can never stall WhatsApp message
 *     processing (timeout-bounded, unawaited from the hot path).
 *   · Idempotency — the app deduplicates by message id (Phase 2), so a
 *     retried forward is safe.
 */

const DEFAULT_WEBHOOK_URL = 'https://admin.sierra-estates.net/api/webhooks/whatsapp';
const DEFAULT_HEARTBEAT_URL = 'https://sierra-estates.net/api/whatsapp/heartbeat';
const HEARTBEAT_INTERVAL_MS = 60_000;
const FORWARD_RETRIES = 3;
const FORWARD_BACKOFF_MS = [500, 2000, 8000];

const DISABLED = process.env.SE_BRIDGE_DISABLE === '1';
const WEBHOOK_URL = process.env.SE_APP_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
const HEARTBEAT_URL = process.env.SE_HEARTBEAT_URL || DEFAULT_HEARTBEAT_URL;
const SECRET = process.env.SBR_SECRET_KEY || '';
const TIMEOUT_MS = parseInt(process.env.SE_BRIDGE_TIMEOUT_MS || '10000', 10);

const state = {
  forwarded: 0,
  failed: 0,
  heartbeatsOk: 0,
  heartbeatsFailed: 0,
  lastForwardAt: null,
  lastForwardError: null,
  lastHeartbeatAt: null,
  lastHeartbeatStatus: null,
  heartbeatStarted: false,
  warnNoSecretLogged: false,
};

/** POST a JSON body to a URL with the shared-secret header. Never throws. */
async function postJson(url, body, extraHeaders = {}) {
  const headers = { 'content-type': 'application/json', ...extraHeaders };
  if (SECRET) headers['x-sbr-secret-key'] = SECRET;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text().catch(() => '');
    return { ok: res.ok, status: res.status, body: text.slice(0, 300) };
  } finally {
    clearTimeout(timer);
  }
}

/** Map an @open-wa message object onto the app's OpenWA envelope contract. */
function toEnvelope(sessionId, msg) {
  const data = {
    id: typeof msg.id === 'string' ? msg.id : (msg.id && msg.id.id) || null,
    chatId: msg.chatId || null,
    body: msg.body || '',
    type: msg.type || 'chat',
    sender: msg.from
      ? { id: typeof msg.from === 'string' ? msg.from : (msg.from && msg.from._serialized) || null,
          pushname: msg.sender && msg.sender.pushName ? msg.sender.pushName : undefined }
      : (msg.sender || null),
    from: msg.from || null,
    author: msg.author || undefined,          // group participant (open-wa keeps it here)
    chatName: msg.chatName || undefined,
    hasMedia: msg.hasMedia === true || !!msg.mimetype,
    mimetype: msg.mimetype || undefined,
    caption: msg.caption || undefined,
    quotedMsgId: (msg.quotedMsg && msg.quotedMsg.id && (msg.quotedMsg.id.id || msg.quotedMsg.id))
      || (typeof msg.quotedMsgId === 'string' ? msg.quotedMsgId : undefined),
    timestamp: msg.timestamp || Math.floor(Date.now() / 1000),
    isGroupMsg: msg.isGroupMsg === true,
  };
  return { event: 'message.received', sessionId, data };
}

/**
 * Forward one inbound message. Fire-and-forget with bounded retry.
 * @returns {Promise<boolean>} true if delivered (or disabled/unconfigured).
 */
async function forwardMessage(sessionId, msg) {
  if (DISABLED) return false;
  if (!msg || (!msg.body && !msg.caption && !msg.hasMedia && !msg.mimetype)) return false;
  if (!SECRET && !state.warnNoSecretLogged) {
    state.warnNoSecretLogged = true;
    console.warn('[app-bridge] SBR_SECRET_KEY is not set — inbound forwarding will 401/503 at the app. Set the ADMIN project value in the worker .env.');
  }
  const envelope = toEnvelope(sessionId, msg);
  let attempt = 0;
  while (attempt < FORWARD_RETRIES) {
    try {
      const out = await postJson(WEBHOOK_URL, envelope);
      if (out.ok) {
        state.forwarded++;
        state.lastForwardAt = new Date().toISOString();
        state.lastForwardError = null;
        return true;
      }
      // 4xx = the app rejected the request (auth/shape) — retrying cannot fix it.
      if (out.status >= 400 && out.status < 500) {
        state.failed++;
        state.lastForwardError = `HTTP ${out.status}: ${out.body}`;
        console.error(`[app-bridge] Webhook rejected (${out.status}) — check SBR_SECRET_KEY (must be the ADMIN project value): ${out.body}`);
        return false;
      }
      throw new Error(`HTTP ${out.status}`);
    } catch (err) {
      attempt++;
      state.failed++;
      state.lastForwardError = String(err.message || err);
      if (attempt < FORWARD_RETRIES) {
        const wait = FORWARD_BACKOFF_MS[Math.min(attempt - 1, FORWARD_BACKOFF_MS.length - 1)];
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  console.error(`[app-bridge] Forward failed after ${FORWARD_RETRIES} attempts (${sessionId} → ${WEBHOOK_URL}): ${state.lastForwardError}`);
  return false;
}

/**
 * Start the heartbeat loop. Pulse only while `isAlive()` returns true
 * (caller: at least one session READY) — see the honesty contract above.
 */
function startHeartbeat(isAlive) {
  if (DISABLED || state.heartbeatStarted) return;
  state.heartbeatStarted = true;
  const beat = async () => {
    if (!isAlive()) { state.lastHeartbeatStatus = 'no-ready-lines'; return; }
    try {
      const out = await postJson(HEARTBEAT_URL, { status: 'alive', ts: new Date().toISOString() });
      state.lastHeartbeatAt = new Date().toISOString();
      if (out.ok) {
        state.heartbeatsOk++;
        state.lastHeartbeatStatus = 'ok';
        if (state.heartbeatsOk === 1) {
          console.log(`[app-bridge] Heartbeat live → ${HEARTBEAT_URL}`);
        }
      } else {
        state.heartbeatsFailed++;
        state.lastHeartbeatStatus = `HTTP ${out.status}`;
        console.error(`[app-bridge] Heartbeat ${out.status}: ${out.body}`);
      }
    } catch (err) {
      state.heartbeatsFailed++;
      state.lastHeartbeatStatus = String(err.message || err);
    }
  };
  setInterval(beat, HEARTBEAT_INTERVAL_MS);
  setTimeout(beat, 3000); // first pulse shortly after boot
}

function status() {
  return {
    enabled: !DISABLED,
    webhookUrl: WEBHOOK_URL,
    heartbeatUrl: HEARTBEAT_URL,
    secretConfigured: !!SECRET,
    ...state,
    heartbeatStarted: state.heartbeatStarted,
  };
}

module.exports = { forwardMessage, startHeartbeat, status, toEnvelope };
