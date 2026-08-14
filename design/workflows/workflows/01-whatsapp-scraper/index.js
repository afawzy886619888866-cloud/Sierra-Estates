/**
 * Workflow 01: WhatsApp Scraper
 * ─────────────────────────────────────────
 * Monitors WhatsApp groups for property listings
 * Writes raw messages to Google Sheets
 *
 * Usage:
 *   node workflows/01-whatsapp-scraper/index.js
 *
 * Env vars required:
 *   - BROKER_INBOX_SHEET_ID
 *   - GOOGLE_SERVICE_ACCOUNT_KEY (JSON path)
 *   - WHATSAPP_BOT_TOKEN (if using WhatsApp Web API)
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const { google } = require('googleapis');
const fs = require('fs');

const GROUPS_TO_WATCH = [
  'مجموعة وسطاء التجمع',
  'عقارات القاهرة الجديدة',
  'وسطاء شرق القاهرة',
  'وسطاء التجمع والحي',
];

const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID;
const SERVICE_ACCOUNT_KEY = JSON.parse(
  fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'utf8')
);

const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

async function appendToSheet(tabName, values) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `'${tabName}'!A:F`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [values],
      },
    });
    console.log(`✅ Written to ${tabName}:`, values[3].substring(0, 50) + '...');
  } catch (err) {
    console.error(`❌ Sheet write failed for ${tabName}:`, err.message);
  }
}

// Initialize WhatsApp client
const client = new Client({ authStrategy: new LocalAuth() });

client.on('ready', () => {
  console.log('🟢 WhatsApp scraper ready');
});

client.on('message', async (msg) => {
  // Filter to watched groups only
  if (!GROUPS_TO_WATCH.some(g => msg.from.includes(g))) {
    return;
  }

  // Write raw message to sheet
  await appendToSheet('raw_messages', [
    new Date().toISOString(),
    msg.from,
    msg.fromMe ? 'broker' : 'subscriber',
    msg.body.substring(0, 500), // Cap at 500 chars
    msg.hasMedia ? 'YES' : 'NO',
    'PENDING_REVIEW',
  ]);
});

client.on('auth_failure', (msg) => {
  console.error('❌ WhatsApp auth failed:', msg);
});

client.initialize();
