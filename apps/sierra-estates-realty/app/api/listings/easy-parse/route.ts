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

interface ParsedListingResult {
  compound: string;
  propertyType: string;
  mode: 'sale' | 'rent';
  beds: number;
  baths: number;
  area: number;
  gardenArea?: number;
  price: number;
  downpayment?: number;
  finishing: string;
  ownerName: string;
  mobile: string;
  features: string[];
  sierraCode: string;
  aiScore: number;
  aiSummary: string;
  confidence: number;
}

const API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';

/**
 * Fallback heuristic extractor when AI API key is unavailable in dev/offline
 */
function heuristicFallbackParse(rawText: string): ParsedListingResult {
  const lower = rawText.toLowerCase();

  // Detect Compound
  const compounds = [
    { name: 'Mivida', matches: ['mivida', 'ميفيدا'] },
    { name: 'Hyde Park', matches: ['hyde park', 'هايد بارك', 'هايدبارك'] },
    { name: 'Mountain View iCity', matches: ['mountain view', 'ماونتن فيو', 'ماونتن', 'icity', 'اي سيتي'] },
    { name: 'Villette', matches: ['villette', 'فيليت', 'sodic villette'] },
    { name: 'Palm Hills NC', matches: ['palm hills', 'بالم هيلز', 'بالم'] },
    { name: 'Eastown', matches: ['eastown', 'ايست تاون', 'ايستاون'] },
    { name: 'Madinaty', matches: ['madinaty', 'مدينتي'] },
    { name: 'Uptown Cairo', matches: ['uptown', 'اب تاون', 'أب تاون'] },
    { name: 'Swan Lake', matches: ['swan lake', 'سوان ليك'] },
    { name: 'Fifth Square', matches: ['fifth square', 'فيفث سكوير'] },
  ];

  let detectedCompound = '5th Settlement';
  for (const c of compounds) {
    if (c.matches.some(m => lower.includes(m))) {
      detectedCompound = c.name;
      break;
    }
  }

  // Detect Property Type
  let propertyType = 'Apartment';
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
  }

  // Detect Mode
  const mode: 'sale' | 'rent' = (lower.includes('rent') || lower.includes('ايجار') || lower.includes('إيجار') || lower.includes('للايجار')) ? 'rent' : 'sale';

  // Detect Beds & Baths
  const bedsMatch = rawText.match(/(\d+)\s*(?:bed|bd|غرف|نوم|rooms)/i) || rawText.match(/(?:bed|bd|غرف|نوم)\s*(\d+)/i);
  const beds = bedsMatch ? parseInt(bedsMatch[1], 10) : 3;

  const bathsMatch = rawText.match(/(\d+)\s*(?:bath|ba|حمام|حمامات)/i) || rawText.match(/(?:bath|ba|حمام)\s*(\d+)/i);
  const baths = bathsMatch ? parseInt(bathsMatch[1], 10) : 2;

  // Detect Area
  const areaMatch = rawText.match(/(\d{2,4})\s*(?:m2|sqm|متر|م²|m)/i) || rawText.match(/(?:area|مساحة)\s*[:=]?\s*(\d{2,4})/i);
  const area = areaMatch ? parseInt(areaMatch[1], 10) : 180;

  // Detect Garden
  const gardenMatch = rawText.match(/garden\s*(\d{2,4})/i) || rawText.match(/حديقة\s*(\d{2,4})/i) || rawText.match(/جاردن\s*(\d{2,4})/i);
  const gardenArea = gardenMatch ? parseInt(gardenMatch[1], 10) : 0;

  // Detect Price
  let price = 10000000;
  const priceNumberMatch = rawText.match(/(?:price|السعر|مطلوب)\s*[:=]?\s*(\d[\d,\.]{4,})/i) || rawText.match(/(\d{1,3}(?:,\d{3})+)/);
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
  let finishing = 'Fully Finished';
  if (lower.includes('core') || lower.includes('shell') || lower.includes('طوب احمر') || lower.includes('ع المحارة')) {
    finishing = 'Core & Shell';
  } else if (lower.includes('semi') || lower.includes('نصف تشطيب') || lower.includes('نص تشطيب')) {
    finishing = 'Semi Finished';
  } else if (lower.includes('furnished') || lower.includes('مفروش') || lower.includes('بالفرش')) {
    finishing = 'Fully Furnished';
  }

  // Detect Phone
  const phoneMatch = rawText.match(/(?:\+?20|0)?1[0125]\d{8}/);
  const mobile = phoneMatch ? phoneMatch[0] : '+201092048333';

  // SBR Code
  const codeMeta = buildSierraCodeMetadata({
    compound: detectedCompound,
    rooms: beds,
    furnishingStatus: finishing === 'Core & Shell' ? 'core_and_shell' : finishing === 'Semi Finished' ? 'semi_finished' : 'fully_finished',
    price,
    features: gardenArea > 0 ? ['GD'] : ['PR'],
  });

  return {
    compound: detectedCompound,
    propertyType,
    mode,
    beds,
    baths,
    area,
    gardenArea,
    price,
    finishing,
    ownerName: 'Direct Client Intake',
    mobile,
    features: gardenArea > 0 ? ['Garden', 'Prime Location'] : ['Prime Location'],
    sierraCode: codeMeta?.code || `SE-${detectedCompound.slice(0,3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
    aiScore: 9.4,
    aiSummary: `${propertyType} in ${detectedCompound} featuring ${beds} bedrooms, ${baths} bathrooms, with ${finishing} finishing.`,
    confidence: 0.85,
  };
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

RAW TEXT:
"""${rawText}"""

Return STRICTLY a JSON object with this format (no markdown code fences):
{
  "compound": "Compound Name (e.g. Mivida, Hyde Park, Mountain View iCity, Villette, Palm Hills, Madinaty, etc.)",
  "propertyType": "Apartment" | "Standalone Villa" | "Townhouse" | "Twin House" | "Penthouse" | "Duplex" | "Chalet" | "Studio",
  "mode": "sale" | "rent",
  "beds": number,
  "baths": number,
  "area": number,
  "gardenArea": number,
  "price": number,
  "downpayment": number,
  "finishing": "Fully Finished" | "Semi Finished" | "Core & Shell" | "Fully Furnished",
  "ownerName": string,
  "mobile": string,
  "features": ["string", "string"],
  "aiSummary": "1-2 sentence luxury summary for the brochure",
  "confidence": number (between 0.8 and 1.0)
}`;

        const aiResponse = await model.generateContent(prompt);
        const responseText = aiResponse.response.text().trim().replace(/^```json/i, '').replace(/```$/i, '').trim();
        const extracted = JSON.parse(responseText);

        const codeMeta = buildSierraCodeMetadata({
          compound: extracted.compound || 'New Cairo',
          rooms: Number(extracted.beds) || 3,
          furnishingStatus: extracted.finishing === 'Core & Shell' ? 'core_and_shell' : extracted.finishing === 'Semi Finished' ? 'semi_finished' : 'fully_finished',
          price: Number(extracted.price) || 10000000,
          features: ['PR'],
        });

        const result: ParsedListingResult = {
          compound: extracted.compound || '5th Settlement',
          propertyType: extracted.propertyType || 'Apartment',
          mode: extracted.mode === 'rent' ? 'rent' : 'sale',
          beds: Number(extracted.beds) || 3,
          baths: Number(extracted.baths) || 2,
          area: Number(extracted.area) || 150,
          gardenArea: Number(extracted.gardenArea) || 0,
          price: Number(extracted.price) || 8000000,
          downpayment: extracted.downpayment ? Number(extracted.downpayment) : undefined,
          finishing: extracted.finishing || 'Fully Finished',
          ownerName: extracted.ownerName || 'Sierra Verified Portfolio',
          mobile: extracted.mobile || '+201092048333',
          features: Array.isArray(extracted.features) ? extracted.features : ['Prime Location'],
          sierraCode: codeMeta?.code || `SE-AIR-${Date.now().toString().slice(-4)}`,
          aiScore: 9.6,
          aiSummary: extracted.aiSummary || `Exclusive ${extracted.propertyType} in ${extracted.compound}.`,
          confidence: extracted.confidence || 0.95,
        };

        return NextResponse.json({
          success: true,
          data: result,
          source: 'gemini-ai',
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
