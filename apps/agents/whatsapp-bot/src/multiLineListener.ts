// apps/agents/whatsapp-bot/src/multiLineListener.ts
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables if available
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '../../../.env'),
  path.resolve(process.cwd(), '../../../.env.local'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import axios from "axios";
import pino from "pino";

const DEFAULT_LINES = ["line_1", "line_2", "line_3", "line_4"] as const;
const rawLines = process.env.WHATSAPP_LINES || "";
const LINES: readonly string[] = rawLines
  ? rawLines.split(",").map((s) => s.trim()).filter(Boolean)
  : DEFAULT_LINES;

const INGEST_WEBHOOK_URL =
  process.env.N8N_W1_WEBHOOK_URL ||
  process.env.N8N_WEBHOOK_URL ||
  "http://localhost:5678/webhook/whatsapp-incoming";

const WEBHOOK_SECRET =
  process.env.N8N_WEBHOOK_SECRET ||
  process.env.N8N_WEBHOOK_KEY ||
  "a7f29b4e18d63c5092e1f4a7c8b3d0e5";

const logger = pino({ level: process.env.LOG_LEVEL || "warn" });

async function startWhatsAppLine(lineId: string) {
  const sessionDir = path.join(process.cwd(), "sessions", lineId);
  fs.mkdirSync(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  console.log(`[${lineId}] Initializing Baileys v${version.join(".")} for line ${lineId}...`);

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: true,
    browser: ["Sierra-Estates", lineId, "3.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log(`\n══════════════════════════════════════════════════════════`);
      console.log(`  [${lineId}] Scan QR code in terminal to link line ${lineId}:`);
      console.log(`══════════════════════════════════════════════════════════\n`);
    }
    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.warn(`[${lineId}] Connection closed (code: ${statusCode}). Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(() => startWhatsAppLine(lineId), 4000);
      } else {
        console.error(`[${lineId}] Session logged out. Please restart to re-scan QR.`);
      }
    } else if (connection === "open") {
      console.log(`[${lineId}] ✅ Connected successfully and listening to WhatsApp groups!`);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      const jid = msg.key.remoteJid || "";
      // فلترة رسائل الجروبات فقط وتجاهل الرسائل الصادرة مننا
      if (!jid.endsWith("@g.us") || msg.key.fromMe || !msg.message) continue;

      const rawText =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        "";

      if (!rawText.trim()) continue;

      const senderJid = msg.key.participant || "";
      const senderPhone = senderJid.split("@")[0];

      try {
        await axios.post(
          INGEST_WEBHOOK_URL,
          {
            line_id: lineId,
            group_jid: jid,
            message_id: msg.key.id,
            sender_phone: senderPhone,
            raw_text: rawText,
            has_media: Boolean(msg.message.imageMessage),
            timestamp: msg.messageTimestamp,
          },
          {
            headers: {
              "Content-Type": "application/json",
              "x-n8n-webhook-secret": WEBHOOK_SECRET,
            },
            timeout: 10000,
          }
        );
        console.log(`[${lineId}] 📨 Forwarded group message from ${senderPhone} to n8n webhook`);
      } catch (err: any) {
        console.error(`[${lineId}] Webhook push failed for ${msg.key.id}:`, err.message);
      }
    }
  });
}

// تشغيل الـ 4 خطوط معاً
console.log(`========================================================`);
console.log(`  Sierra Estates — 4-Line WhatsApp Multi-Listener (Baileys)`);
console.log(`  Lines: ${LINES.join(", ")}`);
console.log(`  Webhook: ${INGEST_WEBHOOK_URL}`);
console.log(`========================================================\n`);

Promise.all(LINES.map((line) => startWhatsAppLine(line))).catch((err) => {
  console.error("Failed to start multi-line listener:", err);
});

export { startWhatsAppLine, LINES };
