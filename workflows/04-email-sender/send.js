try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); } catch {}
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
    subject: 'Welcome to Sierra Estates – Curated Luxury Real Estate in New Cairo',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b1120; color: #f8fafc; border-radius: 12px; padding: 36px 32px; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #38bdf8; font-size: 22px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 6px 0;">SIERRA ESTATES</h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">Quiet Luxury & Verified Properties</p>
        </div>
        <div style="background: #0f172a; padding: 24px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 24px;">
          <h2 style="color: #f1f5f9; font-size: 18px; margin-top: 0;">Welcome to Sierra Estates</h2>
          <p style="color: #cbd5e1; line-height: 1.6; font-size: 14px;">We are honored to have you with us. Our private portfolio features vetted, high-value properties across New Cairo's most prestigious compounds.</p>
          <div style="text-align: center; margin-top: 24px;">
            <a href="https://sierra-estates.vercel.app/landing" style="background: #0284c7; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Explore Exclusive Portfolio</a>
          </div>
        </div>
        <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">Sierra Estates Realty · New Cairo, Cairo, Egypt</p>
      </div>
    `,
  },
  property_alert: {
    subject: 'New Property Match: {{property_title}}',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b1120; color: #f8fafc; border-radius: 12px; padding: 36px 32px; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #38bdf8; font-size: 22px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 6px 0;">SIERRA ESTATES</h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">Curated Matching Engine</p>
        </div>
        <div style="background: #0f172a; padding: 24px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 24px;">
          <h2 style="color: #f1f5f9; font-size: 18px; margin-top: 0;">Curated Unit Matching Your Search</h2>
          <p style="color: #38bdf8; font-size: 16px; font-weight: 600; margin-bottom: 12px;">{{property_title}}</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="color: #94a3b8; padding: 6px 0; font-size: 13px;">Location:</td><td style="color: #f8fafc; font-weight: 500; font-size: 13px;">{{property_location}}</td></tr>
            <tr><td style="color: #94a3b8; padding: 6px 0; font-size: 13px;">Investment / Price:</td><td style="color: #34d399; font-weight: 600; font-size: 14px;">{{property_price}} EGP</td></tr>
          </table>
          <div style="text-align: center;">
            <a href="https://sierra-estates.vercel.app/listings/{{property_id}}" style="background: #0284c7; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View Verified Details</a>
          </div>
        </div>
        <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">Sierra Estates Realty · New Cairo, Cairo, Egypt</p>
      </div>
    `,
  },
  viewing_reminder: {
    subject: 'Viewing Appointment Confirmed: {{viewing_date}} at {{viewing_time}}',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b1120; color: #f8fafc; border-radius: 12px; padding: 36px 32px; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #38bdf8; font-size: 22px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 6px 0;">SIERRA ESTATES</h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">Private Viewing Schedule</p>
        </div>
        <div style="background: #0f172a; padding: 24px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 24px;">
          <h2 style="color: #f1f5f9; font-size: 18px; margin-top: 0;">Viewing Appointment Reminder</h2>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Your private viewing has been locked in our schedule:</p>
          <div style="background: #1e293b; padding: 16px; border-radius: 6px; margin: 16px 0; text-align: center;">
            <span style="color: #38bdf8; font-size: 16px; font-weight: 600;">📅 {{viewing_date}} at {{viewing_time}}</span>
          </div>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">Our senior consultant will meet you at the compound gate. Gate pass and location details have been forwarded via WhatsApp.</p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://sierra-estates.vercel.app/viewing-requests" style="background: #0284c7; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Manage Appointment</a>
          </div>
        </div>
        <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">Sierra Estates Realty · New Cairo, Cairo, Egypt</p>
      </div>
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
