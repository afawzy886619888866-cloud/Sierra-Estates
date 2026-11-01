'use strict';

/**
 * guardian-kit.js — Shared chassis for the 5 Autonomous Guardian Bots
 * (Mission 4, 2026-11-01): Scribe, Curator, Atlas Sync, Antigravity Closer,
 * Ops Watchdog.
 *
 * Provides the common contract every guardian follows:
 *   · Supabase client + bounded-retry queries
 *   · public.system_status/{botId} pulse (the Admin Bots Desk fleet card)
 *   · public.bot_runs ledger (same shape as /api/admin/bots/run)
 *   · public.activities feed entries
 *   · MemoryBrainEngine learning writes via public.unified_memory /
 *     shared-memory semantics (author + tags + TTL) — durable learning loop
 *   · Telegram escalation (lib telegram contract: TELEGRAM_BOT_TOKEN +
 *     TELEGRAM_ADMIN_CHAT_ID) for alerts that must reach a human
 *   · exit-code + SUMMARY line contract (0 ok · 1 error · 2 unconfigured)
 */

const path = require('path');
const { loadWorkflowEnv } = require('./google-sheets');

loadWorkflowEnv(path.join(__dirname, '..'));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function log(tag, ...args) {
  console.log(new Date().toISOString(), `[${tag}]`, ...args);
}

let _sb = null;
function supabase() {
  if (_sb) return _sb;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const { createClient } = require('@supabase/supabase-js');
    _sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return _sb;
  } catch (e) {
    log('guardian-kit', `supabase init failed: ${e.message}`);
    return null;
  }
}

/** Bounded retry with exponential backoff for every DB call. */
async function withBackoff(fn, label, attempts = 4) {
  let lastErr = null;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i === attempts) break;
      await new Promise((r) => setTimeout(r, 500 * 2 ** (i - 1)));
    }
  }
  throw new Error(`${label}: ${lastErr ? lastErr.message : 'failed'}`);
}

/** Fleet card pulse — upsert system_status/{botId}. */
async function pulse(botId, name, { status = 'active', stats = {}, config = {} } = {}) {
  const sb = supabase();
  if (!sb) return;
  try {
    await sb.from('system_status').upsert({
      id: botId,
      name,
      status,
      last_pulse: new Date().toISOString(),
      stats,
      config,
      enabled: true,
    }, { onConflict: 'id' });
  } catch (e) { log('guardian-kit', `pulse ${botId} failed: ${e.message}`); }
}

/** Run ledger — same shape the admin /api/admin/bots/run writes. */
async function ledgerRun(botId, { action, outcome, details = {}, startedAt }) {
  const sb = supabase();
  if (!sb) return;
  try {
    await sb.from('bot_runs').insert({
      bot_id: botId,
      action,
      outcome,
      details,
      started_at: startedAt || new Date().toISOString(),
      finished_at: new Date().toISOString(),
    });
  } catch (e) { log('guardian-kit', `ledger ${botId} failed: ${e.message}`); }
}

/** Human-visible activity feed entry. */
async function activity(botId, message, meta = {}) {
  const sb = supabase();
  if (!sb) return;
  try {
    await sb.from('activities').insert({
      type: `guardian:${botId}`,
      message,
      meta,
      created_at: new Date().toISOString(),
    });
  } catch (e) { log('guardian-kit', `activity ${botId} failed: ${e.message}`); }
}

/**
 * Durable learning write — the MemoryBrainEngine consumption contract.
 * Writes to public.unified_memory with author/tags semantics (the same
 * 4-layer loop the app's MemoryService uses: record → unified_memory +
 * shared-memory bus). Fail-open: a guardian NEVER blocks on memory.
 */
async function learn(botId, { kind, title, body, tags = [], ttlDays = 90 } = {}) {
  const sb = supabase();
  if (!sb) return;
  try {
    await sb.from('unified_memory').insert({
      author: botId,
      kind,
      title: String(title || '').slice(0, 300),
      body: typeof body === 'string' ? body : JSON.stringify(body),
      tags: [...new Set(['guardian', botId, ...tags])],
      expires_at: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    });
  } catch (e) { log('guardian-kit', `learn ${botId} failed: ${e.message}`); }
}

/** Telegram escalation for alerts a human must see. */
async function telegramAlert(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch (_) { return false; }
}

/** Build a guardian runner: wires pulse + ledger + SUMMARY + exit codes. */
function runGuardian({ botId, name, cron, fn }) {
  return async function main() {
    if (!supabase()) {
      console.log(`UNCONFIGURED: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — ${name} cannot run.`);
      console.log('SUMMARY {"status":"unconfigured"}');
      process.exit(2);
    }
    const startedAt = new Date().toISOString();
    let outcome = 'ok';
    let stats = {};
    try {
      stats = (await fn({ pulse, ledgerRun, activity, learn, telegramAlert, log: (...a) => log(botId, ...a) })) || {};
    } catch (e) {
      outcome = 'error';
      stats = { error: e.message };
      log(botId, `run failed: ${e.message}`);
    }
    await pulse(botId, name, { status: outcome === 'ok' ? 'active' : 'error', stats: { ...stats, cron } });
    await ledgerRun(botId, { action: 'cron-run', outcome, details: stats, startedAt });
    console.log(`SUMMARY ${JSON.stringify({ bot: botId, outcome, ...stats })}`);
    process.exit(outcome === 'ok' ? 0 : 1);
  };
}

module.exports = {
  supabase,
  withBackoff,
  pulse,
  ledgerRun,
  activity,
  learn,
  telegramAlert,
  runGuardian,
  log,
};
