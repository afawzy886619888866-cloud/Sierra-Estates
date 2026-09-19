/**
 * Sierra Estates — client portal data + i18n
 * Ported from the owner-approved ui_kits/houzez-portal/data.js + shared.js I18N.
 * The `listings`/`compounds` arrays are the LOCAL FALLBACK; live data is read
 * from /api/listings at runtime (see fetchListings).
 */

export interface Listing {
  id: number | string;
  code: string;
  cmp: string;
  zone: string;
  type: string;
  beds: number;
  bath: number;
  area: number;
  egpM: number;
  usd: number;
  ai: number;
  tag: string | null;
  mode: 'sale' | 'rent';
  agent: string;
  ago: string;
  img: string;
  vrAvailable?: boolean;
  vrLink?: string;
}

export interface Compound {
  n: string;
  g: string;
  ai: number;
  z: string;
  priceM: number;
  rent: number;
  /** [lat, lng] — ported from ui_kits/houzez-portal/data.js, used by the live Leaflet map. */
  c: [number, number];
}

export interface Slide {
  pre: string;
  preAr: string;
  main: string;
  mainAr: string;
  img: string;
}

export const SLIDES: Slide[] = [
  { pre: 'FIRST & ONLY WEBSITE IN EGYPT DESIGNED FOR NEW CAIRO', preAr: 'الموقع الأول والوحيد في مصر المصمم للقاهرة الجديدة', main: 'The First Exclusive Destination for New Cairo Properties. Rent & Resale.', mainAr: 'الوجهة الحصرية الأولى لعقارات القاهرة الجديدة. إيجار وبيع.', img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d539110a-ed1e-11ef-9c46-0a0bf5daed27-444bac18-0e72-47ac-9e7c-b8445ddbf6b3.png' },
  { pre: 'BEST-IN-CLASS DESIGN', preAr: 'تصميم من الطراز الأول', main: 'Redefining Luxury Living with AI-Driven Excellence', mainAr: 'نعيد تعريف الفخامة بتميّز الذكاء الاصطناعي', img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d796604f-ed1e-11ef-9c46-0a0bf5daed27-28f981b4-652b-4b2a-9f6b-247979184e07.png' },
  { pre: 'AI-DRIVEN EXCELLENCE', preAr: 'تميّز بالذكاء الاصطناعي', main: 'Smart Matches for Smart Investors', mainAr: 'توافق ذكي لمستثمرين أذكياء', img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d8282b21-ed1e-11ef-9c46-0a0bf5daed27-9748ae3e-4be8-4af8-9809-a082356333b8.png' },
  { pre: 'EXCLUSIVE NETWORK', preAr: 'شبكة حصرية', main: 'Unrivaled Access to Premium Compounds', mainAr: 'وصول لا يُضاهى لأرقى الكمبوندات', img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d8b70cdc-ed1e-11ef-9c46-0a0bf5daed27-16749c88-9c47-471b-91a0-37841318e1a8.png' },
  { pre: 'CURATED PORTFOLIO', preAr: 'محفظة منتقاة', main: 'Your Journey to Exceptional Homes Begins Here', mainAr: 'رحلتك نحو منزل استثنائي تبدأ هنا', img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d9354a6b-ed1e-11ef-9c46-0a0bf5daed27-4df385b4-7b6f-402c-84b8-ebded43f4525.png' },
];

export const FALLBACK_LISTINGS: Listing[] = [
  { id: 1, code: 'HP-VL-01', cmp: 'Hyde Park', zone: '5th Settlement', type: 'Villa', beds: 5, bath: 5, area: 480, egpM: 28.5, usd: 5200, ai: 9.8, tag: 'Premium', mode: 'sale', agent: 'Layla Mansour', ago: '2d ago', img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d539110a-ed1e-11ef-9c46-0a0bf5daed27-444bac18-0e72-47ac-9e7c-b8445ddbf6b3.png' },
  { id: 2, code: 'MVW-TH-02', cmp: 'Mountain View iCity', zone: '5th Settlement', type: 'Twin House', beds: 4, bath: 3, area: 280, egpM: 15.5, usd: 2400, ai: 9.6, tag: 'Featured', mode: 'sale', agent: 'Karim Fahmy', ago: '5h ago', img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5MNEX4J4DW9KD582MYGDH/02946d1e-a358-4e06-ae53-80ea1a458d23-90c501ae-c777-46c9-8f5f-4cdf5472eac6.png' },
  { id: 3, code: 'MV-AP-03', cmp: 'Mivida', zone: '5th Settlement', type: 'Apartment', beds: 3, bath: 2, area: 145, egpM: 6.8, usd: 1650, ai: 9.1, tag: 'Smart Match', mode: 'rent', agent: 'Nour Saleh', ago: '1d ago', img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/00032040-ed1f-11ef-b066-0a1a96148fff-cca2e67e-f73e-4d13-808e-8b41ec505723.png' },
  { id: 4, code: 'UPC-PH-04', cmp: 'Uptown Cairo', zone: 'Mokattam', type: 'Penthouse', beds: 4, bath: 3, area: 300, egpM: 18.5, usd: 3800, ai: 9.5, tag: 'Exclusive', mode: 'sale', agent: 'Omar Magdy', ago: '6h ago', img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d796604f-ed1e-11ef-9c46-0a0bf5daed27-28f981b4-652b-4b2a-9f6b-247979184e07.png' },
  { id: 5, code: 'TAJ-VL-05', cmp: 'Taj City', zone: 'New Cairo', type: 'Villa', beds: 5, bath: 5, area: 500, egpM: 35.0, usd: 6500, ai: 9.5, tag: 'Premium', mode: 'sale', agent: 'Yara Hakim', ago: '4d ago', img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d8282b21-ed1e-11ef-9c46-0a0bf5daed27-9748ae3e-4be8-4af8-9809-a082356333b8.png' },
  { id: 6, code: 'VLT-VL-06', cmp: 'Villette', zone: '5th Settlement', type: 'Villa', beds: 4, bath: 4, area: 390, egpM: 24.5, usd: 4400, ai: 9.3, tag: 'New', mode: 'sale', agent: 'Rana Adel', ago: '3d ago', img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d8b70cdc-ed1e-11ef-9c46-0a0bf5daed27-16749c88-9c47-471b-91a0-37841318e1a8.png' },
  { id: 7, code: 'PH-VL-07', cmp: 'Palm Hills NC', zone: '5th Settlement', type: 'Villa', beds: 4, bath: 3, area: 380, egpM: 23.5, usd: 4200, ai: 9.2, tag: 'Best ROI', mode: 'sale', agent: 'Layla Mansour', ago: '1w ago', img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d9354a6b-ed1e-11ef-9c46-0a0bf5daed27-4df385b4-7b6f-402c-84b8-ebded43f4525.png' },
  { id: 8, code: 'EST-DX-08', cmp: 'Eastown', zone: '5th Settlement', type: 'Duplex', beds: 3, bath: 2, area: 220, egpM: 11.5, usd: 2400, ai: 9.1, tag: null, mode: 'rent', agent: 'Karim Fahmy', ago: '2d ago', img: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5A49GPYEBFPCP9JEJ8CF5/d883547f-ed1e-11ef-9b9a-0a6e1f0e9817-ff8db1b7-0f81-4f8b-b89f-c5daa6ce38b5.png' },
];

export const COMPOUNDS: Compound[] = [
  { n: 'Katameya Heights', g: '+10%', ai: 9.0, z: 'Katameya', priceM: 26, rent: 5000, c: [29.99, 31.48] },
  { n: 'Katameya Dunes', g: '+12%', ai: 8.8, z: 'Katameya', priceM: 18, rent: 3400, c: [29.985, 31.492] },
  { n: 'Swan Lake Residence', g: '+15%', ai: 8.9, z: '5th Settlement', priceM: 8.5, rent: 1700, c: [30.045, 31.635] },
  { n: 'Mivida', g: '+18%', ai: 9.1, z: '5th Settlement', priceM: 10.5, rent: 2100, c: [30.007, 31.589] },
  { n: 'Cairo Festival City Residences', g: '+12%', ai: 8.7, z: 'New Cairo', priceM: 7.5, rent: 1500, c: [30.016, 31.469] },
  { n: 'Hyde Park New Cairo', g: '+22%', ai: 9.8, z: '5th Settlement', priceM: 28.5, rent: 5200, c: [30.008, 31.645] },
  { n: 'Taj City', g: '+19%', ai: 9.5, z: 'New Cairo', priceM: 35, rent: 6500, c: [30.065, 31.531] },
  { n: 'Eastown (SODIC)', g: '+19%', ai: 9.0, z: '5th Settlement', priceM: 11.5, rent: 2400, c: [30.018, 31.587] },
  { n: 'Mountain View iCity', g: '+24%', ai: 9.6, z: '5th Settlement', priceM: 22, rent: 3200, c: [30.014, 31.618] },
  { n: 'Zed East (Ora)', g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 8, rent: 1600, c: [30.095, 31.61] },
  { n: 'Palm Hills New Cairo', g: '+21%', ai: 9.2, z: '5th Settlement', priceM: 25, rent: 4800, c: [30.002, 31.608] },
  { n: 'The Waterway', g: '+14%', ai: 8.8, z: 'New Cairo', priceM: 12, rent: 2300, c: [30.04, 31.47] },
  { n: 'Lake View Residence', g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 9.5, rent: 1900, c: [30.022, 31.532] },
  { n: 'Fifth Square (Al Marasem)', g: '+17%', ai: 9.0, z: '5th Settlement', priceM: 8.5, rent: 1750, c: [30.025, 31.578] },
  { n: 'Villette (SODIC)', g: '+20%', ai: 9.3, z: '5th Settlement', priceM: 24.5, rent: 4400, c: [30.053, 31.598] },
  { n: 'Stone Residence (Rooya)', g: '+15%', ai: 8.8, z: 'New Cairo', priceM: 7.8, rent: 1550, c: [30.028, 31.557] },
  { n: 'The Square (Al Ahly Sabbour)', g: '+16%', ai: 8.9, z: 'New Cairo', priceM: 9, rent: 1800, c: [30.033, 31.542] },
  { n: 'El Patio Oro (La Vista)', g: '+15%', ai: 8.9, z: 'New Cairo', priceM: 10, rent: 2000, c: [30.029, 31.56] },
  { n: 'El Patio 7 (La Vista)', g: '+14%', ai: 8.8, z: 'New Cairo', priceM: 8.5, rent: 1700, c: [30.035, 31.565] },
  { n: 'Katameya Gardens', g: '+11%', ai: 8.6, z: 'Katameya', priceM: 15, rent: 2800, c: [29.992, 31.488] },
  { n: 'Village Gardens Katameya', g: '+11%', ai: 8.6, z: 'Katameya', priceM: 16, rent: 3000, c: [29.988, 31.484] },
  { n: 'Galleria Moon Valley', g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 7, rent: 1400, c: [30.02, 31.55] },
  { n: '90 Avenue (Tabarak)', g: '+14%', ai: 8.8, z: '5th Settlement', priceM: 8, rent: 1600, c: [30.028, 31.572] },
  { n: 'Azzar New Cairo', g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 7.5, rent: 1500, c: [30.022, 31.568] },
  { n: 'District 5 (Marakez)', g: '+16%', ai: 8.9, z: 'New Cairo', priceM: 9.5, rent: 1900, c: [30.012, 31.5] },
  { n: 'The Brooks (PRE)', g: '+17%', ai: 8.9, z: 'Mostakbal', priceM: 7, rent: 1400, c: [30.07, 31.57] },
  { n: 'STEI8HT (LMD)', g: '+16%', ai: 8.8, z: 'Mostakbal', priceM: 6.5, rent: 1300, c: [30.075, 31.575] },
  { n: 'The Crest (IL Cazar)', g: '+15%', ai: 8.7, z: 'Mostakbal', priceM: 7.2, rent: 1450, c: [30.068, 31.562] },
  { n: 'Azad & Azad Views', g: '+14%', ai: 8.6, z: 'Mostakbal', priceM: 6.8, rent: 1350, c: [30.078, 31.558] },
];

/** Compound name → [lat, lng], for the property mini-map (falls back to New Cairo centroid). */
export const NEW_CAIRO_CENTER: [number, number] = [30.03, 31.55];
export function compoundCoords(name: string): [number, number] {
  const hit = COMPOUNDS.find((c) => c.n === name || c.n.startsWith(name) || name.startsWith(c.n.split(' (')[0]));
  return hit ? hit.c : NEW_CAIRO_CENTER;
}

export const COMPOUND_IMGS: Record<string, string> = {
  'Hyde Park New Cairo': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/f9c6f75c-ed1e-11ef-b066-0a1a96148fff-7f5d3e7a-fd4f-4710-9db6-c9fe70a4adef.png',
  'Mivida': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/00d560b9-ed1f-11ef-b066-0a1a96148fff-0342d319-053c-4213-8af3-28cda4164bec.png',
  'Mountain View iCity': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/01b3fbda-ed1f-11ef-b066-0a1a96148fff-2c9f9c3c-0eea-4e48-9a5e-b475706da985.png',
  'Eastown (SODIC)': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/f8bb6cea-ed1e-11ef-b066-0a1a96148fff-91801f7d-f0ad-4380-9ca0-ef0c72bc4d5d.png',
  'Taj City': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/02f75127-ed1f-11ef-b066-0a1a96148fff-05d8f38a-ed39-4a26-af33-abdee38c8831.png',
  'Villette (SODIC)': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/fd5df6a8-ed1e-11ef-b066-0a1a96148fff-e0643187-d1df-4be6-ab5e-16f9d1dd9a2e.png',
  'Palm Hills New Cairo': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/fadfc7b5-ed1e-11ef-b066-0a1a96148fff-b4c7f95d-284c-411b-9294-2d16b9d21fc5.png',
  'Katameya Heights': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/fe1e45e7-ed1e-11ef-b066-0a1a96148fff-13fd30e4-77da-4a77-8a87-64b404dc5b65.png',
};

export const INTERIORS = [
  'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/f6be1cb2-ed1e-11ef-b066-0a1a96148fff-6b11b065-7803-42f7-bb82-6b56e277f3c4.png',
  'https://static.shared.propertyfinder.eg/media/images/listing/01JMGA94NXVF25Q8R6VYVRV0Z4/2da6bb26-73f8-4f3b-98bc-7a051aaab33b.png',
  'https://static.shared.propertyfinder.eg/media/images/listing/01JMGA94NXVF25Q8R6VYVRV0Z4/b0143214-76a6-424d-8cba-7520351af4dd.png',
  'https://static.shared.propertyfinder.eg/media/images/listing/01JMGA94NXVF25Q8R6VYVRV0Z4/070bf48c-5c39-48e7-a883-7b5ec4f706d2.png',
  'https://static.shared.propertyfinder.eg/media/images/listing/01JMGA94NXVF25Q8R6VYVRV0Z4/26008e2d-733b-4d49-9825-2bcf84694fe2.png',
];

export const AGENT_IMG = 'https://static.shared.propertyfinder.eg/media/images/listing/01JMGA94NXVF25Q8R6VYVRV0Z4/252be8bf-60ab-45d4-b8ac-999cde6e8d45.png';

export function priceLabel(p: Pick<Listing, 'mode' | 'usd' | 'egpM'>): string {
  return p.mode === 'rent'
    ? '$' + p.usd.toLocaleString() + '/mo'
    : 'EGP ' + p.egpM.toFixed(1) + 'M';
}

/* ── API mapping ────────────────────────────────────────────────────────────
   Reads live inventory through the public /api/listings endpoint rather than
   querying the database from the browser. That endpoint is what applies the
   moderation filter — public submissions land as 'pending' and hidden — so a
   direct table read here would surface unreviewed rows. Any failure → empty
   array, so callers fall back to FALLBACK_LISTINGS. */
function mapRow(id: string, p: Record<string, unknown>): Listing {
  const num = (v: unknown, d: number): number => (typeof v === 'number' ? v : d);
  const str = (v: unknown, d: string): string => (typeof v === 'string' ? v : d);
  const rawPrice = p.price;
  const egpM = typeof rawPrice === 'number' ? (rawPrice > 1000 ? rawPrice / 1e6 : rawPrice) : num(p.egpM, 10);
  // The envelope mode of /api/listings labels the deal `purpose`
  // ('for-rent' | 'for-sale'); filter mode and the sheet units use
  // `mode`/`listingType`. Accept all three so every source maps correctly.
  const mode: 'sale' | 'rent' =
    p.mode === 'rent' || p.listingType === 'rent' || p.purpose === 'for-rent' ? 'rent' : 'sale';
  // Envelope rows carry `image` + `images[]`; sheet/snapshot units use `img`.
  const firstGalleryImage = Array.isArray(p.images) && typeof p.images[0] === 'string' ? p.images[0] : undefined;
  return {
    id,
    code: str(p.code, id.slice(0, 8).toUpperCase()),
    cmp: str(p.compound, str(p.location, 'New Cairo')),
    zone: str(p.zone, str(p.district, 'New Cairo')),
    type: str(p.propertyType, str(p.type, 'Villa')),
    beds: num(p.bedrooms, num(p.beds, 3)),
    bath: num(p.bathrooms, num(p.bath, 2)),
    area: num(p.area, 200),
    egpM,
    usd: num(p.usd, num(p.rent, Math.round(egpM * 180))),
    ai: num(p.ai, num(p.aiScore, 9.0)),
    tag: typeof p.tag === 'string' ? p.tag : null,
    mode,
    agent: str(p.agent, str(p.agentName, 'Sierra Advisor')),
    ago: str(p.ago, 'Live'),
    img: str(p.featuredImage, str(p.img, str(p.image, firstGalleryImage ?? FALLBACK_LISTINGS[0].img))),
  };
}

export async function fetchListings(max = 24): Promise<Listing[]> {
  try {
    const res = await fetch(`/api/listings?limit=${max}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      success?: boolean;
      listings?: Array<Record<string, unknown>>;
    };
    if (!body.success || !Array.isArray(body.listings)) return [];
    return body.listings.map((row) =>
      mapRow(typeof row.id === 'string' ? row.id : String(row.id ?? ''), row)
    );
  } catch {
    return [];
  }
}
