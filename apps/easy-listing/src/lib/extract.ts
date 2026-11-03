import type { PropertyFields } from './types'
import { CITY_KEYS, COMPOUND_PREFIXES, UNIT_TYPES } from './listing'

/** Convert Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) to Latin digits. */
function normalizeDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
}

function toNum(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[,،\s]/g, ''))
  return isNaN(n) ? null : n
}

function detectLanguage(s: string): 'ar' | 'en' {
  const ar = (s.match(/[\u0600-\u06FF]/g) || []).length
  return ar > s.length * 0.15 ? 'ar' : 'en'
}

const PRICE_WORD_RE = /(\d+(?:[.,]\d+)?)\s*(مليون|ملايين|million|m\b|ألف|الف|آلاف|thousand|k\b)/gi

/** Parse things like "10 مليون", "10.5M", "250 ألف دولار", "10,500,000" into a number. */
function parsePrice(text: string): { price: number | null; currency: string } {
  const t = normalizeDigits(text)
  let currency = 'EGP'
  if (/دولار|usd|\$/i.test(t)) currency = 'USD'
  else if (/يورو|eur|€/i.test(t)) currency = 'EUR'
  else if (/ريال|sar/i.test(t)) currency = 'SAR'
  else if (/درهم|aed|dh/i.test(t)) currency = 'AED'

  // word-based ("10 مليون", "250 ألف")
  const wordMatches = [...t.matchAll(PRICE_WORD_RE)]
  if (wordMatches.length > 0) {
    let total = 0
    for (const m of wordMatches) {
      const base = toNum(m[1]) ?? 0
      const unit = m[2].toLowerCase()
      if (/مليون|ملايين|million|m/.test(unit)) total += base * 1_000_000
      else total += base * 1_000
    }
    if (total > 1000) return { price: Math.round(total), currency }
  }

  // plain big numbers ("10,500,000", "10500000")
  const bigs = [...t.matchAll(/\b(\d{1,3}(?:[,\s]\d{3})+|\d{7,9})\b/g)]
    .map((m) => toNum(m[1]))
    .filter((n): n is number => n != null && n >= 300_000 && n < 10_000_000_000)
  if (bigs.length > 0) return { price: Math.round(Math.max(...bigs)), currency }

  return { price: null, currency }
}

function parseCount(text: string, patterns: RegExp[]): number {
  const t = normalizeDigits(text)
  for (const re of patterns) {
    const m = t.match(re)
    if (m) {
      const n = toNum(m[1])
      if (n != null && n >= 0 && n < 30) return Math.round(n)
    }
  }
  return 0
}

const FLOOR_WORDS: Record<string, string> = {
  ارضي: 'G',
  أرضي: 'G',
  الارضي: 'G',
  'ground': 'G',
  'gw': 'G',
}

function parseFloor(text: string): string {
  const t = normalizeDigits(text)
  const mNum = t.match(/(?:الدور|دور|floor|fl\.?)\s*[:#]?\s*(\d{1,2})/i) || t.match(/(\d{1,2})(?:st|nd|rd|th)?\s*floor/i)
  if (mNum) return mNum[1]
  const mWord = t.match(/(?:الدور|دور)\s*[:#]?\s*(الأرضي|ارضي|أرضي|الأول|اول|أول|الثاني|ثاني|الثالث|ثالث|الرابع|رابع|الخامس|خامس)/)
  if (mWord) {
    const w = mWord[1]
    if (/أرضي|ارضي/.test(w)) return 'G'
    const order = ['اول', 'أول', 'الثاني', 'ثاني', 'الثالث', 'ثالث', 'الرابع', 'رابع', 'الخامس', 'خامس']
    const idx = order.findIndex((o) => w.includes(o.replace('ال', '')))
    if (idx >= 0) return String(idx + 1)
  }
  if (/\bground\b|الدور الأرضي|ارضي/i.test(t)) return 'G'
  return ''
}

function parseUnitType(text: string): string {
  const t = text.toLowerCase()
  if (/توين|twin/.test(t)) return 'twinhouse'
  if (/تاون|town/.test(t)) return 'townhouse'
  if (/دوبلكس|duplex/.test(t)) return 'duplex'
  if (/بنتهاوس|penthouse/.test(t)) return 'penthouse'
  if (/استوديو|studio/.test(t)) return 'studio'
  if (/شاليه|chalet/.test(t)) return 'chalet'
  if (/فيلا|villa/.test(t)) return 'villa'
  if (/شقة|شقه|apartment|flat/.test(t)) return 'apartment'
  if (/اداري|إداري|أوفييس|اوفيس|office|commercial/.test(t)) return 'office'
  if (/أرض|ارض|plot|land\b/.test(t)) return 'land'
  return 'apartment'
}

function parseFurnished(text: string): boolean {
  const t = normalizeDigits(text)
  if (/غير مفروش|من غير فرش|بدون فرش|unfurnished|غير مؤثثة|غير مؤثث/i.test(t)) return false
  if (/مفروش|مؤثث|furnished|بالفرش|فرش كامل/i.test(t)) return true
  return false
}

/** City words that should never end up inside a compound name. */
const CITY_STOPS = [
  'القاهرة الجديدة', 'القاهره الجديده', 'التجمع الخامس', 'التجمع', 'نيو كايرو',
  'new cairo', 'الشيخ زايد', 'زايد', 'sheikh zayed', 'اكتوبر', 'أكتوبر',
  'العاصمة الادارية', 'العاصمة', 'الساحل الشمالي', 'مدينتي', 'المعادي',
]

function parseCompound(text: string): string {
  const t = text.toLowerCase()
  for (const c of COMPOUND_PREFIXES) {
    for (const k of c.keys) {
      const idx = t.indexOf(k)
      if (idx >= 0) {
        // known compound → canonical English label (better for codes + maps)
        if (c.label) return c.label
        // unknown vocabulary entry → slice the name around the keyword,
        // stopping at punctuation (incl. the Arabic comma) or city words
        const orig = text.slice(idx, idx + 60)
        const stop = orig.search(/[.,،\n\r;]|\bفي\b|\bبـ?\b|سعر|السعر|غرف|متر|م²/)
        let candidate = (stop > 4 ? orig.slice(0, stop) : orig).trim().replace(/\s+/g, ' ')
        for (const city of CITY_STOPS) {
          candidate = candidate.replace(new RegExp('\\s*[,،]?\\s*' + city + '$', 'i'), '').trim()
        }
        if (candidate.length >= 2) return candidate
        return k
      }
    }
  }
  return ''
}

function parseCity(text: string): string {
  const t = text.toLowerCase()
  for (const c of CITY_KEYS) {
    if (c.keys.some((k) => t.includes(k))) return c.value
  }
  return 'New Cairo'
}

const HIGHLIGHT_KEYWORDS: { keys: string[]; ar: string; en: string }[] = [
  { keys: ['فيو لاندسكيب', 'لاندسكيب', 'landscape'], ar: 'فيو لاندسكيب', en: 'Landscape view' },
  { keys: ['فيو', 'view', 'بانيو'], ar: 'فيو مفتوح', en: 'Open view' },
  { keys: ['جاردن', 'garden', 'حديقة'], ar: 'على جاردن', en: 'Garden' },
  { keys: ['مسبح', 'pool', 'بول'], ar: 'فيو مسبح / وصول لمسبح', en: 'Pool' },
  { keys: ['استلام فوري', 'immediate', 'جاهز للسكن', 'جاهزة'], ar: 'استلام فوري', en: 'Ready to move' },
  { keys: ['تقسيط', 'installment', 'قسط', 'مقدم'], ar: 'متاح التقسيط', en: 'Installments available' },
  { keys: ['تشطيب كامل', 'fully finished', 'سوبر لوكس', 'super lux'], ar: 'تشطيب كامل', en: 'Fully finished' },
  { keys: ['نصف تشطيب', 'semi finished', 'core and shell'], ar: 'نصف تشطيب', en: 'Semi finished' },
  { keys: ['اسانسير', 'مصعد', 'elevator', 'lift'], ar: 'أسانسير', en: 'Elevator' },
  { keys: ['جراج', 'garage', 'باركينج', 'parking'], ar: 'جراج خاص', en: 'Parking' },
  { keys: ['روف', 'roof'], ar: 'روف خاص', en: 'Private roof' },
  { keys: ['فيو جولف', 'golf'], ar: 'فيو جولف', en: 'Golf view' },
  { keys: ['بحر', 'sea view', 'سيلينج'], ar: 'فيو بحر', en: 'Sea view' },
]

function parseHighlights(text: string, lang: 'ar' | 'en'): string[] {
  const t = normalizeDigits(text).toLowerCase()
  const out: string[] = []
  for (const h of HIGHLIGHT_KEYWORDS) {
    if (h.keys.some((k) => t.includes(k))) out.push(lang === 'ar' ? h.ar : h.en)
  }
  return out.slice(0, 6)
}

/** Regex/heuristic extraction used as fallback when the AI call fails. */
export function fallbackExtract(description: string): PropertyFields {
  const text = description || ''
  const language = detectLanguage(text)
  const { price, currency } = parsePrice(text)
  const areaMatches = [...normalizeDigits(text).matchAll(/(\d{2,4}(?:[.,]\d+)?)\s*(?:متر|م²|م٢|متر مربع|sqm|sq\.?m|square ?meters?|m2|m²)/gi)]
  const area = areaMatches.length > 0 ? toNum(areaMatches[0][1]) : null
  const bedrooms = parseCount(text, [
    /(\d+)\s*(?:غرف نوم|غرف|غرفة|نوم|bedrooms?|beds?|br\b)/i,
    /(?:غرف نوم|غرف|غرفة|bedrooms?)\s*[:#]?\s*(\d{1,2})/i,
  ])
  const bathrooms = parseCount(text, [
    /(\d+)\s*(?:حمامات|حمام|bathrooms?|baths?|ba\b)/i,
    /(?:حمامات|حمام|bathrooms?)\s*[:#]?\s*(\d{1,2})/i,
  ])
  return {
    compound: parseCompound(text),
    city: parseCity(text),
    unitType: parseUnitType(text),
    bedrooms,
    bathrooms,
    area,
    floor: parseFloor(text),
    price,
    currency,
    furnished: parseFurnished(text),
    highlights: parseHighlights(text, language),
    language,
  }
}

/** Sanitize/normalize an object (from AI JSON or fallback) into valid PropertyFields. */
export function sanitizeFields(raw: Record<string, unknown>, description: string): PropertyFields {
  const lang = raw.language === 'en' || raw.language === 'ar' ? (raw.language as 'ar' | 'en') : detectLanguage(description)
  const fallback = fallbackExtract(description)
  const unitRaw = String(raw.unitType ?? '').toLowerCase().trim()
  const unitType = UNIT_TYPES.some((u) => u.value === unitRaw) ? unitRaw : fallback.unitType
  const currencyRaw = String(raw.currency ?? '').toUpperCase().trim()
  const currency = ['EGP', 'USD', 'EUR', 'SAR', 'AED'].includes(currencyRaw) ? currencyRaw : fallback.currency
  let compound = String(raw.compound ?? '').trim()
  if (!compound) compound = fallback.compound
  let city = String(raw.city ?? '').trim()
  if (!city) city = fallback.city
  const price = toNum(raw.price) ?? fallback.price
  const area = toNum(raw.area) ?? fallback.area
  const highlights = Array.isArray(raw.highlights)
    ? raw.highlights.map((h) => String(h).trim()).filter(Boolean).slice(0, 8)
    : fallback.highlights
  return {
    compound: compound.slice(0, 80),
    city: city.slice(0, 60),
    unitType,
    bedrooms: Math.max(0, Math.min(30, Math.round(toNum(raw.bedrooms) ?? fallback.bedrooms ?? 0))),
    bathrooms: Math.max(0, Math.min(30, Math.round(toNum(raw.bathrooms) ?? fallback.bathrooms ?? 0))),
    area: area != null && area > 0 ? Math.min(100000, Math.round(area)) : null,
    floor: String(raw.floor ?? fallback.floor ?? '').slice(0, 20),
    price: price != null && price > 0 ? Math.min(10_000_000_000, Math.round(price)) : null,
    currency,
    furnished: typeof raw.furnished === 'boolean' ? raw.furnished : fallback.furnished,
    highlights,
    language: lang,
  }
}

/** Best-effort JSON extraction from an LLM response (strips fences, finds the object). */
export function extractJsonFromText(text: string): Record<string, unknown> | null {
  if (!text) return null
  let t = text.trim()
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  const candidate = t.slice(start, end + 1)
  try {
    const parsed = JSON.parse(candidate)
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null
  } catch {
    // try fixing trailing commas
    try {
      const fixed = candidate.replace(/,\s*([}\]])/g, '$1')
      const parsed = JSON.parse(fixed)
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
}
