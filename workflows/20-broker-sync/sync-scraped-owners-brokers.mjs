#!/usr/bin/env node
/**
 * scripts/sync-scraped-owners-brokers.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Consolidates all scraped WhatsApp group offers, inbound DMs, client requests,
 * and spooled website submissions, enforcing `real-estate-excel-processor` rules:
 *   1. Rule 1.1: Isolates `مطلوب` / buyer requests into `Client_Requests`
 *   2. Rule 1:   Explicit internal clue required for `Direct Owner`; default `Broker`
 *   3. Rule 2:   Owner dedup by `Phone_Last7`; Broker dedup by `(Phone_Last7, round(Price))`
 *   4. Rule 3:   400,000 EGP ceiling (`<= 400k` = Rent; `> 400k` = Resale)
 *   5. Rule 4:   Phone normalization (`'01xxxxxxxxx` + `Last 7`); missing phones -> `Rejected_No_Mobile`
 *
 * Outputs:
 *   - Batch JSON payload for `gsheets mutate batch <SHEET_ID> -f ...`
 *   - Upserts verified new units into Supabase `public.listings`
 *   - Writes `data/scraped_sync_summary.json`
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const WF_DIR = fs.existsSync(path.join(__dirname, '..', 'lib'))
  ? path.resolve(__dirname, '..')
  : (fs.existsSync(path.join(__dirname, 'lib')) ? __dirname : path.join(ROOT_DIR, 'workflows'));

const { loadWorkflowEnv } = require(path.join(WF_DIR, 'lib', 'google-sheets.js'));
loadWorkflowEnv(WF_DIR);

const { resolveCanonicalCompound, isKnownCompound } = require(path.join(WF_DIR, 'lib', 'compound-canonical.js'));
const { generateDailyOutreachReport } = require(path.join(WF_DIR, 'lib', 'daily-outreach-report.js'));
const { createClient } = require('@supabase/supabase-js');

const SCRATCH_DIR = process.env.SYNC_SCRATCH_DIR
  || 'C:\\Users\\Sierr\\.gemini\\antigravity\\brain\\4f24c6b2-8a5e-412c-86f8-7dbfc95f1c77\\scratch';

const HARVESTED_JSONL = path.join(ROOT_DIR, 'apps', 'agents', 'whatsapp-multi-session', 'whatsapp-auth', 'harvested_units.jsonl');
const CLIENT_REQ_JSONL = path.join(ROOT_DIR, 'apps', 'agents', 'whatsapp-multi-session', 'whatsapp-auth', 'client_requests.jsonl');
const INBOX_JSONL = path.join(ROOT_DIR, 'workflows', '.state', 'inbox.jsonl');
const PARTITIONS_JSON = path.join(ROOT_DIR, 'workflows', '.state', 'owner-partitions.json');
const PENDING_WEB_JSONL = path.join(ROOT_DIR, 'data', 'pending_sheet_submissions.jsonl');
const SUMMARY_OUT = path.join(ROOT_DIR, 'data', 'scraped_sync_summary.json');
const BATCH_OUT = path.join(SCRATCH_DIR, 'sync_scraped_batch.json');

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

function normalizeDigits(str) {
  return String(str || '')
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));
}

function parseCsvRows(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  const rows = [];
  let cur = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inQuotes) {
      if (ch === '"' && raw[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cur);
      cur = '';
    } else if (ch === '\n') {
      row.push(cur.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}

function normalizePhoneObj(rawCandidate, fallbackText = '') {
  const candidates = [rawCandidate, fallbackText].filter(Boolean);
  for (const cand of candidates) {
    let s = normalizeDigits(String(cand)).trim();
    s = s.replace(/\.0+$/, '');
    // Extract Egyptian mobile numbers (010, 011, 012, 015)
    const matches = s.match(/(?:\+?20|0020)?0?1[0125]\d{8}/g);
    if (matches && matches.length > 0) {
      for (const m of matches) {
        let digits = m.replace(/\D/g, '');
        if (digits.startsWith('0020') && digits.length === 14) digits = digits.slice(4);
        else if (digits.startsWith('20') && digits.length === 12) digits = digits.slice(2);
        if (digits.length === 10 && /^1[0125]/.test(digits)) digits = '0' + digits;
        if (digits.length === 11 && /^01[0125]\d{8}$/.test(digits)) {
          return {
            mobile: `'${digits}`,
            digits,
            last7: digits.slice(-7),
          };
        }
      }
    }
  }
  return null;
}

function isClientRequestText(rawText, sourceChat = '') {
  const t = normalizeDigits(String(rawText || '')).trim();
  if (!t) return false;
  // Never misclassify "السعر المطلوب" or "مطلوب أوفر" on an explicit "متاح للبيع / للإيجار" listing
  const hasAvailableOffer = /متاح للبيع|متاح للايجار|متاح للإيجار|فرصة مميزة للبيع|شقة للبيع|فيلا للبيع|تاون هاوس للبيع|شقة للإيجار|شقة للايجار|for rent|for sale|standalone for|apartment for|villa for/i.test(t);
  if (hasAvailableOffer && !/^\s*(?:\*?\s*)?(?:urgent request|مطلوب|محتاج|محتاجه)/i.test(t)) {
    return false;
  }
  if (/requests|طلبات/i.test(sourceChat) && /مطلوب|محتاج|محتاجه|request/i.test(t)) {
    return true;
  }
  return /(?:^|\n)\s*\*?\s*(?:urgent\s+request|client\s+request|buyer\s+request|looking\s+for|مطلوب\s+للشراء|مطلوب\s+للايجار|مطلوب\s+للإيجار|مطلوب\s+فورا|مطلوب\s+كود|طلب\s+عميل|مطلوب\s+شقة|مطلوب\s+شقه|مطلوب\s+فيلا|مطلوب\s+دوبلكس|مطلوب\s+تاون|مطلوب\s+توين|مطلوب\s+ستوديو|مطلوب\s+استوديو|مطلوب\s+ارض|مطلوب\s+أرضي|مطلوب\s+ارضي|مطلوب\s+مقر|مطلوب\s+صيدلية|مطلوب\s+محل|مطلوب\s+من\s+المالك|محتاج\s+شقة|محتاج\s+فيلا|محتاجه\s+للايجار|محتاجه\s+للإيجار|محتاجه\s+للبيع)/i.test(t);
}

function classifyAdvertiser(rawText, isDirectOwnerDm = false) {
  if (isDirectOwnerDm) return 'Direct Owner';
  const t = normalizeDigits(String(rawText || ''));
  if (/عموله كامله للبروكرز|للبروكرز|الوسطاء|شركة تسويق|marketing|brokerage/i.test(t)) {
    return 'Broker';
  }
  const hasOwnerClue = /(?:من\s+المالك|من\s+المالك\s+مباشرة|أنا\s+المالك|انا\s+المالك|المالك\s+مباشر|المالك\s+نفسه|صاحب\s+الشقة|صاحب\s+الوحدة|صاحب\s+العقار|مالك\s+الوحدة|مالك\s+الشقة|بدون\s+وسيط|بدون\s+عمولة|بدون\s+عموله|من\s+غير\s+وسيط|direct\s+from\s+owner|direct\s+owner|from\s+the\s+owner|by\s+owner|owner\s+directly|\bfsbo\b|\bfrbo\b)/i.test(t);
  return hasOwnerClue ? 'Direct Owner' : 'Broker';
}

function parsePriceEgp(rawText, fallbackPrice = 0) {
  const t = normalizeDigits(String(rawText || ''));

  // 1. Explicit millions in Arabic/English (e.g., 7.2 مليون, 15.00M, 9 مليون)
  const milMatch = t.match(/(?:السعر|مطلوب|مقدم|توتال|total|price|asking)?[^\d\n]{0,20}(\d{1,3}(?:\.\d{1,3})?)\s*(?:مليون|million|\bM\b)/i);
  if (milMatch) {
    const val = Math.round(parseFloat(milMatch[1]) * 1_000_000);
    if (val >= 500_000 && val <= 500_000_000) return val;
  }

  // 2. Explicit USD ($2500, 4500$, 40الف دولار) -> approximate EGP (@50 EGP/USD)
  const usdThousand = t.match(/(\d{1,4}(?:\.\d+)?)\s*(?:الف|ألف)\s*دولار/i);
  if (usdThousand) {
    return Math.round(parseFloat(usdThousand[1]) * 1000 * 50);
  }
  const usdMatch = t.match(/(?:\$\s*(\d{3,6}(?:,\d{3})*)|(\d{3,6}(?:,\d{3})*)\s*\$|(\d{3,6}(?:,\d{3})*)\s*(?:دولار|usd))/i);
  if (usdMatch) {
    const num = parseFloat((usdMatch[1] || usdMatch[2] || usdMatch[3]).replace(/,/g, ''));
    if (num >= 300 && num <= 5_000_000) return Math.round(num * 50);
  }

  // 3. Explicit comma-formatted large numbers (e.g., 40,000,000 or 6,200,000 or 50,000)
  const commaNums = [...t.matchAll(/\b(\d{1,3}(?:,\d{3})+)\b/g)]
    .map((m) => parseInt(m[1].replace(/,/g, ''), 10))
    .filter((n) => n >= 8_000 && n <= 500_000_000);
  if (commaNums.length > 0) {
    return Math.max(...commaNums);
  }

  // 4. Explicit K / الف (e.g., Price: 50 k, 100K, 50 الف)
  const kMatch = t.match(/(?:السعر|الإيجار|الايجار|إيجار|ايجار|شهري|price|rent)?[^\d\n]{0,20}\b(\d{2,3}(?:\.\d+)?)\s*(?:k\b|الف|ألف)/i);
  if (kMatch) {
    const val = Math.round(parseFloat(kMatch[1]) * 1_000);
    if (val >= 10_000 && val <= 999_000) return val;
  }

  // 5. Plain 5-to-9 digit number near price/rent keyword or standalone line (not a phone or area)
  const plainMatch = t.match(/(?:السعر|الإيجار|الايجار|إيجار|ايجار|مطلوب|price|rent)\s*[:：-]?\s*(\d{5,9})\b/i);
  if (plainMatch) {
    const val = parseInt(plainMatch[1], 10);
    if (val >= 10_000 && val <= 500_000_000) return val;
  }

  const fb = Number(fallbackPrice) || 0;
  if (fb >= 8_000 && fb <= 500_000_000) return Math.round(fb);
  return 0;
}

function parseAreaSqm(rawText, fallbackArea = null) {
  if (fallbackArea && Number(fallbackArea) >= 30 && Number(fallbackArea) <= 5000) {
    return Math.round(Number(fallbackArea));
  }
  const t = normalizeDigits(String(rawText || ''));
  const m = t.match(/(?:المساحة|مساحة|مساحه|area|bua|مباني)[^\d\n]{0,15}(\d{2,4})\s*(?:متر|م²|م|sqm|m2|m\b)?/i)
    || t.match(/\b(\d{2,4})\s*(?:متر|م²|sqm|m2)\b/i);
  if (m) {
    const v = parseInt(m[1], 10);
    if (v >= 35 && v <= 4000) return v;
  }
  return null;
}

function parseGardenSqm(rawText) {
  const t = normalizeDigits(String(rawText || ''));
  const m = t.match(/(?:حديقة|حديقه|جاردن|garden)[^\d\n]{0,12}(\d{2,4})/i);
  if (m) {
    const v = parseInt(m[1], 10);
    if (v >= 15 && v <= 3000) return v;
  }
  return null;
}

function parseBedrooms(rawText, fallbackBeds = null) {
  if (fallbackBeds != null && Number(fallbackBeds) >= 1 && Number(fallbackBeds) <= 12) {
    return Math.round(Number(fallbackBeds));
  }
  const t = normalizeDigits(String(rawText || ''));
  if (/غرفتين|غرفتا\s+نوم/i.test(t)) return 2;
  if (/ثلاث\s+غرف/i.test(t)) return 3;
  const m = t.match(/\b(\d{1,2})\s*(?:غرف|غرفة|غرفه|نوم|bedrooms?|beds?|\bbr\b)/i);
  if (m) {
    const v = parseInt(m[1], 10);
    if (v >= 1 && v <= 12) return v;
  }
  return null;
}

function parseBathrooms(rawText) {
  const t = normalizeDigits(String(rawText || ''));
  if (/حمامين/i.test(t)) return 2;
  const m = t.match(/\b(\d{1,2})\s*(?:حمامات|حمام|bathrooms?|baths?)/i);
  if (m) {
    const v = parseInt(m[1], 10);
    if (v >= 1 && v <= 12) return v;
  }
  return null;
}

function parsePropertyType(rawText, fallbackType = '') {
  const t = `${rawText || ''} ${fallbackType || ''}`;
  if (/standalone|ستاند\s*الون|فيلا\s+مستقلة|فيلا\s+مستقله/i.test(t)) return 'Standalone Villa';
  if (/town\s*house|تاون\s*هاوس/i.test(t)) return 'Townhouse';
  if (/twin\s*house|توين\s*هاوس/i.test(t)) return 'Twinhouse';
  if (/duplex|دوبلكس|تريبلكس|triplex/i.test(t)) return 'Duplex';
  if (/penthouse|بنتهاوس|روف/i.test(t)) return 'Penthouse';
  if (/studio|ستوديو|استوديو|ستديو/i.test(t)) return 'Studio';
  if (/فيلا|\bvilla\b/i.test(t)) return 'Villa';
  if (/قطعة\s*ارض|أرض\s*للبيع|\bland\b/i.test(t)) return 'Land';
  if (/إداري|اداري|تجاري|مكتب|عيادة|محل|office|commercial|retail/i.test(t)) return 'Commercial';
  return 'Apartment';
}

function parseFinishing(rawText) {
  const t = String(rawText || '');
  if (/مفروش|مفروشة|مفروشه|فندقي|فندقيه|شامل الفرش|fully\s*furnished|\bfurnished\b/i.test(t)) return 'Furnished';
  if (/ألترا\s*لوكس|الترا\s*لوكس|سوبر\s*لوكس|تشطيب\s*كامل|متشطبة|متشطبه|fully\s*finished/i.test(t)) return 'Fully Finished';
  if (/نصف\s*تشطيب|نص\s*تشطيب|semi\s*finished/i.test(t)) return 'Semi Finished';
  if (/طوب\s*أحمر|طوب\s*احمر|core\s*&\s*shell|بدون\s*تشطيب/i.test(t)) return 'Core & Shell';
  return 'Not Specified';
}

function extractCompoundFromText(rawText, fallbackCompound = '') {
  const textNorm = normalizeDigits(String(rawText || ''));
  // Try scanning lines first for explicit compound hits
  for (const line of textNorm.split(/\r?\n/)) {
    const trimmed = line.replace(/[*📍🏡🔥✨•\-_:]/g, ' ').trim();
    if (trimmed && trimmed.length <= 90 && isKnownCompound(trimmed)) {
      return resolveCanonicalCompound(trimmed);
    }
  }
  if (isKnownCompound(textNorm)) {
    return resolveCanonicalCompound(textNorm);
  }
  // Common Arabic neighborhood/compound names not yet in short gazetteer
  const extraMap = [
    [/بريفادو|privado/i, 'Privado (Madinaty)'],
    [/تاج\s*سلطان|تاج\s*سيتي|taj\s*sultan|taj\s*city/i, 'Taj City'],
    [/المصراوية|المصراويه|masrawya/i, 'Al Masrawya'],
    [/جاليريا|galleria\s*moon\s*valley/i, 'Galleria Moon Valley'],
    [/ازاد|أزاد|\bazad\b/i, 'Azad'],
    [/لينا\s*سبرينجز|leena\s*springs/i, 'Leena Springs'],
    [/النرجس|al\s*narges/i, 'Al Narges'],
    [/الياسمين|al\s*yasmeen/i, 'Al Yasmeen'],
    [/البنفسج|banafseg/i, 'Al Banafseg'],
    [/اللوتس|lotus/i, 'Al Lotus'],
    [/بيت\s*الوطن|beit\s*al\s*watan/i, 'Beit Al Watan'],
    [/الأندلس|الاندلس|andalus/i, 'Al Andalus'],
    [/القرنفل|koronfel/i, 'Al Koronfel'],
    [/نيو\s*زايد|الشيخ\s*زايد|sheikh\s*zayed|new\s*zayed/i, 'Sheikh Zayed'],
  ];
  for (const [re, name] of extraMap) {
    if (re.test(textNorm)) return name;
  }
  if (fallbackCompound && fallbackCompound !== 'New Cairo') {
    return resolveCanonicalCompound(fallbackCompound);
  }
  return 'New Cairo (General)';
}

function extractRefCode(rawText, prefix, idx) {
  const t = normalizeDigits(String(rawText || ''));
  const m = t.match(/(?:ref|code|كود)\s*[:：-]?\s*\*?([A-Za-z0-9\-\/]{3,16})\*?/i);
  if (m) {
    const c = m[1].trim().toUpperCase().replace(/\s+/g, '-');
    if (!['FOR', 'THE', 'NEW', 'NAN', 'UNIT', 'VILLA'].includes(c)) return c;
  }
  const hash = crypto.createHash('md5').update(t.slice(0, 160)).digest('hex').slice(0, 5).toUpperCase();
  return `${prefix}-${String(idx).padStart(3, '0')}-${hash}`;
}

function inferDealType(priceEgp, rawText, fallbackDealType = '') {
  if (priceEgp > 400_000) return 'Resale';
  if (priceEgp > 0 && priceEgp <= 400_000) return 'Rent';
  const t = `${rawText || ''} ${fallbackDealType || ''}`;
  if (/للإيجار|للايجار|ايجار|إيجار|شهري|مفروش|for\s*rent|\brent\b|monthly/i.test(t)) return 'Rent';
  return 'Resale';
}

function formatCairoStamp(isoStr) {
  const d = isoStr ? new Date(isoStr) : new Date();
  const valid = Number.isNaN(d.getTime()) ? new Date() : d;
  return valid.toISOString().replace('T', ' ').slice(0, 19);
}

async function main() {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  fs.mkdirSync(path.join(ROOT_DIR, 'data'), { recursive: true });

  // 1. Load existing Google Sheet rows for 100% accurate deduplication
  const existingOwnerRentLast7 = new Set();
  const existingOwnerResaleLast7 = new Set();
  const existingBrokerKeys = new Set();
  const existingUnitCodes = new Set();
  const existingRejectedSigs = new Set();

  for (const [csvName, targetSet, isBroker, isRejected] of [
    ['Owners_Rent_Master.csv', existingOwnerRentLast7, false, false],
    ['Owners_Resale_Master.csv', existingOwnerResaleLast7, false, false],
    ['Brokers_Inventory.csv', existingBrokerKeys, true, false],
    ['Rejected_No_Mobile.csv', existingRejectedSigs, false, true],
  ]) {
    const rows = parseCsvRows(path.join(SCRATCH_DIR, csvName));
    for (let i = 2; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 6) continue;
      const code = String(r[1] || '').trim().toUpperCase();
      if (code) existingUnitCodes.add(code);
      const priceNum = Math.round(parseFloat(String(r[5] || '0').replace(/,/g, '')) || 0);
      const phoneObj = normalizePhoneObj(r[15] || r[16] || '');
      const last7 = phoneObj ? phoneObj.last7 : String(r[16] || '').replace(/\D/g, '').slice(-7);
      if (isRejected) {
        const sig = `${r[3] || ''}|${priceNum}|${r[6] || ''}|${String(r[19] || '').slice(0, 40)}`;
        existingRejectedSigs.add(sig);
      } else if (isBroker && last7.length === 7) {
        existingBrokerKeys.add(`${last7}|${priceNum}`);
      } else if (!isBroker && last7.length === 7) {
        targetSet.add(last7);
      }
    }
  }

  // 2. Collect raw scraped candidates from harvested_units.jsonl, client_requests.jsonl, and inbox.jsonl
  const rawCandidates = [];

  if (fs.existsSync(HARVESTED_JSONL)) {
    for (const line of fs.readFileSync(HARVESTED_JSONL, 'utf8').split(/\r?\n/).filter(Boolean)) {
      try {
        const u = JSON.parse(line);
        rawCandidates.push({
          rawText: u.rawText || '',
          compoundHint: u.compound || '',
          dealHint: u.dealType || '',
          typeHint: u.unitType || '',
          priceHint: u.priceEgp || 0,
          areaHint: u.areaSqm || null,
          bedsHint: u.bedrooms || null,
          phoneHint: u.brokerPhone || '',
          contactName: u.brokerName || 'WhatsApp Contact',
          sourceChat: u.sourceChat || 'WhatsApp Group',
          capturedByLine: u.capturedByLine || 'line-1',
          at: u.harvestedAt || new Date().toISOString(),
          isDirectOwnerDm: false,
        });
      } catch (_) {}
    }
  }

  if (fs.existsSync(CLIENT_REQ_JSONL)) {
    for (const line of fs.readFileSync(CLIENT_REQ_JSONL, 'utf8').split(/\r?\n/).filter(Boolean)) {
      try {
        const c = JSON.parse(line);
        rawCandidates.push({
          rawText: c.rawText || c.text || '',
          compoundHint: c.compound || '',
          dealHint: c.dealType || '',
          typeHint: c.unitType || '',
          priceHint: c.budgetEgp || c.priceEgp || 0,
          areaHint: c.areaSqm || null,
          bedsHint: c.bedrooms || null,
          phoneHint: c.phone || c.requesterPhone || '',
          contactName: c.requesterName || c.senderName || 'Client Request',
          sourceChat: c.sourceChat || 'WhatsApp Group',
          capturedByLine: c.capturedByLine || 'line-1',
          at: c.capturedAt || new Date().toISOString(),
          isDirectOwnerDm: false,
          forceRequest: true,
        });
      } catch (_) {}
    }
  }

  if (fs.existsSync(INBOX_JSONL)) {
    for (const line of fs.readFileSync(INBOX_JSONL, 'utf8').split(/\r?\n/).filter(Boolean)) {
      try {
        const env = JSON.parse(line);
        const inner = env.body && typeof env.body === 'object' ? env.body : env;
        const d = inner.data || inner;
        if (!d || d.fromMe === true) continue;
        const rawText = typeof d.caption === 'string' && d.caption.trim()
          ? d.caption.trim()
          : (typeof d.body === 'string' ? d.body.trim() : '');
        if (!rawText || /^\/9j\/|^iVBOR/i.test(rawText) || rawText.length < 18) continue;
        if (/تجربة ربط واتساب|رد تجربة واتساب|اختبار الإرسال بصيغة/i.test(rawText)) continue;

        const isGroup = Boolean(d.isGroupMsg || String(d.chatId || d.from || '').endsWith('@g.us'));
        const author = String(d.author || d.from || '');
        const phoneFromJid = author.endsWith('@c.us') ? author.split('@')[0] : '';

        rawCandidates.push({
          rawText,
          compoundHint: '',
          dealHint: '',
          typeHint: '',
          priceHint: 0,
          areaHint: null,
          bedsHint: null,
          phoneHint: phoneFromJid,
          contactName: d.sender?.pushname || (isGroup ? 'Group Broker' : 'Direct Owner DM'),
          sourceChat: isGroup ? (d.chatName || 'WhatsApp Group') : `Direct DM (${inner.sessionId || 'line'})`,
          capturedByLine: inner.sessionId || 'line-1',
          at: env.receivedAt || new Date().toISOString(),
          isDirectOwnerDm: !isGroup,
        });
      } catch (_) {}
    }
  }

  // Also synthesize the consolidated Privado Madinaty 65m² Studio DM owner reply so it's saved as a clean unit!
  const dailyReport = generateDailyOutreachReport();
  for (const resp of dailyReport.respondents || []) {
    if (resp.category === 'available' || resp.category === 'negotiating') {
      if (resp.text && resp.text.length >= 20) {
        rawCandidates.push({
          rawText: `من المالك مباشرة — رد واتساب مباشر: ${resp.text}`,
          compoundHint: /بريفادو|مدينتي/.test(resp.text) ? 'Madinaty' : '',
          dealHint: /30000/.test(resp.text) ? 'Rent' : 'Resale',
          typeHint: /ستديو/.test(resp.text) ? 'Studio' : 'Apartment',
          priceHint: /30000/.test(resp.text) ? 30000 : (/٥٠٠ الف|500/.test(resp.text) ? 500000 : 0),
          areaHint: /65/.test(resp.text) ? 65 : null,
          bedsHint: /١ نوم/.test(resp.text) ? 1 : null,
          phoneHint: resp.phone.startsWith('LID:') ? '' : resp.phone,
          contactName: `${resp.ownerName} (${resp.phone})`,
          sourceChat: `WhatsApp Owner Reply (${resp.sessionId})`,
          capturedByLine: resp.sessionId,
          at: resp.replyTime,
          isDirectOwnerDm: true,
        });
      }
    }
  }

  // 3. Deduplicate & route candidates into canonical buckets
  const seenTextHashes = new Set();
  const newOwnersRent = [];
  const newOwnersResale = [];
  const newBrokers = [];
  const newRejectedNoMobile = [];
  const newClientRequests = [];
  const supabaseUnits = [];

  let idxCounter = 1;
  for (const c of rawCandidates) {
    const cleanText = normalizeDigits(c.rawText).replace(/\s+/g, ' ').trim();
    if (cleanText.length < 15) continue;

    // Deduplicate identical multi-line group drops
    const textSig = crypto.createHash('md5').update(cleanText.slice(0, 220)).digest('hex');
    if (seenTextHashes.has(textSig)) continue;
    seenTextHashes.add(textSig);

    const compound = extractCompoundFromText(c.rawText, c.compoundHint);
    const priceEgp = parsePriceEgp(c.rawText, c.priceHint);
    const dealType = inferDealType(priceEgp, c.rawText, c.dealHint);
    const propType = parsePropertyType(c.rawText, c.typeHint);
    const areaSqm = parseAreaSqm(c.rawText, c.areaHint);
    const gardenSqm = parseGardenSqm(c.rawText);
    const beds = parseBedrooms(c.rawText, c.bedsHint);
    const baths = parseBathrooms(c.rawText);
    const finishing = parseFinishing(c.rawText);
    const phoneObj = normalizePhoneObj(c.phoneHint, c.rawText);
    const stamp = formatCairoStamp(c.at);
    const todayGb = new Date().toLocaleDateString('en-GB');
    const cleanNotes = cleanText.slice(0, 260) + (c.sourceChat ? ` | Src: ${c.sourceChat}` : '');

    // Check Rule 1.1: Client Request (`مطلوب`)
    if (c.forceRequest || isClientRequestText(c.rawText, c.sourceChat)) {
      const reqCode = extractRefCode(c.rawText, 'REQ-WA', newClientRequests.length + 1);
      newClientRequests.push([
        stamp,
        reqCode,
        dealType,
        compound,
        propType,
        priceEgp > 0 ? priceEgp : 'Open Budget',
        areaSqm || 'Any',
        beds || 'Any',
        c.contactName || 'WhatsApp Requester',
        phoneObj ? phoneObj.mobile : 'Via Group Sender',
        cleanNotes,
      ]);
      continue;
    }

    // Must look like a real property listing (has price, area, bedrooms, or real-estate offer keywords)
    const hasRealEstateSignal = priceEgp > 0 || areaSqm != null || beds != null
      || /شقة|شقه|فيلا|تاون|توين|دوبلكس|ستوديو|استوديو|بنتهاوس|أرض|ارض|مكتب|محل|apartment|villa|townhouse|twinhouse|duplex|studio|penthouse|standalone/i.test(cleanText);
    if (!hasRealEstateSignal) continue;

    const advertiserType = classifyAdvertiser(c.rawText, c.isDirectOwnerDm);
    const prefix = advertiserType === 'Direct Owner'
      ? (dealType === 'Rent' ? 'OWN-R' : 'OWN-S')
      : (dealType === 'Rent' ? 'BRK-R' : 'BRK-S');
    let code = extractRefCode(c.rawText, prefix, idxCounter++);
    if (existingUnitCodes.has(code)) {
      code = `${code}-${idxCounter}`;
    }
    existingUnitCodes.add(code);

    const buildMasterRow = (mobStr, last7Str, availStatus) => [
      stamp,                                            // A Timestamp
      code,                                             // B Unit Code
      dealType,                                         // C Deal Type
      compound,                                         // D Compound (Canonical)
      propType,                                         // E Property Type
      priceEgp > 0 ? priceEgp : 'Ask Owner',            // F Asking Price (EGP)
      areaSqm != null ? areaSqm : 'Not Specified',      // G Area (m²)
      beds != null ? beds : 'Not Specified',            // H Bedrooms
      baths != null ? baths : 'Not Specified',          // I Bathrooms
      finishing,                                        // J Finishing Status
      'Not Specified',                                  // K Floor
      gardenSqm != null ? gardenSqm : 'No Info',        // L Garden (m²)
      /pool|حمام\s*سباحة|بول/i.test(cleanText) ? 'Yes' : 'Not Specified', // M Pool
      advertiserType,                                   // N Advertiser Type
      c.contactName || (advertiserType === 'Direct Owner' ? 'Owner' : 'Broker'), // O Contact Name
      mobStr,                                           // P Mobile Number
      last7Str,                                         // Q Mobile (Last 7)
      availStatus,                                      // R Availability Status
      todayGb,                                          // S Last Action Date
      cleanNotes,                                       // T Owner Call Response & Notes
      'No Photos',                                      // U Photo URLs
      `rag-unit-${code}`,                               // V RAG Memory ID
    ];

    if (!phoneObj) {
      // Quarantine into Rejected_No_Mobile (preserving DM respondent units and high-signal group offers with price > 0)
      if (c.isDirectOwnerDm || (priceEgp > 0 && newRejectedNoMobile.length < 250)) {
        const sig = `${compound}|${priceEgp}|${areaSqm || 'Not Specified'}|${cleanNotes.slice(0, 40)}`;
        if (!existingRejectedSigs.has(sig)) {
          existingRejectedSigs.add(sig);
          newRejectedNoMobile.push(buildMasterRow('MISSING', 'MISSING', c.isDirectOwnerDm ? 'Available' : 'Not Confirmed'));
        }
      }
      continue;
    }

    if (advertiserType === 'Direct Owner') {
      if (dealType === 'Rent') {
        if (existingOwnerRentLast7.has(phoneObj.last7)) continue;
        existingOwnerRentLast7.add(phoneObj.last7);
        newOwnersRent.push(buildMasterRow(phoneObj.mobile, phoneObj.last7, 'Available'));
      } else {
        if (existingOwnerResaleLast7.has(phoneObj.last7)) continue;
        existingOwnerResaleLast7.add(phoneObj.last7);
        newOwnersResale.push(buildMasterRow(phoneObj.mobile, phoneObj.last7, 'Available'));
      }
    } else {
      const brokerKey = `${phoneObj.last7}|${Math.round(priceEgp)}`;
      if (existingBrokerKeys.has(brokerKey)) continue;
      existingBrokerKeys.add(brokerKey);
      newBrokers.push(buildMasterRow(phoneObj.mobile, phoneObj.last7, 'Not Confirmed'));
    }

    if (priceEgp > 0) {
      supabaseUnits.push({
        code,
        compound,
        propType,
        dealType: dealType === 'Rent' ? 'rent' : 'sale',
        priceEgp,
        areaSqm: areaSqm || 0,
        beds: beds || 0,
        baths: baths || 0,
        finishing,
        advertiserType,
        contactName: c.contactName,
        mobileDigits: phoneObj.digits,
        sourceChat: c.sourceChat,
        notes: cleanNotes,
      });
    }
  }

  // 4. Check Supabase for any recent `/add-listing` website submissions (`SE-SUB-*`) or spooled rows to mirror into `Website_Listings`
  const websiteRows = [];
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let supabaseInserted = 0;

  if (sbUrl && sbKey) {
    const supabase = createClient(sbUrl, sbKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    try {
      const { data: recentSubs } = await supabase
        .from('listings')
        .select('id, code, compound, property_type, deal_type, bedrooms, bathrooms, area_sqm, price, finishing_status, raw_data, created_at')
        .ilike('code', 'SE-SUB-%')
        .order('created_at', { ascending: false })
        .limit(20);

      for (const sub of recentSubs || []) {
        const rd = (sub.raw_data && typeof sub.raw_data === 'object') ? sub.raw_data : {};
        const stamp = formatCairoStamp(sub.created_at);
        const mob = rd.mobile || rd.ownerPhone || '';
        const normMob = normalizePhoneObj(mob);
        websiteRows.push([
          stamp,
          stamp,
          sub.code,
          String(sub.deal_type || '').toLowerCase() === 'rent' ? 'Rent' : 'Resale',
          sub.compound || 'New Cairo (General)',
          sub.property_type || 'Apartment',
          sub.bedrooms ?? 'Not Specified',
          sub.bathrooms ?? 'Not Specified',
          sub.area_sqm ?? 'Not Specified',
          rd.gardenArea ?? 0,
          sub.price ?? 'Ask Owner',
          sub.finishing_status || rd.finishing || 'Not Specified',
          rd.ownerName || 'Website Submitter',
          rd.ownerType || 'Owner',
          normMob ? normMob.mobile : (mob || 'See Supabase'),
          rd.comment || rd.rawPaste || 'Submitted via /add-listing',
          'No Photos',
          `https://sierra-estates.net/property/${sub.id}`,
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${sub.compound || 'New Cairo'} Egypt`)}`,
          '',
          'بانتظار المراجعة',
          sub.id,
        ]);
      }
    } catch (_) {}

    // Upsert verified scraped units into Supabase `public.listings` (capped cleanly, deduplicated by dupe_check_hash)
    for (const u of supabaseUnits.slice(0, 150)) {
      try {
        const syncHash = crypto
          .createHash('sha256')
          .update([u.compound, u.areaSqm, u.priceEgp, u.beds, u.propType.toLowerCase(), u.dealType].join('|'))
          .digest('hex');

        const { data: existing } = await supabase
          .from('listings')
          .select('id')
          .eq('dupe_check_hash', syncHash)
          .limit(1);
        if (existing && existing.length > 0) continue;

        const nowIso = new Date().toISOString();
        const { error: insErr } = await supabase.from('listings').insert({
          code: u.code,
          dupe_check_hash: syncHash,
          title: `${u.beds ? `${u.beds}BR ` : ''}${u.propType} in ${u.compound}`,
          compound: u.compound,
          location_area: u.compound,
          property_type: u.propType.toLowerCase(),
          deal_type: u.dealType,
          price: u.priceEgp,
          bedrooms: u.beds,
          bathrooms: u.baths,
          area_sqm: u.areaSqm,
          furnishing_status: u.finishing === 'Furnished' ? 'furnished' : 'unfurnished',
          status: 'available',
          publish_status: 'REVIEW_REQUIRED',
          sync_source: 'whatsapp-scraper-sync',
          source_channel: u.advertiserType === 'Direct Owner' ? 'whatsapp_owner' : 'whatsapp_broker',
          raw_data: {
            advertiserType: u.advertiserType,
            contactName: u.contactName,
            mobile: u.mobileDigits,
            sourceChat: u.sourceChat,
            notes: u.notes,
          },
          created_at: nowIso,
          updated_at: nowIso,
        });
        if (!insErr) supabaseInserted += 1;
      } catch (_) {}
    }
  }

  // 5. Build Daily_Outreach_Report row
  let partitionSummary = '3 Ready Lines (line-1, line-2, line-3) × 100/day = 300 active (+100 line-4 pending QR)';
  if (fs.existsSync(PARTITIONS_JSON)) {
    try {
      const p = JSON.parse(fs.readFileSync(PARTITIONS_JSON, 'utf8'));
      const linesList = Object.entries(p.partitions || {}).map(([lid, arr]) => `${lid}:${Array.isArray(arr) ? arr.length : (arr?.assignedCount || 0)}`);
      if (linesList.length > 0) {
        partitionSummary = linesList.join(', ');
      }
    } catch (_) {}
  }

  const respondentDetails = (dailyReport.respondents || [])
    .map((r, i) => `${i + 1}) [${r.sessionId} · ${r.label}] ${r.phone}: ${r.text.replace(/\s+/g, ' ').slice(0, 140)}`)
    .join(' || ');

  const dailyReportRow = [[
    dailyReport.date,
    400,
    partitionSummary,
    dailyReport.metrics.totalSent,
    dailyReport.metrics.totalHistoricalContacted,
    dailyReport.metrics.totalAnswered,
    dailyReport.metrics.responseRate,
    dailyReport.metrics.breakdown.available,
    dailyReport.metrics.breakdown.unavailable,
    dailyReport.metrics.breakdown.negotiating,
    dailyReport.metrics.breakdown.opt_out,
    respondentDetails || 'No replies yet',
  ]];

  // 6. Build gsheets mutate batch operations (ONLY non-destructive `append`)
  const batchOps = [];
  if (newOwnersRent.length > 0) {
    batchOps.push({ op: 'append', range: 'Owners_Rent_Master!A1', data: newOwnersRent });
  }
  if (newOwnersResale.length > 0) {
    batchOps.push({ op: 'append', range: 'Owners_Resale_Master!A1', data: newOwnersResale });
  }
  if (newBrokers.length > 0) {
    batchOps.push({ op: 'append', range: 'Brokers_Inventory!A1', data: newBrokers });
  }
  if (newRejectedNoMobile.length > 0) {
    batchOps.push({ op: 'append', range: 'Rejected_No_Mobile!A1', data: newRejectedNoMobile });
  }
  if (newClientRequests.length > 0) {
    batchOps.push({ op: 'append', range: 'Client_Requests!A1', data: newClientRequests });
  }
  if (websiteRows.length > 0) {
    batchOps.push({ op: 'append', range: 'Website_Listings!A1', data: websiteRows });
  }
  batchOps.push({ op: 'append', range: 'Daily_Outreach_Report!A1', data: dailyReportRow });

  fs.writeFileSync(BATCH_OUT, JSON.stringify(batchOps, null, 2), 'utf8');

  const summary = {
    generatedAt: new Date().toISOString(),
    rawCandidatesScanned: rawCandidates.length,
    uniqueMessagesEvaluated: seenTextHashes.size,
    appendedToSheets: {
      Owners_Rent_Master: newOwnersRent.length,
      Owners_Resale_Master: newOwnersResale.length,
      Brokers_Inventory: newBrokers.length,
      Rejected_No_Mobile: newRejectedNoMobile.length,
      Client_Requests: newClientRequests.length,
      Website_Listings: websiteRows.length,
      Daily_Outreach_Report: 1,
    },
    supabaseListingsInserted: supabaseInserted,
    outreachReport: dailyReport.metrics,
    batchFilePath: BATCH_OUT,
  };

  fs.writeFileSync(SUMMARY_OUT, JSON.stringify(summary, null, 2), 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error('[sync-scraped-owners-brokers] Fatal error:', err);
  process.exit(1);
});
