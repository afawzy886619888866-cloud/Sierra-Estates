/**
 * Sierra Estates WhatsApp AI Agent
 * Library: whatsapp-web.js (replaces OpenWA — works with Chrome v131+)
 * AI: Google Gemini
 *
 * Capabilities:
 *  ✅ QR code in terminal — scan with your dedicated phone
 *  ✅ AI replies to clients in Arabic or English (Gemini)
 *  ✅ Join & interact in WhatsApp groups
 *  ✅ Admin /commands from your whitelisted number
 *  ✅ Session saved — no re-scan needed on restart
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GeminiAgent }     = require('./gemini-agent');
const { CommandHandler }  = require('./command-handler');
const { ListingManager }  = require('./listing-manager');
const { ReportGenerator } = require('./report-generator');
const { SessionStore }    = require('./session-store');

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const CONFIG = {
  adminNumber:  process.env.WA_ADMIN_NUMBER   || '',   // e.g. "201234567890"
  teamNumbers: (process.env.WA_TEAM_NUMBERS   || '').split(',').filter(Boolean),
  replyInDMs:   process.env.WA_REPLY_DMS    !== 'false',
  replyGroups:  process.env.WA_REPLY_GROUPS !== 'false',
};

// ─── CLIENT ───────────────────────────────────────────────────────────────────
const fs = require('fs');
let chromePath = process.env.PUPPETEER_EXECUTABLE_PATH;
if (!chromePath) {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      chromePath = c;
      break;
    }
  }
}

const client = new Client({
  authStrategy: new LocalAuth({
    clientId:   'sierra-estates-agent',
    dataPath:   './wa_sessions',
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
    ],
  },
});

// ─── BOOT EVENTS ──────────────────────────────────────────────────────────────
client.on('qr', (qr) => {
  console.log('\n\n📱 ══════════════════════════════════════════════');
  console.log('   Scan this QR with your DEDICATED WhatsApp:');
  console.log('   Settings → Linked Devices → Link a Device');
  console.log('══════════════════════════════════════════════\n');
  console.log('RAW_QR:' + qr);
  qrcode.generate(qr, { small: true });
  console.log('\n══════════════════════════════════════════════\n');
});

client.on('loading_screen', (percent, message) => {
  process.stdout.write(`\r⏳ Loading WhatsApp... ${percent}% — ${message}   `);
});

client.on('authenticated', () => {
  console.log('\n✅ WhatsApp authenticated! Session saved.');
});

client.on('auth_failure', (msg) => {
  console.error('❌ Authentication failed:', msg);
});

client.on('ready', async () => {
  console.log('\n🟢 ════════════════════════════════════════════════');
  console.log('   Sierra Estates WhatsApp Agent is LIVE!');
  console.log('   AI Model: Gemini 2.0 Flash');
  console.log(`   Admin: ${CONFIG.adminNumber || '(not set — add WA_ADMIN_NUMBER to .env)'}`);
  console.log('════════════════════════════════════════════════\n');

  const gemini  = new GeminiAgent();
  const cmds    = new CommandHandler(client, gemini);
  const listing = new ListingManager();
  const report  = new ReportGenerator(client);
  const store   = new SessionStore();

  const { getPendingQueueMessages, markQueueMessageSent, getLeadByPhone } = require('./firebase-service');

  // ── Automated Property Finder & CRM Queue Dispatcher ──────────────────────────
  console.log('⚡ [WhatsApp Agent] Automated Property Finder Outreach Queue Worker started.');
  setInterval(async () => {
    try {
      const pendingItems = await getPendingQueueMessages();
      for (const item of pendingItems) {
        let cleanPhone = String(item.phone || '').replace(/\D/g, '');
        if (cleanPhone.startsWith('0') && cleanPhone.length === 11) cleanPhone = '2' + cleanPhone;
        if (!cleanPhone.startsWith('20') && cleanPhone.length === 10) cleanPhone = '20' + cleanPhone;

        const chatId = `${cleanPhone}@c.us`;
        console.log(`📤 [PF Outreach] Auto-contacting ${item.clientName || 'Client'} (${chatId}) for ref: ${item.propertyRef || 'N/A'}`);

        await sleep(1500 + Math.random() * 2000);
        await client.sendMessage(chatId, item.text);
        await markQueueMessageSent(item.id);

        store.addMessage(chatId, 'model', item.text);
      }
    } catch (err) {
      // Quiet background polling
    }
  }, 7000);

  // ── Incoming messages ──────────────────────────────────────────────────────
  client.on('message', async (msg) => {
    try {
      if (!msg.body || msg.isStatus) return;

      const chat     = await msg.getChat();
      const contact  = await msg.getContact();
      const isGroup  = chat.isGroup;
      const senderId = msg.from;                        // "201234567890@c.us"
      const senderNum = senderId.replace('@c.us', '').replace('@g.us', '');
      const isAdmin  = isAdminUser(senderNum);
      const body     = msg.body.trim();
      const name     = contact.pushname || contact.name || 'Client';

      console.log(`📩 [${isGroup ? 'GROUP' : 'DM'}][${isAdmin ? 'ADMIN' : 'client'}] ${name}: ${body.slice(0, 80)}`);

      // ── Admin /commands ──────────────────────────────────────────────────
      if (isAdmin && body.startsWith('/')) {
        await cmds.handle(msg, body, listing, report);
        return;
      }

      // ── Group: only reply when mentioned ────────────────────────────────
      if (isGroup) {
        const mentioned = body.toLowerCase().startsWith('sierra') ||
                          body.toLowerCase().includes('@sierra') ||
                          (msg.mentionedIds || []).length > 0;
        if (!mentioned) return;
      }

      // ── Skip DMs if disabled ─────────────────────────────────────────────
      if (!isGroup && !CONFIG.replyInDMs) return;

      // ── Simulate Human Read Delay ──
      await sleep(1000 + Math.random() * 2000);
      try { await chat.sendSeen(); } catch (e) {}

      // ── Check if client is a Property Finder lead with listing context ──
      let pfContext = '';
      try {
        const lead = await getLeadByPhone(senderNum);
        if (lead && lead.notes) {
          pfContext = `\n[CLIENT PROPERTY FINDER CONTEXT: Client previously inquired via Property Finder: "${lead.notes}" — provide precise pricing, payment plans, and offer private viewing booking.]`;
        }
      } catch (e) {}

      // ── Gemini AI reply ───────────────────────────────────────────────────
      const history = store.getHistory(senderId);
      const reply   = await gemini.chat(body + pfContext, history, { isAdmin, senderName: name, senderPhone: senderId });

      store.addMessage(senderId, 'user',  body);
      store.addMessage(senderId, 'model', reply);

      // Typing indicator for realism
      await chat.sendStateTyping();
      
      // Dynamic typing duration (approx 40ms per char, max 8 seconds)
      const typingTime = Math.min(1500 + reply.length * 40, 8000);
      await sleep(typingTime);
      
      try { await chat.clearState(); } catch (e) {}
      
      // Add minor random delay before hitting send
      await sleep(Math.random() * 1000);
      await msg.reply(reply);

    } catch (err) {
      console.error('❌ Message error:', err.message);
    }
  });

  // ── Group join ────────────────────────────────────────────────────────────
  client.on('group_join', async (notif) => {
    const chat = await notif.getChat();
    console.log(`✅ Added to group: ${chat.name}`);
    await sleep(2000);
    await client.sendMessage(
      chat.id._serialized,
      `👋 Hello ${chat.name}!\n\nI'm Sierra's AI Assistant. Mention me with *Sierra* and I'll help with:\n\n🏠 Property info & pricing\n📊 Market insights\n📋 Availability & viewings\n\nType /help for admin commands.`
    );
  });

  // ── Heartbeat ─────────────────────────────────────────────────────────────
  setInterval(() => {
    const state = client.getState();
    if (state && state !== 'CONNECTED') console.warn('⚠️ State:', state);
  }, 60_000);
});

client.on('disconnected', (reason) => {
  console.warn('⚠️ Client disconnected:', reason);
  console.log('♻️  Reinitializing in 5 seconds...');
  setTimeout(() => client.initialize(), 5000);
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function isAdminUser(num) {
  const admins = [CONFIG.adminNumber, ...CONFIG.teamNumbers].filter(Boolean);
  return admins.some(a => num.includes(a.replace(/\D/g, '').slice(-9)));
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── START ────────────────────────────────────────────────────────────────────
console.log('🚀 Starting Sierra WhatsApp Agent...');
console.log('   Library: whatsapp-web.js');
console.log('   Chrome:  C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe\n');
client.initialize();
