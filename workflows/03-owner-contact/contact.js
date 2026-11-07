'use strict';
/**
 * Workflow 03: Owner Contact  (rewired 2026-10)
 * ─────────────────────────────────────────
 * Sends WhatsApp introduction messages to property owners discovered by
 * Workflow 02 (`owner_leads` Google Sheet tab and/or Supabase `public.leads`
 * where `origin_channel = 'workflow-02-owner-search'` and `stage = 'inbound'`),
 * dispatching via the OpenWA gateway session pool (`OPENWA_SESSION_IDS` or
 * `OPENWA_SESSION_ID`) and honoring opt-out suppression.
 *
 * Exit: 0 ok · 2 unconfigured · 1 error
 */
const path = require('path');
const { loadWorkflowEnv, createSheetsClient } = require('../lib/google-sheets');
loadWorkflowEnv(path.join(__dirname, '..'));
const { GatewayClient, requestJson } = require('../lib/gateway-client');
const { enforceOutreachNotice } = require('../lib/notice');
const { loadOptOutSet } = require('../lib/inbox');

const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID || '';
const SB_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DAILY_CAP = parseInt(process.env.WF_OWNER_CONTACT_DAILY_CAP || '40', 10);
const DRY_RUN = /^(1|true|yes)$/i.test(process.env.WF_DRY_RUN || '');

const summary = {
  pending: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
  skippedOptOut: 0,
  capped: 0,
  source: 'none',
  dryRun: DRY_RUN,
};

function failUnconfigured(msg) {
  console.log(`UNCONFIGURED: ${msg}`);
  process.exit(2);
}

const CONTACT_TEMPLATE = `السلام عليكم ورحمة الله وبركاته يا فندم،

مع حضرتك فريق الاستشارات العقارية بـ Sierra Estates بالتجمع الخامس.

نتواصل مع سيادتكم بخصوص عقاركم المعروض في ___LOCATION___، حيث يوجد لدينا عملاء مهتمون بالتنفيذ الفوري للتنسيق المباشر مع حضرتك.

هل الوحدة ما زالت متاحة للتنفيذ لمراجعة التفاصيل وتنسيق المعاينة للعميل؟

يسعدنا جداً التعاون المثمر مع حضرتك، ولكم منا خالص التقدير 🤝
(لعدم استقبال رسائل أخرى، أرسل كلمة "إلغاء")`;

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

  for (const item of leads) {
    if (summary.sent >= DAILY_CAP) {
      summary.capped = leads.length - summary.sent - summary.skipped - summary.skippedOptOut - summary.failed;
      console.log(`daily cap ${DAILY_CAP} reached — remaining rows stay pending`);
      break;
    }

    const rawPhone = item.phone;
    const digits = rawPhone.replace(/\D/g, '');
    if (!rawPhone || rawPhone === 'No contact') {
      if (item.kind === 'sheet') await updateSheetStatus(sheets, item.sheetRow, 'SKIPPED');
      else await updateSupabaseLeadStage(item.leadId, 'disqualified');
      summary.skipped++;
      continue;
    }

    if (digits && optedOut.has(digits)) {
      if (item.kind === 'sheet') await updateSheetStatus(sheets, item.sheetRow, 'OPTED_OUT');
      else await updateSupabaseLeadStage(item.leadId, 'closed');
      summary.skippedOptOut++;
      continue;
    }

    const text = enforceOutreachNotice(
      'owner-negotiation',
      CONTACT_TEMPLATE
        .replace('___PRICE___', item.price || 'السعر المعروض')
        .replace('___LOCATION___', item.location ? item.location : 'القاهرة الجديدة')
    );

    if (DRY_RUN) {
      console.log(`[dry-run] would send to ${rawPhone} (${item.title})`);
      summary.sent++;
      continue;
    }

    try {
      await gw.sendText(rawPhone, text, { retries: 2 });
      if (item.kind === 'sheet') await updateSheetStatus(sheets, item.sheetRow, 'CONTACTED');
      else await updateSupabaseLeadStage(item.leadId, 'contacted');
      summary.sent++;
      console.log(`sent → ${rawPhone} (${item.title})`);
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

main().catch((err) => {
  console.error(`owner-contact FAILED: ${err.message}`);
  process.exit(1);
});
