'use strict';
/**
 * tg.js — Minimal Telegram Bot API client (zero new dependencies).
 * ─────────────────────────────────────────────────────────────────────────────
 * Deliberately fetch-based instead of python-telegram-bot / grammY so the
 * bot runs inside the existing workflows/ Docker image with ZERO lockfile
 * changes (the repo's CI is frozen-lockfile; adding a runtime dep here is
 * how ERR_PNPM_OUTDATED_LOCKFILE incidents start). The full API surface
 * this pipeline needs is: identity, long-poll updates, sendMessage,
 * sendMediaGroup, getChat, getFile + file download.
 *
 * Error doctrine: network timeouts and malformed payloads NEVER crash the
 * poller — call() retries with bounded backoff, then throws a typed error
 * the orchestrator turns into a SPECIFIC reply (never the generic
 * "عذراً، حدث خطأ غير متوقع").
 */

const path = require('path');

const API = 'https://api.telegram.org';
const RETRY_STATUS = new Set([408, 429, 500, 502, 503, 504]);

class TelegramError extends Error {
  constructor(message, { status = 0, method = '', description = '' } = {}) {
    super(message);
    this.name = 'TelegramError';
    this.status = status;
    this.method = method;
    this.description = description;
  }
}

function log(...args) {
  console.log(new Date().toISOString(), '[telegram-intake]', ...args);
}

/** Low-level call with bounded retry (3 attempts, exp backoff, honors Retry-After). */
async function call(token, method, params = {}, { timeoutMs = 35000, retries = 3 } = {}) {
  let lastErr = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API}/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(timeoutMs),
      });
      let data = {};
      try { data = await res.json(); } catch (_) { /* non-JSON body */ }
      if (res.ok && data.ok) return data.result;
      // 409 conflict = another poller/webhook: surface immediately (config issue).
      if (res.status === 409) {
        throw new TelegramError(`conflict: ${data.description || 'another getUpdates consumer or webhook is active'}`, {
          status: 409, method, description: data.description,
        });
      }
      if (!RETRY_STATUS.has(res.status) || attempt === retries) {
        throw new TelegramError(`telegram ${method} failed (${res.status}): ${data.description || 'no description'}`, {
          status: res.status, method, description: data.description,
        });
      }
      const retryAfter = Number((data.parameters || {}).retry_after || 0);
      await sleep(Math.max(retryAfter * 1000, 400 * 2 ** attempt));
    } catch (e) {
      if (e instanceof TelegramError && e.status === 409) throw e;
      lastErr = e;
      if (attempt === retries) {
        throw new TelegramError(`network error in ${method}: ${e.message}`, { method });
      }
      await sleep(400 * 2 ** attempt);
    }
  }
  throw lastErr || new TelegramError(`unreachable ${method}`);
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** Client factory bound to one bot token. */
function createClient(token) {
  return {
    getMe: () => call(token, 'getMe', {}, { timeoutMs: 10000 }),

    /** Long-poll; `timeout` (s) ≤ 50. Returns [] on transient failure (the
     *  loop must never die); throws only on 409 (misconfiguration). */
    getUpdates: async (offset, timeoutSec = 30) => {
      try {
        return await call(token, 'getUpdates', {
          offset,
          timeout: timeoutSec,
          allowed_updates: ['message', 'edited_message'],
        }, { timeoutMs: (timeoutSec + 15) * 1000, retries: 2 });
      } catch (e) {
        if (e.status === 409) throw e;
        log(`getUpdates transient failure (will retry): ${e.message}`);
        await sleep(3000);
        return [];
      }
    },

    deleteWebhook: (dropUpdates = false) =>
      call(token, 'deleteWebhook', { drop_updates: dropUpdates }, { timeoutMs: 10000, retries: 2 }),

    sendMessage: (chatId, text, extra = {}) =>
      call(token, 'sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...extra,
      }, { timeoutMs: 15000 }),

    sendMediaGroup: (chatId, media, extra = {}) =>
      call(token, 'sendMediaGroup', { chat_id: chatId, media, ...extra }, { timeoutMs: 30000 }),

    getChat: (chatId) => call(token, 'getChat', { chat_id: chatId }, { timeoutMs: 10000 }),

    /** Download one file to disk. The URL embeds the bot token — it is
     *  built here and NEVER logged or persisted. Returns bytes written. */
    downloadFile: async (fileId, destPath, fsmod = require('fs')) => {
      const f = await call(token, 'getFile', { file_id: fileId }, { timeoutMs: 15000 });
      const filePath = String(f.file_path || '');
      if (!filePath) throw new TelegramError('getFile returned no file_path', { method: 'getFile' });
      const res = await fetch(`${API}/file/bot${token}/${filePath}`, {
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new TelegramError(`file download failed (${res.status})`, { method: 'downloadFile' });
      const buf = Buffer.from(await res.arrayBuffer());
      fsmod.mkdirSync(path.dirname(destPath), { recursive: true });
      fsmod.writeFileSync(destPath, buf);
      return buf.length;
    },
  };
}

/** Escape untrusted values for parse_mode HTML (values only, never templates). */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = { createClient, escapeHtml, TelegramError };
