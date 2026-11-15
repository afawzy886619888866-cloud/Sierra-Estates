'use strict';

/**
 * Deterministic Arabic/English Real Estate NLP Pre-Filter (Phase 3)
 * Classifies Rent vs. Sale, Demand vs. Supply, and Owner vs. Broker signals
 * BEFORE sending payloads to Gemini 2.5 Flash structured extraction.
 */

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EASTERN_ARABIC = '۰۱۲۳۴۵۶۷۸۹';

function normalizeDigits(input) {
  return String(input || '')
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(EASTERN_ARABIC.indexOf(d)));
}

function normalizeArabicText(input) {
  return normalizeDigits(input)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase();
}

const RENT_RE = /(?:^|[\s،,.;:()\/-])(ايجار|للايجار|شهري|شهريا|سنوي|سنويا|for rent|to rent|rent|monthly lease)(?=$|[\s،,.;:()\/-])/i;
const SALE_RE = /(?:^|[\s،,.;:()\/-])(للبيع|بيع|كاش|تقسيط|مقدم|اوفر|تمليك|اجمالي|for sale|resale|cash|installments?|over)(?=$|[\s،,.;:()\/-])/i;
const DEMAND_RE = /(?:^|[\s،,.;:()\/-])(مطلوب|ابحث عن|عايز|محتاج|wanted|looking for|client request|buyer request)(?=$|[\s،,.;:()\/-])/i;
const SUPPLY_RE = /(?:^|[\s،,.;:()\/-])(معروض|متاح|مباشر|للبيع|للايجار|available|for sale|for rent|direct owner)(?=$|[\s،,.;:()\/-])/i;
const BROKER_RE = /(?:^|[\s،,.;:()\/-])(بروكر|وسيط|مكتب|شركه تسويق|عموله|نصف عموله|broker|agent|agency|commission)(?=$|[\s،,.;:()\/-])/i;
const OWNER_RE = /(?:^|[\s،,.;:()\/-])(المالك|من المالك|مباشر من المالك|بدون عموله|owner|direct owner|by owner)(?=$|[\s،,.;:()\/-])/i;

function extractAreaSqm(normalizedText) {
  const m = normalizedText.match(/(\d{2,4})\s*(?:متر|م2|م²|m2|sqm|sq\.?\s*m)/i);
  return m ? Number(m[1]) : null;
}

function extractBedrooms(normalizedText) {
  const m = normalizedText.match(/(\d)\s*(?:غرف|غرفه|نوم|bed|beds|br|bedrooms?)/i);
  return m ? Number(m[1]) : null;
}

function extractPhone(rawText) {
  const digitsText = normalizeDigits(rawText);
  const m = digitsText.match(/(?:\+?20[\s-]*)?(0?1[0125]\d[\s-]?\d{3}[\s-]?\d{4}|\b01[0125]\d{8}\b)/);
  if (!m) return null;
  let d = m[0].replace(/\D/g, '');
  if (d.startsWith('20') && d.length === 12) d = '0' + d.slice(2);
  if (!d.startsWith('0') && d.length === 10 && /^1[0125]/.test(d)) d = '0' + d;
  return /^01[0125]\d{8}$/.test(d) ? d : null;
}

function extractPriceEgp(normalizedText, mode) {
  const millionMatch = normalizedText.match(/(\d+(?:[.,]\d+)?)\s*(?:مليون|million|\bm\b)/i);
  if (millionMatch) {
    return Math.round(Number(millionMatch[1].replace(',', '.')) * 1_000_000);
  }
  const thousandMatch = normalizedText.match(/(\d+(?:[.,]\d+)?)\s*(?:الف|\bk\b|thousand)/i);
  if (thousandMatch) {
    const val = Math.round(Number(thousandMatch[1].replace(',', '.')) * 1_000);
    return val;
  }
  const numMatch = normalizedText.match(/(\d{1,3}(?:,\d{3})+|\d{5,9})\s*(?:جنيه|ج\.?م|egp|le)?/i);
  if (numMatch) {
    const val = Number(numMatch[1].replace(/,/g, ''));
    if (Number.isFinite(val) && val > 0) {
      if (mode === 'rent' && val <= 400_000) return val;
      if (mode === 'sale' && val >= 500_000) return val;
      return val;
    }
  }
  return null;
}

/**
 * Deterministically classify an Arabic/English listing message and score confidence.
 */
function preFilterArabicListing(rawText) {
  const norm = normalizeArabicText(rawText);
  const hasRent = RENT_RE.test(norm);
  const hasSale = SALE_RE.test(norm);
  const hasDemand = DEMAND_RE.test(norm);
  const hasSupply = SUPPLY_RE.test(norm);
  const hasBroker = BROKER_RE.test(norm);
  const hasOwner = OWNER_RE.test(norm);

  let mode = null;
  let modeConflict = false;
  if (hasRent && !hasSale) {
    mode = 'rent';
  } else if (hasSale && !hasRent) {
    mode = 'sale';
  } else if (hasRent && hasSale) {
    modeConflict = true;
    // Heuristic tie-breaker: monthly/rent ceiling cues vs cash/installment cues
    if (/شهري|شهريا|للايجار/.test(norm) && !/كاش|اوفر|تقسيط/.test(norm)) {
      mode = 'rent';
    } else if (/كاش|تقسيط|مقدم|اوفر/.test(norm) && !/شهري/.test(norm)) {
      mode = 'sale';
    }
  }

  let intent = 'supply';
  if (hasDemand && !hasSupply) {
    intent = 'demand';
  } else if (hasDemand && hasSupply) {
    intent = /^مطلوب/i.test(norm.trim()) ? 'demand' : 'supply';
  }

  const advertiserRole = hasBroker ? 'broker' : hasOwner ? 'owner' : 'unknown';
  const areaSqm = extractAreaSqm(norm);
  const bedrooms = extractBedrooms(norm);
  const phone = extractPhone(rawText);
  const priceEgp = extractPriceEgp(norm, mode);

  // Guard: rent ceiling <= 400,000 EGP/mo; prices > 400,000 strongly imply sale unless explicit rent
  if (mode === 'rent' && priceEgp && priceEgp > 400_000) {
    modeConflict = true;
  }

  let confidence = 0.25;
  if (mode && !modeConflict) confidence += 0.35;
  else if (modeConflict) confidence -= 0.1;
  if (priceEgp) confidence += 0.15;
  if (areaSqm) confidence += 0.1;
  if (bedrooms) confidence += 0.05;
  if (phone) confidence += 0.1;
  if (hasOwner || hasBroker) confidence += 0.05;

  confidence = Math.max(0, Math.min(0.99, Number(confidence.toFixed(2))));

  const needsModeConfirmation = !mode || modeConflict || confidence < 0.85;

  return {
    mode,
    modeConflict,
    intent,
    advertiserRole,
    areaSqm,
    bedrooms,
    phone,
    priceEgp,
    confidence,
    needsModeConfirmation,
    autoPublishEligible: Boolean(mode && !modeConflict && intent === 'supply' && confidence >= 0.85),
    signals: {
      hasRent,
      hasSale,
      hasDemand,
      hasSupply,
      hasBroker,
      hasOwner,
    },
  };
}

module.exports = {
  normalizeDigits,
  normalizeArabicText,
  preFilterArabicListing,
};
