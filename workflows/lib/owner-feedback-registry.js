'use strict';

/**
 * Sierra Estates — Owner Feedback Registry (سجل فيدباك الملاك)
 * ──────────────────────────────────────────────────────────────
 * Merges the outreach ledger, inbox DMs, and respondent CSV into a
 * single enriched owner registry with feedback status.
 *
 * Output categories:
 *   available     → الوحدة متاحة (priority inventory)
 *   negotiating   → تفاوض / تفاصيل مالية
 *   broker        → بروكر / وسيط → move to Excluded_Brokers tab
 *   unavailable   → اتباعت / اتأجرت (sold/rented)
 *   blocked       → رقم محظور / غير قابل للتسليم
 *   opt_out       → إلغاء اشتراك
 *   no_reply      → تم التواصل بدون رد
 *   general_reply → رد مالك (رسالة / صوتي)
 *
 * Writes to Google Sheet tabs via WF_SHEET_WRITE_URL:
 *   Owner_Feedback_Available, Owner_Feedback_Negotiating,
 *   Owner_Feedback_Inactive (sold/blocked/opt_out),
 *   Excluded_Brokers
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT_DIR, 'workflows', '.state');
const LEDGER_FILE = path.join(STATE_DIR, 'owner-outreach-ledger.jsonl');
const INBOX_FILE = path.join(STATE_DIR, 'inbox.jsonl');
const REGISTRY_FILE = path.join(STATE_DIR, 'owner-feedback-registry.json');
const CONTACTED_CSV = path.join(ROOT_DIR, 'data', 'outreach_contacted_units.csv');

const { classifyReply } = require('./daily-outreach-report');

function getCairoDate(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function getCairoIso(d = new Date()) {
  try {
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function normalizePhone(raw) {
  if (!raw) return '';
  let s = String(raw).replace(/[^\d+]/g, '');
  // Handle WhatsApp international prefix: if already starts with 00, leave it
  // but normalize to plain digits for dedup key
  s = s.replace(/^\+/, '');
  // Remove leading 00 (international dialing prefix)
  s = s.replace(/^00/, '');
  // Egypt: 0XX → 20XX
  if (/^0[12]/.test(s)) s = '20' + s.slice(1);
  return s;
}

function toDisplayPhone(norm) {
  if (!norm || norm.startsWith('LID:')) return norm;
  if (norm.startsWith('20') && norm.length === 12) return '0' + norm.slice(2);
  return norm;
}

/**
 * Build the full owner feedback registry from all data sources.
 * @returns {{ registry: Object[], stats: Object, tabs: Object }}
 */
function buildOwnerFeedbackRegistry() {
  // ─── 1. Load outreach ledger (all phones we ever contacted) ───
  const ledgerMap = new Map(); // phone → { code, at, avail, session, idx, direction }
  if (fs.existsSync(LEDGER_FILE)) {
    const lines = fs.readFileSync(LEDGER_FILE, 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const e = JSON.parse(line);
        const phone = normalizePhone(e.phone);
        if (!phone) continue;
        // Keep the latest entry per phone
        if (!ledgerMap.has(phone) || (e.at && e.at > (ledgerMap.get(phone).at || ''))) {
          ledgerMap.set(phone, {
            phone,
            code: e.code || '',
            outreachAt: e.at || '',
            avail: e.avail || '',
            session: e.session || 'line-1',
            idx: e.idx,
            direction: e.direction || '',
          });
        }
      } catch (_) {}
    }
  }

  // ─── 2. Load contacted units CSV for enrichment ───
  const contactedMap = new Map();
  if (fs.existsSync(CONTACTED_CSV)) {
    try {
      const lines = fs.readFileSync(CONTACTED_CSV, 'utf8').split('\n').filter(Boolean);
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(s => s.replace(/^"|"$/g, '').trim());
        if (parts.length >= 8) {
          const [code, name, rawPhone, location, price, bedrooms, dealType, contactDate, session] = parts;
          const cleanPhone = normalizePhone(rawPhone);
          if (cleanPhone) {
            contactedMap.set(cleanPhone, { code, name, location, price, bedrooms, dealType, contactDate });
          }
        }
      }
    } catch (_) {}
  }

  // ─── 3. Parse inbox for DM replies (1-on-1 only) ───
  const replyMap = new Map(); // phone → { texts[], images, videos, docs, voiceNotes, lastReplyAt, pushName }
  if (fs.existsSync(INBOX_FILE)) {
    const lines = fs.readFileSync(INBOX_FILE, 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const rawObj = JSON.parse(line);
        const inner = rawObj.body && typeof rawObj.body === 'object' ? rawObj.body : rawObj;
        const d = inner.data || inner;
        if (!d || d.fromMe === true) continue;
        const from = String(d.from || d.chatId || (typeof d.sender === 'string' ? d.sender : d.sender?.id) || '');

        // Only 1-on-1 DMs
        if (d.isGroupMsg || from.endsWith('@g.us') || from.includes('status@broadcast') || !from) continue;

        const msgType = String(d.type || 'chat').toLowerCase();
        const rawText = typeof d.caption === 'string' && d.caption.trim()
          ? d.caption.trim()
          : (typeof d.body === 'string' ? d.body.trim() : '');

        // Skip internal pings
        if (/تجربة ربط واتساب|رد تجربة واتساب|اختبار الإرسال بصيغة/i.test(rawText)) continue;

        const isBase64 = /^\/9j\/|^iVBOR/i.test(rawText);
        const cleanText = isBase64 ? '' : rawText;

        // Resolve phone
        const isLid = from.endsWith('@lid');
        let cleanSender = '';
        if (!isLid) {
          cleanSender = normalizePhone(from.split('@')[0]);
        } else {
          const hintStr = `${d.sender?.pushname || ''} ${d.chatName || ''} ${cleanText}`;
          const m = hintStr.match(/(?:201[0125]\d{8}|01[0125]\d{8})/);
          if (m) cleanSender = normalizePhone(m[0]);
          else cleanSender = `LID:${from.split('@')[0]}`;
        }
        if (!cleanSender) continue;

        const tsNum = Number(d.timestamp || 0);
        const replyTime = rawObj.receivedAt
          || (tsNum > 0 && tsNum < 2000000000 ? new Date(tsNum * 1000).toISOString() : new Date().toISOString());

        const pushName = d.sender?.pushname || d.sender?.verifiedName || d.chatName || '';

        if (!replyMap.has(cleanSender)) {
          replyMap.set(cleanSender, {
            texts: [], images: 0, videos: 0, docs: 0, voiceNotes: 0,
            lastReplyAt: replyTime, pushName,
          });
        }
        const bucket = replyMap.get(cleanSender);
        if (replyTime > bucket.lastReplyAt) bucket.lastReplyAt = replyTime;
        if (pushName && !bucket.pushName) bucket.pushName = pushName;
        if (cleanText && !bucket.texts.includes(cleanText)) bucket.texts.push(cleanText);
        if (msgType === 'image') bucket.images += 1;
        else if (msgType === 'video') bucket.videos += 1;
        else if (msgType === 'document') bucket.docs += 1;
        else if (msgType === 'ptt' || msgType === 'audio') bucket.voiceNotes += 1;
      } catch (_) {}
    }
  }

  // ─── 4. Merge into unified registry ───
  const allPhones = new Set([...ledgerMap.keys(), ...replyMap.keys()]);
  const registry = [];

  for (const phone of allPhones) {
    const ledger = ledgerMap.get(phone);
    const reply = replyMap.get(phone);
    const contacted = contactedMap.get(phone);

    // Build combined reply text for classification
    let combinedText = '';
    let mediaCount = 0;
    if (reply) {
      const mediaParts = [];
      if (reply.images > 0) mediaParts.push(`${reply.images} صور`);
      if (reply.videos > 0) mediaParts.push(`${reply.videos} فيديو`);
      if (reply.docs > 0) mediaParts.push(`${reply.docs} مستند`);
      if (reply.voiceNotes > 0) mediaParts.push(`${reply.voiceNotes} رسالة صوتية`);
      mediaCount = reply.images + reply.videos + reply.docs + reply.voiceNotes;
      combinedText = [
        reply.texts.join(' | '),
        mediaParts.length > 0 ? `[مرفقات: ${mediaParts.join(' + ')}]` : '',
      ].filter(Boolean).join(' ');
    }

    // Classify
    let category = 'no_reply';
    let label = 'تم التواصل بدون رد';
    if (combinedText) {
      const cls = classifyReply(combinedText);
      category = cls.category;
      label = cls.label;
    }

    // Determine last status update time
    const lastStatusAt = reply?.lastReplyAt || ledger?.outreachAt || '';

    const entry = {
      phone,
      displayPhone: toDisplayPhone(phone),
      ownerName: reply?.pushName || contacted?.name || 'مالك عقار',
      unitCode: ledger?.code || contacted?.code || '',
      compound: contacted?.location || '',
      price: contacted?.price || '',
      bedrooms: contacted?.bedrooms || '',
      dealType: contacted?.dealType || '',
      areaSqm: '',
      category,
      label,
      replyText: combinedText || '',
      mediaCount,
      outreachAt: ledger?.outreachAt || contacted?.contactDate || '',
      lastStatusAt,
      lastStatusDate: lastStatusAt ? getCairoDate(new Date(lastStatusAt)) : '',
      session: ledger?.session || '',
      source: ledger ? 'outreach' : 'dm_inbound',
    };

    registry.push(entry);
  }

  // Sort: available first, then negotiating, then general_reply, then rest
  const catOrder = { available: 0, negotiating: 1, general_reply: 2, broker: 3, unavailable: 4, blocked: 5, opt_out: 6, no_reply: 7 };
  registry.sort((a, b) => (catOrder[a.category] ?? 99) - (catOrder[b.category] ?? 99));

  // ─── 5. Build tab splits ───
  const tabs = {
    available: registry.filter(r => r.category === 'available'),
    negotiating: registry.filter(r => r.category === 'negotiating'),
    brokers: registry.filter(r => r.category === 'broker'),
    inactive: registry.filter(r => ['unavailable', 'blocked', 'opt_out'].includes(r.category)),
    no_reply: registry.filter(r => r.category === 'no_reply'),
    general_reply: registry.filter(r => r.category === 'general_reply'),
  };

  // ─── 6. Statistics ───
  const stats = {
    totalContacted: ledgerMap.size,
    totalReplied: replyMap.size,
    responseRate: ledgerMap.size > 0 ? ((replyMap.size / ledgerMap.size) * 100).toFixed(1) + '%' : '0%',
    breakdown: {
      available: tabs.available.length,
      negotiating: tabs.negotiating.length,
      broker: tabs.brokers.length,
      unavailable: tabs.inactive.filter(r => r.category === 'unavailable').length,
      blocked: tabs.inactive.filter(r => r.category === 'blocked').length,
      opt_out: tabs.inactive.filter(r => r.category === 'opt_out').length,
      no_reply: tabs.no_reply.length,
      general_reply: tabs.general_reply.length,
    },
    generatedAt: getCairoIso(),
    generatedDate: getCairoDate(),
  };

  // ─── 7. Persist to disk ───
  const output = { stats, registry, tabs: { available: tabs.available.length, negotiating: tabs.negotiating.length, brokers: tabs.brokers.length, inactive: tabs.inactive.length, no_reply: tabs.no_reply.length, general_reply: tabs.general_reply.length } };
  try {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(output, null, 2), 'utf8');
    console.log(`[registry] Written ${registry.length} entries → ${REGISTRY_FILE}`);
  } catch (err) {
    console.warn('[registry] Failed to write:', err.message);
  }

  return { registry, stats, tabs };
}

/**
 * Get the set of phones that should be excluded from future outreach.
 * Used by outreach.js to skip contacts that are broker/blocked/opt_out/unavailable.
 * @returns {Set<string>} normalized phones to skip
 */
function loadFeedbackExcludeSet() {
  const excludeSet = new Set();
  // Try the cached registry first
  if (fs.existsSync(REGISTRY_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
      for (const entry of data.registry || []) {
        if (['broker', 'blocked', 'opt_out', 'unavailable'].includes(entry.category)) {
          excludeSet.add(entry.phone);
        }
      }
      return excludeSet;
    } catch (_) {}
  }
  // Fallback: build fresh
  const { registry } = buildOwnerFeedbackRegistry();
  for (const entry of registry) {
    if (['broker', 'blocked', 'opt_out', 'unavailable'].includes(entry.category)) {
      excludeSet.add(entry.phone);
    }
  }
  return excludeSet;
}

/**
 * Sync registry tabs to Google Sheet via WF_SHEET_WRITE_URL.
 * @returns {Promise<{ ok: boolean, results: Object[] }>}
 */
async function syncRegistryToSheet() {
  const WRITE_URL = process.env.WF_SHEET_WRITE_URL;
  const WRITE_SECRET = process.env.WF_SHEET_WRITE_SECRET;
  if (!WRITE_URL || !WRITE_SECRET) {
    console.warn('[registry] WF_SHEET_WRITE_URL or SECRET not set — skipping sheet sync');
    return { ok: false, error: 'Missing sheet write credentials' };
  }

  const { registry, stats, tabs } = buildOwnerFeedbackRegistry();
  const results = [];

  const sheetTabs = [
    { tabName: 'Owner_Feedback_Available', data: tabs.available },
    { tabName: 'Owner_Feedback_Negotiating', data: tabs.negotiating },
    { tabName: 'Excluded_Brokers', data: tabs.brokers },
    { tabName: 'Owner_Feedback_Inactive', data: tabs.inactive },
  ];

  for (const { tabName, data } of sheetTabs) {
    if (data.length === 0) {
      results.push({ tab: tabName, rows: 0, status: 'empty' });
      continue;
    }
    try {
      const rows = data.map(r => ({
        phone: r.displayPhone,
        owner_name: r.ownerName,
        unit_code: r.unitCode,
        compound: r.compound,
        price: r.price,
        bedrooms: r.bedrooms,
        deal_type: r.dealType,
        category: r.category,
        label: r.label,
        reply_text: (r.replyText || '').slice(0, 500),
        media_count: r.mediaCount,
        outreach_date: r.outreachAt ? r.outreachAt.slice(0, 10) : '',
        last_status_date: r.lastStatusDate,
      }));

      const payload = {
        secret: WRITE_SECRET,
        action: 'replace_tab',
        tab: tabName,
        headers: ['Phone', 'Owner Name', 'Unit Code', 'Compound', 'Price', 'Bedrooms', 'Deal Type', 'Category', 'Label', 'Reply Text', 'Media', 'Outreach Date', 'Last Status Date'],
        rows: rows.map(r => [r.phone, r.owner_name, r.unit_code, r.compound, r.price, r.bedrooms, r.deal_type, r.category, r.label, r.reply_text, r.media_count, r.outreach_date, r.last_status_date]),
      };

      const resp = await fetch(WRITE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });
      const text = await resp.text();
      results.push({ tab: tabName, rows: rows.length, status: resp.ok ? 'synced' : 'error', response: text.slice(0, 200) });
    } catch (err) {
      results.push({ tab: tabName, rows: data.length, status: 'error', error: err.message });
    }
  }

  return { ok: results.every(r => r.status !== 'error'), stats, results };
}

// CLI
if (require.main === module) {
  const arg = process.argv[2];
  if (arg === '--sync') {
    syncRegistryToSheet().then(r => console.log(JSON.stringify(r, null, 2)));
  } else {
    const { registry, stats } = buildOwnerFeedbackRegistry();
    console.log(JSON.stringify({ stats, sampleEntries: registry.slice(0, 10) }, null, 2));
  }
}

module.exports = { buildOwnerFeedbackRegistry, loadFeedbackExcludeSet, syncRegistryToSheet };
