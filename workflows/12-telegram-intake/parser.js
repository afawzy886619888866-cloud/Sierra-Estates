'use strict';
/**
 * parser.js — Deterministic Arabic/English listing-text extractor.
 * ─────────────────────────────────────────────────────────────────────────────
 * Real agents submit unstructured Arabic or English text (with photos) in
 * their dedicated groups ("Fareda units", "Christina units", "Heba Units").
 * This parser extracts the canonical listing fields WITHOUT any network
 * dependency — regex + curated Egyptian real-estate vocab only. An optional
 * LLM refinement pass (bot.js, GEMINI key) may FILL GAPS but never overrides
 * a deterministic hit (§21 no-fabrication: a guessed field is worse than an
 * explicit "missing" the agent is asked to supply).
 *
 * Output shape (all fields nullable; required ones gated by missingFields()):
 *   {
 *     listingType: 'rent' | 'sale' | null,
 *     propertyType: 'apartment' | 'villa' | 'townhouse' | 'twinhouse' |
 *                   'penthouse' | 'duplex' | 'studio' | 'chalet' |
 *                   'office' | 'retail' | 'land' | null,
 *     compound, district, floor, finishing, furnishing, view,
 *     areaSqm, bedrooms, bathrooms, masterBedrooms,
 *     price: { amount, currency: 'EGP'|'USD', period: 'month'|'year'|null },
 *     paymentTerms, deposit, availability
 *   }
 */

const { toWesternDigits } = require('./redact');

// ── vocab tables ───────────────────────────────────────────────────────────
const PROPERTY_TYPES = [
  [/penthouse|بنت\s?هاوس|بنتهاوس/i, 'penthouse'],
  [/town\s?house|تاون\s?هاوس/i, 'townhouse'],
  [/twin\s?house|توين\s?هاوس/i, 'twinhouse'],
  [/duplex|دوبلكس/i, 'duplex'],
  [/studio|ستوديو/i, 'studio'],
  [/chalet|شاليه/i, 'chalet'],
  [/villa|فيلا/i, 'villa'],
  [/apartment|flat|شقة|شقه/i, 'apartment'],
  [/office|مكتب|اداري|إداري|administrative/i, 'office'],
  [/(?:retail|shop|store)|محل|تجاري|commercial/i, 'retail'],
  [/(?:land|plot)|أرض|ارض|plot/i, 'land'],
];

const DISTRICTS = [
  [/new\s+cairo|القاهرة\s*الجديدة|التجمع\s*الخامس|التجمع|nasr\s+city\s*new/i, 'New Cairo'],
  [/golden\s+square|الجولدن?\s*سكوير/i, 'Golden Square'],
  [/sheikh\s+zayed|الشيخ\s*زايد|zayed/i, 'Sheikh Zayed'],
  [/6\s*(?:th)?\s*october|٦\s*اكتوبر|السادس\s*من\s*اكتوبر|october\s*city/i, '6th of October'],
  [/new\s+capital|العاصمة\s*الإدارية|العاصمة\s*الادارية|الإدارية/i, 'New Administrative Capital'],
  [/north\s+coast|الساحل\s*الشمالي|الساحل/i, 'North Coast'],
  [/mostakbal\s*city|المدينة\s*المستقبل|المستقبل\s*city/i, 'Mostakbal City'],
  [/katameya|القطامية|cutameya/i, 'Katameya'],
  [/maadi|المعادي/i, 'Maadi'],
  [/nasr\s+city|مدينة\s*نصر/i, 'Nasr City'],
  [/heliopolis|مصر\s*الجديدة|هليوبوليس/i, 'Heliopolis'],
  [/mohandessin|المهندسين/i, 'Mohandessin'],
  [/zamalek|الزمالك/i, 'Zamalek'],
  [/downtown|وسط\s*البلد/i, 'Downtown'],
  [/uptown\s*cairo|أبتاون\s*كايرو/i, 'Uptown Cairo'],
  [/el\s*shorouk|الشروق/i, 'El Shorouk'],
  [/badr\s*city|مدينة\s*بدر/i, 'Badr City'],
  [/robi(?:g|k)|روبيج/i, 'Robig'],
];

const FINISHINGS = [
  [/ultra\s*(?:super)?\s*lux|ألترا\s*(?:سوبر\s*)?لوكس|الترا\s*(?:سوبر\s*)?لوكس/i, 'Ultra Super Lux'],
  [/super\s*lux|سوبر\s*لوكس/i, 'Super Lux'],
  [/(?:semi\s*finished|نصف\s*تشطيب|نص\s*تشطيب)/i, 'Semi-Finished'],
  [/(?:core\s*&?\s*shell|core\s*and\s*shell)/i, 'Core & Shell'],
  [/without\s*finishing|بدون\s*تشطيب|على\s*الطوب|الطوب/i, 'Without Finishing'],
  [/full(?:y)?\s*finished|تشطيب\s*كامل|مكتمل/i, 'Fully Finished'],
  [/lux|لوكس/i, 'Lux'],
];

const FURNISHINGS = [
  [/full(?:y)?\s*furnished|مفروش(?:ة)?\s*بالكامل|مفروشة\s*بالكامل|كاملة\s*التأثيث/i, 'Fully Furnished'],
  [/kitchen\s*(?:and|&|\+)?\s*(?:acs?|air\s*conds?|تكييف)|مطبخ\s*(?:و|\+)?\s*تكييف|مطبخ\s*وتكييف|أجهزة/i, 'Kitchen Appliances & ACs'],
  [/semi\s*furnish|نصف\s*مفروش/i, 'Semi-Furnished'],
  [/un[-\s]?furnished|empty|غير\s*مفروش|فرغ|خالي/i, 'Unfurnished'],
  [/furnish|مفروش/i, 'Furnished'],
];

const VIEWS = [
  [/sea\s*view|فيو\s*بحر|إطلالة\s*بحر|اطلالة\s*بحر|بحر\s*مفتوح/i, 'Sea View'],
  [/landscape|لاند\s?سكيب|لاندسكيب|جاردن\s*فيو|garden\s*view|حديقة/i, 'Landscape / Garden'],
  [/open\s*view|فيو\s*مفتوح|إطلالة\s*مفتوحة|مفتوح/i, 'Open View'],
  [/pool\s*view|فيو\s*بيسين|حمام\s*سباحة/i, 'Pool View'],
  [/street|شارع|بوليفارد|boulevard/i, 'Street / Boulevard'],
];

const PAYMENT_TERMS = [
  [/quarterly|ربع\s*سنوي|كل\s*٣?\s*شهور|كل\s*3\s*شهور/i, 'Quarterly'],
  [/semi[-\s]?annual(?:ly)?|نصف\s*سنوي|كل\s*٦?\s*شهور|كل\s*6\s*شهور/i, 'Semi-Annually'],
  [/(?:annually|annual|yearly)|سنوي/i, 'Annually'],
  [/post[-\s]?dated|شيكات|شيك/i, 'Post-Dated Checks'],
  [/cash\b|كاش/i, 'Cash'],
  [/installments?|تقسيط|أقساط|اقساط/i, 'Installments'],
  [/upfront|مقدم\s*كامل|دفعة\s*واحدة|كامل\s*مقدم/i, 'Upfront'],
];

const AVAILABILITIES = [
  [/immediate|فوري|حالا|بنزل\s*النهاردة|جاهز\s*للسكن\s*الفوري/i, 'Immediate Move-in'],
  [/from\s+([A-Za-z\u0600-\u06FF0-9 ]{3,20})|ابتداء\s*من\s*([A-Za-z\u0600-\u06FF0-9 ]{3,20})/i, 'From'],
];

// Arabic number words for beds/baths counts.
const AR_NUMBERS = {
  'صفر': 0, 'واحد': 1, 'واحدة': 1, 'اثنين': 2, 'اتنين': 2, 'تلاتة': 3,
  'اربعة': 4, 'أربعة': 4, 'خمسة': 5, 'ستة': 6, 'سبعة': 7, 'ثمانية': 8,
  'تسعة': 9, 'عشرة': 10, 'غرفتين': 2, 'حمامين': 2,
};

function normalize(text) {
  return toWesternDigits(text)
    .replace(/[\u200e\u200f\u202a-\u202e]/g, '')
    .replace(/\u00a0|\u202f/g, ' ')
    .replace(/[،؛]/g, ',')
    .trim();
}

function firstMatch(text, table) {
  for (const [re, value] of table) {
    const m = text.match(re);
    if (m) return { value, match: m };
  }
  return null;
}

/** Count after a beds/baths keyword: digits or Arabic number words. */
function countAfter(text, kwRe) {
  const m = text.match(kwRe);
  if (m) return parseInt(m[1], 10);
  for (const [word, n] of Object.entries(AR_NUMBERS)) {
    const re = new RegExp(`${word}\\s*(?:${kwRe.source})`, 'i');
    const hit = text.match(re);
    if (hit) return n;
  }
  // "غرفتين/حمامين" style: word AFTER keyword ("غرف نوم: غرفتين")
  const kw = text.match(new RegExp(kwRe.source, 'i'));
  if (kw) {
    const after = text.slice((kw.index || 0) + kw[0].length, (kw.index || 0) + kw[0].length + 14);
    for (const [word, n] of Object.entries(AR_NUMBERS)) {
      if (new RegExp(`^\\s*${word}`).test(after)) return n;
    }
  }
  return null;
}

const BEDS_RE = /(\d{1,2})\s*(?:غرف\s*نوم|غرف\s*نو\s*م|غرفة\s*نوم|غرف|نوم|bedrooms?|beds?|br\b|master)/i;
const BATHS_RE = /(\d{1,2})\s*(?:حمامات|حمام|bathrooms?|baths?|ba\b)/i;
const MASTER_RE = /(\d{1,2})\s*(?:ماستر|master)/i;

const AREA_RE = /(\d{2,4}(?:\.\d{1,2})?)\s*(?:متر|m2|m²|sqm|sq\.?\s*m|square\s*met|م2|م²)/i;

// Price machinery — CONTEXT-ANCHORED, never a bare number:
//   pattern 1: a price keyword within 24 non-digit chars BEFORE the number
//              ("الإيجار 45 الف", "Rent: EGP 120,000", "price 22,500,000")
//   pattern 2: a number with an attached multiplier / currency / period
//              ("120,000 EGP monthly", "45k", "5M").
// A contextless digit run (area "200 متر", floor "الدور الثالث") must NEVER
// be promoted to a price — first-draft blind spot caught by the tests.
function parsePrice(text) {
  const NUM = String.raw`(\d{1,3}(?:[.,\s]\d{3})+|\d+(?:\.\d{1,2})?)`;
  const MULT = String.raw`\s*(مليون|ملية|million|m\b|ألف|الف|k\b)?`;
  const CUR = String.raw`\s*(جنيه|ج\.م|egp|le|دولار|usd|\$)?`;
  const PERIOD = String.raw`(?:\s*(شهري|شهرية|monthly|per\s*month|\/\s*month|سنوي|سنويا|yearly|per\s*year|يومي|daily))?`;
  const PRICE_KEYWORD = String.raw`(?:سعر|الإيجار|إيجار|ايجار|تأجير|rent(?:al)?|price|السعر|value|بيع)`;

  const patterns = [
    // 1 — keyword-anchored (keyword … number). The negative lookahead
    // keeps area/room counts out (“للبيع 200 متر” must NOT price at 200).
    new RegExp(`${PRICE_KEYWORD}[^\\d\\n]{0,24}${NUM}(?!\\d)(?!\\s*(?:متر|م2|م²|m2|m²|sqm|square|غرف|غرفة|نوم|حمام|دور|floor|beds?|baths?))${MULT}${CUR}${PERIOD}`, 'i'),
    // 2 — unit-anchored (multiplier OR currency OR period attached)
    new RegExp(`${NUM}(?:\\s*(?:مليون|ملية|million|ألف|الف)|\\s*(?:جنيه|ج\\.م|egp|le|دولار|usd)|\\s*(?:شهري|شهرية|monthly|per\\s*month|\\/\\s*month|سنوي|سنويا|yearly|يومي|daily))`, 'i'),
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    let amount = parseFloat(m[1].replace(/[\s]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.'));
    if (!Number.isFinite(amount)) continue;
    const mult = String(m[2] || '').toLowerCase();
    if (/مليون|ملية|million|^m$/.test(mult)) amount *= 1_000_000;
    else if (/ألف|الف|^k$/.test(mult)) amount *= 1_000;
    // Currency: an attached token wins; else scan a ±24-char window
    // ("EGP 60,000", "$ 3.5M", "5 million USD").
    const win = text.slice(Math.max(0, (m.index || 0) - 24), (m.index || 0) + m[0].length + 8);
    const currency = /دولار|usd|\$/.test(m[0]) || /دولار|usd|\$/.test(win) ? 'USD' : 'EGP';
    const per = `${m[3] || ''} ${m[0]}`.toLowerCase();
    let period = null;
    if (/شهري|شهرية|month/.test(per)) period = 'month';
    else if (/سنوي|سنويا|year/.test(per)) period = 'year';
    else if (/يومي|daily/.test(per)) period = 'day';
    return {
      amount: Math.round(amount),
      currency,
      period,
      raw: m[0].trim().slice(0, 60),
    };
  }
  return null;
}

function parseListingType(text) {
  const rent = /للإيجار|للايجار|للتأجير|إيجار|ايجار|تأجير|rent/i.test(text);
  const sale = /للبيع|بيع|for\s*sale|sale|resale/i.test(text);
  if (rent && !sale) return 'rent';
  if (sale && !rent) return 'sale';
  if (rent && sale) {
    // "فيلا للبيع ... والإيجار بـ 500 ألف شهري" → both mentioned: prefer rent
    // only when a monthly price exists, else sale.
    return /شهري|شهرية|monthly|per\s*month/i.test(text) ? 'rent' : 'sale';
  }
  return null;
}

function parseCompound(text) {
  // "كمبوند/كومباوند/compound X" → capture until district/city/punct keyword.
  const m = text.match(/(?:كمبوند|كومباوند|compound|in)\s+([\p{L} .''\-&]{2,40})/iu);
  if (m) {
    let name = m[1]
      .replace(/^(?:كمبوند|كومباوند|compound)\s+/i, '')
      .replace(/\s+(?:بال?|في|in|new\s+cairo|التجمع|القاهرة الجديدة|الشيخ\s*زايد|zayed|sheikh\s*zayed|الساحل|north\s*coast|القطامية|katameya|العاصمة|new\s+capital|sale|rent|للبيع|للايجار|للإيجار).*$/i, '')
      .replace(/[,\s]+$/, '')
      .trim();
    if (name.length >= 2 && !/^\d+$/.test(name)) return name.slice(0, 40);
  }
  return null;
}

function parseFloor(text) {
  const num = text.match(/(?:الدور|دور|floor|fl)\s*(?:رقم\s*)?(\d{1,2})/i);
  if (num) return `${parseInt(num[1], 10)}${ordinalEn(parseInt(num[1], 10))}`;
  if (/دور\s*أرضي|ground\s*floor|ground/i.test(text)) return 'Ground Floor';
  if (/دور\s*علوي|top\s*floor|last\s*floor|highest/i.test(text)) return 'Top Floor';
  if (/رووف|roof/i.test(text)) return 'Roof';
  if (/قبو|basement/i.test(text)) return 'Basement';
  const word = text.match(/(?:الدور|دور)\s*(أول|تاني|ثاني|ثالث|رابع|خامس)/);
  if (word) {
    const map = { 'أول': 1, 'تاني': 2, 'ثاني': 2, 'ثالث': 3, 'رابع': 4, 'خامس': 5 };
    const n = map[word[1]];
    if (n) return `${n}${ordinalEn(n)}`;
  }
  return null;
}

function ordinalEn(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/** Parse one intake text into the canonical listing shape.
 * Mission 5 (2026-11-01): a structured 📥 [UNIT INTAKE] card (info-shapes)
 * wins over the free-text extractor — every field is explicit — but any
 * card field that is missing falls back to the regex extractor so a
 * partially-filled card still parses as well as raw text. */
function parseListing(rawText) {
  const text = normalize(rawText);
  if (!text) return emptyListing();

  let card = null;
  try {
    const { parseUnitIntakeCard } = require('../lib/info-shapes');
    card = parseUnitIntakeCard(text);
  } catch (_) { card = null; }

  const price = parsePrice(text);
  let listingType = parseListingType(text);
  if (!listingType && price && price.period === 'month') listingType = 'rent';

  const property = firstMatch(text, PROPERTY_TYPES);
  const districtHit = firstMatch(text, DISTRICTS);
  const finishingHit = firstMatch(text, FINISHINGS);
  const furnishingHit = firstMatch(text, FURNISHINGS);
  const viewHit = firstMatch(text, VIEWS);
  const paymentHit = firstMatch(text, PAYMENT_TERMS);

  let availability = null;
  const avHit = firstMatch(text, AVAILABILITIES);
  if (avHit) availability = avHit.value === 'From' ? `From ${avHit.match[1] || avHit.match[2] || ''}`.trim() : avHit.value;

  // Deposit: digits near تأمين/deposit/مقدم/advance.
  let deposit = null;
  const dep = text.match(/(?:تأمين|deposit|security|m\.?deposit|مقدم|advance)\D{0,18}?(\d{1,3}(?:[.,\s]\d{3})*|\d+)\s*(شهر|month|ألف|الف|k\b|مليون)?/i);
  if (dep) {
    let amount = parseFloat(dep[1].replace(/[,\s]/g, ''));
    const unit = (dep[2] || '').toLowerCase();
    if (/شهر|month/.test(unit)) deposit = `${parseInt(dep[1].replace(/\D/g, ''), 10)} month(s)`;
    else {
      if (/ألف|الف|^k$/.test(unit)) amount *= 1_000;
      if (/مليون/.test(unit)) amount *= 1_000_000;
      deposit = `${Math.round(amount).toLocaleString('en-US')} EGP`;
    }
  }

  const pick = (cardVal, fallback) => ((card && cardVal !== null && cardVal !== undefined && cardVal !== '') ? cardVal : fallback);

  return {
    __shape: card ? 'UNIT_INTAKE_CARD' : undefined,
    dealTypeRaw: card ? card.dealTypeRaw : undefined,
    listingType: pick(card && card.listingType, listingType),
    propertyType: pick(card && card.propertyType, property ? property.value : null),
    compound: pick(card && card.compound, parseCompound(text)),
    district: districtHit ? districtHit.value : null,
    floor: pick(card && card.floor, parseFloor(text)),
    finishing: finishingHit ? finishingHit.value : null,
    furnishing: pick(card && card.furnishing, furnishingHit ? furnishingHit.value : null),
    view: pick(card && card.view, viewHit ? viewHit.value : null),
    areaSqm: pick(card && card.areaSqm, numOrNull(text.match(AREA_RE))),
    bedrooms: pick(card && card.bedrooms, countAfter(text, BEDS_RE)),
    bathrooms: pick(card && card.bathrooms, countAfter(text, BATHS_RE)),
    masterBedrooms: countAfter(text, MASTER_RE),
    price: pick(card && card.price, price),
    paymentTerms: pick(card && card.paymentTerms, paymentHit ? paymentHit.value : null),
    deposit: pick(card && card.deposit, deposit),
    availability,
    owner: card ? card.owner : undefined,
    notes: card ? card.notes : undefined,
  };
}

function numOrNull(m) {
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

function emptyListing() {
  return {
    listingType: null, propertyType: null, compound: null, district: null,
    floor: null, finishing: null, furnishing: null, view: null,
    areaSqm: null, bedrooms: null, bathrooms: null, masterBedrooms: null,
    price: null, paymentTerms: null, deposit: null, availability: null,
  };
}

/** Required-field gate: what the agent MUST re-send before the unit is
 *  logged. A unit without these cannot be coded, priced or located.
 *  Location is satisfied by compound OR district ("شقة بالشيخ زايد" has no
 *  compound name and is still a locatable unit). */
const REQUIRED = [
  ['listingType', 'Listing type — إيجار أم بيع (rent or sale)'],
  ['location', 'Compound / project / district — الكمبوند أو المشروع أو المنطقة'],
  ['price', 'Price — السعر'],
  ['areaSqm', 'Area in SQM — المساحة بالمتر'],
  ['bedrooms', 'Bedrooms — عدد غرف النوم'],
];

function missingFields(listing) {
  const missing = [];
  for (const [key, label] of REQUIRED) {
    if (key === 'location') {
      if (!listing.compound && !listing.district) missing.push(label);
      continue;
    }
    const v = listing[key];
    if (v === null || v === undefined || v === '') missing.push(label);
  }
  return missing;
}

module.exports = {
  parseListing,
  missingFields,
  REQUIRED,
  // exported for tests
  _internals: { parsePrice, parseCompound, parseFloor, normalize, countAfter },
};
