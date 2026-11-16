import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

export const PF_TITLE_MIN = 30;
export const PF_TITLE_MAX = 47;
export const PF_DESC_MIN = 750;
export const PF_DESC_MAX = 2000;
export const GEMINI_LOW_CONFIDENCE_THRESHOLD = 0.75;

export interface IntakePreFilter {
  mode: 'rent' | 'sale' | null;
  intent: 'supply' | 'demand';
  advertiserRole: 'owner' | 'broker' | 'unknown';
  areaSqm: number | null;
  bedrooms: number | null;
  phone: string | null;
  priceEgp: number | null;
  confidence: number;
}

export interface IntakeQualityReport {
  confidence: number;
  lowConfidence: boolean;
  pfTitleLength: number;
  pfTitleValid: boolean;
  descriptionLength: number;
  descriptionValid: boolean;
  preFilter: IntakePreFilter;
}

function runBundledArabicPreFilter(rawText: string): IntakePreFilter {
  const candidates = [
    path.resolve(process.cwd(), 'packages/arabic-nlp/index.js'),
    path.resolve(process.cwd(), '../../packages/arabic-nlp/index.js'),
  ];
  try {
    const req = createRequire(path.resolve(process.cwd(), 'package.json'));
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = req(candidate) as { preFilterArabicListing?: (t: string) => IntakePreFilter };
        if (typeof mod?.preFilterArabicListing === 'function') {
          return mod.preFilterArabicListing(rawText);
        }
      }
    }
  } catch {
    // Fallback below keeps behavior deterministic in bundled test/runtime envs
  }

  const text = String(rawText || '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const isRent = /(إيجار|ايجار|شهري|سنوي|\brent\b)/i.test(text);
  const isSale = /(للبيع|بيع|كاش|تقسيط|مقدم|أوفر|اوفر|\bsale\b|\bcash\b)/i.test(text);
  const mode: 'rent' | 'sale' | null = isRent && !isSale ? 'rent' : isSale && !isRent ? 'sale' : null;
  const intent: 'supply' | 'demand' = /مطلوب|abحث|عايز|محتاج|wanted/i.test(text) ? 'demand' : 'supply';
  const advertiserRole = /بروكر|وسيط|مكتب|broker/i.test(text)
    ? 'broker'
    : /المالك|owner/i.test(text)
      ? 'owner'
      : 'unknown';
  const areaM = text.match(/(\d{2,4})\s*(?:متر|م2|م²|m2|sqm)/i);
  const bedM = text.match(/(\d)\s*(?:غرف|غرفه|bed)/i);
  const phoneM = text.match(/\b(01[0125]\d{8})\b/);
  let confidence = 0.25;
  if (mode) confidence += 0.35;
  if (areaM) confidence += 0.15;
  if (phoneM) confidence += 0.15;
  if (advertiserRole !== 'unknown') confidence += 0.05;
  return {
    mode,
    intent,
    advertiserRole,
    areaSqm: areaM ? Number(areaM[1]) : null,
    bedrooms: bedM ? Number(bedM[1]) : null,
    phone: phoneM ? phoneM[1] : null,
    priceEgp: null,
    confidence: Math.min(0.99, Number(confidence.toFixed(2))),
  };
}

export function evaluateIntakeQuality(input: {
  rawText?: string | null;
  pfTitle?: string | null;
  description?: string | null;
  explicitConfidence?: number | null;
}): IntakeQualityReport {
  const sourceText = String(input.rawText || input.description || '');
  const preFilter = runBundledArabicPreFilter(sourceText);

  let confidence = preFilter.confidence;
  if (typeof input.explicitConfidence === 'number' && Number.isFinite(input.explicitConfidence)) {
    const normalized = input.explicitConfidence > 1 ? input.explicitConfidence / 100 : input.explicitConfidence;
    confidence = Number(Math.max(0, Math.min(0.99, normalized)).toFixed(2));
  }

  const pfTitleLength = String(input.pfTitle || '').trim().length;
  const descriptionLength = String(input.description || '').trim().length;

  return {
    confidence,
    lowConfidence: confidence < GEMINI_LOW_CONFIDENCE_THRESHOLD,
    pfTitleLength,
    pfTitleValid: pfTitleLength >= PF_TITLE_MIN && pfTitleLength <= PF_TITLE_MAX,
    descriptionLength,
    descriptionValid: descriptionLength >= PF_DESC_MIN && descriptionLength <= PF_DESC_MAX,
    preFilter,
  };
}
