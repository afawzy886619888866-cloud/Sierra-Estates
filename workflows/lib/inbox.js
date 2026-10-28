'use strict';
/**
 * inbox.js — inbound WhatsApp consumer for the OpenWA gateway webhooks.
 * ────────────────────────────────────────────────────────────────────────
 * The gateway (OpenWA) supports per-session webhook subscriptions
 * (POST /api/sessions/{id}/webhooks with events like "message.received").
 * The runner exposes POST /api/inbound (X-API-Key guarded) as the delivery
 * target on the same box, and this module is the landing logic:
 *
 *   1. ALWAYS appends the raw delivery to .state/inbox.jsonl (rotating at
 *      ~2 MB to inbox.old.jsonl) — a durable, dependency-free audit trail.
 *   2. Group messages (@g.us): if Sheets credentials are configured
 *      (BROKER_INBOX_SHEET_ID + Google credentials), appends broker-group
 *      property chatter to the "raw_messages" tab.
 *   3. Direct 1-on-1 messages (@c.us): classifies owner replies
 *      (opt-out "إلغاء", available "متاحة", unavailable/sold "اتباعت",
 *      or negotiation/terms), persists opt-outs to .state/owner-outreach-optouts.jsonl,
 *      updates Supabase public.listings (respecting lifecycle trigger & Client Map
 *      status='active' for PUBLISHABLE rows) / public.leads, writes back to
 *      Google Sheets via WF_SHEET_WRITE_URL, and enqueues automated photo-harvest
 *      follow-up jobs in public.whatsapp_queue when eligible.
 */
const fs = require('fs');
const path = require('path');
const { loadWorkflowEnv, createSheetsClient } = require('./google-sheets');
const { requestJson } = require('./gateway-client');

loadWorkflowEnv(path.resolve(__dirname, '..'));

const STATE_DIR = process.env.WF_STATE_DIR || path.join(__dirname, '..', '.state');
const INBOX_FILE = path.join(STATE_DIR, 'inbox.jsonl');
const INBOX_OLD = `${INBOX_FILE}.old`;
const OPTOUT_FILE = path.join(STATE_DIR, 'owner-outreach-optouts.jsonl');
const MAX_BYTES = 2 * 1024 * 1024;

let sheetsClientCache = null;

function groupChatIds() {
  return (process.env.SCRAPER_GROUP_CHATIDS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
}

/** Normalize Egyptian mobile numbers from chatId or raw phone to E.164 (+201xxxxxxxxx). */
function normalizeOwnerPhone(raw) {
  if (!raw) return null;
  const cleaned = String(raw)
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/@.*$/, '')
    .replace(/\D/g, '');
  if (!cleaned) return null;
  let local = cleaned;
  if (local.startsWith('0020') && local.length === 14) local = local.slice(4);
  else if (local.startsWith('20') && local.length === 12) local = local.slice(2);
  if (local.startsWith('0') && local.length === 11 && /^01[0125]/.test(local)) {
    return `+20${local.slice(1)}`;
  }
  if (local.length === 10 && /^1[0125]/.test(local)) {
    return `+20${local}`;
  }
  return null;
}

/** Format current Cairo date DD/MM/YYYY for Google Sheet writeback parity. */
function cairoDateDmy(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
}

/** Write owner reply availability + contact date back to Google Sheets via Apps Script Web App. */
async function writeOwnerReplyToSheet(e164Phone, availabilityLabel, code) {
  const writeUrl = process.env.WF_SHEET_WRITE_URL || '';
  const writeSecret = process.env.WF_SHEET_WRITE_SECRET || '';
  if (!writeUrl || !writeSecret || !e164Phone) return false;

  const digits = e164Phone.replace(/\D/g, '');
  const localMobile = digits.startsWith('20') && digits.length === 12 ? `0${digits.slice(2)}` : e164Phone;
  const dateStr = cairoDateDmy();
  const rows = [
    { phone: localMobile, date: dateStr, availability: availabilityLabel, ...(code ? { code } : {}) },
  ];
  if (localMobile !== e164Phone) {
    rows.push({ phone: e164Phone, date: dateStr, availability: availabilityLabel, ...(code ? { code } : {}) });
  }

  try {
    const res = await fetch(writeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: writeSecret, rows }),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({}));
    return Boolean(res.ok && json.ok !== false);
  } catch (err) {
    console.warn(`inbox: Google Sheet writeback failed: ${err.message}`);
    return false;
  }
}

/** Best-effort extraction of {chatId, sender, body, ts, isGroup, fromMe} from a delivery. */
function extractMessage(body) {
  const b = body || {};
  const m = b.message || b.data || b.payload || b;
  const chatId = m.chatId || m.from || (m.chat && m.chat.id) || b.chatId || '';
  const sender = m.sender?.id || m.sender?._serialized || (typeof m.sender === 'string' ? m.sender : '') || m.participant || m.author || (m.from && String(m.from)) || '';
  const text = m.body || m.text || m.caption || (m.message && (m.message.conversation || m.message.extendedTextMessage?.text)) || '';
  const ts = m.timestamp || m.ts || b.timestamp || Date.now();
  const isGroup = String(chatId).endsWith('@g.us');
  const fromMe = Boolean(m.fromMe || b.fromMe);
  return { chatId: String(chatId), sender: String(sender), body: String(text), ts, isGroup, fromMe };
}

/**
 * Deterministic Arabic + English intent classifier for direct owner replies.
 * Returns 'opt_out' | 'unavailable' | 'available' | 'negotiation' | 'empty'.
 */
function classifyOwnerReply(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return 'empty';
  const normalized = text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه');

  // 1. Explicit opt-out ("إلغاء", "الغاء", "stop", "unsubscribe")
  if (/(?:^|\s)(الغاء|توقف|ازعاج|عدم ارسال|stop|unsubscribe|opt\s*out)(?:\s|$|[.!؟,])/i.test(normalized)) {
    return 'opt_out';
  }

  // 2. Explicit unavailable / sold / rented BEFORE available ("غير متاحة" contains "متاحة")
  if (/(غير متاح|مش متاح|ليست متاح|اتباع|تم البيع|اتاجر|تم الايجار|مؤجر|ماجر|خلاص اتباع|not available|unavailable|sold|rented)/i.test(normalized)) {
    return 'unavailable';
  }

  // 3. Explicit available confirmation
  if (/(متاح|موجود|لسه موجود|نعم متاح|ايوه متاح|available|still available)/i.test(normalized)) {
    return 'available';
  }

  return 'negotiation';
}

function appendJsonl(file, obj) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  try {
    const sz = fs.existsSync(file) ? fs.statSync(file).size : 0;
    if (sz > MAX_BYTES && file === INBOX_FILE) fs.renameSync(file, INBOX_OLD);
  } catch (err) {
    console.warn(`inbox: log rotation warning: ${err.message}`);
  }
  fs.appendFileSync(file, `${JSON.stringify(obj)}\n`);
}

function recordOptOut(e164Phone, rawChatId, reasonText) {
  if (!e164Phone) return false;
  const digits = e164Phone.replace(/\D/g, '');
  appendJsonl(OPTOUT_FILE, {
    phone: digits,
    e164: e164Phone,
    chatId: rawChatId,
    reason: String(reasonText || '').slice(0, 120),
    at: new Date().toISOString(),
  });
  return true;
}

function loadOptOutSet(stateDir = STATE_DIR) {
  const set = new Set();
  const file = path.join(stateDir, 'owner-outreach-optouts.jsonl');
  if (!fs.existsSync(file)) return set;
  try {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.phone) set.add(String(entry.phone).replace(/\D/g, ''));
        if (entry.e164) set.add(String(entry.e164).replace(/\D/g, ''));
      } catch {
        // ignore malformed line
      }
    }
  } catch (err) {
    console.warn(`inbox: failed reading opt-out ledger: ${err.message}`);
  }
  return set;
}

function sheetsClient() {
  if (sheetsClientCache !== null) return sheetsClientCache;
  const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID || '';
  if (!SHEET_ID) return null;
  const sheets = createSheetsClient(['https://www.googleapis.com/auth/spreadsheets']);
  if (!sheets) return null;
  sheetsClientCache = { sheetId: SHEET_ID, sheets };
  return sheetsClientCache;
}

async function appendToSheet(message) {
  const client = sheetsClient();
  if (!client) return false;
  const allow = groupChatIds();
  if (!message.isGroup) return false;
  if (allow.length && !allow.includes(message.chatId)) return false;
  if (!String(message.body).trim()) return false;
  try {
    await client.sheets.spreadsheets.values.append({
      spreadsheetId: client.sheetId,
      range: `'raw_messages'!A:F`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          new Date(Number(message.ts) || Date.now()).toISOString(),
          'whatsapp-inbound',
          message.chatId,
          message.sender,
          String(message.body).substring(0, 400),
          'PENDING',
        ]],
      },
    });
    return true;
  } catch (err) {
    console.error(`inbox: sheet append failed: ${err.message}`);
    return false;
  }
}

function sbConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return {
    url,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Closed-loop processing for 1-on-1 owner replies:
 *  - Opt-out ("إلغاء") -> local suppression ledger + sheet writeback
 *  - Available ("متاحة") -> updates matching listing status ('active' when PUBLISHABLE so Client Map stays synced, else 'available') + sheet writeback + queues photo request if needed
 *  - Unavailable ("اتباعت"/"اتأجرت") -> transitions matching listing via lifecycle ('reserved'->'sold' or 'off-market') so Client Map & PF immediately hide it + sheet writeback
 *  - Negotiation -> upserts owner lead for Stage-9 Closer follow-up
 */
async function handleDirectOwnerReply(message) {
  if (message.isGroup || message.fromMe) return { routed: false, intent: 'ignored' };
  const intent = classifyOwnerReply(message.body);
  if (intent === 'empty') return { routed: false, intent };

  const e164 = normalizeOwnerPhone(message.chatId || message.sender);
  if (!e164) return { routed: false, intent };
  const suffix9 = e164.replace(/\D/g, '').slice(-9);

  if (intent === 'opt_out') {
    recordOptOut(e164, message.chatId, message.body);
    await writeOwnerReplyToSheet(e164, 'Not available', null);
  }

  const sb = sbConfig();
  if (!sb) {
    return { routed: intent === 'opt_out', intent, e164, supabase: false };
  }

  let matchedListing = null;
  try {
    const res = await requestJson(
      `${sb.url}/rest/v1/listings?owner_phone=ilike.*${encodeURIComponent(suffix9)}*&select=id,code,compound,images,status,publish_status,owner_name,raw_data&limit=3`,
      { headers: sb.headers, timeoutMs: 8000 }
    );
    if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
      matchedListing = res.data[0];
    }
  } catch (err) {
    console.warn(`inbox: listing lookup failed: ${err.message}`);
  }

  let wasContactedOwner = Boolean(matchedListing);
  if (!wasContactedOwner) {
    try {
      const logRes = await requestJson(
        `${sb.url}/rest/v1/owner_outreach_log?phone=ilike.*${encodeURIComponent(suffix9)}*&select=id,listing_code&limit=1`,
        { headers: sb.headers, timeoutMs: 6000 }
      );
      if (logRes.ok && Array.isArray(logRes.data) && logRes.data.length > 0) {
        wasContactedOwner = true;
      }
    } catch {
      // non-fatal
    }
  }

  if (!wasContactedOwner && intent !== 'opt_out') {
    return { routed: false, intent, e164, knownOwner: false };
  }

  const nowIso = new Date().toISOString();
  let sheetUpdated = false;

  // 1. Update listing availability status + Google Sheet (never touching publish_status / human provenance)
  if (intent === 'available' || intent === 'unavailable') {
    const isSold = /(اتباع|تم البيع|sold)/i.test(message.body);
    const availabilityLabel = intent === 'available' ? 'Available' : (isSold ? 'Sold' : 'Not available');
    sheetUpdated = await writeOwnerReplyToSheet(e164, availabilityLabel, matchedListing?.code || null);

    if (matchedListing) {
      const prevRaw = (matchedListing.raw_data && typeof matchedListing.raw_data === 'object')
        ? matchedListing.raw_data
        : {};
      const nextRawData = {
        ...prevRaw,
        availability: availabilityLabel,
        last_owner_reply_at: nowIso,
      };

      const isPublishable = String(matchedListing.publish_status || '').toUpperCase() === 'PUBLISHABLE';
      const curStatus = String(matchedListing.status || '').toLowerCase();

      if (intent === 'available') {
        // Keep/set status='active' for PUBLISHABLE rows so public Client Map (/api/inventory) stays visible
        const targetStatus = isPublishable ? 'active' : 'available';
        await requestJson(`${sb.url}/rest/v1/listings?id=eq.${matchedListing.id}`, {
          method: 'PATCH',
          headers: { ...sb.headers, Prefer: 'return=minimal' },
          body: { status: targetStatus, availability: availabilityLabel, raw_data: nextRawData, updated_at: nowIso },
          timeoutMs: 8000,
        }).catch((err) => console.warn(`inbox: listing status update failed: ${err.message}`));
      } else {
        // Unavailable: respect Postgres lifecycle trigger (`published -> reserved -> sold` or `published -> off-market`)
        if (isSold && ['active', 'available', 'verified', 'published'].includes(curStatus)) {
          await requestJson(`${sb.url}/rest/v1/listings?id=eq.${matchedListing.id}`, {
            method: 'PATCH',
            headers: { ...sb.headers, Prefer: 'return=minimal' },
            body: { status: 'reserved', availability: availabilityLabel, raw_data: nextRawData, updated_at: nowIso },
            timeoutMs: 8000,
          }).catch(() => ({ ok: false }));
        }
        const finalPatch = await requestJson(`${sb.url}/rest/v1/listings?id=eq.${matchedListing.id}`, {
          method: 'PATCH',
          headers: { ...sb.headers, Prefer: 'return=minimal' },
          body: { status: isSold ? 'sold' : 'off-market', availability: availabilityLabel, raw_data: nextRawData, updated_at: nowIso },
          timeoutMs: 8000,
        }).catch(() => ({ ok: false }));

        if (!finalPatch || !finalPatch.ok) {
          await requestJson(`${sb.url}/rest/v1/listings?id=eq.${matchedListing.id}`, {
            method: 'PATCH',
            headers: { ...sb.headers, Prefer: 'return=minimal' },
            body: { status: 'off-market', availability: availabilityLabel, raw_data: nextRawData, updated_at: nowIso },
            timeoutMs: 8000,
          }).catch((err) => console.warn(`inbox: fallback off-market update failed: ${err.message}`));
        }
      }
    }
  }

  // 2. Upsert into public.leads for Closer / Advisor visibility
  let photoQueued = false;
  if (intent !== 'opt_out') {
    try {
      const existingLead = await requestJson(
        `${sb.url}/rest/v1/leads?phone=eq.${encodeURIComponent(e164)}&select=id&limit=1`,
        { headers: sb.headers, timeoutMs: 6000 }
      );
      const leadStage = intent === 'available' ? 'qualified' : intent === 'unavailable' ? 'closed' : 'negotiation';
      const leadPayload = {
        full_name: matchedListing?.owner_name || 'Direct Property Owner',
        phone: e164,
        source: 'whatsapp-owner-reply',
        origin_channel: 'OpenWA Owner Outreach Inbound',
        lead_type: 'seller',
        stage: leadStage,
        target_compound: matchedListing?.compound || null,
        asset_reference: matchedListing?.code || null,
        summary_notes: `[${intent.toUpperCase()}] ${String(message.body).slice(0, 300)}`,
        last_contact_at: nowIso,
        updated_at: nowIso,
      };
      if (existingLead.ok && Array.isArray(existingLead.data) && existingLead.data.length > 0) {
        await requestJson(`${sb.url}/rest/v1/leads?id=eq.${existingLead.data[0].id}`, {
          method: 'PATCH',
          headers: { ...sb.headers, Prefer: 'return=minimal' },
          body: leadPayload,
          timeoutMs: 6000,
        });
      } else {
        await requestJson(`${sb.url}/rest/v1/leads`, {
          method: 'POST',
          headers: { ...sb.headers, Prefer: 'return=minimal' },
          body: { ...leadPayload, created_at: nowIso },
          timeoutMs: 6000,
        });
      }
    } catch (err) {
      console.warn(`inbox: lead upsert failed: ${err.message}`);
    }

    // 3. Automated Photo-Harvest Follow-Up when owner confirms availability and unit lacks >=3 photos
    const imageList = Array.isArray(matchedListing?.images) ? matchedListing.images.filter((u) => /^https?:\/\//i.test(String(u || ''))) : [];
    if (intent === 'available' && matchedListing && imageList.length < 3) {
      const compoundLabel = matchedListing.compound ? ` في ${matchedListing.compound}` : '';
      const photoPrompt =
        `شكراً جزيلاً لتأكيد حضرتك إتاحة الوحدة${compoundLabel} 🌿\n\n` +
        `لرفع الوحدة ضمن العروض المميزة لعملائنا الجادين على منصات Sierra Estates وProperty Finder، هل يمكن لحضرتك إرسال صور واضحة للوحدة وتفاصيل السعر النهائي؟\n\n` +
        `خالص التقدير — فريق سييرا العقارية 🤝\n(لعدم استقبال رسائل أخرى، أرسل كلمة "إلغاء")`;
      const qRes = await requestJson(`${sb.url}/rest/v1/whatsapp_queue`, {
        method: 'POST',
        headers: { ...sb.headers, Prefer: 'return=minimal' },
        body: {
          recipient_phone: e164,
          message_body: photoPrompt,
          purpose: 'owner-negotiation',
          status: 'queued',
          metadata: {
            kind: 'auto-owner-photo-harvest',
            listing_id: matchedListing.id,
            listing_code: matchedListing.code,
          },
          created_at: nowIso,
          updated_at: nowIso,
        },
        timeoutMs: 6000,
      }).catch(() => ({ ok: false }));
      photoQueued = Boolean(qRes && qRes.ok);
    }
  }

  return {
    routed: true,
    intent,
    e164,
    matchedCode: matchedListing?.code || null,
    sheetUpdated,
    photoQueued,
  };
}

/** Handle one webhook delivery. Resolves {stored, sheet, directReply} — never throws. */
async function handleInbound(body) {
  const message = extractMessage(body);
  let stored = false;
  let sheet = false;
  let directReply = null;
  try {
    appendJsonl(INBOX_FILE, { receivedAt: new Date().toISOString(), body });
    stored = true;
  } catch (err) {
    console.error(`inbox: jsonl append failed: ${err.message}`);
  }
  try {
    if (message.isGroup) {
      sheet = await appendToSheet(message);
    } else {
      directReply = await handleDirectOwnerReply(message);
    }
  } catch (err) {
    console.error(`inbox: routing path failed: ${err.message}`);
  }
  return { stored, sheet, directReply, chatId: message.chatId, isGroup: message.isGroup };
}

/** Tail the inbox JSONL for the control API. */
function preview(n = 20) {
  try {
    const raw = fs.readFileSync(INBOX_FILE, 'utf8').trim();
    if (!raw) return [];
    return raw.split('\n').slice(-n).map((line) => {
      try { return JSON.parse(line); } catch { return { raw: line.slice(0, 300) }; }
    });
  } catch {
    return [];
  }
}

module.exports = {
  handleInbound,
  handleDirectOwnerReply,
  writeOwnerReplyToSheet,
  classifyOwnerReply,
  normalizeOwnerPhone,
  loadOptOutSet,
  recordOptOut,
  preview,
  extractMessage,
};
