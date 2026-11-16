'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ==========================================
// STRICT CONTACT NUMBER CONSTANT (ONLY NUMBER ON PAGE)
// ==========================================
export const EXCLUSIVE_PHONE_DISPLAY = '01092048333';
export const EXCLUSIVE_WHATSAPP_INTL = '201092048333';

// ==========================================
// DATA MODELS & TOP COMPOUNDS (WITH DEVELOPER TAGS)
// ==========================================
export interface SubFeature {
  id: string;
  type: 'lagoon' | 'park' | 'golf' | 'clubhouse';
  nameEn: string;
  nameAr: string;
  coords: [number, number][];
}

export interface UnitItem {
  id: string;
  compoundId: string;
  titleEn: string;
  titleAr: string;
  category: 'Resale' | 'Rent';
  subType: 'Villa' | 'Twinhouse' | 'Penthouse' | 'Apartment';
  price: number;
  priceLabel: string;
  bua: number;
  bedrooms: number;
  bathrooms: number;
  roi: string;
  coords: [number, number];
  image: string;
  delivery: string;
}

export interface CompoundData {
  id: string;
  nameEn: string;
  nameAr: string;
  developerEn: string;
  developerAr: string;
  avgPriceEn: string;
  avgPriceAr: string;
  estRoi: string;
  paymentPlanEn: string;
  paymentPlanAr: string;
  center: [number, number];
  polygon: [number, number][];
  subFeatures: SubFeature[];
}

export const COMPOUNDS_DATA: CompoundData[] = [
  {
    id: 'mivida',
    nameEn: 'Mivida New Cairo',
    nameAr: 'ميفيدا التجمع الخامس',
    developerEn: 'EMAAR MISR',
    developerAr: 'إعمار مصر',
    avgPriceEn: '34.5M EGP',
    avgPriceAr: '34.5 مليون ج.م',
    estRoi: '14.2%',
    paymentPlanEn: 'Ready to Move • Resale & Rent',
    paymentPlanAr: 'استلام فوري • ريسيل وإيجار',
    center: [30.0155, 31.5220],
    polygon: [
      [30.0220, 31.5120],
      [30.0220, 31.5320],
      [30.0090, 31.5320],
      [30.0090, 31.5120],
    ],
    subFeatures: [
      {
        id: 'mivida-lake',
        type: 'lagoon',
        nameEn: 'Mivida Central Lake',
        nameAr: 'البحيرة المركزية - ميفيدا',
        coords: [
          [30.0165, 31.5190],
          [30.0165, 31.5245],
          [30.0145, 31.5245],
          [30.0145, 31.5190],
        ],
      },
      {
        id: 'mivida-park',
        type: 'park',
        nameEn: 'Wadi Green Spine',
        nameAr: 'المحور الأخضر وحديقة الوادي',
        coords: [
          [30.0195, 31.5150],
          [30.0195, 31.5290],
          [30.0175, 31.5290],
          [30.0175, 31.5150],
        ],
      },
      {
        id: 'mivida-club',
        type: 'clubhouse',
        nameEn: 'The Boulevard & Clubhouse',
        nameAr: 'البوليفارد والكلوب هاوس',
        coords: [
          [30.0135, 31.5205],
          [30.0135, 31.5255],
          [30.0115, 31.5255],
          [30.0115, 31.5205],
        ],
      },
    ],
  },
  {
    id: 'hydepark',
    nameEn: 'Hyde Park New Cairo',
    nameAr: 'هايد بارك التجمع الخامس',
    developerEn: 'HYDE PARK',
    developerAr: 'هايد بارك للتطوير',
    avgPriceEn: '26.8M EGP',
    avgPriceAr: '26.8 مليون ج.م',
    estRoi: '13.5%',
    paymentPlanEn: '10% Down Payment / 8 Years',
    paymentPlanAr: '10% مقدم / أقساط حتى 8 سنوات',
    center: [30.0050, 31.5380],
    polygon: [
      [30.0120, 31.5325],
      [30.0120, 31.5470],
      [29.9980, 31.5470],
      [29.9980, 31.5325],
    ],
    subFeatures: [
      {
        id: 'hp-central-park',
        type: 'park',
        nameEn: '600,000 sqm Central Park',
        nameAr: 'الحديقة المركزية الكبرى',
        coords: [
          [30.0080, 31.5350],
          [30.0080, 31.5440],
          [30.0020, 31.5440],
          [30.0020, 31.5350],
        ],
      },
      {
        id: 'hp-club',
        type: 'clubhouse',
        nameEn: 'Hyde Park Sports Club',
        nameAr: 'نادي هايد بارك الرياضي',
        coords: [
          [30.0105, 31.5360],
          [30.0105, 31.5415],
          [30.0085, 31.5415],
          [30.0085, 31.5360],
        ],
      },
    ],
  },
  {
    id: 'mv-icity',
    nameEn: 'Mountain View iCity',
    nameAr: 'ماونتن فيو آي سيتي',
    developerEn: 'MOUNTAIN VIEW (DMG)',
    developerAr: 'ماونتن فيو',
    avgPriceEn: '21.5M EGP',
    avgPriceAr: '21.5 مليون ج.م',
    estRoi: '15.0%',
    paymentPlanEn: '10% Down Payment / 9 Years',
    paymentPlanAr: '10% مقدم / 9 سنوات',
    center: [30.0620, 31.5650],
    polygon: [
      [30.0690, 31.5550],
      [30.0690, 31.5750],
      [30.0550, 31.5750],
      [30.0550, 31.5550],
    ],
    subFeatures: [
      {
        id: 'mv-lagoon',
        type: 'lagoon',
        nameEn: 'Lagoon Beach Park',
        nameAr: 'لاجون بيتش بارك',
        coords: [
          [30.0650, 31.5600],
          [30.0650, 31.5680],
          [30.0615, 31.5680],
          [30.0615, 31.5600],
        ],
      },
      {
        id: 'mv-club',
        type: 'clubhouse',
        nameEn: 'The Corniche & Club Park',
        nameAr: 'الكورنيش وكلوب بارك',
        coords: [
          [30.0600, 31.5580],
          [30.0600, 31.5710],
          [30.0575, 31.5710],
          [30.0575, 31.5580],
        ],
      },
    ],
  },
  {
    id: 'villette',
    nameEn: 'Villette SODIC',
    nameAr: 'فيليت سوديك',
    developerEn: 'SODIC',
    developerAr: 'سوديك',
    avgPriceEn: '39.0M EGP',
    avgPriceAr: '39.0 مليون ج.م',
    estRoi: '13.8%',
    paymentPlanEn: 'Immediate Delivery • Prime Resale',
    paymentPlanAr: 'استلام فوري • ريسيل مميز',
    center: [30.0285, 31.5360],
    polygon: [
      [30.0340, 31.5290],
      [30.0340, 31.5430],
      [30.0230, 31.5430],
      [30.0230, 31.5290],
    ],
    subFeatures: [
      {
        id: 'villette-parks',
        type: 'park',
        nameEn: 'The 4 Pocket Parks',
        nameAr: 'الحدائق الأربعة المفتوحة',
        coords: [
          [30.0305, 31.5320],
          [30.0305, 31.5400],
          [30.0265, 31.5400],
          [30.0265, 31.5320],
        ],
      },
    ],
  },
  {
    id: 'palmhills',
    nameEn: 'Palm Hills New Cairo',
    nameAr: 'بالم هيلز التجمع الخامس',
    developerEn: 'PALM HILLS',
    developerAr: 'بالم هيلز للتعمير',
    avgPriceEn: '31.2M EGP',
    avgPriceAr: '31.2 مليون ج.م',
    estRoi: '14.6%',
    paymentPlanEn: '5% Down Payment / 8 Years',
    paymentPlanAr: '5% مقدم / 8 سنوات',
    center: [30.0440, 31.5520],
    polygon: [
      [30.0510, 31.5430],
      [30.0510, 31.5610],
      [30.0370, 31.5610],
      [30.0370, 31.5430],
    ],
    subFeatures: [
      {
        id: 'ph-golf',
        type: 'golf',
        nameEn: 'Palm Hills Golf & Promenade',
        nameAr: 'منطقة الجولف والبروميناد',
        coords: [
          [30.0475, 31.5460],
          [30.0475, 31.5570],
          [30.0415, 31.5570],
          [30.0415, 31.5460],
        ],
      },
    ],
  },
];

export const INITIAL_UNITS: UnitItem[] = [
  {
    id: 'MV-101',
    compoundId: 'mivida',
    titleEn: 'Standalone Villa - Lake Front',
    titleAr: 'فيلا مستقلة صف أول على البحيرة',
    category: 'Resale',
    subType: 'Villa',
    price: 42500000,
    priceLabel: '42.5M EGP',
    bua: 390,
    bedrooms: 5,
    bathrooms: 6,
    roi: '14.8%',
    coords: [30.0162, 31.5215],
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=85',
    delivery: 'Ready to Move',
  },
  {
    id: 'MV-102',
    compoundId: 'mivida',
    titleEn: 'Luxury Furnished Boulevard Apartment',
    titleAr: 'شقة فندقية مفروشة على البوليفارد',
    category: 'Rent',
    subType: 'Apartment',
    price: 110000,
    priceLabel: '110K EGP/mo',
    bua: 195,
    bedrooms: 3,
    bathrooms: 3,
    roi: '9.6% Yield',
    coords: [30.0132, 31.5235],
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=85',
    delivery: 'Immediate Rent',
  },
  {
    id: 'HP-201',
    compoundId: 'hydepark',
    titleEn: 'Twinhouse Overlooking Central Park',
    titleAr: 'توين هاوس بإطلالة صريحة على البارك',
    category: 'Resale',
    subType: 'Twinhouse',
    price: 26800000,
    priceLabel: '26.8M EGP',
    bua: 280,
    bedrooms: 4,
    bathrooms: 4,
    roi: '13.9%',
    coords: [30.0062, 31.5395],
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=85',
    delivery: 'Ready to Move',
  },
  {
    id: 'HP-202',
    compoundId: 'hydepark',
    titleEn: 'Garden Apartment - Park Corner',
    titleAr: 'شقة بحديقة خاصة في بارك كورنر',
    category: 'Rent',
    subType: 'Apartment',
    price: 65000,
    priceLabel: '65K EGP/mo',
    bua: 165,
    bedrooms: 2,
    bathrooms: 2,
    roi: '8.9% Yield',
    coords: [30.0030, 31.5365],
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=85',
    delivery: 'Immediate Rent',
  },
  {
    id: 'IC-301',
    compoundId: 'mv-icity',
    titleEn: 'Lagoon Beach iVilla Penthouse',
    titleAr: 'آي فيلا بنتهاوس على اللاجون مباشرة',
    category: 'Resale',
    subType: 'Penthouse',
    price: 18900000,
    priceLabel: '18.9M EGP',
    bua: 245,
    bedrooms: 3,
    bathrooms: 3,
    roi: '15.4%',
    coords: [30.0632, 31.5640],
    image: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=900&q=85',
    delivery: '2026 Delivery',
  },
  {
    id: 'VL-401',
    compoundId: 'villette',
    titleEn: 'Sky Condo Penthouse - SODIC Villette',
    titleAr: 'بنتهاوس سكاي كوندو - فيليت سوديك',
    category: 'Resale',
    subType: 'Penthouse',
    price: 33500000,
    priceLabel: '33.5M EGP',
    bua: 310,
    bedrooms: 4,
    bathrooms: 4,
    roi: '14.1%',
    coords: [30.0288, 31.5355],
    image: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=900&q=85',
    delivery: 'Ready to Move',
  },
  {
    id: 'PH-501',
    compoundId: 'palmhills',
    titleEn: 'Golf View Standalone Villa',
    titleAr: 'فيلا مستقلة بإطلالة مفتوحة على الجولف',
    category: 'Resale',
    subType: 'Villa',
    price: 36200000,
    priceLabel: '36.2M EGP',
    bua: 355,
    bedrooms: 4,
    bathrooms: 5,
    roi: '14.9%',
    coords: [30.0448, 31.5515],
    image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=900&q=85',
    delivery: 'Ready to Move',
  },
];

// Helper to normalize Supabase listings into UnitItem
function mapInventoryUnitToUnitItem(unit: any, compounds: CompoundData[]): UnitItem {
  const loc = String(unit.location || unit.compound || '').toLowerCase();
  const compMatch = compounds.find(
    (c) =>
      c.id.toLowerCase() === loc ||
      c.nameEn.toLowerCase().includes(loc) ||
      (c.id === 'mivida' && /mivida|ميفيدا/i.test(loc)) ||
      (c.id === 'hydepark' && /hyde\s*park|هايد/i.test(loc)) ||
      (c.id === 'mv-icity' && /icity|mountain\s*view|ماونتن/i.test(loc)) ||
      (c.id === 'villette' && /villette|فيليت|sodic/i.test(loc)) ||
      (c.id === 'palmhills' && /palm\s*hills|بالم\s*هيلز/i.test(loc))
  );

  const compoundId = compMatch ? compMatch.id : 'mivida';
  const category: UnitItem['category'] = unit.mode === 'rent' ? 'Rent' : 'Resale';

  const rawType = String(unit.propertyType || unit.type || 'Apartment').toLowerCase();
  let subType: UnitItem['subType'] = 'Apartment';
  if (rawType.includes('villa') && !rawType.includes('twin')) subType = 'Villa';
  else if (rawType.includes('twin') || rawType.includes('town')) subType = 'Twinhouse';
  else if (rawType.includes('penthouse') || rawType.includes('roof')) subType = 'Penthouse';

  const priceNum = Number(unit.price) || 25000000;
  const priceFormatted =
    unit.priceLabel ||
    (priceNum >= 1000000
      ? `${(priceNum / 1000000).toFixed(1)}M EGP`
      : `${(priceNum / 1000).toFixed(0)}K EGP`);

  const fallbackLat = compMatch ? compMatch.center[0] : 30.0155;
  const fallbackLng = compMatch ? compMatch.center[1] : 31.5220;

  return {
    id: String(unit.code || unit.id || `SE-${Math.floor(Math.random() * 9000 + 1000)}`),
    compoundId,
    titleEn: `${subType} in ${compMatch?.nameEn || unit.location || 'New Cairo'}`,
    titleAr: `${subType === 'Villa' ? 'فيلا' : subType === 'Twinhouse' ? 'توين هاوس' : subType === 'Penthouse' ? 'بنتهاوس' : 'شقة'} في ${compMatch?.nameAr || unit.location || 'التجمع الخامس'}`,
    category,
    subType,
    price: priceNum,
    priceLabel: priceFormatted,
    bua: Number(unit.area) || 220,
    bedrooms: Number(unit.beds) || 3,
    bathrooms: Number(unit.bath) || 2,
    roi: `${(12.5 + ((priceNum % 5) * 0.6)).toFixed(1)}%`,
    coords: [Number(unit.lat) || fallbackLat, Number(unit.lng) || fallbackLng],
    image:
      unit.img ||
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=85',
    delivery: category === 'Rent' ? 'Immediate Rent' : 'Ready to Move',
  };
}

// ==========================================
// EXCEL INVENTORY SHEET WITH FILTERING SIDEBAR
// ==========================================
interface ExcelInventorySheetProps {
  units: UnitItem[];
  compounds: CompoundData[];
  selectedCompoundId: string | null;
  onSelectCompound: (id: string | null) => void;
  onSelectUnitOnMap: (unit: UnitItem) => void;
  lang: 'ar' | 'en';
}

export const ExcelInventorySheet: React.FC<ExcelInventorySheetProps> = ({
  units,
  compounds,
  selectedCompoundId,
  onSelectCompound,
  onSelectUnitOnMap,
  lang,
}) => {
  const [unitTypeFilter, setUnitTypeFilter] = useState<'All' | 'Resale' | 'Rent'>('All');
  const [bedroomsFilter, setBedroomsFilter] = useState<number | 'All'>('All');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(60000000);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  const isAr = lang === 'ar';

  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      if (selectedCompoundId && u.compoundId !== selectedCompoundId) return false;
      if (unitTypeFilter !== 'All' && u.category !== unitTypeFilter) return false;
      if (bedroomsFilter !== 'All') {
        if (bedroomsFilter === 5 && u.bedrooms < 5) return false;
        if (bedroomsFilter !== 5 && u.bedrooms !== bedroomsFilter) return false;
      }
      if (u.price < minPrice || u.price > maxPrice) return false;
      return true;
    });
  }, [units, selectedCompoundId, unitTypeFilter, bedroomsFilter, minPrice, maxPrice]);

  const resetFilters = () => {
    setUnitTypeFilter('All');
    setBedroomsFilter('All');
    setMinPrice(0);
    setMaxPrice(60000000);
  };

  return (
    <div className="bg-[#090c12]/95 border-t border-amber-500/25 text-slate-100 backdrop-blur-2xl">
      <div className="max-w-[1600px] mx-auto p-4 md:p-6">
        {/* Sheet Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition"
            >
              {sidebarOpen
                ? isAr
                  ? 'إخفاء الفلاتر ✕'
                  : 'Hide Filters ✕'
                : isAr
                ? 'إظهار الفلاتر ⚙️'
                : 'Show Filters ⚙️'}
            </button>
            <div>
              <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>
                  📊{' '}
                  {isAr
                    ? 'شيت الوحدات المتاحة (ريسيل وإيجار)'
                    : 'Live Inventory Sheet (Resale & Rent)'}
                </span>
                <span className="px-2.5 py-0.5 text-xs rounded-full bg-amber-500 text-slate-950 font-black">
                  {filteredUnits.length} {isAr ? 'وحدة' : 'Units'}
                </span>
              </h2>
            </div>
          </div>

          {/* Direct Exclusive Contact Badge (ONLY 01092048333) */}
          <a
            href={`https://wa.me/${EXCLUSIVE_WHATSAPP_INTL}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-sm font-bold hover:bg-emerald-500/30 transition"
          >
            <span>🟢 {isAr ? 'الخط المباشر الوحيد للحجز:' : 'Direct VIP Line:'}</span>
            <span dir="ltr" className="font-mono font-black text-white">
              {EXCLUSIVE_PHONE_DISPLAY}
            </span>
          </a>
        </div>

        {/* Main Body: Filtering Sidebar + Inventory Table */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* FILTERING SIDEBAR */}
          {sidebarOpen && (
            <aside className="w-full lg:w-80 shrink-0 bg-[#0f141f]/90 border border-white/10 rounded-2xl p-5 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-bold text-amber-400 text-sm">
                  {isAr ? 'تصفية وحدات الكومباوند' : 'Filter Compound Inventory'}
                </h3>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs text-slate-400 hover:text-amber-300 underline"
                >
                  {isAr ? 'إعادة ضبط' : 'Reset All'}
                </button>
              </div>

              {/* 1. Compound Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  {isAr ? 'الكومباوند المختار' : 'Selected Compound'}
                </label>
                <select
                  value={selectedCompoundId || ''}
                  onChange={(e) => onSelectCompound(e.target.value || null)}
                  className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-400 outline-none"
                >
                  <option value="">
                    {isAr ? 'كل كومباوندات التجمع الخامس' : 'All New Cairo Compounds'}
                  </option>
                  {compounds.map((c) => (
                    <option key={c.id} value={c.id}>
                      {isAr
                        ? `${c.nameAr} (${c.developerAr})`
                        : `${c.nameEn} (${c.developerEn})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Unit Type Filter (Resale vs. Rent) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  {isAr ? 'نوع العرض (ريسيل / إيجار)' : 'Listing Type (Resale vs. Rent)'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['All', 'Resale', 'Rent'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setUnitTypeFilter(type)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        unitTypeFilter === type
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                          : 'bg-slate-900/70 text-slate-300 border-white/10 hover:border-white/30'
                      }`}
                    >
                      {type === 'All'
                        ? isAr
                          ? 'الكل'
                          : 'All'
                        : type === 'Resale'
                        ? isAr
                          ? 'ريسيل'
                          : 'Resale'
                        : isAr
                        ? 'إيجار'
                        : 'Rent'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Bedrooms Filter */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  {isAr ? 'عدد غرف النوم' : 'Number of Bedrooms'}
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {(['All', 1, 2, 3, 4, 5] as const).map((bed) => (
                    <button
                      key={String(bed)}
                      type="button"
                      onClick={() => setBedroomsFilter(bed)}
                      className={`py-2 rounded-lg text-xs font-bold border transition ${
                        bedroomsFilter === bed
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900/70 text-slate-300 border-white/10 hover:border-white/30'
                      }`}
                    >
                      {bed === 'All' ? (isAr ? 'الكل' : 'All') : bed === 5 ? '5+' : bed}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Price Range Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    {isAr ? 'نطاق السعر (ج.م)' : 'Price Range (EGP)'}
                  </span>
                  <span className="text-amber-400 font-mono">
                    {(minPrice / 1000000).toFixed(1)}M - {(maxPrice / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="space-y-2">
                  <input
                    type="range"
                    min={0}
                    max={60000000}
                    step={500000}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUnitTypeFilter('Rent');
                        setMinPrice(0);
                        setMaxPrice(300000);
                      }}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[11px] text-slate-300 border border-white/10"
                    >
                      {isAr ? 'إيجارات (< 300 ألف)' : 'Rentals (< 300K)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUnitTypeFilter('Resale');
                        setMinPrice(15000000);
                        setMaxPrice(60000000);
                      }}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[11px] text-slate-300 border border-white/10"
                    >
                      {isAr ? 'تمليك (15M - 60M)' : 'Resale (15M - 60M)'}
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          )}

          {/* INVENTORY DATA TABLE */}
          <div className="flex-1 overflow-x-auto rounded-2xl border border-white/10 bg-[#0c1018]/90">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">{isAr ? 'الكود والوحدة' : 'Unit & Code'}</th>
                  <th className="py-3.5 px-4">
                    {isAr ? 'الكومباوند والمطور' : 'Compound & Developer'}
                  </th>
                  <th className="py-3.5 px-4">{isAr ? 'النوع' : 'Category'}</th>
                  <th className="py-3.5 px-4">{isAr ? 'الغرف / المساحة' : 'Beds / BUA'}</th>
                  <th className="py-3.5 px-4">{isAr ? 'السعر' : 'Price'}</th>
                  <th className="py-3.5 px-4">{isAr ? 'العائد ROI' : 'Est. ROI'}</th>
                  <th className="py-3.5 px-4 text-center">
                    {isAr ? 'تحديد / تواصل مباشر' : 'Locate / VIP Contact'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredUnits.map((unit) => {
                  const comp = compounds.find((c) => c.id === unit.compoundId);
                  return (
                    <tr key={unit.id} className="hover:bg-white/[0.04] transition">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="text-amber-400 font-mono text-[11px]">{unit.id}</div>
                        <div>{isAr ? unit.titleAr : unit.titleEn}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-200">
                          {isAr ? comp?.nameAr : comp?.nameEn}
                        </div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold">
                          {isAr ? comp?.developerAr : comp?.developerEn}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            unit.category === 'Resale'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {unit.category === 'Resale'
                            ? isAr
                              ? 'ريسيل'
                              : 'Resale'
                            : isAr
                            ? 'إيجار'
                            : 'Rent'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        🛏️ {unit.bedrooms} {isAr ? 'غرف' : 'Beds'} • 📐 {unit.bua} m²
                      </td>
                      <td className="py-3.5 px-4 font-mono font-extrabold text-amber-400 text-sm">
                        {unit.priceLabel}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                          {unit.roi}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectUnitOnMap(unit)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition"
                          >
                            📍 {isAr ? 'على الخريطة' : 'Fly To Pin'}
                          </button>
                          <a
                            href={`https://wa.me/${EXCLUSIVE_WHATSAPP_INTL}?text=${encodeURIComponent(
                              `مرحباً، أستفسر عن الوحدة (${unit.id} - ${unit.titleAr}) في ${comp?.nameAr} بسعر ${unit.priceLabel}`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition font-mono"
                          >
                            WhatsApp {EXCLUSIVE_PHONE_DISPLAY}
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN 4K OBSIDIAN & SATELLITE HYBRID MAP COMPONENT
// ==========================================
export default function NewCairoLuxuryMapApp() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayersRef = useRef<{ dark: L.TileLayer; sat: L.LayerGroup } | null>(null);
  const subFeatureLayersRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [mapStyle, setMapStyle] = useState<'obsidian' | 'satellite'>('obsidian');
  const [selectedCompoundId, setSelectedCompoundId] = useState<string | null>('mivida');
  const [units, setUnits] = useState<UnitItem[]>(INITIAL_UNITS);
  const [selectedUnit, setSelectedUnit] = useState<UnitItem | null>(INITIAL_UNITS[0]);
  const [activeSubLayers, setActiveSubLayers] = useState<{
    lagoon: boolean;
    park: boolean;
    golf: boolean;
    clubhouse: boolean;
  }>({
    lagoon: true,
    park: true,
    golf: true,
    clubhouse: true,
  });

  const isAr = lang === 'ar';
  const selectedCompound = useMemo(
    () => COMPOUNDS_DATA.find((c) => c.id === selectedCompoundId) || null,
    [selectedCompoundId]
  );

  // Wire with Live Supabase Inventory (/api/inventory)
  useEffect(() => {
    let active = true;
    fetch('/api/inventory?limit=60')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data || !Array.isArray(data.units) || data.units.length === 0) return;
        const mapped = data.units.map((u: any) =>
          mapInventoryUnitToUnitItem(u, COMPOUNDS_DATA)
        );
        setUnits((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newUnits = mapped.filter((m: UnitItem) => !existingIds.has(m.id));
          return [...prev, ...newUnits];
        });
      })
      .catch(() => {
        // graceful baseline
      });

    return () => {
      active = false;
    };
  }, []);

  // Initialize High-FPS Canvas Map & Ultra-Sharp 4K Layers
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30.0250, 31.5380],
      zoom: 14,
      maxZoom: 22,
      preferCanvas: true, // 60 FPS Canvas Engine
      zoomControl: false,
    });

    // 1. Obsidian Dark @2x Retina Layer (Default Active Map)
    const obsidianDarkLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      {
        maxZoom: 22,
        maxNativeZoom: 20,
        detectRetina: true,
        attribution: '&copy; OpenStreetMap & CARTO 4K Retina',
      }
    );

    // 2. 4K Satellite Hybrid Layer (Esri World Imagery + Glowing @2x Street Labels)
    const satelliteImagery = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 22,
        maxNativeZoom: 19,
      }
    );
    const glowingHybridLabels = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png',
      {
        maxZoom: 22,
        maxNativeZoom: 20,
        detectRetina: true,
      }
    );
    const satelliteHybridGroup = L.layerGroup([satelliteImagery, glowingHybridLabels]);

    obsidianDarkLayer.addTo(map);
    tileLayersRef.current = { dark: obsidianDarkLayer, sat: satelliteHybridGroup };

    subFeatureLayersRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
  }, []);

  // Switch between Obsidian 4K Dark and 4K Satellite Hybrid instantly
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = tileLayersRef.current;
    if (!map || !layers) return;

    if (mapStyle === 'obsidian') {
      map.removeLayer(layers.sat);
      layers.dark.addTo(map);
    } else {
      map.removeLayer(layers.dark);
      layers.sat.addTo(map);
    }
  }, [mapStyle]);

  // Render Compound Polygons, Developer Tags, Subfeatures, and Luxury Price-Tag Pins
  useEffect(() => {
    const map = mapInstanceRef.current;
    const subGroup = subFeatureLayersRef.current;
    const markerGroup = markersLayerRef.current;
    if (!map || !subGroup || !markerGroup) return;

    subGroup.clearLayers();
    markerGroup.clearLayers();

    const subFeatureColors: Record<SubFeature['type'], string> = {
      lagoon: '#06b6d4', // Glowing Cyan
      park: '#10b981',   // Emerald Green
      golf: '#84cc16',   // Lime Green
      clubhouse: '#f59e0b', // Metallic Gold
    };

    COMPOUNDS_DATA.forEach((comp) => {
      const compUnitsCount = units.filter((u) => u.compoundId === comp.id).length;
      const isSelected = comp.id === selectedCompoundId;

      // Compound Master Polygon
      const poly = L.polygon(comp.polygon, {
        color: isSelected ? '#f59e0b' : '#94a3b8',
        weight: isSelected ? 3 : 1.5,
        fillColor: isSelected ? '#f59e0b' : '#1e293b',
        fillOpacity: isSelected ? 0.14 : 0.08,
      }).addTo(subGroup);

      poly.on('click', () => {
        setSelectedCompoundId(comp.id);
        map.flyTo(comp.center, 15, { animate: true, duration: 1.1 });
      });

      // Competitor-Inspired Developer Tag + Units Counter Badge on Map
      const devBadgeIcon = L.divIcon({
        className: 'custom-compound-badge',
        html: `
          <div style="transform: translate(-50%, -50%); white-space: nowrap;" class="cursor-pointer select-none px-3 py-1.5 rounded-xl bg-[#090d16]/90 border ${
            isSelected ? 'border-amber-400 shadow-lg shadow-amber-500/30' : 'border-white/20'
          } backdrop-blur-md text-center">
            <div class="text-[9px] font-black tracking-widest uppercase text-amber-400">${
              isAr ? comp.developerAr : comp.developerEn
            }</div>
            <div class="text-xs font-extrabold text-white">${isAr ? comp.nameAr : comp.nameEn}</div>
            <div class="text-[10px] font-bold text-emerald-300">${compUnitsCount} ${
              isAr ? 'وحدة متاحة' : 'Units Available'
            }</div>
          </div>
        `,
      });

      L.marker(comp.center, { icon: devBadgeIcon })
        .addTo(markerGroup)
        .on('click', () => {
          setSelectedCompoundId(comp.id);
          map.flyTo(comp.center, 15, { animate: true, duration: 1.1 });
        });

      // Internal Master Plan Subfeatures (Lagoons, Parks, Golf, Clubhouses)
      comp.subFeatures.forEach((sf) => {
        if (!activeSubLayers[sf.type]) return;
        const sfPoly = L.polygon(sf.coords, {
          color: subFeatureColors[sf.type],
          weight: 2,
          fillColor: subFeatureColors[sf.type],
          fillOpacity: 0.45,
        }).addTo(subGroup);

        sfPoly.bindTooltip(isAr ? sf.nameAr : sf.nameEn, {
          direction: 'top',
          className: 'bg-slate-950 text-white border border-amber-400 px-2 py-1 rounded text-xs',
        });
      });
    });

    // Luxury Price-Tag Pins
    units.forEach((unit) => {
      const active = selectedUnit?.id === unit.id;
      const pinIcon = L.divIcon({
        className: 'luxury-price-pin',
        html: `
          <div style="transform: translate(-50%, -100%); white-space: nowrap;" class="transition-all duration-300 cursor-pointer px-3 py-1 rounded-full font-mono text-xs font-black border ${
            active
              ? 'bg-amber-400 text-slate-950 border-white scale-125 shadow-[0_0_25px_rgba(245,158,11,0.9)]'
              : 'bg-[#0b0f19]/95 text-amber-300 border-amber-500/50 hover:border-amber-400 shadow-lg'
          }">
            ${unit.priceLabel}
          </div>
        `,
      });

      L.marker(unit.coords, { icon: pinIcon, zIndexOffset: active ? 1000 : 500 })
        .addTo(markerGroup)
        .on('click', () => {
          setSelectedUnit(unit);
          setSelectedCompoundId(unit.compoundId);
          map.flyTo(unit.coords, 17, { animate: true, duration: 1.2 });
        });
    });
  }, [selectedCompoundId, selectedUnit, activeSubLayers, isAr, units]);

  const handleFlyToUnit = (unit: UnitItem) => {
    setSelectedUnit(unit);
    setSelectedCompoundId(unit.compoundId);
    mapInstanceRef.current?.flyTo(unit.coords, 17, { animate: true, duration: 1.2 });
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        fontFamily: isAr ? "'Cairo', sans-serif" : "'Plus Jakarta Sans', sans-serif",
      }}
      className="min-h-screen bg-[#06090f] text-white flex flex-col"
    >
      {/* TOP LUXURY BAR (ONLY USER PHONE NUMBER DISPLAYED: 01092048333) */}
      <header className="z-30 bg-[#090d16]/90 backdrop-blur-xl border-b border-amber-500/25 px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
          <div>
            <h1 className="text-sm md:text-base font-black tracking-wide text-white">
              {isAr
                ? 'خريطة التجمع الخامس التفاعلية 4K • ريسيل وإيجار'
                : 'New Cairo 4K Interactive Master Map • Resale & Rent'}
            </h1>
            <p className="text-[11px] text-amber-300/90">
              {isAr
                ? 'أقوى الفرص الاستثمارية والوحدات الجاهزة للاستلام الفوري'
                : 'Curated Ready-to-Move Resales & High-Yield Rentals'}
            </p>
          </div>
        </div>

        {/* Map Mode Switcher + Language + Exclusive Phone */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 4K Obsidian vs 4K Satellite Hybrid Toggle */}
          <div className="flex rounded-xl bg-slate-900/90 p-1 border border-white/15">
            <button
              type="button"
              onClick={() => setMapStyle('obsidian')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                mapStyle === 'obsidian'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              🌑 {isAr ? 'الوضع الداكن 4K' : 'Obsidian 4K'}
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('satellite')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                mapStyle === 'satellite'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              🛰️ {isAr ? 'قمر صناعي 4K هجين' : '4K Satellite Hybrid'}
            </button>
          </div>

          {/* Language Toggle */}
          <button
            type="button"
            onClick={() => setLang(isAr ? 'en' : 'ar')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs font-bold text-amber-300 hover:border-amber-400"
          >
            {isAr ? 'English (LTR)' : 'العربية (RTL)'}
          </button>

          {/* Exclusive Phone Call CTA */}
          <a
            href={`tel:${EXCLUSIVE_PHONE_DISPLAY}`}
            className="px-4 py-2 rounded-xl bg-linear-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
          >
            <span>📞 {isAr ? 'اتصال مباشر:' : 'Call Now:'}</span>
            <span dir="ltr" className="font-mono">
              {EXCLUSIVE_PHONE_DISPLAY}
            </span>
          </a>
        </div>
      </header>

      {/* INTERACTIVE MAP VIEWPORT */}
      <div className="relative h-[68vh] w-full overflow-hidden">
        <div ref={mapContainerRef} className="h-full w-full z-10" />

        {/* FLOATING MASTER PLAN SUBFEATURES TOGGLE BAR */}
        <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 bg-[#090d16]/85 backdrop-blur-xl p-2 rounded-2xl border border-white/15 shadow-2xl">
          {(
            [
              {
                key: 'lagoon',
                labelAr: '🌊 لاجونز وبحيرات',
                labelEn: '🌊 Crystal Lagoons',
                color: 'border-cyan-400 text-cyan-300',
              },
              {
                key: 'park',
                labelAr: '🌳 حدائق ومحاور خضراء',
                labelEn: '🌳 Green Spines',
                color: 'border-emerald-400 text-emerald-300',
              },
              {
                key: 'golf',
                labelAr: '⛳ ملاعب جولف',
                labelEn: '⛳ Golf Courses',
                color: 'border-lime-400 text-lime-300',
              },
              {
                key: 'clubhouse',
                labelAr: '🏛️ كلوب هاوس وتجاري',
                labelEn: '🏛️ Clubhouses',
                color: 'border-amber-400 text-amber-300',
              },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setActiveSubLayers((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                activeSubLayers[item.key]
                  ? `${item.color} bg-white/10`
                  : 'border-white/10 text-slate-500 bg-transparent'
              }`}
            >
              {isAr ? item.labelAr : item.labelEn}
            </button>
          ))}
        </div>

        {/* FLOATING COMPOUND ROI & PAYMENT PLAN INTELLIGENCE CARD */}
        {selectedCompound && (
          <div className="absolute top-4 right-4 z-20 w-80 bg-[#090d16]/90 backdrop-blur-2xl border border-amber-500/40 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase">
                {isAr ? selectedCompound.developerAr : selectedCompound.developerEn}
              </span>
              <span className="text-xs font-bold text-emerald-400">
                {units.filter((u) => u.compoundId === selectedCompound.id).length}{' '}
                {isAr ? 'وحدة متاحة' : 'Units Available'}
              </span>
            </div>

            <h3 className="text-base font-black text-white">
              {isAr ? selectedCompound.nameAr : selectedCompound.nameEn}
            </h3>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-slate-900/90 border border-white/10 rounded-xl p-2.5">
                <div className="text-[10px] text-slate-400">
                  {isAr ? 'متوسط الأسعار' : 'Avg. Price'}
                </div>
                <div className="text-sm font-black text-amber-400">
                  {isAr ? selectedCompound.avgPriceAr : selectedCompound.avgPriceEn}
                </div>
              </div>
              <div className="bg-slate-900/90 border border-white/10 rounded-xl p-2.5">
                <div className="text-[10px] text-slate-400">
                  {isAr ? 'العائد الاستثماري' : 'Est. Annual ROI'}
                </div>
                <div className="text-sm font-black text-emerald-400">
                  {selectedCompound.estRoi}
                </div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-200 font-semibold">
              💳 {isAr ? selectedCompound.paymentPlanAr : selectedCompound.paymentPlanEn}
            </div>
          </div>
        )}

        {/* FLOATING SELECTED UNIT PREVIEW CARD + WHATSAPP VIP (BOTTOM LEFT) */}
        {selectedUnit && (
          <div className="absolute bottom-5 left-5 z-20 w-80 md:w-96 bg-[#090d16]/95 backdrop-blur-2xl border border-amber-400/50 rounded-2xl overflow-hidden shadow-[0_15px_50px_rgba(0,0,0,0.85)]">
            <div className="relative h-40 w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedUnit.image}
                alt={selectedUnit.titleEn}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#090d16] via-transparent to-black/40" />
              <div className="absolute top-3 left-3 flex gap-1.5">
                <span className="px-2.5 py-1 rounded-lg bg-slate-950/85 border border-white/20 text-[11px] font-bold text-amber-300">
                  {selectedUnit.subType}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/90 text-slate-950 text-[11px] font-black">
                  ROI {selectedUnit.roi}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUnit(null)}
                className="absolute top-3 right-3 h-7 w-7 rounded-full bg-slate-950/80 text-white text-xs font-bold"
              >
                ✕
              </button>
              <div className="absolute bottom-2 left-3 right-3 flex items-baseline justify-between">
                <span className="text-lg font-black font-mono text-amber-400">
                  {selectedUnit.priceLabel}
                </span>
                <span className="text-xs font-bold text-slate-200">
                  {selectedUnit.delivery}
                </span>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <h4 className="font-bold text-sm text-white">
                {isAr ? selectedUnit.titleAr : selectedUnit.titleEn}
              </h4>
              <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-900/80 px-3 py-2 rounded-xl border border-white/10">
                <span>📐 {selectedUnit.bua} m² BUA</span>
                <span>
                  🛏️ {selectedUnit.bedrooms} {isAr ? 'غرف' : 'Beds'}
                </span>
                <span>
                  🚿 {selectedUnit.bathrooms} {isAr ? 'حمام' : 'Baths'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={`tel:${EXCLUSIVE_PHONE_DISPLAY}`}
                  className="py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-center text-xs font-bold text-white transition"
                >
                  📞 {EXCLUSIVE_PHONE_DISPLAY}
                </a>
                <a
                  href={`https://wa.me/${EXCLUSIVE_WHATSAPP_INTL}?text=${encodeURIComponent(
                    `مرحباً، أرغب في تفاصيل ومعاينة الوحدة (${selectedUnit.id} - ${selectedUnit.titleAr}) بسعر ${selectedUnit.priceLabel}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-center text-xs font-black transition"
                >
                  💬 WhatsApp VIP
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* EXCEL INVENTORY SHEET WITH FILTERING SIDEBAR */}
      <ExcelInventorySheet
        units={units}
        compounds={COMPOUNDS_DATA}
        selectedCompoundId={selectedCompoundId}
        onSelectCompound={(id) => setSelectedCompoundId(id)}
        onSelectUnitOnMap={handleFlyToUnit}
        lang={lang}
      />
    </div>
  );
}
