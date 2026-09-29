/**
 * SIERRA ESTATES — EASY LISTING: smart coding & routing engine.
 *
 * Takes the random pasted property text a data-entry clerk / owner / broker
 * sends, extracts the structured fields, mints the internal reference code
 * and decides the routing destination:
 *
 *   AGENT | OWNER → MAIN_INVENTORY (public.listings, staged as
 *                     'Pending Review' by the route) + generated
 *                     Facebook / PropertyFinder ad copy.
 *   BROKER       → MAP_SHEET (public.map_sheet_entries, migration 018) —
 *                     no ads; the WhatsApp bot asks the broker for photos
 *                     later when a serious client shows up.
 *
 * HONESTY CONTRACT (mirrors the house rule: never fabricate inventory data):
 * every field the text does not contain is returned as null with a
 * parse_warning — unlike the older /api/listings/easy-parse heuristics, this
 * module NEVER substitutes default values for beds / baths / area / price.
 * The internal code format is:
 *
 *   [REGION]-[COMPOUND]-[UNIT_TYPE]-[FLOOR]-[AREA]M     e.g. NC-MIV-APT-F2-175M
 *
 * with 'UNK' segments (and 'FX' for an undetected floor) when the text does
 * not carry the information, so a human can see the gap instead of trusting
 * an invented value.
 */

export type EasyListingRole = 'AGENT' | 'OWNER' | 'BROKER';
export type EasyListingRouting = 'MAIN_INVENTORY' | 'MAP_SHEET';

export interface EasyListingInput {
  role: string;
  name: string;
  phone: string;
  details: string;
}

export interface EasyListingPropertyDetails {
  region: string | null;
  compound: string | null;
  unit_type: string | null;
  area_m2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  price_egp: number | null;
  deal_type: 'sale' | 'rent';
}

export interface EasyListingAds {
  facebook: string;
  property_finder: string;
}

export interface EasyListingResult {
  role: EasyListingRole;
  routing_destination: EasyListingRouting;
  uploader_name: string;
  uploader_phone: string;
  internal_code: string;
  property_details: EasyListingPropertyDetails;
  floor_label: string | null;
  /** Numeric floor when parsed (F2 → 2); null for RF/PH/MZ/FX/unknown. */
  floor_number: number | null;
  parse_warnings: string[];
  automation_flags: {
    auto_publish_ads: boolean;
    trigger_photo_request_bot: boolean;
  };
  ads: EasyListingAds | null;
}

/* ───────────────────────── normalization ───────────────────────── */

/** Eastern Arabic numerals → ASCII (same table as the voice parser). */
const EASTERN: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

export function normalizeArabicNumbers(text: string): string {
  return text.replace(/[٠-٩]/g, (c) => EASTERN[c] ?? c);
}

function normalizeText(text: string): string {
  return normalizeArabicNumbers(text)
    .replace(/[\u0640\u064B-\u065F]/g, '') // tatweel + harakat
    .replace(/[إأآ]/g, 'ا') // unify alef variants so word matching is deterministic
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/* ───────────────────────── role routing ───────────────────────── */

const ROLE_MAP: Array<{ codes: string[]; role: EasyListingRole }> = [
  { role: 'AGENT', codes: ['موظف', 'موظفة', 'employee', 'agent', 'staff'] },
  { role: 'OWNER', codes: ['مالك', 'مالكة', 'owner'] },
  { role: 'BROKER', codes: ['وسيط', 'وسيطة', 'broker'] },
];

export function normalizeRole(raw: string): EasyListingRole | null {
  const v = normalizeText(raw || '');
  for (const { role, codes } of ROLE_MAP) {
    if (codes.some((c) => v === c || v === normalizeText(c))) return role;
  }
  // Exact English enum passes straight through.
  const up = (raw || '').trim().toUpperCase();
  if (up === 'AGENT' || up === 'OWNER' || up === 'BROKER') return up;
  return null;
}

/* ───────────────────────── regions & compounds ───────────────────────── */

interface CompoundEntry {
  code: string;
  label: string;
  region: string;
  regionLabel: string;
  /** lowercase match tokens (post-normalization) */
  tokens: string[];
}

/**
 * Compound vocabulary reuses the two existing Arabic extractors
 * (voice-inventory-parser.ts + /api/listings/easy-parse) — the only addition
 * is the short CODE segment the Easy Listing internal code needs.
 */
const COMPOUNDS: CompoundEntry[] = [
  { code: 'MIV', label: 'Mivida', region: 'NC', regionLabel: 'New Cairo', tokens: ['ميفيدا', 'ميفيلد', 'mivida'] },
  { code: 'EST', label: 'Eastown', region: 'NC', regionLabel: 'New Cairo', tokens: ['ايستاون', 'ايست تاون', 'eastown'] },
  { code: 'MDY', label: 'Madinaty', region: 'NC', regionLabel: 'New Cairo', tokens: ['مدينتي', 'madinaty'] },
  { code: 'RBH', label: 'Al Rehab City', region: 'NC', regionLabel: 'New Cairo', tokens: ['الرحاب', 'rehab'] },
  { code: 'PHC', label: 'Palm Hills New Cairo', region: 'NC', regionLabel: 'New Cairo', tokens: ['بالم هيلز', 'palm hills'] },
  { code: 'HDP', label: 'Hyde Park', region: 'NC', regionLabel: 'New Cairo', tokens: ['هايد بارك', 'hyde park'] },
  { code: 'MTV', label: 'Mountain View iCity', region: 'NC', regionLabel: 'New Cairo', tokens: ['ماونتن فيو', 'mountain view'] },
  { code: 'VLT', label: 'Villette', region: 'NC', regionLabel: 'New Cairo', tokens: ['فيليت', 'فيليه', 'villette'] },
  { code: 'SLK', label: 'Swan Lake', region: 'NC', regionLabel: 'New Cairo', tokens: ['سوان ليك', 'swan lake'] },
  { code: 'WTW', label: 'Waterway', region: 'NC', regionLabel: 'New Cairo', tokens: ['ووتر واي', 'waterway'] },
  { code: 'CFC', label: 'Cairo Festival City', region: 'NC', regionLabel: 'New Cairo', tokens: ['كايرو فيستيفال', 'festival city', 'cfc'] },
  { code: 'FSQ', label: 'Fifth Square', region: 'NC', regionLabel: 'New Cairo', tokens: ['فيفث سكوير', 'fifth square'] },
  { code: 'BEW', label: 'Beit El Watan', region: 'NC', regionLabel: 'New Cairo', tokens: ['بيت الوطن', 'beit el watan'] },
  { code: 'KTM', label: 'Katameya', region: 'NC', regionLabel: 'New Cairo', tokens: ['القطامية', 'قطامية', 'katameya'] },
  { code: 'LKV', label: 'Lake View', region: 'NC', regionLabel: 'New Cairo', tokens: ['ليك فيو', 'lake view'] },
  { code: 'UPT', label: 'Uptown Cairo', region: 'NC', regionLabel: 'Cairo', tokens: ['اب تاون', 'أب تاون', 'uptown'] },
  { code: 'ZED', label: 'Zed', region: 'ZYD', regionLabel: 'Sheikh Zayed', tokens: ['زيد ايست', 'zed east', 'zed'] },
];

interface RegionEntry {
  code: string;
  label: string;
  tokens: string[];
}

const REGIONS: RegionEntry[] = [
  { code: 'NC', label: 'New Cairo', tokens: ['التجمع الخامس', 'التجمع', 'تجمع', 'نيو كايرو', 'القاهرة الجديدة', 'new cairo', '5th settlement'] },
  { code: 'NCA', label: 'New Administrative Capital', tokens: ['العاصمة الادارية', 'العاصمة', 'new capital', 'العاصمه'] },
  { code: 'NCS', label: 'North Coast', tokens: ['الساحل الشمالي', 'ساحل', 'north coast', 'sahel'] },
  { code: 'ZYD', label: 'Sheikh Zayed', tokens: ['الشيخ زايد', 'زايد', 'sheikh zayed', 'zayed'] },
  { code: 'OCT', label: '6th of October', tokens: ['٦ اكتوبر', '6 اكتوبر', 'السادس من اكتوبر', 'october', 'اكتوبر'] },
  { code: 'MAD', label: 'Maadi', tokens: ['المعادي', 'معادي', 'maadi'] },
];

function findCompound(norm: string): CompoundEntry | null {
  for (const c of COMPOUNDS) {
    if (c.tokens.some((t) => norm.includes(t))) return c;
  }
  return null;
}

function findRegion(norm: string): RegionEntry | null {
  for (const r of REGIONS) {
    if (r.tokens.some((t) => norm.includes(t))) return r;
  }
  return null;
}

/* ───────────────────────── unit types & floors ───────────────────────── */

interface UnitTypeEntry {
  code: string;
  label: string;
  tokens: string[];
}

const UNIT_TYPES: UnitTypeEntry[] = [
  { code: 'TWH', label: 'Twin House', tokens: ['توين هاوس', 'توين', 'twin house', 'twin'] },
  { code: 'TWN', label: 'Townhouse', tokens: ['تاون هاوس', 'تاونهاوس', 'تاون', 'townhouse'] },
  { code: 'VIL', label: 'Villa', tokens: ['فيلا', 'villa', 'مستقلة', 'standalone'] },
  { code: 'PEN', label: 'Penthouse', tokens: ['بنتهاوس', 'بنت هاوس', 'penthouse'] },
  { code: 'RUF', label: 'Roof', tokens: ['روف', 'roof'] },
  { code: 'DUP', label: 'Duplex', tokens: ['دوبلكس', 'duplex'] },
  { code: 'STU', label: 'Studio', tokens: ['استوديو', 'ستوديو', 'studio'] },
  { code: 'OFF', label: 'Office', tokens: ['مكتب', 'اداري', 'إداري', 'office'] },
  { code: 'RET', label: 'Retail', tokens: ['محل', 'تجاري', 'retail', 'shop'] },
  { code: 'CLI', label: 'Clinic', tokens: ['عيادة', 'clinic'] },
  { code: 'APT', label: 'Apartment', tokens: ['شقة', 'شقه', 'apartment', 'flat'] },
];

function findUnitType(norm: string): UnitTypeEntry | null {
  for (const u of UNIT_TYPES) {
    if (u.tokens.some((t) => norm.includes(t))) return u;
  }
  return null;
}

/** Ordered floor words → number. Matches the Egyptian convention (دور أول = 1). */
const FLOOR_WORDS: Array<{ n: number; tokens: string[] }> = [
  { n: 1, tokens: ['الاول', 'اولي', 'اول'] },
  { n: 2, tokens: ['الثاني', 'ثاني', 'تاني'] },
  { n: 3, tokens: ['الثالث', 'ثالث', 'تالت'] },
  { n: 4, tokens: ['الرابع', 'رابع'] },
  { n: 5, tokens: ['الخامس', 'خامس'] },
  { n: 6, tokens: ['السادس', 'سادس'] },
  { n: 7, tokens: ['السابع', 'سابع'] },
  { n: 8, tokens: ['الثامن', 'ثامن'] },
  { n: 9, tokens: ['التاسع', 'تاسع'] },
  { n: 10, tokens: ['العاشر', 'عاشر'] },
];

const FLOOR_SPECIAL: Array<{ code: string; label: string; tokens: string[] }> = [
  { code: 'PH', label: 'Penthouse', tokens: ['بنتهاوس', 'بنت هاوس'] },
  { code: 'RF', label: 'Roof', tokens: ['روف'] },
  { code: 'MZ', label: 'Mezzanine', tokens: ['ميزانين', 'mezzanine'] },
  { code: 'F0', label: 'Ground Floor', tokens: ['الارضي', 'ارضي', 'ground'] },
];

interface FloorInfo {
  code: string;
  label: string;
  number: number | null;
  detected: boolean;
}

function parseFloor(norm: string): FloorInfo | null {
  // "الدور 3" / "دور رقم 3" / "floor 3"
  const floorDigit = norm.match(/(?:دور|طابق|floor)\s*(?:رقم\s*)?(\d{1,2})/);
  if (floorDigit) {
    const n = parseInt(floorDigit[1], 10);
    return { code: `F${n}`, label: `Floor ${n}`, number: n, detected: true };
  }
  // "الدور الثالث" / "دور تاني" — word numbers, most specific first
  const floorWord = norm.match(/(?:دور|طابق|floor)\s*([^\s,]+)/);
  if (floorWord) {
    const w = floorWord[1];
    for (const { n, tokens } of FLOOR_WORDS) {
      if (tokens.some((t) => w === t || w.includes(t))) {
        return { code: `F${n}`, label: `Floor ${n}`, number: n, detected: true };
      }
    }
    for (const special of FLOOR_SPECIAL) {
      if (special.tokens.some((t) => w === t || w.includes(t))) {
        return { code: special.code, label: special.label, number: null, detected: true };
      }
    }
  }
  // standalone mentions without the دور prefix
  for (const special of FLOOR_SPECIAL) {
    if (special.tokens.some((t) => norm.includes(t))) {
      return { code: special.code, label: special.label, number: null, detected: true };
    }
  }
  return null;
}

/* ───────────────────────── numbers ───────────────────────── */

function parseArea(norm: string): number | null {
  // The bare-م alternative must not match the م of مليون / ميفيدا — hence
  // the negative lookahead on the next Arabic letter.
  const m =
    norm.match(/(\d{2,4})(?:\.\d)?\s*(?:متر|م٢|م²|m2|sqm|م(?![\u0621-\u064A]))/) ||
    norm.match(/(?:مساحة|area)\s*[:=]?\s*(\d{2,4})/);
  if (!m) return null;
  const v = Math.round(parseFloat(m[1]));
  return v >= 15 && v <= 5000 ? v : null;
}

function parsePrice(norm: string): number | null {
  // "8 مليون" / "8.5 مليون دولار"? — only EGP supported by the code contract;
  // "مليون" without currency is EGP by house convention.
  const million = norm.match(/(\d+(?:[.,]\d+)?)\s*(?:مليون|million|m\b)/);
  if (million) {
    const v = parseFloat(million[1].replace(',', '.'));
    if (v > 0 && v < 1000) return Math.round(v * 1_000_000);
  }
  const thousand = norm.match(/(\d+(?:[.,]\d+)?)\s*(?:الف|ألف|k\b)/);
  if (thousand) {
    const v = parseFloat(thousand[1].replace(',', '.'));
    if (v > 0 && v < 100_000) return Math.round(v * 1_000);
  }
  // plain big number, comma or plain digits — "8000000" / "8,000,000"
  const plain = norm.match(/\b(\d{1,3}(?:,\d{3})+|\d{6,10})\b/);
  if (plain) {
    const v = parseInt(plain[1].replace(/,/g, ''), 10);
    if (v >= 50_000 && v <= 5_000_000_000) return v;
  }
  return null;
}

function parseCount(norm: string, patterns: RegExp[]): number | null {
  for (const re of patterns) {
    const m = norm.match(re);
    if (m) {
      const v = parseInt(m[1], 10);
      if (v >= 0 && v <= 20) return v;
    }
  }
  return null;
}

/* ───────────────────────── phone ───────────────────────── */

/**
 * Egyptian mobile validation. Accepts local (01xxxxxxxxx), international
 * (+20 / 20 prefixed) and normalizes separators. Anything else is rejected —
 * a mistyped phone number must fail loudly, not silently corrupt the lead.
 */
export function normalizeEgyptianPhone(raw: string): string | null {
  let n = (raw || '').replace(/[^\d]/g, ''); // digits only; '+' is re-added at the end
  if (n.startsWith('0020')) n = n.slice(2); // 0020 + international → 20…
  // International form: 20 + local-without-leading-0 → restore the trunk 0.
  if (/^20(1[0125]\d{8})$/.test(n)) n = `0${n.slice(2)}`;
  if (/^01[0125]\d{8}$/.test(n)) return `+20${n.slice(1)}`;
  return null;
}

/* ───────────────────────── ad generation ───────────────────────── */

function fmtEGP(v: number): string {
  return `${v.toLocaleString('en-US')} EGP`;
}

/**
 * Ad copy is assembled ONLY from parsed fields — a missing price becomes
 * "السعر عند الطلب", never an invented number. Generated exclusively for
 * AGENT/OWNER (MAIN_INVENTORY) submissions; broker units stay unadvertised
 * until photos arrive and the unit is promoted.
 */
export function generateAds(
  role: EasyListingRole,
  name: string,
  phone: string,
  d: EasyListingPropertyDetails,
  floorLabel: string | null,
  internalCode: string,
): EasyListingAds | null {
  if (role === 'BROKER') return null;

  const where = [d.compound, d.region].filter(Boolean).join(' — ');
  const priceLine = d.price_egp ? fmtEGP(d.price_egp) : 'السعر عند الطلب';
  const areaLine = d.area_m2 ? `${d.area_m2} م²` : null;
  const specParts = [
    d.unit_type,
    areaLine,
    floorLabel,
    d.bedrooms != null ? `${d.bedrooms} غرف` : null,
    d.bathrooms != null ? `${d.bathrooms} حمام` : null,
  ].filter(Boolean);
  const specs = specParts.join(' · ');
  const dealWord = d.deal_type === 'rent' ? 'للإيجار' : 'للبيع';

  const facebook = [
    `🏡 ${dealWord} — ${where || 'موقع مميز'}`,
    specs ? `📋 ${specs}` : null,
    `💰 ${priceLine}`,
    `🔖 كود الوحدة: ${internalCode}`,
    '',
    `📞 ${name} — ${phone}`,
    'Sierra Blu Realty',
  ]
    .filter((l) => l !== null)
    .join('\n');

  const property_finder = [
    `${d.unit_type ?? 'Unit'} ${dealWord} — ${where || ''}`.trim(),
    specs,
    `Price: ${d.price_egp ? d.price_egp.toLocaleString('en-US') + ' EGP' : 'on request'}`,
    `Contact: ${name} (${phone}) — Sierra Blu Realty`,
    `Ref: ${internalCode}`,
  ].join('\n');

  return { facebook, property_finder };
}

/* ───────────────────────── main entry ───────────────────────── */

export class EasyListingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EasyListingValidationError';
  }
}

export function parseEasyListing(input: EasyListingInput): EasyListingResult {
  const role = normalizeRole(input.role);
  if (!role) {
    throw new EasyListingValidationError(
      'uploader_role must be one of AGENT / OWNER / BROKER (موظف / مالك / وسيط)',
    );
  }

  const name = (input.name || '').trim();
  if (name.length < 2) {
    throw new EasyListingValidationError('uploader_name is required');
  }

  const phone = normalizeEgyptianPhone(input.phone || '');
  if (!phone) {
    throw new EasyListingValidationError(
      'uploader_phone must be a valid Egyptian mobile (01xxxxxxxxx)',
    );
  }

  const details = (input.details || '').trim();
  if (details.length < 5) {
    throw new EasyListingValidationError('property details text is required (min 5 chars)');
  }

  const norm = normalizeText(details);
  const warnings: string[] = [];

  // compound → also fixes the region when the text only names the compound
  const compound = findCompound(norm);
  const region = findRegion(norm);
  const regionCode = region?.code ?? compound?.region ?? 'UNK';
  const regionLabel = region?.label ?? compound?.regionLabel ?? null;
  if (!compound && !region) warnings.push('region_not_detected');

  let compoundCode = 'UNK';
  let compoundLabel: string | null = null;
  if (compound) {
    compoundCode = compound.code;
    compoundLabel = compound.label;
  } else {
    // Deterministic fallback for latin compound names the vocabulary lacks:
    // first 3 letters, upper-cased (mirrors coding-algorithm's compact
    // token). Unit-type / region / filler words are excluded so the fallback
    // never mistakes 'apartment in New Cairo' for a compound name.
    const latin = (details.match(/[a-z]{3,}/gi) || []).map((w) => w.toLowerCase());
    const filler = new Set([
      'new', 'cairo', 'city', 'the', 'in', 'for', 'sale', 'rent', 'and',
      'with', 'million', 'sqm', 'm2', 'egp', 'price', 'area', 'floor',
      ...REGIONS.flatMap((r) => r.tokens),
      ...UNIT_TYPES.flatMap((u) => u.tokens),
    ]);
    const candidate = latin.find((w) => !filler.has(w));
    if (candidate) {
      compoundCode = candidate.slice(0, 3).toUpperCase().padEnd(3, 'X');
      compoundLabel = candidate;
    } else {
      warnings.push('compound_not_recognized');
    }
  }

  const unit = findUnitType(norm);
  const unitCode = unit?.code ?? 'UNK';
  const unitLabel = unit?.label ?? null;
  if (!unit) warnings.push('unit_type_not_detected');

  const floor = parseFloor(norm);
  const floorCode = floor?.code ?? 'FX';
  const floorLabel = floor?.label ?? null;
  if (!floor) warnings.push('floor_not_detected');

  const area = parseArea(norm);
  if (area == null) {
    throw new EasyListingValidationError(
      'area (المساحة) is required to generate the internal code — e.g. "175 متر"',
    );
  }

  const bedrooms = parseCount(norm, [
    /(\d+)\s*(?:غرف|غرفه|نوم|beds?\b)/,
    /(?:غرف|نوم|beds?)\s*[:=]?\s*(\d+)/,
  ]);
  const bathrooms = parseCount(norm, [
    /(\d+)\s*(?:حمامات|حمام|baths?\b)/,
    /(?:حمامات|حمام|baths?)\s*[:=]?\s*(\d+)/,
  ]);
  // Egyptian Arabic dual forms carry the number inside the word.
  const bedroomsFinal = bedrooms ?? (/غرفتين/.test(norm) ? 2 : null);
  const bathroomsFinal = bathrooms ?? (/حمامين|حمامتين/.test(norm) ? 2 : null);
  if (bedroomsFinal == null) warnings.push('bedrooms_not_detected');
  if (bathroomsFinal == null) warnings.push('bathrooms_not_detected');

  const isRent = /ايجار|إيجار|للايجار|للإيجار|rent/.test(norm);
  const deal_type: 'sale' | 'rent' = isRent ? 'rent' : 'sale';
  if (!isRent && !/بيع|sale|مطلوب/.test(norm)) warnings.push('deal_type_assumed_sale');

  const price = parsePrice(norm);
  if (price == null) warnings.push('price_not_detected');

  const property_details: EasyListingPropertyDetails = {
    region: regionLabel,
    compound: compoundLabel,
    unit_type: unitLabel,
    area_m2: area,
    bedrooms: bedroomsFinal,
    bathrooms: bathroomsFinal,
    price_egp: price,
    deal_type,
  };

  const internal_code = `${regionCode}-${compoundCode}-${unitCode}-${floorCode}-${area}M`;

  const routing_destination: EasyListingRouting =
    role === 'BROKER' ? 'MAP_SHEET' : 'MAIN_INVENTORY';

  const ads = generateAds(role, name, phone, property_details, floorLabel, internal_code);

  return {
    role,
    routing_destination,
    uploader_name: name,
    uploader_phone: phone,
    internal_code,
    property_details,
    floor_label: floorLabel,
    floor_number: floor?.number ?? null,
    parse_warnings: warnings,
    automation_flags: {
      auto_publish_ads: routing_destination === 'MAIN_INVENTORY',
      trigger_photo_request_bot: routing_destination === 'MAP_SHEET',
    },
    ads,
  };
}

/**
 * The exact JSON payload contract the Easy Listing system promises its
 * programmatic consumers (the admin console / bot render this verbatim).
 */
export interface EasyListingPayload {
  uploader_role: EasyListingRole;
  uploader_name: string;
  uploader_phone: string;
  internal_code: string;
  routing_destination: EasyListingRouting;
  property_details: {
    region: string | null;
    compound: string | null;
    unit_type: string | null;
    area_m2: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    price_egp: number | null;
  };
  automation_flags: {
    auto_publish_ads: boolean;
    trigger_photo_request_bot: boolean;
  };
}

export function toPayload(r: EasyListingResult): EasyListingPayload {
  return {
    uploader_role: r.role,
    uploader_name: r.uploader_name,
    uploader_phone: r.uploader_phone,
    internal_code: r.internal_code,
    routing_destination: r.routing_destination,
    property_details: {
      region: r.property_details.region,
      compound: r.property_details.compound,
      unit_type: r.property_details.unit_type,
      area_m2: r.property_details.area_m2,
      bedrooms: r.property_details.bedrooms,
      bathrooms: r.property_details.bathrooms,
      price_egp: r.property_details.price_egp,
    },
    automation_flags: r.automation_flags,
  };
}

/** Arabic one-liner the bot / console shows after a successful entry. */
export function summarizeAr(r: EasyListingResult): string {
  const dest =
    r.routing_destination === 'MAIN_INVENTORY'
      ? 'المخزون الرئيسي (MAIN_INVENTORY) — سيتم مراجعة الوحدة ونشرها بعد التحقق'
      : 'شيت الخريطة (MAP_SHEET) — بدون إعلانات حتى وصول الصور ووجود عميل جاد';
  const lines = [
    `✅ تم تحليل الوحدة وتوجيهها بنجاح.`,
    `🔖 الكود المرجعي: ${r.internal_code}`,
    `📂 المسار: ${dest}`,
  ];
  if (r.parse_warnings.length > 0) {
    lines.push(`⚠️ حقول لم تُذكر في النص: ${r.parse_warnings.map(arWarning).join('، ')}`);
  }
  return lines.join('\n');
}

function arWarning(w: string): string {
  const map: Record<string, string> = {
    region_not_detected: 'المنطقة',
    compound_not_recognized: 'اسم الكمبوند',
    unit_type_not_detected: 'نوع الوحدة',
    floor_not_detected: 'الدور',
    bedrooms_not_detected: 'عدد الغرف',
    bathrooms_not_detected: 'عدد الحمامات',
    price_not_detected: 'السعر',
    deal_type_assumed_sale: 'نوع الصفقة (افترضنا بيع)',
  };
  return map[w] ?? w;
}
