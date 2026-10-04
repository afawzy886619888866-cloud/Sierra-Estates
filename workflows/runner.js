#!/usr/bin/env node
'use strict';
/**
 * runner.js — Sierra Estates server-side Workflow Control Plane.
 * ─────────────────────────────────────────────────────────────────────
 * One daemon that:
 *   1. READS the schedule + status of every server workflow from the
 *      Supabase `public.workflows` table — the SAME rows the admin
 *      Workflow Studio (apps/sierra-estates-realty → WorkflowStudioView)
 *      displays and edits. Admin edits apply within one 60 s poll:
 *        status: active/paused/draft   → run / don't run
 *        schedule: cron expression     → rescheduled
 *   2. SPAWNS each due workflow (with an overlap lock and a 10 min
 *      timeout), captures output + exit code into .state/<slug>.json.
 *   3. PATCHES live telemetry back to the same DB rows:
 *        last_run_at, last_run_ms, success_rate, runs, last_run_label
 *      — never name/description/graph/script (admin-owned fields).
 *      last_run_label is HONEST: "ec2-runner:ok | :error | :timeout |
 *      :unconfigured" so the Studio never dresses up a blocked run as a
 *      healthy one (2026-10 improvement).
 *   4. Exposes an HTTP control API (default 127.0.0.1:2786) guarded by
 *      X-API-Key / Bearer RUNNER_API_KEY:
 *        GET  /api/health                    runner + gateway heartbeat
 *        GET  /api/workflows                 DB rows + local run state
 *        POST /api/workflows/:slug/run       manual trigger (locked)
 *        GET  /api/workflows/:slug/logs?n=10 run history tails
 *
 * Manual runs are what the (prepared) admin patch
 * `/api/admin/workflow-ops` + WorkflowStudio "Run now" button calls.
 *
 * Exit semantics of child workflows: 0 ok · 2 unconfigured (does NOT
 * count against success_rate) · other/timeout = error.
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { isDue } = require('./lib/crone');
const state = require('./lib/state');
const sb = require('./lib/supabase-sync');
const inbox = require('./lib/inbox');
const { GatewayClient } = require('./lib/gateway-client');

const WF_DIR = __dirname;
const POLL_MS = parseInt(process.env.RUNNER_POLL_MS || '60000', 10);
const CHILD_TIMEOUT_MS = parseInt(process.env.RUNNER_CHILD_TIMEOUT_MS || '600000', 10);
const PORT = parseInt(process.env.RUNNER_PORT || '2786', 10);
const BIND = process.env.RUNNER_BIND || '127.0.0.1';
const API_KEY = process.env.RUNNER_API_KEY || process.env.OPENWA_ADMIN_API_KEY || '';

const SLUGS = [
  'whatsapp-scraper',
  'owner-search',
  'owner-contact',
  'email-sender',
  'unit-adder',
  'gateway-sentinel',
  'daily-digest',
  'units-sync',
];

const SCRIPTS = {
  'whatsapp-scraper': '01-whatsapp-scraper/index.js',
  'owner-search': '02-owner-search/search.js',
  'owner-contact': '03-owner-contact/contact.js',
  'email-sender': '04-email-sender/send.js',
  'unit-adder': '05-unit-adder/add.js',
  'gateway-sentinel': '06-gateway-sentinel/sentinel.js',
  'daily-digest': '07-daily-digest/digest.js',
  'units-sync': '08-units-sync/sync.js',
};

const running = new Set(); // slugs currently executing
const lastFiredMinute = new Map(); // slug → "YYYY-MM-DD HH:MM" already handled
const manualQueue = new Map(); // slug → trigger origin ('cron' | 'manual' | 'studio')
const startedAt = Date.now();

function log(...args) {
  console.log(new Date().toISOString(), '[runner]', ...args);
}

/** Run one workflow to completion; update local state + Supabase telemetry. */
async function runWorkflow(slug, trigger = 'cron') {
  if (running.has(slug)) {
    log(`${slug}: still running — ${trigger} trigger skipped`);
    return { skipped: true, reason: 'already_running' };
  }
  const scriptRel = SCRIPTS[slug];
  if (!scriptRel) return { skipped: true, reason: 'unknown_slug' };

  running.add(slug);
  const started = Date.now();
  log(`${slug}: ${trigger} run started`);
  state.save(slug, { lastRun: new Date().toISOString() });

  const exit = await new Promise((resolve) => {
    const child = spawn('node', [path.join(WF_DIR, scriptRel)], {
      cwd: WF_DIR,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let errOut = '';
    const cap = (s) => s.length > 8000 ? `${s.slice(0, 8000)}…[truncated]` : s;
    child.stdout.on('data', (d) => { out += d.toString(); if (out.length > 200000) out = out.slice(-100000); });
    child.stderr.on('data', (d) => { errOut += d.toString(); if (errOut.length > 200000) errOut = errOut.slice(-100000); });

    const killer = setTimeout(() => {
      log(`${slug}: timeout after ${CHILD_TIMEOUT_MS / 1000}s — killing`);
      child.kill('SIGKILL');
    }, CHILD_TIMEOUT_MS);

    child.on('exit', (code, signal) => {
      clearTimeout(killer);
      resolve({ code, signal, out: cap(out), err: cap(errOut) });
    });
    child.on('error', (e) => {
      clearTimeout(killer);
      resolve({ code: -1, signal: null, out: '', err: `spawn error: ${e.message}` });
    });
  });

  const durationMs = Date.now() - started;
  const combined = `${exit.out}\n${exit.err}`.trim();
  const summaryLine =
    (combined.match(/^SUMMARY (.+)$/m) || [])[1] ||
    (combined.match(/^UNCONFIGURED: (.+)$/m) || [])[1] ||
    (combined.match(/^BLOCKED: (.+)$/m) || [])[1] ||
    (combined.split('\n').filter(Boolean).pop() || '').slice(0, 300);

  let exitKind = 'error';
  if (exit.signal || exit.code === -1) exitKind = 'timeout';
  else if (exit.code === 0) exitKind = 'ok';
  else if (exit.code === 2) exitKind = 'unconfigured';

  const entry = {
    at: new Date().toISOString(),
    exit: exitKind,
    ms: durationMs,
    trigger,
    summary: summaryLine.slice(0, 300),
  };
  const st = state.save(slug, {
    lastDurationMs: durationMs,
    lastExit: exitKind,
    lastSummary: summaryLine.slice(0, 300),
  }, entry);

  // Telemetry → Supabase (best-effort; runner must survive SB outages)
  // Label carries the exit kind so the Studio shows the truth at a glance.
  try {
    const current = await sb.getWorkflows([slug]);
    const runsNow = current.length ? (current[0].runs || 0) + 1 : 1;
    await sb.patchTelemetry(slug, {
      lastRunMs: durationMs,
      successRate: st.successRate ?? undefined,
      runsBump: runsNow,
      label: `ec2-runner:${exitKind}`,
    });
  } catch (e) {
    log(`${slug}: telemetry patch failed: ${e.message}`);
  }

  log(`${slug}: ${trigger} run ${exitKind} in ${(durationMs / 1000).toFixed(1)}s — ${summaryLine.slice(0, 120)}`);
  running.delete(slug);
  return { skipped: false, exitKind, durationMs, summary: summaryLine };
}

/** Read a request body with a hard cap (for the inbound webhook). */
function readBody(req, cap) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > cap) { req.destroy(); reject(new Error('body too large')); return }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** One scheduler pass. */
async function schedulerTick() {
  if (!sb.configured()) {
    log('supabase not configured — scheduler idle (HTTP manual runs still work)');
    return;
  }
  let rows = [];
  try {
    rows = await sb.getWorkflows(SLUGS);
  } catch (e) {
    log(`workflows read failed: ${e.message}`);
    return;
  }

  const now = new Date();
  const minuteKey = `${now.toISOString().slice(0, 16)}`;

  for (const row of rows) {
    const slug = row.slug;
    if (!SCRIPTS[slug]) continue;
    if (row.status !== 'active') continue;

    // admin pressed "Run now" in the Studio? (Layer-2 patch sets last_run_label='run-requested')
    if (row.last_run_label === 'run-requested' && !manualQueue.has(slug)) {
      manualQueue.set(slug, 'studio');
    }

    const sched = String(row.schedule || '').trim();
    if (sched === 'webhook' || sched === 'manual') continue;

    if (manualQueue.has(slug)) continue; // already queued this pass
    if (lastFiredMinute.get(slug) === minuteKey) continue;
    if (isDue(sched, now)) {
      lastFiredMinute.set(slug, minuteKey);
      manualQueue.set(slug, 'cron'); // executed below, sequential, lock-guarded
    }
  }

  // Execute due/manual runs sequentially — the gateway + Sheets prefer low concurrency.
  while (manualQueue.size) {
    const slug = manualQueue.keys().next().value;
    const trigger = manualQueue.get(slug) || 'cron';
    manualQueue.delete(slug);
    try {
      await runWorkflow(slug, trigger);
    } catch (e) {
      log(`${slug}: runner error: ${e.message}`);
    }
  }
}

/** HTTP control API. */
function server() {
  const gw = new GatewayClient();

  const json = (res, code, obj) => {
    const body = JSON.stringify(obj, null, 1);
    res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
    res.end(body);
  };

  const authorized = (req) => {
    if (!API_KEY) return true; // loopback-only default; explicit key when bound wider
    const h = req.headers['x-api-key'] || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    return h === API_KEY;
  };

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const p = url.pathname;

    try {
      if (p === '/api/health' && req.method === 'GET') {
        let gateway = { reachable: false };
        try { gateway = await gw.status(); } catch (e) { gateway = { reachable: false, error: e.message }; }
        let gh = null;
        try { gh = JSON.parse(fs.readFileSync(path.join(state.STATE_DIR, 'gateway-health.json'), 'utf8')); } catch (_) { /* none */ }
        return json(res, 200, {
          ok: true,
          service: 'se-workflow-runner',
          uptimeSec: Math.round((Date.now() - startedAt) / 1000),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          supabase: sb.configured(),
          running: [...running],
          gateway,
          gatewayHealth: gh,
        });
      }

      if (p === '/api/workflows' && req.method === 'GET') {
        if (!authorized(req)) return json(res, 401, { ok: false, error: 'unauthorized' });
        const [rows, local] = await Promise.all([
          sb.configured() ? sb.getWorkflows(SLUGS) : Promise.resolve([]),
          Promise.resolve(state.all()),
        ]);
        const byslug = Object.fromEntries(local.map((s) => [s.slug, s]));
        return json(res, 200, {
          ok: true,
          workflows: rows.map((r) => ({ ...r, local: byslug[r.slug] || null })),
        });
      }

      const runMatch = p.match(/^\/api\/workflows\/([\w-]+)\/run$/);
      if (runMatch && req.method === 'POST') {
        if (!authorized(req)) return json(res, 401, { ok: false, error: 'unauthorized' });
        const slug = runMatch[1];
        if (!SCRIPTS[slug]) return json(res, 404, { ok: false, error: 'unknown workflow' });
        if (running.has(slug)) return json(res, 409, { ok: false, error: 'already_running' });
        if (manualQueue.has(slug)) return json(res, 202, { ok: true, accepted: slug, note: 'already_queued' });
        // respond first, run async — HTTP callers get immediate ack
        manualQueue.set(slug, 'manual');
        setImmediate(() => schedulerTick().catch((e) => log(`manual tick error: ${e.message}`)));
        return json(res, 202, { ok: true, accepted: slug });
      }

      const logsMatch = p.match(/^\/api\/workflows\/([\w-]+)\/logs$/);
      if (logsMatch && req.method === 'GET') {
        if (!authorized(req)) return json(res, 401, { ok: false, error: 'unauthorized' });
        const n = Math.min(parseInt(url.searchParams.get('n') || '10', 10) || 10, 20);
        return json(res, 200, { ok: true, slug: logsMatch[1], history: state.tail(logsMatch[1], n) });
      }

      // ── Inbound WhatsApp webhook target (gateway → runner, same box) ──
      if (p === '/api/inbound' && req.method === 'POST') {
        if (!authorized(req)) return json(res, 401, { ok: false, error: 'unauthorized' });
        const raw = await readBody(req, 256 * 1024);
        let body = null;
        try { body = JSON.parse(raw); } catch (_) { body = { raw: String(raw).slice(0, 2000) } }
        const out = await inbox.handleInbound(body);
        return json(res, 202, { ok: true, ...out });
      }

      if (p === '/api/inbound/preview' && req.method === 'GET') {
        if (!authorized(req)) return json(res, 401, { ok: false, error: 'unauthorized' });
        const n = Math.min(parseInt(url.searchParams.get('n') || '20', 10) || 20, 100);
        return json(res, 200, { ok: true, messages: inbox.preview(n) });
      }

      return json(res, 404, { ok: false, error: 'not_found' });
    } catch (e) {
      return json(res, 500, { ok: false, error: e.message });
    }
  });
}

async function main() {
  log(`workflow runner starting — bind=${BIND}:${PORT} poll=${POLL_MS / 1000}s tz=${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  // ensure one-shot seeding of the sentinel row (idempotent)
  try {
    const seeded = await sb.upsertWorkflowRow({
      slug: 'gateway-sentinel',
      name: 'Gateway Sentinel',
      name_ar: 'حارس بوابة الواتساب',
      description: '5-minute OpenWA gateway health probe — session reachability + ready status, feeds Studio telemetry and /api/health. Escalates via email/WhatsApp after repeated failures.',
      status: 'active',
      schedule: '*/5 * * * *',
      category: 'operations',
      trigger_type: 'cron',
      source_path: 'workflows/06-gateway-sentinel/sentinel.js',
    });
    if (seeded) log('sentinel row present in workflows registry');
  } catch (e) {
    log(`sentinel seeding skipped: ${e.message}`);
  }

  // ensure one-shot seeding of the daily-digest row (idempotent)
  try {
    const seeded = await sb.upsertWorkflowRow({
      slug: 'daily-digest',
      name: 'Daily Ops Digest',
      name_ar: 'الملخص اليومي للعمليات',
      description: '08:00 Cairo — Arabic WhatsApp digest to the ops number: gateway health, workflow run stats, new leads and units from the last 24h.',
      status: 'active',
      schedule: '0 8 * * *',
      category: 'operations',
      trigger_type: 'cron',
      source_path: 'workflows/07-daily-digest/digest.js',
    });
    if (seeded) log('daily-digest row present in workflows registry');
  } catch (e) {
    log(`daily-digest seeding skipped: ${e.message}`);
  }

  // ensure one-shot seeding of the units-sync row (idempotent)
  try {
    const seeded = await sb.upsertWorkflowRow({
      slug: 'units-sync',
      name: 'Units Sheet Sync',
      name_ar: 'مزامنة وحدات شيت الجرد',
      description: 'Reads the owner inventory Google Sheet (public gviz CSV) and upserts every unit into Supabase listings by unit Code — availability, price, owner contact. Runs every 2 hours.',
      status: 'active',
      schedule: '23 */2 * * *',
      category: 'ingestion',
      trigger_type: 'cron',
      source_path: 'workflows/08-units-sync/sync.js',
    });
    if (seeded) log('units-sync row present in workflows registry');
  } catch (e) {
    log(`units-sync seeding skipped: ${e.message}`);
  }

  server().listen(PORT, BIND, () => log(`control API listening on http://${BIND}:${PORT}`));

  const tick = async () => {
    try { await schedulerTick(); } catch (e) { log(`tick error: ${e.message}`); }
  };
  await tick(); // immediate first pass
  setInterval(tick, POLL_MS);
}

process.on('unhandledRejection', (e) => log(`unhandledRejection: ${e?.message || e}`));
main().catch((e) => {
  console.error('runner fatal:', e);
  process.exit(1);
});
