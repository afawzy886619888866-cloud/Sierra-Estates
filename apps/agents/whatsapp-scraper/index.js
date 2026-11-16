/**
 * WhatsApp Scraper Bot
 * Monitors WhatsApp broker groups for property listings
 * Forwards messages to the Sierra Estates backend API
 *
 * Usage: node index.js
 * Env vars:
 *   - SE_API_URL: Backend base URL (default: http://localhost:3000)
 *   - SBR_SECRET_KEY: Service auth key (sent as x-sbr-secret-key)
 *   - HEARTBEAT_INTERVAL: Heartbeat period in ms (default: 60000)
 */

require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios  = require('axios');

// Base URL of the backend; endpoint paths are derived from it so they can't
// drift (the old code hardcoded the webhook path then appended the heartbeat
// path to it, producing a doubled, non-existent URL).
const API_BASE = (process.env.SE_API_URL || process.env.API_URL || 'http://localhost:3000').replace(/\/+$/, '');
const INGEST_URL = `${API_BASE}/api/webhooks/whatsapp`;
const HEARTBEAT_URL = `${API_BASE}/api/whatsapp/heartbeat`;
const SECRET = process.env.SBR_SECRET_KEY || '';
const HEARTBEAT_INTERVAL = Number(process.env.HEARTBEAT_INTERVAL || 60000);

const authHeaders = SECRET ? { 'x-sbr-secret-key': SECRET } : {};

const client = new Client({ authStrategy: new LocalAuth() });

client.on('qr', (qr) => {
  console.log('\n--- SCAN QR CODE WITH WHATSAPP ---');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ Sierra Estates WhatsApp Intelligence Bot: Online & Syncing.');
  startHeartbeat();
});

client.on('message', async msg => {
  const chat      = await msg.getChat();
  const groupName = chat.isGroup ? chat.name : 'Direct Message';

  try {
    const response = await axios.post(
      INGEST_URL,
      {
        from:      msg.from,
        Body:      msg.body,
        groupName,
        isGroup:   chat.isGroup,
        timestamp: msg.timestamp,
      },
      { headers: authHeaders, timeout: 15000 }
    );

    // Omni-Channel Conversational Agent Reply
    if (response.data && response.data.replyMessage) {
      await msg.reply(response.data.replyMessage);
    }
  } catch (error) {
    console.error('❌ Failed to forward message:', error.message);
  }

  if (msg.body === '!status') {
    msg.reply('🤖 Sierra Estates Intelligence Bot: Online & Syncing.');
  }
});

function startHeartbeat() {
  setInterval(async () => {
    try {
      await axios.post(
        HEARTBEAT_URL,
        { status: 'alive', timestamp: new Date().toISOString() },
        { headers: authHeaders, timeout: 5000 }
      );
    } catch {
      // Heartbeat failures are non-critical
    }
  }, HEARTBEAT_INTERVAL);
}

client.initialize();
