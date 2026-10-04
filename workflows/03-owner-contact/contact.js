/**
 * Workflow 03: Owner Contact
 * ─────────────────────────────────────────
 * Sends WhatsApp messages to property owners
 * Reads pending contacts from Sheets
 * Marks contacted/error in Sheet
 *
 * Usage:
 *   node workflows/03-owner-contact/contact.js
 *   OR: cron job daily at 10am
 *
 * Env vars required:
 *   - WHATSAPP_API_URL
 *   - WHATSAPP_API_TOKEN
 *   - BROKER_INBOX_SHEET_ID
 *   - GOOGLE_SERVICE_ACCOUNT_KEY
 */

const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');

const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID;
const WA_API_URL = process.env.WHATSAPP_API_URL;
const WA_TOKEN = process.env.WHATSAPP_API_TOKEN;
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

const CONTACT_TEMPLATE = `السلام عليكم ورحمة الله وبركاته

نحن فريق Sierra Estates — متخصصون في تسويق العقارات الفاخرة بالقاهرة الجديدة.

عقارك الذي رأينا يطابق معايير محفظتنا الحصرية.
هل لديك اهتمام بالتعاون معنا لتسويق الوحدة؟

السعر الحالي: ___PRICE___ جنيه
الموقع: ___LOCATION___

تفضلوا بالتواصل معنا مباشرة.`;

async function getOwnerLeads() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'owner_leads'!A:H",
    });

    const rows = response.data.values || [];
    return rows.slice(1).filter(row => row[7] === 'PENDING'); // Filter by status
  } catch (err) {
    console.error('❌ Failed to read owner leads:', err.message);
    return [];
  }
}

async function sendWhatsAppMessage(phoneNumber, text) {
  // V3.0: the OpenWA gateway (paired Sierra Estates device) is the PRIMARY
  // channel. WHATSAPP_API_URL points at the gateway (e.g.
  // http://54.89.162.250:2785) and WHATSAPP_API_TOKEN is the operator key
  // (owa_k1_...). The Meta Cloud API remains the outage fallback when the
  // legacy WHATSAPP_PHONE_NUMBER_ID vars are present.
  try {
    const digits = String(phoneNumber).replace(/[^0-9]/g, '');
    const chatId = digits.endsWith('@c.us') ? digits : `${digits}@c.us`;

    const sessionList = await axios.get(`${WA_API_URL}/api/sessions`, {
      headers: { 'X-API-Key': WA_TOKEN },
      timeout: 8000,
    });
    const sessions = Array.isArray(sessionList.data) ? sessionList.data : [];
    const target = sessions.find(s => s.name === (process.env.OPENWA_SESSION_ID || 'session-default')) || sessions[0];
    const sessionId = process.env.OPENWA_SESSION_ID || target?.id || 'session-default';

    const res = await axios.post(
      `${WA_API_URL}/api/sessions/${sessionId}/messages/send-text`,
      { chatId, text },
      {
        headers: {
          'X-API-Key': WA_TOKEN,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    if (res.status === 200 || res.status === 201) {
      console.log(`✅ Sent via OpenWA gateway to ${chatId}`);
      return true;
    }
    throw new Error(`gateway status ${res.status}`);
  } catch (err) {
    console.warn(`⚠️ Gateway send failed for ${phoneNumber} (${err.message}) — trying Meta fallback`);
  }

  // Meta Cloud API fallback (legacy WHATSAPP_API_URL=graph.facebook.com shape)
  try {
    const response = await axios.post(
      `${WA_API_URL}/send`,
      {
        phone: phoneNumber,
        message: text,
      },
      {
        headers: {
          'Authorization': `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.status === 200;
  } catch (err) {
    console.error(`❌ WhatsApp send failed for ${phoneNumber}:`, err.message);
    return false;
  }
}

async function updateLeadStatus(rowIndex, status) {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'owner_leads'!H${rowIndex + 2}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[status]],
      },
    });
  } catch (err) {
    console.error('❌ Failed to update status:', err.message);
  }
}

async function main() {
  console.log('📞 Starting owner contact workflow...');

  const leads = await getOwnerLeads();
  console.log(`📊 Found ${leads.length} pending leads`);

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const phone = lead[5];
    const price = lead[3];
    const location = lead[4];

    if (!phone || phone === 'No contact') {
      console.log(`⏭️  Skipping ${lead[2]} (no contact)`);
      await updateLeadStatus(i, 'SKIPPED');
      continue;
    }

    const message = CONTACT_TEMPLATE
      .replace('___PRICE___', price)
      .replace('___LOCATION___', location);

    const sent = await sendWhatsAppMessage(phone, message);

    if (sent) {
      console.log(`✅ Message sent to ${phone}`);
      await updateLeadStatus(i, 'CONTACTED');
    } else {
      console.log(`❌ Failed to send to ${phone}`);
      await updateLeadStatus(i, 'ERROR');
    }

    // Rate limit: 1 second between messages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('✅ Owner contact workflow complete');
  process.exit(0);
}

main();
