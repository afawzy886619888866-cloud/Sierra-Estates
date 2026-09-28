// NOTE (Phase 4 / B3 + Master Rule 5): this module previously imported the
// 6.5 MB lib/inventory/snapshot.json — every client page importing HZDATA
// shipped the whole catalog in its JS bundle, and when the snapshot was
// empty (fresh clones) the code fell back to 8 hardcoded fictional listings
// with invented prices, agents and "Verified" tags. Both paths are gone.
// Static marketing content (slides, interiors, compound gazetteer) lives
// here; REAL unit data comes from /api/inventory (server-side, PII-stripped,
// cached) via lib/site/usePublicListings.ts.
import { COMPOUND_HERO_IMAGES } from '@/lib/site/luxury-images';

const EAST_CAIRO_TARGETS = [
  'Mivida', 'Hyde Park', 'Mountain View iCity', 'Eastown', 'Villette',
  'Palm Hills New Cairo', 'Katameya Heights', 'Katameya Dunes', 'Swan Lake Residence',
  'The Waterway', 'Fifth Square', 'Zed East', 'Cairo Festival City', 'Taj City',
  'Stone Residence', 'District 5', 'Madinaty', 'Al Rehab', 'Uptown Cairo',
  'Al Burouj', 'Sarai', 'STEI8HT', 'Bloomfields', 'The Brooks', 'El Patio Oro'
];
export { EAST_CAIRO_TARGETS };

// Curated listings are intentionally EMPTY: pages that need real units fetch
// them from /api/inventory (see usePublicListings). An empty array is the
// honest state — fabricating units, prices or agents violates Master Rule 5.
const defaultListings: any[] = [];

const DATA: any = {
  slides: [
    { id: 1, pre: 'FIRST & ONLY WEBSITE IN EGYPT DESIGNED FOR NEW CAIRO', preAr: 'الموقع الأول والوحيد في مصر المصمم للقاهرة الجديدة',
      main: 'The First Exclusive Destination for New Cairo Properties. Rent & Resale.', mainAr: 'الوجهة الحصرية الأولى لعقارات القاهرة الجديدة. إيجار وبيع.',
      img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP77GHJWNY2C8HBCSBTEGVDF/923d6dab-bffd-4e5c-9923-35820e94a017.png' },
    { id: 2,
      pre: 'INSTITUTIONAL COMMERCIAL OPPORTUNITY',
      preAr: 'فرصة استثمارية وتجارية استراتيجية كبرى',
      main: 'Directly in front of Al-Mataria Metro Station.',
      mainAr: 'مباشرة أمام محطة مترو المطرية.',
      sub: 'Explore current project evidence, interactive 3D massing textured with real on-site photography, and high-yield commercial investment schedules.',
      subAr: 'استعرض أدلة الموقع الحالي، والكتلة ثلاثية الأبعاد التفاعلية المزودة بملامس وصور حقيقية، وجدول الوحدات الاستثمارية.',
      img: '/cairo-plaza/real-facade-ai-enhanced.jpg',
      objectPosition: 'center 35%',
      href: '/cairo-plaza',
      badge: '⚡ TRANSIT-ORIENTED INVESTMENT · CAIRO PLAZA',
      badgeAr: '⚡ استثمار تجاري استراتيجي · كايرو بلازا',
      cta: 'Explore Cairo Plaza',
      ctaAr: 'استكشف مشروع كايرو بلازا',
    },
    { id: 3, pre: 'BEST-IN-CLASS DESIGN', preAr: 'تصميم من الطراز الأول',
      main: 'Redefining Luxury Living with AI-Driven Excellence', mainAr: 'نعيد تعريف الفخامة بتميّز الذكاء الاصطناعي',
      img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP77GHJWNY2C8HBCSBTEGVDF/3da658d2-4b56-4ee5-a902-6c2421843974.png' },
    { id: 4, pre: 'AI-DRIVEN EXCELLENCE', preAr: 'تميّز بالذكاء الاصطناعي',
      main: 'Smart Matches for Smart Investors', mainAr: 'توافق ذكي لمستثمرين أذكياء',
      img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP77GHJWNY2C8HBCSBTEGVDF/bad919ff-3bad-448b-a9bf-348700f0cd44.png' },
    { id: 5, pre: 'EXCLUSIVE NETWORK', preAr: 'شبكة حصرية',
      main: 'Unrivaled Access to Premium Compounds', mainAr: 'وصول لا يُضاهى لأرقى الكمبوندات',
      img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP77GHJWNY2C8HBCSBTEGVDF/44f4c24f-1939-4513-941e-bf3d3ba3b38f.png' },
    { id: 6, pre: 'CURATED PORTFOLIO', preAr: 'محفظة منتقاة',
      main: 'Your Journey to Exceptional Homes Begins Here', mainAr: 'رحلتك نحو منزل استثنائي تبدأ هنا',
      img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP77GHKVJJ8H7SA2PSZV90ZC/67b8d8c3-fcf7-4dbe-9b37-6097d2e2406f.png' }
  ],
  listings: defaultListings,
  rooms: [
    { id: 1, name: 'Luxury Living Room', sub: 'Hyde Park · Grand Villa · 5th Settlement', img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JPHC83FZAY1KW6V6A2CKS1EY/9affb65c-ef18-45c2-8531-41910d3075a7.png' },
    { id: 2, name: 'Master Bedroom Suite', sub: 'Mountain View iCity · Penthouse Level', img: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/2c95c5fc-df8c-4df8-bace-36a841c7608e.jpg' },
    { id: 3, name: 'Garden Courtyard', sub: 'Villette · Villa G-Type', img: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/9b78ec87-c3ea-426d-b077-cf8a4c324b4f.jpg' },
    { id: 4, name: 'Infinity Pool & Deck', sub: 'Taj City · Signature Villa', img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JPHC83FZAY1KW6V6A2CKS1EY/bd3e7ee1-9546-4794-b1cb-4e05c47487b6.png' },
    { id: 5, name: 'Rooftop Sky Terrace', sub: 'Uptown Cairo · Penthouse Level', img: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/7f683585-1602-4ae5-9001-d71057b1f0b9.jpg' }
  ],
  interiors: [
    'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/9bac59e7-15ad-4bff-b92b-e9c3e9e52e3a.jpg',
    'https://static.shared.propertyfinder.eg/media/images/listing/01K7ZDHACWGF5QC81WWK5WNPCZ/d9922c64-ad7f-4658-a127-79261b174d26.jpg',
    'https://static.shared.propertyfinder.eg/media/images/listing/01K7ZDHACWGF5QC81WWK5WNPCZ/5d674711-45b1-4ed0-bf78-b405ca364eba.jpg',
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP77GHKVJJ8H7SA2PSZV90ZC/4c18786e-a528-4e03-bb9b-82aec6edd556.png',
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP77GHKVJJ8H7SA2PSZV90ZC/aa6de84b-c6bf-4c5f-91a2-c4c239e7ca36.png'
  ],
  agentImg: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP77GHKVJJ8H7SA2PSZV90ZC/8aead01a-f6d9-44f1-8afa-02b9846ee61b.png',
  compounds: [
    { id: 1, n: 'Katameya Heights', c: [29.99, 31.48], g: '+10%', ai: 9.0, z: 'Katameya', priceM: 26, rent: 5000, dev: 'Katameya Group' },
    { id: 2, n: 'Katameya Dunes', c: [29.985, 31.492], g: '+12%', ai: 8.8, z: 'Katameya', priceM: 18, rent: 3400, dev: 'Katameya Group' },
    { id: 3, n: 'Swan Lake Residence', c: [30.045, 31.635], g: '+15%', ai: 8.9, z: '5th Settlement', priceM: 8.5, rent: 1700, dev: 'Hassan Allam' },
    { id: 4, n: 'Mivida', c: [30.007, 31.589], g: '+18%', ai: 9.1, z: '5th Settlement', priceM: 10.5, rent: 2100, dev: 'Emaar Misr' },
    { id: 5, n: 'Cairo Festival City', c: [30.016, 31.469], g: '+12%', ai: 8.7, z: 'New Cairo', priceM: 7.5, rent: 1500, dev: 'Al-Futtaim Group' },
    { id: 6, n: 'Hyde Park', c: [30.008, 31.645], g: '+22%', ai: 9.8, z: '5th Settlement', priceM: 28.5, rent: 5200, dev: 'Hyde Park Developments' },
    { id: 7, n: 'Taj City', c: [30.065, 31.531], g: '+19%', ai: 9.5, z: 'New Cairo', priceM: 35, rent: 6500, dev: 'MNHD' },
    { id: 8, n: 'Eastown', c: [30.018, 31.587], g: '+19%', ai: 9.0, z: '5th Settlement', priceM: 11.5, rent: 2400, dev: 'SODIC' },
    { id: 9, n: 'Mountain View iCity', c: [30.014, 31.618], g: '+24%', ai: 9.6, z: '5th Settlement', priceM: 22, rent: 3200, dev: 'Mountain View' },
    { id: 10, n: 'Zed East', c: [30.095, 31.61], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 8, rent: 1600, dev: 'Ora Developers' },
    { id: 11, n: 'Palm Hills New Cairo', c: [30.002, 31.608], g: '+21%', ai: 9.2, z: '5th Settlement', priceM: 25, rent: 4800, dev: 'Palm Hills' },
    { id: 12, n: 'The Waterway', c: [30.028, 31.612], g: '+14%', ai: 8.8, z: 'New Cairo', priceM: 12, rent: 2300, dev: 'The Waterway Developments' },
    { id: 13, n: 'Lake View Residence', c: [30.022, 31.532], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 9.5, rent: 1900, dev: 'El Hazek' },
    { id: 14, n: 'Fifth Square', c: [30.025, 31.578], g: '+17%', ai: 9.0, z: '5th Settlement', priceM: 8.5, rent: 1750, dev: 'Al Marasem' },
    { id: 15, n: 'Villette', c: [30.053, 31.598], g: '+20%', ai: 9.3, z: '5th Settlement', priceM: 24.5, rent: 4400, dev: 'SODIC' },
    { id: 16, n: 'Stone Residence', c: [30.028, 31.557], g: '+15%', ai: 8.8, z: 'New Cairo', priceM: 7.8, rent: 1550, dev: 'Rooya Group' },
    { id: 17, n: 'The Square', c: [30.033, 31.542], g: '+16%', ai: 8.9, z: 'New Cairo', priceM: 9, rent: 1800, dev: 'Al Ahly Sabbour' },
    { id: 18, n: 'El Patio Oro', c: [30.029, 31.56], g: '+15%', ai: 8.9, z: 'New Cairo', priceM: 10, rent: 2000, dev: 'La Vista' },
    { id: 19, n: 'El Patio 7', c: [30.035, 31.565], g: '+14%', ai: 8.8, z: 'New Cairo', priceM: 8.5, rent: 1700, dev: 'La Vista' },
    { id: 20, n: 'Katameya Gardens', c: [29.992, 31.488], g: '+11%', ai: 8.6, z: 'Katameya', priceM: 15, rent: 2800, dev: 'Katameya Group' },
    { id: 21, n: 'Village Gardens Katameya', c: [29.988, 31.484], g: '+11%', ai: 8.6, z: 'Katameya', priceM: 16, rent: 3000, dev: 'Katameya Group' },
    { id: 22, n: 'Galleria Moon Valley', c: [30.02, 31.55], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 7, rent: 1400, dev: 'Arabia Holding' },
    { id: 23, n: '90 Avenue', c: [30.028, 31.572], g: '+14%', ai: 8.8, z: '5th Settlement', priceM: 8, rent: 1600, dev: 'Tabarak' },
    { id: 24, n: 'Azzar New Cairo', c: [30.022, 31.568], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 7.5, rent: 1500, dev: 'Reedy Group' },
    { id: 25, n: 'District 5', c: [30.012, 31.5], g: '+16%', ai: 8.9, z: 'New Cairo', priceM: 9.5, rent: 1900, dev: 'Marakez' },
    { id: 26, n: 'The Brooks', c: [30.07, 31.57], g: '+17%', ai: 8.9, z: 'Mostakbal', priceM: 7, rent: 1400, dev: 'PRE' },
    { id: 27, n: 'STEI8HT', c: [30.075, 31.575], g: '+16%', ai: 8.8, z: 'Mostakbal', priceM: 6.5, rent: 1300, dev: 'LMD' },
    { id: 28, n: 'The Crest', c: [30.068, 31.562], g: '+15%', ai: 8.7, z: 'Mostakbal', priceM: 7.2, rent: 1450, dev: 'IL Cazar' },
    { id: 29, n: 'Azad & Azad Views', c: [30.078, 31.558], g: '+14%', ai: 8.6, z: 'Mostakbal', priceM: 6.8, rent: 1350, dev: 'Tameer' },
    { id: 30, n: 'Sarai', c: [30.005, 31.66], g: '+16%', ai: 9.0, z: 'Mostakbal', priceM: 9.5, rent: 1900, dev: 'MNHD' },
    { id: 31, n: 'Bloomfields', c: [30.06, 31.67], g: '+18%', ai: 9.1, z: 'Mostakbal', priceM: 8.5, rent: 1700, dev: 'Tatweer Misr' },
    { id: 32, n: 'Taj Sultan', c: [30.062, 31.535], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 8, rent: 1600, dev: 'MNHD' },
    { id: 33, n: 'La Mirada', c: [30.058, 31.685], g: '+14%', ai: 8.6, z: 'Mostakbal', priceM: 7, rent: 1400, dev: 'Inertia' },
    { id: 34, n: 'Aeon', c: [30.03, 31.58], g: '+15%', ai: 8.8, z: '5th Settlement', priceM: 8.2, rent: 1650, dev: 'Tabarak' },
    { id: 35, n: 'Mountain View Executive', c: [30.018, 31.61], g: '+20%', ai: 9.2, z: '5th Settlement', priceM: 18, rent: 3000, dev: 'Mountain View' },
    { id: 36, n: 'Hyde Park Phase 2', c: [30.012, 31.652], g: '+22%', ai: 9.6, z: '5th Settlement', priceM: 27, rent: 5000, dev: 'Hyde Park Developments' },
    { id: 37, n: 'Madinaty', c: [30.101, 31.664], g: '+15%', ai: 9.3, z: 'Madinaty', priceM: 12, rent: 2200, dev: 'TMG' },
    { id: 38, n: 'Al Rehab', c: [30.058, 31.514], g: '+14%', ai: 9.2, z: 'Al Rehab', priceM: 8.5, rent: 1600, dev: 'TMG' },
    { id: 39, n: 'Uptown Cairo', c: [30.011, 31.297], g: '+18%', ai: 9.5, z: 'Mokattam', priceM: 18.5, rent: 3800, dev: 'Emaar Misr' },
    { id: 40, n: 'Al Narges', c: [30.052, 31.47], g: '+12%', ai: 8.8, z: 'New Cairo', priceM: 10, rent: 1800, dev: 'New Cairo Prime' },
    { id: 41, n: 'Al Banafsaj', c: [30.045, 31.485], g: '+12%', ai: 8.8, z: 'New Cairo', priceM: 9.5, rent: 1750, dev: 'New Cairo Prime' },
    { id: 42, n: 'Al Andalus', c: [30.052, 31.49], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 8.8, rent: 1650, dev: 'New Cairo Prime' },
    { id: 43, n: 'South Academy', c: [30.005, 31.44], g: '+14%', ai: 8.9, z: 'New Cairo', priceM: 12.5, rent: 2200, dev: 'New Cairo Prime' },
    { id: 44, n: 'North 90th', c: [30.03, 31.47], g: '+16%', ai: 9.2, z: 'New Cairo', priceM: 14, rent: 2600, dev: 'North 90th Corridor' },
    { id: 45, n: 'Gardenia City', c: [30.082, 31.412], g: '+11%', ai: 8.5, z: 'New Cairo', priceM: 6.5, rent: 1300, dev: 'Al Ahly Sabbour' },
    { id: 46, n: 'El Shorouk City', c: [30.128, 31.62], g: '+11%', ai: 8.4, z: 'Shorouk', priceM: 6.5, rent: 1300, dev: 'Ministry of Housing' },
    { id: 47, n: 'El Shorouk Springs', c: [30.135, 31.615], g: '+12%', ai: 8.5, z: 'Shorouk', priceM: 7, rent: 1350, dev: 'El Shorouk Developments' },
    { id: 48, n: 'Al Burouj', c: [30.155, 31.63], g: '+18%', ai: 9.2, z: 'Shorouk', priceM: 13, rent: 2400, dev: 'Capital Group' },
    { id: 49, n: 'El Patio 5 East', c: [30.14, 31.6], g: '+14%', ai: 8.7, z: 'Shorouk', priceM: 8, rent: 1600, dev: 'La Vista' },
    { id: 50, n: 'Dar Misr El Shorouk', c: [30.132, 31.635], g: '+10%', ai: 8.3, z: 'Shorouk', priceM: 5.5, rent: 1150, dev: 'Ministry of Housing' },
    { id: 51, n: 'Green Square', c: [30.148, 31.61], g: '+15%', ai: 8.8, z: 'Shorouk', priceM: 8.8, rent: 1750, dev: 'Sabbour' },
    { id: 52, n: 'Mivida Parks', c: [30.003, 31.595], g: '+17%', ai: 9.0, z: '5th Settlement', priceM: 11, rent: 2200, dev: 'Emaar Misr' },
    { id: 53, n: 'Fifth Square Boulevard', c: [30.027, 31.582], g: '+16%', ai: 8.9, z: '5th Settlement', priceM: 9, rent: 1850, dev: 'Al Marasem' },
    { id: 54, n: 'Layan Residence', c: [30.01, 31.655], g: '+14%', ai: 8.7, z: 'Mostakbal', priceM: 7.5, rent: 1500, dev: 'MNHD' },
    { id: 55, n: 'Jayd', c: [30.045, 31.665], g: '+15%', ai: 8.8, z: 'Mostakbal', priceM: 8, rent: 1600, dev: 'IWAN' },
    { id: 56, n: 'Madinaty District 1', c: [30.108, 31.62], g: '+13%', ai: 8.8, z: 'Madinaty', priceM: 9, rent: 1600, dev: 'TMG' },
    { id: 57, n: 'Madinaty District 3', c: [30.098, 31.63], g: '+13%', ai: 8.7, z: 'Madinaty', priceM: 8.5, rent: 1550, dev: 'TMG' },
    { id: 58, n: 'Madinaty District 7', c: [30.09, 31.64], g: '+14%', ai: 8.9, z: 'Madinaty', priceM: 10, rent: 1800, dev: 'TMG' },
    { id: 59, n: 'Madinaty District 8', c: [30.102, 31.648], g: '+14%', ai: 8.9, z: 'Madinaty', priceM: 11, rent: 1900, dev: 'TMG' },
    { id: 60, n: 'Madinaty Executive Villas', c: [30.115, 31.635], g: '+17%', ai: 9.3, z: 'Madinaty', priceM: 24, rent: 4200, dev: 'TMG' },
    { id: 61, n: 'Madinaty Lake Park', c: [30.088, 31.655], g: '+16%', ai: 9.1, z: 'Madinaty', priceM: 15, rent: 2600, dev: 'TMG' },
    { id: 62, n: 'Cairo Plaza', c: [30.129, 31.312], g: '+28%', ai: 9.9, z: 'Al-Mataria Metro', priceM: 35, rent: 8500, dev: 'Commercial Transit' }
  ],
  // ═══ Arabic name map for compounds (used when site language = Arabic) ═══
  // Brand-name compounds keep transliteration; descriptive names translated.
  compoundNamesAr: {
    'Cairo Plaza': 'كايرو بلازا',
    'Katameya Heights': 'كاتاميا هايتس',
    'Katameya Dunes': 'كاتاميا ديونز',
    'Swan Lake Residence': 'سوان ليك ريزيدنس',
    'Mivida': 'ميفيدا',
    'Cairo Festival City': 'كايرو فيستيفال سيتي',
    'Cairo Festival City Residences': 'كايرو فيستيفال سيتي ريزيدنس',
    'Hyde Park': 'هايد بارك',
    'Hyde Park New Cairo': 'هايد بارك القاهرة الجديدة',
    'Taj City': 'تاج سيتي',
    'Eastown': 'إيستاون',
    'Eastown (SODIC)': 'إيستاون (سوديك)',
    'Mountain View iCity': 'ماونتن فيو آي سيتي',
    'Zed East': 'زد إيست',
    'Zed East (Ora)': 'زد إيست (أورا)',
    'Palm Hills New Cairo': 'بالم هيلز القاهرة الجديدة',
    'The Waterway': 'ذا ووتر واي',
    'Lake View Residence': 'ليك فيو ريزيدنس',
    'Fifth Square': 'فيفت سكوير',
    'Fifth Square (Al Marasem)': 'فيفت سكوير (المراسم)',
    'Villette': 'فيليت',
    'Villette (SODIC)': 'فيليت (سوديك)',
    'Stone Residence': 'ستون ريزيدنس',
    'Stone Residence (Rooya)': 'ستون ريزيدنس (روية)',
    'The Square': 'ذا سكوير',
    'The Square (Al Ahly Sabbour)': 'ذا سكوير (الأهلي صبور)',
    'El Patio Oro': 'إل باتيو أورو',
    'El Patio Oro (La Vista)': 'إل باتيو أورو (لا فيستا)',
    'El Patio 7': 'إل باتيو 7',
    'El Patio 7 (La Vista)': 'إل باتيو 7 (لا فيستا)',
    'Katameya Gardens': 'كاتاميا جاردنز',
    'Village Gardens Katameya': 'فيليدج جاردنز كاتاميا',
    'Galleria Moon Valley': 'جاليريا مون فالي',
    '90 Avenue': '90 أفينيو',
    '90 Avenue (Tabarak)': '90 أفينيو (تبارك)',
    'Azzar New Cairo': 'أزار القاهرة الجديدة',
    'District 5': 'ديستريكت 5',
    'District 5 (Marakez)': 'ديستريكت 5 (ماراكيز)',
    'The Brooks': 'ذا بروكس',
    'The Brooks (PRE)': 'ذا بروكس (بري)',
    'STEI8HT': 'ستييت',
    'STEI8HT (LMD)': 'ستييت (إل إم دي)',
    'The Crest': 'ذا كريست',
    'The Crest (IL Cazar)': 'ذا كريست (إل كازار)',
    'Azad & Azad Views': 'آزاد و آزاد فيوز',
    'Sarai': 'ساراي',
    'Sarai (MNHD)': 'ساراي (المهندسون)',
    'Bloomfields': 'بلومفيلدز',
    'Bloomfields (Tatweer Misr)': 'بلومفيلدز (تطوير مصر)',
    'Taj Sultan': 'تاج سلطان',
    'La Mirada': 'لا ميرادا',
    'La Mirada (Inertia)': 'لا ميرادا (إنيرشا)',
    'Aeon': 'إيون',
    'Aeon (Tabarak)': 'إيون (تبارك)',
    'Mountain View Executive': 'ماونتن فيو التنفيذي',
    'Hyde Park Phase 2': 'هايد بارك المرحلة 2',
    'Madinaty': 'مدينتي',
    'Al Rehab': 'الرحاب',
    'Uptown Cairo': 'أب تاون كايرو',
    'Al Narges': 'النرجس',
    'Al Banafsaj': 'البنفسج',
    'Al Andalus': 'الأندلس',
    'South Academy': 'جنوب الأكاديمية',
    'North 90th': 'التسعين الشمالي',
    'Gardenia City': 'جاردينيا سيتي',
    'Madinaty District 1': 'مدينتي الحي 1',
    'Madinaty District 3': 'مدينتي الحي 3',
    'Madinaty District 7': 'مدينتي الحي 7',
    'Madinaty District 8': 'مدينتي الحي 8',
    'Madinaty Executive Villas': 'مدينتي فلل إكزيكيوتيف',
    'Madinaty Lake Park': 'مدينتي ليك بارك',
    'El Shorouk City': 'مدينة الشروق',
    'El Shorouk Springs': 'الشروق سبرينغز',
    'Al Burouj': 'البروج',
    'Al Burouj (Capital Group)': 'البروج (كابيتال جروب)',
    'El Patio 5 East': 'إل باتيو 5 إيست',
    'El Patio 5 East (La Vista)': 'إل باتيو 5 إيست (لا فيستا)',
    'Dar Misr El Shorouk': 'دار مصر الشروق',
    'Green Square': 'جرين سكوير',
    'Green Square (Sabbour)': 'جرين سكوير (صبور)',
    'Mivida Parks': 'ميفيدا باركس',
    'Fifth Square Boulevard': 'فيفت سكوير بوليفارد',
    'Layan Residence': 'لايان ريزيدنس',
    'Layan Residence (MNHD)': 'لايان ريزيدنس (المهندسون)',
    'Jayd': 'جايد',
    'Jayd (IWAN)': 'جايد (إيوان)'
  },
  // Helper: get compound name in current language
  compoundName: function (name: any, lang: any) {
    if (lang === 'ar' && this.compoundNamesAr && this.compoundNamesAr[name]) {
      return this.compoundNamesAr[name];
    }
    return name;
  },
  // ═══ Featured compounds — these pulse/glow on the home page map ═══
  featured: ['Mivida', 'Hyde Park', 'Mountain View iCity', 'Eastown', 'Villette', 'Madinaty', 'Al Rehab', 'Taj City'],
  compoundImgs: COMPOUND_HERO_IMAGES,
  price: function (p: any) {
    return p.mode === 'rent' ? '$' + p.usd.toLocaleString() + '/mo' : 'EGP ' + p.egpM.toFixed(1) + 'M';
  }
};

(function (D: any) {
  'use strict';
  const cache: any = {};
  const IMGS = [
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP77GHKVJJ8H7SA2PSZV90ZC/4bd02668-0045-41fd-aa4a-509cd7cb4f0a.png',
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP77GHKVJJ8H7SA2PSZV90ZC/a2599019-6caa-4da5-bb70-540dcf392572.png',
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP7G1HG6HKMHT5G9X75RCJHR/dec69831-74c5-4401-b2f6-7f1f305e89cd.png',
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP7G1HG6HKMHT5G9X75RCJHR/45bf925e-1a3f-4274-935f-f50b87f45770.png',
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP7G1HG6HKMHT5G9X75RCJHR/741febaa-9d85-47be-9a26-7c5ac65a7b5d.png',
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP7G1HG6HKMHT5G9X75RCJHR/621e41a6-5e25-4ae7-a4dd-108d86d961dc.png',
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP7G1HG6HKMHT5G9X75RCJHR/eb5a3e8b-f9a0-4d9d-9a13-03d16fb1c28e.png',
    'https://static.shared.propertyfinder.eg/media/images/listing/01JP7G1HG6HKMHT5G9X75RCJHR/3b0d80fc-2001-475a-80d1-7921d0882f75.png'
  ];

  function cleanCpd(s: any) {
    return String(s || '')
      .toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/\b(new cairo|residence|residences|district \d+|phase \d+)\b/g, '')
      .trim();
  }

  D.unitsFor = function (name: any) {
    if (cache[name]) return cache[name];
    const target = cleanCpd(name);

    // Phase 4/B3: the snapshot no longer ships in the client bundle.
    // CompoundsPage passes live /api/inventory units first; when the live
    // fetch has no units for this compound the honest answer is an empty
    // list — the UI shows its \"request inventory\" state.
    const matched: any[] = [];

    // 2. No fabrication: if the catalog has no real units for this compound,
  //    return an empty list and let the UI show an honest "request inventory"
  //    state. Fabricating units/prices for a brokerage is a data-integrity bug.
    cache[name] = [];
    return [];
  };

  D.findListing = function (id: any) {
    if (!id) return null;
    const strId = String(id).trim().toLowerCase();
    // Phase 4/B3: snapshot-free. Real unit lookups go through
    // /api/listings/[id] (single-row, honest 404). The curated static list is
    // empty by design (anti-fabrication), so this only resolves ids that
    // genuinely exist in static curated content.
    return defaultListings.find(
      (x: any) => String(x.id).toLowerCase() === strId || String(x.code).toLowerCase() === strId
    ) || null;
  };
})(DATA);

export const HZDATA = DATA;
export type Listing = {
  id: number; code: string; cmp: string; zone: string; type: string;
  beds: number; bath: number; area: number; egpM: number; usd: number;
  ai: number; tag: string | null; mode: 'sale' | 'rent';
  agent: string; ago: string; img: string;
};
export type Compound = {
  id: number; n: string; z: string; priceM: number; rent: number; ai: number; c: [number, number]; g: string;
  [k: string]: any;
};
