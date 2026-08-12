/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Sierra Estates — WhatsApp Scraper (Baileys)
 *  File: SE/infra/whatsapp-scraper/src/index.js
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Connects to WhatsApp via Baileys library (no official API needed — uses
 *  the same QR-code auth as WhatsApp Web). Listens for incoming messages,
 *  forwards them to n8n for workflow processing, and sends bot replies.
 *
 *  🔐 Auth flow:
 *    1. On first run, prints a QR code to the terminal.
 *    2. Scan with WhatsApp → phone → "Linked Devices" → "Link a device".
 *    3. Session is saved to ./auth/ — survives restarts (no re-scan).
 *    4. If session expires, a new QR is generated automatically.
 *
 *  📨 Message flow:
 *    Client sends WhatsApp message
 *      → Baileys receives it here
 *      → This script forwards to n8n webhook (N8N_WEBHOOK_URL)
 *      → n8n runs workflow (Gemini matching, Firestore writes)
 *      → n8n returns bot reply text
 *      → This script sends reply back to client via WhatsApp
 *
 *  🚀 Run:
 *    npm install
 *    npm start          # normal mode
 *    npm run qr         # QR-only mode (just print QR + exit)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import baileysPkg, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
const makeWASocket = baileysPkg.default || baileysPkg.makeWASocket || baileysPkg;
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import fetch from 'node-fetch';
import admin from 'firebase-admin';
import pino from 'pino';

// ── Configuration from env vars ──
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://n8n:5678/webhook/whatsapp-incoming';
const BOT_NAME = process.env.BOT_NAME || 'Sierra Estates';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const QR_ONLY = process.argv.includes('--qr-only');

const logger = pino({ level: LOG_LEVEL, name: 'sierra-wa' });

/* ──────────────────────────────────────────────────────────────────────────
 *  Firebase Admin Init (for direct Firestore writes from this container)
 * ────────────────────────────────────────────────────────────────────────── */

let firestore = null;
try {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    firestore = admin.firestore();
    logger.info('Firebase Admin initialized successfully');
  } else {
    logger.warn('Firebase Admin not configured — Firestore writes disabled (n8n will handle them)');
  }
} catch (err) {
  logger.error({ err: err.message }, 'Firebase Admin init failed');
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Message dedup cache (Baileys can deliver the same message twice on reconnect)
 * ────────────────────────────────────────────────────────────────────────── */
const processedMessages = new Set();
const MAX_CACHE_SIZE = 1000;

function isDuplicate(messageId) {
  if (processedMessages.has(messageId)) return true;
  processedMessages.add(messageId);
  // Prevent memory leak — drop oldest entries beyond max size
  if (processedMessages.size > MAX_CACHE_SIZE) {
    const first = processedMessages.values().next().value;
    processedMessages.delete(first);
  }
  return false;
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Forward message to n8n webhook + get bot reply
 * ────────────────────────────────────────────────────────────────────────── */

async function forwardToN8n(payload) {
  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.error({ status: res.status }, 'n8n webhook returned non-OK');
      return null;
    }
    const data = await res.json();
    return data; // { reply: "bot reply text", requestId: "...", ... }
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to forward to n8n');
    return null;
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Create / update client + request in Firestore directly
 *  (fallback if n8n is down — ensures no lead is lost)
 * ────────────────────────────────────────────────────────────────────────── */

async function writeClientToFirestore(phone, name) {
  if (!firestore) return null;
  try {
    // Check if client already exists (dedup by phone)
    const existing = await firestore.collection('clients').where('phone_number', '==', phone).limit(1).get();
    if (!existing.empty) {
      const doc = existing.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    // Create new client
    const ref = await firestore.collection('clients').add({
      name: name || phone,
      phone_number: phone,
      lead_source: 'whatsapp_bot',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { id: ref.id, name: name || phone, phone_number: phone };
  } catch (err) {
    logger.error({ err: err.message }, 'Firestore client write failed');
    return null;
  }
}

async function createRequestInFirestore(clientId, messageText) {
  if (!firestore) return null;
  try {
    const ref = await firestore.collection('requests').add({
      client_id: clientId,
      status: 'bot_handling',
      bot_chat_history: [{
        sender: 'client',
        text: messageText,
        timestamp: new Date().toISOString(),
      }],
      client_needs: {},
      matched_listings: [],
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  } catch (err) {
    logger.error({ err: err.message }, 'Firestore request create failed');
    return null;
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 *  MAIN — Baileys socket init + connection logic
 * ────────────────────────────────────────────────────────────────────────── */

async function startSock() {
  // Auth state persisted to ./auth/ (mapped to docker volume)
  const { state, saveCreds } = await useMultiFileAuthState('./auth');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // we use qrcode-terminal for prettier output
    logger: pino({ level: 'warn' }), // Baileys internal logger — quiet
    browser: [BOT_NAME, 'Chrome', '1.0.0'],
    markOnlineOnConnect: false, // don't force phone online
  });

  // ── QR code handler ──
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Print QR code when received
    if (qr) {
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.info('Scan this QR code with WhatsApp:');
      logger.info('  Phone → Settings → Linked Devices → Link a device');
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      qrcode.generate(qr, { small: true });
      if (QR_ONLY) process.exit(0);
    }

    // ── Connection state changes ──
    if (connection === 'open') {
      logger.info('✅ WhatsApp connected successfully!');
      logger.info({ botName: BOT_NAME }, 'Sierra Estates bot is live');
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error instanceof Boom &&
        lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;

      logger.warn(
        { reason: lastDisconnect?.error?.message, shouldReconnect },
        'Connection closed'
      );

      if (shouldReconnect) {
        // Reconnect after 2s delay (exponential backoff could be added)
        setTimeout(() => startSock(), 2000);
      } else {
        // Logged out — delete auth state so user can re-scan QR
        logger.error('Logged out. Delete ./auth/ folder and restart to re-scan QR.');
        process.exit(1);
      }
    }
  });

  // ── Save credentials on update (so session persists) ──
  sock.ev.on('creds.update', saveCreds);

  // ── Incoming message handler ──
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // Only handle real-time messages, not history sync
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        // Skip if no message content or from status broadcast
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;

        const messageId = msg.key.id;
        const fromMe = msg.key.fromMe;
        const jid = msg.key.remoteJid; // e.g. "201001234567@s.whatsapp.net"

        // Skip own messages (bot replies)
        if (fromMe) continue;

        // Dedup
        if (isDuplicate(messageId)) {
          logger.debug({ messageId }, 'Duplicate message skipped');
          continue;
        }

        // Extract text (works for conversation, extendedText, image captions)
        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          msg.message.videoMessage?.caption ||
          '';

        if (!text) {
          logger.debug({ messageId }, 'Non-text message skipped');
          continue;
        }

        // Extract phone number from JID (strip @s.whatsapp.net)
        const phone = '+' + jid.split('@')[0];
        const senderName = msg.pushName || phone;

        logger.info(
          { phone, senderName, text: text.substring(0, 80) },
          '📥 Incoming WhatsApp message'
        );

        // ── Forward to n8n for workflow processing ──
        const n8nResponse = await forwardToN8n({
          messageId,
          phone,
          senderName,
          text,
          timestamp: new Date().toISOString(),
          jid,
        });

        // ── Fallback: write directly to Firestore if n8n is down ──
        let requestId = n8nResponse?.requestId;
        if (!n8nResponse) {
          logger.warn('n8n unavailable — writing directly to Firestore');
          const client = await writeClientToFirestore(phone, senderName);
          if (client) {
            const request = await createRequestInFirestore(client.id, text);
            requestId = request?.id;
          }
        }

        // ── Send bot reply (if n8n returned one) ──
        if (n8nResponse?.reply) {
          await sock.sendMessage(jid, { text: n8nResponse.reply });
          logger.info({ phone, replyLength: n8nResponse.reply.length }, '📤 Bot reply sent');
        } else if (!n8nResponse) {
          // n8n down + no fallback reply — send generic acknowledgment
          await sock.sendMessage(jid, {
            text: "👋 Hello! I'm the Sierra Estates assistant. I've received your message and our team will get back to you shortly.",
          });
        }
      } catch (err) {
        logger.error({ err: err.message, messageId: msg.key.id }, 'Message handler error');
      }
    }
  });

  return sock;
}

/* ──────────────────────────────────────────────────────────────────────────
 *  GRACEFUL SHUTDOWN
 * ────────────────────────────────────────────────────────────────────────── */

let sock;
process.on('SIGINT', async () => {
  logger.info('SIGINT received — shutting down gracefully...');
  if (sock) await sock.logout();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down gracefully...');
  if (sock) await sock.logout();
  process.exit(0);
});

/* ──────────────────────────────────────────────────────────────────────────
 *  START
 * ────────────────────────────────────────────────────────────────────────── */

logger.info({ botName: BOT_NAME, n8nUrl: N8N_WEBHOOK_URL }, 'Starting Sierra Estates WhatsApp bot...');
sock = await startSock();
