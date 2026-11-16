/**
 * Houyez-Style Portal — data source
 * ────────────────────────────────────────────────────────────────────────────
 * Live real property data source loaded directly from Master Sheet / real-listings.json
 */

import realListingsRaw from './real-listings.json';

export interface HouyezSlide {
  pre: string;
  preAr: string;
  main: string;
  mainAr: string;
  img: string;
}

export interface HouyezCompound {
  name: string;
  nameAr: string;
  zone: string;
  zoneAr: string;
  count: number;
  img: string;
}

export interface HouyezRoom {
  name: string;
  nameAr: string;
  sub: string;
  subAr: string;
  img: string;
}

export interface HouyezTour {
  id?: string;
  title: string;
  titleAr: string;
  subtitle?: string;
  subtitleAr?: string;
  src: string;
  poster?: string;
  provider?: 'listing3d' | 'matterport' | 'kuula' | '3dvista' | 'p3d' | 'other';
  propertyCode?: string;
  address?: string;
  addressAr?: string;
  order: number;
  active: boolean;
}

export interface HouyezListing {
  id: number;
  code: string;
  cmp: string;
  cmpAr: string;
  zone: string;
  zoneAr: string;
  type: 'Villa' | 'Twin House' | 'Apartment' | 'Penthouse' | 'Duplex';
  typeAr: string;
  beds: number;
  bath: number;
  area: number;
  egpM: number;
  usd: number;
  ai: number;
  tag: 'Premium' | 'Featured' | 'Smart Match' | 'Exclusive' | 'New' | 'Best ROI' | null;
  tagAr: string | null;
  mode: 'sale' | 'rent';
  modeAr: string;
  agent: string;
  agentAr: string;
  ago: string;
  agoAr: string;
  img: string;
}

export const HOUEZ_SLIDES: HouyezSlide[] = [
  {
    pre: 'FIRST & ONLY WEBSITE IN EGYPT DESIGNED FOR NEW CAIRO',
    preAr: 'الموقع الأول والوحيد في مصر المصمم للقاهرة الجديدة',
    main: 'The First Exclusive Destination for New Cairo Properties. Rent & Resale.',
    mainAr: 'الوجهة الحصرية الأولى لعقارات القاهرة الجديدة. إيجار وبيع.',
    img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP76CY4E27V966J7YYMX90MC/84face7b-6b80-4646-a56c-0790d20e215f.png',
  },
  {
    pre: 'BEST-IN-CLASS DESIGN',
    preAr: 'تصميم من الطراز الأول',
    main: 'Redefining Luxury Living with AI-Driven Excellence',
    mainAr: 'نعيد تعريف الفخامة بتميّز الذكاء الاصطناعي',
    img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP76CY4E27V966J7YYMX90MC/acc6aa6b-aace-4590-a434-e45d040d1e57.png',
  },
  {
    pre: 'AI-DRIVEN EXCELLENCE',
    preAr: 'تميّز بالذكاء الاصطناعي',
    main: 'Smart Matches for Smart Investors',
    mainAr: 'توافق ذكي لمستثمرين أذكياء',
    img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP76CY4E27V966J7YYMX90MC/c1e39ec7-57c4-46e3-9863-04426ac760db.png',
  },
];

export const HOUEZ_COMPOUNDS: HouyezCompound[] = [
  {
    name: 'Madinaty',
    nameAr: 'مدينتي',
    zone: 'Madinaty',
    zoneAr: 'مدينتي',
    count: 20,
    img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP76CY4E27V966J7YYMX90MC/acd218c1-355a-4fae-96e5-e09d3ee69e47.png',
  },
  {
    name: 'Rehab',
    nameAr: 'الرحاب',
    zone: 'New Cairo',
    zoneAr: 'القاهرة الجديدة',
    count: 21,
    img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP76CY4E27V966J7YYMX90MC/d541304e-a0d4-4585-ac62-451024352fe8.png',
  },
  {
    name: 'Fifth Square',
    nameAr: 'فيفت سكوير',
    zone: '5th Settlement',
    zoneAr: 'التجمع الخامس',
    count: 5,
    img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP76CY4E27V966J7YYMX90MC/0f0f5b0e-5a2a-4d7f-b0a6-975eb486ac57.png',
  },
  {
    name: 'Mivida',
    nameAr: 'ميفيدا',
    zone: '5th Settlement',
    zoneAr: 'التجمع الخامس',
    count: 3,
    img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP76CY4E27V966J7YYMX90MC/df8355a3-80e0-46ca-9561-cebe247a1614.png',
  },
];

export const HOUEZ_ROOMS: HouyezRoom[] = [
  {
    name: 'Luxury Living Room',
    nameAr: 'غرفة معيشة فاخرة',
    sub: 'Madinaty · Grand Apartment',
    subAr: 'مدينتي · شقة فاخرة',
    img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP76CY4E27V966J7YYMX90MC/0ff12ce0-70f0-4f8e-b672-920340f0df79.png',
  },
  {
    name: 'Master Bedroom Suite',
    nameAr: 'جناح غرفة النوم الرئيسية',
    sub: 'Fifth Square · Penthouse Level',
    subAr: 'فيفت سكوير · بنتهاوس',
    img: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/57b77b4f-f2e6-4cb5-ac0c-c62d9acfffc3.jpg',
  },
];

const ARABIC_TYPE_MAP: Record<string, string> = {
  'Apartment': 'شقة',
  'Villa': 'فيلا',
  'Twin House': 'توين هاوس',
  'Town House': 'تاون هاوس',
  'Townhouse': 'تاون هاوس',
  'Penthouse': 'بنتهاوس',
  'Duplex': 'دوبلكس',
};

export const HOUEZ_LISTINGS: HouyezListing[] = (realListingsRaw as any[]).map((l, i) => ({
  id: l.id || i + 1,
  code: l.code || `SE-REAL-${String(i + 1).padStart(3, '0')}`,
  cmp: l.compound || l.cmp || 'New Cairo',
  cmpAr: l.compound || l.cmp || 'القاهرة الجديدة',
  zone: l.zone || '5th Settlement',
  zoneAr: l.zone === 'Madinaty' ? 'مدينتي' : 'التجمع الخامس',
  type: (['Villa', 'Twin House', 'Apartment', 'Penthouse', 'Duplex'].includes(l.type) ? l.type : 'Apartment') as any,
  typeAr: ARABIC_TYPE_MAP[l.type] || 'شقة',
  beds: l.beds || 3,
  bath: l.baths || 2,
  area: l.area || 150,
  egpM: typeof l.egpM === 'number' && !isNaN(l.egpM) ? l.egpM : 8.5,
  usd: l.usd || 1800,
  ai: l.aiScore || 9.0,
  tag: (l.tag === 'Verified Owner' ? 'Premium' : l.tag === 'Featured' ? 'Featured' : 'Smart Match') as any,
  tagAr: l.tag === 'Verified Owner' ? 'مالك موثق' : 'مباشر',
  mode: l.mode === 'rent' ? 'rent' : 'sale',
  modeAr: l.mode === 'rent' ? 'إيجار' : 'بيع',
  agent: l.agent || 'Sierra Direct Advisor',
  agentAr: 'مستشار سييرا المباشر',
  ago: 'مزامنة حية',
  agoAr: 'مزامنة حية',
  img: l.img || 'https://static.shared.propertyfinder.eg/media/images/listing/01JP76CY4E27V966J7YYMX90MC/8f87b03a-7f19-4ce5-ae79-8e06c6aa62ee.png',
}));

export const HOUEZ_SEARCH_TABS = [
  { id: 'buy', label: 'Buy', labelAr: 'شراء' },
  { id: 'rent', label: 'Rent', labelAr: 'إيجار' },
  { id: 'new', label: 'New Launches', labelAr: 'إطلاقات جديدة' },
] as const;

export const HOUEZ_TYPE_FILTERS = [
  { id: 'all', label: 'All', labelAr: 'الكل' },
  { id: 'Villa', label: 'Villa', labelAr: 'فيلا' },
  { id: 'Apartment', label: 'Apartment', labelAr: 'شقة' },
  { id: 'Town', label: 'Town / Twin', labelAr: 'توين هاوس' },
  { id: 'Pent', label: 'Penthouse / Duplex', labelAr: 'بنتهاوس / دوبلكس' },
] as const;

export const HOUEZ_MODE_FILTERS = [
  { id: 'all', label: 'All', labelAr: 'الكل' },
  { id: 'sale', label: 'For Sale', labelAr: 'للبيع' },
  { id: 'rent', label: 'For Rent', labelAr: 'للإيجار' },
] as const;

export const HOUEZ_TOURS: HouyezTour[] = [
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
