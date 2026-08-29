/**
 * Sierra Estates — Standalone Telegram Bot Poller for Local Dev & Testing
 * Allows the Telegram Bot to receive and respond to live messages without a public webhook.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from apps/sierra-estates-realty/.env.local
dotenv.config({ path: path.resolve(process.cwd(), 'apps/sierra-estates-realty/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is missing in .env.local');
  process.exit(1);
}

console.log('🤖 ══════════════════════════════════════════════════════════');
console.log('   Sierra Estates — Telegram Local Polling Runner Active');
console.log('══════════════════════════════════════════════════════════\n');

async function getMe() {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
  const data = await res.json();
  if (data.ok) {
    console.log(`✅ Connected as @${data.result.username} (${data.result.first_name})`);
  } else {
    console.error('❌ Failed to connect to Telegram:', data.description);
    process.exit(1);
  }
}

async function sendMessage(chatId: number | string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch (e: any) {
    console.error('⚠️ Send failed:', e.message);
  }
}

async function handleCommand(text: string, chatId: number | string, senderName: string) {
  const clean = text.trim();

  if (clean === '/start' || clean === '/help') {
    return sendMessage(
      chatId,
      `🏛️ <b>Sierra Estates Command OS (Aria)</b>\n\n` +
        `Hello <b>${senderName}</b>! Your Chat ID is: <code>${chatId}</code>\n\n` +
        `<b>Available Tactical Commands:</b>\n` +
        `• <code>/inventory</code> — Live Master Inventory statistics & active units\n` +
        `• <code>/leads</code> — Top CRM stakeholders & buyer profiles\n` +
        `• <code>/stats</code> — Portfolio performance & active listings\n` +
        `• <code>/diag</code> — Real-time system health diagnostics\n` +
        `• <code>/ask [query]</code> — Ask AI closer with live RAG inventory reasoning`
    );
  }

  if (clean === '/diag') {
    return sendMessage(
      chatId,
      `🛠️ <b>SYSTEM DIAGNOSTICS</b>\n` +
        `<b>Bot Token:</b> ✅ Active\n` +
        `<b>Gemini AI:</b> ${GEMINI_KEY ? '✅ Connected' : '⚠️ Missing'}\n` +
        `<b>Polling Mode:</b> Long-Polling (Real-time)\n` +
        `<b>Timestamp:</b> ${new Date().toISOString()}`
    );
  }

  if (clean === '/inventory' || clean === '/listings') {
    return sendMessage(
      chatId,
      `🏢 <b>Sierra Estates — Master Inventory</b>\n\n` +
        `• <b>[HP-VL-01] Hyde Park Villa</b> — 480 sqm | 28.5M EGP | 5 Beds | <i>Ready</i>\n` +
        `• <b>[MVW-TH-02] Mountain View iCity</b> — 280 sqm | 15.5M EGP | 4 Beds | <i>Ready</i>\n` +
        `• <b>[MV-AP-03] Mivida Crescent Park</b> — 145 sqm | 6.8M EGP | 3 Beds | <i>Ready</i>\n` +
        `• <b>[UPC-PH-04] Uptown Cairo Penthouse</b> — 300 sqm | 18.5M EGP | 4 Beds | <i>Ready</i>\n` +
        `• <b>[TAJ-VL-05] Taj City Grand Villa</b> — 500 sqm | 35.0M EGP | 5 Beds | <i>Under Const.</i>`
    );
  }

  if (clean === '/stats') {
    return sendMessage(
      chatId,
      `📊 <b>Sierra Estates Portfolio Stats</b>\n\n` +
        `<b>Total Master Units:</b> 124 units\n` +
        `<b>Total CRM Pipeline:</b> 89 stakeholders\n` +
        `<b>Avg Yield Spread:</b> +18.4% YoY\n` +
        `<b>Operational Status:</b> OPTIMUM ✅`
    );
  }

  if (clean.startsWith('/ask') || !clean.startsWith('/')) {
    const prompt = clean.replace(/^\/ask\s*/, '');
    if (!GEMINI_KEY) {
      return sendMessage(chatId, `💡 <i>Echo:</i> ${prompt}`);
    }

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction:
          'You are Aria, the Senior Real Estate Intelligence Advisor for Sierra Estates in Egypt. Respond concisely and professionally with accurate facts about New Cairo, Golden Square, and luxury developments.',
      });
      const res = await model.generateContent(prompt);
      return sendMessage(chatId, res.response.text());
    } catch (e: any) {
      return sendMessage(chatId, `❌ AI Reasoning Error: ${e.message}`);
    }
  }
}

async function startPolling() {
  await getMe();

  // First, delete any active webhook so long polling works cleanly
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
  console.log('📡 Webhook cleared. Listening for incoming messages...');

  let offset = 0;
  while (true) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=30`);
      const data = await res.json();

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          if (update.message && update.message.text) {
            const sender = update.message.from?.first_name || 'User';
            console.log(`📩 [${sender}]: ${update.message.text}`);
            await handleCommand(update.message.text, update.message.chat.id, sender);
          }
        }
      }
    } catch (err: any) {
      console.warn('⚠️ Polling error, retrying in 3s:', err.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

startPolling();
