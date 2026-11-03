import type { GeneratedContent, PropertyFields } from './types'

/* ────────────────────────── Unit types ────────────────────────── */

export const UNIT_TYPES = [
  { value: 'apartment', ar: 'شقة', en: 'Apartment' },
  { value: 'villa', ar: 'فيلا', en: 'Villa' },
  { value: 'twinhouse', ar: 'توين هاوس', en: 'Twin House' },
  { value: 'townhouse', ar: 'تاون هاوس', en: 'Town House' },
  { value: 'duplex', ar: 'دوبلكس', en: 'Duplex' },
  { value: 'penthouse', ar: 'بنتهاوس', en: 'Penthouse' },
  { value: 'studio', ar: 'استوديو', en: 'Studio' },
  { value: 'chalet', ar: 'شاليه', en: 'Chalet' },
  { value: 'office', ar: 'إداري / أوفيس', en: 'Office' },
  { value: 'land', ar: 'أرض', en: 'Land' },
] as const

export function unitTypeAr(v: string): string {
  return UNIT_TYPES.find((t) => t.value === v)?.ar ?? v ?? '—'
}

export function unitTypeEn(v: string): string {
  return UNIT_TYPES.find((t) => t.value === v)?.en ?? v ?? 'Unit'
}

/* ────────────────────────── Cities ────────────────────────── */

const CITY_AR: Record<string, string> = {
  'new cairo': 'القاهرة الجديدة',
  'sheikh zayed': 'الشيخ زايد',
  '6th of october': '٦ أكتوبر',
  october: 'أكتوبر',
  madinaty: 'مدينتي',
  'mostakbal city': 'المستقبل city',
  katameya: 'القطامية',
  maadi: 'المعادي',
  heliopolis: 'مصر الجديدة',
  'new capital': 'العاصمة الإدارية',
  'north coast': 'الساحل الشمالي',
  'el gouna': 'الجونة',
  'ain sokhna': 'العين السخنة',
  zamalek: 'الزمالك',
  'october city': 'أكتوبر',
}

export const CITY_KEYS: { keys: string[]; value: string }[] = [
  { keys: ['new cairo', 'القاهرة الجديدة', 'التجمع الخامس', 'التجمع'], value: 'New Cairo' },
  { keys: ['sheikh zayed', 'الشيخ زايد', 'زايد'], value: 'Sheikh Zayed' },
  { keys: ['6th of october', 'sixth of october', '٦ أكتوبر', '٦اكتوبر', '6 october', 'اكتوبر', 'أكتوبر'], value: '6th of October' },
  { keys: ['madinaty', 'مدينتي'], value: 'Madinaty' },
  { keys: ['mostakbal', 'المستقبل'], value: 'Mostakbal City' },
  { keys: ['katameya', 'القطامية', 'قطامية'], value: 'Katameya' },
  { keys: ['new capital', 'العاصمة الإدارية', 'العاصمة'], value: 'New Capital' },
  { keys: ['north coast', 'الساحل الشمالي', 'الساحل'], value: 'North Coast' },
  { keys: ['el gouna', 'الجونة', 'gouna'], value: 'El Gouna' },
  { keys: ['ain sokhna', 'العين السخنة', 'sokhna', 'السخنة'], value: 'Ain Sokhna' },
  { keys: ['maadi', 'المعادي'], value: 'Maadi' },
]

export function cityAr(v: string): string {
  return CITY_AR[v.trim().toLowerCase()] ?? v
}

/* ────────────────────────── Compound prefixes ────────────────────────── */

export const COMPOUND_PREFIXES: { keys: string[]; prefix: string; label?: string }[] = [
  { keys: ['mivida', 'ميفيدا'], prefix: 'MI', label: 'Mivida' },
  { keys: ['mountain view', 'ماونتن فيو', 'ماونتن فيو'], prefix: 'MV', label: 'Mountain View' },
  { keys: ['palm hills', 'بالم هيلز', 'بالم هيلس'], prefix: 'PH', label: 'Palm Hills' },
  { keys: ['katameya dunes', 'قطامية ديونز', 'الديونز'], prefix: 'KD', label: 'Katameya Dunes' },
  { keys: ['katameya residence', 'قطاميا ريزيدنس'], prefix: 'KR', label: 'Katameya Residence' },
  { keys: ['allegria', 'الليجريا', 'اليجريا'], prefix: 'AL', label: 'Allegria' },
  { keys: ['hyde park', 'هايد بارك'], prefix: 'HP', label: 'Hyde Park' },
  { keys: ['villette', 'فيليت', 'ڤيليت'], prefix: 'VL', label: 'Villette' },
  { keys: ['badya', 'باديا'], prefix: 'BD', label: 'Badya' },
  { keys: ['taj city', 'تاج سيتي', 'تاج سيتى'], prefix: 'TJ', label: 'Taj City' },
  { keys: ['il bosco', 'إل بوسكو', 'البوسكو', 'el bosco'], prefix: 'IB', label: 'Il Bosco' },
  { keys: ['sarai', 'سراي'], prefix: 'SR', label: 'Sarai' },
  { keys: ['noor city', 'نور سيتي', 'noor'], prefix: 'NR', label: 'Noor City' },
  { keys: ['cairo festival city', 'كايرو فستيفال', 'cfc'], prefix: 'CF', label: 'Cairo Festival City' },
  { keys: ['royal city', 'رويال سيتي'], prefix: 'RC', label: 'Royal City' },
  { keys: ['boardwalk', 'بورد ووك', 'بوردووك'], prefix: 'BW', label: 'Boardwalk' },
  { keys: ['swan lake', 'سوان ليك'], prefix: 'SL', label: 'Swan Lake' },
  { keys: ['the waterway', 'ووتر واي', 'waterway'], prefix: 'WW', label: 'The Waterway' },
  { keys: ['90 avenue', '90 افينيو', 'ninety avenue', 'افينيو 90'], prefix: 'AV', label: '90 Avenue' },
  { keys: ['kayan', 'كيان'], prefix: 'KY', label: 'Kayan' },
  { keys: ['the ridge', 'ذا ريدج', 'ريدج'], prefix: 'RD', label: 'The Ridge' },
  { keys: ['oia', 'أويا', 'اويا'], prefix: 'OI', label: 'Oia' },
  { keys: ['bliss', 'بليس'], prefix: 'BL', label: 'Bliss' },
  { keys: ['the estates', 'ذا إستيتس', 'الإستيتس'], prefix: 'ES', label: 'The Estates' },
  { keys: ['maxim', 'ماكسيم'], prefix: 'MX', label: 'Maxim' },
  { keys: ['the address', 'ذا أدرس', 'أدرس'], prefix: 'AD', label: 'The Address' },
  { keys: ['marassi', 'مراسي'], prefix: 'MR', label: 'Marassi' },
  { keys: ['hacienda', 'هاسيندا'], prefix: 'HC', label: 'Hacienda' },
  { keys: ['porto', 'بورتو'], prefix: 'PO', label: 'Porto' },
  { keys: ['zayed dunes', 'زايد ديونز'], prefix: 'ZD', label: 'Zayed Dunes' },
]

export function compoundPrefix(compound: string): string {
  const name = (compound || '').trim().toLowerCase()
  if (!name) return 'XX'
  for (const c of COMPOUND_PREFIXES) {
    if (c.keys.some((k) => name.includes(k))) return c.prefix
  }
  // Fallback: first letters of the first two words (e.g. "Lake View" -> "LV")
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'XX'
  const first = words[0]
  const second = words[1]
  let p = (first[0] + (second ? second[0] : first.length > 1 ? first[1] : 'X')).toUpperCase()
  p = p.replace(/[^\p{L}\p{N}]/gu, '')
  while (p.length < 2) p += 'X'
  return p.slice(0, 3)
}

/* ────────────────────────── Price helpers ────────────────────────── */

const CURRENCY_SYMBOLS: Record<string, string> = {
  EGP: 'ج.م',
  USD: '$',
  EUR: '€',
  SAR: 'ر.س',
  AED: 'د.إ',
}

export function formatPrice(price: number | null | undefined, currency: string): string {
  if (price == null || isNaN(price) || price <= 0) return '—'
  const num = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(price)
  return `${num} ${CURRENCY_SYMBOLS[currency?.toUpperCase()] ?? currency ?? ''}`.trim()
}

function trimNum(n: number): string {
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

export function priceTag(price: number | null | undefined, currency: string): string {
  if (price == null || isNaN(price) || price <= 0) return 'NA'
  const cur = (currency || 'EGP').toUpperCase()
  if (cur === 'EGP') {
    if (price >= 1_000_000) return `${trimNum(price / 1_000_000)}M`
    if (price >= 1_000) return `${Math.round(price / 1_000)}K`
    return trimNum(price)
  }
  if (price >= 1_000_000) return `${trimNum(price / 1_000_000)}M-${cur}`
  if (price >= 1_000) return `${Math.round(price / 1_000)}K-${cur}`
  return `${trimNum(price)}-${cur}`
}

/* ────────────────────────── Property code ────────────────────────── */

export function generatePropertyCode(
  fields: Pick<PropertyFields, 'compound' | 'bedrooms' | 'furnished' | 'price' | 'currency'>,
  existingCodes: string[] = []
): string {
  const prefix = compoundPrefix(fields.compound)
  const rooms = fields.bedrooms > 0 ? String(fields.bedrooms) : 'X'
  const furn = fields.furnished ? 'F' : 'U'
  const tag = priceTag(fields.price, fields.currency)
  const base = `${prefix}-${rooms}${furn}-${tag}`
  if (!existingCodes.includes(base)) return base
  let n = 2
  while (existingCodes.includes(`${base}-${n}`)) n++
  return `${base}-${n}`
}

/* ────────────────────────── Map links ────────────────────────── */

export function buildMapQuery(compound: string, city: string): string {
  return [compound.trim(), cityAr(city).trim()].filter(Boolean).join(', ')
}

export function buildMapLink(compound: string, city: string): string {
  const q = buildMapQuery(compound, city)
  return `https://maps.google.com/?q=${encodeURIComponent(q)}`
}

export function buildMapEmbedUrl(compound: string, city: string): string {
  const q = buildMapQuery(compound, city)
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed&hl=ar`
}

/* ────────────────────────── Template content (fallback) ────────────────────────── */

function hashtag(s: string): string {
  return '#' + s.trim().replace(/\s+/g, '_')
}

export function templateContent(
  fields: PropertyFields,
  code: string,
  mapLink: string,
  companyPhone: string
): GeneratedContent {
  const isAr = fields.language === 'ar'
  const price = formatPrice(fields.price, fields.currency)
  const city = isAr ? cityAr(fields.city) : fields.city
  const loc = `${fields.compound}, ${city}`
  const typeAr = unitTypeAr(fields.unitType)
  const typeEn = unitTypeEn(fields.unitType)
  const contact = companyPhone || 'Sierra Estates'
  const areaLine = fields.area ? `${fields.area} م²` : '—'
  const highlights = (fields.highlights || []).filter(Boolean).slice(0, 6)
  const hlAr = highlights.length ? `✨ ${highlights.join(' | ')}\n` : ''

  if (isAr) {
    const whatsapp = `🏡 *${typeAr} للبيع في ${loc}*

🛏 غرف النوم: ${fields.bedrooms || '—'}
🛁 الحمامات: ${fields.bathrooms || '—'}
📐 المساحة: ${areaLine}
💰 السعر: ${price}
🛋 التشطيب: ${fields.furnished ? 'مفروشة بالكامل' : 'غير مفروشة'}
${hlAr}
📍 الموقع: ${mapLink}

🔗 كود الوحدة: ${code}

📞 للتواصل: ${contact}`

    const facebook = `🏡 للبيع ${typeAr} في ${loc}

🛏 ${fields.bedrooms || '—'} غرف نوم | 🛁 ${fields.bathrooms || '—'} حمامات | 📐 ${areaLine}
💰 السعر: ${price}
🛋 ${fields.furnished ? 'مفروشة بالكامل' : 'غير مفروشة'}
${highlights.length ? `✨ ${highlights.join(' | ')}\n` : ''}
📍 ${loc}

🔗 كود الوحدة: ${code}
📞 للتواصل: ${contact}

${hashtag('عقارات مصر')} ${hashtag(fields.compound)} ${hashtag(city)} ${hashtag('بيع')}`

    const propertyFinder = `Title: ${fields.bedrooms || '—'} Bedroom ${fields.furnished ? 'Furnished ' : ''}${typeEn} for Sale in ${loc}
Type: For Sale – ${typeEn}
Bedrooms: ${fields.bedrooms || '—'}
Bathrooms: ${fields.bathrooms || '—'}
Built-up Area: ${fields.area ? `${fields.area} sqm` : '—'}
Price: ${fields.price ? `${new Intl.NumberFormat('en-US').format(fields.price)} ${fields.currency}` : '—'}
Furnished: ${fields.furnished ? 'Yes' : 'No'}
Location: ${loc}
Reference Code: ${code}
Map: ${mapLink}

Description:
${fields.furnished ? 'Fully furnished' : 'Unfurnished'} ${typeEn.toLowerCase()} for sale in ${fields.compound}, ${city}, featuring ${fields.bedrooms || '—'} bedrooms and ${fields.bathrooms || '—'} bathrooms across ${fields.area ? `${fields.area} sqm` : 'a generous layout'}${highlights.length ? `. Highlights: ${highlights.join(', ')}` : ''}. Contact ${contact} to arrange a viewing.`

    return { whatsapp, facebook, propertyFinder }
  }

  const whatsapp = `🏡 *${typeEn} for Sale in ${loc}*

🛏 Bedrooms: ${fields.bedrooms || '—'}
🛁 Bathrooms: ${fields.bathrooms || '—'}
📐 Area: ${fields.area ? `${fields.area} sqm` : '—'}
💰 Price: ${price}
🛋 Furnished: ${fields.furnished ? 'Yes' : 'No'}
${highlights.length ? `✨ ${highlights.join(' | ')}\n` : ''}
📍 Location: ${mapLink}

🔗 Unit Code: ${code}

📞 Contact: ${contact}`

  const facebook = `🏡 FOR SALE – ${typeEn} in ${loc}

🛏 ${fields.bedrooms || '—'} Bedrooms | 🛁 ${fields.bathrooms || '—'} Bathrooms | 📐 ${fields.area ? `${fields.area} sqm` : '—'}
💰 Price: ${price}
🛋 ${fields.furnished ? 'Fully Furnished' : 'Unfurnished'}
${highlights.length ? `✨ ${highlights.join(' | ')}\n` : ''}
📍 ${loc}

🔗 Unit Code: ${code}
📞 Contact: ${contact}

#Egypt_RealEstate #${fields.compound.replace(/\s+/g, '_')} #ForSale #${fields.city.replace(/\s+/g, '_')}`

  const propertyFinder = `Title: ${fields.bedrooms || '—'} Bedroom ${fields.furnished ? 'Furnished ' : ''}${typeEn} for Sale in ${loc}
Type: For Sale – ${typeEn}
Bedrooms: ${fields.bedrooms || '—'}
Bathrooms: ${fields.bathrooms || '—'}
Built-up Area: ${fields.area ? `${fields.area} sqm` : '—'}
Price: ${fields.price ? `${new Intl.NumberFormat('en-US').format(fields.price)} ${fields.currency}` : '—'}
Furnished: ${fields.furnished ? 'Yes' : 'No'}
Location: ${loc}
Reference Code: ${code}
Map: ${mapLink}

Description:
${fields.furnished ? 'Fully furnished' : 'Unfurnished'} ${typeEn.toLowerCase()} for sale in ${fields.compound}, ${fields.city}, featuring ${fields.bedrooms || '—'} bedrooms and ${fields.bathrooms || '—'} bathrooms across ${fields.area ? `${fields.area} sqm` : 'a generous layout'}${highlights.length ? `. Highlights: ${highlights.join(', ')}` : ''}. Contact ${contact} to arrange a viewing.`

  return { whatsapp, facebook, propertyFinder }
}
