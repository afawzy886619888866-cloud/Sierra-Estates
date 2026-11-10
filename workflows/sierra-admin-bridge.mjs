import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { loadWorkflowEnv } = require('./lib/google-sheets.js');
loadWorkflowEnv(__dirname);

const PORT = Number(process.env.ADMIN_BRIDGE_PORT || 2790);
const GATEWAY_URL = (process.env.WHATSAPP_API_URL || 'http://127.0.0.1:2785').replace(/\/+$/, '');
const RUNNER_URL = (process.env.WORKFLOW_OPS_URL || 'http://127.0.0.1:2786').replace(/\/+$/, '');
const GATEWAY_TOKEN =
  process.env.OPENWA_OPERATOR_KEY ||
  process.env.WHATSAPP_API_KEY ||
  process.env.WHATSAPP_API_TOKEN ||
  process.env.OPENWA_ADMIN_API_KEY ||
  '';
const RUNNER_KEY = String(process.env.RUNNER_API_KEY || '').trim();

function runnerHeaders(extra = {}) {
  return { ...(RUNNER_KEY ? { 'X-API-Key': RUNNER_KEY } : {}), ...extra };
}

const STATE_DIR = path.join(__dirname, '.state');

function log(...args) {
  console.log(`[${new Date().toISOString()}] [admin-bridge]`, ...args);
}

function getCairoTime() {
  return new Date().toLocaleString('en-US', {
    timeZone: 'Africa/Cairo',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

async function probeGateway() {
  try {
    const headers = GATEWAY_TOKEN ? { 'X-API-Key': GATEWAY_TOKEN } : {};
    const [healthRes, sessRes] = await Promise.all([
      fetch(`${GATEWAY_URL}/api/health`, { signal: AbortSignal.timeout(4000) }).catch(() => null),
      fetch(`${GATEWAY_URL}/api/sessions`, { headers, signal: AbortSignal.timeout(5000) }).catch(() => null),
    ]);
    // Honest telemetry: never fabricate readiness from a missing or unauthenticated /api/sessions call.
    const sessionsKnown = Boolean(sessRes && sessRes.ok);
    let sessions = [];
    if (sessionsKnown) {
      const sData = await sessRes.json().catch(() => ({}));
      sessions = Array.isArray(sData) ? sData : Array.isArray(sData.data) ? sData.data : Array.isArray(sData.sessions) ? sData.sessions : [];
    }
    const readyCount = sessionsKnown
      ? sessions.filter((s) => String(s.status || '').toLowerCase() === 'ready').length
      : null;
    return {
      reachable: Boolean((healthRes && healthRes.ok) || sessionsKnown),
      sessionsKnown,
      readyCount,
      totalSessions: sessionsKnown ? sessions.length : null,
      sessions,
    };
  } catch (err) {
    return { reachable: false, sessionsKnown: false, readyCount: null, totalSessions: null, sessions: [], error: err.message };
  }
}

async function probeRunner() {
  try {
    const headers = runnerHeaders();
    const [hRes, wfRes] = await Promise.all([
      fetch(`${RUNNER_URL}/api/health`, { headers, signal: AbortSignal.timeout(4000) }).catch(() => null),
      fetch(`${RUNNER_URL}/api/workflows`, { headers, signal: AbortSignal.timeout(5000) }).catch(() => null),
    ]);
    const health = hRes && hRes.ok ? await hRes.json().catch(() => ({ ok: true })) : { ok: false };
    const wfJson = wfRes && wfRes.ok ? await wfRes.json().catch(() => ({})) : {};
    return {
      reachable: Boolean(hRes && hRes.ok),
      health,
      workflows: Array.isArray(wfJson.workflows) ? wfJson.workflows : [],
    };
  } catch (err) {
    return { reachable: false, health: { ok: false }, workflows: [], error: err.message };
  }
}

function readLocalState() {
  const state = {
    trackerRows: 0,
    dailySent: 0,
    dailyCap: parseInt(process.env.WF_OWNER_CONTACT_DAILY_CAP || '150', 10),
    twoHourReport: null,
    outreachConfig: {
      continuous: true,
      cooldownSec: 90,
      dailyCap: parseInt(process.env.WF_OWNER_CONTACT_DAILY_CAP || '150', 10),
      activeHours: [9, 22],
    },
    checkpoint: null,
    workflows: [],
  };

  try {
    const ledgerPath = path.join(STATE_DIR, 'owner-outreach-ledger.jsonl');
    if (fs.existsSync(ledgerPath)) {
      const content = fs.readFileSync(ledgerPath, 'utf8').trim();
      state.trackerRows = content ? content.split('\n').filter(Boolean).length : 0;
    }

    const dailyPath = path.join(STATE_DIR, 'owner-outreach-daily.json');
    if (fs.existsSync(dailyPath)) {
      const daily = JSON.parse(fs.readFileSync(dailyPath, 'utf8'));
      state.dailySent = daily.sent || 0;
    }

    const repPath = path.join(STATE_DIR, 'two-hour-outreach-report.json');
    if (fs.existsSync(repPath)) {
      state.twoHourReport = JSON.parse(fs.readFileSync(repPath, 'utf8'));
      if (state.twoHourReport?.total_all_time > state.trackerRows) {
        state.trackerRows = state.twoHourReport.total_all_time;
      }
      if (state.twoHourReport?.sent_today_total > state.dailySent) {
        state.dailySent = state.twoHourReport.sent_today_total;
      }
    }

    const cfgPath = path.join(STATE_DIR, 'owner-outreach-config.json');
    if (fs.existsSync(cfgPath)) {
      state.outreachConfig = {
        ...state.outreachConfig,
        ...JSON.parse(fs.readFileSync(cfgPath, 'utf8')),
      };
      state.dailyCap = state.outreachConfig.dailyCap || state.dailyCap;
    }

    const cpPath = path.join(STATE_DIR, 'owner-outreach-checkpoint.json');
    if (fs.existsSync(cpPath)) {
      state.checkpoint = JSON.parse(fs.readFileSync(cpPath, 'utf8'));
    }

    const wfCachePath = path.join(STATE_DIR, 'workflows-cache.json');
    if (fs.existsSync(wfCachePath)) {
      state.workflows = JSON.parse(fs.readFileSync(wfCachePath, 'utf8'));
    }
  } catch (err) {
    log('Error reading local state:', err.message);
  }

  return state;
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── 1. Health & Live Status ──────────────────────────────────────────────
  if (p === '/api/health' || p === '/admin/api/status') {
    const [gateway, runner] = await Promise.all([probeGateway(), probeRunner()]);
    const localState = readLocalState();
    const workflows = runner.workflows.length ? runner.workflows : localState.workflows;

    return sendJson(res, 200, {
      ok: true,
      service: 'sierra-admin-bridge',
      cairoTime: getCairoTime(),
      gateway,
      runner: {
        reachable: runner.reachable,
        running: runner.health?.running || [],
        uptimeSec: runner.health?.uptimeSec || 0,
      },
      tracker: {
        rows: localState.trackerRows,
        dailySent: localState.dailySent,
        dailyCap: localState.dailyCap,
      },
      twoHourReport: localState.twoHourReport,
      outreachConfig: localState.outreachConfig,
      checkpoint: localState.checkpoint,
      workflows,
    });
  }

  // ── 2. 2-Hour Outreach Report (GET & Trigger POST) ───────────────────────
  if (p === '/admin/api/report' && req.method === 'GET') {
    const localState = readLocalState();
    return sendJson(res, 200, {
      ok: true,
      report: localState.twoHourReport,
      config: localState.outreachConfig,
    });
  }

  if (p === '/admin/api/report/send' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const { generateAndSendTwoHourDigest } = require('./lib/two-hour-outreach-digest.js');
      const report = await generateAndSendTwoHourDigest({
        sendWhatsApp: body.sendWhatsApp !== false,
        adminPhone: body.adminPhone || undefined,
      });
      return sendJson(res, 200, { ok: true, report });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  // ── 3. Outreach Config Control (Continuous Mode / Cap / Cooldown) ────────
  if (p === '/admin/api/outreach/config' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const cfgPath = path.join(STATE_DIR, 'owner-outreach-config.json');
      let config = {
        continuous: true,
        cooldownSec: 90,
        dailyCap: parseInt(process.env.WF_OWNER_CONTACT_DAILY_CAP || '150', 10),
        activeHours: [9, 22],
      };
      if (fs.existsSync(cfgPath)) {
        try { config = { ...config, ...JSON.parse(fs.readFileSync(cfgPath, 'utf8')) }; } catch (_) {}
      }
      if (body.continuous !== undefined) config.continuous = Boolean(body.continuous);
      if (Number.isFinite(Number(body.cooldownSec)) && Number(body.cooldownSec) >= 15) {
        config.cooldownSec = Number(body.cooldownSec);
      }
      if (Number.isFinite(Number(body.dailyCap)) && Number(body.dailyCap) >= 1) {
        config.dailyCap = Number(body.dailyCap);
      }
      if (Array.isArray(body.activeHours) && body.activeHours.length === 2) {
        config.activeHours = [Number(body.activeHours[0]) || 9, Number(body.activeHours[1]) || 22];
      }
      fs.mkdirSync(STATE_DIR, { recursive: true });
      fs.writeFileSync(cfgPath, JSON.stringify(config, null, 2), 'utf8');
      return sendJson(res, 200, { ok: true, config });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  // ── 4. Trigger Any Workflow Immediately ──────────────────────────────────
  const runMatch = p.match(/^\/admin\/api\/workflows\/([\w-]+)\/run$/);
  if (runMatch && req.method === 'POST') {
    const slug = runMatch[1];
    try {
      const headers = runnerHeaders({ 'Content-Type': 'application/json' });
      const r = await fetch(`${RUNNER_URL}/api/workflows/${encodeURIComponent(slug)}/run`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(8000),
      });
      const data = await r.json().catch(() => ({}));
      return sendJson(res, r.status, { ok: r.ok, slug, ...data });
    } catch (err) {
      return sendJson(res, 502, { ok: false, error: err.message });
    }
  }

  // ── 5. Pause / Resume / Patch Workflow Status ────────────────────────────
  const patchMatch = p.match(/^\/admin\/api\/workflows\/([\w-]+)$/);
  if (patchMatch && (req.method === 'PATCH' || req.method === 'POST')) {
    const slug = patchMatch[1];
    try {
      const body = await readJsonBody(req);
      const headers = runnerHeaders({ 'Content-Type': 'application/json' });
      const r = await fetch(`${RUNNER_URL}/api/workflows/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
      const data = await r.json().catch(() => ({}));
      return sendJson(res, r.status, { ok: r.ok, slug, ...data });
    } catch (err) {
      return sendJson(res, 502, { ok: false, error: err.message });
    }
  }

  // ── 6. Restart / Re-init a WhatsApp Session Line ─────────────────────────
  const sessRestartMatch = p.match(/^\/admin\/api\/sessions\/([\w-]+)\/restart$/);
  if (sessRestartMatch && req.method === 'POST') {
    const sid = sessRestartMatch[1];
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (GATEWAY_TOKEN) headers['X-API-Key'] = GATEWAY_TOKEN;
      const r = await fetch(`${GATEWAY_URL}/api/sessions/${encodeURIComponent(sid)}/restart`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(10000),
      });
      const data = await r.json().catch(() => ({}));
      return sendJson(res, r.status, { ok: r.ok, sessionId: sid, ...data });
    } catch (err) {
      return sendJson(res, 502, { ok: false, error: err.message });
    }
  }

  // ── 7. Instant WhatsApp Message Dispatch (Stealth Human Sender) ──────────
  if ((p === '/admin/api/send' || p === '/api/send') && req.method === 'POST') {
    try {
      const payload = await readJsonBody(req);
      const { phone, text, sessionId } = payload;
      if (!phone || !text) {
        return sendJson(res, 400, { ok: false, error: 'Phone and text are required' });
      }
      const cleanPhone = String(phone).replace(/[^\d]/g, '');
      const chatId = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@c.us`;
      const headers = { 'Content-Type': 'application/json' };
      if (GATEWAY_TOKEN) headers['X-API-Key'] = GATEWAY_TOKEN;

      const sendPath = sessionId && sessionId !== 'auto'
        ? `/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`
        : '/api/messages/send-text';
      const gwRes = await fetch(`${GATEWAY_URL}${sendPath}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          chatId,
          phone: cleanPhone,
          text,
          simulateTyping: true,
        }),
      });
      const gwData = await gwRes.json().catch(() => ({}));
      return sendJson(res, gwRes.status, { ok: gwRes.ok, ...gwData });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  // ── 8. Serve Admin Control Dashboard UI ──────────────────────────────────
  if (p === '/' || p === '/admin' || p === '/admin/') {
    const htmlPath = path.join(__dirname, 'sierra-admin.html');
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(fs.readFileSync(htmlPath, 'utf8'));
      return;
    }
  }

  sendJson(res, 404, { error: 'Not Found', path: p });
});

server.listen(PORT, '0.0.0.0', () => {
  log(`Sierra Admin Bridge listening on http://127.0.0.1:${PORT}/admin`);
  log(`Connected to OpenWA Gateway (${GATEWAY_URL}) and Workflow Runner (${RUNNER_URL})`);
});
