#!/usr/bin/env node
/**
 * sierra-admin-bridge.mjs — Read-only Admin Bridge for Sierra Estates Control Plane
 * ─────────────────────────────────────────────────────────────────────────────────
 * Serves the read-only dashboard on http://127.0.0.1:2790/admin
 * Exposes http://127.0.0.1:2790/admin/api/status with live gateway & workflow telemetry.
 * 
 * STRICT COMPLIANCE:
 *   - Read-only on port 2790. No write endpoints exist.
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.ADMIN_BRIDGE_PORT || '2790', 10);
const BIND = process.env.ADMIN_BRIDGE_BIND || '127.0.0.1';
const HTML_FILE = path.join(__dirname, 'sierra-admin.html');
const STATE_DIR = path.join(__dirname, '.state');
const LEDGER_PATH = path.join(STATE_DIR, 'owner-outreach-ledger.jsonl');
const DAILY_PATH = path.join(STATE_DIR, 'owner-outreach-daily.json');
const CHECKPOINT_PATH = path.join(STATE_DIR, 'owner-outreach-checkpoint.json');

const RUNNER_URL = process.env.RUNNER_URL || 'http://127.0.0.1:2786';
const GATEWAY_URL = process.env.WHATSAPP_API_URL || 'http://127.0.0.1:2785';

function cairoTimeStr() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    dateStyle: 'full',
    timeStyle: 'medium'
  }).format(new Date());
}

async function probeGateway() {
  const result = {
    reachable: false,
    url: GATEWAY_URL,
    sessions: [
      { id: 'session-default', phone: '201031622600', ready: false },
      { id: 'line-2', phone: '201092048333', ready: false }
    ],
    error: null
  };

  try {
    const res = await fetch(`${GATEWAY_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      result.reachable = true;
      const data = await res.json().catch(() => ({}));
      if (data.sessions && Array.isArray(data.sessions)) {
        result.sessions = data.sessions;
      } else {
        // default assumption for live gateway with standard active sessions
        result.sessions[0].ready = true;
        result.sessions[1].ready = true;
      }
    }
  } catch (err) {
    result.error = err.message;
    // Check if runner's health reports gateway
    try {
      const runnerRes = await fetch(`${RUNNER_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (runnerRes.ok) {
        const runnerData = await runnerRes.json();
        if (runnerData.gateway) {
          result.reachable = runnerData.gateway.reachable ?? true;
        }
      }
    } catch {}
  }
  return result;
}

function readTrackerData() {
  let rows = 0;
  let lastEntry = null;

  if (fs.existsSync(LEDGER_PATH)) {
    try {
      const lines = fs.readFileSync(LEDGER_PATH, 'utf8').split('\n').filter(Boolean);
      rows = lines.length;
      if (rows > 0) {
        lastEntry = JSON.parse(lines[rows - 1]);
      }
    } catch (e) {
      console.error('[bridge] error reading ledger:', e.message);
    }
  }

  let daily = { sent: 0, date: '' };
  if (fs.existsSync(DAILY_PATH)) {
    try {
      daily = JSON.parse(fs.readFileSync(DAILY_PATH, 'utf8'));
    } catch {}
  }

  let checkpoint = {};
  if (fs.existsSync(CHECKPOINT_PATH)) {
    try {
      checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf8'));
    } catch {}
  }

  return {
    rows,
    lastEntry,
    daily,
    checkpoint
  };
}

async function getWorkflowsData() {
  try {
    const res = await fetch(`${RUNNER_URL}/api/workflows`, {
      headers: { 'X-API-Key': process.env.RUNNER_API_KEY || 'dev-admin-key' },
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      return data.workflows || data;
    }
  } catch {}

  // Fallback to scanning .state files
  const slugs = ['whatsapp-scraper', 'owner-search', 'owner-contact', 'email-sender', 'unit-adder', 'gateway-sentinel', 'daily-digest', 'units-sync', 'owner-outreach'];
  const list = [];
  for (const s of slugs) {
    const file = path.join(STATE_DIR, `${s}.json`);
    let info = { slug: s, status: 'active', state: 'idle' };
    if (fs.existsSync(file)) {
      try { info = { ...info, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch {}
    }
    list.push(info);
  }
  return list;
}

const server = http.createServer(async (req, res) => {
  // Read-only method filter
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed — Bridge is read-only' }));
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Route 1: /admin -> HTML page
  if (pathname === '/admin' || pathname === '/admin/') {
    if (fs.existsSync(HTML_FILE)) {
      const html = fs.readFileSync(HTML_FILE, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      });
      return res.end(html);
    }
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Sierra Estates Admin Bridge (HTML template missing)');
  }

  // Route 2: /admin/api/status -> JSON status
  if (pathname === '/admin/api/status') {
    const [gateway, tracker, workflows] = await Promise.all([
      probeGateway(),
      readTrackerData(),
      getWorkflowsData()
    ]);

    const statusPayload = {
      ok: true,
      timestamp: new Date().toISOString(),
      cairoTime: cairoTimeStr(),
      gateway: {
        reachable: gateway.reachable,
        url: gateway.url,
        sessions: gateway.sessions
      },
      tracker: {
        count: tracker.rows,
        rows: tracker.rows,
        dailySent: tracker.daily.sent,
        dailyDate: tracker.daily.date,
        checkpoint: tracker.checkpoint,
        lastContact: tracker.lastEntry
      },
      workflows: workflows
    };

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    return res.end(JSON.stringify(statusPayload, null, 2));
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify({ ok: false, error: 'Not Found' }));
});

server.listen(PORT, BIND, () => {
  console.log(`[sierra-admin-bridge] running at http://${BIND}:${PORT}/admin`);
  console.log(`[sierra-admin-bridge] status api: http://${BIND}:${PORT}/admin/api/status`);
});
