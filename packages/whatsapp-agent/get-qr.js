/**
 * One-shot QR capture for the Sierra Estates WhatsApp agent (packages/whatsapp-agent).
 * Boots the SAME client (clientId + dataPath) that src/index.js uses in production,
 * saves the first QR code as a PNG, and leaves the process running so scanning it
 * completes pairing — the session it creates under ./wa_sessions is what
 * `npm start` picks up afterward, so there's no need to scan twice.
 *
 * Usage: node get-qr.js [output-path.png]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const outPath = process.argv[2] || path.join(__dirname, 'qr.png');

let chromePath = process.env.PUPPETEER_EXECUTABLE_PATH;
if (!chromePath) {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) { chromePath = c; break; }
  }
}

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'sierra-estates-agent',
    dataPath: path.join(__dirname, 'wa_sessions'),
  }),
  puppeteer: {
    ...(chromePath ? { executablePath: chromePath } : {}),
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800',
    ],
  },
});

let saved = false;
client.on('qr', async (qr) => {
  try {
    await QRCode.toFile(outPath, qr, { width: 512, margin: 2 });
    saved = true;
    console.log('QR_SAVED:' + outPath);
  } catch (err) {
    console.error('QR_SAVE_FAILED:' + err.message);
  }
});

client.on('authenticated', () => console.log('WA_AUTHENTICATED'));
client.on('ready', () => console.log('WA_READY'));
client.on('auth_failure', (m) => console.error('WA_AUTH_FAILURE:' + m));

client.initialize().catch((err) => {
  console.error('CLIENT_INIT_FAILED:' + err.message);
  process.exit(1);
});

process.on('SIGTERM', () => process.exit(0));
