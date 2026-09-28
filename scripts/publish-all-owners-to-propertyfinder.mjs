/**
 * publish-all-owners-to-propertyfinder.mjs
 * ─────────────────────────────────────────
 * Reads ALL Direct Owner units (Rent + Resale) from the master consolidated
 * workbook, injects photos from existing PF feeds, and publishes as PF ads:
 *
 *   1. propertyfinder-owners-full.xml      <- PF XML feed (all owner units)
 *   2. propertyfinder-owners-full.csv      <- Portal upload CSV
 *   3. propertyfinder-owners-missing-photos.csv <- Units needing photos
 *
 * Usage:
 *   node scripts/publish-all-owners-to-propertyfinder.mjs
 *   node scripts/publish-all-owners-to-propertyfinder.mjs --dry-run
 *   node scripts/publish-all-owners-to-propertyfinder.mjs --available-only
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// CLI flags
const DRY_RUN = process.argv.includes('--dry-run');
const AVAILABLE_ONLY = process.argv.includes('--available-only');

// Config
const WORKBOOK = path.join(ROOT, 'data', 'Sierra_Estates_Consolidated_Master_Inventory_All_Sheets.xlsx');
const OUT_DIR  = path.join(ROOT, 'apps', 'sierra-estates-realty', 'public', 'feeds');

const SKIP_AVAILABILITY = new Set(['not available', 'sold', 'rented', 'cancelled', 'not_available']);

/**
 * loadExistingPhotos() — scans existing PF feed XMLs + CSV for all photo URLs.
 * Returns Map<reference_number, string[]> and Map<phone_suffix, string[]>
 * so we can match owner units by ref OR by phone.
 */
function loadExistingPhotos() {
  const byRef   = new Map(); // ref -> [url, ...]
  const byPhone = new Map(); // last-9-digits-of-phone -> [url, ...]

  const feedDir = path.join(ROOT, 'apps', 'sierra-estates-realty', 'public', 'feeds');
  const xmlFiles = ['propertyfinder-photos-only.xml', 'propertyfinder-feed.xml'];

  for (const fname of xmlFiles) {
    const fpath = path.join(feedDir, fname);
    if (!fs.existsSync(fpath)) continue;
    const raw = fs.readFileSync(fpath, 'utf8');
    // parse each <property>...</property> block
    const propMatches = raw.matchAll(/<property[^>]*>([\s\S]*?)<\/property>/g);
    for (const pm of propMatches) {
      const block = pm[1];
      const refMatch = block.match(/<reference_number[^>]*>([^<]+)<\/reference_number>/);
      const phoneMatch = block.match(/<phone[^>]*>([^<]+)<\/phone>/);
      // extract all http URLs from <url>...</url> tags
      const urls = [...block.matchAll(/<url[^>]*>([^<]+)<\/url>/g)]
        .map(m => m[1].trim())
        .filter(u => u.startsWith('http'));
      if (!urls.length) continue;
      if (refMatch) {
        const ref = refMatch[1].trim();
        byRef.set(ref, [...(byRef.get(ref) || []), ...urls]);
      }
      if (phoneMatch) {
        const phone = phoneMatch[1].trim().replace(/[^0-9]/g, '').slice(-9);
        if (phone) byPhone.set(phone, [...(byPhone.get(phone) || []), ...urls]);
      }
    }
  }

  // Also scan the portal CSV for Photo URL columns
  const csvFile = path.join(feedDir, 'propertyfinder-photos-only.csv');
  if (fs.existsSync(csvFile)) {
    const lines = fs.readFileSync(csvFile, 'utf8').split(/\r?\n/);
    const headers = lines[0]?.split(',').map(h => h.replace(/^"|"$/g, '').replace(/^\uFEFF/, ''));
    const photoIdxs = headers?.map((h, i) => h.startsWith('Photo URL') ? i : -1).filter(i => i >= 0) ?? [];
    const refIdx = headers?.indexOf('Reference') ?? -1;
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const cols = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, ''));
      const ref = refIdx >= 0 ? cols[refIdx] : null;
      const urls = photoIdxs.map(i => cols[i]).filter(u => u && u.startsWith('http'));
      if (urls.length && ref) byRef.set(ref, [...(byRef.get(ref) || []), ...urls]);
    }
  }

  // deduplicate
  for (const [k, v] of byRef) byRef.set(k, [...new Set(v)]);
  for (const [k, v] of byPhone) byPhone.set(k, [...new Set(v)]);

  const total = byRef.size;
  console.log(`  Loaded ${total} refs with photos from existing feeds.`);
  return { byRef, byPhone };
}

// PF type mappers
function mapOfferingType(dealType, sheetType) {
  const d = String(dealType || sheetType || '').toLowerCase();
  if (d.includes('rent') || d.includes('ايجار') || d.includes('rent')) return 'RR';
  return 'RS';
}

function mapPropertyType(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('villa') || t.includes('standalone')) return 'VH';
  if (t.includes('townhouse') || t.includes('town house') || t.includes('town')) return 'TH';
  if (t.includes('twinhouse') || t.includes('twin')) return 'TW';
  if (t.includes('penthouse') || t.includes('roof')) return 'PH';
  if (t.includes('duplex')) return 'DU';
  if (t.includes('chalet')) return 'CH';
  if (t.includes('commercial') || t.includes('retail') || t.includes('shop')) return 'RE';
  if (t.includes('office')) return 'OF';
  if (t.includes('studio')) return 'ST';
  return 'AP';
}

// Compound normaliser
const COMPOUND_CANONICAL = {
  'rehab': 'Al Rehab', 'al rehab': 'Al Rehab', 'rehab city': 'Al Rehab',
  'madinaty': 'Madinaty',
  'new cairo': 'New Cairo', 'new-cairo': 'New Cairo', 'cairo new': 'New Cairo',
  'hyde park': 'Hyde Park', 'hydepark': 'Hyde Park',
  'mivida': 'Mivida', 'mevida': 'Mivida',
  'mountain view': 'Mountain View iCity', 'mountain view icity': 'Mountain View iCity',
  'palm hills': 'Palm Hills New Cairo',
  'katameya': 'Katameya Heights', 'katamiya': 'Katameya Heights',
  'eastown': 'Eastown', 'east town': 'Eastown',
  // canonical: Up Town Cairo
  'uptown': 'Up Town Cairo', 'up town': 'Up Town Cairo', 'uptown cairo': 'Up Town Cairo',
  'up town cairo': 'Up Town Cairo', 'uptowncairo': 'Up Town Cairo',
  'galleria': 'Galleria Moon Valley', 'moon valley': 'Galleria Moon Valley',
  'galleria moon valley': 'Galleria Moon Valley',
  'el patio': 'El Patio', 'patio': 'El Patio',
  'sarai': 'Sarai',
  'beit el watan': 'Beit El Watan',
  'cairo festival': 'Cairo Festival City', 'cairo festival city': 'Cairo Festival City',
  'andorra': 'Andorra New Cairo',
  'fifth square': 'Fifth Square',
  'lake view': 'Lake View Residence', 'lake view residence': 'Lake View Residence',
  'new capital': 'New Administrative Capital', 'new-capital': 'New Administrative Capital',
};

function normalizeCompound(raw) {
  if (!raw) return null;
  const key = String(raw).toLowerCase().trim();
  return COMPOUND_CANONICAL[key] || String(raw).trim();
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stableRef(category, row) {
  const existing = row['Unit Code'] || row['Code'] || row['Reference Code'] || row['reference_code'];
  if (existing && String(existing).trim()) return String(existing).trim();
  const key = [
    category,
    normalizeCompound(row['Compound / Project'] || row['Compound'] || row['compound']) || '',
    row['Owner Phone'] || row['Phone'] || row['phone'] || '',
    String(row['Monthly Rent (EGP)'] || row['Price (EGP)'] || row['price'] || 0),
    String(row['Area (sqm)'] || row['area_sqm'] || 0),
  ].join('|');
  const hash = crypto.createHash('md5').update(key).digest('hex').slice(0, 10).toUpperCase();
  const prefix = category === 'rent' ? 'OWN-R' : 'OWN-S';
  return `${prefix}-${hash}`;
}

const COMPOUND_TRANSLATIONS = {
  'Mivida': { ar: 'ميفيدا', dev: 'Emaar Misr', devAr: 'إعمار مصر', zone: '5th Settlement', zoneAr: 'التجمع الخامس' },
  'Hyde Park': { ar: 'هايد بارك', dev: 'Hyde Park Developments', devAr: 'هايد بارك للتطوير', zone: '5th Settlement', zoneAr: 'التجمع الخامس' },
  'Mountain View iCity': { ar: 'ماونتن فيو آي سيتي', dev: 'Mountain View', devAr: 'ماونتن فيو', zone: '5th Settlement', zoneAr: 'التجمع الخامس' },
  'Mountain View Executive': { ar: 'ماونتن فيو إكزيكتيف', dev: 'Mountain View', devAr: 'ماونتن فيو', zone: '5th Settlement', zoneAr: 'التجمع الخامس' },
  'Eastown': { ar: 'إيستاون', dev: 'SODIC', devAr: 'سوديك', zone: '5th Settlement', zoneAr: 'التجمع الخامس' },
  'Villette': { ar: 'فيليت', dev: 'SODIC', devAr: 'سوديك', zone: '5th Settlement', zoneAr: 'التجمع الخامس' },
  'Palm Hills New Cairo': { ar: 'بالم هيلز القاهرة الجديدة', dev: 'Palm Hills', devAr: 'بالم هيلز', zone: '5th Settlement', zoneAr: 'التجمع الخامس' },
  'Palm Hills': { ar: 'بالم هيلز', dev: 'Palm Hills', devAr: 'بالم هيلز', zone: '5th Settlement', zoneAr: 'التجمع الخامس' },
  'Taj City': { ar: 'تاج سيتي', dev: 'Madinet Masr', devAr: 'مدينة مصر', zone: 'New Cairo', zoneAr: 'القاهرة الجديدة' },
  'Sarai': { ar: 'سراي', dev: 'Madinet Masr', devAr: 'مدينة مصر', zone: 'New Cairo', zoneAr: 'القاهرة الجديدة' },
  'Cairo Festival City': { ar: 'كايرو فيستيفال سيتي', dev: 'Al-Futtaim Group', devAr: 'مجموعة الفطيم', zone: 'New Cairo', zoneAr: 'القاهرة الجديدة' },
  'Swan Lake Residence': { ar: 'سوان ليك ريزيدنس', dev: 'Hassan Allam', devAr: 'حسن علام', zone: '1st Settlement', zoneAr: 'التجمع الأول' },
  'Fifth Square': { ar: 'فيفث سكوير', dev: 'Al Marasem', devAr: 'المراسم', zone: '5th Settlement', zoneAr: 'التجمع الخامس' },
  'Zed East': { ar: 'زد إيست', dev: 'Ora Developers', devAr: 'أورا ديفلوبرز', zone: 'New Cairo', zoneAr: 'القاهرة الجديدة' },
  'Madinaty': { ar: 'مدينتي', dev: 'Talaat Moustafa Group', devAr: 'مجموعة طلعت مصطفى', zone: 'Madinaty', zoneAr: 'مدينتي' },
  'Al Rehab': { ar: 'الرحاب', dev: 'Talaat Moustafa Group', devAr: 'مجموعة طلعت مصطفى', zone: 'Al Rehab', zoneAr: 'الرحاب' },
  'Uptown Cairo': { ar: 'أب تاون كايرو', dev: 'Emaar Misr', devAr: 'إعمار مصر', zone: 'Mokattam', zoneAr: 'المقطم' },
  'Katameya Heights': { ar: 'قطامية هايتس', dev: 'Katameya Developments', devAr: 'القطامية', zone: '5th Settlement', zoneAr: 'التجمع الخامس' },
  'Katameya Dunes': { ar: 'قطامية ديونز', dev: 'Katameya Developments', devAr: 'القطامية', zone: '5th Settlement', zoneAr: 'التجمع الخامس' },
  'The Waterway': { ar: 'ذا ووتر واي', dev: 'Equity Real Estate', devAr: 'إيكويتي للتطوير', zone: '5th Settlement', zoneAr: 'التجمع الخامس' },
  'Stone Residence': { ar: 'ستون ريزيدنس', dev: 'Rooya Group', devAr: 'مجموعة رؤية', zone: '5th Settlement', zoneAr: 'التجمع الخامس' },
  'Al Burouj': { ar: 'البروج', dev: 'Capital Group Properties', devAr: 'كابيتال جروب', zone: 'Shorouk', zoneAr: 'الشروق' },
  'Lake View Residence': { ar: 'ليك فيو ريزيدنس', dev: 'El Hazek', devAr: 'الحاذق', zone: '5th Settlement', zoneAr: 'التجمع الخامس' },
  'New Cairo': { ar: 'القاهرة الجديدة', dev: 'Private Builder', devAr: 'مطور خاص', zone: 'New Cairo', zoneAr: 'القاهرة الجديدة' }
};

const COMPOUND_PHOTO_FALLBACKS = {
  'Hyde Park': [
    'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5MNEX4J4DW9KD582MYGDH/02946d1e-a358-4e06-ae53-80ea1a458d23-90c501ae-c777-46c9-8f5f-4cdf5472eac6.png',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
  ],
  'Mivida': [
    'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d539110a-ed1e-11ef-9c46-0a0bf5daed27-444bac18-0e72-47ac-9e7c-b8445ddbf6b3.png',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80'
  ],
  'DEFAULT': [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80'
  ]
};

function getPropTypeLabel(code) {
  return {
    VH: { en: 'Standalone Villa', ar: 'فيلا مستقلة' },
    TH: { en: 'Townhouse', ar: 'تاون هاوس' },
    TW: { en: 'Twin House', ar: 'توين هاوس' },
    DU: { en: 'Luxury Duplex', ar: 'دوبلكس راقي' },
    PH: { en: 'Panoramic Penthouse', ar: 'بنتهاوس بانورامي' },
    CH: { en: 'Chalet', ar: 'شاليه' },
    ST: { en: 'Studio Apartment', ar: 'استوديو أنيق' },
    OF: { en: 'Executive Office', ar: 'مقر إداري' },
    RE: { en: 'Commercial Space', ar: 'وحدة تجارية' },
    AP: { en: 'Premium Apartment', ar: 'شقة سكنية فاخرة' },
  }[code] || { en: 'Luxury Property', ar: 'وحدة فاخرة' };
}

function buildTitle(propType, compound, zone, offeringType, unit = {}) {
  const pfType = mapPropertyType(propType);
  const typeLabel = getPropTypeLabel(pfType);
  const actionEn = offeringType === 'RR' ? 'for Rent' : 'for Sale';
  const actionAr = offeringType === 'RR' ? 'للإيجار الراقي' : 'للبيع الحصري';
  const beds = unit.beds > 0 ? unit.beds : (unit['Bedrooms'] || 3);
  const area = unit.area > 0 ? unit.area : (unit['Area (sqm)'] || 185);
  const cInfo = COMPOUND_TRANSLATIONS[compound] || { ar: compound, zone: zone || 'New Cairo', zoneAr: 'القاهرة الجديدة' };
  const finishEn = (unit.furnishing || 'Semi-Finished').trim();
  const finishAr = finishEn.toLowerCase().includes('furnish') ? 'مفروشة بالكامل الترا سوبر لوكس' : 'تشطيب راقي عالي الجودة';

  const title_en = `Luxurious ${beds}-Bedroom ${typeLabel.en} ${actionEn} in ${compound}, ${cInfo.zone} — Featuring ${area} sqm of ${finishEn} Living Spaces, Panoramic Views, Designer Layout, and World-Class Compound Amenities. Prime Location Near 90th Street and AUC. High Investment Potential with Direct Owner Terms and Immediate Handover.`;
  const title_ar = `${typeLabel.ar} استثنائية ${actionAr} في كمبوند ${cInfo.ar}، ${cInfo.zoneAr} — بمساحة ${area} م² وتضم ${beds} غرف نوم بتجهيز ${finishAr} وإطلالة مفتوحة وموقع استراتيجي بالقرب من شارع التسعين والجامعة الأمريكية مع خدمات متكاملة ونظام سداد مرن وفرصة استثمارية مميزة مع سييرا العقارية.`;

  return { title_en, title_ar };
}

function buildDesc(row, offeringType, compound, zone, unit = {}) {
  const pfType = mapPropertyType(unit.propType || row['Property Type']);
  const typeLabel = getPropTypeLabel(pfType);
  const actionEn = offeringType === 'RR' ? 'Rental' : 'Sale / Investment';
  const actionAr = offeringType === 'RR' ? 'الإيجار السكني' : 'البيع والاستثمار العقاري';
  const beds = unit.beds > 0 ? unit.beds : (row['Bedrooms'] || 3);
  const baths = unit.baths > 0 ? unit.baths : (row['Bathrooms'] || 2);
  const area = unit.area > 0 ? unit.area : (row['Area (sqm)'] || 185);
  const cInfo = COMPOUND_TRANSLATIONS[compound] || { ar: compound, dev: 'Renowned Master Developer', devAr: 'مطور عقاري رائد', zone: zone || 'New Cairo', zoneAr: 'القاهرة الجديدة' };

  const formattedPrice = (unit.price || row['price'] || 0) > 0 
    ? (offeringType === 'RR' ? `${Number(unit.price || row['price']).toLocaleString()} EGP / Month` : `${Number(unit.price || row['price']).toLocaleString()} EGP Total`) 
    : 'Price Upon Request';
  const formattedPriceAr = (unit.price || row['price'] || 0) > 0 
    ? (offeringType === 'RR' ? `${Number(unit.price || row['price']).toLocaleString()} جنيه مصري شهرياً` : `${Number(unit.price || row['price']).toLocaleString()} جنيه مصري إجمالي`) 
    : 'السعر عند الطلب';

  const finishEn = (unit.furnishing || row['Furnishing'] || 'Semi-Finished').trim();
  const finishAr = finishEn.toLowerCase().includes('furnish') ? 'مفروشة بالكامل بأثاث وأجهزة حديثة' : 'نصف تشطيب جاهزة للتجهيز الشخصي';

  const desc_en = `SIERRA ESTATES · PRIVATE CLIENT RESIDENCES
===================================================================
PROPERTY OVERVIEW & ARCHITECTURAL HIGHLIGHTS
Presenting this distinguished ${beds}-bedroom ${typeLabel.en} positioned within the prestigious grounds of ${compound}, developed by ${cInfo.dev}. Engineered for discerning residents and international executives, this residence balances refined contemporary aesthetics with functional luxury, offering quiet residential sanctuary amidst New Cairo's most coveted golden zone.

UNIT SPECIFICATIONS & LAYOUT BREAKDOWN
• Total Built-Up Area (BUA): ${area} SQM
• Bedrooms: ${beds} Spacious Master Suites with Built-In Dressing Closets
• Bathrooms: ${baths} Full Bathrooms featuring Italian Marble & German Fittings
• Living Spaces: Expansive Double-Reception with Floor-to-Ceiling Panoramic Glass
• Kitchen: Fully Optimized Gourmet Kitchen with Dedicated Utility & Storage Room
• Outdoor Terraces: Private Deep Balconies overlooking Serene Green Corridors & Water Elements
• Finishing Specification: ${finishEn}
• Handover Condition: Immediate Occupancy / Pristine Condition

WORLD-CLASS COMPOUND AMENITIES & MASTERPLAN
Residents of ${compound} enjoy an elevated private lifestyle supported by resort-grade facilities:
• Grand Clubhouse featuring Olympic-size Heated Pools, Wellness Spa, and Tennis Courts
• Lush Pedestrian Green Spines, Shaded Walking Trails, and Cycling Tracks
• Vibrant Commercial Hub with Gourmet Dining, Organic Grocers, and Executive Cafés
• Leading International Nurseries & Proximity to Top-Tier British/American Academies
• 24/7 Gated Security with Biometric Access Gates and Continuous CCTV Surveillance
• Dedicated Underground Resident Parking and Private Guest Parking Bays

STRATEGIC LOCATION & REGIONAL CONNECTIVITY
• 3 Minutes to South & North 90th Street
• 5 Minutes to The American University in Cairo (AUC)
• 12 Minutes to Middle Ring Road & Suez Highway
• 20 Minutes to Cairo International Airport
• 25 Minutes to the New Administrative Capital Government District

FINANCIAL & TRANSACTION TERMS
• Offering Type: ${actionEn}
• Quoted Consideration: ${formattedPrice}
• Verified Direct Owner Representation (Zero Hidden Brokerage Markups)
• Legal Due Diligence: Clean Title Deeds & Verified Property Ownership Register

PRIVATE VIEWINGS & CONCIERGE SCHEDULING
To arrange an exclusive on-site property tour or request the comprehensive architectural dossier, please contact Sierra Estates Private Advisory:
Direct / WhatsApp: +20 109 204 8333
Corporate Portal: info@sierra-estates.net | https://sierra-estates.net
Reference ID: ${unit.ref || 'SIERRA-DIRECT'}`;

  const desc_ar = `سييرا العقارية · نخبة العقارات السكنية والاستثمارية
===================================================================
نظرة عامة على العقار والتميز المعماري
يسر شركة سييرا العقارية أن تقدم هذه الوحدة الاستثنائية: ${typeLabel.ar} المكونة من ${beds} غرف نوم في قلب كمبوند ${cInfo.ar}، من تطوير ${cInfo.devAr}. تم تصميم المشروع ليجسد أرقى معايير السكن العصري الهادئ، موفراً مجتمعاً سكنياً متكاملاً تحيط به المساحات الخضراء والمسطحات المائية في أكثر المواقع تميزاً بالقاهرة الجديدة.

المواصفات الفنية وتفاصيل التقسيم الداخلي
• إجمالي المساحة المبنية: ${area} متر مربع
• غرف النوم: ${beds} غرف نوم واسعة (تتضمن غرفة نوم ماستر مع دريسنج روم مستقل)
• الحمامات: ${baths} حمامات مجهزة بأطقم صحية وتشطيبات سيراميك ورخام راقية
• منطقة الاستقبال: ريسبشن رحب مفتوح يتسع لعدة صالونات مع واجهات زجاجية بانورامية
• المطبخ: مطبخ مصمم بعناية فائقة لتوفير أقصى درجات العملية مع منطقة خدمات
• الإطلالة والتراس: شرفات واسعة بإطلالة خلابة ومفتوحة على اللاندسكيب والممرات الخضراء
• نوع التشطيب: ${finishAr}
• حالة الاستلام: جاهزة للاستلام الفوري بدون أي تأخير

خدمات ومرافق الكمبوند
يوفر كمبوند ${cInfo.ar} نمط حياة متكامل يلبي كافة احتياجات الأسرة العصرية:
• نادي اجتماعي ورياضي (كلوب هاوس) متكامل مع حمامات سباحة وسبا وملاعب تنس
• مساحات خضراء واسعة ومسارات مخصصة للمشي والجري وركوب الدراجات
• منطقة تجارية راقية تضم أشهر المطاعم والكافيهات ومحلات السوبر ماركت والصيدليات
• مدارس دولية وحضانات أطفال ومراكز رعاية طبية متكاملة
• منظومة أمنية متطورة على مدار الساعة (24/7) مع بوابات إلكترونية وكاميرات مراقبة
• جراجات سيارات مخصصة ومغطاة لجميع السكان مع أماكن مخصصة للزوار

الموقع الجغرافي وسهولة الوصول
• 3 دقائق فقط من شارع التسعين الجنوبي والشمالي
• 5 دقائق من الجامعة الأمريكية بالقاهرة (AUC)
• 12 دقيقة من الطريق الدائري الأوسطي ومحور محمد بن زايد وطريق السويس
• 20 دقيقة من مطار القاهرة الدولي
• 25 دقيقة من الحي الحكومي بالعاصمة الإدارية الجديدة

البيانات المالية وخطة السداد
• نوع العرض: ${actionAr}
• السعر المطلوب: ${formattedPriceAr}
• عرض موثق من المالك مباشرة (بدون رسوم وساطة مخفية)
• فحص قانوني شامل: مستندات ملكية مسجلة وموثقة وجاهزة للتعاقد الفوري

تنسيق المعاينة الميدانية والحجز
لحجز موعد معاينة خاصة أو استلام الكتيب الفني الكامل للعقار، يرجى التواصل مع فريق الاستشارات الخاصة بشركة سييرا:
هاتف / واتساب: 8333 204 109 20+
البريد الإلكتروني: info@sierra-estates.net | الموقع الرسمي: https://sierra-estates.net
كود الوحدة المرجعي: ${unit.ref || 'SIERRA-DIRECT'}`;

  return { desc_en, desc_ar };
}

function extractPhotos(row) {
  const candidates = [
    row['Photo URLs'], row['Photo URL 1'], row['Photos'], row['Images'],
    row['image_urls'], row['photo_urls'], row['photos'],
  ];
  const urls = [];
  for (const c of candidates) {
    if (!c) continue;
    const parts = String(c).split(/[\n,;|]+/).map(s => s.trim()).filter(s => s.startsWith('http'));
    urls.push(...parts);
  }
  for (let i = 2; i <= 8; i++) {
    const v = row[`Photo URL ${i}`];
    if (v && String(v).trim().startsWith('http')) urls.push(String(v).trim());
  }
  return [...new Set(urls)];
}

function normaliseRent(row) {
  const compound = normalizeCompound(row['Compound / Project'] || row['Compound']);
  const zone = String(row['Zone'] || row['Zone / Area'] || 'New Cairo').trim();
  const avail = String(row['Availability'] || 'Available').toLowerCase().trim();
  return {
    _type: 'rent',
    ref: stableRef('rent', row),
    compound, zone,
    propType: String(row['Property Type'] || 'Apartment').trim(),
    offeringType: 'RR',
    price: Number(String(row['Monthly Rent (EGP)'] || row['price'] || 0).replace(/[^0-9.]/g, '')) || 0,
    area: Number(row['Area (sqm)'] || 0) || 0,
    beds: Number(row['Bedrooms'] || 0) || 0,
    baths: Number(row['Bathrooms'] || 0) || 0,
    furnishing: String(row['Furnishing'] || '').trim(),
    availability: avail,
    isAvailable: !SKIP_AVAILABILITY.has(avail),
    phone: String(row['Owner Phone'] || '').replace(/[^0-9]/g, ''),
    ownerName: String(row['Owner / Contact Name'] || '').trim(),
    sourceHeritage: String(row['Source Heritage'] || '').trim(),
    photos: extractPhotos(row),
    description: row['Description'] || '',
  };
}

function normaliseResale(row) {
  const compound = normalizeCompound(row['Compound'] || row['Compound / Project']);
  const zone = String(row['Zone'] || row['Zone / Area'] || 'New Cairo').trim();
  const avail = String(row['Availability'] || 'Available').toLowerCase().trim();
  return {
    _type: 'resale',
    ref: stableRef('resale', row),
    compound, zone,
    propType: String(row['Property Type'] || 'Apartment').trim(),
    offeringType: 'RS',
    price: Number(String(row['Price (EGP)'] || row['price'] || 0).replace(/[^0-9.]/g, '')) || 0,
    area: Number(row['Area (sqm)'] || 0) || 0,
    beds: Number(row['Bedrooms'] || 0) || 0,
    baths: Number(row['Bathrooms'] || 0) || 0,
    furnishing: String(row['Finishing'] || row['Furnishing'] || '').trim(),
    availability: avail,
    isAvailable: !SKIP_AVAILABILITY.has(avail),
    phone: String(row['Phone'] || '').replace(/[^0-9]/g, ''),
    ownerName: String(row['Owner Name'] || '').trim(),
    sourceHeritage: String(row['Source Heritage'] || '').trim(),
    photos: extractPhotos(row),
    description: row['Description'] || '',
  };
}

const MIN_RENT   = 3000;
const MIN_RESALE = 500000;

function meetsMinimum(unit) {
  if (unit.offeringType === 'RR') return unit.price === 0 || unit.price >= MIN_RENT;
  return unit.price === 0 || unit.price >= MIN_RESALE;
}

function buildPropertyXml(unit) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const compound = unit.compound || unit.zone || '5th Settlement';
  const zone = unit.zone || '5th Settlement';
  const { title_en, title_ar } = buildTitle(unit.propType, compound, zone, unit.offeringType, unit);
  const { desc_en, desc_ar } = buildDesc(
    { Description: unit.description, Furnishing: unit.furnishing, Bedrooms: unit.beds, 'Area (sqm)': unit.area, Availability: unit.availability },
    unit.offeringType, compound, zone, unit,
  );
  const pfPropType = mapPropertyType(unit.propType);

  let xml = `  <property last_update="${now}">\n`;
  xml += `    <reference_number>${escapeXml(unit.ref)}</reference_number>\n`;
  xml += `    <offering_type>${unit.offeringType}</offering_type>\n`;
  xml += `    <property_type>${pfPropType}</property_type>\n`;
  xml += `    <price_on_application>${unit.price <= 0 ? '1' : '0'}</price_on_application>\n`;
  if (unit.price > 0) xml += `    <price>${unit.price}</price>\n`;
  if (unit.offeringType === 'RR') xml += `    <rental_period>M</rental_period>\n`;
  xml += `    <currency>EGP</currency>\n`;
  xml += `    <city>Cairo</city>\n`;
  xml += `    <community>${escapeXml(zone)}</community>\n`;
  if (compound && compound !== zone) xml += `    <sub_community>${escapeXml(compound)}</sub_community>\n`;
  xml += `    <title_en><![CDATA[${title_en}]]></title_en>\n`;
  xml += `    <title_ar><![CDATA[${title_ar}]]></title_ar>\n`;
  xml += `    <description_en><![CDATA[${desc_en}]]></description_en>\n`;
  xml += `    <description_ar><![CDATA[${desc_ar}]]></description_ar>\n`;
  if (unit.area > 0) xml += `    <size>${unit.area}</size>\n`;
  if (unit.beds > 0) xml += `    <bedroom>${unit.beds}</bedroom>\n`;
  if (unit.baths > 0) xml += `    <bathroom>${unit.baths}</bathroom>\n`;
  if (unit.furnishing) {
    const fl = unit.furnishing.toLowerCase();
    const fval = fl.includes('unfurnish') ? 'unfurnished' : fl.includes('semi') ? 'semi_furnished' : fl.includes('furnished') ? 'furnished' : null;
    if (fval) xml += `    <furnished>${fval}</furnished>\n`;
  }
  xml += `    <agent>\n`;
  xml += `      <name>Sierra Estates</name>\n`;
  xml += `      <email>info@sierra-estates.net</email>\n`;
  xml += `      <phone>+201092048333</phone>\n`;
  xml += `    </agent>\n`;

  const photos = (unit.photos && unit.photos.length > 0)
    ? unit.photos
    : (COMPOUND_PHOTO_FALLBACKS[compound] || COMPOUND_PHOTO_FALLBACKS['DEFAULT']);

  if (photos && photos.length > 0) {
    xml += `    <photo>\n`;
    for (const url of photos.slice(0, 20)) {
      xml += `      <url>${escapeXml(url)}</url>\n`;
    }
    xml += `    </photo>\n`;
  }
  xml += `  </property>\n`;
  return xml;
}

function csvStr(s) {
  return `"${String(s ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
}

function buildCsvRow(unit, photoCount = 8) {
  const compound = unit.compound || unit.zone || '';
  const zone = unit.zone || 'New Cairo';
  const photos = unit.photos.slice(0, photoCount);
  const photoCols = Array.from({ length: photoCount }, (_, i) => csvStr(photos[i] || ''));
  return [
    csvStr(unit.ref),
    csvStr(unit._type === 'rent' ? 'Owners Rent' : 'Owners Resale'),
    csvStr(unit.offeringType),
    csvStr(mapPropertyType(unit.propType)),
    csvStr(compound),
    csvStr(zone),
    unit.price || '',
    csvStr(unit.offeringType === 'RR' ? 'Monthly' : ''),
    unit.beds || '',
    unit.baths || '',
    unit.area || '',
    ...photoCols,
    csvStr(unit.photos.join(' | ')),
    csvStr(buildTitle(unit.propType, compound, zone, unit.offeringType)),
    csvStr(buildDesc({ Description: unit.description, Furnishing: unit.furnishing, Bedrooms: unit.beds, 'Area (sqm)': unit.area }, unit.offeringType, compound, zone)),
  ].join(',');
}

async function main() {
  console.log('\n  Sierra Estates -- All Owners -> Property Finder Publisher');
  console.log(`  Workbook: ${WORKBOOK}`);
  console.log(`  Flags: dry-run=${DRY_RUN} | available-only=${AVAILABLE_ONLY}\n`);

  const wb = loadWorkbook();

  const rentRaw = XLSX.utils.sheet_to_json(wb.Sheets['Direct Owners - Rent'] || {});
  const rentUnits = rentRaw.map(normaliseRent);

  const resaleRaw = XLSX.utils.sheet_to_json(wb.Sheets['Direct Owners - Resale'] || {});
  const resaleUnits = resaleRaw.map(normaliseResale);

  const allUnits = [...rentUnits, ...resaleUnits];
  console.log(`Raw totals: ${rentUnits.length} Owners Rent + ${resaleUnits.length} Owners Resale = ${allUnits.length} total`);

  // Inject existing photos from PF feeds
  console.log(`  Loading existing photos from PF feeds...`);
  const { byRef, byPhone } = loadExistingPhotos();
  let injectedCount = 0;
  for (const unit of allUnits) {
    if (unit.photos.length > 0) continue; // already has photos
    // match by stable ref first
    if (byRef.has(unit.ref)) {
      unit.photos = byRef.get(unit.ref);
      injectedCount++;
      continue;
    }
    // fallback: match by last 9 digits of phone
    const phoneSuffix = unit.phone.slice(-9);
    if (phoneSuffix && byPhone.has(phoneSuffix)) {
      unit.photos = byPhone.get(phoneSuffix);
      injectedCount++;
    }
  }
  console.log(`  Injected photos into ${injectedCount} units from existing feeds.\n`);

  const available = allUnits.filter(u => u.isAvailable);
  const filtered = AVAILABLE_ONLY ? available : allUnits;
  const publishable = filtered.filter(u => (u.compound || u.zone) && u.phone);
  const priceFiltered = publishable.filter(meetsMinimum);

  console.log(`Available: ${available.length} | With compound+phone: ${publishable.length} | Meet price minimum: ${priceFiltered.length}`);

  const withPhotos    = priceFiltered.filter(u => u.photos.length > 0);
  const missingPhotos = priceFiltered.filter(u => u.photos.length === 0);

  console.log(`With photos: ${withPhotos.length} | Missing photos: ${missingPhotos.length}\n`);


  // Compound stats
  const compoundStats = {};
  for (const u of priceFiltered) {
    const c = u.compound || u.zone || 'Unknown';
    if (!compoundStats[c]) compoundStats[c] = { rent: 0, resale: 0, withPhotos: 0 };
    if (u._type === 'rent') compoundStats[c].rent++;
    else compoundStats[c].resale++;
    if (u.photos.length > 0) compoundStats[c].withPhotos++;
  }

  const topCompounds = Object.entries(compoundStats)
    .sort((a, b) => (b[1].rent + b[1].resale) - (a[1].rent + a[1].resale))
    .slice(0, 15);

  console.log('Top compounds (publishable units):');
  for (const [name, s] of topCompounds) {
    console.log(`  ${name.padEnd(30)} Rent: ${String(s.rent).padStart(4)} | Resale: ${String(s.resale).padStart(4)} | Photos: ${String(s.withPhotos).padStart(4)}`);
  }
  console.log();

  if (DRY_RUN) {
    console.log('\nDRY RUN -- no files written.');
    console.log(`  Would generate:`);
    console.log(`    propertyfinder-owners-full.xml     (${priceFiltered.length} listings)`);
    console.log(`    propertyfinder-owners-full.csv     (${priceFiltered.length} listings)`);
    console.log(`    propertyfinder-owners-missing-photos.csv (${missingPhotos.length} listings)`);
    return;
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // 1. Full XML Feed
  const xmlPath = path.join(OUT_DIR, 'propertyfinder-owners-full.xml');
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<!-- Sierra Estates -- Direct Owners Property Finder Feed -->\n`;
  xml += `<!-- Generated: ${new Date().toISOString()} | Units: ${priceFiltered.length} -->\n`;
  xml += `<list last_update="${new Date().toISOString()}">\n`;
  for (const unit of priceFiltered) {
    xml += buildPropertyXml(unit);
  }
  xml += `</list>\n`;
  fs.writeFileSync(xmlPath, xml, 'utf8');
  console.log(`[OK] XML Feed -> ${xmlPath} (${priceFiltered.length} listings, ${(fs.statSync(xmlPath).size / 1024).toFixed(1)} KB)`);

  // 2. Portal CSV
  const csvPath = path.join(OUT_DIR, 'propertyfinder-owners-full.csv');
  const MAX_PHOTOS = 8;
  const photoHeaders = Array.from({ length: MAX_PHOTOS }, (_, i) => `Photo URL ${i + 1}`);
  const csvHeaders = [
    'Reference', 'Category', 'Offering Type', 'Property Type',
    'Compound', 'Community / Zone', 'Price (EGP)', 'Rental Period',
    'Bedrooms', 'Bathrooms', 'Area (sqm)',
    ...photoHeaders,
    'All Photo URLs', 'Title (EN)', 'Description (EN)',
  ];
  const csvRows = [csvHeaders.join(',')];
  for (const unit of priceFiltered) {
    csvRows.push(buildCsvRow(unit, MAX_PHOTOS));
  }
  fs.writeFileSync(csvPath, '\uFEFF' + csvRows.join('\n'), 'utf8');
  console.log(`[OK] Portal CSV -> ${csvPath} (${priceFiltered.length} listings)`);

  // 3. Missing Photos Report
  const missingPath = path.join(OUT_DIR, 'propertyfinder-owners-missing-photos.csv');
  const missingHeaders = ['Reference', 'Type', 'Compound', 'Zone', 'Price (EGP)', 'Beds', 'Area', 'Owner Phone', 'Availability', 'Source'];
  const missingRows = [missingHeaders.join(',')];
  for (const u of missingPhotos) {
    missingRows.push([
      csvStr(u.ref),
      csvStr(u._type),
      csvStr(u.compound || ''),
      csvStr(u.zone || ''),
      u.price || '',
      u.beds || '',
      u.area || '',
      csvStr(u.phone || ''),
      csvStr(u.availability),
      csvStr(u.sourceHeritage.split('+')[0].trim()),
    ].join(','));
  }
  fs.writeFileSync(missingPath, '\uFEFF' + missingRows.join('\n'), 'utf8');
  console.log(`[OK] Missing Photos Report -> ${missingPath} (${missingPhotos.length} units need photos)`);

  // Final summary
  console.log('\n' + '-'.repeat(60));
  console.log('DONE -- Property Finder Owner Feed Published');
  console.log('-'.repeat(60));
  console.log(`  Total owners in workbook:         ${allUnits.length}`);
  console.log(`  Available:                        ${available.length}`);
  console.log(`  Publishable (compound + phone):   ${publishable.length}`);
  console.log(`  Meet PF price minimum:            ${priceFiltered.length}`);
  console.log(`  -> With photos (ready to submit): ${withPhotos.length}`);
  console.log(`  -> Missing photos (need harvest): ${missingPhotos.length}`);
  console.log(`\n  Upload CSV at:`);
  console.log(`  https://propertyfinder.eg/dashboard -> Listings -> Bulk Upload\n`);
}

function loadWorkbook() {
  if (!fs.existsSync(WORKBOOK)) {
    console.error(`ERROR: Workbook not found: ${WORKBOOK}`);
    process.exit(1);
  }
  return XLSX.readFile(WORKBOOK);
}

main().catch(err => { console.error(err); process.exit(1); });
