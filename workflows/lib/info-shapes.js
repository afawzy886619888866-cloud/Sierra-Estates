'use strict';

/**
 * info-shapes.js — Bidirectional Information Shapes (Mission 5, 2026-11-01).
 * ─────────────────────────────────────────────────────────────────────────────
 * The structured communication contracts between Employees ↔ Agents ↔ Bots
 * across the Telegram groups and the Admin Dashboard. The bot accepts BOTH
 * raw unstructured Arabic/English text + photos (deterministic parser) AND
 * the structured cards below — the card wins when present because every
 * field is explicit (§21 no-fabrication: an explicit value beats a guess).
 *
 * SHAPES
 *   S1  Agent → Bot       📥 [UNIT INTAKE]        (the owner-specified card)
 *   S2  Bot → Agent       ✅ [UNIT VERIFIED]      (intake outcome + code)
 *   S3  Owner → Bot       📞 [OWNER REPLY]        (availability answer)
 *   S4  Buyer → Bot       🏠 [BUYER INQUIRY]      (portal/website inquiry)
 *   S5  Employee → Bot    ⚙️ [COMMAND]            (admin commands)
 *   S6  Bot → Admin OS    🚨 [ALERT]              (escalation shape)
 *
 * Parsing is tolerant: bullet markers (•/-/*), bilingual labels, Arabic-
 * Indic digits, and missing optional fields never throw — they yield null
 * and the standard missing-fields ask-back fires.
 */

const { toWesternDigits } = require('../12-telegram-intake/redact');

// ── S1: Agent → Bot — the structured unit intake card ──────────────────────

const INTAKE_CARD_RE = /\u{1F4E5}\s*\[?UNIT\s*INTAKE\]?/iu;

function isUnitIntakeCard(text) {
  return INTAKE_CARD_RE.test(String(text || ''));
}

/** Field extractor: the text after a "Label:" up to end-of-line or bullet. */
function cardField(text, labelRe) {
  const m = String(text || '').match(labelRe);
  if (!m) return null;
  return String(m[1] || '').replace(/\s+$/g, '').trim() || null;
}

const LINE = String.raw`[^\n]*`;
function bullet(labelPattern) {
  return new RegExp(`(?:?:^|\\n)\\s*(?:[\u2022\\-*]|)\\s*(?:${labelPattern})\\s*[:\\uFF1A]\\s*( ${LINE} )`, 'iu')
    .source.replace(/ /g, '');
}

/**
 * Parse the 📥 [UNIT INTAKE] card into the parser.js listing shape + an
 * explicit owner block. Returns null when the card header is absent.
 */
function parseUnitIntakeCard(rawText) {
  const text = toWesternDigits(String(rawText || ''));
  if (!isUnitIntakeCard(text)) return null;

  const field = (labels) => cardField(text, new RegExp(
    `(?:^|\\n)\\s*(?:[\u2022\\-*–]|)\\s*(?:${labels})\\s*[:\\uFF1A=]\\s*([^\\n]*)`, 'iu'));

  // • Deal: Rent / Resale
  const dealRaw = field('Deal|العرض|نوع\\s*العرض') || '';
  let listingType = null;
  let dealTypeRaw = null;
  if (/rent|إيجار|ايجار/i.test(dealRaw)) { listingType = 'rent'; dealTypeRaw = 'Rent'; }
  else if (/resale/i.test(dealRaw)) { listingType = 'sale'; dealTypeRaw = 'Resale'; }
  else if (/sale|بيع/i.test(dealRaw)) { listingType = 'sale'; dealTypeRaw = 'Sale'; }

  // • Compound: [Compound Name]
  const compound = field('Compound|الكمبوند|المشروع');

  // • Type & Specs: [Type] | [Area]m² | [Beds]B/[Baths]B | Floor: [Floor]
  const specs = field('Type\\s*&\\s*Specs|المواصفات|النوع\\s*والمواصفات') || '';
  const specParts = specs.split(/[|،]/).map((s) => s.trim()).filter(Boolean);
  let propertyType = null;
  let areaSqm = null;
  let bedrooms = null;
  let bathrooms = null;
  let floor = null;
  for (const part of specParts) {
    if (!propertyType && /(apartment|villa|townhouse|twinhouse|penthouse|duplex|studio|chalet|office|retail|land|شقة|فيلا|تاون|دوبلكس|ستوديو|شاليه|مكتب)/i.test(part)) {
      propertyType = part.toLowerCase().match(/(apartment|villa|townhouse|twinhouse|penthouse|duplex|studio|chalet|office|retail|land|شقة|فيلا|تاون هاوس|توين هاوس|دوبلكس|ستوديو|شاليه|مكتب)/i)[1];
      if (/شقة/.test(propertyType)) propertyType = 'apartment';
      else if (/فيلا/.test(propertyType)) propertyType = 'villa';
      else if (/تاون/.test(propertyType)) propertyType = 'townhouse';
      else if (/توين/.test(propertyType)) propertyType = 'twinhouse';
      else if (/دوبلكس/.test(propertyType)) propertyType = 'duplex';
      else if (/ستوديو/.test(propertyType)) propertyType = 'studio';
      else if (/شاليه/.test(propertyType)) propertyType = 'chalet';
      else if (/مكتب/.test(propertyType)) propertyType = 'office';
      continue;
    }
    const areaM = part.match(/(\d{2,4}(?:\.\d{1,2})?)\s*(?:م2|م²|m2|m²|sqm|متر)?/i);
    if (areaM && !areaSqm && /م2|م²|m2|m²|sqm|متر/i.test(part)) { areaSqm = parseFloat(areaM[1]); continue; }
    const bbM = part.match(/(\d{1,2})\s*B\s*\/\s*(\d{1,2})\s*B/i);
    if (bbM) { bedrooms = parseInt(bbM[1], 10); bathrooms = parseInt(bbM[2], 10); continue; }
    const floorM = part.match(/(?:Floor|الدور|طابق)\s*[:：]?\s*([^\n|]+)/i);
    if (floorM) { floor = floorM[1].trim(); continue; }
  }

  // • Furnishing: [Furnished / Semi / Unfurnished]
  const furnishRaw = field('Furnishing|التأثيث|مفروش') || '';
  let furnishing = null;
  if (/un[-\s]?furnish|empty|غير/i.test(furnishRaw)) furnishing = 'Unfurnished';
  else if (/semi|نصف/i.test(furnishRaw)) furnishing = 'Semi-Furnished';
  else if (/full|كامل|مفروش/i.test(furnishRaw)) furnishing = 'Fully Furnished';
  else if (furnishRaw) furnishing = furnishRaw;

  // • Price & Terms: [Price EGP/USD] | [Payment Terms] | Deposit: [Deposit]
  const priceTerms = field('Price\\s*&\\s*Terms|السعر\\s*والمقدم|السعر') || '';
  const priceParts = priceTerms.split(/[|،]/).map((s) => s.trim()).filter(Boolean);
  let price = null;
  let paymentTerms = null;
  let deposit = null;
  for (const part of priceParts) {
    if (!price) {
      const pm = part.match(/(\d[\d.,\s]*)\s*(egp|جنيه|usd|دولار|\$)?\s*(monthly|شهري|سنوي|yearly|per\s*year)?/i);
      if (pm && /\d/.test(part)) {
        let amount = parseFloat(pm[1].replace(/[\s]/g, '').replace(/,(?=\d{3}\b)/g, ''));
        // Multipliers — "3.5M"/"45k" attach directly to the digits, and
        // Arabic words "مليون"/"ألف" may sit after a space.
        if (/مليون|million|\d\s*M\b/i.test(part)) amount *= 1_000_000;
        else if (/ألف|الف|\d\s*K\b/i.test(part)) amount *= 1000;
        price = {
          amount: Math.round(amount),
          currency: /usd|دولار|\$/i.test(part) ? 'USD' : 'EGP',
          period: listingType === 'rent' ? (/سنوي|yearly|per\s*year/i.test(part) ? 'year' : 'month') : null,
        };
        continue;
      }
    }
    if (!paymentTerms && /(cash|installment|تقسيط|كاش|شيك|check|quarterly|سنوي|upfront|مقدم)/i.test(part)) {
      paymentTerms = part;
      continue;
    }
    if (!deposit && /(deposit|مقدم|advance|security|تأمين)/i.test(part)) {
      deposit = part.replace(/^\s*(?:deposit|security|مقدم|تأمين)\s*[:：]?\s*/i, '').trim() || part;
      continue;
    }
    if (!paymentTerms) paymentTerms = part;
  }

  // • Owner (PRIVATE): [Name] | [01xxxxxxxxx] | Unit #: [Private]
  const ownerBlock = field('Owner\\s*\\(PRIVATE\\)|Owner|المالك') || '';
  const ownerParts = ownerBlock.split(/[|]/).map((s) => s.trim()).filter(Boolean);
  let ownerName = null;
  let ownerPhone = null;
  let unitNumber = null;
  for (const part of ownerParts) {
    const phoneM = part.match(/(\+?20)?(01[0125][\d\s\-().]{6,12}\d)/);
    if (phoneM && !ownerPhone) { ownerPhone = phoneM[0].trim(); continue; }
    const unitM = part.match(/^(?:Unit\s*#?|رقم\s*الوحدة|Unit\s*number)\s*[:：]?\s*(.+)$/i) || part.match(/^#?\s*(\d{1,6}[A-Za-z-]?)$/);
    if (unitM && !unitNumber) { unitNumber = unitM[1].trim(); continue; }
    if (!ownerName && part && !/^unit/i.test(part)) ownerName = part;
  }

  // • Notes: [View / Key Status]
  const notes = field('Notes|ملاحظات');

  return {
    __shape: 'UNIT_INTAKE_CARD',
    listingType,
    dealTypeRaw,
    propertyType,
    compound,
    district: null,
    floor,
    furnishing,
    finishing: null,
    view: notes, // notes carry view/key status per the card contract
    areaSqm,
    bedrooms,
    bathrooms,
    masterBedrooms: null,
    price,
    paymentTerms,
    deposit,
    availability: null,
    owner: { name: ownerName, phone: ownerPhone, unitNumber },
    notes,
  };
}

// ── S2: Bot → Agent — unit verified outcome ────────────────────────────────
function renderUnitVerifiedShape({ code, rowNumber, gem, dqeFlag, broadcast }) {
  return [
    `✅ [UNIT VERIFIED]`,
    `• Code: ${code}`,
    `• Master Sheet Row: ${rowNumber ?? '—'}`,
    `• Status: ${dqeFlag ? 'DQE Flag — price variance (team will review)' : 'Pending Verification'}`,
    gem ? `• 💎 GEM candidate detected — flagged for priority marketing` : '',
    `• Broadcast: ${broadcast ? 'General group notified (sanitized)' : 'pending sheet sync'}`,
    `• Owner contact: stored internally only — never broadcast.`,
  ].filter(Boolean).join('\n');
}

// ── S3: Owner → Bot — availability reply shape ─────────────────────────────
/** Classify an owner reply into the S3 shape (used by the paced outreach
 *  + dispatch lanes; mirrors workflows/lib/inbox.js classifyOwnerReply with
 *  the structured header honored first). */
function parseOwnerReply(rawText) {
  const text = toWesternDigits(String(rawText || ''));
  const lower = text.toLowerCase();
  let answer = 'unknown';
  if (/\u{1F4DE}\s*\[?OWNER\s*REPLY\]?/iu.test(text)) {
    if (/available|متاح|متاحة|نعم|yes|شغال/i.test(lower)) answer = 'available';
    else if (/sold|rented|باع|اتأجر|اتجرت|mabrouk/i.test(lower)) answer = 'unavailable';
    else if (/later|لاحقا|بعدين|مش\s*دلوقتي/i.test(lower)) answer = 'later';
  } else {
    if (/(متاح|متاحة|yes|available|شغال|عايز|نزل)/i.test(lower)) answer = 'available';
    else if (/(باع|اتأجر|اتاجر|sold|rented|خلاص|مش\s*متاح)/i.test(lower)) answer = 'unavailable';
  }
  const unitCodeM = text.match(/\b((?:SE-)?(?:RENT|SALE)-\d{3,6}|[A-Z]{2,4}-[A-Z]\d{3,6})\b/i);
  return { shape: 'OWNER_REPLY', answer, unitCode: unitCodeM ? unitCodeM[1].toUpperCase() : null, raw: text.slice(0, 400) };
}

// ── S4: Buyer → Bot — inquiry shape ────────────────────────────────────────
function renderBuyerInquiryShape(lead, matches) {
  const lines = [
    `🏠 [BUYER INQUIRY]`,
    `• Client: ${lead.name || lead.full_name || 'New client'}`,
    `• Interest: ${lead.intent || lead.interest || 'General'}`,
    `• Budget: ${lead.budget || 'Not specified'}`,
    `• Preferred: ${lead.compound || lead.area || 'Open'}`,
    `• Source: ${lead.source || 'Website'}`,
  ];
  if (matches && matches.length) {
    lines.push(`• Top matches:`);
    matches.slice(0, 5).forEach((m, i) => {
      lines.push(`   ${i + 1}. ${m.code || m.id} — ${m.compound} · ${Number(m.price).toLocaleString('en-US')} EGP${String(m.deal_type).toLowerCase() === 'rent' ? '/mo' : ''}`);
    });
  }
  return lines.join('\n');
}

// ── S5: Employee → Bot — command shape ─────────────────────────────────────
const COMMAND_RE = /\u2699\uFE0F?\s*\[?COMMAND\]?/iu;
function parseCommandShape(rawText) {
  const text = String(rawText || '').trim();
  if (!COMMAND_RE.test(text)) return null;
  const body = text.replace(COMMAND_RE, '').trim();
  const m = body.match(/^\/?([a-z_]+)(?:\s+([\s\S]*))?$/i);
  if (!m) return { shape: 'COMMAND', command: null, args: null, raw: body };
  return { shape: 'COMMAND', command: m[1].toLowerCase(), args: (m[2] || '').trim() || null, raw: body };
}

// ── S6: Bot → Admin OS — alert shape ───────────────────────────────────────
function renderAlertShape({ severity, source, message, unitCode, action }) {
  const icon = severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
  return [
    `${icon} [ALERT]`,
    `• Severity: ${severity}`,
    `• Source: ${source}`,
    unitCode ? `• Unit: ${unitCode}` : '',
    `• ${message}`,
    action ? `• Action: ${action}` : '',
  ].filter(Boolean).join('\n');
}

module.exports = {
  isUnitIntakeCard,
  parseUnitIntakeCard,
  renderUnitVerifiedShape,
  parseOwnerReply,
  renderBuyerInquiryShape,
  parseCommandShape,
  renderAlertShape,
};
