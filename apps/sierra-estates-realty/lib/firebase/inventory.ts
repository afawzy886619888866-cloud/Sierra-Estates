import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// --- Types ---

export type FurnishingStatus = 'furnished' | 'semi-furnished' | 'unfurnished';
export type OfferType = 'sale' | 'rent';
export type ListingType = 'primary' | 'resale' | 'landlord_direct' | 'developer_inventory';
export type PropertyStatus = 'draft' | 'available' | 'reserved' | 'sold' | 'archived';
export type Currency = 'EGP' | 'USD';

export interface Property {
  id?: string;

  // Code System
  unit_code: string;          // Auto-generated e.g. "MI-3F-10M"
  code_internal?: string;     // Optional internal ref

  // Classification
  offer_type: OfferType;
  listing_type: ListingType;
  status: PropertyStatus;

  // Identity
  title_ar: string;
  title_en: string;
  description_ar?: string;
  description_en?: string;

  // Location
  compound_name: string;
  compound_code: string;       // e.g. "MI", "HP", "CFC"
  area_slug: string;           // e.g. "new_cairo", "fifth_settlement"
  address_text?: string;
  geo?: { lat: number; lng: number };

  // Specs
  unit_type: 'apartment' | 'villa' | 'townhouse' | 'penthouse' | 'duplex' | 'studio' | 'office' | 'shop';
  bedrooms: number;
  bathrooms: number;
  bua_m2: number;
  land_area_m2?: number;
  floor_number?: number;
  furnishing: FurnishingStatus;
  finishing?: 'core' | 'semi' | 'fully' | 'ultra-luxury';

  // Pricing
  price: number;
  currency: Currency;
  price_egp_normalized: number;   // Always in EGP for filtering
  payment_type?: 'cash' | 'installment' | 'both';
  down_payment?: number;
  installment_years?: number;
  maintenance_fee?: number;

  // Media
  cover_image_url?: string;
  gallery_urls: string[];
  video_url?: string;
  virtual_tour_url?: string;

  // Flags
  is_featured: boolean;
  is_public: boolean;
  stale_flag: boolean;

  // Source
  source?: string;             // "manual" | "whatsapp_import" | "excel"
  source_raw_text?: string;    // Original pasted text if applicable

  // Data quality
  normalized_key: string;      // For duplicate detection
  freshness_date: any;         // Firestore Timestamp

  // Meta
  created_by: string;
  updated_by?: string;
  created_at: any;
  updated_at: any;
}

export interface PropertyFilters {
  status?: PropertyStatus;
  offer_type?: OfferType;
  compound_name?: string;
  bedrooms_min?: number;
  bedrooms_max?: number;
  price_min?: number;
  price_max?: number;
  furnishing?: FurnishingStatus;
  is_public?: boolean;
  is_featured?: boolean;
}

// --- Constants ---

export const COMPOUND_CODES: Record<string, string> = {
  'mivida': 'MI',
  'hyde park': 'HP',
  'cairo festival city': 'CFC',
  'mountain view': 'MV',
  'palm hills': 'PA',
  'arcadia': 'AR',
  'lakeview': 'LA',
  'rehab': 'RH',
  'madinaty': 'MD',
  'the square': 'SQ',
  'zed east': 'ZE',
  'rivan': 'RV',
};

// --- Helpers ---

/**
 * 1. generateUnitCode
 * Format: [COMPOUND_CODE]-[BEDROOMS][FURNISHING_CODE]-[PRICE_CODE]
 */
export function generateUnitCode(prop: Partial<Property>): string {
  const cCode = prop.compound_code || (prop.compound_name ? prop.compound_name.substring(0, 2).toUpperCase() : 'XX');
  const beds = prop.bedrooms || 0;
  
  let fCode = 'U';
  if (prop.furnishing === 'furnished') fCode = 'F';
  else if (prop.furnishing === 'semi-furnished') fCode = 'S';

  let pCode = '0';
  if (prop.price) {
    if (prop.currency === 'USD') {
      pCode = `$${prop.price}`;
    } else {
      if (prop.offer_type === 'rent') {
        pCode = prop.price >= 1000 ? `${(prop.price / 1000).toFixed(0)}K` : `${prop.price}`;
      } else {
        pCode = prop.price >= 1000000 ? `${(prop.price / 1000000).toFixed(1)}M` : `${(prop.price / 1000).toFixed(0)}K`;
      }
    }
  }

  return `${cCode}-${beds}${fCode}-${pCode}`;
}

/**
 * 2. generateNormalizedKey
 * Hash of: compound_name + bedrooms + price_range_bucket + furnishing
 */
export function generateNormalizedKey(prop: Partial<Property>): string {
  const compound = (prop.compound_name || '').toLowerCase().replace(/\s+/g, '');
  const priceBucket = prop.price ? Math.floor(prop.price / 500000) : 0;
  return `${compound}_b${prop.bedrooms || 0}_p${priceBucket}_f${prop.furnishing || 'u'}`;
}

/**
 * 3. addProperty
 */
export async function addProperty(property: Omit<Property, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const normKey = generateNormalizedKey(property);
  
  // Basic duplicate check
  const q = query(collection(db, 'properties'), where('normalized_key', '==', normKey), limit(1));
  const snap = await getDocs(q);
  
  if (!snap.empty) {
    console.warn("Potential duplicate detected for key:", normKey);
  }

  const docRef = await addDoc(collection(db, 'properties'), {
    ...property,
    normalized_key: normKey,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    freshness_date: serverTimestamp()
  });
  
  return docRef.id;
}

/**
 * 4. updateProperty
 */
export async function updateProperty(id: string, updates: Partial<Property>): Promise<void> {
  const docRef = doc(db, 'properties', id);
  await updateDoc(docRef, {
    ...updates,
    updated_at: serverTimestamp()
  });
}

/**
 * 5. deleteProperty
 */
export async function deleteProperty(id: string): Promise<void> {
  await deleteDoc(doc(db, 'properties', id));
}

/**
 * 6. getProperties
 */
export async function getProperties(filters?: PropertyFilters): Promise<Property[]> {
  let q = query(collection(db, 'properties'), orderBy('created_at', 'desc'));

  if (filters) {
    if (filters.status) q = query(q, where('status', '==', filters.status));
    if (filters.offer_type) q = query(q, where('offer_type', '==', filters.offer_type));
    if (filters.compound_name) q = query(q, where('compound_name', '==', filters.compound_name));
    if (filters.is_public !== undefined) q = query(q, where('is_public', '==', filters.is_public));
    if (filters.is_featured !== undefined) q = query(q, where('is_featured', '==', filters.is_featured));
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Property));
}

/**
 * 7. getPropertyById
 */
export async function getPropertyById(id: string): Promise<Property | null> {
  const snap = await getDoc(doc(db, 'properties', id));
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as Property;
  }
  return null;
}

/**
 * 8. markStaleProperties
 */
export async function markStaleProperties(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const q = query(
    collection(db, 'properties'), 
    where('stale_flag', '==', false),
    where('freshness_date', '<', Timestamp.fromDate(thirtyDaysAgo))
  );
  
  const snap = await getDocs(q);
  let count = 0;
  
  for (const d of snap.docs) {
    await updateDoc(d.ref, { stale_flag: true });
    count++;
  }
  
  return count;
}

/**
 * 9. parseRawTextToProperty - AI / Keyword Parser
 */
export function parseRawTextToProperty(rawText: string): Partial<Property> {
  const text = rawText.toLowerCase();
  const entity: Partial<Property> = {
    source: 'whatsapp_import',
    source_raw_text: rawText,
    is_public: false,
    is_featured: false,
    stale_flag: false,
    gallery_urls: [],
    status: 'draft'
  };

  // Compound Extraction
  for (const [name, code] of Object.entries(COMPOUND_CODES)) {
    if (text.includes(name)) {
      entity.compound_name = name;
      entity.compound_code = code;
      break;
    }
  }

  // Offer Type
  if (text.includes('للإيجار') || text.includes('rent')) entity.offer_type = 'rent';
  else if (text.includes('للبيع') || text.includes('sale')) entity.offer_type = 'sale';

  // Bedrooms
  const bedMatch = text.match(/(\d+)\s*(غرف|bedroom|bed|br)/);
  if (bedMatch) entity.bedrooms = parseInt(bedMatch[1]);

  // Area
  const areaMatch = text.match(/(\d+)\s*(متر|sqm|m2)/);
  if (areaMatch) entity.bua_m2 = parseInt(areaMatch[1]);

  // Price
  const priceMatch = text.match(/(\d+[,.]?\d*)\s*(ألف|مليون|k|m|egp|جنيه|\$)/);
  if (priceMatch) {
    let p = parseFloat(priceMatch[1].replace(',', ''));
    const unit = priceMatch[2];
    
    if (unit === 'مليون' || unit === 'm') p *= 1000000;
    else if (unit === 'ألف' || unit === 'k') p *= 1000;
    
    entity.price = p;
    entity.currency = text.includes('$') || text.includes('usd') ? 'USD' : 'EGP';
    entity.price_egp_normalized = entity.currency === 'USD' ? p * 50 : p; // Dummy conversion
  }

  // Furnishing & Finishing
  if (text.includes('مفروش') || text.includes('furnished')) entity.furnishing = 'furnished';
  else if (text.includes('نصف فرش') || text.includes('semi')) entity.furnishing = 'semi-furnished';
  else entity.furnishing = 'unfurnished';

  if (text.includes('الترا لوكس') || text.includes('ultra')) entity.finishing = 'ultra-luxury';
  else if (text.includes('سوبر لوكس') || text.includes('fully')) entity.finishing = 'fully';
  else if (text.includes('نصف تشطيب') || text.includes('core')) entity.finishing = 'core';

  return entity;
}
