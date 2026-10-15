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
 *      X-API-Key / Bearer RUNNER_API_KEY (timing-safe compare, fail-closed
 *      when the key is not configured):
 *        GET  /api/health      minimal public liveness; FULL payload only
 *                              with a valid API key (gateway/supabase/running
 *                              details are operational information)
 *        GET  /api/workflows                 DB rows + local run state
 *        POST /api/workflows/:slug/run       manual trigger (locked)
 *        GET  /api/workflows/:slug/logs?n=10 run history tails
 *        POST /pair/code                     pairing-code mint (auth + rate-limited)
 *        GET  /pair/qr                       pairing QR (auth)
 *        GET  /tracker.csv                   outreach ledger export (auth ONLY —
 *                              the legacy hard-coded query key was removed)
 *
 * Manual runs are what the (prepared) admin patch
 * `/api/admin/workflow-ops` + WorkflowStudio "Run now" button calls.
 *
 * Exit semantics of child workflows: 0 ok · 2 unconfigured (does NOT
 * count against success_rate) · other/timeout = error.
 */
const { spawn } = require('child_process');
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
try { require('dotenv').config({ path: path.join(__dirname, '.env') }); } catch {}
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
const lastFiredHour = new Map(); // slug → "YYYY-MM-DD-HH" already handled for hourly active slots
const manualQueue = new Map(); // slug → trigger origin ('cron' | 'manual' | 'studio')
const startedAt = Date.now();

function log(...args) {
  console.log(new Date().toISOString(), '[runner]', ...args);
}

// ── P0 2.1: fail-closed authentication + timing-safe comparison ──────────
// A missing RUNNER_API_KEY means the control plane is NOT authenticated:
// every protected route must refuse (401) instead of opening up. The old
// "missing key = allow everything" interpretation is gone.
function authorized(req) {
  if (!API_KEY) return false;
  const h = req.headers['x-api-key'] || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!h) return false;
  // Compare fixed-length SHA-256 digests so both length and content checks
  // are timing-safe (no early return on the first mismatching byte).
  const a = crypto.createHash('sha256').update(String(h)).digest();
  const b = crypto.createHash('sha256').update(String(API_KEY)).digest();
  return crypto.timingSafeEqual(a, b);
}

function isLoopbackHost(host) {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1' || host === '[::1]';
}

// ── P0 2.1/2.3: in-memory per-IP abuse protection for sensitive actions ──
// Buckets: failed authentications and pairing-code mints. Best-effort (an
// attacker spoofing source IPs can bypass it), but stops trivial abuse of a
// loopback/tunnel-exposed runner.
const RATE_BUCKETS = new Map(); // bucketKey:ip → { count, resetAt }
function rateLimited(bucket, ip, max, windowMs) {
  const now = Date.now();
  const key = `${bucket}:${ip}`;
  const entry = RATE_BUCKETS.get(key);
  if (!entry || entry.resetAt <= now) {
    RATE_BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  if (RATE_BUCKETS.size > 10000) { // keep the map bounded
    for (const [k, v] of RATE_BUCKETS) if (v.resetAt <= now) RATE_BUCKETS.delete(k);
  }
  return entry.count > max;
}

function clientIp(req) {
  return String(req.socket?.remoteAddress || 'unknown');
}

/** Uniform 401/429 denial for protected routes (fail-closed + abuse guard). */
function deny(res, req) {
  if (rateLimited('authfail', clientIp(req), 20, 5 * 60 * 1000)) {
    json(res, 429, { ok: false, error: 'rate_limited' });
    return true;
  }
  json(res, 401, { ok: false, error: 'unauthorized' });
  return true;
}

/** Run one workflow to completion; update local state + Supabase telemetry. */
async function runWorkflow(slug, trigger = 'cron') {
  if (running.has(slug)) {
    log(`${slug}: still running — ${trigger} trigger skipped`);
    return { skipped: true, reason: 'already_running' };
  }
  const scriptRel = SCRIPTS[slug];
  if (!scriptRel) return { skipped: true, reason: 'unknown_slug' };

  // P0-9 STATUS RECHECK immediately before execution. Automatic triggers
  // (cron / hourly-window / studio run-request) must never run a workflow
  // whose persisted status is not 'active' — a paused/draft workflow can only
  // be executed through the authenticated explicit POST /run endpoint by a
  // human operator (deliberate emergency action, honestly labelled).
  const AUTOMATIC_TRIGGERS = new Set(['cron', 'hourly-window', 'studio', 'run-requested']);
  if (AUTOMATIC_TRIGGERS.has(trigger) && sb.configured()) {
    try {
      const current = await sb.getWorkflows([slug]);
      const status = current.length ? String(current[0].status || '').toLowerCase() : '';
      if (!current.length || status !== 'active') {
        log(`${slug}: dispatch refused — persisted status '${status || '(no row)'}' (trigger ${trigger})`);
        return { skipped: true, reason: 'not_active', status: status || '(no row)' };
      }
    } catch (e) {
      // Fail-closed: the authoritative status could not be read, so the
      // automatic dispatch does not happen.
      log(`${slug}: dispatch refused — status recheck failed (fail-closed): ${e.message}`);
      return { skipped: true, reason: 'status_check_failed' };
    }
  }

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
  // FAIL-CLOSED (P0-9): when Supabase is not configured (or the read fails)
  // there are NO authoritative workflow rows — the runner must stay idle
  // instead of inventing active scheduled rows. HTTP manual runs of explicit
  // human operators remain available; automatic dispatch requires live rows.
  if (!sb.configured()) {
    log('supabase not configured — scheduler idle, no dispatch (fail-closed)');
    return;
  }
  let rows = [];
  try {
    rows = await sb.getWorkflows(SLUGS);
  } catch (e) {
    log(`workflows read failed — no dispatch this pass (fail-closed): ${e.message}`);
    return;
  }
  const rowBySlug = new Map(rows.map((r) => [r.slug, r]));

  // Hourly window check (10:00 to 20:00 Cairo time) for owner-outreach.
  // P0-9: the hourly batch only queues when the PERSISTED row is 'active'.
  // A paused/draft workflow must never execute from a local timer, and the
  // status is re-verified again inside runWorkflow() immediately before the
  // child is spawned (guard against a mid-minute pause).
  try {
    const cairoFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      hour: 'numeric',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const cairoHour = parseInt(cairoFmt.find((p) => p.type === 'hour')?.value || '0', 10);
    const cairoDate = `${cairoFmt.find((p) => p.type === 'year')?.value}-${cairoFmt.find((p) => p.type === 'month')?.value}-${cairoFmt.find((p) => p.type === 'day')?.value}`;
    const hourKey = `${cairoDate}-${cairoHour}`;

    const outreachRow = rowBySlug.get('owner-outreach');
    if (
      cairoHour >= 10 && cairoHour <= 20 &&
      outreachRow && String(outreachRow.status || '').toLowerCase() === 'active' &&
      !running.has('owner-outreach') && !manualQueue.has('owner-outreach') &&
      lastFiredHour.get('owner-outreach') !== hourKey
    ) {
      log(`hourly active window match: Cairo hour ${cairoHour}:00 (${hourKey}) — queuing batch`);
      lastFiredHour.set('owner-outreach', hourKey);
      manualQueue.set('owner-outreach', 'hourly-window');
    }
  } catch (err) {
    log(`hourly window check failed: ${err.message}`);
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
    res.writeHead(code, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Cache-Control': 'no-store', // pairing/health responses must never be cached
    });
    res.end(body);
  };

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const p = url.pathname;

    try {
      if (p === '/api/health' && req.method === 'GET') {
        // P0 2.1: unauthenticated callers get MINIMAL liveness only — uptime is
        // not sensitive, but gateway/session/supabase details are operational
        // information and are reserved for authenticated operators.
        if (!authorized(req)) {
          return json(res, 200, { ok: true, service: 'se-workflow-runner' });
        }
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
      // P0 2.3: the portal page itself carries no secrets, but every pairing
      // ASSET (QR image, pairing code, gateway status) is fetched with the
      // operator's API key — unauthenticated callers get nothing.
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
.key{background:#111b21;color:#e9edef;border:1px solid #2a3942;border-radius:8px;padding:10px 12px;font-size:14px;width:100%;box-sizing:border-box;margin:6px 0 2px}
.divider{display:flex;align-items:center;gap:10px;color:#8696a0;font-size:12px;margin:14px 0 0}
.divider:before,.divider:after{content:'';flex:1;height:1px;background:#2a3942}
b{color:#e9edef}</style></head><body><div class="card">
<h1>Sierra Estates — ربط الواتساب</h1>
<p>أدخل مفتاح الوصول (Access Key) للمتابعة — صفحة الربط محمية.</p>
<input class="key" id="key" type="password" placeholder="Access key" autocomplete="off">
<button class="btn" id="save" onclick="saveKey()">فتح صفحة الربط</button>
<div id="portal" style="display:none">
<p>1) افتح واتساب على جوالك <b>+20 106 139 9688</b><br>2) الإعدادات ← الأجهزة المرتبطة ← ربط جهاز<br>3) وجّه الكاميرا على المربع التالي (يتم تحديثه تلقائياً كل 5 ثوانٍ)</p>
<img id="qr" alt="QR">
<p class="st bad" id="st">…</p>
<p dir="ltr" style="font-size:11px">This QR refreshes automatically. If scanning fails, wait 5s and try again.</p>
<div class="divider">أو بدون كاميرا</div>
<button class="btn" id="mint" onclick="mintCode()">🔗 إنشاء رمز ربط برقم الهاتف</button>
<div class="code" id="code"></div>
<p id="codehint" style="display:none">1) واتساب ← الأجهزة المرتبطة ← ربط جهاز<br>2) اختر «الربط برقم الهاتف بدلاً من ذلك»<br>3) أدخل الرمز أعلاه (صالح لعدة دقائق فقط)</p>
</div>
</div><script>
const KEY_STORE='se_pair_access_key';
let KEY='';
function hdrs(){return {'X-API-Key':KEY}}
function saveKey(){
  KEY=document.getElementById('key').value.trim();
  if(!KEY){alert('أدخل مفتاح الوصول أولاً');return}
  try{sessionStorage.setItem(KEY_STORE,KEY)}catch(e){}
  document.getElementById('portal').style.display='block';
  document.getElementById('save').style.display='none';
  document.getElementById('key').style.display='none';
  tick();
}
const img=document.getElementById('qr'), st=document.getElementById('st');
async function mintCode(){
  const b=document.getElementById('mint'), c=document.getElementById('code'), h=document.getElementById('codehint');
  b.disabled=true; b.textContent='… جاري إنشاء الرمز';
  c.className='code show'; c.textContent='…';
  try{
    const r=await fetch('/pair/code',{method:'POST',headers:hdrs()}); const j=await r.json();
    if(r.ok&&j&&j.ok&&j.code){ c.textContent=String(j.code).replace(/[^A-Z0-9]/gi,'').toUpperCase(); h.style.display='block'; }
    else if(r.status===429){ c.style.cssText='display:block;color:#ffc861;background:#3d2b0b;font-size:13px;letter-spacing:0;font-family:inherit';
      c.textContent='تم تجاوز الحد المسموح من المحاولات — انتظر عشر دقائق ثم حاول مجدداً.'; h.style.display='none'; }
    else{ c.style.cssText='display:block;color:#ffc861;background:#3d2b0b;font-size:13px;letter-spacing:0;font-family:inherit';
      c.textContent='تعذر إنشاء رمز الآن — واتساب يفرض حظراً مؤقتاً على الرموز لهذا الرقم. استخدم مسح QR أعلاه، أو حاول بعد ٣٠ دقيقة.'; h.style.display='none'; }
  }catch(e){ c.className='code show'; c.style.cssText='display:block;color:#ffc861;background:#3d2b0b;font-size:13px;letter-spacing:0;font-family:inherit'; c.textContent='خطأ في الاتصال — حاول مرة أخرى'; h.style.display='none'; }
  b.disabled=false; b.textContent='🔗 إنشاء رمز ربط برقم الهاتف';
}
let lastObj=null;
async function tick(){
  if(!KEY)return;
  try{
    const r=await fetch('/pair/qr?t='+Date.now(),{headers:hdrs(),cache:'no-store'});
    if(r.status===401){st.className='st bad';st.textContent='مفتاح الوصول غير صحيح';return}
    if(!r.ok){st.className='st bad';st.textContent='لا يوجد رمز QR متاح حالياً';return}
    const blob=await r.blob();
    if(lastObj)URL.revokeObjectURL(lastObj);
    lastObj=URL.createObjectURL(blob); img.src=lastObj;
  }catch(e){st.className='st bad';st.textContent='تعذر الاتصال بالخادم';return}
  try{const h=await fetch('/api/health',{headers:hdrs(),cache:'no-store'});const j=await h.json();
  const s=j.gateway&&j.gateway.status;
  if(s==='ready'){st.className='st ok';st.textContent='تم الربط بنجاح ✓ — يمكنك إغلاق الصفحة';}
  else{st.className='st bad';st.textContent='بانتظار الربط… ('+(s||'offline')+')';}
  }catch(e){st.className='st bad';st.textContent='تعذر الاتصال بالخادم';}
}
try{const k=sessionStorage.getItem(KEY_STORE);if(k){KEY=k;saveKey()}}catch(e){}
setInterval(tick,5000);
</script></body></html>`;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(html);
      }

      // On-demand pairing code (phone-number link, no camera needed).
      // P0 2.3: authenticated + rate-limited (5 mints / 10 min / IP) — a minted
      // code is a sensitive linking capability, not a public endpoint.
      if (p === '/pair/code' && req.method === 'POST') {
        if (!authorized(req)) {
          if (rateLimited('authfail', clientIp(req), 20, 5 * 60 * 1000)) {
            return json(res, 429, { ok: false, error: 'rate_limited' });
          }
          return json(res, 401, { ok: false, error: 'unauthorized' });
        }
        if (rateLimited('paircode', clientIp(req), 5, 10 * 60 * 1000)) {
          return json(res, 429, { ok: false, error: 'rate_limited', retryAfterMin: 10 });
        }
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
        // P0 2.3: pairing QR is a sensitive linking capability — auth required.
        if (!authorized(req)) {
          if (rateLimited('authfail', clientIp(req), 20, 5 * 60 * 1000)) {
            return json(res, 429, { ok: false, error: 'rate_limited' });
          }
          return json(res, 401, { ok: false, error: 'unauthorized' });
        }
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
        if (!authorized(req)) { deny(res, req); return; }
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
        if (!authorized(req)) { deny(res, req); return; }
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
        if (!authorized(req)) { deny(res, req); return; }
        const n = Math.min(parseInt(url.searchParams.get('n') || '10', 10) || 10, 20);
        return json(res, 200, { ok: true, slug: logsMatch[1], history: state.tail(logsMatch[1], n) });
      }

      // ── Inbound WhatsApp webhook target (gateway → runner, same box) ──
      if (p === '/api/inbound' && req.method === 'POST') {
        if (!authorized(req)) { deny(res, req); return; }
        const raw = await readBody(req, 256 * 1024);
        let body = null;
        try { body = JSON.parse(raw); } catch (_) { body = { raw: String(raw).slice(0, 2000) } }
        const out = await inbox.handleInbound(body);
        return json(res, 202, { ok: true, ...out });
      }

      if (p === '/api/inbound/preview' && req.method === 'GET') {
        if (!authorized(req)) { deny(res, req); return; }
        const n = Math.min(parseInt(url.searchParams.get('n') || '20', 10) || 20, 100);
        return json(res, 200, { ok: true, messages: inbox.preview(n) });
      }

      if (p === '/tracker.csv' && req.method === 'GET') {
        // P0 2.2: the hard-coded query-key bypass (static shared secret in a
        // URL parameter) is REMOVED. Outreach ledgers contain owner phone
        // numbers, outreach codes and session details — the export is
        // authenticated exactly like every other protected route, and never
        // via a URL query parameter (URLs persist in proxy logs, browser
        // history and monitoring systems).
        if (!authorized(req)) {
          if (rateLimited('authfail', clientIp(req), 20, 5 * 60 * 1000)) {
            return json(res, 429, { ok: false, error: 'rate_limited' });
          }
          return json(res, 401, { ok: false, error: 'unauthorized' });
        }
        const ledgerFile = path.join(WF_DIR, '.state', 'owner-outreach-ledger.jsonl');
        if (!fs.existsSync(ledgerFile)) {
          res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8' });
          return res.end('phone,code,at,avail,session,worker,cursor\n');
        }
        const lines = fs.readFileSync(ledgerFile, 'utf8').split('\n').filter(Boolean);
        const csvRows = ['phone,code,at,avail,session,worker,cursor'];
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            const phone = entry.phone || '';
            const code = entry.code || '';
            const at = entry.at || entry.ts || '';
            const avail = entry.avail || '';
            const session = entry.session || '';
            const worker = entry.worker || '';
            const cursor = entry.cursor !== undefined ? entry.cursor : '';
            csvRows.push(`"${phone}","${code}","${at}","${avail}","${session}","${worker}","${cursor}"`);
          } catch (_) {}
        }
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'inline; filename="tracker.csv"',
        });
        return res.end(csvRows.join('\n'));
      }

      return json(res, 404, { ok: false, error: 'not_found' });
    } catch (e) {
      return json(res, 500, { ok: false, error: e.message });
    }
  });
}

async function main() {
  log(`workflow runner starting — bind=${BIND}:${PORT} poll=${POLL_MS / 1000}s tz=${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

  // P0 2.1: a non-loopback bind WITHOUT an API key would expose an
  // unauthenticated control plane (run triggers, owner ledger export,
  // inbound webhook) to the network — refuse to start instead.
  if (!isLoopbackHost(BIND) && !API_KEY) {
    console.error(`runner fatal: RUNNER_BIND=${BIND} is not loopback and RUNNER_API_KEY is not set — refusing to expose an unauthenticated control plane. Set RUNNER_API_KEY (or bind to 127.0.0.1).`);
    process.exit(1);
  }
  if (!API_KEY) {
    log('WARNING: RUNNER_API_KEY is not set — every protected route will fail closed (401) until it is configured');
  }

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
