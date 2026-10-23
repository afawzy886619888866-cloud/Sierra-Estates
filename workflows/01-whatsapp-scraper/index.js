/**
 * Workflow 01: WhatsApp Scraper  (guarded 2026-10)
 * ─────────────────────────────────────────
 * Monitors broker WhatsApp groups for property chatter and writes raw
 * messages to the Sheets "raw_messages" tab.
 *
 * ⚠ SECOND-SESSION GUARD (new):
 *   This workflow uses whatsapp-web.js, which would open a SECOND WhatsApp
 *   Web session on the same SIM. The production number (+20 106 139 9688)
 *   is now the live OpenWA gateway session — opening a second linked device
 *   on the same account is a real account-ban risk and can destabilize the
 *   gateway session.
 *
 *   Therefore this workflow REFUSES to start unless BOTH are true:
 *     SCRAPER_ALLOW_OWN_SESSION=1            (explicit operator opt-in)
 *     SCRAPER_SESSION_NUMBER=<dedicated SIM> (a number NOT used by OpenWA)
 *
 *   Recommended long-term path (no second session): extend the OpenWA
 *   gateway with an inbound-message webhook → this workflow becomes a
 *   pure HTTP consumer. Until then, keep this workflow paused in the
 *   admin Studio.
 *
 * Exit: 0 ok (running) · 2 unconfigured/blocked · 1 error
 */
const fs = require('fs');

const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID || '';
const SA_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '';
const ALLOW = /^(1|true|yes)$/i.test(process.env.SCRAPER_ALLOW_OWN_SESSION || '');
const SESSION_NUMBER = process.env.SCRAPER_SESSION_NUMBER || '';

const GATEWAY_NUMBER = (process.env.SCRAPER_GATEWAY_NUMBER || '').replace(/\D/g, '');

function failBlocked(msg) {
  console.log(`BLOCKED: ${msg}`);
  process.exit(2);
}

// Guard first — before touching whatsapp-web.js (which pulls puppeteer).
if (!ALLOW) failBlocked('second-session guard: set SCRAPER_ALLOW_OWN_SESSION=1 to run whatsapp-web.js scraper');
if (!SESSION_NUMBER) failBlocked('SCRAPER_SESSION_NUMBER required — never run this scraper on the OpenWA gateway SIM');
if (GATEWAY_NUMBER && SESSION_NUMBER.replace(/\D/g, '').endsWith(GATEWAY_NUMBER)) {
  failBlocked('SCRAPER_SESSION_NUMBER equals the OpenWA gateway number — second session refused (ban risk)');
}
if (!SHEET_ID) failBlocked('BROKER_INBOX_SHEET_ID missing');
if (!SA_PATH || !fs.existsSync(SA_PATH)) failBlocked('GOOGLE_SERVICE_ACCOUNT_KEY missing or file not found');

const { Client, LocalAuth } = require('whatsapp-web.js'); // lazy: only loads when allowed
const { google } = require('googleapis');

const GROUPS_TO_WATCH = (process.env.SCRAPER_GROUPS || 'مجموعة وسطاء التجمع,عقارات القاهرة الجديدة,وسطاء شرق القاهرة,وسطاء التجمع والحي')
  .split(',')
  .map((g) => g.trim())
  .filter(Boolean);

const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.GoogleAuth({
    credentials: JSON.parse(fs.readFileSync(SA_PATH, 'utf8')),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

async function appendToSheet(tabName, values) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `'${tabName}'!A:F`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [values] },
    });
    console.log(`written to ${tabName}: ${(values[3] || '').substring(0, 50)}...`);
  } catch (err) {
    console.error(`sheet write failed for ${tabName}: ${err.message}`);
  }
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: process.env.SCRAPER_SESSION_DIR || '/opt/se/workflows/.wa-session' }),
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
