'use strict';

/**
 * Sierra Estates — Daily Outreach & Response Intelligence Report
 * ─────────────────────────────────────────────────────────────
 * Cross-references contacted property owners with inbound replies.
 * Generates structured analytics:
 *   - Total Contacted today (e.g. 400)
 *   - Total Answers received (e.g. 40)
 *   - Response Rate & Sentiment Classification (Available, Sold, Negotiating, Opt-Out)
 *   - Persists all respondent owners to data/outreach_respondent_owners.csv
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT_DIR, 'workflows', '.state');
const CONTACTED_CSV = path.join(ROOT_DIR, 'data', 'outreach_contacted_units.csv');
const RESPONDENTS_CSV = path.join(ROOT_DIR, 'data', 'outreach_respondent_owners.csv');
const LEDGER_FILE = path.join(STATE_DIR, 'owner-outreach-ledger.jsonl');
const INBOX_FILE = path.join(STATE_DIR, 'inbox.jsonl');

function getCairoDate(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(d); // YYYY-MM-DD
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function normalizePhone(raw) {
  if (!raw) return '';
  return String(raw).replace(/\D/g, '').replace(/^00/, '').replace(/^0/, '20');
}

function classifyReply(text) {
  const t = String(text || '').trim().toLowerCase();
  if (/إلغاء|الغاء|stop|unsubscribe|مش عاوز|لا ترسل/i.test(t)) {
    return { category: 'opt_out', label: 'إلغاء اشتراك' };
  }
  if (/متاح|متاحه|متاحة|فاضية|فاضيه|جهزه|جاهزه|جاهزة|ايوه|أيوة|لسه|لسة|موجود|موجودة|ستديو|شقة|فيلا|بريفادو|مدينتي|yes|available/i.test(t)) {
    return { category: 'available', label: 'الوحدة متاحة / تفاصيل مالك' };
  }
  if (/اتباعت|اتأجرت|اتاجرت|تم البيع|تم التأجير|خلاص|مش متاح|sold|rented/i.test(t)) {
    return { category: 'unavailable', label: 'تم البيع أو الإيجار' };
  }
  if (/سعر|كام|تأجير|تفاوض|نهائي|عمولة|عموله|تفاصيل|صور|اوڤر|أوفر|المدفوع|price|negotiate/i.test(t)) {
    return { category: 'negotiating', label: 'تفاوض / تفاصيل مالية' };
  }
  return { category: 'general_reply', label: 'رد مالك (رسالة / صوتي)' };
}

function generateDailyOutreachReport(targetDate = getCairoDate()) {
  // 1. Read contacted units
  const contactedMap = new Map(); // phone -> { code, name, phone, location, price, bedrooms, dealType, date, session }
  if (fs.existsSync(CONTACTED_CSV)) {
    try {
      const lines = fs.readFileSync(CONTACTED_CSV, 'utf8').split('\n').filter(Boolean);
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(s => s.replace(/^"|"$/g, '').trim());
        if (parts.length >= 8) {
          const [code, name, rawPhone, location, price, bedrooms, dealType, contactDate, session] = parts;
          const cleanPhone = normalizePhone(rawPhone);
          contactedMap.set(cleanPhone, {
            code, name, phone: cleanPhone, location, price, bedrooms, dealType, contactDate, session
          });
        }
      }
    } catch (_) {}
  }

  // 2. Read JSONL ledger for today
  const todaySent = [];
  if (fs.existsSync(LEDGER_FILE)) {
    try {
      const lines = fs.readFileSync(LEDGER_FILE, 'utf8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const entryDate = entry.at ? entry.at.slice(0, 10) : '';
          if (entryDate === targetDate) {
            todaySent.push(entry);
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  // 3. Read Inbound Replies (Direct 1-on-1 DM messages from owners ONLY, grouped by owner)
  const senderBuckets = new Map();
  if (fs.existsSync(INBOX_FILE)) {
    try {
      const lines = fs.readFileSync(INBOX_FILE, 'utf8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const rawObj = JSON.parse(line);
          const inner = rawObj.body && typeof rawObj.body === 'object' ? rawObj.body : rawObj;
          const d = inner.data || inner;
          if (!d || d.fromMe === true) continue; // Ignore our own outbound messages
          const from = String(d.from || d.chatId || (typeof d.sender === 'string' ? d.sender : d.sender?.id) || '');

          // STRICT RULE: Only consider direct 1-on-1 owner messages (@c.us or @lid), NEVER group messages (@g.us) or status broadcasts
          if (d.isGroupMsg || from.endsWith('@g.us') || from.includes('status@broadcast') || !from) continue;

          const msgType = String(d.type || 'chat').toLowerCase();
          const rawText = typeof d.caption === 'string' && d.caption.trim()
            ? d.caption.trim()
            : (typeof d.body === 'string' ? d.body.trim() : '');

          // Skip internal line-to-line diagnostic pings
          if (/تجربة ربط واتساب|رد تجربة واتساب|اختبار الإرسال بصيغة/i.test(rawText)) continue;

          const isBase64Thumb = /^\/9j\/|^iVBOR/i.test(rawText);
          const cleanText = isBase64Thumb ? '' : rawText;

          // Extract phone from @c.us or fallback to sender pushname / LID identifier
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
          const replyDate = getCairoDate(new Date(replyTime));
          const sessionId = inner.sessionId || rawObj.sessionId || 'line-1';
          const unitInfo = contactedMap.get(cleanSender) || null;
          const senderPushName = d.sender?.pushname || d.sender?.verifiedName || d.chatName || (unitInfo ? unitInfo.name : 'مالك عقار');

          if (!senderBuckets.has(cleanSender)) {
            senderBuckets.set(cleanSender, {
              phone: cleanSender,
              ownerName: unitInfo?.name || senderPushName,
              texts: [],
              images: 0,
              videos: 0,
              docs: 0,
              voiceNotes: 0,
              replyTime,
              replyDate,
              sessionId,
              unit: unitInfo,
            });
          }
          const bucket = senderBuckets.get(cleanSender);
          bucket.replyTime = replyTime;
          bucket.replyDate = replyDate;
          if (cleanText && !bucket.texts.includes(cleanText)) {
            bucket.texts.push(cleanText);
          }
          if (msgType === 'image') bucket.images += 1;
          else if (msgType === 'video') bucket.videos += 1;
          else if (msgType === 'document') bucket.docs += 1;
          else if (msgType === 'ptt' || msgType === 'audio') bucket.voiceNotes += 1;
        } catch (_) {}
      }
    } catch (_) {}
  }

  const responses = [];
  const allResponses = [];
  for (const b of senderBuckets.values()) {
    const mediaParts = [];
    if (b.images > 0) mediaParts.push(`${b.images} صور`);
    if (b.videos > 0) mediaParts.push(`${b.videos} فيديو`);
    if (b.docs > 0) mediaParts.push(`${b.docs} مستند`);
    if (b.voiceNotes > 0) mediaParts.push(`${b.voiceNotes} رسالة صوتية`);
    const combinedText = [
      b.texts.join(' | '),
      mediaParts.length > 0 ? `[مرفقات: ${mediaParts.join(' + ')}]` : '',
    ].filter(Boolean).join(' ');
    if (!combinedText) continue;

    const classification = classifyReply(combinedText);
    const entryObj = {
      phone: b.phone,
      ownerName: b.ownerName,
      text: combinedText,
      replyTime: b.replyTime,
      replyDate: b.replyDate,
      sessionId: b.sessionId,
      category: classification.category,
      label: classification.label,
      unit: b.unit,
    };
    allResponses.push(entryObj);
    if (b.replyDate === targetDate) {
      responses.push(entryObj);
    }
  }

  const effectiveResponses = responses.length > 0 ? responses : allResponses;

  // Summary counts
  const totalSentToday = todaySent.length || contactedMap.size;
  const totalAnswersToday = effectiveResponses.length;
  const responseRatePct = totalSentToday > 0 ? ((totalAnswersToday / totalSentToday) * 100).toFixed(1) : '0.0';

  const categoryBreakdown = {
    available: effectiveResponses.filter(r => r.category === 'available').length,
    unavailable: effectiveResponses.filter(r => r.category === 'unavailable').length,
    negotiating: effectiveResponses.filter(r => r.category === 'negotiating').length,
    opt_out: effectiveResponses.filter(r => r.category === 'opt_out').length,
    general_reply: effectiveResponses.filter(r => r.category === 'general_reply').length,
  };

  // 4. Update outreach_respondent_owners.csv with all captured respondent DMs
  try {
    const csvHeader = 'Code,OwnerName,Phone,Compound,Price,Bedrooms,DealType,Category,ReplyLabel,ReplyText,ReplyTime\n';
    let csvBody = '';
    for (const r of allResponses) {
      const u = r.unit || {};
      const row = [
        `"${u.code || 'DM-INBOUND'}"`,
        `"${String(r.ownerName || u.name || 'مالك عقار').replace(/"/g, '""')}"`,
        `"${r.phone}"`,
        `"${u.location || 'New Cairo'}"`,
        `"${u.price || ''}"`,
        `"${u.bedrooms || ''}"`,
        `"${u.dealType || ''}"`,
        `"${r.category}"`,
        `"${r.label}"`,
        `"${String(r.text).replace(/"/g, '""').replace(/\r|\n/g, ' ')}"`,
        `"${r.replyTime}"`
      ].join(',');
      csvBody += row + '\n';
    }
    fs.writeFileSync(RESPONDENTS_CSV, csvHeader + csvBody, 'utf8');
  } catch (err) {
    console.warn('[daily-report] Failed to write respondents CSV:', err.message);
  }

  const report = {
    date: targetDate,
    generatedAt: new Date().toISOString(),
    metrics: {
      totalSent: totalSentToday,
      totalHistoricalContacted: contactedMap.size,
      totalAnswered: totalAnswersToday,
      totalAllTimeAnswered: allResponses.length,
      responseRate: `${responseRatePct}%`,
      breakdown: categoryBreakdown
    },
    respondents: effectiveResponses,
    respondentsCsvPath: RESPONDENTS_CSV,
    contactedCsvPath: CONTACTED_CSV
  };

  console.log(`SUMMARY ${JSON.stringify(report.metrics)}`);
  return report;
}

if (require.main === module) {
  const rep = generateDailyOutreachReport();
  console.log(JSON.stringify(rep, null, 2));
}

module.exports = { generateDailyOutreachReport };
