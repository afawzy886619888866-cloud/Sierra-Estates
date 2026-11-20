'use strict';
/**
 * Workflow 03: Owner Contact  (rewired & hardened 2026-11)
 * ───────────────────────────────────────────────────────────────────────────
 * Sends WhatsApp introduction messages to property owners discovered by
 * Workflow 02 (`owner_leads` Google Sheet tab and/or Supabase `public.leads`
 * where `origin_channel = 'workflow-02-owner-search'` and `stage = 'inbound'`),
 * dispatching round-robin across healthy OpenWA gateway sessions
 * (`OPENWA_SESSION_IDS` / `OPENWA_SESSION_ID`), honoring opt-out suppression,
 * cross-deduping against `09-owner-outreach` (`owner-outreach-ledger.jsonl` +
 * `public.owner_outreach_log`), and logging audit rows to `owner_outreach_log`.
 *
 * Exit: 0 ok · 2 unconfigured · 1 error
 */
const fs = require('fs');
const path = require('path');
const { loadWorkflowEnv, createSheetsClient } = require('../lib/google-sheets');
loadWorkflowEnv(path.join(__dirname, '..'));
const { GatewayClient, requestJson } = require('../lib/gateway-client');
const { enforceOutreachNotice } = require('../lib/notice');
const { loadOptOutSet } = require('../lib/inbox');
const { normalizePhone } = require('../lib/phone-utils');

const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID || '';
const SB_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const STATE_DIR = process.env.WF_STATE_DIR || path.join(__dirname, '..', '.state');
const LEDGER_FILE = path.join(STATE_DIR, 'owner-outreach-ledger.jsonl');
const DAILY_CAP = parseInt(process.env.WF_OWNER_CONTACT_DAILY_CAP || '40', 10);
const DRY_RUN = /^(1|true|yes)$/i.test(process.env.WF_DRY_RUN || '');

const summary = {
  pending: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
  skippedOptOut: 0,
  skippedAlreadyContacted: 0,
  capped: 0,
  source: 'none',
  bySession: {},
  auditWritten: 0,
  dryRun: DRY_RUN,
};

function failUnconfigured(msg) {
  console.log(`UNCONFIGURED: ${msg}`);
  process.exit(2);
}

const CONTACT_TEMPLATE = `السلام عليكم ورحمة الله وبركاته يا فندم، بعد التحية،

مع حضرتك فريق الاستشارات العقارية في Sierra Estates بالتجمع الخامس.

بنعتذر لو تواصلنا جاء في وقت غير مناسب؛ كنا حابين نستفسر من سيادتكم إذا كانت الوحدة المعروضة في ___LOCATION___ لا تزال متاحة حالياً، للتنسيق المباشر مع حضرتك وعرضها على عملائنا الجادين.

إذا كانت الوحدة غير متاحة حالياً فنعتذر لحضرتك وشاكرين جداً وقتك الكريم 🤝
(لعدم استقبال رسائل أخرى، أرسل كلمة "إلغاء")`;

/** Build canonical Arabic owner-inquiry message (no unit code, no price). */
function buildContactMessage(item = {}) {
  const rawLoc = String(item.location || item.compound || '').trim();
  const loc = !rawLoc || /^(new cairo|القاهرة الجديدة|التجمع|التجمع الخامس|5th settlement)$/i.test(rawLoc)
    ? 'القاهرة الجديدة'
    : rawLoc;
  return enforceOutreachNotice(
    'owner-negotiation',
    CONTACT_TEMPLATE.replace('___LOCATION___', loc),
  );
}

/** Generate normalized phone lookup keys (201..., 01..., raw digits). */
function addPhoneKeys(set, raw) {
  if (!raw) return;
  const norm = normalizePhone(String(raw));
  if (norm) set.add(norm);
  const digits = String(raw).replace(/\D/g, '');
  if (digits) {
    set.add(digits);
    if (digits.startsWith('20') && digits.length === 12) set.add('0' + digits.slice(2));
    if (digits.startsWith('01') && digits.length === 11) set.add('2' + digits);
  }
}

/**
 * Cross-workflow deduplication set from local `owner-outreach-ledger.jsonl`
 * AND Supabase `public.owner_outreach_log`.
 */
async function loadContactedPhones(opts = {}) {
  const seen = new Set();
  const ledgerPath = opts.ledgerFile || LEDGER_FILE;
  try {
    if (fs.existsSync(ledgerPath)) {
      const lines = fs.readFileSync(ledgerPath, 'utf8').split(/\r?\n/);
      for (const l of lines) {
        if (!l.trim()) continue;
        try {
          const entry = JSON.parse(l);
          if (entry && entry.phone) addPhoneKeys(seen, entry.phone);
        } catch (_) {}
      }
    }
  } catch (_) {}

  const sbUrl = opts.sbUrl !== undefined ? opts.sbUrl : SB_URL;
  const sbKey = opts.sbKey !== undefined ? opts.sbKey : SB_KEY;
  if (sbUrl && sbKey && opts.skipSupabase !== true) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data } = await sb
        .from('owner_outreach_log')
        .select('phone')
        .order('sent_at', { ascending: false })
        .limit(5000);
      for (const row of data || []) {
        if (row && row.phone) addPhoneKeys(seen, row.phone);
      }
    } catch (err) {
      console.warn(`owner-contact: Supabase outreach dedup query skipped (${err.message})`);
    }
  }
  return seen;
}

function appendLedgerEntry(entry, ledgerPath = LEDGER_FILE) {
  try {
    fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
    fs.appendFileSync(ledgerPath, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    console.warn(`owner-contact: failed writing ledger (${err.message})`);
  }
}

async function auditOutreachLog(entry) {
  if (!SB_URL || !SB_KEY) return false;
  try {
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await sb.from('owner_outreach_log').insert({
      phone: entry.phone,
      listing_code: entry.code || null,
      session_name: entry.session || null,
      direction: 'outbound',
      availability: 'inbound_lead',
      message_text: entry.text || null,
      dry_run: false,
      sent_at: entry.at || new Date().toISOString(),
    });
    if (error) {
      console.warn(`owner-contact: Supabase audit INSERT warning: ${error.message}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`owner-contact: Supabase audit failed: ${err.message}`);
    return false;
  }
}

async function getSheetOwnerLeads(sheets) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'owner_leads'!A:I",
  });
  const rows = response.data.values || [];
  return rows
    .slice(1)
    .map((row, idx) => ({
      kind: 'sheet',
      sheetRow: idx + 2,
      phone: String(row[6] || '').trim(),
      price: String(row[3] || '').trim(),
      location: String(row[4] || '').trim(),
      title: String(row[2] || '').slice(0, 60),
      status: String(row[8] || '').trim().toUpperCase(),
    }))
    .filter((item) => item.status === '' || item.status === 'PENDING');
}

async function updateSheetStatus(sheets, sheetRow, status) {
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

async function getSupabaseOwnerLeads() {
  const res = await requestJson(
    `${SB_URL}/rest/v1/leads?origin_channel=eq.workflow-02-owner-search&stage=eq.inbound&select=id,full_name,phone,target_compound,summary_notes&order=created_at.asc&limit=${DAILY_CAP}`,
    {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      timeoutMs: 10000,
    }
  );
  if (!res.ok || !Array.isArray(res.data)) return [];
  return res.data.map((row) => ({
    kind: 'supabase',
    leadId: row.id,
    phone: String(row.phone || '').trim(),
    price: '',
    location: String(row.target_compound || '').trim(),
    title: String(row.summary_notes || row.full_name || '').slice(0, 60),
  }));
}

async function updateSupabaseLeadStage(leadId, stage) {
  await requestJson(`${SB_URL}/rest/v1/leads?id=eq.${leadId}`, {
    method: 'PATCH',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: {
      stage,
      last_contact_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    timeoutMs: 8000,
  }).catch((err) => console.error(`supabase stage update failed for ${leadId}: ${err.message}`));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`owner-contact: starting (dryRun=${DRY_RUN})`);
  if (!process.env.WHATSAPP_API_TOKEN && !process.env.WHATSAPP_API_KEY) {
    failUnconfigured('WHATSAPP_API_TOKEN (operator key) missing');
  }
  if (!process.env.OPENWA_SESSION_ID && !process.env.OPENWA_SESSION_IDS) {
    failUnconfigured('OPENWA_SESSION_ID / OPENWA_SESSION_IDS missing');
  }

  const sheets = SHEET_ID ? createSheetsClient(['https://www.googleapis.com/auth/spreadsheets']) : null;
  const hasSupabase = Boolean(SB_URL && SB_KEY);
  if (!sheets && !hasSupabase) {
    failUnconfigured('Neither Google Sheets (GOOGLE_SERVICE_ACCOUNT_*) nor Supabase (SUPABASE_SERVICE_ROLE_KEY) is configured');
  }

  const gw = new GatewayClient();
  const readyPool = await gw.healthyPool().catch(() => []);
  if (!readyPool.length) {
    const st = await gw.status().catch(() => ({ status: 'offline' }));
    if (st.status !== 'ready' && !DRY_RUN) {
      console.log(`gateway session not ready (${st.status}) — retry next cycle`);
      console.log(`SUMMARY ${JSON.stringify(summary)}`);
      process.exit(0);
    }
    if (st.status === 'ready') {
      readyPool.push({ name: gw.sessionId || 'default', uuid: gw.sessionId || null });
    }
  } else {
    console.log(`gateway pool ready: ${readyPool.map((p) => p.name).join(', ')}`);
  }

  let leads = [];
  if (sheets) {
    summary.source = 'google-sheets';
    leads = await getSheetOwnerLeads(sheets);
  } else {
    summary.source = 'supabase-leads';
    leads = await getSupabaseOwnerLeads();
  }

  summary.pending = leads.length;
  console.log(`pending owner leads (${summary.source}): ${leads.length}`);

  const optedOut = loadOptOutSet();
  const contactedPhones = await loadContactedPhones();
  let poolIdx = 0;

  for (const item of leads) {
    if (summary.sent >= DAILY_CAP) {
      summary.capped = leads.length - summary.sent - summary.skipped - summary.skippedOptOut - summary.skippedAlreadyContacted - summary.failed;
      console.log(`daily cap ${DAILY_CAP} reached — remaining rows stay pending`);
      break;
    }

    const rawPhone = item.phone;
    const digits = rawPhone.replace(/\D/g, '');
    const norm = normalizePhone(rawPhone);
    const localDigits = digits.startsWith('20') && digits.length === 12 ? '0' + digits.slice(2) : digits;

    if (!rawPhone || rawPhone === 'No contact' || !digits) {
      if (item.kind === 'sheet') await updateSheetStatus(sheets, item.sheetRow, 'SKIPPED');
      else await updateSupabaseLeadStage(item.leadId, 'disqualified');
      summary.skipped++;
      continue;
    }

    if (optedOut.has(digits) || optedOut.has(norm) || optedOut.has(localDigits)) {
      if (item.kind === 'sheet') await updateSheetStatus(sheets, item.sheetRow, 'OPTED_OUT');
      else await updateSupabaseLeadStage(item.leadId, 'closed');
      summary.skippedOptOut++;
      continue;
    }

    if (contactedPhones.has(norm) || contactedPhones.has(digits) || contactedPhones.has(localDigits)) {
      if (item.kind === 'sheet') await updateSheetStatus(sheets, item.sheetRow, 'ALREADY_CONTACTED');
      else if (!DRY_RUN) await updateSupabaseLeadStage(item.leadId, 'contacted');
      summary.skippedAlreadyContacted++;
      continue;
    }

    const text = buildContactMessage(item);
    const entry = readyPool.length
      ? readyPool[poolIdx++ % readyPool.length]
      : { name: 'dry-run', uuid: null };

    if (DRY_RUN) {
      console.log(`[dry-run] would send via ${entry.name} to ${rawPhone} (${item.title})`);
      summary.bySession[entry.name] = (summary.bySession[entry.name] || 0) + 1;
      summary.sent++;
      continue;
    }

    try {
      await gw.sendText(rawPhone, text, { sessionId: entry.uuid || entry.name, retries: 2 });
      const sentAt = new Date().toISOString();
      if (item.kind === 'sheet') await updateSheetStatus(sheets, item.sheetRow, 'CONTACTED');
      else await updateSupabaseLeadStage(item.leadId, 'contacted');

      addPhoneKeys(contactedPhones, rawPhone);
      appendLedgerEntry({
        phone: norm || digits,
        code: item.leadId || '',
        at: sentAt,
        session: entry.name,
        worker: '03-owner-contact',
      });
      const audited = await auditOutreachLog({
        phone: norm || digits,
        code: item.leadId || '',
        session: entry.name,
        text,
        at: sentAt,
      });
      if (audited) summary.auditWritten++;

      summary.bySession[entry.name] = (summary.bySession[entry.name] || 0) + 1;
      summary.sent++;
      console.log(`sent via ${entry.name} → ${rawPhone} (${item.title})`);
    } catch (err) {
      if (item.kind === 'sheet') await updateSheetStatus(sheets, item.sheetRow, 'ERROR');
      summary.failed++;
      if (err.permanent || err.httpStatus === 401 || err.httpStatus === 403) {
        console.error(`permanent send failure (${err.message}) — aborting batch to protect the session`);
        break;
      }
      console.error(`send failed for ${rawPhone}: ${err.message}`);
    }

    await sleep(3000 + Math.floor(Math.random() * 3000));
  }

  console.log(`SUMMARY ${JSON.stringify(summary)}`);
  console.log('owner-contact: done');
  process.exit(0);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONTACT_TEMPLATE, buildContactMessage, loadContactedPhones };
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`owner-contact FAILED: ${err.message}`);
    process.exit(1);
  });
}
