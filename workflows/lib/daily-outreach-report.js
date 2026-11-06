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
  if (/متاح|متاحه|متاحة|فاضية|فاضيه|لسه|لسة|موجود|موجودة|yes|available/i.test(t)) {
    return { category: 'available', label: 'الوحدة متاحة' };
  }
  if (/اتباعت|اتأجرت|اتاجرت|تم البيع|تم التأجير|خلاص|مش متاح|sold|rented/i.test(t)) {
    return { category: 'unavailable', label: 'تم البيع أو الإيجار' };
  }
  if (/سعر|كام|تأجير|تفاوض|نهائي|عمولة|تفاصيل|صور|price|negotiate/i.test(t)) {
    return { category: 'negotiating', label: 'تفاوض / استفسار عن السعر' };
  }
  return { category: 'general_reply', label: 'رد عام' };
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

  // 3. Read Inbound Replies (Direct 1-on-1 DM messages from owners ONLY)
  const responses = [];
  const respondentPhones = new Set();
  if (fs.existsSync(INBOX_FILE)) {
    try {
      const lines = fs.readFileSync(INBOX_FILE, 'utf8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const rawObj = JSON.parse(line);
          const d = rawObj.data || rawObj;
          const from = String(d.from || d.chatId || d.sender || '');
          
          // STRICT RULE: Only consider direct owner messages (@c.us), NEVER broker group messages (@g.us)
          if (d.isGroupMsg || from.endsWith('@g.us')) continue;

          const cleanSender = normalizePhone(from);
          if (!cleanSender) continue;

          const body = typeof d.body === 'string' ? d.body : (typeof d.caption === 'string' ? d.caption : '');
          if (!body || body.length < 2) continue;

          const replyTime = d.timestamp ? new Date(d.timestamp * 1000).toISOString() : (rawObj.at || new Date().toISOString());
          const replyDate = replyTime.slice(0, 10);

          if (replyDate === targetDate) {
            const classification = classifyReply(body);
            const unitInfo = contactedMap.get(cleanSender) || null;
            respondentPhones.add(cleanSender);
            responses.push({
              phone: cleanSender,
              text: body,
              replyTime,
              category: classification.category,
              label: classification.label,
              unit: unitInfo
            });
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  // Summary counts
  const totalSentToday = todaySent.length || contactedMap.size;
  const totalAnswersToday = responses.length;
  const responseRatePct = totalSentToday > 0 ? ((totalAnswersToday / totalSentToday) * 100).toFixed(1) : '0.0';

  const categoryBreakdown = {
    available: responses.filter(r => r.category === 'available').length,
    unavailable: responses.filter(r => r.category === 'unavailable').length,
    negotiating: responses.filter(r => r.category === 'negotiating').length,
    opt_out: responses.filter(r => r.category === 'opt_out').length,
    general_reply: responses.filter(r => r.category === 'general_reply').length,
  };

  // 4. Update outreach_respondent_owners.csv
  try {
    const csvHeader = 'Code,OwnerName,Phone,Compound,Price,Bedrooms,DealType,Category,ReplyLabel,ReplyText,ReplyTime\n';
    let csvBody = '';
    for (const r of responses) {
      const u = r.unit || {};
      const row = [
        `"${u.code || ''}"`,
        `"${u.name || ''}"`,
        `"${r.phone}"`,
        `"${u.location || ''}"`,
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
      totalAnswered: totalAnswersToday,
      responseRate: `${responseRatePct}%`,
      breakdown: categoryBreakdown
    },
    respondents: responses,
    respondentsCsvPath: RESPONDENTS_CSV,
    contactedCsvPath: CONTACTED_CSV
  };

  return report;
}

if (require.main === module) {
  const rep = generateDailyOutreachReport();
  console.log(JSON.stringify(rep, null, 2));
}

module.exports = { generateDailyOutreachReport };
