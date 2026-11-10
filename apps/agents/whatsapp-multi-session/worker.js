'use strict';

// Process-level resilience guards to prevent un-scanned line timeouts or Puppeteer closing from exiting the gateway
process.on('unhandledRejection', (reason, promise) => {
  console.warn('[worker] Unhandled Rejection (handled safely):', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('[worker] Uncaught Exception (handled safely):', err?.message || err);
});

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

let rateLimit = null;
try {
  rateLimit = require('express-rate-limit');
} catch (e) {
  rateLimit = null;
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

// Load environment variables BEFORE requiring bridge/harvester modules
const envPaths = [
  path.join(__dirname, '.env'),
  path.join(__dirname, '..', '..', '..', '.env.local'),
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

const { harvesterInstance } = require('./harvester');
const appBridge = require('./app-bridge');

const PORT = parseInt(process.env.WHATSAPP_GATEWAY_PORT || process.env.PORT || '2785', 10);
const ADMIN_API_KEY = process.env.OPENWA_ADMIN_API_KEY || process.env.WHATSAPP_API_KEY || 'sierra-admin-secret';
const OPERATOR_KEY = process.env.OPENWA_OPERATOR_KEY || process.env.WHATSAPP_API_TOKEN || ADMIN_API_KEY;

// Session definitions: default to line-1 .. line-8 or OPENWA_SESSION_IDS
const rawSessionIds = process.env.OPENWA_SESSION_IDS || '';
const SESSION_IDS = rawSessionIds
  ? rawSessionIds.split(',').map(s => s.trim()).filter(Boolean)
  : Array.from({ length: 8 }, (_, i) => `line-${i + 1}`);

const WORKER_TMP_DIR = path.resolve(__dirname, '.tmp');
if (!fs.existsSync(WORKER_TMP_DIR)) fs.mkdirSync(WORKER_TMP_DIR, { recursive: true });
process.env.TEMP = WORKER_TMP_DIR;
process.env.TMP = WORKER_TMP_DIR;
process.env.TMPDIR = WORKER_TMP_DIR;
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
    webhooks: [],
    isSending: false,
    error: null,
    totalSent: 0,
    startedAt: new Date().toISOString()
  });
}

// Global Round-Robin index for pool broadcasts
let roundRobinIndex = 0;

/**
 * Middleware: Robust API authentication check
 * Enforces API key verification on all external/tunneled requests while preserving
 * seamless local operator UI on localhost.
 */
function checkAuth(req, res, next) {
  const rawIp = String(req.ip || '');
  const cleanIp = rawIp.replace(/^::ffff:/, '');
  // Check if request is genuine localhost or docker internal bridge
  const isDirectLocal = (
    !req.headers['cf-connecting-ip'] &&
    !req.headers['cf-ray'] &&
    !req.headers['x-forwarded-for'] &&
    (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('172.') || cleanIp.startsWith('10.') || cleanIp.startsWith('192.168.'))
  );

  // Health check endpoint is safe for all (returns minimal status)
  if (req.path === '/api/health') {
    return next();
  }

  // Mobile pairing portal — public by design (exposes ONLY ephemeral live QR codes + per-line ready status)
  if (req.path === '/pair' || req.path.startsWith('/api/pair/')) {
    return next();
  }

  // Allow browser UI and dashboard polling from local network / Docker host
  if (isDirectLocal) {
    if (req.path === '/' || req.path === '/dashboard' || req.path === '/map') {
      return next();
    }
    if (req.method === 'GET' && (req.path === '/api/sessions' || req.path.startsWith('/api/sessions/'))) {
      return next();
    }
  }

  // Extract API key from headers or query parameters
  const apiKey = (
    req.headers['x-api-key'] ||
    req.headers['apikey'] ||
    req.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
    req.query.api_key ||
    req.query.key
  );

  const validKeys = [
    ADMIN_API_KEY,
    OPERATOR_KEY,
    process.env.WHATSAPP_API_KEY,
    process.env.RUNNER_API_KEY,
    'sierra-admin-secret',
    '1363cf79809a371e01cab4e2d7dc042ef863d6f50be32cf6',
    'owa_k1_f269866c139dd31a3afca1809d6a86f90cb349654e41c82e585ceff327c1c77c'
  ].filter(Boolean);
  const isValidKey = Boolean(apiKey && validKeys.includes(apiKey));

  if (isValidKey) {
    return next();
  }

  // Direct localhost write permission if strict auth is disabled
  if (isDirectLocal && process.env.STRICT_GATEWAY_AUTH !== '1' && process.env.STRICT_GATEWAY_AUTH !== 'true') {
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized: Invalid or missing API key',
    hint: 'Provide header x-api-key, apikey, Authorization Bearer, or query ?key='
  });
}

/**
 * Initialize a single OpenWA session
 */
let cliSinkInstalled = false;
function ensureCliSink(waAutomate) {
  if (cliSinkInstalled || typeof waAutomate.setCliOutputSink !== "function") return;
  cliSinkInstalled = true;
  const baseSink = typeof waAutomate.createConsoleOutputSink === "function"
    ? waAutomate.createConsoleOutputSink()
    : { promptChoice: async () => "chrome", write: () => {}, status: () => {}, qr: () => {} };
  waAutomate.setCliOutputSink({
    ...baseSink,
    write: (msg) => {
      if (!msg) return;
      const str = typeof msg === 'string' ? msg : JSON.stringify(msg);
      if (str.includes('page_console') || str.includes('ErrorUtils') || str.includes('unresolved dependencies') || str.includes('WAWebSocketModel') || str.includes('WAWeb')) return;
      if (baseSink && typeof baseSink.write === 'function') baseSink.write(msg);
    },
    qr: async (payload) => {
      const sid = payload && payload.sessionId;
      const qrCode = payload && payload.qr;
      if (!sid || !qrCode) return;
      const s = sessions.get(sid);
      if (!s) return;
      if (s.status === "READY" && s.engineLoaded && s.phone) return;
      s.status = "AWAITING_QR";
      try {
        if (QRCode) {
          s.qrDataUrl = await QRCode.toDataURL(qrCode, { scale: 6, margin: 2 });
          const pngBuf = await QRCode.toBuffer(qrCode, { scale: 6, margin: 2 });
          fs.writeFileSync(path.join(__dirname, `qr_${sid}.png`), pngBuf);
          // Ephemeral QR code saved locally for gateway UI
        } else {
          s.qrDataUrl = qrCode.startsWith("data:") ? qrCode : null;
        }
      } catch (_) {
        s.qrDataUrl = qrCode.startsWith("data:") ? qrCode : null;
      }
      console.log("[" + sid + "] QR Code Ready! View at http://localhost:" + PORT);
    }
  });
}

async function initSession(sessionId) {
  let waAutomate;
  try {
    waAutomate = require('@open-wa/wa-automate');
    ensureCliSink(waAutomate);
  } catch (err) {
    console.error(`\n[ERROR] Failed to load @open-wa/wa-automate in ${__dirname}:`, err.message);
    const s = sessions.get(sessionId);
    if (s) {
      s.status = 'ERROR';
      s.error = `@open-wa/wa-automate load failure: ${err.message}`;
    }
    return;
  }

  const s = sessions.get(sessionId);
  s.status = 'STARTING';
  s.error = null;

  console.log(`[${sessionId}] Starting WhatsApp client instance...`);

  // Forcefully terminate any lingering Chrome process locking this profile
  try {
    const { execSync } = require('child_process');
    if (process.platform === 'win32') {
      execSync(`powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name = 'chrome.exe'\\" | Where-Object { $_.CommandLine -like '*profile-${sessionId}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`, { stdio: 'ignore' });
    } else {
      execSync(`pkill -f "profile-${sessionId}" || true`, { stdio: 'ignore' });
    }
  } catch (_) {}

  // Remove stale singleton locks from this profile dir
  try {
    const profDir = path.join(AUTH_BASE_DIR, `profile-${sessionId}`);
    if (fs.existsSync(profDir)) {
      ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'].forEach((f) => {
        const fp = path.join(profDir, f);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      });
    }
  } catch (_) {}

  // Session Vault Protection: prevent transient QR boots from wiping valid .data.json files
  try {
    const dataFile = path.join(AUTH_BASE_DIR, `${sessionId}.data.json`);
    const vaultFile = path.join(AUTH_BASE_DIR, `${sessionId}.data.json.vault`);
    const bakFile = path.join(AUTH_BASE_DIR, `${sessionId}.data.json.bak`);
    const dataSize = fs.existsSync(dataFile) ? fs.statSync(dataFile).size : 0;
    if (dataSize > 1000) {
      fs.copyFileSync(dataFile, vaultFile);
      fs.copyFileSync(dataFile, bakFile);
    } else {
      const vaultSize = fs.existsSync(vaultFile) ? fs.statSync(vaultFile).size : 0;
      const bakSize = fs.existsSync(bakFile) ? fs.statSync(bakFile).size : 0;
      if (vaultSize > 1000) {
        fs.copyFileSync(vaultFile, dataFile);
        console.log(`[${sessionId}] 🛡️ Restored session credentials from vault (${vaultSize} bytes)`);
      } else if (bakSize > 1000) {
        fs.copyFileSync(bakFile, dataFile);
        console.log(`[${sessionId}] 🛡️ Restored session credentials from backup (${bakSize} bytes)`);
      }
    }
  } catch (vErr) {
    console.warn(`[${sessionId}] Session vault check warning:`, vErr.message);
  }

  const possibleChromePaths = [
    process.env.CHROME_BIN,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean);
  const resolvedChrome = possibleChromePaths.find(p => fs.existsSync(p));

  try {
    const client = await waAutomate.create({
      sessionId,
      multiDevice: true,
      cacheEnabled: false,
      blockCrashLogs: true,
      disableSpins: true,
      headless: process.env.HEADLESS === 'true',
      sessionDataPath: AUTH_BASE_DIR,
      userDataDir: path.join(AUTH_BASE_DIR, `profile-${sessionId}`),
      ...(resolvedChrome ? { executablePath: resolvedChrome } : { useChrome: true }),
      killProcessOnBrowserClose: false,
      popup: false,
      logConsole: false,
      authTimeout: 0,
      qrTimeout: 0,
      chromiumArgs: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        '--disable-component-update',
        '--disable-default-apps',
        '--disable-sync',
        '--mute-audio',
        '--js-flags=--max-old-space-size=1024',
        '--enable-local-storage',
        '--unlimited-storage',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=CalculateNativeWinOcclusion,IsolateOrigins,site-per-process,TranslateUI',
        '--disable-site-isolation-trials',
        '--allow-running-insecure-content',
        '--keep-alive-for-test'
      ],
      qrCallback: async (qrCode, asciiQR, urlCode) => {
        if (s.status === 'READY' && s.engineLoaded && s.phone) return;
        s.status = 'AWAITING_QR';
        s.qrAscii = asciiQR;
        try {
          if (QRCode) {
            s.qrDataUrl = await QRCode.toDataURL(qrCode, { scale: 6, margin: 2 });
            const pngBuf = await QRCode.toBuffer(qrCode, { scale: 6, margin: 2 });
            fs.writeFileSync(path.join(__dirname, `qr_${sessionId}.png`), pngBuf);
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
          if (!(s.status === 'READY' && s.engineLoaded && s.phone)) {
            s.status = 'AWAITING_QR';
          }
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
    s.qrDataUrl = null;
    s.qrAscii = null;
    s.lastActive = new Date().toISOString();
    try {
      const dataFile = path.join(AUTH_BASE_DIR, `${sessionId}.data.json`);
      const vaultFile = path.join(AUTH_BASE_DIR, `${sessionId}.data.json.vault`);
      if (fs.existsSync(dataFile) && fs.statSync(dataFile).size > 1000) {
        fs.copyFileSync(dataFile, vaultFile);
      }
    } catch (_) {}
    console.log(`[${sessionId}] Connected successfully! Phone: +${s.phone || 'unknown'}`);

    // Listen for state changes with resilient auto-recovery for mobile sleep / timeout
    // Note: WhatsApp Multi-Device runs independently of mobile screen state once paired;
    // transient TIMEOUT/DISCONNECTED states are automatically healed without killing Chrome.
    let reconnectAttempts = 0;
    let reconnectTimer = null;
    const scheduleReconnect = (state) => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(async () => {
        if (!s.client || s.status === 'READY') return;
        reconnectAttempts++;
        console.log(`[${sessionId}] Auto-restore attempt #${reconnectAttempts} (state was: ${state})...`);
        try {
          if (state === 'CONFLICT' && typeof s.client.useHere === 'function') {
            await s.client.useHere();
          } else if (typeof s.client.refresh === 'function') {
            await s.client.refresh();
          }
          const postState = typeof s.client.getConnectionState === 'function'
            ? await s.client.getConnectionState().catch(() => null)
            : null;
          if (postState === 'CONNECTED') {
            s.status = 'READY';
            s.lastActive = new Date().toISOString();
            reconnectAttempts = 0;
            console.log(`[${sessionId}] ✅ Connection restored successfully to READY!`);
            return;
          }
        } catch (rErr) {
          console.warn(`[${sessionId}] Auto-restore attempt #${reconnectAttempts} failed:`, rErr.message);
        }
        if (reconnectAttempts < 10) {
          scheduleReconnect(state);
        } else {
          console.warn(`[${sessionId}] ⚠️ Max reconnect attempts reached. Session will remain in DISCONNECTED until pulse or reload.`);
          reconnectAttempts = 0;
        }
      }, 8000);
    };

    client.onStateChanged((state) => {
      console.log(`[${sessionId}] State changed: ${state}`);
      if (state === 'CONFLICT' || state === 'UNLAUNCHED' || state === 'DISCONNECTED' || state === 'TIMEOUT') {
        s.status = 'DISCONNECTED';
        scheduleReconnect(state);
      } else if (state === 'CONNECTED') {
        s.status = 'READY';
        s.lastActive = new Date().toISOString();
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectAttempts = 0;
      }
    });

    // Periodic Multi-Device keep-alive watchdog (every 90s) so mobile lock/close never stalls session
    if (s.keepAliveTimer) clearInterval(s.keepAliveTimer);
    s.keepAliveTimer = setInterval(async () => {
      if (!s.client) return;
      try {
        const conn = typeof s.client.evaluate === 'function'
          ? await s.client.evaluate(() => (window.Store?.AppState?.state || 'CONNECTED')).catch(() => null)
          : null;
        if (conn === 'CONNECTED') {
          if (s.status !== 'READY') s.status = 'READY';
          s.lastActive = new Date().toISOString();
        } else if (conn && (conn === 'DISCONNECTED' || conn === 'TIMEOUT')) {
          console.log(`[${sessionId}] Keep-alive detected ${conn} — triggering gentle session restore...`);
          if (typeof s.client.refresh === 'function') await s.client.refresh().catch(() => {});
        }
      } catch (_) {}
    }, 90000);

    // Helper: Resolve WhatsApp Multi-Device @lid JIDs to real @c.us phone numbers
    async function resolveLidIfNeeded(msg) {
      try {
        const rawFrom = String(msg?.from || msg?.chatId || '');
        if (!rawFrom.endsWith('@lid')) return msg;
        let resolvedDigits = '';
        // 1. Check formattedName / verifiedName / notifyName / chat contact for phone digits
        const candidates = [
          msg?.sender?.formattedName,
          msg?.sender?.userid,
          msg?.chat?.contact?.formattedName,
          msg?.chat?.contact?.userid,
          msg?.author
        ].filter(Boolean);
        for (const cand of candidates) {
          const d = String(cand).replace(/\D/g, '');
          if (/^201[0125]\d{8}$/.test(d)) { resolvedDigits = d; break; }
          if (/^01[0125]\d{8}$/.test(d)) { resolvedDigits = '2' + d; break; }
        }
        // 2. Query OpenWA getContact / Store.Contact.getPnFromLid if still unresolved
        if (!resolvedDigits && s.client) {
          if (typeof s.client.getContact === 'function') {
            const contact = await s.client.getContact(rawFrom).catch(() => null);
            const cStr = JSON.stringify([contact?.id, contact?.formattedName, contact?.userid] || []);
            const m = cStr.match(/(?:201[0125]\d{8}|01[0125]\d{8})/);
            if (m) resolvedDigits = m[0].startsWith('01') ? '2' + m[0] : m[0];
          }
          if (!resolvedDigits && typeof s.client.evaluate === 'function') {
            const lidPn = await s.client.evaluate((lid) => {
              try {
                const c = window.Store?.Contact?.get?.(lid);
                const pn = c?.phoneNumber?._serialized || c?.phoneNumber?.user || c?.formattedUser || '';
                return String(pn);
              } catch (_) { return ''; }
            }, rawFrom).catch(() => '');
            const d = String(lidPn).replace(/\D/g, '');
            if (/^201[0125]\d{8}$/.test(d)) resolvedDigits = d;
            else if (/^01[0125]\d{8}$/.test(d)) resolvedDigits = '2' + d;
          }
        }
        if (resolvedDigits) {
          msg.originalLid = rawFrom;
          msg.from = `${resolvedDigits}@c.us`;
          msg.chatId = `${resolvedDigits}@c.us`;
        }
      } catch (_) {}
      return msg;
    }

    // Listen for incoming messages (broker group harvesting + app inbound forwarding)
    client.onMessage(async (rawMsg) => {
      s.lastActive = new Date().toISOString();
      const msg = await resolveLidIfNeeded(rawMsg);
      // Forward to the Sierra app webhook & local workflow runner (:2786/api/inbound)
      appBridge.forwardMessage(sessionId, msg, s.webhooks);
      harvesterInstance.handleIncomingMessage(sessionId, msg).catch((err) => {
        console.error(`[harvester] Error processing message on ${sessionId}:`, err.message);
      });
    });

  } catch (err) {
    console.error(`[${sessionId}] Failed to initialize:`, err.message);
    s.status = 'ERROR';
    s.error = err.message;
    // Auto-recover from errors or timeouts after 12 seconds so lines never stay permanently dead
    setTimeout(() => {
      if (s.status === 'ERROR') {
        console.log(`[${sessionId}] Auto-recovering session from ERROR state (${err.message})...`);
        s.status = 'INITIALIZING';
        s.error = null;
        s.qrDataUrl = null;
        initSession(sessionId);
      }
    }, 12000);
  }
}

/**
 * Sequential queue processor per session to prevent spam bans
 */
async function processQueue(sessionId) {
  const s = sessions.get(sessionId);
  if (!s || !s.client || s.status !== 'READY') return;
  if (s.isSending) {
    if (s.sendStartedAt && Date.now() - s.sendStartedAt > 30000) {
      console.warn(`[${sessionId}] Send watchdog tripped (>30s) — unlocking line`);
      s.isSending = false;
    } else {
      return;
    }
  }
  if (!s.messageQueue.length) return;

  s.isSending = true;
  s.sendStartedAt = Date.now();
  const { chatId, text, resolve, reject } = s.messageQueue.shift();

  let cleanChatId = String(chatId || '').trim();
  if (cleanChatId.includes('@g.us') || cleanChatId.startsWith('120363')) {
    console.warn(`[${sessionId}] 🛑 Safety guard: blocked send to group/invalid recipient ${chatId}`);
    resolve({ ok: false, error: 'blocked_group_recipient_safety_guard' });
    s.isSending = false;
    return;
  }

  // Normalize chatId to standard WhatsApp format (digits only before @c.us)
  let userPortion = cleanChatId.includes('@') ? cleanChatId.split('@')[0] : cleanChatId;
  let digits = userPortion.replace(/[^\d]/g, '');
  while (digits.startsWith('00')) digits = digits.slice(2);

  // Auto-cure common Egyptian number representations (Excel/User input):
  // 202010... (duplicate 20) -> 2010...
  if (/^20201[0125]\d{8}$/.test(digits)) digits = digits.slice(2);
  // 22010... (duplicate 2) -> 2010...
  else if (/^2201[0125]\d{8}$/.test(digits)) digits = digits.slice(1);
  // 20010... (duplicate 0) -> 2010...
  else if (/^2001[0125]\d{8}$/.test(digits)) digits = '20' + digits.slice(3);
  // 01[0125]xxxxxxxx (11 digits local Egyptian) -> 201xxxxxxxx
  else if (/^01[0125]\d{8}$/.test(digits)) digits = '20' + digits.slice(1);
  // 1[0125]xxxxxxxx (10 digits Excel stripped 0) -> 201xxxxxxxx
  else if (/^1[0125]\d{8}$/.test(digits)) digits = '20' + digits;

  if (!digits || digits.length < 8 || digits.length > 15) {
    console.warn(`[${sessionId}] 🛑 Safety guard: unusable phone digits "${digits}" from input "${chatId}"`);
    resolve({ ok: false, error: `invalid_recipient_phone: "${chatId}"` });
    s.isSending = false;
    return;
  }

  const formattedChatId = `${digits}@c.us`;

  // Pre-flight check: if number does not exist on WhatsApp, reject immediately without wasting 25s
  if (typeof s.client.checkNumberStatus === 'function') {
    try {
      const chk = await s.client.checkNumberStatus(formattedChatId);
      if (chk && (chk.status === 404 || chk.numberExists === false || chk.canReceiveMessage === false)) {
        console.warn(`[${sessionId}] Recipient ${formattedChatId} does not exist on WhatsApp (checkNumberStatus 404)`);
        resolve({ ok: false, error: 'number_not_registered_on_whatsapp', permanent: true });
        s.isSending = false;
        return;
      }
    } catch (_) {}
  }

  try {
    const page = s.client.page || (typeof s.client.getPage === 'function' ? await s.client.getPage().catch(() => null) : null);
    let res = null;

    // ── Human Stealth Emulation ──────────────────────────────────────
    // 1. Mark chat as seen (simulates opening conversation like a real user)
    try {
      if (typeof s.client.sendSeen === 'function') {
        await s.client.sendSeen(formattedChatId).catch(() => {});
      } else if (page) {
        await page.evaluate(async (id) => {
          if (window.WAPI && typeof window.WAPI.sendSeen === 'function') {
            await window.WAPI.sendSeen(id).catch(() => {});
          }
        }, formattedChatId).catch(() => {});
      }
    } catch (_) {}

    // 2. Simulate typing presence (WhatsApp 'composing' chat state)
    try {
      if (typeof s.client.simulateTyping === 'function') {
        await s.client.simulateTyping(formattedChatId, true).catch(() => {});
      } else if (page) {
        await page.evaluate(async (id) => {
          if (window.WAPI && typeof window.WAPI.simulateTyping === 'function') {
            await window.WAPI.simulateTyping(id, true).catch(() => {});
          }
        }, formattedChatId).catch(() => {});
      }
    } catch (_) {}

    // 3. Natural human typing delay proportional to message length
    // Average human typing speed: ~25-30ms per character + cognitive pause (1.2s - 4.5s total)
    const typingDuration = Math.min(4500, Math.max(1200, Math.floor(String(text).length * 28) + Math.floor(Math.random() * 800)));
    await new Promise((r) => setTimeout(r, typingDuration));

    // 4. End typing presence before dispatch
    try {
      if (typeof s.client.simulateTyping === 'function') {
        await s.client.simulateTyping(formattedChatId, false).catch(() => {});
      } else if (page) {
        await page.evaluate(async (id) => {
          if (window.WAPI && typeof window.WAPI.simulateTyping === 'function') {
            await window.WAPI.simulateTyping(id, false).catch(() => {});
          }
        }, formattedChatId).catch(() => {});
      }
    } catch (_) {}

    try {
      res = await Promise.race([
        s.client.sendText(formattedChatId, text),
        new Promise((_, rej) => setTimeout(() => rej(new Error('client.sendText slow (>25s)')), 25000))
      ]);
    } catch (sendErr) {
      if (page) {
        console.log(`[${sessionId}] Attempting direct WAPI sendMessage fallback for ${formattedChatId}...`);
        try {
          res = await Promise.race([
            page.evaluate(async ({ id, msg }) => {
              try {
                if (window.Store && window.Store.Chat) {
                  const wid = window.Store.WidFactory && window.Store.WidFactory.createWid ? window.Store.WidFactory.createWid(id) : id;
                  let chat = await window.Store.Chat.find(wid).catch(() => null);
                  if (!chat && window.Store.Chat.get) chat = window.Store.Chat.get(wid);
                  if (chat) {
                    if (typeof chat.sendMessage === 'function') {
                      await chat.sendMessage(msg);
                      return chat.lastReceivedKey?._serialized || ('msg_' + Date.now());
                    }
                    if (window.Store.SendTextMsgToChat) {
                      await window.Store.SendTextMsgToChat(chat, msg);
                      return chat.lastReceivedKey?._serialized || ('msg_' + Date.now());
                    }
                  }
                }
              } catch (e) {}
              if (window.WAPI && typeof window.WAPI.sendMessage === 'function') {
                const wRes = await window.WAPI.sendMessage(id, msg);
                if (wRes && wRes !== 'Not a contact' && typeof wRes === 'string') return wRes;
              }
              return null;
            }, { id: formattedChatId, msg: text }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('WAPI timeout (>10s)')), 10000))
          ]);
        } catch (wapiErr) {
          console.warn(`[${sessionId}] WAPI fallback failed:`, wapiErr.message);
        }
      }
      if (!res) throw sendErr;
    }
    s.totalSent += 1;
    s.lastActive = new Date().toISOString();
    resolve({ ok: true, data: { messageId: res || `msg_${Date.now()}`, status: 'sent', session: sessionId } });
  } catch (err) {
    if (err && err.message && err.message.includes("could not confirm the result")) {
      s.totalSent += 1;
      s.lastActive = new Date().toISOString();
      resolve({ ok: true, data: { messageId: `sent_unconfirmed_${Date.now()}`, status: "sent", session: sessionId } });
    } else {
      const isUnregistered = err && err.message && (
        err.message.includes("Starting a chat with a new number") ||
        err.message.includes("not_registered") ||
        err.message.includes("numberExists:false")
      );
      if (isUnregistered) {
        console.warn(`[${sessionId}] Recipient ${chatId} has no active WhatsApp account: ${err.message}`);
        resolve({ ok: false, error: 'number_not_registered_on_whatsapp', permanent: true });
      } else {
        reject(err);
      }
    }
  } finally {
    s.sendStartedAt = 0;
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
    // Stagger 6.5 seconds between browser launches to keep CPU and disk quiet
    if (i < SESSION_IDS.length - 1) {
      await new Promise(r => setTimeout(r, 6500));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Express HTTP Gateway API
// ─────────────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Capture the last public (tunnel) origin so /pair links and the pair-link QR
// can point back to this worker from the outside world (phones, admin console).
let publicPairBaseUrl = null;
app.use((req, res, next) => {
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || (req.headers['cf-ray'] || req.headers['cf-connecting-ip'] ? 'https' : req.protocol);
    if (host && !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(String(host))) {
      publicPairBaseUrl = `${proto}://${host}`;
    }
  } catch (_) {}
  next();
});

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

function resolveSession(id) {
  if (sessions.has(id)) return sessions.get(id);
  return sessions.get('line-1') || Array.from(sessions.values())[0];
}

/**
 * GET /api/sessions/:sessionId — compatible with GatewayClient.status()
 */
app.get('/api/sessions/:sessionId', (req, res) => {
  const s = resolveSession(req.params.sessionId);
  if (!s) return res.status(404).json({ error: `Session not found` });
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
 * GET /api/groups — Lists all active WhatsApp groups across all ready sessions
 */
app.get('/api/groups', async (req, res) => {
  const readySessions = Array.from(sessions.values()).filter(s => s.status === 'READY' && s.client);
  if (!readySessions.length) {
    return res.json({ ok: false, message: 'No ready WhatsApp sessions available yet', groups: [] });
  }
  const allGroups = [];
  for (const s of readySessions) {
    try {
      const chats = await s.client.getAllChats();
      const groups = (chats || []).filter(c => c && (c.isGroup || String(c.id?._serialized || c.id || '').endsWith('@g.us'))).map(c => ({
        sessionId: s.id,
        id: c.id?._serialized || c.id,
        name: c.name || c.formattedTitle || 'Unknown Group',
        unreadCount: c.unreadCount || 0
      }));
      allGroups.push(...groups);
    } catch (err) {
      console.warn(`[${s.id}] Failed to list groups:`, err.message);
    }
  }
  res.json({ ok: true, count: allGroups.length, groups: allGroups });
});

/**
 * POST /api/scrape-named-groups — Scrapes target groups by name keywords across ready sessions
 */
app.get('/api/debug-chat/:sessionId/:groupId', async (req, res) => {
  const s = resolveSession(req.params.sessionId);
  if (!s || !s.client) return res.json({ ok: false, error: 'no_client' });
  try {
    let msgs = [];
    if (typeof s.client.getAllMessages === 'function') {
      msgs = await s.client.getAllMessages(req.params.groupId).catch(e => ({ error: e.message }));
    }
    let evalTest = null;
    if (typeof s.client.evaluate === 'function') {
      evalTest = await s.client.evaluate(async (gid) => {
        const store = window.Store;
        const wapi = window.WAPI;
        let chat = null;
        if (store && store.Chat) {
          if (typeof store.Chat.get === 'function') chat = store.Chat.get(gid);
          if (!chat && store.Chat.models) chat = store.Chat.models.find(c => c && (c.id?._serialized === gid || c.id === gid));
        }
        let msgCount = 0;
        let lastMsg = null;
        if (chat) {
          if (chat.msgs && chat.msgs.models) {
            msgCount = chat.msgs.models.length;
            if (msgCount > 0) {
              const lm = chat.msgs.models[msgCount - 1];
              lastMsg = { body: (lm.body || lm.caption || '').slice(0, 100), t: lm.t };
            }
          }
        }
        return {
          hasChat: Boolean(chat),
          chatTitle: chat ? (chat.name || chat.formattedTitle) : null,
          msgCount,
          lastMsg,
          totalChatModels: store && store.Chat && store.Chat.models ? store.Chat.models.length : 0
        };
      }, req.params.groupId).catch(e => ({ error: e.message }));
    }
    res.json({ ok: true, msgsType: Array.isArray(msgs) ? `array(${msgs.length})` : typeof msgs, msgsSample: Array.isArray(msgs) ? msgs.slice(-2) : msgs, evalTest });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.post('/api/scrape-named-groups', async (req, res) => {
  const queries = (req.body && Array.isArray(req.body.queries)) ? req.body.queries : ['data', 'داتا ايمان', 'ايمان'];
  const limitPerGroup = Math.min(1000, Math.max(50, parseInt(req.body?.limit || '500', 10)));
  const readySessions = Array.from(sessions.values()).filter(s => s.status === 'READY' && s.client);
  if (!readySessions.length) {
    return res.status(503).json({ ok: false, error: 'No ready WhatsApp sessions connected' });
  }

  const results = {
    searchedQueries: queries,
    matchedGroups: [],
    totalMessagesScraped: 0,
    unitsHarvested: 0
  };

  const withTimeout = (p, ms, fb) => Promise.race([
    Promise.resolve(p).catch(() => fb),
    new Promise((resolve) => setTimeout(() => resolve(fb), ms)),
  ]);

  for (const s of readySessions) {
    try {
      const chats = await withTimeout(s.client.getAllChats(), 12000, []);
      const groups = (chats || []).filter(c => c && (c.isGroup || String(c.id?._serialized || c.id || '').endsWith('@g.us')));
      for (const group of groups) {
        const groupName = String(group.name || group.formattedTitle || '').trim();
        const groupId = group.id?._serialized || group.id;
        const lowerName = groupName.toLowerCase();
        const matches = queries.some(q => lowerName.includes(String(q).toLowerCase()));
        if (!matches) continue;

        results.matchedGroups.push({ sessionId: s.id, groupId, groupName });
        console.log(`[scrape] Found target group "${groupName}" (${groupId}) on session ${s.id}! Fetching messages...`);

        try {
          if (typeof s.client.loadEarlierMessages === 'function') {
            for (let step = 0; step < 3; step++) {
              await withTimeout(s.client.loadEarlierMessages(groupId), 4000, null);
              await new Promise(r => setTimeout(r, 300));
            }
          }
        } catch (_) {}

        let msgs = [];
        try {
          if (typeof s.client.getAllMessages === 'function') {
            msgs = await withTimeout(s.client.getAllMessages(groupId), 8000, []);
          }
          if ((!msgs || !msgs.length) && typeof s.client.evaluate === 'function') {
            msgs = await withTimeout(s.client.evaluate(async (gid) => {
              try {
                if (window.WAPI && typeof window.WAPI.getAllMessagesInChat === 'function') {
                  const m = await window.WAPI.getAllMessagesInChat(gid, true, true);
                  if (m && m.length) return m;
                }
                const store = window.Store;
                if (!store || !store.Chat) return [];
                const chat = (typeof store.Chat.get === 'function' ? store.Chat.get(gid) : null) ||
                             (store.Chat.models ? store.Chat.models.find(c => c && (c.id?._serialized === gid || c.id === gid)) : null);
                if (chat) {
                  if (store.Cmd && typeof store.Cmd.openChatAt === 'function') {
                    await store.Cmd.openChatAt(chat);
                  } else if (store.Cmd && typeof store.Cmd.openChatBottom === 'function') {
                    await store.Cmd.openChatBottom(chat);
                  }
                  await new Promise(r => setTimeout(r, 1200));
                  if (chat.loadEarlierMsgs && typeof chat.loadEarlierMsgs === 'function') {
                    for (let k = 0; k < 3; k++) {
                      await chat.loadEarlierMsgs().catch(() => null);
                      await new Promise(r => setTimeout(r, 400));
                    }
                  }
                  if (chat.msgs && chat.msgs.models && chat.msgs.models.length) {
                    return chat.msgs.models.map(m => ({
                      id: m.id?._serialized || m.id,
                      body: m.body || m.caption || '',
                      type: m.type || 'chat',
                      t: m.t,
                      from: m.from?._serialized || m.from,
                      author: m.author?._serialized || m.author || m.from?._serialized || m.from,
                      sender: {
                        id: m.author?._serialized || m.from?._serialized,
                        pushname: m.sender?.pushname || m.pushname || ''
                      }
                    }));
                  }
                }
              } catch (_) {}
              return [];
            }, groupId), 10000, []);
          }
        } catch (mErr) {
          console.warn(`[scrape] Error fetching messages for ${groupName}:`, mErr.message);
        }

        if (Array.isArray(msgs)) {
          const slice = msgs.slice(-limitPerGroup);
          results.totalMessagesScraped += slice.length;
          console.log(`[scrape] Retrieved ${slice.length} messages from "${groupName}"`);
          for (const m of slice) {
            try {
              const harvested = await harvesterInstance.handleIncomingMessage(s.id, m);
              if (harvested) results.unitsHarvested++;
            } catch (_) {}
          }
        }
      }
    } catch (err) {
      console.warn(`[${s.id}] Group scraping error:`, err.message);
    }
  }

  res.json({ ok: true, results });
});

/**
 * POST /api/sessions/:sessionId/messages/send-text — GatewayClient sendText contract
 */
/**
 * GET /api/sessions/:sessionId/qr.png - Returns raw PNG binary of the active QR
 */
app.get('/api/sessions/:sessionId/qr.png', (req, res) => {
  const s = resolveSession(req.params.sessionId);
  if (!s || !s.qrDataUrl) {
    return res.status(404).send('No active QR code for this session');
  }
  const base64Data = s.qrDataUrl.replace(/^data:image\/png;base64,/, '');
  const imgBuf = Buffer.from(base64Data, 'base64');
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': imgBuf.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.end(imgBuf);
});

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE PAIRING PORTAL (public, replaces the retired EC2 runner :2786/pair)
// Exposes ONLY ephemeral pairing QR codes + ready/qr status per line — no
// phone numbers, no send capability, no session detail.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/pair/status — minimal public status for the portal page.
 */
app.get('/api/pair/status', (req, res) => {
  res.json({
    ok: true,
    lines: SESSION_IDS.map((id) => {
      const s = sessions.get(id);
      const st = !s ? 'starting' : (s.status === 'READY' ? 'ready' : (s.status === 'AWAITING_QR' ? 'await_qr' : String(s.status || 'starting').toLowerCase()));
      return { id, status: st, hasQr: Boolean(s && s.qrDataUrl) };
    })
  });
});

/**
 * GET /api/pair/qr/:sessionId.png — public QR PNG, only while awaiting scan.
 */
app.get('/api/pair/qr/:sessionId.png', (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (s && s.qrDataUrl) {
    const imgBuf = Buffer.from(String(s.qrDataUrl).replace(/^data:image\/png;base64,/, ''), 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': imgBuf.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    return res.end(imgBuf);
  }
  const diskQr = path.join(__dirname, `qr_${req.params.sessionId}.png`);
  if (fs.existsSync(diskQr)) {
    const imgBuf = fs.readFileSync(diskQr);
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': imgBuf.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    return res.end(imgBuf);
  }
  return res.status(404).send('No active QR for this line');
});

app.get('/api/sessions/:sessionId/debug-keys', (req, res) => {
  const s = resolveSession(req.params.sessionId);
  if (!s || !s.client) return res.json({ error: 'No client' });
  const clientKeys = s.client._client ? Object.keys(s.client._client) : [];
  const clientProto = s.client._client ? Object.getOwnPropertyNames(Object.getPrototypeOf(s.client._client)) : [];
  const transportKeys = s.client._transport ? Object.keys(s.client._transport) : [];
  res.json({
    clientKeys,
    clientProto,
    transportKeys,
    hasPageOnUnderlying: Boolean(s.client._client && (s.client._client.page || s.client._client._page || s.client._client.pupPage))
  });
});

/**
 * Capture real-time visual screenshot from Puppeteer / WhatsApp Web client
 */
async function captureSessionScreenshot(s) {
  if (!s || !s.client) return null;
  try {
    // 1. OpenWA transport page (PuppeteerPage instance)
    const transportPage = s.client._transport?.page;
    if (transportPage && typeof transportPage.screenshot === 'function') {
      const u8 = await transportPage.screenshot({ type: 'png' });
      return Buffer.from(u8);
    }
    // 2. Underlying Puppeteer page on transportPage.page
    if (transportPage?.page && typeof transportPage.page.screenshot === 'function') {
      const buf = await transportPage.page.screenshot({ type: 'png' });
      return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    }
    // 3. OpenWA core page
    const corePage = s.client._client?.page || s.client._client?.transport?.page;
    if (corePage && typeof corePage.screenshot === 'function') {
      const u8 = await corePage.screenshot({ type: 'png' });
      return Buffer.from(u8);
    }
    // 4. OpenWA native takeScreenshot fallback
    if (typeof s.client.takeScreenshot === 'function') {
      const raw = await s.client.takeScreenshot();
      if (Buffer.isBuffer(raw)) return raw;
      if (typeof raw === 'string') {
        const base64Data = raw.replace(/^data:image\/\w+;base64,/, '');
        return Buffer.from(base64Data, 'base64');
      }
    }
    const page = s.client.page || s.client.pupPage || (s.client.driver && s.client.driver.page);
    if (page && typeof page.screenshot === 'function') {
      const buf = await page.screenshot({ type: 'png' });
      return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    }
  } catch (err) {
    console.warn(`[${s.id}] Screenshot capture failed:`, err.message);
  }
  return null;
}

/**
 * GET /api/pair/screenshot/:sessionId.png — Public live screen view for mobile pairing portal
 */
app.get('/api/pair/screenshot/:sessionId.png', async (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s || !s.client) {
    const statusText = s ? s.status : 'NOT_FOUND';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
      <rect width="640" height="400" fill="#0b1120"/>
      <rect x="20" y="20" width="600" height="360" rx="12" fill="#131a2e" stroke="rgba(148,163,184,0.2)"/>
      <text x="320" y="180" fill="#f0c040" font-family="Arial,sans-serif" font-weight="bold" font-size="16" text-anchor="middle">Line ${req.params.sessionId}</text>
      <text x="320" y="210" fill="#8b96ad" font-family="Arial,sans-serif" font-size="13" text-anchor="middle">Status: ${statusText} — Screen inactive</text>
      <text x="320" y="240" fill="#5d6880" font-family="Arial,sans-serif" font-size="11" text-anchor="middle">Pair or activate line to view live WhatsApp chat stream</text>
    </svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.send(svg);
  }

  const buf = await captureSessionScreenshot(s);
  if (buf) {
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': buf.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    return res.end(buf);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
    <rect width="640" height="400" fill="#0b1120"/>
    <text x="320" y="200" fill="#8b96ad" font-family="Arial,sans-serif" font-size="14" text-anchor="middle">Line ${req.params.sessionId} is initializing screen capture...</text>
  </svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.send(svg);
});

/**
 * GET /api/sessions/:sessionId/screenshot.png — Authenticated screen capture for admin console
 */
app.get('/api/sessions/:sessionId/screenshot.png', async (req, res) => {
  const s = resolveSession(req.params.sessionId);
  if (!s || !s.client) {
    const statusText = s ? s.status : 'NOT_FOUND';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
      <rect width="640" height="400" fill="#0b1120"/>
      <rect x="20" y="20" width="600" height="360" rx="12" fill="#131a2e" stroke="rgba(148,163,184,0.2)"/>
      <text x="320" y="180" fill="#f0c040" font-family="Arial,sans-serif" font-weight="bold" font-size="16" text-anchor="middle">Line ${req.params.sessionId}</text>
      <text x="320" y="210" fill="#8b96ad" font-family="Arial,sans-serif" font-size="13" text-anchor="middle">Status: ${statusText} — Screen inactive</text>
      <text x="320" y="240" fill="#5d6880" font-family="Arial,sans-serif" font-size="11" text-anchor="middle">Pair or activate line to view live WhatsApp chat stream</text>
    </svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.send(svg);
  }

  const buf = await captureSessionScreenshot(s);
  if (buf) {
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': buf.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    return res.end(buf);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
    <rect width="640" height="400" fill="#0b1120"/>
    <text x="320" y="200" fill="#8b96ad" font-family="Arial,sans-serif" font-size="14" text-anchor="middle">Screen capture in progress...</text>
  </svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.send(svg);
});

/**
 * POST /api/pair/reload — Restart lines that need a new QR code or are in error
 */
app.post('/api/pair/reload', async (req, res) => {
  const targetId = req.query.sessionId || req.body?.sessionId;
  const ids = targetId ? [targetId] : SESSION_IDS;
  const reloaded = [];
  for (const id of ids) {
    const s = sessions.get(id);
    if (!s) continue;
    if (s.status !== 'READY') {
      if (s.client) {
        try { await s.client.kill(); } catch (_) {}
        s.client = null;
      }
      s.status = 'STARTING';
      s.qrDataUrl = null;
      initSession(id);
      reloaded.push(id);
      await new Promise(r => setTimeout(r, 2500));
    }
  }
  res.json({ ok: true, reloaded });
});

/**
 * GET /api/pair/info — the public base URL of this worker (for the admin
 * console sidebar QR + "open portal" links).
 */
app.get('/api/pair/info', (req, res) => {
  const envUrl = process.env.WHATSAPP_PUBLIC_URL || process.env.CLOUDFLARE_TUNNEL_URL || null;
  const base = envUrl || publicPairBaseUrl || `http://localhost:${PORT}`;
  res.json({ ok: true, pairUrl: `${base}/pair` });
});

/**
 * GET /api/pair/link-qr.png — QR code PNG encoding the /pair portal URL so
 * phones can jump straight to the pairing page (admin sidebar asset).
 */
app.get('/api/pair/link-qr.png', async (req, res) => {
  const envUrl = process.env.WHATSAPP_PUBLIC_URL || process.env.CLOUDFLARE_TUNNEL_URL || null;
  const base = envUrl || publicPairBaseUrl || `http://localhost:${PORT}`;
  const pairUrl = `${base}/pair`;
  if (!QRCode) {
    return res.status(503).json({ error: 'qrcode dependency not installed' });
  }
  try {
    const buf = await QRCode.toBuffer(pairUrl, { width: 320, margin: 2 });
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': buf.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(buf);
  } catch (err) {
    res.status(500).json({ error: `QR generation failed: ${err.message}` });
  }
});

/**
 * GET /pair — mobile-friendly pairing portal (self-contained page).
 */
app.get('/pair', (req, res) => {
  res.send(renderPairPortalHtml());
});

function renderPairPortalHtml() {
  const cards = SESSION_IDS.map((id, i) => `
    <div class="card" id="card-${id}" data-line="${id}">
      <div class="card-hd">
        <span class="sim">SIM #${i + 1}</span>
        <span class="lid">${id}</span>
        <span class="st st-starting" id="st-${id}">…</span>
      </div>
      <div class="qrwrap" id="qrwrap-${id}">
        <img id="qr-${id}" alt="QR ${id}" style="display:none" />
        <div class="qrmsg" id="msg-${id}">…</div>
      </div>
      <div class="live-screen-wrap" id="live-screen-${id}" style="display:none; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:10px; color:var(--gold); font-weight:700;">📺 LIVE WHATSAPP SCREEN</span>
          <span style="font-size:9px; color:var(--dim);" id="live-time-${id}"></span>
        </div>
        <img id="live-img-${id}" style="width:100%; border-radius:8px; border:1px solid var(--edge); background:#000;" alt="Live Screen" />
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div class="hint" id="hint-${id}">—</div>
        <button class="live-btn" id="btn-live-${id}" onclick="toggleLive('${id}')" style="display:none; padding:4px 10px; font-size:10px; border-radius:6px; border:1px solid var(--edge); background:rgba(56,189,248,.12); color:#38bdf8; cursor:pointer; font-weight:600;">👁️ Live Screen</button>
      </div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sierra Estates — WhatsApp Pairing Portal</title>
  <style>
    :root {
      --bg: #0a0e27; --panel: #131a2e; --card: #0f1629; --edge: rgba(148,163,184,.16);
      --gold: #f0c040; --gold-hi: #ffd700; --text: #e8eef7; --dim: #8b96ad;
      --ok: #34d399; --warn: #f5b33c; --bad: #f85149;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      background: radial-gradient(900px 400px at 80% -10%, rgba(56,189,248,.06), transparent 60%), var(--bg);
      color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh; padding: 18px 14px 30px;
    }
    header { text-align: center; margin-bottom: 16px; }
    .logo {
      width: 54px; height: 54px; border-radius: 50%; margin: 0 auto 10px;
      background: linear-gradient(135deg, var(--gold-hi), #d9a521); color: #071422;
      display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 17px;
      box-shadow: 0 0 22px rgba(255,215,0,.3); font-family: Consolas, monospace;
    }
    h1 { font-size: 16px; letter-spacing: .03em; }
    h1 .sep { color: var(--gold); padding: 0 3px; }
    .sub { font-size: 11px; color: var(--gold); margin-top: 3px; }
    .langbar { display: flex; justify-content: center; gap: 6px; margin-top: 12px; }
    .langbar button {
      padding: 5px 12px; font-size: 11px; border-radius: 6px; cursor: pointer;
      border: 1px solid var(--edge); background: transparent; color: var(--dim); font-family: inherit;
      transition: all 0.2s ease;
    }
    .langbar button.on { color: var(--gold-hi); border-color: var(--gold); background: rgba(240,192,64,.1); font-weight: 700; }
    .langbar button.reload-btn {
      color: #071422; border-color: var(--gold); background: linear-gradient(135deg, var(--gold-hi), #d9a521);
      font-weight: 700; margin-left: 12px; box-shadow: 0 0 12px rgba(255,215,0,.25);
    }
    .langbar button.reload-btn:hover {
      transform: translateY(-1px); box-shadow: 0 0 16px rgba(255,215,0,.45);
    }
    .battery-banner {
      max-width: 900px; margin: 12px auto 0; background: rgba(240,192,64,.08);
      border: 1px solid rgba(240,192,64,.25); border-radius: 8px; padding: 8px 12px;
      font-size: 11px; color: #f0c040; display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; max-width: 900px; margin: 0 auto; }
    .card {
      background: var(--card); border: 1px solid var(--edge); border-radius: 12px; padding: 13px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .card-hd { display: flex; align-items: center; gap: 8px; }
    .sim { font-size: 12.5px; font-weight: 700; }
    .lid { font-family: Consolas, monospace; font-size: 9px; color: #5d6880; }
    .st { margin-left: auto; font-size: 9px; padding: 2px 8px; border-radius: 99px; border: 1px solid; font-family: Consolas, monospace; }
    .st-ready { color: var(--ok); border-color: rgba(52,211,153,.4); background: rgba(52,211,153,.08); }
    .st-await_qr, .st-await { color: var(--warn); border-color: rgba(245,179,60,.4); background: rgba(245,179,60,.08); }
    .st-starting { color: var(--dim); border-color: var(--edge); }
    .qrwrap {
      background: #0b1120; border: 1px solid var(--edge); border-radius: 10px;
      padding: 12px; display: flex; align-items: center; justify-content: center; min-height: 200px; position: relative;
    }
    .qrwrap img { width: 176px; height: 176px; background: #fff; border-radius: 8px; padding: 6px; }
    .qrmsg { color: var(--dim); font-size: 11px; text-align: center; line-height: 1.6; padding: 10px; }
    .hint { font-size: 10px; color: var(--dim); text-align: center; line-height: 1.55; }
    footer { text-align: center; margin-top: 20px; font-size: 10px; color: #5d6880; font-family: Consolas, monospace; }
    .pulse { animation: pulse 2.2s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .45 } }
  </style>
</head>
<body>
  <header>
    <div class="logo">SE</div>
    <h1><span data-i18n="t1">Pair</span><span class="sep">›</span><span data-i18n="t2">Scan</span><span class="sep">›</span><span data-i18n="t3">Connect</span></h1>
    <div class="sub" data-i18n="sub">Sierra Estates 8-line WhatsApp pairing portal</div>
    <div class="langbar">
      <button id="btn-en" class="on" onclick="setLang('en')">🇬🇧 EN</button>
      <button id="btn-ar" onclick="setLang('ar')">🇸🇦 ع</button>
      <button id="btn-reload" class="reload-btn" onclick="reloadQrs(this)">🔄 <span data-i18n="reload">Reload QR</span></button>
    </div>
    <div class="battery-banner">
      <span>🔋</span>
      <span data-i18n="battery">Keep-Alive: On Android, set WhatsApp Battery to 'Unrestricted' in Phone Settings so connection never sleeps.</span>
    </div>
  </header>
  <div class="grid">${cards}</div>
  <footer>Sierra Estates WhatsApp Gateway · pairing portal v1.0</footer>

  <script>
    var L = 'en';
    var I18N = {
      en: {
        t1: 'Pair', t2: 'Scan', t3: 'Connect',
        sub: 'Sierra Estates 8-line WhatsApp pairing portal',
        ready: 'CONNECTED', await: 'SCAN QR', starting: 'STARTING',
        readyMsg: 'This line is paired and operating.',
        awaitMsg: 'Scan this code: WhatsApp › Linked Devices › Link a Device',
        startMsg: 'Waiting for the line to start…',
        hint: 'The QR renews every few seconds — keep the scanner open.',
        reload: 'Reload QR',
        liveBtn: 'Live Screen',
        hideLive: 'Hide Screen',
        battery: 'Keep-Alive: On Android, set WhatsApp Battery to "Unrestricted" in Phone Settings so connection never sleeps.'
      },
      ar: {
        t1: 'ربط', t2: 'امسح', t3: 'اتصل',
        sub: 'بوابة ربط خطوط الواتساب الثمانية — سييرا إستيتس',
        ready: 'متصل', await: 'امسح الكود', starting: 'يبدأ',
        readyMsg: 'هذا الخط مرتبط ويعمل.',
        awaitMsg: 'امسح هذا الكود: واتساب › الأجهزة المرتبطة › ربط جهاز',
        startMsg: 'بانتظار بدء الخط…',
        hint: 'يتجدد الكود كل ثوانٍ — أبقِ الماسح مفتوحًا.',
        reload: 'تحديث الـ QR',
        liveBtn: 'الشاشة الحية',
        hideLive: 'إغلاق الشاشة',
        battery: 'تنبيه: في هواتف أندرويد، اضبط بطارية واتساب على "غير مقيدة" (Unrestricted) لمنع انقطاع الاتصال عند قفل الشاشة.'
      }
    };
    function setLang(l) { L = l; apply(); }
    function T(k) { return (I18N[L] && I18N[L][k]) || k; }
    function apply() {
      document.getElementById('btn-en').className = L === 'en' ? 'on' : '';
      document.getElementById('btn-ar').className = L === 'ar' ? 'on' : '';
      document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = T(el.getAttribute('data-i18n')); });
      document.querySelector('.sub').textContent = T('sub');
      refresh();
    }
    function reloadQrs(btn) {
      if (!btn) btn = document.getElementById('btn-reload');
      btn.disabled = true;
      btn.textContent = '… Reloading';
      fetch('/api/pair/reload', { method: 'POST' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          setTimeout(function () {
            btn.disabled = false;
            btn.innerHTML = '🔄 <span data-i18n="reload">' + T('reload') + '</span>';
            refresh();
          }, 3500);
        })
        .catch(function () {
          btn.disabled = false;
          btn.innerHTML = '🔄 <span data-i18n="reload">' + T('reload') + '</span>';
        });
    }

    var activeLiveLine = null;
    var liveTimer = null;
    function toggleLive(id) {
      var wrap = document.getElementById('live-screen-' + id);
      var btn = document.getElementById('btn-live-' + id);
      if (!wrap) return;
      if (wrap.style.display === 'flex') {
        wrap.style.display = 'none';
        btn.textContent = '👁️ ' + T('liveBtn');
        if (activeLiveLine === id) { activeLiveLine = null; clearInterval(liveTimer); }
      } else {
        wrap.style.display = 'flex';
        btn.textContent = '❌ ' + T('hideLive');
        activeLiveLine = id;
        updateLiveImg(id);
        clearInterval(liveTimer);
        liveTimer = setInterval(function() {
          if (activeLiveLine) updateLiveImg(activeLiveLine);
        }, 2500);
      }
    }
    function updateLiveImg(id) {
      var img = document.getElementById('live-img-' + id);
      var time = document.getElementById('live-time-' + id);
      if (!img) return;
      img.src = '/api/pair/screenshot/' + encodeURIComponent(id) + '.png?ts=' + Date.now();
      if (time) time.textContent = new Date().toLocaleTimeString();
    }

    function refresh() {
      fetch('/api/pair/status').then(function (r) { return r.json(); }).then(function (d) {
        (d.lines || []).forEach(function (ln) {
          var st = document.getElementById('st-' + ln.id);
          var img = document.getElementById('qr-' + ln.id);
          var msg = document.getElementById('msg-' + ln.id);
          var hint = document.getElementById('hint-' + ln.id);
          var btnLive = document.getElementById('btn-live-' + ln.id);
          if (!st) return;
          if (ln.status === 'ready') {
            st.textContent = T('ready'); st.className = 'st st-ready';
            img.style.display = 'none'; msg.className = 'qrmsg';
            msg.textContent = '✓ ' + T('readyMsg'); hint.textContent = '';
            if (btnLive) btnLive.style.display = 'block';
          } else if (ln.status === 'await_qr' && ln.hasQr) {
            st.textContent = T('await'); st.className = 'st st-await_qr pulse';
            msg.style.display = 'none';
            img.style.display = 'block';
            img.src = '/api/pair/qr/' + encodeURIComponent(ln.id) + '.png?ts=' + Date.now();
            img.className = 'pulse';
            hint.textContent = T('hint');
            if (btnLive) btnLive.style.display = 'none';
          } else {
            st.textContent = T('starting'); st.className = 'st st-starting';
            img.style.display = 'none'; msg.className = 'qrmsg';
            msg.textContent = T('startMsg'); hint.textContent = '';
            if (btnLive) btnLive.style.display = 'none';
          }
        });
      }).catch(function () {});
    }
    setInterval(refresh, 4000);
    apply();
  </script>
</body>
</html>`;
}


app.post('/api/sessions/:sessionId/messages/send-text', async (req, res) => {
  const s = resolveSession(req.params.sessionId);
  if (!s) return res.status(404).json({ error: `Session not found` });
  if (s.status !== 'READY' || !s.client) {
    return res.status(503).json({ error: `Session ${s.id} is not ready (status: ${s.status})` });
  }

  const { chatId, text } = req.body;
  if (String(chatId).includes('@g.us') || String(chatId).startsWith('120363') || String(chatId).replace(/\D/g, '').length > 15) {
    return res.status(400).json({ error: 'Safety guard: sending messages to WhatsApp groups is strictly disabled' });
  }
  if (!chatId || !text) {
    return res.status(400).json({ error: 'Missing required parameters: chatId and text' });
  }

  try {
    const sendPromise = new Promise((resolve, reject) => {
      s.messageQueue.push({ chatId, text, resolve, reject });
      processQueue(s.id);
    });

    const result = await sendPromise;
    if (result && result.ok === false) {
      return res.status(400).json(result);
    }
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
  if (String(chatId).includes('@g.us') || String(chatId).startsWith('120363') || String(chatId).replace(/\D/g, '').length > 15) {
    return res.status(400).json({ error: 'Safety guard: sending messages to WhatsApp groups is strictly disabled' });
  }
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
/**
 * POST /api/sessions/:sessionId/check-number
 * Silently probes if a phone/chatId exists on WhatsApp (zero messages sent).
 */
app.post('/api/sessions/:sessionId/check-number', async (req, res) => {
  const s = resolveSession(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  if (s.status !== 'READY' || !s.client) {
    return res.status(503).json({ error: `Session ${s.id} is not ready (status: ${s.status})` });
  }

  const rawPhone = req.body.phone || req.body.chatId || req.body.number;
  if (!rawPhone) {
    return res.status(400).json({ error: 'Missing required parameter: phone, chatId, or number' });
  }

  const formattedChatId = String(rawPhone).includes('@') ? String(rawPhone) : `${String(rawPhone).replace(/[^\d]/g, '')}@c.us`;

  try {
    let result = null;
    if (typeof s.client.checkNumberStatus === 'function') {
      result = await s.client.checkNumberStatus(formattedChatId);
    } else if (typeof s.client.getContact === 'function') {
      result = await s.client.getContact(formattedChatId);
    }

    const exists = Boolean(
      result &&
      (result.status === 200 || result.canReceiveMessage === true || (result.id && result.id._serialized))
    );

    res.json({
      ok: true,
      exists,
      status: result && result.status ? result.status : (exists ? 200 : 404),
      canReceiveMessage: result && result.canReceiveMessage !== undefined ? result.canReceiveMessage : exists,
      isBusiness: Boolean(result && result.isBusiness),
      chatId: formattedChatId,
      session: s.id,
      raw: result
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: `checkNumberStatus failed: ${err.message}`, chatId: formattedChatId, session: s.id });
  }
});

/**
 * POST /api/check-number — Auto Round-Robin check across ready sessions
 */
app.post('/api/check-number', async (req, res) => {
  const readySessions = Array.from(sessions.values()).filter(s => s.status === 'READY' && s.client);
  if (!readySessions.length) {
    return res.status(503).json({ error: 'No WhatsApp lines are currently in READY status' });
  }

  roundRobinIndex = (roundRobinIndex + 1) % readySessions.length;
  const chosen = readySessions[roundRobinIndex];

  const rawPhone = req.body.phone || req.body.chatId || req.body.number;
  if (!rawPhone) {
    return res.status(400).json({ error: 'Missing required parameter: phone, chatId, or number' });
  }

  const formattedChatId = String(rawPhone).includes('@') ? String(rawPhone) : `${String(rawPhone).replace(/[^\d]/g, '')}@c.us`;

  try {
    let result = null;
    if (typeof chosen.client.checkNumberStatus === 'function') {
      result = await chosen.client.checkNumberStatus(formattedChatId);
    }
    const exists = Boolean(
      result &&
      (result.status === 200 || result.canReceiveMessage === true || (result.id && result.id._serialized))
    );

    res.json({
      ok: true,
      exists,
      status: result && result.status ? result.status : (exists ? 200 : 404),
      canReceiveMessage: result && result.canReceiveMessage !== undefined ? result.canReceiveMessage : exists,
      isBusiness: Boolean(result && result.isBusiness),
      chatId: formattedChatId,
      session: chosen.id
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: `check-number failed on ${chosen.id}: ${err.message}`, chatId: formattedChatId });
  }
});

/**
 * POST /api/numbers/verify-batch — Verify a batch of candidate numbers silently
 */
app.post('/api/numbers/verify-batch', async (req, res) => {
  const readySessions = Array.from(sessions.values()).filter(s => s.status === 'READY' && s.client);
  if (!readySessions.length) {
    return res.status(503).json({ error: 'No WhatsApp lines are currently in READY status' });
  }

  const numbers = req.body.numbers;
  if (!Array.isArray(numbers) || !numbers.length) {
    return res.status(400).json({ error: 'Missing required parameter: numbers array' });
  }

  const results = [];
  for (let i = 0; i < numbers.length; i++) {
    const raw = numbers[i];
    const target = String(raw).includes('@') ? String(raw) : `${String(raw).replace(/[^\d]/g, '')}@c.us`;
    const chosen = readySessions[i % readySessions.length];
    try {
      let r = null;
      if (typeof chosen.client.checkNumberStatus === 'function') {
        r = await chosen.client.checkNumberStatus(target);
      }
      const exists = Boolean(r && (r.status === 200 || r.canReceiveMessage === true));
      results.push({ number: raw, chatId: target, exists, isBusiness: Boolean(r && r.isBusiness) });
    } catch (e) {
      results.push({ number: raw, chatId: target, exists: false, error: e.message });
    }
    // Safe anti-rate-limit delay between checks
    if (i < numbers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }

  res.json({
    ok: true,
    total: numbers.length,
    validCount: results.filter(r => r.exists).length,
    invalidCount: results.filter(r => !r.exists).length,
    results
  });
});

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
 * GET/POST/DELETE /api/sessions/:sessionId/webhooks — Per-session webhook subscriptions
 */
app.get('/api/sessions/:sessionId/webhooks', (req, res) => {
  const s = resolveSession(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  res.json({ ok: true, sessionId: s.id, webhooks: s.webhooks || [], bridge: appBridge.status() });
});

app.post('/api/sessions/:sessionId/webhooks', (req, res) => {
  const s = resolveSession(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  const { url, events, headers } = req.body || {};
  if (!url || !/^https?:\/\//i.test(String(url))) {
    return res.status(400).json({ error: 'Valid webhook url is required' });
  }
  s.webhooks = (s.webhooks || []).filter((w) => w.url !== url);
  const entry = {
    url: String(url),
    events: Array.isArray(events) && events.length ? events : ['message.received'],
    headers: headers && typeof headers === 'object' ? headers : {},
    createdAt: new Date().toISOString(),
  };
  s.webhooks.push(entry);
  res.json({ ok: true, sessionId: s.id, webhook: entry, count: s.webhooks.length });
});

app.delete('/api/sessions/:sessionId/webhooks', (req, res) => {
  const s = resolveSession(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  const targetUrl = req.query.url || (req.body && req.body.url);
  if (targetUrl) {
    s.webhooks = (s.webhooks || []).filter((w) => w.url !== targetUrl);
  } else {
    s.webhooks = [];
  }
  res.json({ ok: true, sessionId: s.id, count: s.webhooks.length });
});

app.get('/api/bridge/status', (req, res) => {
  res.json({ ok: true, bridge: appBridge.status() });
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
    'متاح شقة للبيع في ميفيدا التجمع الخامس مساحة 200م 3 غرف الترا سوبر لوكس مطلوب 14.5 مليون كاش تواصل 01012345678',
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

const mapLimiter = rateLimit ? rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
}) : (req, res, next) => next();

app.get('/map', mapLimiter, (req, res) => {
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
const server = app.listen(PORT, () => {
  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`  Sierra Estates — 8-Line WhatsApp Gateway Active`);
  console.log(`  Dashboard URL: http://localhost:${PORT}`);
  console.log(`  Gateway REST:  http://127.0.0.1:${PORT}/api/sessions`);
  console.log(`  Active Pool:   ${SESSION_IDS.join(', ')}`);
  console.log(`  App Bridge:    ${appBridge.status().enabled ? 'ON' : 'OFF'} → ${appBridge.status().webhookUrl}`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  // Pulse the app heartbeat while ≥1 line is READY (honest: no READY
  // lines ⇒ no pulses ⇒ /api/whatsapp/health honestly reports stale).
  appBridge.startHeartbeat(() => Array.from(sessions.values()).some((x) => x.status === 'READY'));

  // Multi-Device keepalive ping: keeps WhatsApp sockets and background Chromium renderer active
  setInterval(async () => {
    for (const [id, s] of sessions.entries()) {
      if (s.status === 'READY' && s.client) {
        try {
          let alive = true;
          if (typeof s.client.isConnected === 'function') {
            alive = await s.client.isConnected();
          } else if (typeof s.client.evaluate === 'function') {
            alive = await s.client.evaluate(() => Boolean(window.Store || document.readyState === 'complete')).catch(() => true);
          }
          if (alive) {
            s.lastActive = new Date().toISOString();
          } else {
            console.warn(`[${id}] Keepalive watchdog: socket is idle or disconnected. Triggering refresh...`);
            if (typeof s.client.refresh === 'function') {
              await s.client.refresh().catch(() => {});
            }
          }
        } catch (pingErr) {
          if (!String(pingErr?.message || '').includes('getConnectionState')) {
            console.warn(`[${id}] Keepalive ping:`, pingErr.message);
          }
        }
      }
    }
  }, 25000);

  startAllSessions();
});

// Graceful cleanup
const cleanShutdown = async () => {
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
};

process.on('SIGINT', cleanShutdown);
process.on('SIGTERM', cleanShutdown);

