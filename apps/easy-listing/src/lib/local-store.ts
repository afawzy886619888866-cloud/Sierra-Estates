'use client'

import type { AppSettings, SavedProperty } from './types'

const SETTINGS_KEY = 'sierra-easy-listing.settings.v2'
const PROPERTIES_KEY = 'sierra-easy-listing.properties.v2'
const MAX_SAVED = 200

/** Sierra Estates' own Google Sheet (shared with the team). */
export const DEFAULT_SHEET_LINK =
  'https://docs.google.com/spreadsheets/d/1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk/edit'

export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbziL2a1R8N4ytEI8BNu8WFfVSbviUxfYRcfoOyVOpCC7q3NUogxSKMCn6DoTuN6jEdW/exec'

export const DEFAULT_COMPANY_PHONE = '01092048333'
// Fail-closed: no hardcoded outreach secret in the client bundle.
// Staff/owners configure the shared service key in Settings; the server
// rejects unauthenticated /api/save|extract|generate calls without it.
export const DEFAULT_SECRET = ''

export const DEFAULT_SETTINGS: AppSettings = {
  appsScriptUrl: DEFAULT_APPS_SCRIPT_URL,
  sheetLink: DEFAULT_SHEET_LINK,
  companyPhone: DEFAULT_COMPANY_PHONE,
  secret: DEFAULT_SECRET,
  supabaseUrl: 'https://gaxfqcietzoonlmatiot.supabase.co',
  supabaseAnonKey: 'sb_publishable_EDulPb5PhW_F0jdb3NV3_A_928PUumc',
}

const INITIAL_BOT_RESUME: SavedProperty[] = [
  {
    id: 'bot-inbound-01',
    code: 'MIV-3F-10.5M',
    internalCode: 'NC-MIV-APT-F3-220M',
    bmmCode: 'OMIV-AF-101',
    compound: 'Mivida',
    city: 'القاهرة الجديدة',
    unitType: 'شقة',
    bedrooms: 3,
    bathrooms: 3,
    area: 220,
    floor: 'الدور الثالث',
    price: 10500000,
    currency: 'EGP',
    furnished: true,
    role: 'OWNER',
    contactName: 'عمرو مرسي (مالك مباشر)',
    ownerPhone: '01092048333',
    description: 'شقة مفروشة للبيع في ميفيدا إعمار، 3 غرف نوم و3 حمامات، مساحة 220 متر، فيو لاندسكيب بحري، استلام فوري.',
    language: 'ar',
    highlights: 'فيو لاندسكيب، مفروش، استلام فوري',
    whatsappContent: '🏡 شقة فاخرة للبيع في ميفيدا (Mivida)\n📐 المساحة: 220م\n🛏️ 3 غرف + 3 حمام\n💵 السعر: 10,500,000 ج\n📞 للتواصل: 01092048333',
    facebookContent: 'فرصة نادرة للبيع في ميفيدا إعمار التجمع الخامس! شقة 220م الترا سوبر لوكس مفروشة بالكامل.',
    pfContent: 'Luxury 3BR Furnished Apartment for Sale in Mivida New Cairo - 220 SQM',
    mapLink: 'https://maps.google.com/?q=Mivida+New+Cairo',
    imageUrls: '',
    sheetSynced: true,
    sheetError: null,
    supabaseSynced: true,
    mapSynced: true,
    source: 'owner-outreach',
    status: 'owner_reply_yes',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'bot-inbound-02',
    code: 'FSQ-3U-8.8M',
    internalCode: 'NC-FSQ-APT-GF-165M',
    bmmCode: 'OFSQ-BOT-102',
    compound: 'Fifth Square',
    city: 'القاهرة الجديدة',
    unitType: 'شقة أرضي بجاردن',
    bedrooms: 3,
    bathrooms: 2,
    area: 165,
    floor: 'أرضي',
    price: 8800000,
    currency: 'EGP',
    furnished: false,
    role: 'OWNER',
    contactName: 'د. ليلى فريد (المالك)',
    ownerPhone: '01092048333',
    description: 'شقة ارضي بجاردن 70م خاصة في فيفث سكوير المراسم، 3 غرف و 2 حمام، نصف تشطيب، السعر 8.8 مليون كاش.',
    language: 'ar',
    highlights: 'حديقة خاصة 70م، موقع متميز، استلام فوري',
    whatsappContent: '🏡 شقة أرضي بجاردن 70م في فيفث سكوير المراسم\n📐 165م + 70م حديقة\n💵 8,800,000 ج كاش\n📞 للتواصل: 01092048333',
    facebookContent: 'عرض حصري بفيفت سكوير المراسم: شقة أرضي 165م بحديقة 70م خاصة، استلام فوري!',
    pfContent: 'Ground Apartment with 70m Private Garden in Fifth Square Al Marasem',
    mapLink: 'https://maps.google.com/?q=Fifth+Square+New+Cairo',
    imageUrls: '',
    sheetSynced: true,
    sheetError: null,
    supabaseSynced: true,
    mapSynced: true,
    source: 'bot',
    status: 'bot_intake',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'bot-inbound-03',
    code: 'EST-2U-7.2M',
    internalCode: 'NC-EST-APT-F2-140M',
    bmmCode: 'EEST-AF-103',
    compound: 'Eastown',
    city: 'القاهرة الجديدة',
    unitType: 'شقة',
    bedrooms: 2,
    bathrooms: 2,
    area: 140,
    floor: 'الدور الثاني',
    price: 7200000,
    currency: 'EGP',
    furnished: false,
    role: 'EMPLOYEE',
    employeeName: 'أحمد فوزي (AF)',
    contactName: 'أحمد فوزي (فريق المبيعات)',
    ownerPhone: '01092048333',
    description: 'شقة للبيع في ايستاون سوديك شارع التسعين، 140م دور ثاني، فيو مفتوح، 2 غرف ماستر، جاهزة للمعاينات.',
    language: 'ar',
    highlights: 'سوديك التسعين، بحري، مسجلة',
    whatsappContent: '🏡 شقة مميزة للبيع في ايستاون سوديك 140م\n💵 7,200,000 ج\nمسؤول المبيعات: أحمد فوزي (01092048333)',
    facebookContent: 'وحدة استثمارية مميزة في كمبوند ايستاون سوديك بجوار الجامعة الأمريكية!',
    pfContent: 'Prime 2BR Apartment for Sale in Eastown Sodic New Cairo',
    mapLink: 'https://maps.google.com/?q=Eastown+Sodic+New+Cairo',
    imageUrls: '',
    sheetSynced: true,
    sheetError: null,
    supabaseSynced: true,
    mapSynced: true,
    source: 'manual',
    status: 'active',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
]

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS }
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      appsScriptUrl: String(parsed.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL).trim(),
      sheetLink: String(parsed.sheetLink || DEFAULT_SHEET_LINK).trim(),
      companyPhone: String(parsed.companyPhone || DEFAULT_COMPANY_PHONE).trim(),
      secret: String(parsed.secret || DEFAULT_SECRET).trim(),
      supabaseUrl: String(parsed.supabaseUrl || DEFAULT_SETTINGS.supabaseUrl).trim(),
      supabaseAnonKey: String(parsed.supabaseAnonKey || DEFAULT_SETTINGS.supabaseAnonKey).trim(),
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: AppSettings): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export function loadSavedProperties(): SavedProperty[] {
  if (typeof window === 'undefined') return INITIAL_BOT_RESUME
  try {
    const raw = window.localStorage.getItem(PROPERTIES_KEY)
    if (!raw) {
      // First run: save seed records
      window.localStorage.setItem(PROPERTIES_KEY, JSON.stringify(INITIAL_BOT_RESUME))
      return INITIAL_BOT_RESUME
    }
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as SavedProperty[]
    return INITIAL_BOT_RESUME
  } catch {
    return INITIAL_BOT_RESUME
  }
}

export function addSavedProperty(p: SavedProperty): SavedProperty[] {
  const existing = loadSavedProperties()
  const items = [p, ...existing.filter((x) => x.id !== p.id)].slice(0, MAX_SAVED)
  try {
    window.localStorage.setItem(PROPERTIES_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
  return items
}

export function removeSavedProperty(id: string): SavedProperty[] {
  const items = loadSavedProperties().filter((p) => p.id !== id)
  try {
    window.localStorage.setItem(PROPERTIES_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
  return items
}

export function savedCodes(): string[] {
  return loadSavedProperties().map((p) => p.code)
}

export function driveThumb(url: string): string {
  const m = url.match(/drive\.google\.com\/file\/d\/([-\w]{10,})/)
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`
  return url
}
