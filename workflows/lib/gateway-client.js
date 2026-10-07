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
 */
const https = require('https');
const http = require('http');
const { URL } = require('url');

const DEFAULT_TIMEOUT_MS = 15000;

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

  /**
   * Send a text message. Returns {ok, httpStatus, data}.
   * Retries transient failures (network/5xx) up to `retries` times with
   * linear backoff. 4xx are NOT retried (bad key / bad chatId won't heal).
   */
  async sendText(chatId, text, { retries = 2, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    if (!this.sessionId) throw new Error('OPENWA_SESSION_ID missing');
    if (!this.operatorKey) throw new Error('no operator/API key configured');
    const target = normalizeChatId(chatId);
    if (!/^\d+@c\.us$/.test(target)) {
      const err = new Error(`unusable chatId after normalization: "${target}"`);
      err.permanent = true;
      throw err;
    }
    let lastErr = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await requestJson(
          `${this.baseUrl}/api/sessions/${this.sessionId}/messages/send-text`,
          {
            method: 'POST',
            headers: { 'X-API-Key': this.operatorKey },
            body: { chatId: target, text: String(text ?? '') },
            timeoutMs,
          }
        );
        if (res.ok) return { ok: true, httpStatus: res.status, data: res.data };
        const err = new Error(`send-text HTTP ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}`);
        err.httpStatus = res.status;
        err.permanent = res.status >= 400 && res.status < 500;
        throw err;
      } catch (e) {
        lastErr = e;
        if (e.permanent) throw e; // 4xx: retrying cannot help
        if (attempt < retries) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
    throw lastErr;
  }
}

module.exports = { GatewayClient, normalizeChatId, requestJson };
