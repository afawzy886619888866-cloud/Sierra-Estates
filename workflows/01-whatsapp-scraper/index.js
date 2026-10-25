const path = require('path');
const fs = require('fs');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch {}
try { require('dotenv').config({ path: path.join(__dirname, '..', 'workflows.env') }); } catch {}

const { requestJson } = require('../lib/gateway-client');

/**
 * Workflow 01: WhatsApp Scraper (Gateway Harvester Consumer)
 * ──────────────────────────────────────────────────────────
 * Ingests property listings dropped into WhatsApp broker groups across
 * all active OpenWA gateway lines.
 *
 * ⚠ SECOND-SESSION BAN PROTECTION:
 *   Running a second standalone WhatsApp Web client (whatsapp-web.js / Puppeteer)
 *   on the same SIM numbers as the live OpenWA gateway creates a severe
 *   account-ban risk.
 *
 *   PRODUCTION PATH (Default):
 *   This workflow operates as a safe, lightweight HTTP consumer of the
 *   multi-session OpenWA gateway Harvester (:2785 /api/harvester/recent),
 *   reading real-time broker chatter parsed across all lines with zero
 *   second-session ban risk.
 *
 *   OPTIONAL STANDALONE SESSION (Explicit opt-in only):
 *   Set SCRAPER_ALLOW_OWN_SESSION=1 and SCRAPER_SESSION_NUMBER=<dedicated SIM>
 *   to launch an isolated whatsapp-web.js client.
 *
 * Exit: 0 ok (completed sweep) · 2 unconfigured/blocked · 1 error
 */

const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID || '';
const SA_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '';
const ALLOW = /^(1|true|yes)$/i.test(process.env.SCRAPER_ALLOW_OWN_SESSION || '');
const SESSION_NUMBER = process.env.SCRAPER_SESSION_NUMBER || '';
const GATEWAY_NUMBER = (process.env.SCRAPER_GATEWAY_NUMBER || '').replace(/\D/g, '');

const GROUPS_TO_WATCH = (process.env.SCRAPER_GROUPS || 'مجموعة وسطاء التجمع,عقارات القاهرة الجديدة,وسطاء شرق القاهرة,وسطاء التجمع والحي')
  .split(',')
  .map((g) => g.trim())
  .filter(Boolean);

let googleSheetsClient = null;

/**
 * Lazy Google Sheets authentication
 */
function getSheetsClient() {
  if (googleSheetsClient) return googleSheetsClient;
  if (!SHEET_ID || !SA_PATH || !fs.existsSync(SA_PATH)) return null;
  try {
    const { google } = require('googleapis');
    const creds = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));
    googleSheetsClient = {
      sheetId: SHEET_ID,
      sheets: google.sheets({
        version: 'v4',
        auth: new google.auth.GoogleAuth({
          credentials: creds,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        }),
      }),
    };
    return googleSheetsClient;
  } catch (err) {
    console.warn(`[scraper] Google Sheets auth failed: ${err.message}`);
    return null;
  }
}

/**
 * Append row to Google Sheets
 */
async function appendToSheet(tabName, values) {
  const client = getSheetsClient();
  if (!client) return false;
  try {
    await client.sheets.spreadsheets.values.append({
      spreadsheetId: client.sheetId,
      range: `'${tabName}'!A:F`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [values] },
    });
    console.log(`written to ${tabName}: ${(values[3] || '').substring(0, 50)}...`);
    return true;
  } catch (err) {
    console.error(`sheet write failed for ${tabName}: ${err.message}`);
    return false;
  }
}

/**
 * Production Path: HTTP Consumer of the OpenWA Gateway Harvester
 */
async function runHarvesterConsumer() {
  const GATEWAY_URL = (process.env.WHATSAPP_API_URL || process.env.OPENWA_GATEWAY_URL || 'http://127.0.0.1:2785').replace(/\/+$/, '');
  const API_KEY = process.env.OPENWA_ADMIN_API_KEY || process.env.RUNNER_API_KEY || '';
  const STATE_DIR = process.env.WF_STATE_DIR || path.join(__dirname, '..', '.state');
  fs.mkdirSync(STATE_DIR, { recursive: true });

  const SEEN_FILE = path.join(STATE_DIR, 'scraper-seen.json');
  const OUT_FILE = path.join(STATE_DIR, 'scraped-listings.jsonl');

  let seenIds = new Set();
  try {
    if (fs.existsSync(SEEN_FILE)) {
      const data = JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8'));
      if (Array.isArray(data)) seenIds = new Set(data);
    }
  } catch (_) {}

  let units = [];

  // 1. Query Gateway Harvester API
  try {
    const headers = API_KEY ? { 'X-API-Key': API_KEY } : {};
    const res = await requestJson(`${GATEWAY_URL}/api/harvester/recent`, {
      headers,
      timeoutMs: 5000,
    });
    if (res.ok && Array.isArray(res.data)) {
      units = res.data;
      console.log(`[scraper] Gateway HTTP returned ${units.length} recent units.`);
    } else {
      console.warn(`[scraper] Gateway HTTP returned ${res.status}`);
    }
  } catch (err) {
    console.log(`[scraper] Gateway HTTP poll failed (${err.message}), falling back to disk...`);
  }

  // 2. Resilient Fallback: read local harvested_units.jsonl
  if (!units.length) {
    const localCandidates = [
      path.join(__dirname, '..', '..', 'apps', 'agents', 'whatsapp-multi-session', 'whatsapp-auth', 'harvested_units.jsonl'),
      path.resolve(__dirname, '..', 'apps', 'agents', 'whatsapp-multi-session', 'whatsapp-auth', 'harvested_units.jsonl'),
    ];
    for (const cand of localCandidates) {
      if (fs.existsSync(cand)) {
        try {
          const lines = fs.readFileSync(cand, 'utf8').split('\n').filter(Boolean);
          units = lines.map((l) => JSON.parse(l)).reverse().slice(0, 150);
          console.log(`[scraper] Loaded ${units.length} units from local ${path.basename(cand)}`);
          break;
        } catch (_) {}
      }
    }
  }

  let scrapedCount = 0;
  for (const unit of units) {
    const uid = unit.id || `${unit.harvestedAt}_${unit.brokerPhone || ''}`;
    if (!uid || seenIds.has(uid)) continue;
    seenIds.add(uid);
    scrapedCount++;

    // Write to local jsonl audit trail
    fs.appendFileSync(OUT_FILE, `${JSON.stringify(unit)}\n`);

    // Append to Sheets if configured
    await appendToSheet('raw_messages', [
      unit.harvestedAt || new Date().toISOString(),
      `${unit.sourceChat || 'WhatsApp Group'} <${unit.brokerPhone || unit.brokerName || 'broker'}>`,
      unit.dealType || 'Sale',
      String(unit.rawText || '').substring(0, 500),
      'NO',
      'PENDING_REVIEW',
    ]);
  }

  // Persist seen cache (keep last 2000 IDs)
  const seenArray = Array.from(seenIds).slice(-2000);
  try {
    fs.writeFileSync(SEEN_FILE, JSON.stringify(seenArray), 'utf8');
  } catch (_) {}

  console.log(`[scraper] Gateway Harvester sweep complete: ${scrapedCount} new units ingested, ${units.length} total examined.`);
  console.log(`SUMMARY ${JSON.stringify({ scraped: scrapedCount, totalHarvested: units.length, mode: 'http-consumer' })}`);
  process.exit(0);
}

// Branch: Standalone dedicated SIM session vs Production Gateway Harvester
if (ALLOW) {
  function failBlocked(msg) {
    console.log(`BLOCKED: ${msg}`);
    process.exit(2);
  }
  if (!SESSION_NUMBER) failBlocked('SCRAPER_SESSION_NUMBER required — never run this scraper on the OpenWA gateway SIM');
  if (GATEWAY_NUMBER && SESSION_NUMBER.replace(/\D/g, '').endsWith(GATEWAY_NUMBER)) {
    failBlocked('SCRAPER_SESSION_NUMBER equals the OpenWA gateway number — second session refused (ban risk)');
  }
  if (!SHEET_ID) failBlocked('BROKER_INBOX_SHEET_ID missing');
  if (!SA_PATH || !fs.existsSync(SA_PATH)) failBlocked('GOOGLE_SERVICE_ACCOUNT_KEY missing or file not found');

  const { Client, LocalAuth } = require('whatsapp-web.js');

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: process.env.SCRAPER_SESSION_DIR || path.join(__dirname, '..', '.wa-session') }),
  });

  client.on('ready', () => {
    console.log(`scraper ready — watching ${GROUPS_TO_WATCH.length} groups (session ${SESSION_NUMBER})`);
  });

  client.on('message', async (msg) => {
    try {
      const chat = await msg.getChat();
      const chatName = chat?.name || '';
      if (!GROUPS_TO_WATCH.some((g) => chatName.includes(g))) return;
      await appendToSheet('raw_messages', [
        new Date().toISOString(),
        `${chatName} <${msg.from}>`,
        msg.fromMe ? 'broker' : 'subscriber',
        String(msg.body || '').substring(0, 500),
        msg.hasMedia ? 'YES' : 'NO',
        'PENDING_REVIEW',
      ]);
    } catch (err) {
      console.error(`message handler failed: ${err.message}`);
    }
  });

  client.on('auth_failure', (msg) => {
    console.error(`auth failed: ${msg}`);
    process.exit(1);
  });

  console.log('scraper: initializing second-session client (explicit opt-in)');
  client.initialize();
} else {
  runHarvesterConsumer().catch((err) => {
    console.error(`[scraper] Fatal: ${err.message}`);
    process.exit(1);
  });
}
