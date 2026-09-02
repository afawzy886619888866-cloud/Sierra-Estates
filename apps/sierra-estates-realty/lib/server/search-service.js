 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }/**
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

} from '@/lib/server/schemas';
import { logger } from '@/lib/logger';
import { COLLECTIONS } from '@/lib/models/schema';

// ─── Types ────────────────────────────────────────────────────────────────





































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
  user: (query) => `Extract search intent from this query:\n\n${query}`,
};

async function extractIntentWithAI(
  query
) {
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

const ARABIC_DIGITS = {
  '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4,
  '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9,
};

function normalizeArabicNumerals(s) {
  return s.replace(/[٠-٩]/g, (d) => String(_nullishCoalesce(ARABIC_DIGITS[d], () => ( 0))));
}

function extractIntentWithRegex(query) {
  const q = normalizeArabicNumerals(query.toLowerCase());

  const offerType =
    /إيجار|للإيجار|rent|rental|monthly|شهرية/.test(q)
      ? 'rent'
      : /بيع|للبيع|sale|buy|purchase/.test(q)
        ? 'sale'
        : 'any';

  const propertyType =
    /فيلا|villa|house/.test(q) ? 'villa'
    : /استوديو|studio/.test(q) ? 'studio'
    : /دوبلكس|duplex/.test(q) ? 'duplex'
    : /بنتهاوس|penthouse/.test(q) ? 'penthouse'
    : /شقة|apartment|flat/.test(q) ? 'apartment'
    : 'any';

  const bedsMatch = q.match(/(\d+)\s*(?:غرف|غرفة|bed|bedroom|br)/);
  const beds = bedsMatch ? parseInt(bedsMatch[1], 10) : undefined;

  const priceMatch = q.match(/(?:تحت|under|max|أقل من)\s*(\d+(?:k|,000| ألف)?)|(\d+(?:k|,000| ألف)?)\s*(?:تحت|under|max|أقل من)/);
  let priceMax;
  if (priceMatch) {
    const raw = priceMatch[1] || priceMatch[2];
    if (raw) {
      priceMax = raw.includes('k') || raw.includes('ألف')
        ? parseInt(raw.replace(/[k,]/g, '').replace(/ألف/g, '').trim(), 10) * 1000
        : parseInt(raw.replace(/,/g, ''), 10);
    }
  }

  const compounds = [];
  const districts = [];
  if (/التجمع|tagamoa|fifth settlement|الخامس/.test(q)) districts.push('Tagamoa', 'Fifth Settlement');
  if (/القاهرة الجديدة|new cairo/.test(q)) districts.push('New Cairo');
  if (/الشيخ زايد|sheikh zayed/.test(q)) districts.push('Sheikh Zayed');
  if (/٦ أكتوبر|6th of october|october/.test(q)) districts.push('6th of October');
  if (/المعادي|maadi/.test(q)) districts.push('Maadi');
  if (/الزمالك|zamalek/.test(q)) districts.push('Zamalek');
  if (/العاصمة الإدارية|new capital|administrative capital/.test(q)) districts.push('New Administrative Capital');

  const furnishing =
    /مفروش|furnished/.test(q) ? 'furnished'
    : /غير مفروش|unfurnished/.test(q) ? 'unfurnished'
    : /نص مفروش|semi-furnished/.test(q) ? 'semi-furnished'
    : 'any';

  const currency =
    /\$|usd|دولار/.test(q) ? 'USD'
    : /eur|يورو/.test(q) ? 'EUR'
    : /aed|درهم/.test(q) ? 'AED'
    : /sar|ريال سعودي/.test(q) ? 'SAR'
    : 'EGP';

  const detectedLocale =
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































function isRentalUnit(u, intent) {
  // A unit is rentable if it has a monthlyRent, OR the intent explicitly asks for rent.
  if (intent.offerType === 'rent') return true;
  if (intent.offerType === 'sale') return false;
  // 'any' — include units that have either price or monthlyRent
  return Boolean(u.monthlyRent) || Boolean(u.monthlyRentUSD);
}

function getEffectivePrice(u, intent) {
  if (intent.offerType === 'rent') {
    return _nullishCoalesce(_nullishCoalesce(u.monthlyRent, () => ( u.monthlyRentUSD)), () => ( 0));
  }
  return _nullishCoalesce(u.price, () => ( 0));
}

function getBeds(u) {
  return Number(_nullishCoalesce(_nullishCoalesce(_nullishCoalesce(u.bedrooms, () => ( u.rooms)), () => ( u.beds)), () => ( 0)));
}

function getBaths(u) {
  return Number(_nullishCoalesce(_nullishCoalesce(u.bathrooms, () => ( u.baths)), () => ( 0)));
}

function getArea(u) {
  return Number(_nullishCoalesce(_nullishCoalesce(u.area, () => ( u.size)), () => ( 0)));
}

function getCompound(u) {
  return String(_nullishCoalesce(_nullishCoalesce(_nullishCoalesce(_nullishCoalesce(u.compound, () => ( u.location)), () => ( u.city)), () => ( u.district)), () => ( '')));
}

function matchesDistrict(unit, districts) {
  if (districts.length === 0) return true;
  const haystack = [
    unit.compound, unit.location, unit.city, unit.district,
  ].filter(Boolean).join(' ').toLowerCase();
  return districts.some((d) => haystack.includes(d.toLowerCase()));
}

function matchesFurnishing(unit, furnishing) {
  if (furnishing === 'any') return true;
  const f = String(_nullishCoalesce(_nullishCoalesce(unit.furnishingStatus, () => ( unit.finishingType)), () => ( ''))).toLowerCase();
  if (furnishing === 'furnished') return f.includes('furnish') || f === 'f' || f.includes('fully');
  if (furnishing === 'unfurnished') return f.includes('unfurnish') || f === 'u' || f.includes('core');
  if (furnishing === 'semi-furnished') return f.includes('semi') || f === 's';
  return true;
}

function scoreUnit(unit, intent) {
  let score = 50; // baseline
  const reasons = [];

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
    const min = _nullishCoalesce(intent.bedsMin, () => ( 0));
    const max = _nullishCoalesce(intent.bedsMax, () => ( 99));
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
    const t = String(_nullishCoalesce(_nullishCoalesce(unit.propertyType, () => ( unit.type)), () => ( ''))).toLowerCase();
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
    const min = _nullishCoalesce(intent.areaMin, () => ( 0));
    const max = _nullishCoalesce(intent.areaMax, () => ( 99999));
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
  unit,
  intent
) {
  const { score, reason } = scoreUnit(unit, intent);
  const imgs = Array.isArray(unit.images) ? unit.images : [];
  const firstImg = imgs[0];
  const image =
    _nullishCoalesce((typeof unit.featuredImage === 'string' ? unit.featuredImage : null), () => (
    (typeof firstImg === 'string' ? firstImg : null)));

  return {
    id: String(_nullishCoalesce(unit.id, () => ( ''))),
    title: String(_nullishCoalesce(unit.title, () => ( 'Untitled Residence'))),
    titleAr: unit.titleAr,
    price: Number(_nullishCoalesce(unit.price, () => ( 0))),
    monthlyRent: unit.monthlyRent ? Number(unit.monthlyRent) : undefined,
    currency: String(_nullishCoalesce(unit.currency, () => ( intent.currency))),
    compound: getCompound(unit),
    district: unit.district,
    city: unit.city,
    beds: getBeds(unit),
    baths: getBaths(unit),
    area: getArea(unit),
    propertyType: String(_nullishCoalesce(_nullishCoalesce(unit.propertyType, () => ( unit.type)), () => ( 'property'))).toLowerCase(),
    status: String(_nullishCoalesce(unit.status, () => ( 'available'))),
    furnishing: _nullishCoalesce(unit.furnishingStatus, () => ( unit.finishingType)),
    image,
    images: imgs.filter((i) => typeof i === 'string'),
    matchScore: score,
    matchReason: reason,
    isRental: isRentalUnit(unit, intent),
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function semanticSearch(params





) {
  const { query, locale, intentOverride, limit, offset } = params;

  // 1. Extract intent (AI with regex fallback)
  let intent;
  let extractionMethod = 'ai';

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

  // 2. Query Supabase listings directly (fast SQL with index)
  let rawUnits = [];

  try {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .limit(300);

    if (!error && data && data.length > 0) {
      rawUnits = data.map((item) => ({
        id: item.id || item.ref_id,
        title: item.title,
        titleAr: item.title_ar,
        description: item.description,
        compound: item.compound,
        district: item.location_area || item.compound,
        city: item.city || 'Cairo',
        price: Number(item.price) || 0,
        monthlyRent: item.deal_type === 'rent' ? Number(item.price) : undefined,
        currency: item.price_currency || 'EGP',
        bedrooms: item.bedrooms || 0,
        bathrooms: item.bathrooms || 1,
        area: Number(item.area_sqm) || 150,
        propertyType: item.property_type || 'Apartment',
        status: item.status || 'available',
        finishingType: item.finishing_type,
        images: item.images || [],
        featuredImage: (item.images && item.images[0]) || null,
        isRental: item.deal_type === 'rent',
      })) ;
    }
  } catch (supabaseErr) {
    logger.warn('[search] Supabase fetch error, checking Firestore fallback:', supabaseErr);
  }

  // Fallback to Firestore if Supabase returned no rows
  if (rawUnits.length === 0) {
    try {
      const snapshot = await adminDb
        .collection(COLLECTIONS.units)
        .where('status', 'in', ['available', 'reserved'])
        .limit(200)
        .get();

      rawUnits = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() ),
      })) ;
    } catch (e) {
      logger.warn('[search] Firestore query fallback error:', e);
    }
  }

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
