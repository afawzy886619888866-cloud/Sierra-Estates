#!/usr/bin/env node
'use strict';

/**
 * two-hour-outreach-digest.js — Sierra Estates 2-Hour Outreach Radar & Digest
 * ──────────────────────────────────────────────────────────────────────────────
 * Evaluates owner outreach activity over the last 2 hours + today + all-time:
 *   1. Reads `.state/owner-outreach-ledger.jsonl` AND Supabase `owner_outreach_log`
 *   2. Reads `.state/owner-outreach-checkpoint.json`, `.state/owner-outreach-daily.json`,
 *      and `.state/owner-outreach-config.json`
 *   3. Queries `/api/sessions` on the OpenWA Gateway (:2785) for live line health
 *   4. Counts owner replies in the last 2 hours via `daily-outreach-report.js`
 *   5. Writes `.state/two-hour-outreach-report.json` for the Admin Dashboard (:2790 & Next.js)
 *   6. Sends a formatted Arabic executive summary via WhatsApp to the admin phone(s)
 *   7. Emits `SUMMARY {...}` on stdout for `runner.js` telemetry
 */

const fs = require('fs');
const path = require('path');
const { loadWorkflowEnv } = require('./google-sheets');
loadWorkflowEnv(path.join(__dirname, '..'));
const { GatewayClient } = require('./gateway-client');
const { buildDailyOutreachReport } = require('./daily-outreach-report');

const STATE_DIR = process.env.WF_STATE_DIR || path.join(__dirname, '..', '.state');
const LEDGER_FILE = path.join(STATE_DIR, 'owner-outreach-ledger.jsonl');
const DAILY_FILE = path.join(STATE_DIR, 'owner-outreach-daily.json');
const CHECKPOINT_FILE = path.join(STATE_DIR, 'owner-outreach-checkpoint.json');
const CONFIG_FILE = path.join(STATE_DIR, 'owner-outreach-config.json');
const TWO_HOUR_REPORT_FILE = path.join(STATE_DIR, 'two-hour-outreach-report.json');

function getCairoDateStr(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function getCairoTimeStr(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return d.toISOString().slice(11, 16);
  }
}

async function fetchGatewaySessions() {
  const baseUrl = (process.env.WHATSAPP_API_URL || 'http://127.0.0.1:2785').replace(/\/+$/, '');
  const token = process.env.OPENWA_OPERATOR_KEY || process.env.WHATSAPP_API_KEY || process.env.WHATSAPP_API_TOKEN || '';
  try {
    const res = await fetch(`${baseUrl}/api/sessions`, {
      headers: token ? { 'X-API-Key': token } : {},
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { all: [], ready: [] };
    const data = await res.json();
    const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.sessions) ? data.sessions : [];
    const ready = list.filter((s) => String(s.status || '').toLowerCase() === 'ready');
    return { all: list, ready };
  } catch {
    return { all: [], ready: [] };
  }
}

async function fetchSupabaseStats(twoHoursAgoIso, todayDate) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return { totalAllTime: 0, rowsToday: [] };
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const startOfDayIso = `${todayDate}T00:00:00+02:00`;
    const [{ count: totalAllTime }, { data: rowsToday }] = await Promise.all([
      supabase.from('owner_outreach_log').select('*', { count: 'exact', head: true }),
      supabase
        .from('owner_outreach_log')
        .select('phone, listing_code, session_name, direction, sheet_row_idx, availability, message_text, sent_at')
        .gte('sent_at', startOfDayIso)
        .order('sent_at', { ascending: true }),
    ]);
    return {
      totalAllTime: Number(totalAllTime || 0),
      rowsToday: Array.isArray(rowsToday) ? rowsToday : [],
    };
  } catch {
    return { totalAllTime: 0, rowsToday: [] };
  }
}

async function generateAndSendTwoHourDigest(options = {}) {
  const now = new Date();
  const twoHoursAgoMs = now.getTime() - 2 * 60 * 60 * 1000;
  const todayDate = getCairoDateStr(now);

  // 1. Parse local ledger entries
  let ledgerEntries = [];
  if (fs.existsSync(LEDGER_FILE)) {
    try {
      const raw = fs.readFileSync(LEDGER_FILE, 'utf8');
      for (const line of raw.split('\n')) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line);
          if (obj && obj.phone) ledgerEntries.push(obj);
        } catch (_) {}
      }
    } catch (_) {}
  }

  // 2. Fetch Supabase owner_outreach_log stats & merge today's rows
  const sbStats = await fetchSupabaseStats(new Date(twoHoursAgoMs).toISOString(), todayDate);
  const seenKeys = new Set(
    ledgerEntries.map((e) => `${String(e.phone || '').replace(/\D/g, '')}:${String(e.at || '').slice(0, 15)}`)
  );
  for (const r of sbStats.rowsToday) {
    const k = `${String(r.phone || '').replace(/\D/g, '')}:${String(r.sent_at || '').slice(0, 15)}`;
    if (!seenKeys.has(k)) {
      seenKeys.add(k);
      ledgerEntries.push({
        phone: r.phone,
        code: r.listing_code,
        session: r.session_name || 'default',
        direction: r.direction,
        idx: r.sheet_row_idx,
        avail: r.availability,
        text: r.message_text,
        at: r.sent_at,
      });
    }
  }

  const sentLast2h = ledgerEntries.filter((e) => {
    const ts = e.at ? Date.parse(e.at) : NaN;
    return Number.isFinite(ts) && ts >= twoHoursAgoMs;
  });

  const sentToday = ledgerEntries.filter((e) => {
    if (!e.at) return false;
    return getCairoDateStr(new Date(e.at)) === todayDate;
  });

  // 3. Daily state & config & checkpoint
  let dailyState = { date: todayDate, sent: sentToday.length };
  if (fs.existsSync(DAILY_FILE)) {
    try {
      const d = JSON.parse(fs.readFileSync(DAILY_FILE, 'utf8'));
      if (d.date === todayDate) dailyState = d;
    } catch (_) {}
  }

  let checkpoint = { topCursor: 0, bottomCursor: 0, totalCount: 0, completed: false };
  if (fs.existsSync(CHECKPOINT_FILE)) {
    try {
      checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
    } catch (_) {}
  }

  let config = { continuous: true, cooldownSec: 90, dailyCap: parseInt(process.env.WF_OWNER_CONTACT_DAILY_CAP || '150', 10), activeHours: [9, 22] };
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
    } catch (_) {}
  }

  // 4. Replies from daily report
  let recentRepliesCount = 0;
  let totalRepliesToday = 0;
  try {
    const dailyRep = buildDailyOutreachReport({ date: todayDate });
    if (dailyRep) {
      totalRepliesToday = Array.isArray(dailyRep.replies) ? dailyRep.replies.length : 0;
      if (Array.isArray(dailyRep.replies)) {
        recentRepliesCount = dailyRep.replies.filter((r) => {
          const ts = r.received_at ? Date.parse(r.received_at) : NaN;
          return Number.isFinite(ts) && ts >= twoHoursAgoMs;
        }).length;
      }
    }
  } catch (_) {}

  // 5. Gateway active lines
  const gw = new GatewayClient();
  const { all: allSessions, ready: readySessions } = await fetchGatewaySessions();
  const readyLines = readySessions.map((s) => `${s.id}${s.phone ? ` (+${s.phone})` : ''}`);
  const readyIds = readySessions.map((s) => s.id);

  // Breakdown by session in last 2h & today
  const bySession2h = {};
  for (const item of sentLast2h) {
    const s = item.session || 'default';
    bySession2h[s] = (bySession2h[s] || 0) + 1;
  }
  const bySessionToday = {};
  for (const item of sentToday) {
    const s = item.session || 'default';
    bySessionToday[s] = (bySessionToday[s] || 0) + 1;
  }

  const dailyCap = Number(config.dailyCap || process.env.WF_OWNER_CONTACT_DAILY_CAP || 150);
  const totalTodayCount = Math.max(sentToday.length, dailyState.sent || 0);
  const totalAllTimeCount = Math.max(sbStats.totalAllTime, ledgerEntries.length);
  const topCursor = checkpoint.topCursor ?? checkpoint.cursor ?? 0;
  const bottomCursor = checkpoint.bottomCursor ?? checkpoint.totalCount ?? 0;
  const totalCandidates = checkpoint.totalCount || 0;

  const reportPayload = {
    generated_at: now.toISOString(),
    cairo_date: todayDate,
    cairo_time: getCairoTimeStr(now),
    window_hours: 2,
    sent_in_last_2h: sentLast2h.length,
    sent_today_total: totalTodayCount,
    total_all_time: totalAllTimeCount,
    daily_cap: dailyCap,
    replies_in_last_2h: recentRepliesCount,
    replies_today_total: totalRepliesToday,
    top_cursor: topCursor,
    bottom_cursor: bottomCursor,
    total_candidates: totalCandidates,
    ready_lines: readyIds.length ? readyIds : readyLines,
    ready_lines_detailed: readySessions.map((s) => ({ id: s.id, phone: s.phone, pushName: s.pushName })),
    all_lines_status: allSessions.map((s) => ({ id: s.id, status: s.status, phone: s.phone })),
    continuous_mode: Boolean(config.continuous),
    sessions_used_2h: bySession2h,
    sessions_used_today: bySessionToday,
    recent_sent: ledgerEntries.slice(-10).reverse().map((e) => ({
      phone: e.phone,
      code: e.code,
      session: e.session,
      at: e.at,
      idx: e.idx,
      text: e.text,
    })),
  };

  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(TWO_HOUR_REPORT_FILE, JSON.stringify(reportPayload, null, 2), 'utf8');
  } catch (err) {
    console.warn(`[2h-digest] Failed saving report file: ${err.message}`);
  }

  const sessionLinesText = Object.keys(bySession2h).length
    ? Object.entries(bySession2h).map(([k, v]) => `• ${k}: ${v} رسالة`).join('\n')
    : '• لا توجد إرسالات جديدة في آخر ساعتين';

  const readySummaryText = readySessions.length
    ? readySessions.map((s) => `${s.id} (+${s.phone || '?'})`).join(' ، ')
    : '⚠️ لا يوجد خط متصل حالياً';

  const messageText = [
    `📊 *تقرير متابعة تواصل الملاك (كل ساعتين) — Sierra Estates*`,
    `🕒 *التوقيت:* ${reportPayload.cairo_time} (${todayDate})`,
    `────────────────────`,
    `✅ *المرسل خلال آخر ساعتين:* ${reportPayload.sent_in_last_2h} مالك`,
    `📈 *إجمالي المرسل اليوم:* ${reportPayload.sent_today_total} / ${reportPayload.daily_cap} مالك`,
    `🗂️ *إجمالي الملاك المتواصل معهم (الكلي):* ${reportPayload.total_all_time} مالك`,
    `💬 *ردود الملاك (آخر ساعتين / اليوم):* ${reportPayload.replies_in_last_2h} / ${reportPayload.replies_today_total}`,
    `📱 *الخطوط المتصلة (${readySessions.length}):* ${readySummaryText}`,
    `🔄 *وضع التشغيل الذاتي:* ${reportPayload.continuous_mode ? 'نشط تلقائياً (09:00–22:00)' : 'متوقف مؤقتاً'}`,
    `📍 *مؤشر التقدم في الشيت:* من أعلى #${topCursor} | من أسفل #${bottomCursor} (إجمالي ${totalCandidates})`,
    `────────────────────`,
    `📡 *توزيع الإرسال (آخر ساعتين):*`,
    sessionLinesText,
    `────────────────────`,
    `🤖 _يعمل النظام تلقائياً في الخلفية حتى عند إغلاق البرنامج، ويمكن التحكم الكامل من لوحة الإدارة._`,
  ].join('\n');

  const sendWhatsApp = options.sendWhatsApp !== false;
  const targetPhones = Array.from(
    new Set(
      [
        options.adminPhone,
        process.env.ADMIN_REPORT_PHONE,
        process.env.WF_DIGEST_TO,
        '201061399688',
        '201092048333',
      ]
        .filter(Boolean)
        .map((p) => String(p).replace(/\D/g, ''))
        .filter((p) => p.length >= 10)
    )
  );

  const deliveredTo = [];
  if (sendWhatsApp && readySessions.length > 0) {
    for (const targetPhone of targetPhones) {
      try {
        // Prefer a sender session whose own phone is different from targetPhone so it arrives as a standard notification
        const preferredSender =
          readySessions.find((s) => String(s.phone || '').replace(/\D/g, '') !== targetPhone) ||
          readySessions[0];
        await gw.sendText(targetPhone, messageText, { sessionId: preferredSender.id });
        deliveredTo.push(`${targetPhone} (via ${preferredSender.id})`);
        console.log(`[2h-digest] Sent 2-hour report to ${targetPhone} via ${preferredSender.id}`);
      } catch (err) {
        console.warn(`[2h-digest] Failed sending WhatsApp digest to ${targetPhone}: ${err.message}`);
      }
    }
  }

  return { ...reportPayload, deliveredTo, messageText };
}

if (require.main === module) {
  generateAndSendTwoHourDigest()
    .then((res) => {
      const summary = {
        cairoTime: res.cairo_time,
        sentLast2h: res.sent_in_last_2h,
        sentToday: res.sent_today_total,
        totalAllTime: res.total_all_time,
        readyLines: res.ready_lines,
        deliveredTo: res.deliveredTo,
      };
      console.log('[2h-digest] Completed:', JSON.stringify(summary));
      console.log(`SUMMARY ${JSON.stringify(summary)}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[2h-digest] Fatal:', err);
      process.exit(1);
    });
}

module.exports = { generateAndSendTwoHourDigest };
