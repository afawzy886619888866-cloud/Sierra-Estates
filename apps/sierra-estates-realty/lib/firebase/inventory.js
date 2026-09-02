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
import { db } from './';

// --- Types ---

 
























































































// --- Constants ---

export const COMPOUND_CODES = {
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
export function generateUnitCode(prop) {
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
export function generateNormalizedKey(prop) {
  const compound = (prop.compound_name || '').toLowerCase().replace(/\s+/g, '');
  const priceBucket = prop.price ? Math.floor(prop.price / 500000) : 0;
  return `${compound}_b${prop.bedrooms || 0}_p${priceBucket}_f${prop.furnishing || 'u'}`;
}

/**
 * 3. addProperty
 */
export async function addProperty(property) {
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
export async function updateProperty(id, updates) {
  const docRef = doc(db, 'properties', id);
  await updateDoc(docRef, {
    ...updates,
    updated_at: serverTimestamp()
  });
}

/**
 * 5. deleteProperty
 */
export async function deleteProperty(id) {
  await deleteDoc(doc(db, 'properties', id));
}

/**
 * 6. getProperties
 */
export async function getProperties(filters) {
  let q = query(collection(db, 'properties'), orderBy('created_at', 'desc'));

  if (filters) {
    if (filters.status) q = query(q, where('status', '==', filters.status));
    if (filters.offer_type) q = query(q, where('offer_type', '==', filters.offer_type));
    if (filters.compound_name) q = query(q, where('compound_name', '==', filters.compound_name));
    if (filters.is_public !== undefined) q = query(q, where('is_public', '==', filters.is_public));
    if (filters.is_featured !== undefined) q = query(q, where('is_featured', '==', filters.is_featured));
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } ));
}

/**
 * 7. getPropertyById
 */
export async function getPropertyById(id) {
  const snap = await getDoc(doc(db, 'properties', id));
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } ;
  }
  return null;
}

/**
 * 8. markStaleProperties
 */
export async function markStaleProperties() {
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
export function parseRawTextToProperty(rawText) {
  const text = rawText.toLowerCase();
  const entity = {
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
