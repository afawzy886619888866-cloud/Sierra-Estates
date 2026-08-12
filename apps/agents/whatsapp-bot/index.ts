// ⚠️  dotenv MUST be loaded before any module that reads process.env at import time
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import fs from 'fs';
import { WhatsAppBotRouter } from './router';

// Create router AFTER dotenv is loaded so GOOGLE_AI_API_KEY is available
const router = new WhatsAppBotRouter(process.env.GOOGLE_AI_API_KEY);

// Whitelist configuration management
const whitelistPath = path.resolve(__dirname, 'whitelist.json');

interface WhitelistConfig {
  enabled: boolean;
  numbers: string[];
}

function normalizePhone(phoneStr: string): string {
  return phoneStr.replace(/\D/g, '');
}

function loadWhitelist(): WhitelistConfig {
  try {
    if (fs.existsSync(whitelistPath)) {
      return JSON.parse(fs.readFileSync(whitelistPath, 'utf8'));
    }
  } catch (err) {
    console.error('⚠️ Failed to read whitelist.json:', err);
  }
  return { enabled: true, numbers: [] };
}

function saveWhitelist(config: WhitelistConfig) {
  try {
    fs.writeFileSync(whitelistPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('⚠️ Failed to write whitelist.json:', err);
  }
}

const adminPhones = (process.env.ADMIN_PHONES || '')
  .split(',')
  .map(p => normalizePhone(p))
  .filter(Boolean);

// Initialize Firebase Admin SDK for Firestore Lead Verification
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
  try {
    admin.initializeApp();
    console.log('🔥 Firebase Admin SDK initialized in WhatsApp Bot.');
  } catch (err) {
    console.warn('⚠️ Failed to initialize Firebase Admin SDK. Firestore lead check will be bypassed:', err instanceof Error ? err.message : err);
  }
}

const db = admin.apps.length > 0 ? admin.firestore() : null;

async function checkFirestoreLead(phoneStr: string): Promise<boolean> {
  if (!db) return false;
  try {
    const cleanPhone = normalizePhone(phoneStr);
    const leadsRef = db.collection('inquiries');

    // 1. Check exact match
    const q1 = await leadsRef.where('phone', '==', phoneStr).get();
    if (!q1.empty) return true;

    // 2. Check normalized clean phone
    const q2 = await leadsRef.where('phone', '==', cleanPhone).get();
    if (!q2.empty) return true;

    // 3. Check clean phone with leading +
    const q3 = await leadsRef.where('phone', '==', `+${cleanPhone}`).get();
    if (!q3.empty) return true;

    // 4. Check local Egypt format (replace country code 20 with leading 0)
    if (cleanPhone.startsWith('20')) {
      const localPhone = '0' + cleanPhone.slice(2);
      const q4 = await leadsRef.where('phone', '==', localPhone).get();
      if (!q4.empty) return true;
    }

    return false;
  } catch (err) {
    console.error('⚠️ Firestore query error during lead verification:', err);
    return false;
  }
}

// Verify that the Gemini API Key is present
const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  console.error('\n❌ ERROR: GOOGLE_AI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY is not defined in your environment.');
  console.error('Please configure it in H:\\Sierra-Estates-Final\\.env.local and try again.');
  process.exit(1);
}

// Initialize the WhatsApp Web Client
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'whatsapp-bot-client' // Unique session namespace
  }),
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  }
});

// ─────────────────────────────────────────────────────
// QR Code Generation
// Saves qr.png + qr.html so the user can open the HTML
// file in any browser and scan a large, clear QR code.
// ─────────────────────────────────────────────────────
client.on('qr', async (qr: string) => {
  console.log('\n============================================================');
  console.log('🤖 SCAN THIS QR CODE WITH YOUR WHATSAPP APP TO LOG IN THE BOT');
  console.log('============================================================\n');
  qrcode.generate(qr, { small: true });

  // 1. Generate PNG image and save to disk
  const imgPath = path.resolve(__dirname, 'qr.png');
  await QRCode.toFile(imgPath, qr, {
    width: 400,
    margin: 3,
    color: { dark: '#000000', light: '#ffffff' }
  });

  // 2. Write standalone HTML that embeds the PNG via <img src="qr.png">
  const html = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <title>Sierra Estates - WhatsApp Bot Login</title>',
    '  <style>',
    '    * { box-sizing: border-box; margin: 0; padding: 0; }',
    '    body {',
    '      background: linear-gradient(135deg, #0b0f19 0%, #111827 100%);',
    '      color: #f3f4f6;',
    '      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
    '      display: flex; align-items: center; justify-content: center; min-height: 100vh;',
    '    }',
    '    .card {',
    '      background: rgba(255,255,255,0.04);',
    '      border: 1px solid rgba(255,255,255,0.1);',
    '      border-radius: 28px; padding: 48px 40px; text-align: center;',
    '      box-shadow: 0 32px 64px rgba(0,0,0,0.6); max-width: 480px; width: 90%;',
    '    }',
    '    .logo { font-size: 40px; margin-bottom: 12px; }',
    '    h1 {',
    '      font-size: 26px; font-weight: 700;',
    '      background: linear-gradient(135deg, #60a5fa, #818cf8);',
    '      -webkit-background-clip: text; -webkit-text-fill-color: transparent;',
    '      margin-bottom: 6px;',
    '    }',
    '    .sub { color: #6b7280; font-size: 14px; margin-bottom: 28px; }',
    '    .qr-wrap {',
    '      background: #fff; border-radius: 20px; display: inline-block;',
    '      padding: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); margin-bottom: 24px;',
    '    }',
    '    .qr-wrap img { display: block; border-radius: 8px; }',
    '    .instructions { color: #9ca3af; font-size: 14px; line-height: 1.8; }',
    '    .instructions b { color: #e5e7eb; }',
    '    .badge {',
    '      display: inline-flex; align-items: center; gap: 6px; margin-top: 20px;',
    '      font-size: 12px; color: #34d399; background: rgba(52,211,153,0.1);',
    '      border: 1px solid rgba(52,211,153,0.2); padding: 6px 14px; border-radius: 100px;',
    '    }',
    '    .dot {',
    '      width: 6px; height: 6px; border-radius: 50%; background: #34d399;',
    '      animation: pulse 1.5s infinite;',
    '    }',
    '    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }',
    '  </style>',
    '</head>',
    '<body>',
    '  <div class="card">',
    '    <div class="logo">🏠</div>',
    '    <h1>Sierra Estates Bot</h1>',
    '    <p class="sub">WhatsApp Multi-Agent Login</p>',
    '    <div class="qr-wrap">',
    '      <img src="qr.png?t=' + Date.now() + '" width="320" height="320" alt="WhatsApp QR Code">',
    '    </div>',
    '    <div class="instructions">',
    '      Open <b>WhatsApp</b> on your phone<br>',
    '      Go to <b>Settings → Linked Devices → Link a Device</b><br>',
    '      Point your camera at this code to log in',
    '    </div>',
    '    <div class="badge"><div class="dot"></div> Auto-refreshes every 15 seconds</div>',
    '  </div>',
    '  <script>',
    '    setTimeout(function() { window.location.reload(); }, 15000);',
    '  </script>',
    '</body>',
    '</html>'
  ].join('\n');

  const htmlPath = path.resolve(__dirname, 'qr.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');

  console.log('\n🌐 QR CODE PAGE READY! Open this file in your browser:');
  console.log('   ' + htmlPath);
  console.log('   (The page auto-refreshes every 15 seconds)\n');
});

// Client Ready State
client.on('ready', () => {
  console.log('\n============================================================');
  console.log('✅ Sierra Estates Multi-Agent Chat Bot is ONLINE & READY!');
  console.log('============================================================\n');
  console.log('Text the bot directly from any WhatsApp number to interact.');
  console.log('Currently running in direct message mode (will ignore group chats to prevent spam).');
  console.log('------------------------------------------------------------\n');

  // Clean up QR files once logged in
  const htmlPath = path.resolve(__dirname, 'qr.html');
  const pngPath = path.resolve(__dirname, 'qr.png');
  if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
  if (fs.existsSync(pngPath)) fs.unlinkSync(pngPath);
});

// Incoming Message Handler
client.on('message', async (msg: any) => {
  try {
    const chat = await msg.getChat();
    
    // Ignore group chats to prevent spamming WhatsApp groups
    if (chat.isGroup) {
      return;
    }

    const phone = msg.from.replace('@c.us', '').replace('@g.us', '');
    const clientName = chat.name || phone;
    const cleanSender = normalizePhone(phone);
    const isAdmin = adminPhones.includes(cleanSender);

    // Whitelist Admin Commands
    if (isAdmin && msg.body.trim().startsWith('!whitelist')) {
      const parts = msg.body.trim().split(/\s+/);
      const cmd = parts[1]?.toLowerCase();
      const config = loadWhitelist();

      if (cmd === 'on') {
        config.enabled = true;
        saveWhitelist(config);
        await msg.reply('✅ Whitelist mode enabled. The bot will only respond to whitelisted clients.');
        return;
      } else if (cmd === 'off') {
        config.enabled = false;
        saveWhitelist(config);
        await msg.reply('⚠️ Whitelist mode disabled. The bot will respond to all direct messages.');
        return;
      } else if (cmd === 'add') {
        const target = parts.slice(2).join('').trim();
        if (!target) {
          await msg.reply('❌ Please specify a phone number: `!whitelist add <number>`');
          return;
        }
        const cleanTarget = normalizePhone(target);
        if (!config.numbers.includes(cleanTarget)) {
          config.numbers.push(cleanTarget);
          saveWhitelist(config);
          await msg.reply(`✅ Added +${cleanTarget} to the whitelist.`);
        } else {
          await msg.reply(`ℹ️ +${cleanTarget} is already whitelisted.`);
        }
        return;
      } else if (cmd === 'remove') {
        const target = parts.slice(2).join('').trim();
        if (!target) {
          await msg.reply('❌ Please specify a phone number: `!whitelist remove <number>`');
          return;
        }
        const cleanTarget = normalizePhone(target);
        const index = config.numbers.indexOf(cleanTarget);
        if (index !== -1) {
          config.numbers.splice(index, 1);
          saveWhitelist(config);
          await msg.reply(`✅ Removed +${cleanTarget} from the whitelist.`);
        } else {
          await msg.reply(`ℹ️ +${cleanTarget} was not found in the whitelist.`);
        }
        return;
      } else if (cmd === 'list') {
        const listStr = config.numbers.length > 0 
          ? config.numbers.map((n, i) => `${i + 1}. +${n}`).join('\n')
          : 'No numbers in the whitelist.';
        await msg.reply(`📋 *Sierra Whitelist (Mode: ${config.enabled ? 'ON' : 'OFF'})*\n\n${listStr}`);
        return;
      } else if (cmd === 'status') {
        await msg.reply(`ℹ️ Whitelist mode: ${config.enabled ? 'ON' : 'OFF'}\nWhitelisted contacts count: ${config.numbers.length}`);
        return;
      } else {
        await msg.reply('❌ Unknown command. Available commands:\n`!whitelist on`\n`!whitelist off`\n`!whitelist add <number>`\n`!whitelist remove <number>`\n`!whitelist list`\n`!whitelist status`');
        return;
      }
    }

    // Whitelist check for clients
    const config = loadWhitelist();
    let isAllowed = config.numbers.includes(cleanSender);

    if (!isAllowed && !isAdmin && config.enabled) {
      // Check if this contact exists as a lead in Firestore
      const isLead = await checkFirestoreLead(phone);
      if (isLead) {
        console.log(`✅ [Auto-Whitelist] Lead found in Firestore for +${cleanSender}. Adding to whitelist.`);
        config.numbers.push(cleanSender);
        saveWhitelist(config);
        isAllowed = true;
      }
    }

    if (config.enabled && !isAdmin && !isAllowed) {
      console.log(`🔕 [Ignored] Message from non-whitelisted number: +${cleanSender}`);
      return;
    }

    console.log(`\n📥 [Message Received] From: ${clientName} (${phone})`);
    console.log(`   Content: "${msg.body}"`);

    // Prepare incoming message payload for the router
    const incomingMsg = {
      from: msg.from,
      body: msg.body,
      groupName: 'Direct Message',
      timestamp: msg.timestamp,
      messageId: msg.id.id
    };

    console.log(`🤖 [Router] Dispatching message to multi-agent pipeline...`);
    
    // Run the pipeline (Liela -> Sierra -> OpenClaw -> Hermes)
    const reply = await router.handle(incomingMsg);

    // Humanization Layer: Simulate typing indicator and realistic delay
    try {
      await chat.sendStateTyping();
      // Calculate realistic delay (between 2.5 and 7 seconds depending on message length)
      const delayMs = Math.min(7000, Math.max(2500, reply.length * 12));
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await chat.clearState();
    } catch (stateErr) {
      console.warn('⚠️ Could not send typing state:', stateErr instanceof Error ? stateErr.message : stateErr);
    }

    console.log(`📤 [Response Sent] To: ${clientName}`);
    console.log(`   Content: "${reply}"`);

    // Reply to the user on WhatsApp
    await msg.reply(reply);

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ [Error] Failed to process message:`, errorMsg);
    
    try {
      const chat = await msg.getChat();
      await chat.sendStateTyping();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await msg.reply('عذراً، حدث خطأ مؤقت في خوادمنا. سيتواصل معك أحد ممثلينا قريباً.');
    } catch (replyErr) {
      console.error('❌ [Error] Failed to send fallback message:', replyErr);
    }
  }
});

// Initialize connection
console.log('🤖 Starting WhatsApp Bot...');
client.initialize();
