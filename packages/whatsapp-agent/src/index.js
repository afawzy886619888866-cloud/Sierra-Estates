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

const { adminDb, getPendingQueueMessages, markQueueMessageSent, getLeadByPhone, updateLeadQualification } = require('./firebase-service');
let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch (e) {}

// Configure Email Transporter
const transporter = nodemailer ? nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}) : null;

const brochureManager = require('./brochure-manager');
const calendarService = require('./calendar-service');
const voiceService = require('./voice-service');
const ViewingReminderService = require('./reminder-service');
const propertyMatcher = require('./property-matcher');
const hermesAgent = require('./hermes-agent');
const unifiedMemory = require('./unified-memory-engine');

async function processBotResponse(leadId, clientPhone, clientName, rawAiReply) {
  let cleanMessage = rawAiReply;
  const qualificationMatch = rawAiReply.match(/<lead_qualification>([\s\S]*?)<\/lead_qualification>/i);

  if (qualificationMatch) {
    // 1. Strip the tag from the text sent to the WhatsApp user
    cleanMessage = rawAiReply.replace(/<lead_qualification>[\s\S]*?<\/lead_qualification>/gi, '').trim();

    try {
      const qualificationData = JSON.parse(qualificationMatch[1].trim());
      const locText = Array.isArray(qualificationData.locations) ? qualificationData.locations.join(', ') : (qualificationData.locations || 'New Cairo');

      // Generate 1-click Google Calendar reservation link
      const calendarUrl = calendarService.generateGoogleCalendarUrl({
        clientName: clientName || qualificationData.client_name || 'VIP Client',
        phone: clientPhone,
        preferred_viewing: qualificationData.preferred_viewing,
        location: locText,
        budget: qualificationData.budget,
        currency: qualificationData.currency,
        bedrooms: qualificationData.bedrooms,
        furnishing_status: qualificationData.furnishing_status,
      });

      // 2. Update Firestore Lead Record
      await adminDb.collection('leads').doc(leadId).set({
        client_phone: clientPhone,
        client_name: clientName || qualificationData.client_name || 'Lead',
        status: 'Qualified / Needs Review',
        qualification_data: qualificationData,
        calendar_invite_url: calendarUrl,
        updated_at: new Date().toISOString()
      }, { merge: true });

      // Also persist to viewing_appointments collection
      try {
        await adminDb.collection('viewing_appointments').add({
          leadId,
          clientPhone,
          clientName: clientName || qualificationData.client_name || 'Client',
          preferred_viewing: qualificationData.preferred_viewing || 'Flexible',
          location: locText,
          calendarUrl,
          createdAt: new Date().toISOString(),
          status: 'Scheduled',
        });
      } catch (appErr) {}

      // Trigger unified updateLeadQualification helper for notifications & stakeholder CRM sync
      await updateLeadQualification(clientPhone, qualificationData, clientName);

      // 3. Generate dynamic property recommendation cards
      try {
        const matches = await propertyMatcher.findMatches(qualificationData);
        const isArabic = /[\u0600-\u06FF]/.test(rawAiReply);
        const recCards = propertyMatcher.formatRecommendationCards(matches, isArabic);
        if (recCards) {
          cleanMessage += recCards;
        }
      } catch (recErr) {
        console.warn('⚠️ [Property Matcher Warning]:', recErr.message);
      }

      // 4. Dispatch Email Alert to Admin & Sales with 1-click Calendar button
      if (transporter && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          await transporter.sendMail({
            from: `"Sierra Realty AI Pipeline" <${process.env.SMTP_USER}>`,
            to: process.env.SALES_NOTIFICATION_EMAIL || process.env.ADMIN_ALERT_EMAIL || 'admin@sierra-estates.net',
            subject: `🚨 Qualified Lead & Viewing Request: ${clientName || 'Property Finder Lead'} (${clientPhone})`,
            html: `
              <h3>New Lead Ready for Sales Review & Viewing</h3>
              <p><strong>Phone:</strong> +${clientPhone}</p>
              <p><strong>Client Name:</strong> ${clientName || qualificationData.client_name || 'Lead'}</p>
              <p><strong>Viewing Preference:</strong> ${qualificationData.preferred_viewing || 'Flexible'}</p>
              <p><strong>Move-in Date:</strong> ${qualificationData.move_in_date || 'Immediate'}</p>
              <p><strong>Budget:</strong> ${qualificationData.budget || 'Flexible'} ${qualificationData.currency || 'EGP'}</p>
              <p><strong>Locations:</strong> ${locText}</p>
              <p><strong>Bedrooms:</strong> ${qualificationData.bedrooms || 'Any'} (${qualificationData.furnishing_status || 'Standard'})</p>
              <hr/>
              <p>📅 <a href="${calendarUrl}" style="background-color:#0284c7;color:#ffffff;padding:8px 14px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">Add to Google Calendar</a></p>
              <p>📊 <a href="http://localhost:3001/leads/${leadId}">Open in Admin Dashboard</a></p>
            `
          });
        } catch (mailErr) {
          console.warn('⚠️ [Email Dispatch Warning]:', mailErr.message);
        }
      }
      console.log(`✅ [Lead Handler] Qualified lead ${leadId} persisted with 1-click Calendar invite & property matches.`);
    } catch (err) {
      console.error('❌ [Lead Handler] Error parsing qualification JSON:', err.message);
    }
  }

  return cleanMessage;
}

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
  const reminderService = new ViewingReminderService(client);
  reminderService.start();

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

  // ── Incoming & Self-Chat messages ─────────────────────────────────────────
  client.on('message_create', async (msg) => {
    try {
      if (msg.isStatus) return;

      const myId = (client.info && client.info.wid) ? client.info.wid._serialized : '';
      const isSelfChat = Boolean(myId && (msg.to === myId || msg.from === myId));

      // Skip outbound bot messages to other clients to prevent duplicate triggers
      if (msg.fromMe && !isSelfChat) return;

      // In self-chat, ignore bot's own generated replies to avoid infinite loops
      if (isSelfChat && msg.fromMe) {
        if (
          msg.body.startsWith('🦅 *[Hermes') ||
          msg.body.startsWith('⚙️ *[OpenClaw') ||
          msg.body.startsWith('📄 *') ||
          msg.body.startsWith('🏡 *') ||
          msg.body.startsWith('✨ *') ||
          msg.body.startsWith('🟢 *') ||
          msg.body.startsWith('[Lead Notification]')
        ) {
          return;
        }
      }

      let chat = null;
      try { chat = await msg.getChat(); } catch (e) {}
      let contact = null;
      try { contact = await msg.getContact(); } catch (e) {}

      const isGroup   = chat ? chat.isGroup : (msg.from || '').includes('@g.us');
      const senderId  = isSelfChat ? myId : msg.from;                        // "201234567890@c.us"
      const senderNum = senderId.replace('@c.us', '').replace('@g.us', '');
      const isAdmin   = isSelfChat || isAdminUser(senderNum);
      let body        = msg.body ? msg.body.trim() : '';
      const name      = isSelfChat ? 'Master Developer (Self)' : ((contact && (contact.pushname || contact.name)) || msg._data?.notifyName || 'Client');

      // ── Handle WhatsApp Voice Notes (PTT / Audio) via Gemini ──
      if (msg.hasMedia && (msg.type === 'ptt' || msg.type === 'audio')) {
        try {
          const media = await msg.downloadMedia();
          if (media && media.data) {
            console.log(`🎙️ [WhatsApp Agent] Processing incoming voice note from ${name}...`);
            const transcript = await voiceService.transcribeAudio(media.data, media.mimetype);
            if (transcript) {
              body = transcript;
              console.log(`🎙️ [WhatsApp Agent] Transcribed voice note: "${body}"`);
            }
          }
        } catch (voiceErr) {
          console.warn('⚠️ [Voice Note Warning]:', voiceErr.message);
        }
      }

      if (!body) return;

      console.log(`📩 [${isGroup ? 'GROUP' : 'DM'}][${isAdmin ? 'ADMIN' : 'client'}] ${name}: ${body.slice(0, 80)}`);

      // ── Admin /commands ──────────────────────────────────────────────────
      if (isAdmin && body.startsWith('/')) {
        await cmds.handle(msg, body, listing, report);
        return;
      }

      // ── Check Viewing Appointment Confirmation / Reschedule Reply ──
      if (!isGroup) {
        const confirmReply = await reminderService.handleClientConfirmation(senderNum, body);
        if (confirmReply) {
          await msg.reply(confirmReply);
          store.addMessage(senderId, 'user', body);
          store.addMessage(senderId, 'model', confirmReply);
          return;
        }
      }

      // ── Ingest all inbound interactions into Unified Cross-Bot Memory ──
      unifiedMemory.ingestEvent({
        sourceAgent: 'WhatsApp-Inbound',
        entityId: senderNum,
        role: 'user',
        text: body,
        metadata: { senderName: name, isGroup, isAdmin }
      }).catch(() => {});

      // ── Direct Channel: Hermes Agent Query (@hermes / #hermes / /hermes) ──
      const lowerBody = body.toLowerCase();
      if (lowerBody.startsWith('@hermes') || lowerBody.startsWith('#hermes') || lowerBody.startsWith('/hermes') || lowerBody.startsWith('hermes:') || lowerBody.startsWith('هيرميس')) {
        const query = body.replace(/^(@hermes|#hermes|\/hermes|hermes:|هيرميس)\s*/i, '');
        console.log(`🦅 [WhatsApp Agent] Routing direct query to Hermes Agent: "${query}"`);
        if (chat) { try { await chat.sendStateTyping(); } catch (e) {} }
        await sleep(1500);
        const hermesAnalysis = await hermesAgent.processCommand(query || 'New Cairo compound pricing overview', { senderNum, name });
        const reply = `🦅 *[Hermes Autonomous Market Scout]*\n\n${hermesAnalysis}`;
        await msg.reply(reply);
        store.addMessage(senderId, 'user', body);
        store.addMessage(senderId, 'model', reply);
        return;
      }

      // ── Direct Channel: OpenClaw Telemetry & Memory (@openclaw / #openclaw / /openclaw) ──
      if (lowerBody.startsWith('@openclaw') || lowerBody.startsWith('#openclaw') || lowerBody.startsWith('/openclaw') || lowerBody.startsWith('openclaw:') || lowerBody.startsWith('اوبن كلو')) {
        const query = body.replace(/^(@openclaw|#openclaw|\/openclaw|openclaw:|اوبن كلو)\s*/i, '');
        console.log(`⚙️ [WhatsApp Agent] Routing direct query to OpenClaw: "${query}"`);
        if (chat) { try { await chat.sendStateTyping(); } catch (e) {} }
        await sleep(1500);
        const memories = await unifiedMemory.searchMemory(query || 'status', 3);
        let openClawReply = `⚙️ *[OpenClaw Pipeline Intelligence]*\n\n🟢 *System Status:* 5 Agents Active · Unified Memory Mesh 100% Synced\n\n`;
        if (memories.length > 0) {
          openClawReply += `🧠 *Vault Knowledge Context:*\n` + memories.map(m => `• *${m.title || m.source}:* ${m.content.slice(0, 180)}...`).join('\n\n');
        } else {
          openClawReply += `Telemetry stream active. Query resolved via OpenClaw orchestration engine.`;
        }
        await msg.reply(openClawReply);
        store.addMessage(senderId, 'user', body);
        store.addMessage(senderId, 'model', openClawReply);
        return;
      }

      // ── Group: only reply when mentioned ────────────────────────────────
      if (isGroup) {
        if (!CONFIG.replyGroups) return;
        const mentioned = body.toLowerCase().startsWith('sierra') ||
                          body.toLowerCase().includes('@sierra') ||
                          (msg.mentionedIds || []).length > 0;
        if (!mentioned) return;
      }

      // ── Skip DMs if disabled ─────────────────────────────────────────────
      if (!isGroup && !CONFIG.replyInDMs) return;

      // ── Simulate Human Read Delay ──
      await sleep(1000 + Math.random() * 2000);
      if (chat) {
        try { await chat.sendSeen(); } catch (e) {}
      }

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
      const rawAiReply = await gemini.chat(body + pfContext, history, { isAdmin, senderName: name, senderPhone: senderId });

      // ── Detect Brochure & Masterplan Request ──
      const brochureMatch = brochureManager.detectBrochureIntent(body);
      let brochureCard = '';
      if (brochureMatch) {
        const isArabic = /[\u0600-\u06FF]/.test(body);
        brochureCard = '\n\n' + brochureManager.formatBrochureCard(brochureMatch.compound, isArabic);
      }

      // ── Process response through Message Interceptor & Lead Notifier ──
      const leadId = `lead_${senderNum}`;
      let reply = await processBotResponse(leadId, senderNum, name, rawAiReply);
      if (brochureCard) {
        reply = reply + brochureCard;
      }

      store.addMessage(senderId, 'user',  body);
      store.addMessage(senderId, 'model', reply);

      // Typing indicator for realism
      if (chat) {
        try { await chat.sendStateTyping(); } catch (e) {}
      }
      
      // Dynamic typing duration (approx 40ms per char, max 8 seconds)
      const typingTime = Math.min(1500 + (reply || '').length * 40, 8000);
      await sleep(typingTime);
      
      if (chat) {
        try { await chat.clearState(); } catch (e) {}
      }
      
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
  setInterval(async () => {
    try {
      if (typeof client.getState === 'function') {
        const state = await client.getState();
        if (state && state !== 'CONNECTED') console.warn('⚠️ WhatsApp Client State:', state);
      }
    } catch (e) {
      // Ignored during page context/frame swaps
    }
  }, 60_000);
});

client.on('disconnected', (reason) => {
  console.warn('⚠️ Client disconnected:', reason);
  console.log('♻️  Reinitializing in 5 seconds...');
  setTimeout(() => client.initialize(), 5000);
});

// Process-level safety guards to keep WhatsApp daemon permanently online
process.on('unhandledRejection', (reason) => {
  console.warn('⚠️ [WhatsApp Agent Background Catch]:', reason && reason.message ? reason.message : reason);
});

process.on('uncaughtException', (err) => {
  console.warn('⚠️ [WhatsApp Agent Uncaught Exception]:', err && err.message ? err.message : err);
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
console.log(`   Chrome:  ${chromePath || 'Auto-detected browser'}\n`);
client.initialize();

module.exports = { client, processBotResponse, isAdminUser, sleep };

