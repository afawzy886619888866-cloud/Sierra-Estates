'use strict';

/**
 * Sierra Estates — App & Workflow Runner Bridge (inbound forwarder + heartbeat)
 * ──────────────────────────────────────────────────────────────────────────────
 * Wires the multi-session WhatsApp gateway (:2785) into BOTH:
 *
 *   1. SIERRA APP WEBHOOK — every inbound message (DM or group) is POSTed to
 *      SE_APP_WEBHOOK_URL (default: https://admin.sierra-estates.net/api/webhooks/whatsapp)
 *      with shared secret header `x-sbr-secret-key`.
 *
 *   2. WORKFLOW RUNNER INBOUND (:2786/api/inbound) — every inbound message is
 *      simultaneously POSTed to SE_RUNNER_INBOUND_URL (default: http://127.0.0.1:2786/api/inbound)
 *      authenticated with `X-API-Key: RUNNER_API_KEY` so `workflows/lib/inbox.js`
 *      processes closed-loop owner outreach replies ("متاحة", "اتباعت", "إلغاء"),
 *      writes availability back to Google Sheets & Supabase, and logs broker drops.
 *
 *   3. PER-SESSION WEBHOOK SUBSCRIPTIONS — delivers to any subscriber registered
 *      via `POST /api/sessions/:sessionId/webhooks`.
 *
 *   4. HEARTBEAT — while at least one line is READY, pulses
 *      POST /api/whatsapp/heartbeat every 60 s (`status: 'alive'`).
 */

const DEFAULT_WEBHOOK_URL = 'https://admin.sierra-estates.net/api/webhooks/whatsapp';
const DEFAULT_HEARTBEAT_URL = 'https://sierra-estates.net/api/whatsapp/heartbeat';
const DEFAULT_RUNNER_INBOUND_URL = 'http://127.0.0.1:2786/api/inbound';
const HEARTBEAT_INTERVAL_MS = 60_000;
const FORWARD_RETRIES = 3;
const FORWARD_BACKOFF_MS = [500, 2000, 8000];

function bridgeConfig() {
  return {
    disabled: process.env.SE_BRIDGE_DISABLE === '1',
    webhookUrl: process.env.SE_APP_WEBHOOK_URL || DEFAULT_WEBHOOK_URL,
    heartbeatUrl: process.env.SE_HEARTBEAT_URL || DEFAULT_HEARTBEAT_URL,
    secret: process.env.SBR_SECRET_KEY || '',
    runnerDisabled: process.env.SE_RUNNER_BRIDGE_DISABLE === '1',
    runnerInboundUrl: process.env.SE_RUNNER_INBOUND_URL || DEFAULT_RUNNER_INBOUND_URL,
    runnerApiKey: process.env.RUNNER_API_KEY || '',
    timeoutMs: parseInt(process.env.SE_BRIDGE_TIMEOUT_MS || '10000', 10),
  };
}

const state = {
  forwarded: 0,
  failed: 0,
  runnerForwarded: 0,
  runnerFailed: 0,
  sessionWebhooksForwarded: 0,
  heartbeatsOk: 0,
  heartbeatsFailed: 0,
  lastForwardAt: null,
  lastForwardError: null,
  lastRunnerForwardAt: null,
  lastRunnerError: null,
  lastHeartbeatAt: null,
  lastHeartbeatStatus: null,
  heartbeatStarted: false,
  warnNoSecretLogged: false,
};

/** POST a JSON body to a URL with optional auth headers. Never throws. */
async function postJson(url, body, extraHeaders = {}) {
  const cfg = bridgeConfig();
  const headers = { 'content-type': 'application/json', ...extraHeaders };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
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

/** Map an @open-wa message object onto the OpenWA envelope contract. */
function toEnvelope(sessionId, msg) {
  const data = {
    id: typeof msg.id === 'string' ? msg.id : (msg.id && msg.id.id) || null,
    chatId: msg.chatId || msg.from || null,
    body: msg.body || '',
    type: msg.type || 'chat',
    sender: msg.from
      ? {
          id: typeof msg.from === 'string' ? msg.from : (msg.from && msg.from._serialized) || null,
          pushname: msg.sender && msg.sender.pushName ? msg.sender.pushName : undefined,
        }
      : (msg.sender || null),
    from: msg.from || null,
    fromMe: Boolean(msg.fromMe),
    author: msg.author || undefined,
    chatName: msg.chatName || (msg.chat && msg.chat.name) || undefined,
    hasMedia: msg.hasMedia === true || Boolean(msg.mimetype),
    mimetype: msg.mimetype || undefined,
    caption: msg.caption || undefined,
    quotedMsgId:
      (msg.quotedMsg && msg.quotedMsg.id && (msg.quotedMsg.id.id || msg.quotedMsg.id)) ||
      (typeof msg.quotedMsgId === 'string' ? msg.quotedMsgId : undefined),
    timestamp: msg.timestamp || Math.floor(Date.now() / 1000),
    isGroupMsg: msg.isGroupMsg === true || String(msg.chatId || msg.from || '').endsWith('@g.us'),
  };
  return { event: 'message.received', sessionId, data };
}

async function deliverWithRetry(url, envelope, headers) {
  let attempt = 0;
  let lastErr = '';
  while (attempt < FORWARD_RETRIES) {
    try {
      const out = await postJson(url, envelope, headers);
      if (out.ok) return { ok: true };
      if (out.status >= 400 && out.status < 500) {
        return { ok: false, error: `HTTP ${out.status}: ${out.body}` };
      }
      throw new Error(`HTTP ${out.status}`);
    } catch (err) {
      attempt++;
      lastErr = String((err && err.message) || err);
      if (attempt < FORWARD_RETRIES) {
        const wait = FORWARD_BACKOFF_MS[Math.min(attempt - 1, FORWARD_BACKOFF_MS.length - 1)];
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  return { ok: false, error: lastErr };
}

/**
 * Forward one inbound message to App Webhook, Local Workflow Runner (:2786/api/inbound),
 * and any registered per-session webhooks. Fire-and-forget with bounded retry.
 */
async function forwardMessage(sessionId, msg, sessionWebhooks = []) {
  if (!msg || (!msg.body && !msg.caption && !msg.hasMedia && !msg.mimetype)) return false;

  const cfg = bridgeConfig();
  const envelope = toEnvelope(sessionId, msg);
  const tasks = [];

  // 1. Forward to Sierra Admin/App Webhook
  if (!cfg.disabled) {
    if (!cfg.secret && !state.warnNoSecretLogged) {
      state.warnNoSecretLogged = true;
      console.warn('[app-bridge] SBR_SECRET_KEY is not set — app webhook forwarding may 401/503.');
    }
    const appHeaders = cfg.secret ? { 'x-sbr-secret-key': cfg.secret } : {};
    tasks.push(
      deliverWithRetry(cfg.webhookUrl, envelope, appHeaders).then((res) => {
        if (res.ok) {
          state.forwarded++;
          state.lastForwardAt = new Date().toISOString();
          state.lastForwardError = null;
          return true;
        }
        state.failed++;
        state.lastForwardError = res.error;
        return false;
      }),
    );
  }

  // 2. Forward to Local Workflow Runner (:2786/api/inbound) for closed-loop owner outreach & inbox
  if (!cfg.runnerDisabled && cfg.runnerInboundUrl) {
    const runnerHeaders = cfg.runnerApiKey ? { 'X-API-Key': cfg.runnerApiKey } : {};
    tasks.push(
      deliverWithRetry(cfg.runnerInboundUrl, envelope, runnerHeaders).then((res) => {
        if (res.ok) {
          state.runnerForwarded++;
          state.lastRunnerForwardAt = new Date().toISOString();
          state.lastRunnerError = null;
          return true;
        }
        state.runnerFailed++;
        state.lastRunnerError = res.error;
        return false;
      }),
    );
  }

  // 3. Forward to any registered per-session webhooks (deduplicated against runner URL)
  if (Array.isArray(sessionWebhooks)) {
    for (const wh of sessionWebhooks) {
      if (!wh || !wh.url || wh.url === cfg.runnerInboundUrl || wh.url === cfg.webhookUrl) continue;
      if (Array.isArray(wh.events) && wh.events.length > 0 && !wh.events.includes('message.received') && !wh.events.includes('*')) {
        continue;
      }
      tasks.push(
        deliverWithRetry(wh.url, envelope, wh.headers || {}).then((res) => {
          if (res.ok) state.sessionWebhooksForwarded++;
          return res.ok;
        }),
      );
    }
  }

  const results = await Promise.allSettled(tasks);
  return results.some((r) => r.status === 'fulfilled' && r.value === true);
}

/**
 * Start the heartbeat loop. Pulse only while `isAlive()` returns true.
 */
function startHeartbeat(isAlive) {
  const cfg = bridgeConfig();
  if (cfg.disabled || state.heartbeatStarted) return;
  state.heartbeatStarted = true;
  const beat = async () => {
    if (!isAlive()) {
      state.lastHeartbeatStatus = 'no-ready-lines';
      return;
    }
    const latestCfg = bridgeConfig();
    const hbHeaders = latestCfg.secret ? { 'x-sbr-secret-key': latestCfg.secret } : {};
    try {
      const out = await postJson(
        latestCfg.heartbeatUrl,
        { status: 'alive', ts: new Date().toISOString() },
        hbHeaders,
      );
      state.lastHeartbeatAt = new Date().toISOString();
      if (out.ok) {
        state.heartbeatsOk++;
        state.lastHeartbeatStatus = 'ok';
        if (state.heartbeatsOk === 1) {
          console.log(`[app-bridge] Heartbeat live → ${latestCfg.heartbeatUrl}`);
        }
      } else {
        state.heartbeatsFailed++;
        state.lastHeartbeatStatus = `HTTP ${out.status}`;
        console.error(`[app-bridge] Heartbeat ${out.status}: ${out.body}`);
      }
    } catch (err) {
      state.heartbeatsFailed++;
      state.lastHeartbeatStatus = String((err && err.message) || err);
    }
  };
  setInterval(beat, HEARTBEAT_INTERVAL_MS);
  setTimeout(beat, 3000);
}

function status() {
  const cfg = bridgeConfig();
  return {
    enabled: !cfg.disabled,
    webhookUrl: cfg.webhookUrl,
    heartbeatUrl: cfg.heartbeatUrl,
    secretConfigured: Boolean(cfg.secret),
    runnerEnabled: !cfg.runnerDisabled,
    runnerInboundUrl: cfg.runnerInboundUrl,
    runnerKeyConfigured: Boolean(cfg.runnerApiKey),
    ...state,
    heartbeatStarted: state.heartbeatStarted,
  };
}

module.exports = { forwardMessage, startHeartbeat, status, toEnvelope };
