'use strict';
/**
 * inbox.js — inbound WhatsApp consumer for the OpenWA gateway webhooks.
 * ────────────────────────────────────────────────────────────────────────
 * The gateway (OpenWA) supports per-session webhook subscriptions
 * (POST /api/sessions/{id}/webhooks with events like "message.received").
 * The runner exposes POST /api/inbound (X-API-Key guarded) as the delivery
 * target on the same box, and this module is the landing logic:
 *
 *   1. ALWAYS appends the raw delivery to .state/inbox.jsonl (rotating at
 *      ~2 MB to inbox.old.jsonl) — a durable, dependency-free audit trail.
 *   2. If Sheets credentials are configured (BROKER_INBOX_SHEET_ID +
 *      GOOGLE_SERVICE_ACCOUNT_KEY), appends broker-group property chatter
 *      to the "raw_messages" tab — this is what the paused workflow 01
 *      (whatsapp-scraper) used to do with a forbidden second WhatsApp
 *      session. No second session, no ban risk.
 *
 * Group filter: when SCRAPER_GROUP_CHATIDS is set (comma-separated @g.us
 * ids), only those chats reach the sheet; the JSONL log always keeps
 * everything. When unset, all group chats (@g.us) are written.
 *
 * Message-shape tolerant: the gateway's message.received payload wraps the
 * message in different spots depending on version — we probe the common
 * paths and fall back to raw JSON.
 */
const fs = require('fs');
const path = require('path');

const STATE_DIR = process.env.WF_STATE_DIR || path.join(__dirname, '..', '.state');
const INBOX_FILE = path.join(STATE_DIR, 'inbox.jsonl');
const INBOX_OLD = `${INBOX_FILE}.old`;
const MAX_BYTES = 2 * 1024 * 1024;

let sheetsClientCache = null;

function groupChatIds() {
  return (process.env.SCRAPER_GROUP_CHATIDS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
}

/** Best-effort extraction of {chatId, sender, body, ts, isGroup} from a delivery. */
function extractMessage(body) {
  const b = body || {};
  const m = b.message || b.data || b.payload || b;
  const chatId = m.chatId || m.from || (m.chat && m.chat.id) || b.chatId || '';
  const sender = m.sender || m.participant || m.author || (m.from && String(m.from)) || '';
  const text = m.body || m.text || m.caption || (m.message && (m.message.conversation || m.message.extendedTextMessage?.text)) || '';
  const ts = m.timestamp || m.ts || b.timestamp || Date.now();
  const isGroup = String(chatId).endsWith('@g.us');
  return { chatId: String(chatId), sender: String(sender), body: String(text), ts, isGroup };
}

function appendJsonl(file, obj) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  try {
    const sz = fs.existsSync(file) ? fs.statSync(file).size : 0;
    if (sz > MAX_BYTES) fs.renameSync(file, INBOX_OLD);
  } catch (_) { /* best effort rotation */ }
  fs.appendFileSync(file, `${JSON.stringify(obj)}\n`);
}

function sheetsClient() {
  if (sheetsClientCache !== null) return sheetsClientCache;
  const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID || '';
  const SA_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '';
  if (!SHEET_ID || !SA_PATH || !fs.existsSync(SA_PATH)) {
    sheetsClientCache = null;
    return null;
  }
  try {
    const { google } = require('googleapis');
    const creds = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));
    sheetsClientCache = {
      sheetId: SHEET_ID,
      sheets: google.sheets({
        version: 'v4',
        auth: new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }),
      }),
    };
  } catch (err) {
    console.error(`inbox: sheets client init failed: ${err.message}`);
    sheetsClientCache = null;
  }
  return sheetsClientCache;
}

async function appendToSheet(message) {
  const client = sheetsClient();
  if (!client) return false;
  const allow = groupChatIds();
  if (!message.isGroup) return false;
  if (allow.length && !allow.includes(message.chatId)) return false;
  if (!String(message.body).trim()) return false;
  try {
    await client.sheets.spreadsheets.values.append({
      spreadsheetId: client.sheetId,
      range: `'raw_messages'!A:F`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          new Date(Number(message.ts) || Date.now()).toISOString(),
          'whatsapp-inbound',
          message.chatId,
          message.sender,
          String(message.body).substring(0, 400),
          'PENDING',
        ]],
      },
    });
    return true;
  } catch (err) {
    console.error(`inbox: sheet append failed: ${err.message}`);
    return false;
  }
}

/** Handle one webhook delivery. Resolves {stored, sheet} — never throws. */
async function handleInbound(body) {
  const message = extractMessage(body);
  let stored = false;
  let sheet = false;
  try {
    appendJsonl(INBOX_FILE, { receivedAt: new Date().toISOString(), body });
    stored = true;
  } catch (err) {
    console.error(`inbox: jsonl append failed: ${err.message}`);
  }
  try {
    sheet = await appendToSheet(message);
  } catch (err) {
    console.error(`inbox: sheet path failed: ${err.message}`);
  }
  return { stored, sheet, chatId: message.chatId, isGroup: message.isGroup };
}

/** Tail the inbox JSONL for the control API. */
function preview(n = 20) {
  try {
    const raw = fs.readFileSync(INBOX_FILE, 'utf8').trim();
    if (!raw) return [];
    return raw.split('\n').slice(-n).map((line) => {
      try { return JSON.parse(line); } catch (_) { return { raw: line.slice(0, 300) }; }
    });
  } catch (_) {
    return [];
  }
}

module.exports = { handleInbound, preview, extractMessage };
