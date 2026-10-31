'use strict';
/**
 * propertyfinder-rent-ad.js — Canonical Rent Code Generator & Property Finder Atlas Ad Builder.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * Adheres to 3 core principles:
 *   1. Best Quality — Validates >= 6 photos, authentic compound geolocation, institutional copy.
 *   2. Lowest Price & Tokens — Local algorithmic script generator with zero API latency.
 *   3. Full Automation & Tested — Validates and stages Atlas v1 Residential Rent (RR) payloads.
 */

const { COMPOUND_PROFILES, PROPERTY_TYPE_NAMES, generateInstitutionalCopy } = require('./listing-copywriter');

/**
 * Normalizes phone numbers to standard WhatsApp format without international prefix artifacts.
 */
function formatWaPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '201092048333';
  return digits.startsWith('20') ? digits : `20${digits.replace(/^0+/, '')}`;
}

// Compound shorthand codes for canonical naming
const COMPOUND_CODES = {
  'Mivida': 'MI',
  'Mountain View Hyde Park': 'MV',
  'Mountain View': 'MV',
  'Villette': 'VS',
  'Eastown': 'ET',
  'Hyde Park': 'HP',
  'Palm Hills': 'PH',
  'Swan Lake': 'SL',
  'Fifth Square': 'FS',
  'Madinaty': 'MD',
  'Al Rehab': 'RH',
  'Oriana 2': 'OR',
  'Cairo Festival City': 'CF',
  'The Address': 'AD',
  'Lake View Residence': 'LV',
  'Katameya Dunes': 'KD',
  'Katameya Heights': 'KH',
  'Zed East': 'ZE',
  'New Cairo': 'NC',
};

// Shorthand Property Type codes for Property Finder
const PF_PROPERTY_TYPES = {
  'Apartment': 'AP',
  'apartment': 'AP',
  'Luxury Apartment': 'AP',
  'Standalone Villa': 'VH',
  'villa': 'VH',
  'standalone': 'VH',
  'standalone villa': 'VH',
  'Twin House': 'TH',
  'twinhouse': 'TH',
  'twin_house': 'TH',
  'Townhouse': 'TW',
  'townhouse': 'TW',
  'town_house': 'TW',
  'Duplex': 'DX',
  'duplex': 'DX',
  'Penthouse': 'PH',
  'penthouse': 'PH',
  'Chalet': 'CH',
  'chalet': 'CH',
};

/**
 * Generates canonical rent code: {CompoundCode}-{Beds}{Furnished}-{MonthlyRentPriceTag}
 * e.g. MI-3F-45K, HP-3U-55K, VS-4F-65K
 */
function generateCanonicalRentCode(unit) {
  const compound = unit.compound || 'New Cairo';
  const prefix = COMPOUND_CODES[compound] || 'SE';

  const beds = Math.max(1, Number(unit.bedrooms) || 3);
  const furnRaw = String(unit.furnished || unit.furnishing || '').toLowerCase();
  const descRaw = String(unit.description || '');

  const isUnfurnished = furnRaw.includes('unfurn') || descRaw.includes('غير مفروش') || descRaw.includes('بدون فرش');
  const isFurnished = !isUnfurnished && (furnRaw.includes('furn') || descRaw.includes('مفروش') || descRaw.includes('بالفرش'));
  const furn = isFurnished ? 'F' : 'U';

  const price = Number(unit.price) || 0;
  let priceTag = 'P';
  if (price >= 1000000) {
    priceTag = `${Math.round(price / 1000000)}M`;
  } else if (price >= 1000) {
    priceTag = `${Math.round(price / 1000)}K`;
  } else if (price > 0) {
    priceTag = `${price}`;
  }

  return `${prefix}-${beds}${furn}-${priceTag}`;
}

/**
 * Builds Rent-specific institutional copy (Arabic & English).
 */
function generateRentMarketingScript(unit) {
  const code = unit.code || generateCanonicalRentCode(unit);
  const copy = generateInstitutionalCopy({
    ...unit,
    code,
    dealType: 'rent',
  });

  const compound = unit.compound || 'New Cairo';
  const priceFormatted = Number(unit.price) > 0 ? `${Number(unit.price).toLocaleString()} ج.م / شهرياً` : 'القيمة عند المعاينة';
  const phone = unit.ownerPhone || unit.phone
    || process.env.DIRECT_MGMT_PHONE || '+201092048333';

  const whatsappBroadcast = [
    `💎 وحدة راقية للإيجار في ${compound} | كود: ${code}`,
    `─────────────────────────────`,
    `✨ مواصفات الوحدة:`,
    `• النوع: ${unit.propertyType || 'شقة فاخرة'}`,
    `• المساحة: ${unit.areaSqm || 'مساحة واسعة'} م²`,
    `• الغرف: ${unit.bedrooms || 3} غرف نوم | ${unit.bathrooms || 2} حمامات`,
    `• التشطيب: ${unit.finishing || 'ألترا سوبر لوكس جاهز للسكن الفوري'}`,
    `• الفرش: ${String(unit.furnished || '').includes('furn') || String(unit.description || '').includes('مفروش') ? 'مفروشة بالكامل' : 'غير مفروشة'}`,
    ``,
    `💰 القيمة الإيجارية الشهرية: ${priceFormatted}`,
    `─────────────────────────────`,
    `📲 للحجز والمعاينة المباشرة:`,
    `واتساب: https://wa.me/${formatWaPhone(phone)}?text=معاينة_إيجار_كود_${code}`,
    `هاتف: ${phone}`,
    `✦ SIERRA ESTATES • PRIVATE CLIENT ADVISORY ✦`
  ].join('\n');

  return {
    code,
    titleAr: copy.titleAr,
    descriptionAr: copy.descriptionAr,
    titleEn: copy.titleEn,
    descriptionEn: copy.descriptionEn,
    whatsappBroadcast,
  };
}

/**
 * Validates whether a Rent unit meets all Property Finder Atlas publishing standards:
 *  1. Asking Price > 0 EGP
 *  2. At least 6 clean photos >= 800x600 px (rejects placeholders and low-res)
 *  3. Non-empty bedrooms & area
 *  4. Valid compound name
 */
function validateRentListingForPropertyFinder(unit) {
  const errors = [];
  const price = Number(unit.price) || 0;
  if (price <= 0) {
    errors.push('Missing asking rental price (price <= 0)');
  }

  const area = Number(unit.area_sqm || unit.areaSqm || unit.area) || 0;
  if (area <= 0) {
    errors.push('Missing or invalid unit area in sqm (must be > 0)');
  }

  const bedroomsRaw = unit.bedrooms;
  const bedrooms = bedroomsRaw !== undefined && bedroomsRaw !== null && bedroomsRaw !== '' ? Number(bedroomsRaw) : NaN;
  if (isNaN(bedrooms) || bedrooms < 0) {
    errors.push('Missing verified bedroom count');
  }

  const rawImages = unit.images || [];
  const cleanPhotos = (Array.isArray(rawImages) ? rawImages : [])
    .map(u => String(typeof u === 'string' ? u : (u.url || u.original?.url || '')).trim())
    .filter(u => {
      if (!/^https?:\/\//i.test(u)) return false;
      const lower = u.toLowerCase();
      if (lower.includes('placeholder') || lower.includes('no-image') || lower.includes('default-property')) {
        return false;
      }
      return true;
    });

  // Verify dimensions if photo dimension metadata is present
  const lowRes = (Array.isArray(rawImages) ? rawImages : []).filter(
    img => img && typeof img === 'object' && ((img.width && img.width < 800) || (img.height && img.height < 600))
  );
  if (lowRes.length > 0) {
    errors.push(`Found ${lowRes.length} photos below minimum resolution 800x600 px`);
  }

  const photoCount = cleanPhotos.length;
  if (photoCount < 6) {
    errors.push(`Requires at least 6 photos for Property Finder compliance (current: ${photoCount})`);
  }

  const compound = String(unit.compound || '').trim();
  if (!compound || compound.toLowerCase() === 'new cairo' || compound.includes('عام')) {
    errors.push('Requires specific gated compound name (generic New Cairo not permitted on PF)');
  }

  return {
    valid: errors.length === 0,
    errors,
    cleanPhotos,
    photoCount,
    area,
    bedrooms: isNaN(bedrooms) ? null : bedrooms,
  };
}

/**
 * Builds the official Property Finder Atlas v1 Residential Rent (RR) API payload.
 */
function buildPropertyFinderRentPayload(unit) {
  const validation = validateRentListingForPropertyFinder(unit);
  const code = unit.code || generateCanonicalRentCode(unit);
  const script = generateRentMarketingScript(unit);
  const pType = unit.property_type || unit.propertyType;
  const typeCode = PF_PROPERTY_TYPES[pType] || PF_PROPERTY_TYPES[String(pType).toLowerCase()] || 'AP';

  const priceNum = Math.max(0, Number(unit.price) || 0);
  const areaNum = Number(unit.area_sqm || unit.areaSqm || unit.area) || null;
  const bedroomsNum = unit.bedrooms !== undefined && unit.bedrooms !== null && unit.bedrooms !== '' ? Number(unit.bedrooms) : null;
  const bathroomsNum = unit.bathrooms !== undefined && unit.bathrooms !== null && unit.bathrooms !== '' ? Number(unit.bathrooms) : null;

  const titleAr = (unit.title_ar || unit.titleAr || script.titleAr || '').slice(0, 80);
  const titleEn = (unit.title || unit.titleEn || script.titleEn || '').slice(0, 80);
  const descAr = unit.description_ar || unit.descriptionAr || script.descriptionAr || '';
  const descEn = unit.description || unit.descriptionEn || script.descriptionEn || '';

  return {
    reference: code,
    offering_type: 'RR', // Residential Rent
    property_type: typeCode,
    category: 'residential',
    price: {
      amounts: [
        {
          value: priceNum,
          currency: 'EGP',
          frequency: 'monthly',
        }
      ]
    },
    specs: {
      bedrooms: bedroomsNum,
      bathrooms: bathroomsNum,
      area: {
        value: areaNum,
        unit: 'sqm',
      }
    },
    title: {
      ar: titleAr,
      en: titleEn,
    },
    description: {
      ar: descAr,
      en: descEn,
    },
    media: {
      photos: validation.cleanPhotos.map(url => ({
        original: { url },
      })),
    },
    location: {
      compound: unit.compound || 'New Cairo',
      city: 'New Cairo',
      country: 'EG',
    },
    agent: {
      name: 'Sierra Estates Advisory',
      phone: process.env.DIRECT_MGMT_PHONE || '+201092048333',
      email: 'advisory@sierra-estates.com',
    },
    compliance: {
      isCertified: validation.valid,
      missingGaps: validation.errors,
    }
  };
}

module.exports = {
  formatWaPhone,
  generateCanonicalRentCode,
  generateRentMarketingScript,
  validateRentListingForPropertyFinder,
  buildPropertyFinderRentPayload,
  COMPOUND_CODES,
  PF_PROPERTY_TYPES,
};
