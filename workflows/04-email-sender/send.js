'use strict';

const path = require('path');
const { loadWorkflowEnv, createSheetsClient } = require('../lib/google-sheets');
loadWorkflowEnv(path.join(__dirname, '..'));

/**
 * Workflow 04: Email Sender  (hardened 2026-11)
 * ───────────────────────────────────────────────────────────────────────────
 * Dispatches pending campaign emails from Supabase `public.email_campaigns`
 * (primary system of record) and/or the optional Google Sheets
 * `email_campaigns` tab when Service Account credentials are provisioned.
 *
 * Supported live transports (checked in priority order):
 *   1. Resend REST API         (RESEND_API_KEY)
 *   2. SendGrid API            (SENDGRID_API_KEY)
 *   3. SMTP via Nodemailer     (SMTP_HOST + SMTP_USER + SMTP_PASS)
 *   4. Apps Script MailApp     (EMAIL_APPS_SCRIPT_URL | APPS_SCRIPT_MAIL_URL)
 *
 * Placeholder keys (e.g. SG.dev_*, re_..., changeme) fail closed with exit 2.
 * Exit: 0 ok · 2 unconfigured · 1 error
 */

const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID || '';
const SITE_URL = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://sierra-estates.net').replace(/\/+$/, '');
const FROM_EMAIL = process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL || 'alerts@sierra-estates.net';
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const summary = {
  pending: 0,
  sent: 0,
  failed: 0,
  malformed: 0,
  transport: null,
  source: 'none',
};

function failUnconfigured(msg) {
  console.log(`UNCONFIGURED: ${msg}`);
  process.exit(2);
}

/**
 * Returns true if a credential value is missing, a known dev placeholder,
 * or too short to be a real API token.
 */
function isPlaceholderKey(val) {
  const s = String(val || '').trim();
  if (!s || s.length < 16) return true;
  if (/^(SG\.dev_|re_\.\.\.|<|your[_-]|changeme|placeholder|example|test[_-]|dummy|xxx)/i.test(s)) {
    return true;
  }
  if (/(\.\.\.|_dev_|placeholder|your_|changeme)/i.test(s)) {
    return true;
  }
  return false;
}

/**
 * Resolve the first genuinely configured email transport from env.
 * Returns null if no live transport is configured.
 */
function resolveEmailTransport(env = process.env) {
  if (!isPlaceholderKey(env.RESEND_API_KEY)) {
    return { kind: 'resend', apiKey: String(env.RESEND_API_KEY).trim() };
  }
  if (!isPlaceholderKey(env.SENDGRID_API_KEY)) {
    return { kind: 'sendgrid', apiKey: String(env.SENDGRID_API_KEY).trim() };
  }
  const smtpHost = String(env.SMTP_HOST || '').trim();
  const smtpUser = String(env.SMTP_USER || '').trim();
  const smtpPass = String(env.SMTP_PASS || '').trim();
  if (smtpHost && smtpUser && smtpPass && !isPlaceholderKey(smtpPass)) {
    return {
      kind: 'smtp',
      host: smtpHost,
      port: parseInt(env.SMTP_PORT || '587', 10) || 587,
      secure: String(env.SMTP_SECURE || '').toLowerCase() === 'true',
      user: smtpUser,
      pass: smtpPass,
    };
  }
  const relayUrl = String(env.EMAIL_APPS_SCRIPT_URL || env.APPS_SCRIPT_MAIL_URL || '').trim();
  if (/^https?:\/\//i.test(relayUrl) && !/mock|example|placeholder/i.test(relayUrl)) {
    return {
      kind: 'apps-script-relay',
      url: relayUrl,
      secret: String(env.EMAIL_APPS_SCRIPT_SECRET || env.WF_SHEET_WRITE_SECRET || '').trim(),
    };
  }
  return null;
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
            <a href="${SITE_URL}/landing" style="background: #0284c7; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Explore Exclusive Portfolio</a>
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
            <a href="${SITE_URL}/listings/{{property_id}}" style="background: #0284c7; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View Verified Details</a>
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
            <a href="${SITE_URL}/viewing-requests" style="background: #0284c7; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Manage Appointment</a>
          </div>
        </div>
        <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">Sierra Estates Realty · New Cairo, Cairo, Egypt</p>
      </div>
    `,
  },
};

function renderTemplate(templateKey, variables = {}, siteUrl = SITE_URL) {
  const template = EMAIL_TEMPLATES[templateKey];
  if (!template) throw new Error(`template not found: ${templateKey}`);

  let html = template.html;
  let subject = template.subject;
  if (siteUrl && siteUrl !== SITE_URL) {
    html = html.split(SITE_URL).join(String(siteUrl).replace(/\/+$/, ''));
  }
  Object.entries(variables || {}).forEach(([key, value]) => {
    html = html.split(`{{${key}}}`).join(String(value ?? ''));
    subject = subject.split(`{{${key}}}`).join(String(value ?? ''));
  });
  return { subject, html };
}

async function sendEmail(to, templateKey, variables = {}, opts = {}) {
  const transport = opts.transport || resolveEmailTransport(opts.env || process.env);
  if (!transport) {
    throw new Error('No live email transport configured');
  }
  const from = opts.from || FROM_EMAIL;
  const { subject, html } = renderTemplate(templateKey, variables, opts.siteUrl || SITE_URL);
  const fetchImpl = opts.fetchImpl || globalThis.fetch;

  if (transport.kind === 'resend') {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${transport.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Resend HTTP ${res.status}: ${body?.message || JSON.stringify(body).slice(0, 120)}`);
    }
    return { provider: 'resend', messageId: body?.id || null };
  }

  if (transport.kind === 'sendgrid') {
    const sgMail = opts.sgMail || require('@sendgrid/mail');
    sgMail.setApiKey(transport.apiKey);
    const [resp] = await sgMail.send({
      to,
      from,
      subject,
      html,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true },
      },
    });
    const msgId = resp?.headers?.['x-message-id'] || null;
    return { provider: 'sendgrid', messageId: msgId };
  }

  if (transport.kind === 'smtp') {
    let nodemailer = opts.nodemailer;
    if (!nodemailer) {
      try {
        nodemailer = require('nodemailer');
      } catch (e) {
        throw new Error('nodemailer is not installed for SMTP transport');
      }
    }
    const transporter = nodemailer.createTransport({
      host: transport.host,
      port: transport.port,
      secure: transport.secure,
      auth: { user: transport.user, pass: transport.pass },
    });
    const info = await transporter.sendMail({ from, to, subject, html });
    return { provider: 'smtp', messageId: info?.messageId || null };
  }

  if (transport.kind === 'apps-script-relay') {
    const res = await fetchImpl(transport.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        secret: transport.secret,
        mode: 'send_email_notification',
        recipient: to,
        subject,
        htmlBody: html,
      }),
      redirect: 'follow',
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined,
    });
    const raw = await res.text().catch(() => '');
    if (!res.ok || /^\s*</.test(raw)) {
      throw new Error(`Apps Script mail relay rejected HTTP ${res.status}`);
    }
    let parsed = null;
    try { parsed = raw ? JSON.parse(raw) : {}; } catch (_) { parsed = {}; }
    if (parsed && parsed.ok === false) {
      throw new Error(`Apps Script mail relay error: ${parsed.error || 'unknown'}`);
    }
    return { provider: 'apps-script-relay', messageId: parsed?.messageId || null };
  }

  throw new Error(`Unsupported email transport: ${transport.kind}`);
}

let sbClient = null;
function getSupabase() {
  if (sbClient) return sbClient;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const { createClient } = require('@supabase/supabase-js');
  sbClient = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return sbClient;
}

async function getSupabasePendingCampaigns(sb) {
  if (!sb) return [];
  const { data, error } = await sb
    .from('email_campaigns')
    .select('id, recipient_email, template_key, variables, status')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) {
    if (/Could not find the table|relation .* does not exist/i.test(error.message)) {
      console.log('email-sender: public.email_campaigns table not yet migrated — 0 Supabase rows');
      return [];
    }
    throw new Error(`Supabase email_campaigns query: ${error.message}`);
  }

  return (data || []).map((row) => ({
    kind: 'supabase',
    id: row.id,
    email: String(row.recipient_email || '').trim(),
    templateKey: String(row.template_key || '').trim(),
    variables: row.variables && typeof row.variables === 'object' ? row.variables : {},
  }));
}

async function updateSupabaseCampaignStatus(sb, id, patch) {
  if (!sb || !id) return;
  await sb
    .from('email_campaigns')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .then(({ error }) => {
      if (error) console.error(`supabase status update failed for ${id}: ${error.message}`);
    });
}

async function getSheetCampaignRecipients(sheets) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'email_campaigns'!A:E",
  });
  const rows = response.data.values || [];
  return rows
    .slice(1)
    .map((row, idx) => ({ row, sheetRow: idx + 2 }))
    .filter(({ row }) => String(row[3] || '').trim().toUpperCase() === 'PENDING')
    .map(({ row, sheetRow }) => ({
      kind: 'sheet',
      sheetRow,
      email: String(row[0] || '').trim(),
      templateKey: String(row[1] || '').trim(),
      variablesRaw: row[2],
    }));
}

async function updateSheetStatus(sheets, sheetRow, status) {
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
  const transport = resolveEmailTransport(process.env);
  if (!transport) {
    failUnconfigured('No live email transport configured (set RESEND_API_KEY, live SENDGRID_API_KEY, SMTP_HOST/USER/PASS, or EMAIL_APPS_SCRIPT_URL)');
  }
  summary.transport = transport.kind;

  const sb = getSupabase();
  const sheets = SHEET_ID ? createSheetsClient(['https://www.googleapis.com/auth/spreadsheets']) : null;
  if (!sb && !sheets) {
    failUnconfigured('Neither Supabase (SUPABASE_SERVICE_ROLE_KEY) nor Google Sheets (BROKER_INBOX_SHEET_ID + GOOGLE_SERVICE_ACCOUNT_*) is configured');
  }

  const queueItems = [];
  if (sb) {
    const sbRows = await getSupabasePendingCampaigns(sb);
    queueItems.push(...sbRows);
  }
  if (sheets) {
    const sheetRows = await getSheetCampaignRecipients(sheets);
    queueItems.push(...sheetRows);
  }

  summary.source = sb && sheets ? 'supabase+sheets' : sb ? 'supabase' : 'sheets';
  summary.pending = queueItems.length;
  console.log(`pending campaigns (${summary.source}, transport=${transport.kind}): ${queueItems.length}`);

  for (const item of queueItems) {
    const email = item.email;
    const templateKey = item.templateKey;
    let variables = item.variables || {};

    if (item.kind === 'sheet') {
      try {
        variables = item.variablesRaw ? JSON.parse(item.variablesRaw) : {};
      } catch (_) {
        await updateSheetStatus(sheets, item.sheetRow, 'ERROR');
        summary.malformed++;
        console.error(`malformed variables JSON row ${item.sheetRow} — marked ERROR, continuing`);
        continue;
      }
    }

    if (!email || !templateKey) {
      if (item.kind === 'sheet') await updateSheetStatus(sheets, item.sheetRow, 'ERROR');
      else await updateSupabaseCampaignStatus(sb, item.id, { status: 'error', error_message: 'missing_email_or_template' });
      summary.malformed++;
      continue;
    }

    try {
      const sentInfo = await sendEmail(email, templateKey, variables, { transport });
      if (item.kind === 'sheet') {
        await updateSheetStatus(sheets, item.sheetRow, 'SENT');
      } else {
        await updateSupabaseCampaignStatus(sb, item.id, {
          status: 'sent',
          provider: sentInfo.provider,
          provider_message_id: sentInfo.messageId,
          sent_at: new Date().toISOString(),
        });
      }
      summary.sent++;
      console.log(`sent → ${email} (${templateKey}, provider=${sentInfo.provider})`);
    } catch (err) {
      if (item.kind === 'sheet') {
        await updateSheetStatus(sheets, item.sheetRow, 'ERROR');
      } else {
        await updateSupabaseCampaignStatus(sb, item.id, {
          status: 'error',
          error_message: String(err.message || 'send_failed').slice(0, 500),
        });
      }
      summary.failed++;
      console.error(`send failed for ${email}: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`SUMMARY ${JSON.stringify(summary)}`);
  console.log('email-sender: done');
  process.exit(0);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EMAIL_TEMPLATES,
    isPlaceholderKey,
    resolveEmailTransport,
    renderTemplate,
    sendEmail,
  };
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`email-sender FAILED: ${err.message}`);
    process.exit(1);
  });
}
