/**
 * Workflow 04: Email Sender
 * ─────────────────────────────────────────
 * Sends bulk emails to investor stakeholders
 * Reads campaigns from Sheets
 * Tracks open/click rates via SendGrid
 *
 * Usage:
 *   node workflows/04-email-sender/send.js
 *   OR: cron job daily at 8am
 *
 * Env vars required:
 *   - SENDGRID_API_KEY
 *   - SENDGRID_FROM_EMAIL
 *   - BROKER_INBOX_SHEET_ID
 *   - GOOGLE_SERVICE_ACCOUNT_KEY
 */

const { google } = require('googleapis');
const sgMail = require('@sendgrid/mail');
const fs = require('fs');

const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID;
const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@sierra-estates.com';
const SERVICE_ACCOUNT_KEY = JSON.parse(
  fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'utf8')
);

sgMail.setApiKey(SENDGRID_KEY);

const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

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

async function getCampaignRecipients() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'email_campaigns'!A:E",
    });

    const rows = response.data.values || [];
    return rows.slice(1).filter(row => row[3] === 'PENDING'); // Filter by status
  } catch (err) {
    console.error('❌ Failed to read campaigns:', err.message);
    return [];
  }
}

async function sendEmail(to, templateKey, variables = {}) {
  try {
    const template = EMAIL_TEMPLATES[templateKey];
    if (!template) {
      console.error(`❌ Template not found: ${templateKey}`);
      return false;
    }

    let html = template.html;
    let subject = template.subject;

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      html = html.replace(`{{${key}}}`, value);
      subject = subject.replace(`{{${key}}}`, value);
    });

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

    console.log(`✅ Email sent to ${to}`);
    return true;
  } catch (err) {
    console.error(`❌ Email send failed for ${to}:`, err.message);
    return false;
  }
}

async function updateCampaignStatus(rowIndex, status) {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'email_campaigns'!D${rowIndex + 2}`,
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
  console.log('📧 Starting email sender workflow...');

  const campaigns = await getCampaignRecipients();
  console.log(`📊 Found ${campaigns.length} pending campaigns`);

  for (let i = 0; i < campaigns.length; i++) {
    const campaign = campaigns[i];
    const email = campaign[0];
    const templateKey = campaign[1];
    const variables = campaign[2] ? JSON.parse(campaign[2]) : {};

    const sent = await sendEmail(email, templateKey, variables);

    if (sent) {
      await updateCampaignStatus(i, 'SENT');
    } else {
      await updateCampaignStatus(i, 'ERROR');
    }

    // Rate limit: 500ms between emails
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('✅ Email sender workflow complete');
  process.exit(0);
}

main();
