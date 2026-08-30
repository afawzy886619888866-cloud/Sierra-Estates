export interface Compound {
  id: string;
  n: string;
  nameAr: string;
  z: string;
  zoneAr: string;
  lat: number;
  lng: number;
  saleM: number;
  rentUsd: number;
  unitsCount: number;
  img: string;
}

export interface Listing {
  id: string;
  code: string;
  title: string;
  titleAr?: string;
  compound: string;
  zone: string;
  type: string;
  beds: number;
  bath: number;
  area: number;
  priceEgp: number;
  priceUsd: number;
  img: string;
  mode: 'sale' | 'rent';
  featured?: boolean;
  tag?: string;
}

export const NEW_CAIRO_CENTER: [number, number] = [30.0131, 31.4913];

export const COMPOUNDS: Compound[] = [
  { id: 'mivida', n: 'Mivida', nameAr: 'ميفيدا', z: '5th Settlement', zoneAr: 'التجمع الخامس', lat: 30.0195, lng: 31.5122, saleM: 14.5, rentUsd: 2200, unitsCount: 48, img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80' },
  { id: 'hyde-park', n: 'Hyde Park', nameAr: 'هايد بارك', z: '5th Settlement', zoneAr: 'التجمع الخامس', lat: 30.0055, lng: 31.4950, saleM: 12.8, rentUsd: 1900, unitsCount: 62, img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
  { id: 'mountain-view-icity', n: 'Mountain View iCity', nameAr: 'ماونتن فيو آي سيتي', z: 'New Cairo', zoneAr: 'القاهرة الجديدة', lat: 30.0510, lng: 31.5450, saleM: 11.2, rentUsd: 1750, unitsCount: 54, img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80' },
  { id: 'uptown-cairo', n: 'Uptown Cairo', nameAr: 'أب تاون كايرو', z: 'Mokattam', zoneAr: 'المقطم', lat: 30.0320, lng: 31.3110, saleM: 22.0, rentUsd: 3500, unitsCount: 36, img: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80' },
  { id: 'madinaty', n: 'Madinaty', nameAr: 'مدينتي', z: 'New Cairo', zoneAr: 'القاهرة الجديدة', lat: 30.1200, lng: 31.6300, saleM: 8.5, rentUsd: 1200, unitsCount: 95, img: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80' },
  { id: 'eastown', n: 'Eastown', nameAr: 'إيست تاون', z: '5th Settlement', zoneAr: 'التجمع الخامس', lat: 30.0210, lng: 31.4720, saleM: 9.8, rentUsd: 1600, unitsCount: 42, img: 'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=800&q=80' },
  { id: 'cairo-plaza', n: 'Cairo Plaza', nameAr: 'كايرو بلازا', z: 'New Capital', zoneAr: 'العاصمة الإدارية', lat: 30.0280, lng: 31.6850, saleM: 16.5, rentUsd: 2600, unitsCount: 30, img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80' },
];

export const COMPOUND_IMGS: Record<string, string> = Object.fromEntries(
  COMPOUNDS.map((c) => [c.n, c.img])
);

export const SLIDES = [
  {
    img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=85',
    title: 'Luxury Living in New Cairo',
    titleAr: 'الحياة الفاخرة في القاهرة الجديدة',
    sub: 'Explore premier standalone villas and penthouses across Mivida & Hyde Park',
    subAr: 'اكتشف أرقى الفلل المستقلة والبنتاهاوس في ميفيدا وهايد بارك',
    tag: 'Featured · مميز',
    tagAr: 'مميز',
  },
  {
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85',
    title: 'High-Yield Property Investments',
    titleAr: 'استثمارات عقارية بعوائد استثنائية',
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
    title: 'Luxury Standalone Villa in Mivida',
    titleAr: 'فيلا مستقلة فاخرة في ميفيدا',
    compound: 'Mivida',
    zone: '5th Settlement',
    type: 'Villa',
    beds: 5,
    bath: 6,
    area: 420,
    priceEgp: 28500000,
    priceUsd: 590000,
    img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    mode: 'sale',
    featured: true,
    tag: 'Featured',
  },
  {
    id: 'prop-002',
    code: 'SE-HP-APT-002',
    title: 'Modern 3BR Apartment in Hyde Park',
    titleAr: 'شقة عصرية 3 غرف في هايد بارك',
    compound: 'Hyde Park',
    zone: '5th Settlement',
    type: 'Apartment',
    beds: 3,
    bath: 3,
    area: 195,
    priceEgp: 9800000,
    priceUsd: 205000,
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    mode: 'sale',
    featured: true,
    tag: 'Smart Match',
  },
  {
    id: 'prop-003',
    code: 'SE-MVI-TWN-003',
    title: 'Twin House with Private Garden in iCity',
    titleAr: 'توين هاوس بحديقة خاصة في آي سيتي',
    compound: 'Mountain View iCity',
    zone: 'New Cairo',
    type: 'Twin House',
    beds: 4,
    bath: 4,
    area: 280,
    priceEgp: 14200000,
    priceUsd: 295000,
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
        return data.listings;
      }
    }
  } catch {
    // fallback
  }
  return FALLBACK_LISTINGS.slice(0, limit);
}

export function priceLabel(price: number, mode: 'sale' | 'rent' = 'sale'): string {
  if (!price) return 'Contact for Price';
  if (mode === 'rent') {
    return `$${price.toLocaleString()}/mo`;
  }
  if (price >= 1_000_000) {
    return `EGP ${(price / 1_000_000).toFixed(1)}M`;
  }
  return `EGP ${price.toLocaleString()}`;
}
