'use strict';

/**
 * Sierra Estates — 8-Line Dedicated WhatsApp Multi-Session Worker & Gateway
 * ─────────────────────────────────────────────────────────────────────────
 * Built on @open-wa/wa-automate (https://github.com/open-wa/wa-automate-nodejs)
 * 
 * Features:
 *  - Concurrently manages up to 8 WhatsApp lines (line-1 .. line-8)
 *  - Staggered spin-up (3s delay per browser) to prevent CPU/RAM spikes
 *  - Web Dashboard (http://localhost:2785) with live QR codes & status cards
 *  - Terminal QR code support via qrcode-terminal
 *  - Compatible with Sierra Estates GatewayClient API contract
 *  - Persistent authentication saved under ./whatsapp-auth/<sessionId>
 *  - Per-line anti-spam queue & jitter pacing
 */

const fs = require('fs');
const path = require('path');
let express;
try {
  express = require('express');
} catch (e) {
  console.error('[ERROR] Missing dependency "express". Run: pnpm openwa:8lines:install');
  process.exit(1);
}

let qrcodeTerminal = null;
try {
  qrcodeTerminal = require('qrcode-terminal');
} catch (_) {
  // qrcodeTerminal is optional (QR is rendered in Web Dashboard)
}

let QRCode = null;
try {
  QRCode = require('qrcode');
} catch (_) {
  // QRCode dataURL optional fallback
}

const { harvesterInstance } = require('./harvester');

// Load environment variables
const envPaths = [
  path.join(__dirname, '.env'),
  path.join(__dirname, '..', '..', '..', '.env'),
  path.join(__dirname, '..', '..', '..', 'workflows', '.env')
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    try {
      require('dotenv').config({ path: p });
    } catch (_) {}
  }
}

const PORT = parseInt(process.env.WHATSAPP_GATEWAY_PORT || process.env.PORT || '2785', 10);
const ADMIN_API_KEY = process.env.OPENWA_ADMIN_API_KEY || process.env.WHATSAPP_API_KEY || 'sierra-admin-secret';
const OPERATOR_KEY = process.env.OPENWA_OPERATOR_KEY || process.env.WHATSAPP_API_TOKEN || ADMIN_API_KEY;

// Session definitions: default to line-1 .. line-8 or OPENWA_SESSION_IDS
const rawSessionIds = process.env.OPENWA_SESSION_IDS || '';
const SESSION_IDS = rawSessionIds
  ? rawSessionIds.split(',').map(s => s.trim()).filter(Boolean)
  : Array.from({ length: 8 }, (_, i) => `line-${i + 1}`);

const AUTH_BASE_DIR = path.resolve(__dirname, 'whatsapp-auth');
if (!fs.existsSync(AUTH_BASE_DIR)) {
  fs.mkdirSync(AUTH_BASE_DIR, { recursive: true });
}

// Session state tracking
const sessions = new Map();
for (const id of SESSION_IDS) {
  sessions.set(id, {
    id,
    name: id,
    status: 'INITIALIZING', // INITIALIZING, AWAITING_QR, AUTHENTICATING, READY, DISCONNECTED, ERROR
    phone: null,
    pushName: null,
    qrDataUrl: null,
    qrAscii: null,
    lastActive: null,
    engineLoaded: false,
    client: null,
    messageQueue: [],
    isSending: false,
    error: null,
    totalSent: 0,
    startedAt: new Date().toISOString()
  });
}

// Global Round-Robin index for pool broadcasts
let roundRobinIndex = 0;

/**
 * Middleware: Simple API authentication check (lenient on localhost UI)
 */
function checkAuth(req, res, next) {
  // Allow UI dashboard & static assets freely
  if (req.path === '/' || req.path === '/dashboard' || req.path === '/api/health') {
    return next();
  }
  
  // Also allow GET /api/sessions for dashboard auto-polling
  if (req.method === 'GET' && (req.path === '/api/sessions' || req.path.startsWith('/api/sessions/'))) {
    return next();
  }

  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  if (!apiKey || (apiKey !== ADMIN_API_KEY && apiKey !== OPERATOR_KEY)) {
    // If running in development/local mode with no secret explicitly forced, allow localhost
    const isLocal = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
    if (!process.env.STRICT_GATEWAY_AUTH && isLocal) {
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }
  next();
}

/**
 * Initialize a single OpenWA session
 */
async function initSession(sessionId) {
  let waAutomate;
  try {
    waAutomate = require('@open-wa/wa-automate');
  } catch (err) {
    console.error(`\n[ERROR] @open-wa/wa-automate is not installed in ${__dirname}`);
    console.error(`Run 'npm install' inside apps/agents/whatsapp-multi-session\n`);
    const s = sessions.get(sessionId);
    if (s) {
      s.status = 'ERROR';
      s.error = '@open-wa/wa-automate missing';
    }
    return;
  }

  const s = sessions.get(sessionId);
  s.status = 'STARTING';
  s.error = null;

  console.log(`[${sessionId}] Starting WhatsApp client instance...`);

  try {
    const client = await waAutomate.create({
      sessionId,
      multiDevice: true,
      authTimeout: 0,
      qrTimeout: 0,
      cacheEnabled: false,
      blockCrashLogs: true,
      disableSpins: true,
      headless: true,
      sessionDataPath: AUTH_BASE_DIR,
      useChrome: true,
      killProcessOnBrowserClose: false,
      popup: false,
      logConsole: false,
      qrTimeout: 0,
      qrCallback: async (qrCode, asciiQR, urlCode) => {
        s.status = 'AWAITING_QR';
        s.qrAscii = asciiQR;
        try {
          if (QRCode) {
            s.qrDataUrl = await QRCode.toDataURL(qrCode, { scale: 6, margin: 2 });
          } else {
            s.qrDataUrl = qrCode.startsWith('data:') ? qrCode : null;
          }
        } catch (_) {
          s.qrDataUrl = qrCode.startsWith('data:') ? qrCode : null;
        }

        console.log(`\n══════════════════════════════════════════════════════════`);
        console.log(`  [${sessionId}] QR Code Ready! Scan with phone on line ${sessionId}:`);
        console.log(`══════════════════════════════════════════════════════════`);
        try {
          if (qrcodeTerminal) {
            qrcodeTerminal.generate(qrCode, { small: true });
          }
        } catch (_) {}
        console.log(`Or view live in browser: http://localhost:${PORT}\n`);
      },
      statusFind: (statusSession) => {
        console.log(`[${sessionId}] Status update: ${statusSession}`);
        if (statusSession === 'isLogged' || statusSession === 'chatsAvailable') {
          s.status = 'READY';
          s.qrDataUrl = null;
          s.qrAscii = null;
        } else if (statusSession === 'notLogged') {
          s.status = 'AWAITING_QR';
        } else if (statusSession === 'qrReadSuccess') {
          s.status = 'AUTHENTICATING';
        }
      }
    });

    s.client = client;
    s.engineLoaded = true;

    // Fetch account info
    try {
      const me = await client.getMe();
      if (me && me.id) {
        s.phone = me.id.user || me.id.replace(/@c\.us$/, '');
        s.pushName = me.pushname || `Line ${sessionId}`;
      }
    } catch (_) {}

    s.status = 'READY';
    s.lastActive = new Date().toISOString();
    console.log(`[${sessionId}] Connected successfully! Phone: +${s.phone || 'unknown'}`);

    // Listen for state changes
    client.onStateChanged((state) => {
      console.log(`[${sessionId}] State changed: ${state}`);
      if (state === 'CONFLICT' || state === 'UNLAUNCHED') {
        s.status = 'DISCONNECTED';
      } else if (state === 'CONNECTED') {
        s.status = 'READY';
        s.lastActive = new Date().toISOString();
      }
    });

    // Listen for incoming messages (broker group harvesting + lastActive update)
    client.onMessage((msg) => {
      s.lastActive = new Date().toISOString();
      harvesterInstance.handleIncomingMessage(sessionId, msg).catch((err) => {
        console.error(`[harvester] Error processing message on ${sessionId}:`, err.message);
      });
    });

  } catch (err) {
    console.error(`[${sessionId}] Failed to initialize:`, err.message);
    s.status = 'ERROR';
    s.error = err.message;
  }
}

/**
 * Sequential queue processor per session to prevent spam bans
 */
async function processQueue(sessionId) {
  const s = sessions.get(sessionId);
  if (!s || s.isSending || !s.client || s.status !== 'READY') return;
  if (!s.messageQueue.length) return;

  s.isSending = true;
  const { chatId, text, resolve, reject } = s.messageQueue.shift();

  try {
    const formattedChatId = chatId.includes('@') ? chatId : `${chatId}@c.us`;
    const res = await s.client.sendText(formattedChatId, text);
    s.totalSent += 1;
    s.lastActive = new Date().toISOString();
    resolve({ ok: true, data: { messageId: res || `msg_${Date.now()}`, status: 'sent', session: sessionId } });
  } catch (err) {
    reject(err);
  } finally {
    // 3-5 second human jitter between sends per line
    const jitterMs = 3000 + Math.floor(Math.random() * 2000);
    setTimeout(() => {
      s.isSending = false;
      processQueue(sessionId);
    }, jitterMs);
  }
}

/**
 * Staggered spin-up of all 8 sessions
 */
async function startAllSessions() {
  console.log(`\n[Sierra Estates] Initializing ${SESSION_IDS.length} WhatsApp lines in staggered sequence...`);
  for (let i = 0; i < SESSION_IDS.length; i++) {
    const id = SESSION_IDS[i];
    initSession(id);
    // Stagger 3.5 seconds between browser launches to keep CPU quiet
    if (i < SESSION_IDS.length - 1) {
      await new Promise(r => setTimeout(r, 3500));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Express HTTP Gateway API
// ─────────────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(checkAuth);

/**
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  const activeCount = Array.from(sessions.values()).filter(s => s.status === 'READY').length;
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    totalSessions: SESSION_IDS.length,
    activeSessions: activeCount,
    cairoTime: new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'full', timeStyle: 'medium' }).format(new Date())
  });
});

/**
 * GET /api/sessions — compatible with GatewayClient.resolvePool()
 */
app.get('/api/sessions', (req, res) => {
  const list = Array.from(sessions.values()).map(s => ({
    id: s.id,
    name: s.name,
    status: s.status === 'READY' ? 'ready' : (s.status === 'AWAITING_QR' ? 'scan_qr' : s.status.toLowerCase()),
    phone: s.phone,
    pushName: s.pushName || s.name,
    lastActive: s.lastActive,
    engineLoaded: s.engineLoaded,
    totalSent: s.totalSent,
    hasQr: Boolean(s.qrDataUrl),
    error: s.error
  }));
  res.json(list);
});

/**
 * GET /api/sessions/:sessionId — compatible with GatewayClient.status()
 */
app.get('/api/sessions/:sessionId', (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: `Session ${req.params.sessionId} not found` });
  res.json({
    id: s.id,
    name: s.name,
    status: s.status === 'READY' ? 'ready' : (s.status === 'AWAITING_QR' ? 'scan_qr' : s.status.toLowerCase()),
    phone: s.phone,
    pushName: s.pushName,
    lastActive: s.lastActive,
    engineLoaded: s.engineLoaded,
    hasQr: Boolean(s.qrDataUrl),
    qrDataUrl: s.qrDataUrl,
    error: s.error
  });
});

/**
 * POST /api/sessions/:sessionId/messages/send-text — GatewayClient sendText contract
 */
app.post('/api/sessions/:sessionId/messages/send-text', async (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: `Session ${req.params.sessionId} not found` });
  if (s.status !== 'READY' || !s.client) {
    return res.status(503).json({ error: `Session ${s.id} is not ready (status: ${s.status})` });
  }

  const { chatId, text } = req.body;
  if (!chatId || !text) {
    return res.status(400).json({ error: 'Missing required parameters: chatId and text' });
  }

  try {
    const sendPromise = new Promise((resolve, reject) => {
      s.messageQueue.push({ chatId, text, resolve, reject });
      processQueue(s.id);
    });

    const result = await sendPromise;
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `Send failed: ${err.message}` });
  }
});

/**
 * POST /api/messages/send-text — Auto Round-Robin across any ready line
 */
app.post('/api/messages/send-text', async (req, res) => {
  const readySessions = Array.from(sessions.values()).filter(s => s.status === 'READY' && s.client);
  if (!readySessions.length) {
    return res.status(503).json({ error: 'No WhatsApp lines are currently in READY status' });
  }

  roundRobinIndex = (roundRobinIndex + 1) % readySessions.length;
  const chosen = readySessions[roundRobinIndex];

  const { chatId, text } = req.body;
  if (!chatId || !text) {
    return res.status(400).json({ error: 'Missing required parameters: chatId and text' });
  }

  try {
    const sendPromise = new Promise((resolve, reject) => {
      chosen.messageQueue.push({ chatId, text, resolve, reject });
      processQueue(chosen.id);
    });

    const result = await sendPromise;
    res.json({ ...result, routedSession: chosen.id });
  } catch (err) {
    res.status(500).json({ error: `Send failed on ${chosen.id}: ${err.message}` });
  }
});

/**
 * POST /api/sessions/:sessionId/restart — Restart / re-pair line
 */
app.post('/api/sessions/:sessionId/restart', async (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });

  if (s.client) {
    try {
      await s.client.kill();
    } catch (_) {}
    s.client = null;
  }
  s.status = 'RESTARTING';
  s.qrDataUrl = null;
  s.phone = null;

  initSession(s.id);
  res.json({ ok: true, message: `Session ${s.id} restarted` });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WhatsApp Broker Group RAG Harvester Endpoints
 * ─────────────────────────────────────────────────────────────────────────────
 */

// GET /api/harvester/stream — Server-Sent Events (SSE) for live map alerts
app.get('/api/harvester/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.write('event: connected\ndata: {"status":"listening"}\n\n');
  harvesterInstance.addSseClient(res);
});

// GET /api/harvester/recent — Recent harvested units with coordinates
app.get('/api/harvester/recent', (req, res) => {
  res.json(harvesterInstance.recentUnits);
});

// GET /api/harvester/stats — Live metrics
app.get('/api/harvester/stats', (req, res) => {
  res.json(harvesterInstance.getStatsSummary());
});

// POST /api/harvester/simulate — Quick testing endpoint to trigger a fake broker drop
app.post('/api/harvester/simulate', async (req, res) => {
  const sampleMessages = [
    'متاح شقة للبيع في ميفيدا التجمع الخامس مساحة 200م 3 غرف الترا سوبر لوكس مطلوب 14.5 مليون كاش تواصل 01061399688',
    'فيلا مستقلة للايجار بماونتن فيو هايد بارك مساحة 450م بحمام سباحة مفروشة مطلوب 85 الف شهريا 01123456789',
    'تاون هاوس للبيع في فيفث سكوير المراسم 250 متر استلام فوري السعر 18 مليون كاش 01098765432',
    'شقة للايجار في الرحاب المرحلة التاسعة 131 متر 3 نوم و 2 حمام اول سكن 30,000 ج 01234567890',
    'بنتهاوس للبيع في بالم هيلز نيو كايرو 280م + 100م روف فيو لاند سكيب مطلوب 22 مليون 01011122334'
  ];
  const text = req.body.text || sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
  const simulatedMsg = {
    body: text,
    author: req.body.sender || '201099998888@c.us',
    sender: { pushname: 'Broker Partner' },
    isGroupMsg: true,
    chat: { name: 'New Cairo Brokers VIP' }
  };
  const unit = await harvesterInstance.handleIncomingMessage('simulated', simulatedMsg);
  res.json({ ok: true, unit });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/map', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'map-station.html'));
});

/**
 * Embedded Web Dashboard
 */
app.get('/', (req, res) => {
  res.send(renderDashboardHtml());
});
app.get('/dashboard', (req, res) => {
  res.send(renderDashboardHtml());
});

function renderDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sierra Estates — 8-Line WhatsApp Gateway</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: #1f293d;
      --gold: #d4af37;
      --gold-light: #f3e5ab;
      --text: #f9fafb;
      --text-muted: #9ca3af;
      --green: #10b981;
      --yellow: #f59e0b;
      --red: #ef4444;
      --blue: #3b82f6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 24px;
      min-height: 100vh;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--card-border);
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-badge {
      background: linear-gradient(135deg, var(--gold), #997a15);
      color: #000;
      font-weight: 800;
      font-size: 18px;
      padding: 8px 14px;
      border-radius: 8px;
      letter-spacing: 1px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: var(--text);
    }
    .subtitle {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .stats-bar {
      display: flex;
      gap: 20px;
      background: #151d30;
      padding: 10px 18px;
      border-radius: 10px;
      border: 1px solid var(--card-border);
    }
    .stat-item {
      display: flex;
      flex-direction: column;
    }
    .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      color: var(--text-muted);
      letter-spacing: 0.5px;
    }
    .stat-val {
      font-size: 16px;
      font-weight: 700;
      color: var(--gold-light);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: border-color 0.2s, transform 0.2s;
    }
    .card:hover {
      border-color: #2e3e5c;
      transform: translateY(-2px);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge {
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-ready { background: rgba(16, 185, 129, 0.2); color: var(--green); border: 1px solid rgba(16, 185, 129, 0.4); }
    .badge-qr { background: rgba(245, 158, 11, 0.2); color: var(--yellow); border: 1px solid rgba(245, 158, 11, 0.4); animation: pulse 2s infinite; }
    .badge-starting { background: rgba(59, 130, 246, 0.2); color: var(--blue); border: 1px solid rgba(59, 130, 246, 0.4); }
    .badge-disconnected { background: rgba(239, 68, 68, 0.2); color: var(--red); border: 1px solid rgba(239, 68, 68, 0.4); }
    @keyframes pulse { 0% { opacity: 0.7; } 50% { opacity: 1; } 100% { opacity: 0.7; } }
    
    .card-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 220px;
      background: #0d121e;
      border-radius: 8px;
      padding: 12px;
      border: 1px dashed #1e293b;
    }
    .qr-img {
      width: 190px;
      height: 190px;
      border-radius: 8px;
      background: #fff;
      padding: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    .qr-hint {
      margin-top: 10px;
      font-size: 12px;
      color: var(--gold-light);
      text-align: center;
    }
    .ready-info {
      text-align: center;
    }
    .phone-number {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
      margin-top: 8px;
      letter-spacing: 0.5px;
    }
    .push-name {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .sent-counter {
      margin-top: 14px;
      font-size: 12px;
      color: var(--gold);
      background: rgba(212, 175, 55, 0.1);
      padding: 4px 12px;
      border-radius: 20px;
      display: inline-block;
    }
    .card-footer {
      margin-top: 14px;
      display: flex;
      gap: 8px;
    }
    button {
      flex: 1;
      background: #1f2937;
      color: #fff;
      border: 1px solid #374151;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    button:hover {
      background: #374151;
    }
    .btn-test {
      background: rgba(212, 175, 55, 0.2);
      border-color: rgba(212, 175, 55, 0.4);
      color: var(--gold-light);
    }
    .btn-test:hover {
      background: rgba(212, 175, 55, 0.35);
    }
    .test-box {
      margin-top: 10px;
      display: none;
      flex-direction: column;
      gap: 6px;
    }
    .test-box input {
      background: #090d16;
      border: 1px solid var(--card-border);
      color: #fff;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="logo-badge">SE</div>
      <div>
        <h1>Sierra Estates — 8-Line WhatsApp Gateway</h1>
        <div class="subtitle">OpenWA Multi-Session Controller · New Cairo Real Estate Outreach</div>
      </div>
    </div>
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">Lines Online</span>
        <span class="stat-val" id="online-count">0 / 8</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Total Sent</span>
        <span class="stat-val" id="total-sent">0</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">API Port</span>
        <span class="stat-val">2785</span>
      </div>
    </div>
    <a href="/map" target="_blank" style="text-decoration:none; display:flex; align-items:center; gap:8px; background:linear-gradient(135deg, var(--gold), #997a15); color:#000; font-weight:800; font-size:13px; padding:10px 18px; border-radius:8px; box-shadow:0 4px 15px rgba(212,175,55,0.3); transition:transform 0.2s;">
      🗺️ Launch Live Broker Map Station
    </a>
  </div>

  <div class="grid" id="sessions-grid">
    <!-- Populated dynamically via JS -->
  </div>

  <script>
    async function fetchSessions() {
      try {
        const res = await fetch('/api/sessions');
        if (!res.ok) return;
        const list = await res.json();
        renderSessions(list);
      } catch (err) {
        console.error('Failed to poll sessions:', err);
      }
    }

    function renderSessions(list) {
      const grid = document.getElementById('sessions-grid');
      let readyCount = 0;
      let totalSentCount = 0;

      grid.innerHTML = list.map(s => {
        if (s.status === 'ready') readyCount++;
        totalSentCount += (s.totalSent || 0);

        let badgeClass = 'badge-disconnected';
        let badgeText = s.status;
        if (s.status === 'ready') { badgeClass = 'badge-ready'; badgeText = 'READY'; }
        else if (s.status === 'scan_qr' || s.hasQr) { badgeClass = 'badge-qr'; badgeText = 'SCAN QR'; }
        else if (s.status === 'starting' || s.status === 'initializing') { badgeClass = 'badge-starting'; badgeText = 'STARTING'; }

        let bodyContent = '';
        if (s.status === 'ready') {
          bodyContent = \`
            <div class="ready-info">
              <div style="font-size: 38px;">📱</div>
              <div class="phone-number">+\${s.phone || 'Connected'}</div>
              <div class="push-name">\${s.pushName || s.name}</div>
              <div class="sent-counter">\${s.totalSent || 0} messages sent</div>
            </div>
          \`;
        } else if (s.hasQr) {
          bodyContent = \`
            <img class="qr-img" src="/api/sessions/\${s.id}" onerror="this.src=''" id="qr-\${s.id}" />
            <div class="qr-hint">Scan with WhatsApp on SIM \${s.name}</div>
          \`;
        } else {
          bodyContent = \`
            <div style="text-align:center; color: var(--text-muted); font-size: 13px;">
              <div style="font-size: 32px; margin-bottom: 8px;">⏳</div>
              <div>Starting browser engine...</div>
              <div style="font-size: 11px; margin-top: 4px; color: #64748b;">(Staggered launch)</div>
            </div>
          \`;
        }

        return \`
          <div class="card" id="card-\${s.id}">
            <div class="card-top">
              <div class="card-title">
                <span>SIM \${s.name.replace('line-', '#')}</span>
              </div>
              <span class="badge \${badgeClass}">\${badgeText}</span>
            </div>
            <div class="card-body">
              \${bodyContent}
            </div>
            <div class="card-footer">
              <button onclick="restartSession('\${s.id}')">Restart</button>
              \${s.status === 'ready' ? \`<button class="btn-test" onclick="toggleTestBox('\${s.id}')">Test Send</button>\` : ''}
            </div>
            <div class="test-box" id="test-box-\${s.id}">
              <input type="text" placeholder="Recipient: 2010xxxxxxxx" id="recipient-\${s.id}" />
              <input type="text" placeholder="Message text" id="msg-\${s.id}" value="Sierra Estates test ping" />
              <button class="btn-test" onclick="sendTestMessage('\${s.id}')">Send Test Ping</button>
            </div>
          </div>
        \`;
      }).join('');

      document.getElementById('online-count').textContent = \`\${readyCount} / \${list.length}\`;
      document.getElementById('total-sent').textContent = totalSentCount;

      // Update QR images directly for lines that need them
      list.forEach(async (s) => {
        if (s.hasQr) {
          try {
            const r = await fetch('/api/sessions/' + s.id);
            const d = await r.json();
            const img = document.getElementById('qr-' + s.id);
            if (img && d.qrDataUrl) img.src = d.qrDataUrl;
          } catch (_) {}
        }
      });
    }

    function toggleTestBox(id) {
      const el = document.getElementById('test-box-' + id);
      el.style.display = el.style.display === 'flex' ? 'none' : 'flex';
    }

    async function sendTestMessage(id) {
      const recipient = document.getElementById('recipient-' + id).value.trim();
      const text = document.getElementById('msg-' + id).value.trim();
      if (!recipient || !text) return alert('Please enter phone and message');

      try {
        const res = await fetch(\`/api/sessions/\${id}/messages/send-text\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId: recipient, text })
        });
        const d = await res.json();
        if (res.ok) alert('Message sent successfully! ID: ' + (d.data?.messageId || 'ok'));
        else alert('Failed: ' + (d.error || 'unknown error'));
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    }

    async function restartSession(id) {
      if (!confirm(\`Restart line \${id}?\`)) return;
      await fetch(\`/api/sessions/\${id}/restart\`, { method: 'POST' });
      fetchSessions();
    }

    // Auto-poll every 3.5 seconds
    fetchSessions();
    setInterval(fetchSessions, 3500);
  </script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Server Boot & Shutdown
// ─────────────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`  Sierra Estates — 8-Line WhatsApp Gateway Active`);
  console.log(`  Dashboard URL: http://localhost:${PORT}`);
  console.log(`  Gateway REST:  http://127.0.0.1:${PORT}/api/sessions`);
  console.log(`  Active Pool:   ${SESSION_IDS.join(', ')}`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  startAllSessions();
});

// Graceful cleanup
process.on('SIGINT', async () => {
  console.log('\n[Sierra Estates] Shutting down WhatsApp sessions cleanly...');
  server.close();
  for (const [id, s] of sessions.entries()) {
    if (s.client) {
      try {
        await s.client.kill();
      } catch (_) {}
    }
  }
  process.exit(0);
});
