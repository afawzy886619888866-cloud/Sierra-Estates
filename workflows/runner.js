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
  'owner-outreach',
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
  'owner-outreach': '09-owner-outreach/outreach.js',
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

      // ── Pairing portal: always-fresh QR so the owner can re-link anytime ──
      if (p === '/pair' && req.method === 'GET') {
        const html = `<!doctype html><html lang="ar"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Sierra Estates — WhatsApp Link</title>
<style>body{font-family:system-ui,'Segoe UI',Tahoma,sans-serif;background:#0b141a;color:#e9edef;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.card{background:#111b21;border:1px solid #2a3942;border-radius:16px;padding:28px 24px;max-width:420px;text-align:center}
h1{font-size:18px;margin:0 0 6px;color:#00a884}p{font-size:13px;line-height:1.7;color:#8696a0;margin:8px 0}
img{width:270px;height:270px;border-radius:10px;background:#fff;padding:8px}
.st{font-size:13px;margin-top:10px;padding:6px 10px;border-radius:8px;display:inline-block}
.ok{background:#0b3d2e;color:#00d95f}.bad{background:#3d2b0b;color:#ffc861}
.code{font-size:26px;letter-spacing:6px;font-weight:700;color:#00d95f;background:#0b3d2e;border-radius:10px;padding:10px 16px;margin:12px 0;display:none;font-family:monospace}
.code.show{display:block}
.btn{background:#00a884;color:#0b141a;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px}
.btn:disabled{opacity:.5}
.divider{display:flex;align-items:center;gap:10px;color:#8696a0;font-size:12px;margin:14px 0 0}
.divider:before,.divider:after{content:'';flex:1;height:1px;background:#2a3942}
b{color:#e9edef}</style></head><body><div class="card">
<h1>Sierra Estates — ربط الواتساب</h1>
<p>1) افتح واتساب على جوالك <b>+20 106 139 9688</b><br>2) الإعدادات ← الأجهزة المرتبطة ← ربط جهاز<br>3) وجّه الكاميرا على المربع التالي (يتم تحديثه تلقائياً كل 5 ثوانٍ)</p>
<img id="qr" src="/pair/qr?t=0" alt="QR">
<p class="st bad" id="st">…</p>
<p dir="ltr" style="font-size:11px">This QR refreshes automatically. If scanning fails, wait 5s and try again.</p>
<div class="divider">أو بدون كاميرا</div>
<button class="btn" id="mint" onclick="mintCode()">🔗 إنشاء رمز ربط برقم الهاتف</button>
<div class="code" id="code"></div>
<p id="codehint" style="display:none">1) واتساب ← الأجهزة المرتبطة ← ربط جهاز<br>2) اختر «الربط برقم الهاتف بدلاً من ذلك»<br>3) أدخل الرمز أعلاه (صالح لعدة دقائق فقط)</p>
</div><script>
const img=document.getElementById('qr'), st=document.getElementById('st');
async function mintCode(){
  const b=document.getElementById('mint'), c=document.getElementById('code'), h=document.getElementById('codehint');
  b.disabled=true; b.textContent='… جاري إنشاء الرمز';
  c.className='code show'; c.textContent='…';
  try{
    const r=await fetch('/pair/code',{method:'POST'}); const j=await r.json();
    if(j&&j.ok&&j.code){ c.textContent=String(j.code).replace(/[^A-Z0-9]/gi,'').toUpperCase(); h.style.display='block'; }
    else{ c.className='code show'; c.style.cssText='display:block;color:#ffc861;background:#3d2b0b;font-size:13px;letter-spacing:0;font-family:inherit';
      c.textContent='تعذر إنشاء رمز الآن — واتساب يفرض حظراً مؤقتاً على الرموز لهذا الرقم. استخدم مسح QR أعلاه، أو حاول بعد ٣٠ دقيقة.'; h.style.display='none'; }
  }catch(e){ c.className='code show'; c.style.cssText='display:block;color:#ffc861;background:#3d2b0b;font-size:13px;letter-spacing:0;font-family:inherit'; c.textContent='خطأ في الاتصال — حاول مرة أخرى'; h.style.display='none'; }
  b.disabled=false; b.textContent='🔗 إنشاء رمز ربط برقم الهاتف';
}
async function tick(){
  img.src='/pair/qr?t='+Date.now();
  try{const h=await fetch('/api/health');const j=await h.json();
  const s=j.gateway&&j.gateway.status;
  if(s==='ready'){st.className='st ok';st.textContent='تم الربط بنجاح ✓ — يمكنك إغلاق الصفحة';}
  else{st.className='st bad';st.textContent='بانتظار الربط… ('+(s||'offline')+')';}
  }catch(e){st.className='st bad';st.textContent='تعذر الاتصال بالخادم';}
}
setInterval(tick,5000);tick();
</script></body></html>`;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(html);
      }

      // On-demand pairing code (phone-number link, no camera needed). Safe to expose:
      // a minted code is useless unless typed by the phone owner on the business number.
      if (p === '/pair/code' && req.method === 'POST') {
        try {
          const base = process.env.WHATSAPP_API_URL || 'http://127.0.0.1:2785';
          const sid = process.env.OPENWA_SESSION_ID || '';
          const phone = (process.env.WHATSAPP_DEFAULT_PHONE || '201061399688').replace(/\D/g, '');
          const r = await fetch(`${base}/api/sessions/${sid}/pairing-code`, {
            method: 'POST',
            headers: {
              'X-API-Key': process.env.OPENWA_OPERATOR_KEY || process.env.WHATSAPP_API_TOKEN || '',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phoneNumber: phone }),
            signal: AbortSignal.timeout(20000),
          });
          const d = await r.json().catch(() => ({}));
          const code = String(d.code || d.pairingCode || d.pairing_code || '').trim();
          if (!r.ok || !code) return json(res, 502, { ok: false, error: (d && d.message) || `gateway ${r.status}` });
          return json(res, 200, { ok: true, code });
        } catch (e) {
          return json(res, 502, { ok: false, error: e.message });
        }
      }

      if (p === '/pair/qr' && req.method === 'GET') {
        try {
          const base = process.env.WHATSAPP_API_URL || 'http://127.0.0.1:2785';
          const sid = process.env.OPENWA_SESSION_ID || '';
          const r = await fetch(`${base}/api/sessions/${sid}/qr`, {
            headers: { 'X-API-Key': process.env.OPENWA_OPERATOR_KEY || process.env.WHATSAPP_API_TOKEN || '' },
            signal: AbortSignal.timeout(8000),
          });
          const d = await r.json();
          const b64 = String(d.qrCode || d.qr || '').includes(',') ? String(d.qrCode || d.qr).split(',')[1] : String(d.qrCode || d.qr || '');
          if (!b64) return json(res, 404, { ok: false, error: 'no qr available' });
          const img = Buffer.from(b64, 'base64');
          res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
          return res.end(img);
        } catch (e) {
          return json(res, 502, { ok: false, error: e.message });
        }
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

  // ensure one-shot seeding of the owner-outreach row (idempotent)
  try {
    const seeded = await sb.upsertWorkflowRow({
      slug: 'owner-outreach',
      name: 'Owner Outreach',
      name_ar: 'التواصل مع الملاك',
      description: 'Daily Cairo-windowed WhatsApp introductions to property owners from the inventory sheet (gviz read, local ledger dedupe, cap 40/day, 10:00-20:00 Cairo only).',
      status: 'active',
      schedule: '11 11,16 * * *',
      category: 'outreach',
      trigger_type: 'cron',
      source_path: 'workflows/09-owner-outreach/outreach.js',
    });
    if (seeded) log('owner-outreach row present in workflows registry');
  } catch (e) {
    log(`owner-outreach seeding skipped: ${e.message}`);
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
