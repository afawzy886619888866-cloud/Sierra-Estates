/**
 * SIERRA ESTATES — Semantic Search Service
 *
 * Bilingual (Arabic + English) natural-language search for listings.
 * Built for the Egyptian market with foreigner renters in mind:
 *
 *   - "3 bedroom apartment for rent in New Cairo under 50k EGP"
 *   - "شقة 3 غرف للإيجار في التجمع الخامس تحت ٥٠ ألف"
 *   - "furnished studio Tagamoa monthly 20k"
 *   - "فيلا مفروشة الشيخ زايد شهرية"
 *
 * Flow:
 *   1. Extract structured SearchIntent from the natural-language query
 *      using Gemini. Falls back to a naive regex-based extractor when the
 *      AI service is unavailable (no API key, network error, etc.).
 *   2. Build a Firestore query from the intent.
 *   3. Score each result by how many intent fields it matches.
 *   4. Return ranked results.
 *
 * The AI extraction handles:
 *   - Arabic numerals (٣ → 3)
 *   - Arabizi ("3" for "ع")
 *   - Mixed Arabic/English ("شقة 3 rooms")
 *   - Egyptian real-estate vocabulary (Tagamoa, Sheikh Zayed, New Cairo,
 *     New Administrative Capital, etc.)
 */

import 'server-only';
import { adminDb } from '@/lib/server/firebase-admin';
import { GoogleAIService } from '@/lib/server/google-ai';
import {
  searchIntentSchema,
  type SearchIntent,
} from '@/lib/server/schemas';
import { logger } from '@/lib/logger';
import { COLLECTIONS } from '@/lib/models/schema';

// ─── Types ────────────────────────────────────────────────────────────────

export interface SearchResult {
  id: string;
  title: string;
  titleAr?: string;
  price: number;
  monthlyRent?: number;
  currency: string;
  compound: string;
  district?: string;
  city?: string;
  beds: number;
  baths: number;
  area: number;
  propertyType: string;
  status: string;
  furnishing?: string;
  image?: string | null;
  images?: string[];
  /** AI match score 0-100. */
  matchScore: number;
  /** Human-readable explanation of the match (locale-aware). */
  matchReason: string;
  /** Whether this listing is rentable. */
  isRental: boolean;
}

export interface SemanticSearchResponse {
  results: SearchResult[];
  intent: SearchIntent;
  /** How the intent was extracted. */
  extractionMethod: 'ai' | 'regex-fallback';
  total: number;
  query: string;
  locale: 'en' | 'ar';
}

// ─── AI intent extraction ─────────────────────────────────────────────────

const INTENT_EXTRACTION_PROMPT = {
  system: `You are a real-estate search intent extractor for the Egyptian market (Cairo, New Cairo, Tagamoa, Sheikh Zayed, New Administrative Capital, 6th of October, Maadi, Zamalek).

Your job: read the user's natural-language search query and extract a structured JSON intent. The query may be in English, Arabic, or mixed (including Arabizi like "3" for "ع" and Arabic-Indic numerals like "٣" for "3").

Egyptian real-estate vocabulary you should recognize:
- "إيجار / للإيجار / rent / rental / monthly" → offerType: "rent"
- "بيع / للبيع / sale / buy / purchase" → offerType: "sale"
- "شقة / apartment / flat" → propertyType: "apartment"
- "فيلا / villa / house" → propertyType: "villa"
- "استوديو / studio" → propertyType: "studio"
- "دوبلكس / duplex" → propertyType: "duplex"
- "بنتهاوس / penthouse" → propertyType: "penthouse"
- "التجمع الخامس / Tagamoa / Fifth Settlement" → districts: ["Tagamoa", "Fifth Settlement"]
- "القاهرة الجديدة / New Cairo" → districts: ["New Cairo"]
- "الشيخ زايد / Sheikh Zayed" → districts: ["Sheikh Zayed"]
- "٦ أكتوبر / 6th of October / October" → districts: ["6th of October"]
- "المعادي / Maadi" → districts: ["Maadi"]
- "الزمالك / Zamalek" → districts: ["Zamalek"]
- "العاصمة الإدارية / New Capital / Administrative Capital" → districts: ["New Administrative Capital"]
- "مفروش / مفروشة / furnished" → furnishing: "furnished"
- "غير مفروش / unfurnished" → furnishing: "unfurnished"
- "نص مفروش / semi-furnished" → furnishing: "semi-furnished"
- Currency defaults to EGP. If user says "$" or "USD" or "دولار", use USD.
- Price ranges: "تحت ٥٠ ألف" / "under 50k" → priceMax: 50000
- "٥٠ لـ ١٠٠ ألف" / "50k to 100k" → priceMin: 50000, priceMax: 100000
- For rent queries, price = monthly rent. For sale queries, price = total price.

Respond with ONLY a JSON object matching this exact schema. No prose, no markdown fences:
{
  "offerType": "rent" | "sale" | "any",
  "propertyType": "apartment" | "villa" | "townhouse" | "duplex" | "penthouse" | "studio" | "chalet" | "commercial" | "land" | "any",
  "bedsMin": number | undefined,
  "bedsMax": number | undefined,
  "bathsMin": number | undefined,
  "bathsMax": number | undefined,
  "areaMin": number | undefined,
  "areaMax": number | undefined,
  "priceMin": number | undefined,
  "priceMax": number | undefined,
  "currency": "EGP" | "USD" | "EUR" | "AED" | "SAR",
  "compounds": string[],
  "districts": string[],
  "furnishing": "furnished" | "semi-furnished" | "unfurnished" | "any",
  "features": string[],
  "detectedLocale": "en" | "ar",
  "notes": string | undefined
}

If a field cannot be inferred from the query, omit it (for optional fields) or use the default ("any" for enums, "EGP" for currency, "en" for locale, [] for arrays).`,
  user: (query: string) => `Extract search intent from this query:\n\n${query}`,
};

async function extractIntentWithAI(
  query: string
): Promise<{ intent: SearchIntent; method: 'ai' }> {
  const raw = await GoogleAIService.generateContent(
    'search',
    'intent-extraction',
    {
      system: INTENT_EXTRACTION_PROMPT.system,
      user: INTENT_EXTRACTION_PROMPT.user(query),
    },
    { model: 'gemini-flash-latest', jsonMode: true, temperature: 0.1 }
  );

  // Defensive parse — Gemini sometimes wraps in markdown fences despite jsonMode.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  const parsed = JSON.parse(cleaned);
  const intent = searchIntentSchema.parse(parsed);
  return { intent, method: 'ai' };
}

// ─── Regex fallback (used when AI is unavailable) ──────────────────────────

const ARABIC_DIGITS: Record<string, number> = {
  '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4,
  '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9,
};

function normalizeArabicNumerals(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS[d] ?? 0));
}

function extractIntentWithRegex(query: string): SearchIntent {
  const q = normalizeArabicNumerals(query.toLowerCase());

  const offerType: SearchIntent['offerType'] =
    /إيجار|للإيجار|rent|rental|monthly|شهرية/.test(q)
      ? 'rent'
      : /بيع|للبيع|sale|buy|purchase/.test(q)
        ? 'sale'
        : 'any';

  const propertyType: SearchIntent['propertyType'] =
    /فيلا|villa|house/.test(q) ? 'villa'
    : /استوديو|studio/.test(q) ? 'studio'
    : /دوبلكس|duplex/.test(q) ? 'duplex'
    : /بنتهاوس|penthouse/.test(q) ? 'penthouse'
    : /شقة|apartment|flat/.test(q) ? 'apartment'
    : 'any';

  const bedsMatch = q.match(/(\d+)\s*(?:غرف|غرفة|bed|bedroom|br)/);
  const beds = bedsMatch ? parseInt(bedsMatch[1], 10) : undefined;

  const priceMatch = q.match(/(?:تحت|under|max|أقل من)\s*(\d+(?:k|,000| ألف)?)|(\d+(?:k|,000| ألف)?)\s*(?:تحت|under|max|أقل من)/);
  let priceMax: number | undefined;
  if (priceMatch) {
    const raw = priceMatch[1] || priceMatch[2];
    if (raw) {
      priceMax = raw.includes('k') || raw.includes('ألف')
        ? parseInt(raw.replace(/[k,]/g, '').replace(/ألف/g, '').trim(), 10) * 1000
        : parseInt(raw.replace(/,/g, ''), 10);
    }
  }

  const compounds: string[] = [];
  const districts: string[] = [];
  if (/التجمع|tagamoa|fifth settlement|الخامس/.test(q)) districts.push('Tagamoa', 'Fifth Settlement');
  if (/القاهرة الجديدة|new cairo/.test(q)) districts.push('New Cairo');
  if (/الشيخ زايد|sheikh zayed/.test(q)) districts.push('Sheikh Zayed');
  if (/٦ أكتوبر|6th of october|october/.test(q)) districts.push('6th of October');
  if (/المعادي|maadi/.test(q)) districts.push('Maadi');
  if (/الزمالك|zamalek/.test(q)) districts.push('Zamalek');
  if (/العاصمة الإدارية|new capital|administrative capital/.test(q)) districts.push('New Administrative Capital');

  const furnishing: SearchIntent['furnishing'] =
    /مفروش|furnished/.test(q) ? 'furnished'
    : /غير مفروش|unfurnished/.test(q) ? 'unfurnished'
    : /نص مفروش|semi-furnished/.test(q) ? 'semi-furnished'
    : 'any';

  const currency: SearchIntent['currency'] =
    /\$|usd|دولار/.test(q) ? 'USD'
    : /eur|يورو/.test(q) ? 'EUR'
    : /aed|درهم/.test(q) ? 'AED'
    : /sar|ريال سعودي/.test(q) ? 'SAR'
    : 'EGP';

  const detectedLocale: SearchIntent['detectedLocale'] =
    /[\u0600-\u06FF]/.test(query) ? 'ar' : 'en';

  return searchIntentSchema.parse({
    offerType,
    propertyType,
    bedsMin: beds,
    bedsMax: beds,
    priceMax,
    currency,
    compounds,
    districts,
    furnishing,
    detectedLocale,
  });
}

// ─── Firestore query + scoring ────────────────────────────────────────────

interface RawUnit {
  id?: string;
  title?: string;
  titleAr?: string;
  price?: number;
  monthlyRent?: number;
  currency?: string;
  compound?: string;
  location?: string;
  city?: string;
  district?: string;
  bedrooms?: number;
  rooms?: number;
  beds?: number;
  bathrooms?: number;
  baths?: number;
  area?: number;
  size?: number;
  propertyType?: string;
  type?: string;
  status?: string;
  finishingType?: string;
  furnishingStatus?: string;
  featuredImage?: string;
  images?: unknown[];
  amenities?: string[];
  features?: string[];
  monthlyRentUSD?: number;
}

function isRentalUnit(u: RawUnit, intent: SearchIntent): boolean {
  // A unit is rentable if it has a monthlyRent, OR the intent explicitly asks for rent.
  if (intent.offerType === 'rent') return true;
  if (intent.offerType === 'sale') return false;
  // 'any' — include units that have either price or monthlyRent
  return Boolean(u.monthlyRent) || Boolean(u.monthlyRentUSD);
}

function getEffectivePrice(u: RawUnit, intent: SearchIntent): number {
  if (intent.offerType === 'rent') {
    return u.monthlyRent ?? u.monthlyRentUSD ?? 0;
  }
  return u.price ?? 0;
}

function getBeds(u: RawUnit): number {
  return Number(u.bedrooms ?? u.rooms ?? u.beds ?? 0);
}

function getBaths(u: RawUnit): number {
  return Number(u.bathrooms ?? u.baths ?? 0);
}

function getArea(u: RawUnit): number {
  return Number(u.area ?? u.size ?? 0);
}

function getCompound(u: RawUnit): string {
  return String(u.compound ?? u.location ?? u.city ?? u.district ?? '');
}

function matchesDistrict(unit: RawUnit, districts: string[]): boolean {
  if (districts.length === 0) return true;
  const haystack = [
    unit.compound, unit.location, unit.city, unit.district,
  ].filter(Boolean).join(' ').toLowerCase();
  return districts.some((d) => haystack.includes(d.toLowerCase()));
}

function matchesFurnishing(unit: RawUnit, furnishing: SearchIntent['furnishing']): boolean {
  if (furnishing === 'any') return true;
  const f = String(unit.furnishingStatus ?? unit.finishingType ?? '').toLowerCase();
  if (furnishing === 'furnished') return f.includes('furnish') || f === 'f' || f.includes('fully');
  if (furnishing === 'unfurnished') return f.includes('unfurnish') || f === 'u' || f.includes('core');
  if (furnishing === 'semi-furnished') return f.includes('semi') || f === 's';
  return true;
}

function scoreUnit(unit: RawUnit, intent: SearchIntent): { score: number; reason: string } {
  let score = 50; // baseline
  const reasons: string[] = [];

  // Offer type match (heaviest weight)
  if (intent.offerType !== 'any') {
    const rentable = isRentalUnit(unit, intent);
    if ((intent.offerType === 'rent' && rentable) || (intent.offerType === 'sale' && unit.price)) {
      score += 25;
      reasons.push(intent.offerType === 'rent' ? 'rental match' : 'sale match');
    } else {
      score -= 20;
    }
  }

  // Beds match
  const beds = getBeds(unit);
  if (intent.bedsMin !== undefined || intent.bedsMax !== undefined) {
    const min = intent.bedsMin ?? 0;
    const max = intent.bedsMax ?? 99;
    if (beds >= min && beds <= max) {
      score += 15;
      reasons.push(`${beds} bedrooms`);
    } else {
      score -= 10;
    }
  }

  // Price match
  const price = getEffectivePrice(unit, intent);
  if (intent.priceMax !== undefined && price > 0) {
    if (price <= intent.priceMax) {
      score += 15;
      reasons.push(`price ${price.toLocaleString()} ${intent.currency}`);
    } else {
      score -= 15;
    }
  }
  if (intent.priceMin !== undefined && price >= intent.priceMin) {
    score += 5;
  }

  // District match
  if (intent.districts.length > 0 && matchesDistrict(unit, intent.districts)) {
    score += 20;
    reasons.push(`location: ${getCompound(unit)}`);
  }

  // Property type match
  if (intent.propertyType !== 'any') {
    const t = String(unit.propertyType ?? unit.type ?? '').toLowerCase();
    if (t === intent.propertyType || t.includes(intent.propertyType)) {
      score += 10;
      reasons.push(intent.propertyType);
    } else {
      score -= 5;
    }
  }

  // Furnishing match
  if (intent.furnishing !== 'any' && matchesFurnishing(unit, intent.furnishing)) {
    score += 10;
    reasons.push(intent.furnishing);
  }

  // Area match
  const area = getArea(unit);
  if ((intent.areaMin !== undefined || intent.areaMax !== undefined) && area > 0) {
    const min = intent.areaMin ?? 0;
    const max = intent.areaMax ?? 99999;
    if (area >= min && area <= max) {
      score += 5;
      reasons.push(`${area} sqm`);
    }
  }

  // Cap score at 0-100
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    reason: reasons.length > 0 ? reasons.join(' · ') : 'general match',
  };
}

function toSearchResult(
  unit: RawUnit,
  intent: SearchIntent
): SearchResult {
  const { score, reason } = scoreUnit(unit, intent);
  const imgs = Array.isArray(unit.images) ? unit.images : [];
  const firstImg = imgs[0];
  const image =
    (typeof unit.featuredImage === 'string' ? unit.featuredImage : null) ??
    (typeof firstImg === 'string' ? firstImg : null);

  return {
    id: String(unit.id ?? ''),
    title: String(unit.title ?? 'Untitled Residence'),
    titleAr: unit.titleAr,
    price: Number(unit.price ?? 0),
    monthlyRent: unit.monthlyRent ? Number(unit.monthlyRent) : undefined,
    currency: String(unit.currency ?? intent.currency),
    compound: getCompound(unit),
    district: unit.district,
    city: unit.city,
    beds: getBeds(unit),
    baths: getBaths(unit),
    area: getArea(unit),
    propertyType: String(unit.propertyType ?? unit.type ?? 'property').toLowerCase(),
    status: String(unit.status ?? 'available'),
    furnishing: unit.furnishingStatus ?? unit.finishingType,
    image,
    images: imgs.filter((i): i is string => typeof i === 'string'),
    matchScore: score,
    matchReason: reason,
    isRental: isRentalUnit(unit, intent),
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function semanticSearch(params: {
  query: string;
  locale: 'en' | 'ar';
  intentOverride?: Partial<SearchIntent>;
  limit: number;
  offset: number;
}): Promise<SemanticSearchResponse> {
  const { query, locale, intentOverride, limit, offset } = params;

  // 1. Extract intent (AI with regex fallback)
  let intent: SearchIntent;
  let extractionMethod: 'ai' | 'regex-fallback' = 'ai';

  try {
    const result = await extractIntentWithAI(query);
    intent = result.intent;
    extractionMethod = result.method;
  } catch (err) {
    logger.warn('[search] AI intent extraction failed, falling back to regex:', err);
    intent = extractIntentWithRegex(query);
    extractionMethod = 'regex-fallback';
  }

  // Apply overrides (admin tooling)
  if (intentOverride) {
    intent = { ...intent, ...intentOverride };
  }

  // 2. Query Firestore — fetch a wider pool, then score + rank client-side.
  //    Firestore doesn't support OR queries across different fields, so we
  //    fetch the available pool (limit 200) and filter in memory.
  const snapshot = await adminDb
    .collection(COLLECTIONS.units)
    .where('status', 'in', ['available', 'reserved'])
    .limit(200)
    .get();

  const rawUnits: RawUnit[] = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
    id: doc.id,
    ...(doc.data() as Record<string, unknown>),
  })) as RawUnit[];

  // 3. Score + filter + sort
  const scored = rawUnits
    .map((u) => toSearchResult(u, intent))
    .filter((r) => r.matchScore >= 40) // below 40 = bad match, hide
    .sort((a, b) => b.matchScore - a.matchScore);

  // 4. Paginate
  const paged = scored.slice(offset, offset + limit);

  return {
    results: paged,
    intent,
    extractionMethod,
    total: scored.length,
    query,
    locale,
  };
}
