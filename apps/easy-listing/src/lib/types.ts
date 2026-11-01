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
}

export interface SavedProperty {
  id: string
  code: string
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
  ownerPhone: string
  description: string
  language: string
  highlights: string
  whatsappContent: string
  facebookContent: string
  pfContent: string
  mapLink: string
  imageUrls: string
  sheetSynced: boolean
  sheetError: string | null
  createdAt: string
}
