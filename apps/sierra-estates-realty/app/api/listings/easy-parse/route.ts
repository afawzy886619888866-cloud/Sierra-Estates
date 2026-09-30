import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildSierraCodeMetadata } from '@/lib/services/coding-algorithm';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const rawInputSchema = z.object({
  rawText: z.string().min(5, 'Listing text must be at least 5 characters'),
  source: z.enum(['whatsapp', 'broker_feed', 'manual', 'voice_transcript']).default('manual'),
  images: z.array(z.string()).optional().default([]),
});

/**
 * §21 no-fabrication contract: every field is `null` when the pasted text does
 * not state it. The parser NEVER substitutes defaults (no 'New Cairo', no
 * beds 3, no invented 10M price, no placeholder phone). The studio renders
 * missing fields as empty inputs the operator must fill before publishing.
 */
interface ParsedListingResult {
  compound: string | null;
  propertyType: string | null;
  mode: 'sale' | 'rent' | null;
  beds: number | null;
  baths: number | null;
  area: number | null;
  gardenArea: number | null;
  price: number | null;
  downpayment?: number | null;
  finishing: string | null;
  ownerName: string | null;
  mobile: string | null;
  features: string[];
  sierraCode: string | null;
  /** Not fabricated: null unless a real extraction-quality signal exists. */
  aiScore: number | null;
  aiSummary: string | null;
  /** Honest heuristic completeness: fraction of key fields actually found. */
  confidence: number;
}

const KEY_FIELDS = [
  'compound',
  'propertyType',
  'mode',
  'beds',
  'baths',
  'area',
  'price',
  'mobile',
] as const;

function completeness(result: Pick<ParsedListingResult, (typeof KEY_FIELDS)[number]>): number {
  const found = KEY_FIELDS.filter((k) => result[k] !== null && result[k] !== undefined).length;
  return Number((found / KEY_FIELDS.length).toFixed(2));
}

function missingFields(result: Pick<ParsedListingResult, (typeof KEY_FIELDS)[number]>): string[] {
  return KEY_FIELDS.filter((k) => result[k] === null || result[k] === undefined);
}

const API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';

/**
 * Fallback heuristic extractor when AI API key is unavailable in dev/offline.
 * Detects ONLY what the text literally states; everything else stays null.
 */
function heuristicFallbackParse(rawText: string): ParsedListingResult {
  const lower = rawText.toLowerCase();

  // Detect Compound
  const compounds = [
    { name: 'Fifth Square', matches: ['fifth square', 'فيفث سكوير', 'المراسم'] },
    { name: 'Al Rehab', matches: ['al rehab', 'rehab', 'الرحاب', 'مدينة الرحاب'] },
    { name: 'Madinaty', matches: ['madinaty', 'مدينتي'] },
    { name: 'Mivida', matches: ['mivida', 'ميفيدا', 'ميفيلد'] },
    { name: 'Hyde Park', matches: ['hyde park', 'هايد بارك', 'هايدبارك'] },
    { name: 'Mountain View iCity', matches: ['mountain view', 'ماونتن فيو', 'ماونتن', 'icity', 'اي سيتي'] },
    { name: 'Villette', matches: ['villette', 'فيليت', 'sodic villette'] },
    { name: 'Palm Hills NC', matches: ['palm hills', 'بالم هيلز', 'بالم'] },
    { name: 'Eastown', matches: ['eastown', 'ايست تاون', 'ايستاون'] },
    { name: 'Beit El Watan', matches: ['beit el watan', 'beit elwatan', 'بيت الوطن'] },
    { name: 'Katameya Dunes', matches: ['katameya dunes', 'katameya', 'قطامية ديونز', 'القطامية'] },
    { name: 'Lake View', matches: ['lake view', 'ليك فيو', 'lakeview'] },
    { name: 'Uptown Cairo', matches: ['uptown', 'اب تاون', 'أب تاون'] },
    { name: 'Swan Lake', matches: ['swan lake', 'سوان ليك'] },
  ];

  const detectedCompound: string | null =
    compounds.find((c) => c.matches.some((m) => lower.includes(m)))?.name ?? null;

  // Detect Property Type (null when the text never says)
  let propertyType: string | null = null;
  if (lower.includes('villa') || lower.includes('فيلا') || lower.includes('standalone') || lower.includes('مستقلة')) {
    propertyType = 'Standalone Villa';
  } else if (lower.includes('townhouse') || lower.includes('تاون هاوس') || lower.includes('تاون')) {
    propertyType = 'Townhouse';
  } else if (lower.includes('twin house') || lower.includes('توين هاوس') || lower.includes('توين')) {
    propertyType = 'Twin House';
  } else if (lower.includes('penthouse') || lower.includes('بنتهاوس') || lower.includes('روف')) {
    propertyType = 'Penthouse';
  } else if (lower.includes('duplex') || lower.includes('دوبلكس')) {
    propertyType = 'Duplex';
  } else if (lower.includes('studio') || lower.includes('استوديو')) {
    propertyType = 'Studio';
  } else if (lower.includes('apartment') || lower.includes('شقة') || lower.includes('شقه') || lower.includes('شقق')) {
    propertyType = 'Apartment';
  }

  // Detect Mode (null when neither rent nor sale wording appears)
  let mode: 'sale' | 'rent' | null = null;
  if (lower.includes('rent') || lower.includes('ايجار') || lower.includes('إيجار') || lower.includes('للايجار') || lower.includes('للإيجار')) {
    mode = 'rent';
  } else if (lower.includes('sale') || lower.includes('for sale') || lower.includes('للبيع') || lower.includes('بيع')) {
    mode = 'sale';
  }

  // Detect Beds & Baths
  const bedsMatch = rawText.match(/(\d+)\s*(?:bed|bd|غرف|نوم|rooms)/i) || rawText.match(/(?:bed|bd|غرف|نوم)\s*(\d+)/i);
  const beds = bedsMatch ? parseInt(bedsMatch[1], 10) : null;

  const bathsMatch = rawText.match(/(\d+)\s*(?:bath|ba|حمام|حمامات)/i) || rawText.match(/(?:bath|ba|حمام)\s*(\d+)/i);
  const baths = bathsMatch ? parseInt(bathsMatch[1], 10) : null;

  // Detect Area
  const areaMatch = rawText.match(/(\d{2,4})\s*(?:m2|sqm|متر|م²|m)/i) || rawText.match(/(?:area|مساحة)\s*[:=]?\s*(\d{2,4})/i);
  const area = areaMatch ? parseInt(areaMatch[1], 10) : null;

  // Detect Garden
  const gardenMatch = rawText.match(/garden\s*(\d{2,4})/i) || rawText.match(/حديقة\s*(\d{2,4})/i) || rawText.match(/جاردن\s*(\d{2,4})/i);
  const gardenArea = gardenMatch ? parseInt(gardenMatch[1], 10) : null;

  // Detect Price
  let price: number | null = null;
  const priceNumberMatch = rawText.match(/(?:price|السعر|مطلوب)\s*[:=]?\s*(\d[\d,\.]{4,})/i) || rawText.match(/(1?\d{1,3}(?:,\d{3})+)/);
  const priceMillionMatch = rawText.match(/(?:price|السعر|مطلوب)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:million|مليون)/i)
    || rawText.match(/(\d+(?:\.\d+)?)\s*(?:million|مليون)/i);

  if (priceNumberMatch) {
    const cleanNum = parseInt(priceNumberMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(cleanNum) && cleanNum > 50000) {
      price = cleanNum;
    }
  } else if (priceMillionMatch) {
    const millions = parseFloat(priceMillionMatch[1]);
    if (millions > 0 && millions < 500) {
      price = Math.round(millions * 1_000_000);
    }
  }

  // Detect Finishing
  let finishing: string | null = null;
  if (lower.includes('core') || lower.includes('shell') || lower.includes('طوب احمر') || lower.includes('ع المحارة')) {
    finishing = 'Core & Shell';
  } else if (lower.includes('semi') || lower.includes('نصف تشطيب') || lower.includes('نص تشطيب')) {
    finishing = 'Semi Finished';
  } else if (lower.includes('furnished') || lower.includes('مفروش') || lower.includes('بالفرش')) {
    finishing = 'Fully Furnished';
  } else if (lower.includes('fully finished') || lower.includes('سوبر لوكس') || lower.includes('الترا') || lower.includes('تشطيب كامل')) {
    finishing = 'Fully Finished';
  }

  // Detect Phone — only a real match, never a placeholder
  const phoneMatch = rawText.match(/(?:\+?20|0)?1[0125]\d{8}/);
  const mobile = phoneMatch ? phoneMatch[0] : null;

  // SBR Code — only derivable from fields the text actually provided
  const codeMeta =
    detectedCompound !== null && beds !== null && price !== null && finishing !== null
      ? buildSierraCodeMetadata({
          compound: detectedCompound,
          rooms: beds,
          furnishingStatus:
            finishing === 'Core & Shell'
              ? 'core_and_shell'
              : finishing === 'Semi Finished'
                ? 'semi_finished'
                : finishing === 'Fully Furnished'
                  ? 'fully_furnished'
                  : 'fully_finished',
          price,
          features: gardenArea ? ['GD'] : [],
        })
      : null;

  // Summary assembled ONLY from extracted values
  const summaryParts: string[] = [];
  if (propertyType) summaryParts.push(propertyType);
  if (detectedCompound) summaryParts.push(`in ${detectedCompound}`);
  if (beds !== null) summaryParts.push(`${beds} bedrooms`);
  if (baths !== null) summaryParts.push(`${baths} bathrooms`);
  if (finishing) summaryParts.push(`${finishing} finishing`);
  const aiSummary = summaryParts.length > 0 ? summaryParts.join(', ') + '.' : null;

  const result: ParsedListingResult = {
    compound: detectedCompound,
    propertyType,
    mode,
    beds,
    baths,
    area,
    gardenArea,
    price,
    finishing,
    ownerName: null,
    mobile,
    features: gardenArea !== null ? ['Garden'] : [],
    sierraCode: codeMeta?.code ?? null,
    aiScore: null,
    aiSummary,
    confidence: 0,
  };
  result.confidence = completeness(result);
  return result;
}

/**
 * POST /api/listings/easy-parse
 * Uses AI to instantly parse unstructured property intake text into the EasyListing schema.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = rawInputSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { rawText, images } = parseResult.data;

    // If Gemini API Key is available, use neural parsing for elite extraction
    if (API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are the Sierra Estates AI Scribe (Easy Listing Extractor).
Analyze the following raw real estate text (Arabic, English, or mixed) and extract structured listing data.

HONESTY RULE (absolute): extract ONLY facts the text explicitly states. For any
field the text does not state, return null. NEVER guess, infer, or fill in a
plausible value — a fabricated listing field is a data-integrity violation.

RAW TEXT:
"""${rawText}"""

Return STRICTLY a JSON object with this format (no markdown code fences):
{
  "compound": "Compound Name exactly as stated (e.g. Mivida, Hyde Park, Mountain View iCity, Villette, Palm Hills, Madinaty) or null",
  "propertyType": "Apartment" | "Standalone Villa" | "Townhouse" | "Twin House" | "Penthouse" | "Duplex" | "Chalet" | "Studio" | null,
  "mode": "sale" | "rent" | null,
  "beds": number or null,
  "baths": number or null,
  "area": number or null,
  "gardenArea": number or null,
  "price": number or null,
  "downpayment": number or null,
  "finishing": "Fully Finished" | "Semi Finished" | "Core & Shell" | "Fully Furnished" | null,
  "ownerName": string or null,
  "mobile": string or null,
  "features": ["only features explicitly mentioned"],
  "aiSummary": "1-2 sentence summary built strictly from the extracted values, or null",
  "confidence": number between 0 and 1 reflecting extraction completeness, or null
}`;

        const aiResponse = await model.generateContent(prompt);
        const responseText = aiResponse.response.text().trim().replace(/^```json/i, '').replace(/```$/i, '').trim();
        const extracted = JSON.parse(responseText);

        const compound = typeof extracted.compound === 'string' && extracted.compound.trim() ? extracted.compound.trim() : null;
        const beds = Number.isFinite(Number(extracted.beds)) && Number(extracted.beds) > 0 ? Number(extracted.beds) : null;
        const price = Number.isFinite(Number(extracted.price)) && Number(extracted.price) > 0 ? Number(extracted.price) : null;
        const finishing = typeof extracted.finishing === 'string' && extracted.finishing.trim() ? extracted.finishing : null;

        // Sierra code is only derivable when the text supplied its inputs
        const codeInputsReady = compound !== null && beds !== null && price !== null && finishing !== null;
        const codeMeta = codeInputsReady
          ? buildSierraCodeMetadata({
              compound,
              rooms: beds,
              furnishingStatus:
                finishing === 'Core & Shell'
                  ? 'core_and_shell'
                  : finishing === 'Semi Finished'
                    ? 'semi_finished'
                    : finishing === 'Fully Furnished'
                      ? 'fully_furnished'
                      : 'fully_finished',
              price,
              features: [],
            })
          : null;

        const result: ParsedListingResult = {
          compound,
          propertyType:
            typeof extracted.propertyType === 'string' && extracted.propertyType.trim() ? extracted.propertyType : null,
          mode: extracted.mode === 'rent' ? 'rent' : extracted.mode === 'sale' ? 'sale' : null,
          beds,
          baths: Number.isFinite(Number(extracted.baths)) && Number(extracted.baths) > 0 ? Number(extracted.baths) : null,
          area: Number.isFinite(Number(extracted.area)) && Number(extracted.area) > 0 ? Number(extracted.area) : null,
          gardenArea:
            Number.isFinite(Number(extracted.gardenArea)) && Number(extracted.gardenArea) > 0
              ? Number(extracted.gardenArea)
              : null,
          price,
          downpayment:
            Number.isFinite(Number(extracted.downpayment)) && Number(extracted.downpayment) > 0
              ? Number(extracted.downpayment)
              : null,
          finishing,
          ownerName: typeof extracted.ownerName === 'string' && extracted.ownerName.trim() ? extracted.ownerName : null,
          mobile: typeof extracted.mobile === 'string' && extracted.mobile.trim() ? extracted.mobile : null,
          features: Array.isArray(extracted.features) ? extracted.features.filter((f: unknown) => typeof f === 'string' && f) : [],
          sierraCode: codeMeta?.code ?? null,
          aiScore: null,
          aiSummary: typeof extracted.aiSummary === 'string' && extracted.aiSummary.trim() ? extracted.aiSummary : null,
          confidence: 0,
        };

        // Prefer the model's own confidence only when it is a real number in
        // range; otherwise fall back to the honest completeness ratio.
        const modelConfidence = Number(extracted.confidence);
        result.confidence =
          Number.isFinite(modelConfidence) && modelConfidence > 0 && modelConfidence <= 1
            ? Number(modelConfidence.toFixed(2))
            : completeness(result);

        return NextResponse.json({
          success: true,
          data: result,
          source: 'gemini-ai',
          missing: missingFields(result),
          images: images || [],
        });
      } catch (geminiErr) {
        logger.warn('[EASY_PARSE] Gemini extraction failed, falling back to heuristic:', geminiErr);
      }
    }

    // Heuristic fallback
    const fallbackResult = heuristicFallbackParse(rawText);
    return NextResponse.json({
      success: true,
      data: fallbackResult,
      source: 'heuristic-engine',
      missing: missingFields(fallbackResult),
      images: images || [],
    });
  } catch (error: any) {
    logger.error('[EASY_PARSE] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to parse listing' },
      { status: 500 }
    );
  }
}
