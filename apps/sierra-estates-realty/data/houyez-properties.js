/**
 * Houyez-Style Portal — data source
 * ────────────────────────────────────────────────────────────────────────────
 * Live real property data source loaded directly from Master Sheet / real-listings.json
 */

import realListingsRaw from './real-listings.json';




































































export const HOUEZ_SLIDES = [
  {
    pre: 'FIRST & ONLY WEBSITE IN EGYPT DESIGNED FOR NEW CAIRO',
    preAr: 'الموقع الأول والوحيد في مصر المصمم للقاهرة الجديدة',
    main: 'The First Exclusive Destination for New Cairo Properties. Rent & Resale.',
    mainAr: 'الوجهة الحصرية الأولى لعقارات القاهرة الجديدة. إيجار وبيع.',
    img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP76CY4E27V966J7YYMX90MC/e113c679-de81-4959-b267-f047ae007874.png',
  },
  {
    pre: 'BEST-IN-CLASS DESIGN',
    preAr: 'تصميم من الطراز الأول',
    main: 'Redefining Luxury Living with AI-Driven Excellence',
    mainAr: 'نعيد تعريف الفخامة بتميّز الذكاء الاصطناعي',
    img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP76CY4E27V966J7YYMX90MC/efec3122-5b62-4316-9b26-bfc867aa4f2f.png',
  },
  {
    pre: 'AI-DRIVEN EXCELLENCE',
    preAr: 'تميّز بالذكاء الاصطناعي',
    main: 'Smart Matches for Smart Investors',
    mainAr: 'توافق ذكي لمستثمرين أذكياء',
    img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP76CY4E27V966J7YYMX90MC/20b07938-a86f-41ca-8237-45b93453a357.png',
  },
];

export const HOUEZ_COMPOUNDS = [
  {
    name: 'Madinaty',
    nameAr: 'مدينتي',
    zone: 'Madinaty',
    zoneAr: 'مدينتي',
    count: 20,
    img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP76CY4E27V966J7YYMX90MC/2cacc107-6893-490c-8246-0f629609067d.png',
  },
  {
    name: 'Rehab',
    nameAr: 'الرحاب',
    zone: 'New Cairo',
    zoneAr: 'القاهرة الجديدة',
    count: 21,
    img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP76CY4E27V966J7YYMX90MC/e1523f6b-a0a9-4790-a949-7bc6fdbb5089.png',
  },
  {
    name: 'Fifth Square',
    nameAr: 'فيفت سكوير',
    zone: '5th Settlement',
    zoneAr: 'التجمع الخامس',
    count: 5,
    img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP77GHJWNY2C8HBCSBTEGVDF/ef76b440-f2ec-45f6-a124-4fdedd9f0677.png',
  },
  {
    name: 'Mivida',
    nameAr: 'ميفيدا',
    zone: '5th Settlement',
    zoneAr: 'التجمع الخامس',
    count: 3,
    img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP77GHJWNY2C8HBCSBTEGVDF/7fc0736a-1d9b-4e5f-bd52-bddc3d71d63e.png',
  },
];

export const HOUEZ_ROOMS = [
  {
    name: 'Luxury Living Room',
    nameAr: 'غرفة معيشة فاخرة',
    sub: 'Madinaty · Grand Apartment',
    subAr: 'مدينتي · شقة فاخرة',
    img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP77GHJWNY2C8HBCSBTEGVDF/0580d1af-258b-4410-919c-53e2b79eaaed.png',
  },
  {
    name: 'Master Bedroom Suite',
    nameAr: 'جناح غرفة النوم الرئيسية',
    sub: 'Fifth Square · Penthouse Level',
    subAr: 'فيفت سكوير · بنتهاوس',
    img: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/ea6baa0d-3795-4683-902c-da832de849d5.jpg',
  },
];

const ARABIC_TYPE_MAP = {
  'Apartment': 'شقة',
  'Villa': 'فيلا',
  'Twin House': 'توين هاوس',
  'Town House': 'تاون هاوس',
  'Townhouse': 'تاون هاوس',
  'Penthouse': 'بنتهاوس',
  'Duplex': 'دوبلكس',
};

export const HOUEZ_LISTINGS = (realListingsRaw ).map((l, i) => ({
  id: l.id || i + 1,
  code: l.code || `SE-REAL-${String(i + 1).padStart(3, '0')}`,
  cmp: l.compound || l.cmp || 'New Cairo',
  cmpAr: l.compound || l.cmp || 'القاهرة الجديدة',
  zone: l.zone || '5th Settlement',
  zoneAr: l.zone === 'Madinaty' ? 'مدينتي' : 'التجمع الخامس',
  type: (['Villa', 'Twin House', 'Apartment', 'Penthouse', 'Duplex'].includes(l.type) ? l.type : 'Apartment') ,
  typeAr: ARABIC_TYPE_MAP[l.type] || 'شقة',
  beds: l.beds || 3,
  bath: l.baths || 2,
  area: l.area || 150,
  egpM: typeof l.egpM === 'number' && !isNaN(l.egpM) ? l.egpM : 8.5,
  usd: l.usd || 1800,
  ai: l.aiScore || 9.0,
  tag: (l.tag === 'Verified Owner' ? 'Premium' : l.tag === 'Featured' ? 'Featured' : 'Smart Match') ,
  tagAr: l.tag === 'Verified Owner' ? 'مالك موثق' : 'مباشر',
  mode: l.mode === 'rent' ? 'rent' : 'sale',
  modeAr: l.mode === 'rent' ? 'إيجار' : 'بيع',
  agent: l.agent || 'Sierra Direct Advisor',
  agentAr: 'مستشار سييرا المباشر',
  ago: 'مزامنة حية',
  agoAr: 'مزامنة حية',
  img: l.img || 'https://static.shared.propertyfinder.eg/media/images/listing/01JP77GHJWNY2C8HBCSBTEGVDF/6ba25fcd-8de4-4ff3-8338-d1ba05752b9b.png',
}));

export const HOUEZ_SEARCH_TABS = [
  { id: 'buy', label: 'Buy', labelAr: 'شراء' },
  { id: 'rent', label: 'Rent', labelAr: 'إيجار' },
  { id: 'new', label: 'New Launches', labelAr: 'إطلاقات جديدة' },
] ;

export const HOUEZ_TYPE_FILTERS = [
  { id: 'all', label: 'All', labelAr: 'الكل' },
  { id: 'Villa', label: 'Villa', labelAr: 'فيلا' },
  { id: 'Apartment', label: 'Apartment', labelAr: 'شقة' },
  { id: 'Town', label: 'Town / Twin', labelAr: 'توين هاوس' },
  { id: 'Pent', label: 'Penthouse / Duplex', labelAr: 'بنتهاوس / دوبلكس' },
] ;

export const HOUEZ_MODE_FILTERS = [
  { id: 'all', label: 'All', labelAr: 'الكل' },
  { id: 'sale', label: 'For Sale', labelAr: 'للبيع' },
  { id: 'rent', label: 'For Rent', labelAr: 'للإيجار' },
] ;

export const HOUEZ_TOURS = [
  {
    title: '108 Central Street #3R — Somerville, MA',
    titleAr: '108 سنترال ستريت #3R — سومرفيل، ماساتشوستس',
    subtitle: '4 Bed · 1 Bath · 1300 sqft · Powder House Square',
    subtitleAr: '4 غرف نوم · 1 حمام · 1300 قدم² · باودر هاوس سكوير',
    src: 'https://listing3d.com/embed/r39d0bd4dde0a4fe693c7fe5fd230a896',
    poster: 'https://3dapartment.com/spheres/listing_preview/listing_preview_89476a3cf015e27b51.80462088.jpg',
    provider: 'listing3d',
    propertyCode: 'EXT-SMR-001',
    address: '108 Central Street #3R, Somerville, MA 02143',
    addressAr: '108 سنترال ستريت #3R، سومرفيل، ماساتشوستس 02143',
    order: 0,
    active: true,
  },
];
