export type AdvertiserRole = 'OWNER' | 'BROKER' | 'AGENT' | 'EMPLOYEE'

export interface PropertyFields {
  compound: string
  city: string
  unitType: string
  bedrooms: number
  bathrooms: number
  area: number | null
  floor: string
  price: number | null
  currency: string
  furnished: boolean
  highlights: string[]
  language: 'ar' | 'en'
}

export interface GeneratedContent {
  whatsapp: string
  facebook: string
  propertyFinder: string
}

export interface AppSettings {
  appsScriptUrl: string
  sheetLink: string
  companyPhone: string
  /** Shared secret required by the team's Apps Script doPost (CONFIG.OUTREACH_SECRET) */
  secret: string
  supabaseUrl?: string
  supabaseAnonKey?: string
}

export interface SavedProperty {
  id: string
  code: string
  bmmCode?: string
  internalCode?: string
  compound: string
  city: string
  unitType: string
  bedrooms: number
  bathrooms: number
  area: number | null
  floor: string | null
  price: number | null
  currency: string
  furnished: boolean
  // Role & Contact identity
  role: AdvertiserRole
  contactName?: string
  employeeName?: string
  ownerPhone: string
  description: string
  language: string
  highlights: string
  whatsappContent: string
  facebookContent: string
  pfContent: string
  mapLink: string
  imageUrls: string
  // Multi-sync statuses
  sheetSynced: boolean
  sheetError: string | null
  supabaseSynced?: boolean
  mapSynced?: boolean
  source?: 'bot' | 'owner-outreach' | 'manual' | 'whatsapp'
  status?: 'active' | 'pending_review' | 'bot_intake' | 'owner_reply_yes'
  createdAt: string
}
