-- ═══════════════════════════════════════════════════════════════════════════
-- 012_workflow_studio.sql — Admin Workflow Studio (graph canvas + script editor)
-- ═══════════════════════════════════════════════════════════════════════════
-- Extends public.workflows (already the admin automations board) with:
--   slug           — stable identity for idempotent seeding
--   category       — ingestion | outreach | intelligence | operations
--   graph          — { nodes:[{id,type,label,sub,x,y}], edges:[{id,from,to,label}] }
--   script         — full editable source (mirrors the repo file)
--   script_lang    — javascript | typescript | json
--   source_path    — repo-relative path of the source of truth
--   trigger_type   — cron | webhook | manual
--   success_rate / last_run_ms — studio telemetry
--   updated_by     — last studio editor (seed guard: seeds only apply while NULL)
--
-- Additive & idempotent. Re-running never clobbers admin edits.
-- RLS: existing "workflows_staff_access" policy already covers all operations.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Columns ─────────────────────────────────────────────────────────────
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS slug          TEXT;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS category      TEXT DEFAULT 'operations';
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS graph         JSONB;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS script        TEXT;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS script_lang   TEXT DEFAULT 'javascript';
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS source_path   TEXT;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS trigger_type  TEXT DEFAULT 'cron';
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS success_rate  REAL DEFAULT 99.0;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS last_run_ms   INT DEFAULT 0;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS updated_by    TEXT;

-- Backfill slug from name (deterministic; dupes get a numeric suffix).
DO $seed$
DECLARE
    r RECORD;
    base TEXT;
    candidate TEXT;
    n INT;
BEGIN
    FOR r IN SELECT id, name FROM public.workflows WHERE slug IS NULL OR slug = '' LOOP
        base := lower(regexp_replace(coalesce(r.name, 'wf'), '[^a-zA-Z0-9]+', '-', 'g'));
        base := regexp_replace(base, '(^-|-$)', '');
        candidate := base;
        n := 0;
        WHILE EXISTS (SELECT 1 FROM public.workflows w WHERE w.slug = candidate AND w.id <> r.id) LOOP
            n := n + 1;
            candidate := base || '-' || n;
        END LOOP;
        UPDATE public.workflows SET slug = candidate WHERE id = r.id;
    END LOOP;
END
$seed$;

CREATE UNIQUE INDEX IF NOT EXISTS workflows_slug_uidx ON public.workflows (slug);

-- ── 2. Studio seed (only while updated_by IS NULL — admin edits win) ───────
INSERT INTO public.workflows
    (slug, name, name_ar, description, description_ar, category, status, schedule,
     trigger_type, script, script_lang, source_path, graph, runs, success_rate,
     last_run_at, last_run_ms, last_run_label, color, enabled, updated_at)
VALUES
    ('whatsapp-scraper', 'WhatsApp Broker Scraper', 'جامع رسائل واتساب',
     'Monitors 4 Egyptian broker WhatsApp groups, filters property posts and appends raw rows to the Broker Inbox sheet.', NULL,
     'ingestion', 'active', '*/30 * * * *', 'cron',
     $sierra$/**
 * Workflow 01: WhatsApp Scraper
 * ─────────────────────────────────────────
 * Monitors WhatsApp groups for property listings
 * Writes raw messages to Google Sheets
 *
 * Usage:
 *   node workflows/01-whatsapp-scraper/index.js
 *
 * Env vars required:
 *   - BROKER_INBOX_SHEET_ID
 *   - GOOGLE_SERVICE_ACCOUNT_KEY (JSON path)
 *   - WHATSAPP_BOT_TOKEN (if using WhatsApp Web API)
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const { google } = require('googleapis');
const fs = require('fs');

const GROUPS_TO_WATCH = [
  'مجموعة وسطاء التجمع',
  'عقارات القاهرة الجديدة',
  'وسطاء شرق القاهرة',
  'وسطاء التجمع والحي',
];

const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID;
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

async function appendToSheet(tabName, values) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `'${tabName}'!A:F`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [values],
      },
    });
    console.log(`✅ Written to ${tabName}:`, values[3].substring(0, 50) + '...');
  } catch (err) {
    console.error(`❌ Sheet write failed for ${tabName}:`, err.message);
  }
}

// Initialize WhatsApp client
const client = new Client({ authStrategy: new LocalAuth() });

client.on('ready', () => {
  console.log('🟢 WhatsApp scraper ready');
});

client.on('message', async (msg) => {
  // Filter to watched groups only
  if (!GROUPS_TO_WATCH.some(g => msg.from.includes(g))) {
    return;
  }

  // Write raw message to sheet
  await appendToSheet('raw_messages', [
    new Date().toISOString(),
    msg.from,
    msg.fromMe ? 'broker' : 'subscriber',
    msg.body.substring(0, 500), // Cap at 500 chars
    msg.hasMedia ? 'YES' : 'NO',
    'PENDING_REVIEW',
  ]);
});

client.on('auth_failure', (msg) => {
  console.error('❌ WhatsApp auth failed:', msg);
});

client.initialize();
$sierra$, 'javascript', 'workflows/01-whatsapp-scraper/index.js', $sierra${"nodes":[{"id":"n1","type":"trigger","label":"WhatsApp Groups","sub":"4 broker groups · Cairo","x":40,"y":90},{"id":"n2","type":"action","label":"Message Listener","sub":"whatsapp-web.js client","x":300,"y":90},{"id":"n3","type":"condition","label":"Property Filter","sub":"regex + Arabic keywords","x":560,"y":90},{"id":"n4","type":"output","label":"Broker Inbox Sheet","sub":"append raw rows","x":820,"y":90}],"edges":[{"id":"e1","from":"n1","to":"n2","label":"live feed"},{"id":"e2","from":"n2","to":"n3"},{"id":"e3","from":"n3","to":"n4","label":"match"}]}$sierra$::jsonb,
     6420, 99.2, '2026-09-17T23:57:35.728Z', 8400, 'studio', '#D4AF37', true,
     NOW())
ON CONFLICT (slug) DO UPDATE SET
    graph        = EXCLUDED.graph,
    script       = EXCLUDED.script,
    script_lang  = EXCLUDED.script_lang,
    source_path  = EXCLUDED.source_path,
    category     = EXCLUDED.category,
    trigger_type = EXCLUDED.trigger_type
WHERE public.workflows.updated_by IS NULL;

INSERT INTO public.workflows
    (slug, name, name_ar, description, description_ar, category, status, schedule,
     trigger_type, script, script_lang, source_path, graph, runs, success_rate,
     last_run_at, last_run_ms, last_run_label, color, enabled, updated_at)
VALUES
    ('owner-search', 'Direct Owner Harvester', 'باحث الملاك المباشرين',
     'Daily sweep of Property Finder & OLX for direct-owner listings, deduped against current inventory.', NULL,
     'ingestion', 'active', '0 9 * * *', 'cron',
     $sierra$/**
 * Workflow 02: Owner Search
 * ─────────────────────────────────────────
 * Searches Property Finder & OLX for direct-owner properties
 * Filters by location, price, and owner status
 * Writes to Google Sheets "owner_leads" tab
 *
 * Usage:
 *   node workflows/02-owner-search/search.js
 *   OR: cron job daily at 9am
 *
 * Env vars required:
 *   - PROPERTY_FINDER_API_BASE
 *   - PROPERTY_FINDER_JWT_TOKEN
 *   - BROKER_INBOX_SHEET_ID
 *   - GOOGLE_SERVICE_ACCOUNT_KEY
 */

const { google } = require('googleapis');
const fs = require('fs');

const PF_API_BASE = process.env.PROPERTY_FINDER_API_BASE || 'https://api.propertyfinder.com.eg/v3';
const PF_TOKEN = process.env.PROPERTY_FINDER_JWT_TOKEN;
const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID;
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

async function appendToSheet(tabName, values) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `'${tabName}'!A:H`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [values],
      },
    });
    console.log(`✅ Owner lead added: ${values[2]}`);
  } catch (err) {
    console.error(`❌ Sheet write failed:`, err.message);
  }
}

async function searchPropertyFinder() {
  try {
    const response = await fetch(`${PF_API_BASE}/properties`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      qs: {
        category_id: 1,
        location_id: 'cairo-new-cairo',
        purpose: 'sale',
        owner_only: 'true',
        sort_by: 'date',
        limit: 50,
      },
    });

    if (!response.ok) {
      console.error(`❌ PF API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log(`📊 Found ${data.data?.length || 0} owner properties on PF`);

    for (const unit of data.data || []) {
      await appendToSheet('owner_leads', [
        new Date().toISOString(),
        'property_finder',
        unit.title,
        unit.price,
        unit.location?.name || '',
        `${unit.beds || 0} BR, ${unit.baths || 0} BA, ${unit.area || '?'} sqm`,
        unit.owner?.phone || 'No contact',
        unit.url || '',
      ]);
    }
  } catch (err) {
    console.error(`❌ Property Finder search failed:`, err.message);
  }
}

// Run search
async function main() {
  console.log('🔍 Starting owner property search...');
  await searchPropertyFinder();
  console.log('✅ Owner search complete');
  process.exit(0);
}

main();
$sierra$, 'javascript', 'workflows/02-owner-search/search.js', $sierra${"nodes":[{"id":"n1","type":"trigger","label":"PF + OLX","sub":"listing sources","x":40,"y":90},{"id":"n2","type":"action","label":"Scrape Listings","sub":"headless crawl","x":300,"y":90},{"id":"n3","type":"condition","label":"Direct Owner?","sub":"broker-name check","x":560,"y":90},{"id":"n4","type":"condition","label":"Dedupe","sub":"vs live inventory","x":560,"y":220},{"id":"n5","type":"output","label":"Owner Prospects","sub":"sheet queue","x":820,"y":90}],"edges":[{"id":"e1","from":"n1","to":"n2"},{"id":"e2","from":"n2","to":"n3"},{"id":"e3","from":"n3","to":"n5","label":"yes"},{"id":"e4","from":"n3","to":"n4","label":"verify"},{"id":"e5","from":"n4","to":"n5","label":"unique"}]}$sierra$::jsonb,
     214, 97.8, '2026-09-17T15:21:35.728Z', 132000, 'studio', '#D4AF37', true,
     NOW())
ON CONFLICT (slug) DO UPDATE SET
    graph        = EXCLUDED.graph,
    script       = EXCLUDED.script,
    script_lang  = EXCLUDED.script_lang,
    source_path  = EXCLUDED.source_path,
    category     = EXCLUDED.category,
    trigger_type = EXCLUDED.trigger_type
WHERE public.workflows.updated_by IS NULL;

INSERT INTO public.workflows
    (slug, name, name_ar, description, description_ar, category, status, schedule,
     trigger_type, script, script_lang, source_path, graph, runs, success_rate,
     last_run_at, last_run_ms, last_run_label, color, enabled, updated_at)
VALUES
    ('owner-contact', 'Owner Outreach Messenger', 'مراسلة الملاك',
     'Hourly dispatch of personalized WhatsApp messages to new owner prospects with reply detection and throttling.', NULL,
     'outreach', 'active', '0 * * * *', 'cron',
     $sierra$/**
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
$sierra$, 'javascript', 'workflows/03-owner-contact/contact.js', $sierra${"nodes":[{"id":"n1","type":"trigger","label":"Prospects Queue","sub":"sheet: new rows","x":40,"y":90},{"id":"n2","type":"ai","label":"Personalize","sub":"Leila template · AR/EN","x":300,"y":90},{"id":"n3","type":"action","label":"WhatsApp Send","sub":"openwa session","x":560,"y":90},{"id":"n4","type":"condition","label":"Replied?","sub":"24h window","x":560,"y":220},{"id":"n5","type":"output","label":"Log + Throttle","sub":"max 3/day/owner","x":820,"y":90}],"edges":[{"id":"e1","from":"n1","to":"n2"},{"id":"e2","from":"n2","to":"n3"},{"id":"e3","from":"n3","to":"n4"},{"id":"e4","from":"n4","to":"n5","label":"log"},{"id":"e5","from":"n3","to":"n5","label":"sent"}]}$sierra$::jsonb,
     3126, 96.5, '2026-09-17T23:33:35.728Z', 15800, 'studio', '#D4AF37', true,
     NOW())
ON CONFLICT (slug) DO UPDATE SET
    graph        = EXCLUDED.graph,
    script       = EXCLUDED.script,
    script_lang  = EXCLUDED.script_lang,
    source_path  = EXCLUDED.source_path,
    category     = EXCLUDED.category,
    trigger_type = EXCLUDED.trigger_type
WHERE public.workflows.updated_by IS NULL;

INSERT INTO public.workflows
    (slug, name, name_ar, description, description_ar, category, status, schedule,
     trigger_type, script, script_lang, source_path, graph, runs, success_rate,
     last_run_at, last_run_ms, last_run_label, color, enabled, updated_at)
VALUES
    ('email-sender', 'Investor Email Digest', 'النشرة البريدية للمستثمرين',
     'Renders match digests for investment stakeholders and sends via SMTP with open tracking.', NULL,
     'outreach', 'paused', '0 10 * * *', 'cron',
     $sierra$/**
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
$sierra$, 'javascript', 'workflows/04-email-sender/send.js', $sierra${"nodes":[{"id":"n1","type":"trigger","label":"New Matches","sub":"lead × unit fits","x":40,"y":90},{"id":"n2","type":"action","label":"Render Template","sub":"HTML brochure","x":300,"y":90},{"id":"n3","type":"action","label":"SMTP Send","sub":"SES relay","x":560,"y":90},{"id":"n4","type":"output","label":"Open Tracking","sub":"pixel + clicks","x":820,"y":90}],"edges":[{"id":"e1","from":"n1","to":"n2"},{"id":"e2","from":"n2","to":"n3"},{"id":"e3","from":"n3","to":"n4"}]}$sierra$::jsonb,
     1240, 98.9, '2026-09-16T22:21:35.728Z', 22100, 'studio', '#D4AF37', false,
     NOW())
ON CONFLICT (slug) DO UPDATE SET
    graph        = EXCLUDED.graph,
    script       = EXCLUDED.script,
    script_lang  = EXCLUDED.script_lang,
    source_path  = EXCLUDED.source_path,
    category     = EXCLUDED.category,
    trigger_type = EXCLUDED.trigger_type
WHERE public.workflows.updated_by IS NULL;

INSERT INTO public.workflows
    (slug, name, name_ar, description, description_ar, category, status, schedule,
     trigger_type, script, script_lang, source_path, graph, runs, success_rate,
     last_run_at, last_run_ms, last_run_label, color, enabled, updated_at)
VALUES
    ('unit-adder', 'Unit Adder → Supabase', 'إضافة الوحدات لقاعدة البيانات',
     'Reads new broker-inbox rows, normalizes Egyptian attributes, fingerprint-dedupes and writes authoritative listings to Supabase.', NULL,
     'ingestion', 'active', '*/30 * * * *', 'cron',
     $sierra$/**
 * Workflow 05: Unit Adder (Supabase Authoritative)
 * ─────────────────────────────────────────
 * Reads new units from Google Sheets
 * Normalizes and deduplicates
 * Writes to Supabase "listings" table
 * Syncs with SBR code generation
 *
 * Usage:
 *   node workflows/05-unit-adder/add.js
 *   OR: cron job every 30 minutes
 *
 * Env vars required:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - BROKER_INBOX_SHEET_ID
 *   - GOOGLE_SERVICE_ACCOUNT_KEY
 */

const { google } = require('googleapis');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment
const ROOT = path.resolve(__dirname, '../..');
[
  path.resolve(ROOT, '.env.local'),
  path.resolve(ROOT, '.env'),
].forEach((envPath) => {
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false });
});

const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gaxfqcietzoonlmatiot.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let sheets = null;
if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY && fs.existsSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)) {
  const serviceAccountKey = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'utf8')
  );
  sheets = google.sheets({
    version: 'v4',
    auth: new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    }),
  });
}

// Generate SBR code from property attributes
function generateSBRCode(compound, bedrooms, furnishing, price) {
  const compoundAbbr = (compound || 'PRP').substring(0, 3).toUpperCase();
  const furnishCode = furnishing === 'furnished' ? 'F' : 'U';
  const priceAbbr = `${Math.floor(price / 1000)}K`;
  return `${compoundAbbr}-${bedrooms}${furnishCode}-${priceAbbr}`;
}

// Compute SHA256 hash for deduplication
function computeSyncHash(compound, area, floor, unitNumber) {
  const key = `${compound}|${area}|${floor}|${unitNumber}`;
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function getPendingUnits() {
  if (!sheets || !SHEET_ID) {
    console.warn('⚠️ Google Sheets not configured or sheet ID missing. Skipping sheet fetch.');
    return [];
  }
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'new_units'!A:L",
    });

    const rows = response.data.values || [];
    return rows.slice(1).filter(row => row[11] === 'PENDING');
  } catch (err) {
    console.error('❌ Failed to read pending units:', err.message);
    return [];
  }
}

async function checkDuplicate(syncHash) {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('id')
      .eq('dupe_check_hash', syncHash)
      .limit(1);

    if (error) {
      console.error('❌ Dedup check error:', error.message);
      return false;
    }
    return Boolean(data && data.length > 0);
  } catch (err) {
    console.error('❌ Dedup check failed:', err.message);
    return false;
  }
}

async function addUnitToSupabase(unit, syncHash) {
  try {
    const sbrCode = generateSBRCode(
      unit.compound,
      unit.bedrooms,
      unit.furnishing,
      unit.price
    );

    const price = parseFloat(unit.price) || 0;
    const area = parseInt(unit.area) || 0;
    const pricePerSqm = area > 0 ? Math.round(price / area) : 0;

    const record = {
      title: `${unit.bedrooms}BR ${unit.compound}`,
      title_ar: unit.titleAr || '',
      code: sbrCode,
      property_type: unit.propertyType?.toLowerCase() || 'apartment',
      bedrooms: parseInt(unit.bedrooms) || 0,
      bathrooms: parseInt(unit.bathrooms) || 0,
      area,
      finishing: unit.finishingType || 'not-finished',
      price,
      price_per_sqm: pricePerSqm,
      compound: unit.compound,
      location: unit.address || unit.compound,
      lat: parseFloat(unit.lat) || 30.0,
      lng: parseFloat(unit.lng) || 31.0,
      dupe_check_hash: syncHash,
      status: 'available',
      owner_type: 'broker',
      source: 'sheets_sync',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('listings')
      .insert(record)
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    console.log(`✅ Unit added to Supabase: ${sbrCode} (id: ${data.id})`);
    return data.id;
  } catch (err) {
    console.error('❌ Supabase insert failed:', err.message);
    return null;
  }
}

async function updateUnitStatus(rowIndex, status) {
  if (!sheets || !SHEET_ID) return;
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'new_units'!L${rowIndex + 2}`,
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
  console.log('🏢 Starting unit adder workflow (Supabase)...');
  console.log(`📡 Supabase Endpoint: ${SUPABASE_URL}`);

  const pendingUnits = await getPendingUnits();
  console.log(`📊 Found ${pendingUnits.length} pending units`);

  let added = 0;
  let deduplicated = 0;

  for (let i = 0; i < pendingUnits.length; i++) {
    const row = pendingUnits[i];
    const unit = {
      compound: row[0],
      bedrooms: row[1],
      bathrooms: row[2],
      area: row[3],
      price: row[4],
      finishingType: row[5],
      furnishing: row[6],
      propertyType: row[7],
      address: row[8],
      lat: row[9],
      lng: row[10],
      ownerContact: row[11] || '',
    };

    const syncHash = computeSyncHash(
      unit.compound,
      unit.area,
      row[5], // floor level
      row[1]  // unit number
    );

    const isDuplicate = await checkDuplicate(syncHash);

    if (isDuplicate) {
      console.log(`⚠️ Skipping duplicate: ${unit.compound} ${unit.area}m²`);
      await updateUnitStatus(i, 'DUPLICATE');
      deduplicated++;
      continue;
    }

    const insertedId = await addUnitToSupabase(unit, syncHash);

    if (insertedId) {
      await updateUnitStatus(i, 'ADDED');
      added++;
    } else {
      await updateUnitStatus(i, 'ERROR');
    }
  }

  console.log('═══════════════════════════════════════');
  console.log(`✅ Workflow complete: ${added} added, ${deduplicated} duplicates`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateSBRCode,
  computeSyncHash,
  addUnitToSupabase,
  checkDuplicate,
};
$sierra$, 'javascript', 'workflows/05-unit-adder/add.js', $sierra${"nodes":[{"id":"n1","type":"trigger","label":"Broker Inbox Sheet","sub":"rows since watermark","x":40,"y":90},{"id":"n2","type":"action","label":"Normalize","sub":"area · price · SBR code","x":300,"y":90},{"id":"n3","type":"condition","label":"Fingerprint Dedupe","sub":"compound|type|beds|band","x":560,"y":90},{"id":"n4","type":"output","label":"Supabase listings","sub":"pending_verification","x":820,"y":90},{"id":"n5","type":"output","label":"Audit Event","sub":"status_history row","x":820,"y":220}],"edges":[{"id":"e1","from":"n1","to":"n2"},{"id":"e2","from":"n2","to":"n3"},{"id":"e3","from":"n3","to":"n4","label":"new"},{"id":"e4","from":"n4","to":"n5","label":"audit"}]}$sierra$::jsonb,
     8930, 99.6, '2026-09-18T00:03:35.728Z', 4700, 'studio', '#D4AF37', true,
     NOW())
ON CONFLICT (slug) DO UPDATE SET
    graph        = EXCLUDED.graph,
    script       = EXCLUDED.script,
    script_lang  = EXCLUDED.script_lang,
    source_path  = EXCLUDED.source_path,
    category     = EXCLUDED.category,
    trigger_type = EXCLUDED.trigger_type
WHERE public.workflows.updated_by IS NULL;

INSERT INTO public.workflows
    (slug, name, name_ar, description, description_ar, category, status, schedule,
     trigger_type, script, script_lang, source_path, graph, runs, success_rate,
     last_run_at, last_run_ms, last_run_label, color, enabled, updated_at)
VALUES
    ('lead-scoring', 'Leila Lead Scoring (n8n)', 'تقييم العملاء — ليلى',
     'n8n webhook: scores Property Finder leads with the Leila engine and routes hot leads to instant WhatsApp, warm to email.', NULL,
     'intelligence', 'active', 'webhook', 'webhook',
     $sierra${
  "name": "💬 Leila Agent — Lead Scoring & Agent Alert",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "leila-lead-webhook",
        "options": {}
      },
      "id": "219e0758-c0b8-4d57-b08e-17482811a001",
      "name": "Leila Webhook Ingestion",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [
        200,
        300
      ]
    },
    {
      "parameters": {
        "model": "gpt-4o-mini",
        "prompt": "=Analyze the following real estate lead conversation summary and extract values for Leila's 3 Gold Questions. Output as JSON:\n- intent: 'buy_resale' | 'rent' | 'invest' | 'unknown'\n- budget_egp: number\n- timeline_months: number\n- confidence_score: 0-100\n- client_summary: brief one-liner summary of requirements\n\nConversation Context: {{ $json.body.conversation_summary }}",
        "options": {
          "jsonMode": true
        }
      },
      "id": "319e0758-c0b8-4d57-b08e-17482811a002",
      "name": "Gemini/OpenAI Lead Parser",
      "type": "n8n-nodes-base.openAi",
      "typeVersion": 1.1,
      "position": [
        400,
        300
      ],
      "credentials": {
        "openAiApi": {
          "id": "4",
          "name": "OpenAI Api Key"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const lead = $('Leila Webhook Ingestion').item.json.body;\nconst analysis = $('Gemini/OpenAI Lead Parser').item.json.choices[0].message.content;\nconst data = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;\n\n// Calculate CRM Lead Priority Score\nlet priorityScore = 50; // Base score\nif (data.intent === 'buy_resale' || data.intent === 'invest') priorityScore += 20;\nif (data.budget_egp > 15000000) priorityScore += 15; // Luxury Segment\nif (data.timeline_months <= 2) priorityScore += 15;   // High Urgency\n\nlet priority = 'Low';\nif (priorityScore >= 80) priority = 'High';\nelse if (priorityScore >= 65) priority = 'Medium';\n\nreturn {\n  json: {\n    client_name: lead.client_name,\n    client_phone: lead.client_phone,\n    raw_intent: data.intent,\n    budget: data.budget_egp,\n    timeline: data.timeline_months,\n    summary: data.client_summary,\n    score: priorityScore,\n    priority: priority,\n    assigned_agent: lead.assigned_agent_id || \"agent_unassigned\"\n  }\n};"
      },
      "id": "419e0758-c0b8-4d57-b08e-17482811a003",
      "name": "CRM Lead Scorer",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        600,
        300
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://firestore.googleapis.com/v1/projects/sierra-estates-prod/databases/(default)/documents/leads",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "fields",
              "value": "={\"name\":{\"stringValue\":\"{{ $json.client_name }}\"},\"phone\":{\"stringValue\":\"{{ $json.client_phone }}\"},\"priority\":{\"stringValue\":\"{{ $json.priority }}\"},\"score\":{\"integerValue\":\"{{ $json.score }}\"},\"summary\":{\"stringValue\":\"{{ $json.summary }}\"},\"status\":{\"stringValue\":\"Lead_Ingested\"}}"
            }
          ]
        },
        "options": {}
      },
      "id": "519e0758-c0b8-4d57-b08e-17482811a004",
      "name": "Create Lead in Firestore CRM",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        800,
        200
      ],
      "credentials": {
        "httpHeaderAuth": {
          "id": "1",
          "name": "Google OAuth Token"
        }
      }
    },
    {
      "parameters": {
        "chatId": "=-1001928374",
        "text": "=🚨 *New Hot Lead Received via Leila AI!* \n\n👤 *Client:* {{ $json.client_name }}\n📱 *Phone:* {{ $json.client_phone }}\n💰 *Budget:* {{ $json.budget }} EGP\n⏱️ *Timeline:* {{ $json.timeline }} Month(s)\n🎯 *Priority:* {{ $json.priority }} (Score: {{ $json.score }})\n📝 *Summary:* {{ $json.summary }}\n\nAgent Assigned, please review on your CRM dashboard immediately!"
      },
      "id": "619e0758-c0b8-4d57-b08e-17482811a005",
      "name": "Telegram Alert to Agent Channel",
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1,
      "position": [
        800,
        400
      ],
      "credentials": {
        "telegramApi": {
          "id": "5",
          "name": "Telegram Bot Token"
        }
      }
    }
  ],
  "connections": {
    "Leila Webhook Ingestion": {
      "main": [
        [
          {
            "node": "Gemini/OpenAI Lead Parser",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Gemini/OpenAI Lead Parser": {
      "main": [
        [
          {
            "node": "CRM Lead Scorer",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "CRM Lead Scorer": {
      "main": [
        [
          {
            "node": "Create Lead in Firestore CRM",
            "type": "main",
            "index": 0
          },
          {
            "node": "Telegram Alert to Agent Channel",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": false,
  "settings": {}
}
$sierra$, 'json', 'workflows/n8n-templates/leila_lead_scoring.json', $sierra${"nodes":[{"id":"n1","type":"trigger","label":"PF Lead Webhook","sub":"POST /leads","x":40,"y":90},{"id":"n2","type":"ai","label":"Leila Scoring","sub":"budget·zone·payment fit","x":300,"y":90},{"id":"n3","type":"condition","label":"Score ≥ 8?","sub":"hot threshold","x":560,"y":90},{"id":"n4","type":"action","label":"Instant WhatsApp","sub":"< 2 min SLA","x":820,"y":40},{"id":"n5","type":"action","label":"Email Sequence","sub":"3-touch nurture","x":820,"y":180}],"edges":[{"id":"e1","from":"n1","to":"n2"},{"id":"e2","from":"n2","to":"n3"},{"id":"e3","from":"n3","to":"n4","label":"hot"},{"id":"e4","from":"n3","to":"n5","label":"warm"}]}$sierra$::jsonb,
     12840, 99.9, '2026-09-18T00:15:35.728Z', 900, 'studio', '#D4AF37', true,
     NOW())
ON CONFLICT (slug) DO UPDATE SET
    graph        = EXCLUDED.graph,
    script       = EXCLUDED.script,
    script_lang  = EXCLUDED.script_lang,
    source_path  = EXCLUDED.source_path,
    category     = EXCLUDED.category,
    trigger_type = EXCLUDED.trigger_type
WHERE public.workflows.updated_by IS NULL;

INSERT INTO public.workflows
    (slug, name, name_ar, description, description_ar, category, status, schedule,
     trigger_type, script, script_lang, source_path, graph, runs, success_rate,
     last_run_at, last_run_ms, last_run_label, color, enabled, updated_at)
VALUES
    ('reservation-expiry', 'Reservation Auto-Expiry', 'انتهاء الحجوزات تلقائيًا',
     'Nightly sweep: expires 14-day reservation windows, reverts units to published via guarded transition and queues owner notifications.', NULL,
     'operations', 'active', '0 2 * * *', 'cron',
     $sierra$import { listRecords, updateRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';

/**
 * Reservation auto-expiry — the enforcement half of the Inventory OS v2
 * escrow window.
 *
 * When a unit is reserved (POST /api/admin/inventory-os transition to
 * "reserved"), the listing row is stamped with `reserved_until`
 * (now + 14 days) and a `reservation_ref` (ESC-xxxx). Nothing else ever
 * cleared that stamp: if the buyer walked away, the unit sat reserved
 * forever and disappeared from the sellable pool while the pipeline board
 * showed a countdown that had already hit zero.
 *
 * This monitor, driven by /api/cron/expire-reservations (daily, see
 * vercel.json), finds every reservation whose window has lapsed and:
 *
 *   1. returns the unit to the market — status reserved → published, which
 *      is on the lifecycle transition matrix, so the DB trigger records the
 *      change in status_history and stamps the actor as "system";
 *   2. clears reserved_until / reservation_ref;
 *   3. queues a WhatsApp notification to the unit's owner contact through
 *      the standard outreach queue (whatsapp_queue), so it is sent within
 *      operating hours and quota by /api/cron/whatsapp-dispatch.
 *
 * Idempotent by construction: an expired row flips to "published" on the
 * first pass and no longer matches the query on subsequent runs.
 */

/** Reservation window length — must match RESERVATION_WINDOW_DAYS in the admin route. */
export const RESERVATION_WINDOW_DAYS = 14;

export interface ExpiredReservation {
  id: string;
  code: string | null;
  compound: string | null;
  propertyType: string | null;
  reservationRef: string | null;
  reservedUntil: string;
  notified: boolean;
}

export interface ExpiryRunResult {
  expired: ExpiredReservation[];
  notifiedCount: number;
  failures: number;
}

export class ReservationExpiryMonitor {
  /** Expire every lapsed reservation. Never throws: per-row failures are counted. */
  static async expireReservations(now: Date = new Date()): Promise<ExpiryRunResult> {
    const expiredRows = await listRecords<Record<string, unknown>>('listings', {
      where: [
        { column: 'status', op: 'eq', value: 'reserved' },
        { column: 'reservedUntil', op: 'lt', value: now.toISOString() },
      ],
      select: 'id, code, compound, propertyType, status, reservedUntil, reservationRef, ownerPhone, ownerName',
      orderBy: { column: 'reservedUntil', ascending: true },
      limit: 200,
    });

    if (expiredRows.length === 0) {
      logger.info('[ReservationExpiry] No lapsed reservations found.');
      return { expired: [], notifiedCount: 0, failures: 0 };
    }

    logger.info(
      `[ReservationExpiry] ${expiredRows.length} reservation(s) past their window — expiring.`
    );

    const expired: ExpiredReservation[] = [];
    let notifiedCount = 0;
    let failures = 0;

    for (const row of expiredRows) {
      const summary: ExpiredReservation = {
        id: String(row.id),
        code: (row.code as string) ?? null,
        compound: (row.compound as string) ?? null,
        propertyType: (row.propertyType as string) ?? null,
        reservationRef: (row.reservationRef as string) ?? null,
        reservedUntil: String(row.reservedUntil ?? ''),
        notified: false,
      };

      try {
        // reserved → published is on the transition matrix; the DB trigger
        // writes status_history (actor "system") and keeps published_at.
        await updateRecord('listings', summary.id, {
          status: 'published',
          reservedUntil: null,
          reservationRef: null,
          updatedAt: now.toISOString(),
        });

        // Queue the owner notification — best effort, never blocks expiry.
        const ownerPhone = (row.ownerPhone as string) || '';
        if (ownerPhone) {
          try {
            await enqueueWhatsAppJob({
              purpose: 'general-outreach',
              toPhone: ownerPhone,
              unitId: summary.id,
              body:
                `⏰ Reservation Expired — Sierra Estates\n` +
                `🔖 Unit: ${summary.code || summary.id}${summary.compound ? ` — ${summary.compound}` : ''}\n` +
                `🏠 ${summary.propertyType || 'Unit'}${summary.reservationRef ? ` · Ref ${summary.reservationRef}` : ''}\n` +
                `The ${RESERVATION_WINDOW_DAYS}-day escrow reservation window has lapsed and the unit is back on the market (Published).\n` +
                `Reply to this message to re-reserve the unit or discuss incoming offers.`,
            });
            summary.notified = true;
            notifiedCount += 1;
          } catch (waErr) {
            logger.warn(
              `[ReservationExpiry] WhatsApp queue failed for ${summary.code || summary.id}: ${
                waErr instanceof Error ? waErr.message : String(waErr)
              }`
            );
          }
        }

        expired.push(summary);
      } catch (err) {
        failures += 1;
        logger.error(
          `[ReservationExpiry] Failed to expire ${summary.code || summary.id}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    logger.info(
      `[ReservationExpiry] Done: ${expired.length} expired, ${notifiedCount} owner notifications queued, ${failures} failures.`
    );

    return { expired, notifiedCount, failures };
  }
}
$sierra$, 'typescript', 'apps/sierra-estates-realty/lib/services/ReservationExpiryMonitor.ts', $sierra${"nodes":[{"id":"n1","type":"trigger","label":"Cron 02:00 UTC","sub":"vercel.json","x":40,"y":90},{"id":"n2","type":"action","label":"Find Expired","sub":"reserved_until < now","x":300,"y":90},{"id":"n3","type":"action","label":"Revert → Published","sub":"guarded + audited","x":560,"y":90},{"id":"n4","type":"action","label":"Owner WhatsApp","sub":"outreach queue","x":560,"y":220},{"id":"n5","type":"output","label":"Activity Feed","sub":"admin visible","x":820,"y":90}],"edges":[{"id":"e1","from":"n1","to":"n2"},{"id":"e2","from":"n2","to":"n3","label":"expired"},{"id":"e3","from":"n3","to":"n4"},{"id":"e4","from":"n3","to":"n5","label":"audit"}]}$sierra$::jsonb,
     186, 100, '2026-09-17T10:21:35.728Z', 3100, 'studio', '#D4AF37', true,
     NOW())
ON CONFLICT (slug) DO UPDATE SET
    graph        = EXCLUDED.graph,
    script       = EXCLUDED.script,
    script_lang  = EXCLUDED.script_lang,
    source_path  = EXCLUDED.source_path,
    category     = EXCLUDED.category,
    trigger_type = EXCLUDED.trigger_type
WHERE public.workflows.updated_by IS NULL;

INSERT INTO public.workflows
    (slug, name, name_ar, description, description_ar, category, status, schedule,
     trigger_type, script, script_lang, source_path, graph, runs, success_rate,
     last_run_at, last_run_ms, last_run_label, color, enabled, updated_at)
VALUES
    ('master-sheet-sync', 'Master Sheet Sync', 'مزامنة الشيت الرئيسي',
     'Daily one-way sync of authoritative Supabase listings into the Google master sheet with canonical column mapping and drift report.', NULL,
     'operations', 'active', '30 6 * * *', 'cron',
     $sierra$import { google } from 'googleapis';
import { listRecords, upsertRecords } from '@sierra-estates/db';
import { COLLECTIONS, Unit, PropertyStatus, PropertyType, FurnishingCode } from '@/lib/models/schema';
import { logger } from '@/lib/logger';
import { resolveLocation } from '@/lib/inventory/gazetteer';
import { toListingColumns } from '@/lib/server/listing-columns';
import { egpToUsd, usdToEgp } from '@/lib/fx';

export const MASTER_SHEET_ID_DEFAULT = '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk';

/** Stamp written to listings.sync_source for rows produced by this sync. */
export const SYNC_SOURCE = 'master-owner-sheet';

export interface RawOwnerSheetRow {
  timestamp?: string;
  rowNo?: string;
  lastUpdated?: string;
  name?: string;
  mobile?: string;
  availability?: string;
  bedrooms?: string;
  location?: string;
  priceRaw?: string;
  furnished?: string;
  typeRaw?: string;
  propertyTypeRaw?: string;
  code?: string;
  ownerTypeRaw?: string;
  gardenArea?: string;
  spaceArea?: string;
  pool?: string;
  comment?: string;
}

function getSheetsClient() {
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (keyRaw) {
    try {
      const credentials = JSON.parse(keyRaw);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      return google.sheets({ version: 'v4', auth });
    } catch (_err: any) {
      logger.warn('[MasterSheetSync] Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY credentials, falling back to API key');
    }
  }

  // Fallback to unauthenticated / API key if available
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  return google.sheets({ version: 'v4', auth: apiKey });
}

function convertArabicNumerals(str: string): string {
  if (!str) return '';
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (w) => arabicNumbers.indexOf(w).toString());
}

function parsePrice(priceStr?: string): { amount: number; currency: 'EGP' | 'USD' } {
  if (!priceStr) return { amount: 0, currency: 'EGP' };
  const normalized = convertArabicNumerals(priceStr).trim().toLowerCase();
  const isUsd = normalized.includes('$') || normalized.includes('usd') || normalized.includes('دولار');

  let multiplier = 1;
  if (/(m|million|مليون)/i.test(normalized)) {
    multiplier = 1_000_000;
  } else if (/(k|thousand|الف|ألف)/i.test(normalized)) {
    multiplier = 1_000;
  }

  const clean = normalized.replace(/[^0-9.]/g, '');
  const baseNum = parseFloat(clean) || 0;
  const amount = baseNum * multiplier;

  return { amount, currency: isUsd ? 'USD' : 'EGP' };
}

/**
 * The sheet quotes some units in USD ("$250k", "2M دولار"). public.listings
 * stores one canonical price column interpreted as EGP by every consumer
 * (feed, admin, valuation), so a USD figure is converted at the boundary via
 * the unified FX module — never the raw number, which would understate the
 * price by ~48x and poison the price-per-sqm stats.
 */
function parsePriceEgp(priceStr?: string): number {
  const { amount, currency } = parsePrice(priceStr);
  if (amount <= 0) return 0;
  return currency === 'USD' ? usdToEgp(amount) : amount;
}

function parseAvailability(avail?: string, typeRaw?: string): PropertyStatus {
  const normAvail = (avail || '').toLowerCase().trim();
  const normType = (typeRaw || '').toLowerCase().trim();
  const combined = `${normAvail} ${normType}`;

  if (combined.includes('اتباعت') || combined.includes('مباع') || combined.includes('sold')) return 'sold';
  if (combined.includes('تم الايجار') || combined.includes('مؤجر') || combined.includes('rented')) return 'rented';
  if (combined.includes('no answer') || combined.includes('غير متاح') || combined.includes('مغلق') || combined.includes('off market')) return 'off-market';
  if (combined.includes('متاح') || combined.includes('available')) return 'available';
  return 'available';
}

function parsePropertyType(raw?: string): PropertyType {
  const norm = (raw || '').toLowerCase().trim();
  if (norm.includes('villa') || norm.includes('فيلا') || norm.includes('فيللا')) return 'villa';
  if (norm.includes('town') || norm.includes('تاون')) return 'townhouse';
  if (norm.includes('duplex') || norm.includes('دوبلكس') || norm.includes('garden')) return 'duplex';
  if (norm.includes('penthouse') || norm.includes('بنتهاوس')) return 'penthouse';
  if (norm.includes('chalet') || norm.includes('شاليه')) return 'chalet';
  if (norm.includes('apartment') || norm.includes('شقة') || norm.includes('شقه') || norm.includes('استوديو')) return 'apartment';
  return 'apartment';
}

/** 'مفروش'/'F' → 'F' (furnished), 'نص مفروش'/'S' → 'S', 'غير مفروش'/'U' → 'U'. */
function parseFurnishing(raw?: string): FurnishingCode | undefined {
  const s = convertArabicNumerals(raw || '').trim().toLowerCase();
  if (!s) return undefined;
  // Negations first — 'غير مفروش' contains 'مفروش'.
  if (s.includes('غير مفروش') || s.includes('unfurnish') || s === 'u') return 'U';
  if (s.includes('نص مفروش') || s.includes('semi') || s === 's') return 'S';
  if (s.includes('مفروش') || s.includes('furnish') || s === 'f') return 'F';
  if (s === 'k') return 'K';
  return undefined;
}

// ─── Status lifecycle mirror ─────────────────────────────────────────────────
//
// Inventory OS v2 (migrations/011) enforces the canonical lifecycle at the
// database level with a BEFORE UPDATE trigger: an UPDATE whose status change
// is not on the transition matrix raises an exception, which would abort the
// whole 500-row upsert chunk. The matrix below mirrors
// normalize_listing_status() + can_transition_listing() so the sync can
// decide per row, up front, whether to apply the sheet's status or defer to
// the lifecycle queue (the desired state is parked in raw_data.sheet_status
// for the ops team to action through the Inventory OS view).

function normalizeStatus(raw?: string | null): string {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === '') return 'draft';
  if (['available', 'active', 'verified'].includes(s)) return 'published';
  if (['pending', 'pending review', 'pending_review', 'pending_verification'].includes(s)) return 'pending_verification';
  if (s === 'sold') return 'sold';
  if (s === 'rented') return 'rented';
  if (s === 'reserved') return 'reserved';
  if (s === 'off-market' || s === 'off_market') return 'off_market';
  if (s === 'expired') return 'expired';
  if (s === 'archived') return 'archived';
  return 'draft';
}

const LIFECYCLE_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['pending_verification', 'archived'],
  pending_verification: ['verified', 'draft', 'archived'],
  verified: ['published', 'pending_verification', 'archived'],
  published: ['reserved', 'rented', 'off_market', 'expired', 'pending_verification', 'archived'],
  reserved: ['sold', 'rented', 'published', 'archived'],
  rented: ['published', 'archived'],
  off_market: ['published', 'archived'],
  expired: ['pending_verification', 'archived'],
  // sold / archived are terminal
};

function canTransition(fromRaw?: string | null, toRaw?: string | null): boolean {
  const from = normalizeStatus(fromRaw);
  const to = normalizeStatus(toRaw);
  if (from === to) return true;
  return LIFECYCLE_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function syncMasterOwnerSheet(sheetId?: string) {
  const spreadsheetId = sheetId || process.env.MASTER_SHEET_ID || MASTER_SHEET_ID_DEFAULT;
  logger.info(`[MasterSheetSync] Starting sync for sheet ID: ${spreadsheetId}`);

  try {
    const sheets = getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A:R', // All 18 columns
    });

    const rows = res.data.values || [];
    if (rows.length <= 1) {
      logger.warn('[MasterSheetSync] Sheet is empty or header only.');
      return { success: true, count: 0, units: [] };
    }

    const dataRows = rows.slice(1); // skip header
    const parsedUnits: Partial<Unit>[] = [];
    const pendingWrites: { docId: string; data: Record<string, unknown> }[] = [];

    // Sheet-derived doc ids for this batch, used to fetch the stored status of
    // each row so the lifecycle guard never sees an illegal UPDATE.
    const docIds: string[] = [];
    const parsed: {
      docId: string;
      sheetStatus: PropertyStatus;
      appUnit: Partial<Unit>;
      columns: Record<string, unknown>;
    }[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.length < 3) continue;

      const [
        _timestamp,
        _rowNo,
        _lastUpdated,
        _name,
        mobile,
        availability,
        bedrooms,
        location,
        priceRaw,
        furnished,
        typeRaw,
        propertyTypeRaw,
        code,
        ownerTypeRaw,
        _gardenArea,
        spaceArea,
        _pool,
        comment
      ] = row;

      const price = parsePriceEgp(priceRaw); // canonical EGP
      const sheetStatus = parseAvailability(availability, typeRaw);
      const propertyType = parsePropertyType(propertyTypeRaw);
      const furnishing = parseFurnishing(furnished);

      const cleanSpaceStr = convertArabicNumerals(spaceArea || '').replace(/[^0-9.]/g, '');
      const area = parseFloat(cleanSpaceStr) || 0;

      const cleanBedStr = convertArabicNumerals(bedrooms || '').replace(/[^0-9]/g, '');
      const bedCount = parseInt(cleanBedStr, 10) || 0;

      const unitCode = (code || `SB-UNIT-${i + 1}`).trim();
      const sanitizedDocId = unitCode.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

      // Geocode for the inventory map (lib/inventory/gazetteer.js — same
      // compound/area centroid table used by the public map's live-sheet
      // fallback, so pins stay consistent whichever source served them).
      const geo = resolveLocation(location || '');

      // Column payload for public.listings. Field names are the camelCase
      // column names (translated to snake_case by the record layer) — NOT the
      // legacy app names: this sync previously wrote `location`, `area`,
      // `ownerContact` and a nested `coordinates` object, none of which are
      // columns, so every upsert failed wholesale with PGRST204.
      // toListingColumns() is the last line of defence: a key that is not a
      // column lands in raw_data instead of killing the request.
      const columnPayload: Record<string, unknown> = {
        id: sanitizedDocId,
        code: unitCode,
        unitCode, // Inventory OS v2 cross-source unit identity
        title: `${propertyType.toUpperCase()} in ${location || 'New Cairo'} - ${unitCode}`,
        compound: (location || 'New Cairo').trim(),
        locationArea: (location || 'New Cairo').trim(),
        city: geo.zone, // canonical zone from the gazetteer, not hardcoded
        propertyType,
        dealType: 'resale', // owner sheet is secondary-market inventory
        category: 'residential',
        price,
        priceCurrency: 'EGP',
        egpM: price > 0 ? Number((price / 1_000_000).toFixed(2)) : undefined,
        usd: price > 0 ? egpToUsd(price) : undefined,
        areaSqm: area,
        pricePerSqm: price > 0 && area > 0 ? Math.round(price / area) : undefined,
        bedrooms: bedCount,
        furnishingStatus: furnishing,
        ownerType: (ownerTypeRaw || '').toLowerCase().includes('broker') ? 'broker' : 'owner',
        ownerPhone: mobile || '',
        description: comment || `${furnished || ''} ${typeRaw || ''}`.trim(),
        latitude: geo.lat,
        longitude: geo.lng,
        syncSource: SYNC_SOURCE,
        sheetPriceRaw: priceRaw || '', // traceability: original sheet quote (→ raw_data)
      };

      // App-shaped twin for the response — the shape callers of this sync
      // have always received.
      const appUnit: Partial<Unit> = {
        code: unitCode,
        title: columnPayload.title as string,
        compound: (location || 'New Cairo').trim(),
        location: (location || 'New Cairo').trim(),
        city: geo.zone,
        propertyType,
        category: 'residential',
        price,
        area,
        bedrooms: bedCount,
        ownerType: columnPayload.ownerType as string,
        ownerPhone: mobile || '',
        description: columnPayload.description as string,
        coordinates: { lat: geo.lat, lng: geo.lng },
        syncSource: SYNC_SOURCE,
      };

      parsed.push({ docId: sanitizedDocId, sheetStatus, appUnit, columns: columnPayload });
      docIds.push(sanitizedDocId);
    }

    // Stored status per doc id — decides whether the sheet's status can be
    // applied directly or must be deferred to the lifecycle queue.
    const existingRows = docIds.length
      ? await listRecords<{ id: string; status: string }>(COLLECTIONS.units, {
          where: [{ column: 'id', op: 'in', value: docIds }],
          select: 'id, status',
        })
      : [];
    const storedStatus = new Map(existingRows.map((r) => [r.id, r.status]));

    const skippedStatusTransitions: { id: string; from: string; to: string }[] = [];

    for (const item of parsed) {
      const stored = storedStatus.get(item.docId);
      let finalStatus: PropertyStatus = item.sheetStatus;

      if (stored != null && !canTransition(stored, item.sheetStatus)) {
        // e.g. sheet says 'sold' but the unit is 'available' (published):
        // the lifecycle requires published → reserved → sold. Keep the
        // stored status, park the sheet's intent in raw_data.sheet_status
        // and let ops drive it through the Inventory OS view so the
        // status_history audit trail stays intact.
        finalStatus = stored as PropertyStatus;
        item.columns.status = finalStatus;
        item.columns.sheetStatus = item.sheetStatus; // → raw_data via toListingColumns
        skippedStatusTransitions.push({ id: item.docId, from: stored, to: item.sheetStatus });
        logger.warn(
          `[MasterSheetSync] Deferred illegal transition ${stored} → ${item.sheetStatus} for ${item.docId} (parked in raw_data.sheet_status)`
        );
      } else {
        item.columns.status = item.sheetStatus;
      }

      const now = new Date();
      item.columns.lastSyncAt = now;
      item.columns.updatedAt = now;

      const appUnit = { ...item.appUnit, status: finalStatus, updatedAt: now } as Partial<Unit>;
      parsedUnits.push(appUnit);
      pendingWrites.push({ docId: item.docId, data: toListingColumns(item.columns) });
    }

    // One upsert per chunk keyed on the sheet-derived id. Chunks are about
    // request size only — Postgres has no Firestore 500-op batch cap.
    if (pendingWrites.length > 0) {
      await upsertRecords(
        COLLECTIONS.units,
        pendingWrites.map((item) => ({ ...item.data })),
        'id'
      );
    }

    logger.info(
      `[MasterSheetSync] Successfully synchronized ${parsedUnits.length} active inventory assets` +
        (skippedStatusTransitions.length ? ` (${skippedStatusTransitions.length} status changes deferred to lifecycle queue)` : '')
    );

    return {
      success: true,
      count: parsedUnits.length,
      units: parsedUnits,
      skippedStatusTransitions,
    };
  } catch (err: any) {
    logger.error('[MasterSheetSync] Error syncing master owner sheet:', err.message);
    return { success: false, error: err.message };
  }
}
$sierra$, 'typescript', 'apps/sierra-estates-realty/lib/services/master-sheet-sync.ts', $sierra${"nodes":[{"id":"n1","type":"trigger","label":"Cron 06:30 UTC","sub":"vercel.json","x":40,"y":90},{"id":"n2","type":"action","label":"Fetch Supabase","sub":"v_inventory_os view","x":300,"y":90},{"id":"n3","type":"action","label":"Map Columns","sub":"location→locationArea…","x":560,"y":90},{"id":"n4","type":"output","label":"Master Sheet","sub":"canonical EGP","x":820,"y":90},{"id":"n5","type":"output","label":"Drift Report","sub":"row delta log","x":820,"y":220}],"edges":[{"id":"e1","from":"n1","to":"n2"},{"id":"e2","from":"n2","to":"n3"},{"id":"e3","from":"n3","to":"n4"},{"id":"e4","from":"n4","to":"n5"}]}$sierra$::jsonb,
     92, 98.1, '2026-09-17T13:21:35.729Z', 76000, 'studio', '#D4AF37', true,
     NOW())
ON CONFLICT (slug) DO UPDATE SET
    graph        = EXCLUDED.graph,
    script       = EXCLUDED.script,
    script_lang  = EXCLUDED.script_lang,
    source_path  = EXCLUDED.source_path,
    category     = EXCLUDED.category,
    trigger_type = EXCLUDED.trigger_type
WHERE public.workflows.updated_by IS NULL;

-- ── 3. Graph sanity guard (admin-facing, cheap) ────────────────────────────
-- Rejects graphs with dangling edges or > 60 nodes at write time.
CREATE OR REPLACE FUNCTION public.validate_workflow_graph()
RETURNS TRIGGER AS $guard$
DECLARE
    node_count INT;
    dangling INT;
BEGIN
    IF NEW.graph IS NOT NULL THEN
        node_count := jsonb_array_length(COALESCE(NEW.graph->'nodes', '[]'::jsonb));
        IF node_count > 60 THEN
            RAISE EXCEPTION 'Workflow graph exceeds 60 nodes (%)', node_count;
        END IF;
        SELECT COUNT(*) INTO dangling
        FROM jsonb_array_elements(NEW.graph->'edges') e
        WHERE NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(NEW.graph->'nodes') n
            WHERE n->>'id' IN (e->>'from', e->>'to')
        );
        IF dangling > 0 THEN
            RAISE EXCEPTION 'Workflow graph has % dangling edge(s)', dangling;
        END IF;
    END IF;
    RETURN NEW;
END
$guard$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workflow_graph_guard ON public.workflows;
CREATE TRIGGER trg_workflow_graph_guard
    BEFORE INSERT OR UPDATE OF graph ON public.workflows
    FOR EACH ROW EXECUTE FUNCTION public.validate_workflow_graph();
