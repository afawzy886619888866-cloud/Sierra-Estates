export interface Compound {
  id: string;
  n: string;
  nameAr: string;
  z: string;
  zoneAr: string;
  lat: number;
  lng: number;
  priceM: number;
  rent: number;
  saleM: number;
  rentUsd: number;
  g: string;
  ai: number;
  c: string;
  units: number;
  unitsCount: number;
  img: string;
}

export interface Listing {
  id: string;
  code: string;
  cmp: string;
  compound: string;
  title: string;
  titleAr?: string;
  zone: string;
  type: string;
  beds: number;
  bath: number;
  area: number;
  priceEgp: number;
  priceUsd: number;
  price: number;
  ai: number;
  agent?: string;
  ago?: string;
  img: string;
  mode: 'sale' | 'rent';
  featured?: boolean;
  tag?: string;
}

export const NEW_CAIRO_CENTER: [number, number] = [30.0131, 31.4913];

export const COMPOUNDS: Compound[] = [
  {
    id: 'mivida',
    n: 'Mivida',
    nameAr: 'ميفيدا',
    z: '5th Settlement',
    zoneAr: 'التجمع الخامس',
    lat: 30.0195,
    lng: 31.5122,
    priceM: 14.5,
    rent: 2200,
    saleM: 14.5,
    rentUsd: 2200,
    g: '+18%',
    ai: 9.6,
    c: '#00AEFF',
    units: 48,
    unitsCount: 48,
    img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'hyde-park',
    n: 'Hyde Park',
    nameAr: 'هايد بارك',
    z: '5th Settlement',
    zoneAr: 'التجمع الخامس',
    lat: 30.0055,
    lng: 31.4950,
    priceM: 12.8,
    rent: 1900,
    saleM: 12.8,
    rentUsd: 1900,
    g: '+15%',
    ai: 9.3,
    c: '#5FC9FF',
    units: 62,
    unitsCount: 62,
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'mountain-view-icity',
    n: 'Mountain View iCity',
    nameAr: 'ماونتن فيو آي سيتي',
    z: 'New Cairo',
    zoneAr: 'القاهرة الجديدة',
    lat: 30.0510,
    lng: 31.5450,
    priceM: 11.2,
    rent: 1750,
    saleM: 11.2,
    rentUsd: 1750,
    g: '+14%',
    ai: 9.1,
    c: '#34D399',
    units: 54,
    unitsCount: 54,
    img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'uptown-cairo',
    n: 'Uptown Cairo',
    nameAr: 'أب تاون كايرو',
    z: 'Mokattam',
    zoneAr: 'المقطم',
    lat: 30.0320,
    lng: 31.3110,
    priceM: 22.0,
    rent: 3500,
    saleM: 22.0,
    rentUsd: 3500,
    g: '+21%',
    ai: 9.8,
    c: '#D4AF37',
    units: 36,
    unitsCount: 36,
    img: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'madinaty',
    n: 'Madinaty',
    nameAr: 'مدينتي',
    z: 'New Cairo',
    zoneAr: 'القاهرة الجديدة',
    lat: 30.1200,
    lng: 31.6300,
    priceM: 8.5,
    rent: 1200,
    saleM: 8.5,
    rentUsd: 1200,
    g: '+12%',
    ai: 8.9,
    c: '#7C3AED',
    units: 95,
    unitsCount: 95,
    img: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'eastown',
    n: 'Eastown',
    nameAr: 'إيست تاون',
    z: '5th Settlement',
    zoneAr: 'التجمع الخامس',
    lat: 30.0210,
    lng: 31.4720,
    priceM: 9.8,
    rent: 1600,
    saleM: 9.8,
    rentUsd: 1600,
    g: '+13%',
    ai: 9.0,
    c: '#E63946',
    units: 42,
    unitsCount: 42,
    img: 'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'cairo-plaza',
    n: 'Cairo Plaza',
    nameAr: 'كايرو بلازا',
    z: 'New Capital',
    zoneAr: 'العاصمة الإدارية',
    lat: 30.0280,
    lng: 31.6850,
    priceM: 16.5,
    rent: 2600,
    saleM: 16.5,
    rentUsd: 2600,
    g: '+22%',
    ai: 9.7,
    c: '#00AEFF',
    units: 30,
    unitsCount: 30,
    img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
  },
];

export const COMPOUND_IMGS: Record<string, string> = Object.fromEntries(
  COMPOUNDS.map((c) => [c.n, c.img])
);

export const SLIDES = [
  {
    img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=85',
    title: 'Luxury Living in New Cairo',
    titleAr: 'الحياة الفاخرة في القاهرة الجديدة',
    main: 'Luxury Living in New Cairo',
    mainAr: 'الحياة الفاخرة في القاهرة الجديدة',
    pre: 'Exclusive Portfolio · محفظة حصرية',
    preAr: 'محفظة حصرية',
    sub: 'Explore premier standalone villas and penthouses across Mivida & Hyde Park',
    subAr: 'اكتشف أرقى الفلل المستقلة والبنتاهاوس في ميفيدا وهايد بارك',
    tag: 'Featured · مميز',
    tagAr: 'مميز',
  },
  {
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85',
    title: 'High-Yield Property Investments',
    titleAr: 'استثمارات عقارية بعوائد استثنائية',
    main: 'High-Yield Property Investments',
    mainAr: 'استثمارات عقارية بعوائد استثنائية',
    pre: 'Prime Capital Growth · نمو رأس المال',
    preAr: 'نمو رأس المال',
    sub: 'Verified contracts with up to 18% annual capital appreciation',
    subAr: 'عقود موثقة بعوائد استثمارية تصل إلى 18% سنوياً',
    tag: 'Investment · استثمار',
    tagAr: 'استثمار',
  },
];

export const FALLBACK_LISTINGS: Listing[] = [
  {
    id: 'prop-001',
    code: 'SE-MVD-VLA-001',
    cmp: 'Mivida',
    compound: 'Mivida',
    title: 'Luxury Standalone Villa in Mivida',
    titleAr: 'فيلا مستقلة فاخرة في ميفيدا',
    zone: '5th Settlement',
    type: 'Villa',
    beds: 5,
    bath: 6,
    area: 420,
    priceEgp: 28500000,
    priceUsd: 590000,
    price: 28500000,
    ai: 9.7,
    agent: 'Sierra Private Office',
    ago: 'Just listed',
    img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    mode: 'sale',
    featured: true,
    tag: 'Featured',
  },
  {
    id: 'prop-002',
    code: 'SE-HP-APT-002',
    cmp: 'Hyde Park',
    compound: 'Hyde Park',
    title: 'Modern 3BR Apartment in Hyde Park',
    titleAr: 'شقة عصرية 3 غرف في هايد بارك',
    zone: '5th Settlement',
    type: 'Apartment',
    beds: 3,
    bath: 3,
    area: 195,
    priceEgp: 9800000,
    priceUsd: 205000,
    price: 9800000,
    ai: 9.4,
    agent: 'Sierra Client Services',
    ago: '1d ago',
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    mode: 'sale',
    featured: true,
    tag: 'Smart Match',
  },
  {
    id: 'prop-003',
    code: 'SE-MVI-TWN-003',
    cmp: 'Mountain View iCity',
    compound: 'Mountain View iCity',
    title: 'Twin House with Private Garden in iCity',
    titleAr: 'توين هاوس بحديقة خاصة في آي سيتي',
    zone: 'New Cairo',
    type: 'Twin House',
    beds: 4,
    bath: 4,
    area: 280,
    priceEgp: 14200000,
    priceUsd: 295000,
    price: 14200000,
    ai: 9.2,
    agent: 'Sierra Advisory',
    ago: '3d ago',
    img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
    mode: 'sale',
    featured: false,
  },
];

export async function fetchListings(limit = 12): Promise<Listing[]> {
  try {
    const res = await fetch(`/api/listings?limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.listings) && data.listings.length > 0) {
        return data.listings.map((l: any) => ({
          ...l,
          cmp: l.cmp || l.compound || '',
          price: l.price || l.priceEgp || 0,
          ai: l.ai || l.aiScore || 9.0,
        }));
      }
    }
  } catch {
    // fallback
  }
  return FALLBACK_LISTINGS.slice(0, limit);
}

export function priceLabel(itemOrPrice: Listing | number, mode: 'sale' | 'rent' = 'sale'): string {
  const num = typeof itemOrPrice === 'number' ? itemOrPrice : itemOrPrice.price || itemOrPrice.priceEgp;
  if (!num) return 'Contact for Price';
  if (mode === 'rent') {
    return `$${num.toLocaleString()}/mo`;
  }
  if (num >= 1_000_000) {
    return `EGP ${(num / 1_000_000).toFixed(1)}M`;
  }
  return `EGP ${num.toLocaleString()}`;
}
