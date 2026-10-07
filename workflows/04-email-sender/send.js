/**
 * Workflow 04: Email Sender  (hardened 2026-10)
 * ─────────────────────────────────────────
 * Sends campaign emails from the Sheets "email_campaigns" tab via SendGrid,
 * with open/click tracking enabled.
 *
 * CHANGES over the previous revision:
 *   - Variables cell (`email_campaigns!C`) is JSON — a malformed cell used to
 *     crash the whole run mid-batch. Now parsed defensively; malformed rows
 *     are marked ERROR and the batch continues.
 *   - Missing SENDGRID_API_KEY exits 2 ("unconfigured") instead of crashing
 *     at require-time via sgMail.setApiKey(undefined).
 *   - Per-send try/catch already existed; kept. Template miss marks ERROR.
 *
 * Env: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, BROKER_INBOX_SHEET_ID,
 *      GOOGLE_SERVICE_ACCOUNT_KEY
 * Exit: 0 ok · 2 unconfigured · 1 error
 */
const { google } = require('googleapis');
const fs = require('fs');

const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID || '';
const SA_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '';
const SENDGRID_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@sierra-estates.com';

const summary = { pending: 0, sent: 0, failed: 0, malformed: 0 };

function failUnconfigured(msg) {
  console.log(`UNCONFIGURED: ${msg}`);
  process.exit(2);
}

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

const EMAIL_TEMPLATES = {
  welcome: {
    subject: 'Welcome to Sierra Estates – Your Exclusive Real Estate Gateway',
    html: `
      <h2>Welcome to Sierra Estates</h2>
      <p>We're thrilled to have you on board!</p>
      <p>Our curated portfolio of luxury properties in New Cairo awaits your exploration.</p>
      <p><a href="https://sierra-estates.vercel.app/landing">View Exclusive Listings</a></p>
    `,
  },
  property_alert: {
    subject: 'New Property Match: {{property_title}}',
    html: `
      <h2>New Property Match for You</h2>
      <p><strong>{{property_title}}</strong></p>
      <p>Price: {{property_price}} EGP</p>
      <p>Location: {{property_location}}</p>
      <p><a href="https://sierra-estates.vercel.app/listings/{{property_id}}">View Details</a></p>
    `,
  },
  viewing_reminder: {
    subject: 'Your Viewing Appointment Reminder',
    html: `
      <h2>Viewing Appointment Reminder</h2>
      <p>Your scheduled viewing is coming up on {{viewing_date}} at {{viewing_time}}.</p>
      <p><a href="https://sierra-estates.vercel.app/viewing-requests">Manage Appointment</a></p>
    `,
  },
};

async function getCampaignRecipients(sheets) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'email_campaigns'!A:E",
  });
  const rows = response.data.values || [];
  return rows
    .slice(1)
    .map((row, idx) => ({ row, sheetRow: idx + 2 }))
    .filter(({ row }) => String(row[3] || '').trim().toUpperCase() === 'PENDING');
}

async function sendEmail(to, templateKey, variables = {}) {
  const template = EMAIL_TEMPLATES[templateKey];
  if (!template) throw new Error(`template not found: ${templateKey}`);

  let html = template.html;
  let subject = template.subject;
  Object.entries(variables).forEach(([key, value]) => {
    html = html.split(`{{${key}}}`).join(String(value ?? ''));
    subject = subject.split(`{{${key}}}`).join(String(value ?? ''));
  });

  // Lazy require so a missing key never 500s the module itself.
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(SENDGRID_KEY);
  await sgMail.send({
    to,
    from: FROM_EMAIL,
    subject,
    html,
    trackingSettings: {
      clickTracking: { enable: true },
      openTracking: { enable: true },
    },
  });
}

async function updateStatus(sheets, sheetRow, status) {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'email_campaigns'!D${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[status]] },
    });
  } catch (err) {
    console.error(`status write failed row ${sheetRow}: ${err.message}`);
  }
}

async function main() {
  console.log('email-sender: starting');
  if (!SENDGRID_KEY) failUnconfigured('SENDGRID_API_KEY missing');

  const sheets = sheetsClient();
  const campaigns = await getCampaignRecipients(sheets);
  summary.pending = campaigns.length;
  console.log(`pending campaigns: ${campaigns.length}`);

  for (const { row, sheetRow } of campaigns) {
    const email = String(row[0] || '').trim();
    const templateKey = String(row[1] || '').trim();

    let variables = {};
    try {
      variables = row[2] ? JSON.parse(row[2]) : {};
    } catch (_) {
      await updateStatus(sheets, sheetRow, 'ERROR');
      summary.malformed++;
      console.error(`malformed variables JSON row ${sheetRow} — marked ERROR, continuing`);
      continue;
    }

    if (!email) {
      await updateStatus(sheets, sheetRow, 'ERROR');
      summary.malformed++;
      continue;
    }

    try {
      await sendEmail(email, templateKey, variables);
      await updateStatus(sheets, sheetRow, 'SENT');
      summary.sent++;
      console.log(`sent → ${email} (${templateKey})`);
    } catch (err) {
      await updateStatus(sheets, sheetRow, 'ERROR');
      summary.failed++;
      console.error(`send failed for ${email}: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`SUMMARY ${JSON.stringify(summary)}`);
  console.log('email-sender: done');
  process.exit(0);
}

main().catch((err) => {
  console.error(`email-sender FAILED: ${err.message}`);
  process.exit(1);
});
