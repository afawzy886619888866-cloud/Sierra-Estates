/**
 * Workflow 07: Daily Ops Digest  (new 2026-10)
 * ────────────────────────────────────────────
 * Every morning (08:00 Africa/Cairo, per the workflows DB row) sends ONE
 * Arabic WhatsApp summary to the ops/owner number:
 *
 *   • Gateway health (session status, phone, engine)
 *   • Workflow estate: last exit + success rate for every registered slug
 *   • New leads in the last 24 h (Supabase `leads`)
 *   • New units added in the last 24 h (Supabase `listings`)
 *
 * Delivery target, first configured wins:
 *   WF_DIGEST_TO → LEAD_NOTIFY_WHATSAPP_NUMBER → the gateway's own number
 *   ("message yourself" chat on the Sierra Estates session).
 *
 * Notice policy: internal operations summary — NOT client-facing marketing,
 * NOT an owner-negotiation thread. Per lib/notice.js decision table it
 * carries no Cairo Plaza notice, and it never mentions the project.
 *
 * Degrades gracefully: if Supabase is unreachable the digest still reports
 * gateway + workflow local state; if the gateway is down the run FAILS
 * (exit 1) because delivery is impossible — the sentinel escalation path
 * covers alerting in that scenario.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WHATSAPP_API_URL,
 *      WHATSAPP_API_TOKEN, OPENWA_SESSION_ID, WF_DIGEST_TO (optional),
 *      LEAD_NOTIFY_WHATSAPP_NUMBER (optional)
 * Exit: 0 sent · 1 error · 2 unconfigured
 */
const { GatewayClient, requestJson, normalizeChatId } = require('../lib/gateway-client');
const sb = require('../lib/supabase-sync');

const DIGEST_TO = process.env.WF_DIGEST_TO || process.env.LEAD_NOTIFY_WHATSAPP_NUMBER || '';

function fmtMs(ms) {
  if (!Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const EXIT_AR = {
  ok: '✔ سليم',
  error: '✖ خطأ',
  timeout: '⏱ تجاوز الوقت',
  unconfigured: '⚠ غير مُهيَّأ',
};

async function countSince(table, isoSince) {
  if (!sb.configured()) return null;
  const url = `${(process.env.SUPABASE_URL || '').replace(/\/+$/, '')}/rest/v1/${table}` +
    `?select=id&created_at=gte.${encodeURIComponent(isoSince)}&limit=1000`;
  try {
    const res = await requestJson(url, { headers: sb.headers(), timeoutMs: 12000 });
    if (!res.ok) return null;
    return Array.isArray(res.data) ? res.data.length : null;
  } catch (_) {
    return null;
  }
}

async function main() {
  console.log('daily-digest: starting');
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  // 1. Gateway health
  const gw = new GatewayClient();
  let gwLine;
  let gwOk = false;
  try {
    const st = await gw.status();
    gwOk = st.status === 'ready';
    gwLine = gwOk
      ? `🟢 بوابة الواتساب: تعمل — ${st.phone || '?'} (${st.pushName || 'Sierra Estates'})`
      : `🟡 بوابة الواتساب: الحالة ${st.status}`;
  } catch (err) {
    gwLine = `🔴 بوابة الواتساب: غير متاحة (${err.message.slice(0, 60)})`;
  }

  // 2. Workflow estate (DB rows + success rates)
  let wfLines = [];
  try {
    const rows = await sb.getWorkflows(null);
    wfLines = rows.map((r) => {
      const rate = (r.success_rate ?? '?') + '%';
      const exit = String(r.last_run_label || '').replace(/^ec2-runner:/, '') || '—';
      const label = r.name_ar || r.name || r.slug;
      const at = r.last_run_at ? String(r.last_run_at).slice(0, 16).replace('T', ' ') : '—';
      return `• ${label}: ${EXIT_AR[exit] || exit} (${rate}) — آخر تشغيل ${at} (${fmtMs(r.last_run_ms)})`;
    });
  } catch (err) {
    wfLines = [`• تعذر قراءة سجل الأتمتة: ${err.message.slice(0, 60)}`];
  }

  // 3. Supabase counters (24 h)
  const [leads24, units24] = await Promise.all([
    countSince('leads', since),
    countSince('listings', since),
  ]);

  // 4. Compose
  const today = new Date().toISOString().slice(0, 10);
  const parts = [
    `🌇 ملخص Sierra Estates اليومي — ${today}`,
    '━━━━━━━━━━━━━━━━━━',
    gwLine,
    '',
    '📊 حالة الأتمتة:',
    ...wfLines,
    '',
    `🎯 عملاء جدد (24 ساعة): ${leads24 === null ? 'غير متاح' : leads24}`,
    `🏢 وحدات مضافة (24 ساعة): ${units24 === null ? 'غير متاح' : units24}`,
    '',
    '— تقرير آلي من منظومة التشغيل',
  ];
  const text = parts.join('\n');

  // 5. Delivery target
  let target = DIGEST_TO;
  if (!target) {
    try {
      const st = await gw.status();
      target = st.phone || '';
    } catch (_) { /* gateway already known bad */ }
  }
  if (!target) {
    console.log('UNCONFIGURED: no digest target — set WF_DIGEST_TO or LEAD_NOTIFY_WHATSAPP_NUMBER');
    process.exit(2);
  }

  const chatId = target.includes('@') ? target : normalizeChatId(target);
  if (!/^\d+@c\.us$/.test(chatId)) {
    console.log(`UNCONFIGURED: digest target unusable: "${target}"`);
    process.exit(2);
  }

  try {
    await gw.sendText(chatId, text, { retries: 2 });
  } catch (err) {
    console.error(`daily-digest FAILED: send error: ${err.message}`);
    process.exit(1);
  }

  console.log(`SUMMARY ${JSON.stringify({ sent: true, to: chatId, leads24, units24, gateway: gwOk })}`);
  console.log('daily-digest: done');
  process.exit(0);
}

main().catch((err) => {
  console.error(`daily-digest FAILED: ${err.message}`);
  process.exit(1);
});
