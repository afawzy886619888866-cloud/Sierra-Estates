'use strict';
/**
 * gateway-client.js — OpenWA WhatsApp gateway client for server workflows.
 *
 * Live contract (verified against the deployed gateway, Oct 2026):
 *   Base:   WHATSAPP_API_URL (server-side workflows use http://127.0.0.1:2785)
 *   Auth:   X-API-Key header (operator key for sends, admin key for status)
 *   Send:   POST {base}/api/sessions/{sessionId}/messages/send-text
 *           body: { chatId, text }            → chatId like "201061399688@c.us"
 *   Status: GET  {base}/api/sessions/{sessionId}
 *           → { status: 'ready'|..., phone, pushName, lastActive, engineLoaded }
 *
 * The gateway engine registry resolves sessions by UUID ONLY — sending by
 * session name returns 400 "not active". Always pass OPENWA_SESSION_ID.
 *
 * 4-line sender pool (Oct 2026): pass `sessionPool` (or env OPENWA_SESSION_IDS,
 * comma-separated names or UUIDs) and sendText() round-robins across healthy
 * sessions, resolving names → UUIDs via GET /api/sessions once (5-min cache).
 * A session that errors is benched for 2 minutes; an empty/unresolvable pool
 * degrades to the classic single-session behavior.
 */
const https = require('https');
const http = require('http');
const { URL } = require('url');

const DEFAULT_TIMEOUT_MS = 15000;
const POOL_CACHE_MS = 5 * 60_000;
const SESSION_BACKOFF_MS = 2 * 60_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeChatId(phone) {
  if (!phone) return '';
  let p = String(phone).trim();
  if (p.includes('@')) return p; // already a chatId
  p = p.replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  // Egyptian local formats: 002010..., 2010..., 010... → full CC form
  if (p.startsWith('00')) p = p.slice(2);
  if (p.startsWith('0')) p = `20${p}`;
  return `${p}@c.us`;
}

/** Low-level JSON request with timeout. Resolves {status, ok, data}. */
function requestJson(urlStr, { method = 'GET', headers = {}, body = null, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(urlStr); } catch (e) { return reject(new Error(`bad url: ${e.message}`)); }
    const mod = u.protocol === 'https:' ? https : http;
    const payload = body === null ? null : Buffer.from(JSON.stringify(body));
    const req = mod.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': payload.length } : {}),
          ...headers,
        },
        timeout: timeoutMs,
      },
      (res) => {
        let chunks = '';
        res.on('data', (d) => { chunks += d; if (chunks.length > 512 * 1024) res.destroy(); });
        res.on('end', () => {
          let data = null;
          try { data = chunks ? JSON.parse(chunks) : null; } catch (_) { data = { raw: chunks.slice(0, 500) }; }
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data });
        });
      }
    );
    req.on('timeout', () => { req.destroy(new Error(`timeout after ${timeoutMs}ms`)); });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

class GatewayClient {
  constructor(opts = {}) {
    const base = opts.baseUrl || process.env.WHATSAPP_API_URL || 'http://127.0.0.1:2785';
    this.baseUrl = base.replace(/\/+$/, '');
    this.sessionId = opts.sessionId || process.env.OPENWA_SESSION_ID || '';
    // Operator key sends messages; admin key reads session status. Fall back
    // gracefully when only one is provisioned.
    this.operatorKey = opts.operatorKey || process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_API_KEY || '';
    this.adminKey = opts.adminKey || process.env.OPENWA_ADMIN_API_KEY || this.operatorKey;
    // 4-line pool: explicit opts.sessionPool wins, else OPENWA_SESSION_IDS env
    // (comma-separated session names or UUIDs, matching the Lines sheet).
    this.sessionPool = (opts.sessionPool
      || String(process.env.OPENWA_SESSION_IDS || '')).split(',').map((s) => s.trim()).filter(Boolean);
    this._rr = 0;                 // round-robin cursor
    this._benchedUntil = new Map(); // uuid -> retry-after epoch ms
    this._poolCache = null;         // { at, entries: [{name, uuid}] }
  }

  /** Live session status via admin key. */
  async status() {
    const res = await requestJson(
      `${this.baseUrl}/api/sessions/${this.sessionId}`,
      { headers: { 'X-API-Key': this.adminKey }, timeoutMs: 6000 }
    );
    if (!res.ok) {
      const err = new Error(`gateway status HTTP ${res.status}`);
      err.httpStatus = res.status;
      throw err;
    }
    const d = res.data || {};
    return {
      reachable: true,
      status: d.status || 'unknown',
      phone: d.phone,
      pushName: d.pushName,
      lastActive: d.lastActive,
      engineLoaded: Boolean(d.engineLoaded),
    };
  }

  /** Live status for an explicit session UUID (pool pre-flight). */
  async statusFor(uuid) {
    const res = await requestJson(
      `${this.baseUrl}/api/sessions/${uuid}`,
      { headers: { 'X-API-Key': this.adminKey }, timeoutMs: 6000 }
    );
    if (!res.ok) {
      const err = new Error(`gateway status HTTP ${res.status}`);
      err.httpStatus = res.status;
      throw err;
    }
    const d = res.data || {};
    return {
      reachable: true,
      status: d.status || 'unknown',
      phone: d.phone,
      pushName: d.pushName,
      lastActive: d.lastActive,
      engineLoaded: Boolean(d.engineLoaded),
    };
  }

  /**
   * Resolve the configured pool to [{name, uuid}] via GET /api/sessions
   * (admin key), caching for POOL_CACHE_MS. Names that cannot be resolved are
   * dropped with a warning — never guessed. UUID entries pass through as-is.
   * Returns [] when the gateway list cannot be fetched.
   */
  async resolvePool() {
    if (this._poolCache && Date.now() - this._poolCache.at < POOL_CACHE_MS) return this._poolCache.entries;
    const entries = [];
    const pending = []; // names needing resolution
    for (const raw of this.sessionPool) {
      if (UUID_RE.test(raw)) entries.push({ name: raw, uuid: raw });
      else pending.push(raw);
    }
    if (pending.length) {
      try {
        const res = await requestJson(`${this.baseUrl}/api/sessions`, {
          headers: { 'X-API-Key': this.adminKey },
          timeoutMs: 8000,
        });
        if (res.ok && Array.isArray(res.data)) {
          for (const name of pending) {
            const found = res.data.find((s) => s && s.name === name);
            if (found && found.id) entries.push({ name, uuid: found.id });
            else console.warn(`[gateway-client] pool session "${name}" not found on gateway — skipped`);
          }
        } else {
          console.warn(`[gateway-client] /api/sessions list HTTP ${res.status} — names unresolved this run`);
        }
      } catch (e) {
        console.warn(`[gateway-client] /api/sessions list failed: ${e.message}`);
      }
    }
    this._poolCache = { at: Date.now(), entries };
    return entries;
  }

  /** Resolved pool minus benched sessions, rotated to start at the rr cursor. */
  async healthyPool() {
    if (!this.sessionPool.length) {
      // Legacy path: single OPENWA_SESSION_ID, but still UUID-normalize when
      // possible so a NAME config keeps working on this gateway version.
      if (!this.sessionId) return [];
      if (UUID_RE.test(this.sessionId)) return [{ name: this.sessionId, uuid: this.sessionId }];
      const all = await this.resolvePool().catch(() => []);
      const me = all.find((e) => e.name === this.sessionId);
      return me ? [me] : (this.sessionId ? [{ name: this.sessionId, uuid: this.sessionId }] : []);
    }
    const now = Date.now();
    const all = (await this.resolvePool()).filter((e) => (this._benchedUntil.get(e.uuid) || 0) <= now);
    if (!all.length) return [];
    const start = this._rr % all.length;
    return all.slice(start).concat(all.slice(0, start));
  }

  /**
   * Send a text message. Returns {ok, httpStatus, data, session}.
   * With a pool: rotates across healthy sessions — a failed session is benched
   * for SESSION_BACKOFF_MS and the next line takes the send (trying the next
   * line IS the retry). Permanent chatId errors (4xx other than "not active")
   * abort immediately — retrying another line cannot fix a bad chatId.
   * With no pool: legacy behavior — retries transient failures (network/5xx)
   * up to `retries` times with linear backoff on the single session.
   */
  async sendText(chatId, text, { retries = 2, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    if (!this.sessionId && !this.sessionPool.length) throw new Error('OPENWA_SESSION_ID missing');
    if (!this.operatorKey) throw new Error('no operator/API key configured');
    const target = normalizeChatId(chatId);
    if (!/^\d+@c\.us$/.test(target)) {
      const err = new Error(`unusable chatId after normalization: "${target}"`);
      err.permanent = true;
      throw err;
    }
    const pool = await this.healthyPool();
    if (!pool.length) throw new Error('no gateway session available (pool empty)');

    let lastErr = null;
    for (let pi = 0; pi < pool.length; pi++) {
      const entry = pool[pi];
      // Legacy single-session path keeps the original retry cadence; with a
      // multi-session pool, failing over to the next line replaces retrying.
      const attempts = pool.length === 1 ? retries + 1 : 1;
      for (let attempt = 0; attempt < attempts; attempt++) {
        try {
          const res = await requestJson(
            `${this.baseUrl}/api/sessions/${entry.uuid}/messages/send-text`,
            {
              method: 'POST',
              headers: { 'X-API-Key': this.operatorKey },
              body: { chatId: target, text: String(text ?? '') },
              timeoutMs,
            }
          );
          if (res.ok) {
            this._rr += pi + 1; // next send starts at the following line
            return { ok: true, httpStatus: res.status, data: res.data, session: entry.name };
          }
          const err = new Error(`send-text HTTP ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}`);
          err.httpStatus = res.status;
          err.permanent = res.status >= 400 && res.status < 500;
          // 400 "not active" = the SESSION is down, not the chatId — bench it
          // and let the next line take over instead of aborting the batch.
          const sessionDown = res.status === 400 && /not active|session/i.test(JSON.stringify(res.data).slice(0, 200));
          if (sessionDown) {
            this._benchedUntil.set(entry.uuid, Date.now() + SESSION_BACKOFF_MS);
            err.permanent = false;
            lastErr = err;
            break; // next pool entry
          }
          if (err.permanent) throw err;
          lastErr = err;
          if (attempt < attempts - 1) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        } catch (e) {
          lastErr = e;
          if (e.permanent) throw e;
          if (attempt < attempts - 1) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        }
      }
    }
    throw lastErr || new Error('all gateway sessions failed');
  }
}

module.exports = { GatewayClient, normalizeChatId, requestJson };
