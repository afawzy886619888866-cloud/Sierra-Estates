/**
 * Workflow 03: Owner Contact  (rewired 2026-10)
 * ─────────────────────────────────────────
 * Sends WhatsApp introduction messages to property owners read from the
 * Google Sheets "owner_leads" tab, through the project's own OpenWA gateway
 * (the same session the admin Outbox + lead flows use).
 *
 * FIXES over the previous revision (it could never have delivered a message):
 *   - Endpoint was `POST {WA_API_URL}/send` with `{phone, message}` and
 *     `Authorization: Bearer` — no such route exists on the OpenWA gateway.
 *     Now: POST {WHATSAPP_API_URL}/api/sessions/{UUID}/messages/send-text
 *          body {chatId, text}, auth header X-API-Key.
 *   - Column mapping was wrong: owner_leads is Timestamp, Source, Title,
 *     Price, Location, Beds/Baths, Contact, URL, Status → contact is col G
 *     (index 6) not index 5, and status lives in col I (the old code filtered
 *     on col H = URL, which never says 'PENDING').
 *   - Phone → chatId normalization (+20/00XX/01x local forms → @c.us).
 *   - Missing credentials exit 2 ("unconfigured") instead of crashing.
 *   - 3–6 s jittered throttle (1 s flat is bot-flag territory), permanent-4xx
 *     aborts the batch so a bad key doesn't hammer the gateway.
 *   - Purpose 'owner-negotiation' → exempt from the Cairo Plaza notice per
 *     announcement/DISCLAIMER-POLICY.md (same decision table as the app
 *     drain worker); the policy helper still rides along for future
 *     client-facing workflows.
 *
 * Env: WHATSAPP_API_URL (127.0.0.1:2785 on the gateway box), WHATSAPP_API_TOKEN,
 *      OPENWA_SESSION_ID, OPENWA_ADMIN_API_KEY, BROKER_INBOX_SHEET_ID,
 *      GOOGLE_SERVICE_ACCOUNT_KEY, WF_OWNER_CONTACT_DAILY_CAP (default 40)
 * Exit: 0 ok · 2 unconfigured · 1 error
 */
const { google } = require('googleapis');
const fs = require('fs');
const { GatewayClient } = require('../lib/gateway-client');
const { enforceOutreachNotice } = require('../lib/notice');

const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID || '';
const SA_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '';
const DAILY_CAP = parseInt(process.env.WF_OWNER_CONTACT_DAILY_CAP || '40', 10);
const DRY_RUN = /^(1|true|yes)$/i.test(process.env.WF_DRY_RUN || '');

const summary = { pending: 0, sent: 0, failed: 0, skipped: 0, capped: 0, dryRun: DRY_RUN };

function failUnconfigured(msg) {
  console.log(`UNCONFIGURED: ${msg}`);
  process.exit(2);
}

const CONTACT_TEMPLATE = `السلام عليكم ورحمة الله وبركاته

نحن فريق Sierra Estates — متخصصون في تسويق العقارات الفاخرة بالقاهرة الجديدة.

عقارك الذي رأيناه يطابق معايير محفظتنا الحصرية.
هل لديكم اهتمام بالتعاون معنا لتسويق الوحدة؟

السعر الحالي: ___PRICE___ جنيه
الموقع: ___LOCATION___

تفضلوا بالتواصل معنا مباشرة.`;

function sheetsClient() {
  if (!SHEET_ID) failUnconfigured('BROKER_INBOX_SHEET_ID missing');
  if (!SA_PATH || !fs.existsSync(SA_PATH)) failUnconfigured('GOOGLE_SERVICE_ACCOUNT_KEY missing or file not found');
  const creds = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));
  return google.sheets({
    version: 'v4',
    auth: new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    }),
  });
}

/** Reads owner_leads rows; pending = col I empty or 'PENDING'. */
async function getOwnerLeads(sheets) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'owner_leads'!A:I",
  });
  const rows = response.data.values || [];
  return rows
    .slice(1)
    .map((row, idx) => ({ row, sheetRow: idx + 2 })) // 1-based + header offset
    .filter(({ row }) => {
      const status = String(row[8] || '').trim().toUpperCase();
      return status === '' || status === 'PENDING';
    });
}

async function updateStatus(sheets, sheetRow, status) {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'owner_leads'!I${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[status]] },
    });
  } catch (err) {
    console.error(`status write failed row ${sheetRow}: ${err.message}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`owner-contact: starting (dryRun=${DRY_RUN})`);
  if (!process.env.WHATSAPP_API_TOKEN && !process.env.WHATSAPP_API_KEY) {
    failUnconfigured('WHATSAPP_API_TOKEN (operator key) missing');
  }
  if (!process.env.OPENWA_SESSION_ID) failUnconfigured('OPENWA_SESSION_ID missing');

  const sheets = sheetsClient();
  const gw = new GatewayClient();

  // Pre-flight: never start a batch on an unhealthy session.
  const st = await gw.status();
  if (st.status !== 'ready') {
    throw new Error(`gateway session not ready (${st.status}) — aborting batch`);
  }
  console.log(`gateway ready: ${st.phone || '?'} push=${st.pushName || '?'}`);

  const leads = await getOwnerLeads(sheets);
  summary.pending = leads.length;
  console.log(`pending owner leads: ${leads.length}`);

  for (const { row, sheetRow } of leads) {
    if (summary.sent >= DAILY_CAP) {
      summary.capped = leads.length - summary.sent - summary.skipped - summary.failed;
      console.log(`daily cap ${DAILY_CAP} reached — remaining rows stay PENDING`);
      break;
    }

    const rawPhone = String(row[6] || '').trim();
    const price = String(row[3] || '').trim();
    const location = String(row[4] || '').trim();
    const title = String(row[2] || '').slice(0, 60);

    if (!rawPhone || rawPhone === 'No contact') {
      await updateStatus(sheets, sheetRow, 'SKIPPED');
      summary.skipped++;
      continue;
    }

    const text = enforceOutreachNotice(
      'owner-negotiation',
      CONTACT_TEMPLATE.replace('___PRICE___', price || 'غير معلن').replace('___LOCATION___', location || '—')
    );

    if (DRY_RUN) {
      console.log(`[dry-run] would send to ${rawPhone} (${title})`);
      summary.sent++; // counted as "would-send" for telemetry shape
      continue;
    }

    try {
      await gw.sendText(rawPhone, text, { retries: 2 });
      await updateStatus(sheets, sheetRow, 'CONTACTED');
      summary.sent++;
      console.log(`sent → ${rawPhone} (${title})`);
    } catch (err) {
      if (err.permanent || err.httpStatus === 401 || err.httpStatus === 403) {
        await updateStatus(sheets, sheetRow, 'ERROR');
        summary.failed++;
        console.error(`permanent send failure (${err.message}) — aborting batch to protect the session`);
        break;
      }
      await updateStatus(sheets, sheetRow, 'ERROR');
      summary.failed++;
      console.error(`send failed for ${rawPhone}: ${err.message}`);
    }

    // jittered 3–6 s pacing
    await sleep(3000 + Math.floor(Math.random() * 3000));
  }

  console.log(`SUMMARY ${JSON.stringify(summary)}`);
  console.log('owner-contact: done');
  process.exit(0);
}

main().catch((err) => {
  console.error(`owner-contact FAILED: ${err.message}`);
  process.exit(1);
});
