'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import CompoundExcelSheetModal from '@/components/site/CompoundExcelSheetModal';

// STRICT SIERRA ESTATES CONTACT RULE: 01092048333 IS THE SOLE AUTHORIZED NUMBER
export const SIERRA_CONTACT_PHONE = '01092048333';
export const SIERRA_WHATSAPP_PHONE = '201092048333';

export interface SubFeature {
  id: string;
  name: string;
  nameAr: string;
  category: 'lagoon' | 'greenspine' | 'golf' | 'clubhouse';
  coordinates: [number, number][];
}

export interface MasterplanCompound {
  id: string;
  name: string;
  nameAr: string;
  developer: string;
  developerAr?: string;
  developerTag: string; // e.g. 'EMAAR MISR', 'HYDE PARK', 'DMG / MOUNTAIN VIEW', 'SODIC', 'PALM HILLS', 'ORA DEVELOPERS'
  avgPriceEGP: string;
  avgPriceEGPAr?: string;
  roiAnnual: string;
  downPayment: string;
  downPaymentAr?: string;
  installmentYears: number;
  paymentPlan: string;
  paymentPlanAr?: string;
  syncedUnits: number;
  center: [number, number];
  polygon: [number, number][];
  subfeatures: SubFeature[];
}

export interface PropertyUnit {
  id: string;
  title: string;
  titleAr?: string;
  compoundId: string;
  compoundName: string;
  compoundNameAr?: string;
  priceFormatted: string;
  type: 'Villa' | 'Twinhouse' | 'Penthouse' | 'Townhouse' | 'Apartment';
  mode?: 'sale' | 'rent';
  beds: number;
  baths: number;
  buaSqm: number;
  roiEstimate: string;
  lat: number;
  lng: number;
  image: string;
}

export interface SpatialMasterplanMapProps {
  properties?: PropertyUnit[];
  compounds?: MasterplanCompound[];
  lang?: 'en' | 'ar';
  onSelectUnit?: (unit: PropertyUnit) => void;
  onWhatsAppConcierge?: (unit: PropertyUnit) => void;
}

export const SUBFEATURE_STYLES: Record<
  SubFeature['category'],
  {
    color: string;
    fillColor: string;
    fillOpacity: number;
    labelEn: string;
    labelAr: string;
    icon: string;
  }
> = {
  lagoon: {
    color: '#22d3ee',
    fillColor: '#06b6d4',
    fillOpacity: 0.45,
    labelEn: 'Crystal Lagoons & Lakes',
    labelAr: 'كريستال لاجونز وبحيرات',
    icon: '🌊',
  },
  greenspine: {
    color: '#34d399',
    fillColor: '#10b981',
    fillOpacity: 0.35,
    labelEn: 'Green Spines & Central Parks',
    labelAr: 'المحاور الخضراء والحدائق المركزية',
    icon: '🌳',
  },
  golf: {
    color: '#a3e635',
    fillColor: '#84cc16',
    fillOpacity: 0.35,
    labelEn: 'Championship Golf Courses',
    labelAr: 'ملاعب الجولف الدولية',
    icon: '⛳',
  },
  clubhouse: {
    color: '#fbbf24',
    fillColor: '#f59e0b',
    fillOpacity: 0.5,
    labelEn: 'Clubhouses & Commercial Hubs',
    labelAr: 'النوادي والمراكز التجارية',
    icon: '🏛️',
  },
};

// Flagship Top 6 New Cairo Masterplans with Verified GPS Boundaries & Developer Tags
export const NEW_CAIRO_MASTERPLANS: MasterplanCompound[] = [
  {
    id: 'mivida',
    name: 'Mivida',
    nameAr: 'ميفيدا إعمار',
    developer: 'Emaar Misr',
    developerAr: 'إعمار مصر',
    developerTag: 'EMAAR MISR',
    avgPriceEGP: '28.5M EGP',
    avgPriceEGPAr: '28.5 مليون ج.م',
    roiAnnual: '16.4%',
    downPayment: '10%',
    downPaymentAr: '10% مقدم',
    installmentYears: 7,
    paymentPlan: '10% Down Payment / 7 Years',
    paymentPlanAr: 'مقدم 10% / تقسيط على 7 سنوات',
    syncedUnits: 1840,
    center: [30.0135, 31.519],
    polygon: [
      [30.021, 31.511],
      [30.021, 31.527],
      [30.006, 31.527],
      [30.006, 31.511],
    ],
    subfeatures: [
      {
        id: 'mivida-lake',
        name: 'Mivida Lake District Lagoon',
        nameAr: 'بحيرة ميفيدا ليك ديستريكت',
        category: 'lagoon',
        coordinates: [
          [30.0155, 31.517],
          [30.0155, 31.521],
          [30.0125, 31.521],
          [30.0125, 31.517],
        ],
      },
      {
        id: 'mivida-spine',
        name: 'Central Green Spine & Valley Park',
        nameAr: 'المحور الأخضر وحديقة الوادي',
        category: 'greenspine',
        coordinates: [
          [30.019, 31.514],
          [30.019, 31.524],
          [30.016, 31.524],
          [30.016, 31.514],
        ],
      },
      {
        id: 'mivida-club',
        name: 'The Boulevard Club & Downtown Mall',
        nameAr: 'نادي البوليفارد ومول داون تاون',
        category: 'clubhouse',
        coordinates: [
          [30.011, 31.513],
          [30.011, 31.518],
          [30.008, 31.518],
          [30.008, 31.513],
        ],
      },
    ],
  },
  {
    id: 'hydepark',
    name: 'Hyde Park',
    nameAr: 'هايد بارك التجمع',
    developer: 'Hyde Park Developments',
    developerAr: 'هايد بارك للتطوير العقاري',
    developerTag: 'HYDE PARK',
    avgPriceEGP: '24.2M EGP',
    avgPriceEGPAr: '24.2 مليون ج.م',
    roiAnnual: '15.8%',
    downPayment: '10%',
    downPaymentAr: '10% مقدم',
    installmentYears: 8,
    paymentPlan: '10% Down Payment / 8 Years',
    paymentPlanAr: 'مقدم 10% / تقسيط على 8 سنوات',
    syncedUnits: 2610,
    center: [30.004, 31.502],
    polygon: [
      [30.012, 31.493],
      [30.012, 31.510],
      [29.996, 31.510],
      [29.996, 31.493],
    ],
    subfeatures: [
      {
        id: 'hp-park',
        name: 'Hyde Park 600,000m² Central Park',
        nameAr: 'الحديقة المركزية هايد بارك 600 ألف م²',
        category: 'greenspine',
        coordinates: [
          [30.007, 31.497],
          [30.007, 31.506],
          [30.001, 31.506],
          [30.001, 31.497],
        ],
      },
      {
        id: 'hp-club',
        name: 'Hyde Park Sports Clubhouse & HydeOut',
        nameAr: 'نادي هايد بارك الرياضي وممشى هايد آوت',
        category: 'clubhouse',
        coordinates: [
          [30.010, 31.495],
          [30.010, 31.499],
          [30.0075, 31.499],
          [30.0075, 31.495],
        ],
      },
      {
        id: 'hp-lakes',
        name: 'Hyde Park Cascading Lakes',
        nameAr: 'بحيرات هايد بارك المتدرجة',
        category: 'lagoon',
        coordinates: [
          [30.003, 31.500],
          [30.003, 31.504],
          [29.998, 31.504],
          [29.998, 31.500],
        ],
      },
    ],
  },
  {
    id: 'icity',
    name: 'Mountain View iCity',
    nameAr: 'ماونتن فيو آي سيتي',
    developer: 'DMG Mountain View',
    developerAr: 'دي إم جي / ماونتن فيو',
    developerTag: 'DMG / MOUNTAIN VIEW',
    avgPriceEGP: '19.8M EGP',
    avgPriceEGPAr: '19.8 مليون ج.م',
    roiAnnual: '17.2%',
    downPayment: '10%',
    downPaymentAr: '10% مقدم',
    installmentYears: 9,
    paymentPlan: '10% Down Payment / 9 Years',
    paymentPlanAr: 'مقدم 10% / تقسيط على 9 سنوات',
    syncedUnits: 3120,
    center: [30.041, 31.542],
    polygon: [
      [30.049, 31.533],
      [30.049, 31.551],
      [30.033, 31.551],
      [30.033, 31.533],
    ],
    subfeatures: [
      {
        id: 'icity-lagoon',
        name: 'Crystal Lagoon Beach Park',
        nameAr: 'كريستال لاجون بيتش بارك',
        category: 'lagoon',
        coordinates: [
          [30.043, 31.539],
          [30.043, 31.545],
          [30.039, 31.545],
          [30.039, 31.539],
        ],
      },
      {
        id: 'icity-club',
        name: 'Club Park & Corniche Promenade',
        nameAr: 'كلوب بارك وكورنيش المشي',
        category: 'clubhouse',
        coordinates: [
          [30.046, 31.536],
          [30.046, 31.543],
          [30.0435, 31.543],
          [30.0435, 31.536],
        ],
      },
      {
        id: 'icity-spine',
        name: 'Central Green Island Park',
        nameAr: 'حديقة الجزيرة الخضراء المركزية',
        category: 'greenspine',
        coordinates: [
          [30.037, 31.535],
          [30.037, 31.549],
          [30.034, 31.549],
          [30.034, 31.535],
        ],
      },
    ],
  },
  {
    id: 'villette',
    name: 'Villette',
    nameAr: 'فيليت سوديك',
    developer: 'SODIC',
    developerAr: 'سوديك للتطوير العقاري',
    developerTag: 'SODIC',
    avgPriceEGP: '26.5M EGP',
    avgPriceEGPAr: '26.5 مليون ج.م',
    roiAnnual: '16.8%',
    downPayment: '10%',
    downPaymentAr: '10% مقدم',
    installmentYears: 8,
    paymentPlan: 'Ready to Move - Cash / Resale',
    paymentPlanAr: 'استلام فوري - كاش / إعادة بيع',
    syncedUnits: 1280,
    center: [30.021, 31.505],
    polygon: [
      [30.028, 31.498],
      [30.028, 31.512],
      [30.014, 31.512],
      [30.014, 31.498],
    ],
    subfeatures: [
      {
        id: 'villette-parks',
        name: 'The Four Pocket Parks Spine',
        nameAr: 'المحور الأخضر والحدائق الأربعة',
        category: 'greenspine',
        coordinates: [
          [30.025, 31.501],
          [30.025, 31.509],
          [30.022, 31.509],
          [30.022, 31.501],
        ],
      },
      {
        id: 'villette-club',
        name: 'Villette 30-Acre Club & Sports Complex',
        nameAr: 'نادي فيليت 30 فدان والمجمع الرياضي',
        category: 'clubhouse',
        coordinates: [
          [30.019, 31.500],
          [30.019, 31.506],
          [30.015, 31.506],
          [30.015, 31.500],
        ],
      },
      {
        id: 'villette-lakes',
        name: 'Reflective Waterways & Fountains',
        nameAr: 'المجاري المائية والنوافير التفاعلية',
        category: 'lagoon',
        coordinates: [
          [30.022, 31.503],
          [30.022, 31.507],
          [30.020, 31.507],
          [30.020, 31.503],
        ],
      },
    ],
  },
  {
    id: 'palmhills',
    name: 'Palm Hills New Cairo',
    nameAr: 'بالم هيلز نيو كايرو',
    developer: 'Palm Hills Developments',
    developerAr: 'بالم هيلز للتعمير',
    developerTag: 'PALM HILLS',
    avgPriceEGP: '31.2M EGP',
    avgPriceEGPAr: '31.2 مليون ج.م',
    roiAnnual: '15.2%',
    downPayment: '10%',
    downPaymentAr: '10% مقدم',
    installmentYears: 8,
    paymentPlan: '10% Down Payment / 8 Years',
    paymentPlanAr: 'مقدم 10% / تقسيط على 8 سنوات',
    syncedUnits: 1450,
    center: [30.022, 31.580],
    polygon: [
      [30.031, 31.571],
      [30.029, 31.591],
      [30.013, 31.589],
      [30.015, 31.569],
    ],
    subfeatures: [
      {
        id: 'ph-golf',
        name: 'Palm Hills Championship Golf Course',
        nameAr: 'ملاعب جولف بالم هيلز الدولية',
        category: 'golf',
        coordinates: [
          [30.025, 31.576],
          [30.023, 31.587],
          [30.017, 31.585],
          [30.019, 31.574],
        ],
      },
      {
        id: 'ph-club',
        name: 'Clubhouse & Equestrian Center',
        nameAr: 'الكلوب هاوس ومركز الفروسية',
        category: 'clubhouse',
        coordinates: [
          [30.028, 31.573],
          [30.028, 31.579],
          [30.025, 31.579],
          [30.025, 31.573],
        ],
      },
      {
        id: 'ph-lakes',
        name: 'Golf Course Cascade Lakes',
        nameAr: 'بحيرات ملاعب الجولف المتتالية',
        category: 'lagoon',
        coordinates: [
          [30.021, 31.581],
          [30.021, 31.586],
          [30.018, 31.586],
          [30.018, 31.581],
        ],
      },
    ],
  },
  {
    id: 'zedeast',
    name: 'ZED East',
    nameAr: 'زيد إيست أورا',
    developer: 'ORA Developers',
    developerAr: 'أورا للتطوير العقاري',
    developerTag: 'ORA DEVELOPERS',
    avgPriceEGP: '22.8M EGP',
    avgPriceEGPAr: '22.8 مليون ج.م',
    roiAnnual: '16.5%',
    downPayment: '5%',
    downPaymentAr: '5% مقدم',
    installmentYears: 8,
    paymentPlan: '5% Down Payment / 8 Years',
    paymentPlanAr: 'مقدم 5% / تقسيط على 8 سنوات',
    syncedUnits: 1920,
    center: [29.995, 31.518],
    polygon: [
      [30.003, 31.510],
      [30.003, 31.526],
      [29.987, 31.526],
      [29.987, 31.510],
    ],
    subfeatures: [
      {
        id: 'zed-park',
        name: 'ZED East 200-Acre Central Park',
        nameAr: 'حديقة زيد إيست المركزية 200 فدان',
        category: 'greenspine',
        coordinates: [
          [29.999, 31.514],
          [29.999, 31.522],
          [29.991, 31.522],
          [29.991, 31.514],
        ],
      },
      {
        id: 'zed-sports',
        name: 'ZED Sports Club & Retail Hub',
        nameAr: 'نادي زيد الرياضي ومجمع المحلات',
        category: 'clubhouse',
        coordinates: [
          [30.002, 31.518],
          [30.002, 31.524],
          [29.998, 31.524],
          [29.998, 31.518],
        ],
      },
      {
        id: 'zed-water',
        name: 'ZED Waterfront Promenade & Lakes',
        nameAr: 'ممشى الواجهة المائية وبحيرات زيد',
        category: 'lagoon',
        coordinates: [
          [29.994, 31.515],
          [29.994, 31.520],
          [29.989, 31.520],
          [29.989, 31.515],
        ],
      },
    ],
  },
];

export const DEFAULT_UNITS: PropertyUnit[] = [
  {
    id: 'se-miv-01',
    title: 'Mivida Lakefront Standalone Villa',
    titleAr: 'فيلا مستقلة على البحيرة مباشرة - ميفيدا إعمار',
    compoundId: 'mivida',
    compoundName: 'Mivida',
    compoundNameAr: 'ميفيدا',
    priceFormatted: '42.5M EGP',
    type: 'Villa',
    mode: 'sale',
    beds: 5,
    baths: 6,
    buaSqm: 520,
    roiEstimate: '+17.5%',
    lat: 30.0145,
    lng: 31.5195,
    image:
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'se-hp-02',
    title: 'Hyde Park Park-View Twinhouse',
    titleAr: 'توين هاوس بإطلالة كاملة على البارك - هايد بارك',
    compoundId: 'hydepark',
    compoundName: 'Hyde Park',
    compoundNameAr: 'هايد بارك',
    priceFormatted: '26.8M EGP',
    type: 'Twinhouse',
    mode: 'sale',
    beds: 4,
    baths: 5,
    buaSqm: 375,
    roiEstimate: '+16.1%',
    lat: 30.0052,
    lng: 31.5015,
    image:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'se-ici-03',
    title: 'Mountain View iCity Lagoon iVilla',
    titleAr: 'آي فيلا لاجون بيتش - ماونتن فيو آي سيتي',
    compoundId: 'icity',
    compoundName: 'Mountain View iCity',
    compoundNameAr: 'ماونتن فيو آي سيتي',
    priceFormatted: '18.9M EGP',
    type: 'Penthouse',
    mode: 'sale',
    beds: 3,
    baths: 4,
    buaSqm: 285,
    roiEstimate: '+18.2%',
    lat: 30.0415,
    lng: 31.5425,
    image:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'se-vil-04',
    title: 'Villette Sky Garden Duplex',
    titleAr: 'دوبلكس سكاي جاردن جاهز للاستلام - فيليت سوديك',
    compoundId: 'villette',
    compoundName: 'Villette',
    compoundNameAr: 'فيليت',
    priceFormatted: '22.5M EGP',
    type: 'Twinhouse',
    mode: 'sale',
    beds: 4,
    baths: 4,
    buaSqm: 310,
    roiEstimate: '+16.8%',
    lat: 30.0215,
    lng: 31.5055,
    image:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'se-ph-05',
    title: 'Palm Hills Golf-Front Palace',
    titleAr: 'قصر مستقل على ملعب الجولف - بالم هيلز التجمع',
    compoundId: 'palmhills',
    compoundName: 'Palm Hills New Cairo',
    compoundNameAr: 'بالم هيلز',
    priceFormatted: '58.0M EGP',
    type: 'Villa',
    mode: 'sale',
    beds: 6,
    baths: 7,
    buaSqm: 680,
    roiEstimate: '+15.5%',
    lat: 30.0225,
    lng: 31.5815,
    image:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'se-zed-06',
    title: 'ZED East Club Residence',
    titleAr: 'شقة راقية بإطلالة على النادي - زيد إيست',
    compoundId: 'zedeast',
    compoundName: 'ZED East',
    compoundNameAr: 'زيد إيست',
    priceFormatted: '95K EGP/mo',
    type: 'Apartment',
    mode: 'rent',
    beds: 3,
    baths: 3,
    buaSqm: 185,
    roiEstimate: '+18.9%',
    lat: 29.9955,
    lng: 31.5185,
    image:
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
  },
];

export default function SpatialMasterplanMap({
  properties = DEFAULT_UNITS,
  compounds = NEW_CAIRO_MASTERPLANS,
  lang = 'en',
  onSelectUnit,
  onWhatsAppConcierge,
}: SpatialMasterplanMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.LayerGroup | null>(null);
  const overlayLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeLang, setActiveLang] = useState<'en' | 'ar'>(lang);
  const [mapMode, setMapMode] = useState<'obsidian' | 'satellite'>('obsidian');
  const [selectedCompoundId, setSelectedCompoundId] = useState<string>('all');
  const [activeSubfeatures, setActiveSubfeatures] = useState<Record<string, boolean>>({
    lagoon: true,
    greenspine: true,
    golf: true,
    clubhouse: true,
  });
  const [selectedUnit, setSelectedUnit] = useState<PropertyUnit | null>(properties[0] || null);

  // Live Inventory Sheet Modal
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [modalCompoundName, setModalCompoundName] = useState<string | null>(null);

  // Live units fetched from Supabase /api/inventory
  const [allUnits, setAllUnits] = useState<PropertyUnit[]>(properties);

  const isAr = activeLang === 'ar';

  // 1. Fetch live inventory from Supabase endpoint to keep counts and pins real-time
  useEffect(() => {
    let isMounted = true;
    fetch('/api/inventory?limit=300')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data || !Array.isArray(data.units)) return;

        // Transform geolocated Supabase units into PropertyUnit objects
        const realMappedUnits: PropertyUnit[] = data.units
          .filter((u: any) => u.lat && u.lng && u.lat > 29.9 && u.lat < 30.2 && u.lng > 31.3 && u.lng < 31.8)
          .slice(0, 50)
          .map((u: any, index: number) => {
            const cmpId = (u.compound || '').toLowerCase();
            let matchedCompoundId = 'mivida';
            if (cmpId.includes('hyde')) matchedCompoundId = 'hydepark';
            else if (cmpId.includes('city') || cmpId.includes('mountain')) matchedCompoundId = 'icity';
            else if (cmpId.includes('villette')) matchedCompoundId = 'villette';
            else if (cmpId.includes('palm')) matchedCompoundId = 'palmhills';
            else if (cmpId.includes('zed')) matchedCompoundId = 'zedeast';

            return {
              id: u.code || u.id || `live-${index}`,
              title: `${u.propertyType || 'Residence'} · ${u.compound || 'New Cairo'}`,
              titleAr: `${u.propertyType || 'وحدة سكنية'} · ${u.compound || 'القاهرة الجديدة'}`,
              compoundId: matchedCompoundId,
              compoundName: u.compound || 'New Cairo Compound',
              compoundNameAr: u.compound || 'كمبوند بالقاهرة الجديدة',
              priceFormatted: u.priceLabel || (u.price ? `${(u.price / 1000000).toFixed(1)}M EGP` : 'Upon Call'),
              type: (u.propertyType?.includes('Villa') ? 'Villa' : u.propertyType?.includes('Twin') ? 'Twinhouse' : u.propertyType?.includes('Pent') ? 'Penthouse' : 'Apartment') as any,
              mode: u.mode === 'rent' ? 'rent' : 'sale',
              beds: u.beds || 3,
              baths: u.bath || 3,
              buaSqm: u.area || 250,
              roiEstimate: u.aiScore ? `+${(u.aiScore * 1.8).toFixed(1)}%` : '+16.5%',
              lat: u.lat,
              lng: u.lng,
              image: u.img || properties[index % properties.length]?.image || properties[0].image,
            };
          });

        if (realMappedUnits.length > 0) {
          // Merge with default flagship pins
          setAllUnits([...properties, ...realMappedUnits]);
        }
      })
      .catch((err) => {
        console.warn('[SpatialMasterplanMap] Live inventory fetch notice:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [properties]);

  const filteredUnits = useMemo(() => {
    if (selectedCompoundId === 'all') return allUnits;
    return allUnits.filter((u) => u.compoundId === selectedCompoundId);
  }, [allUnits, selectedCompoundId]);

  const activeCompound = useMemo(
    () => compounds.find((c) => c.id === selectedCompoundId) || null,
    [compounds, selectedCompoundId]
  );

  // 2. Initialize Leaflet Map with Canvas 60 FPS Acceleration and High-DPI Support
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30.0185, 31.515], // Golden Square / Fifth Settlement Center
      zoom: 13,
      minZoom: 11,
      maxZoom: 22,
      zoomControl: false,
      preferCanvas: true, // High-performance WebGL/Canvas vector polygon rendering
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tileGroup = L.layerGroup().addTo(map);
    const overlayGroup = L.layerGroup().addTo(map);

    tileLayerRef.current = tileGroup;
    overlayLayerRef.current = overlayGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 3. Switch between Obsidian Dark 4K (@2x Retina) & 4K Satellite Hybrid (Esri + CartoDB Dark Labels @2x)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const tileGroup = tileLayerRef.current;
    if (!map || !tileGroup) return;

    tileGroup.clearLayers();

    if (mapMode === 'obsidian') {
      // CartoDB Dark Matter @2x Retina Tiles (Max Zoom 22, Zero Pixelation)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png', {
        subdomains: 'abcd',
        maxNativeZoom: 20,
        maxZoom: 22,
        detectRetina: true,
        attribution: '&copy; CARTO &copy; Sierra Estates 4K Engine',
      }).addTo(tileGroup);
    } else {
      // 4K Esri World Imagery (Max Native 19, Zoom 22) + CartoDB Dark Only Labels @2x
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxNativeZoom: 19,
          maxZoom: 22,
          detectRetina: true,
          attribution: '&copy; Esri &copy; Sierra Estates Hybrid',
        }
      ).addTo(tileGroup);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png', {
        subdomains: 'abcd',
        maxNativeZoom: 20,
        maxZoom: 22,
        detectRetina: true,
      }).addTo(tileGroup);
    }
  }, [mapMode]);

  // 4. Render Masterplan GPS Polygons, Competitor Developer Tags & Subfeatures
  useEffect(() => {
    const map = mapInstanceRef.current;
    const overlayGroup = overlayLayerRef.current;
    if (!map || !overlayGroup) return;

    overlayGroup.clearLayers();

    // Render Compound Polygons with Developer Badges & Live Unit Counters
    compounds.forEach((compound) => {
      const isFocused = selectedCompoundId === compound.id;
      const poly = L.polygon(compound.polygon, {
        color: isFocused ? '#f59e0b' : '#38bdf8',
        weight: isFocused ? 3 : 1.8,
        dashArray: isFocused ? undefined : '5, 5',
        fillColor: isFocused ? '#f59e0b' : '#0284c7',
        fillOpacity: isFocused ? 0.16 : 0.08,
      });

      // Developer Tag & Available Units Counter Tooltip (Ahlan Homes & Mapping Properties style)
      const compoundNameText = isAr ? compound.nameAr : compound.name;
      const unitsLabel = isAr ? `متاح ${compound.syncedUnits} وحدة` : `${compound.syncedUnits} Units Available`;

      poly.bindTooltip(
        `<div style="
          font-family:${isAr ? "'Cairo'" : "'Plus Jakarta Sans'"},sans-serif;
          background:rgba(6,17,34,0.96);
          color:#f8fafc;
          padding:7px 12px;
          border-radius:10px;
          border:1.5px solid ${isFocused ? '#f59e0b' : 'rgba(147,197,253,0.4)'};
          box-shadow:0 10px 25px rgba(0,0,0,0.8);
          font-size:11px;
          line-height:1.4;
          text-align:${isAr ? 'right' : 'left'};
          direction:${isAr ? 'rtl' : 'ltr'};
        ">
          <div style="font-size:9.5px;font-weight:900;letter-spacing:0.08em;color:#f59e0b;text-transform:uppercase;">
            ${compound.developerTag}
          </div>
          <div style="font-size:12px;font-weight:800;color:#ffffff;margin-top:2px;">
            ${compoundNameText}
          </div>
          <div style="font-size:10px;font-weight:700;color:#38bdf8;margin-top:2px;display:flex;align-items:center;gap:4px;">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#10b981;"></span>
            <span>${unitsLabel}</span>
          </div>
        </div>`,
        { sticky: true, direction: 'top', className: 'sierra-masterplan-tooltip' }
      );

      poly.on('click', () => {
        setSelectedCompoundId(compound.id);
        map.flyToBounds(poly.getBounds(), { padding: [60, 60], maxZoom: 16, duration: 1.1 });
      });

      poly.addTo(overlayGroup);

      // Render Interactive Master Plan Subfeatures (Lagoons, Green Spines, Golf, Clubhouses)
      compound.subfeatures.forEach((sf) => {
        if (!activeSubfeatures[sf.category]) return;
        const style = SUBFEATURE_STYLES[sf.category];
        const sfPoly = L.polygon(sf.coordinates, {
          color: style.color,
          weight: 2,
          fillColor: style.fillColor,
          fillOpacity: style.fillOpacity,
        });

        sfPoly.bindTooltip(
          `<div style="
            font-family:${isAr ? "'Cairo'" : "'Plus Jakarta Sans'"},sans-serif;
            background:rgba(6,17,34,0.92);
            color:${style.color};
            padding:4px 8px;
            border-radius:6px;
            border:1px solid ${style.color}55;
            font-size:10px;
            font-weight:800;
            display:flex;
            align-items:center;
            gap:4px;
          ">
            <span>${style.icon}</span>
            <span>${isAr ? sf.nameAr : sf.name}</span>
          </div>`,
          { direction: 'center', className: 'sierra-subfeature-tooltip' }
        );

        sfPoly.addTo(overlayGroup);
      });
    });

    // Render Luxury Price-Tag Capsule Pins
    filteredUnits.forEach((unit) => {
      const isSelected = selectedUnit?.id === unit.id;
      const icon = L.divIcon({
        className: 'sierra-unit-marker',
        html: `
          <div style="
            display:inline-flex;
            align-items:center;
            gap:6px;
            padding:5px 12px;
            border-radius:9999px;
            font-family:${isAr ? "'Cairo'" : "'Plus Jakarta Sans'"},sans-serif;
            font-weight:800;
            font-size:11px;
            white-space:nowrap;
            cursor:pointer;
            transition:all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            transform:${isSelected ? 'scale(1.15) translateY(-3px)' : 'scale(1)'};
            background:${
              isSelected
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'rgba(6, 17, 34, 0.94)'
            };
            color:${isSelected ? '#020617' : '#ffffff'};
            border:1.5px solid ${isSelected ? '#fef08a' : '#38bdf8'};
            box-shadow:${
              isSelected
                ? '0 0 24px rgba(245, 158, 11, 0.8), 0 8px 20px rgba(0,0,0,0.8)'
                : '0 4px 16px rgba(0, 0, 0, 0.75), 0 0 10px rgba(56, 189, 248, 0.2)'
            };
          ">
            <span style="width:6px;height:6px;border-radius:50%;background:${
              isSelected ? '#020617' : '#38bdf8'
            };box-shadow:${isSelected ? 'none' : '0 0 8px #38bdf8'};"></span>
            <span>${unit.priceFormatted}</span>
          </div>
        `,
        iconSize: [100, 34],
        iconAnchor: [50, 17],
      });

      const marker = L.marker([unit.lat, unit.lng], { icon });
      marker.on('click', () => {
        setSelectedUnit(unit);
        onSelectUnit?.(unit);
        // Smooth camera fly-to directly into unit view (maxZoom: 18)
        map.flyTo([unit.lat, unit.lng], 18, {
          animate: true,
          duration: 1.2,
        });
      });

      marker.addTo(overlayGroup);
    });
  }, [compounds, filteredUnits, selectedCompoundId, activeSubfeatures, selectedUnit, isAr]);

  const handleSelectCompound = (id: string) => {
    setSelectedCompoundId(id);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (id === 'all') {
      map.flyTo([30.0185, 31.515], 13, { duration: 1.1 });
    } else {
      const target = compounds.find((c) => c.id === id);
      if (target) {
        map.flyTo(target.center, 15, { duration: 1.1 });
      }
    }
  };

  const handleWhatsApp = (unit: PropertyUnit) => {
    if (onWhatsAppConcierge) {
      onWhatsAppConcierge(unit);
      return;
    }
    const msg = isAr
      ? `مرحباً سييرا العقارية، أود الاستفسار وحجز معاينة للوحدة ${unit.title} في كمبوند ${unit.compoundName} (${unit.priceFormatted}).`
      : `Hello Sierra Estates, I would like to inquire and arrange a viewing for ${unit.title} in ${unit.compoundName} (${unit.priceFormatted}).`;
    window.open(`https://wa.me/${SIERRA_WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const openInventoryModalForCompound = (cmpName: string) => {
    setModalCompoundName(cmpName);
    setIsExcelModalOpen(true);
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ fontFamily: isAr ? "'Cairo', sans-serif" : "'Plus Jakarta Sans', sans-serif" }}
      className="relative w-full h-[760px] rounded-3xl overflow-hidden border border-slate-800/90 shadow-[0_25px_70px_rgba(0,0,0,0.9)] bg-[#061122] text-white select-none"
    >
      {/* TOP COMMAND BAR: Compound Pills, 4K Mode Toggle & Language Switcher */}
      <div
        style={{ background: 'rgba(6, 17, 34, 0.94)', backdropFilter: 'blur(20px)' }}
        className="absolute top-4 left-4 right-4 z-[1000] rounded-2xl border border-slate-700/60 p-3 shadow-2xl flex flex-wrap items-center justify-between gap-3"
      >
        {/* Flagship Compound Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#93c5fd] px-2 whitespace-nowrap">
            {isAr ? 'المخططات الرئيسية:' : 'Masterplans:'}
          </span>
          <button
            type="button"
            onClick={() => handleSelectCompound('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedCompoundId === 'all'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.45)]'
                : 'bg-slate-900/80 text-white/85 hover:text-white border border-slate-800'
            }`}
          >
            {isAr ? 'كل التجمع الخامس' : 'All New Cairo'}
          </button>

          {compounds.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelectCompound(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedCompoundId === c.id
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(234,179,8,0.45)]'
                  : 'bg-slate-900/80 text-white/85 hover:text-white border border-slate-800'
              }`}
            >
              <span>{isAr ? c.nameAr : c.name}</span>
              <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${selectedCompoundId === c.id ? 'bg-slate-950/20 text-slate-900 font-extrabold' : 'text-cyan-400'}`}>
                {c.syncedUnits}
              </span>
            </button>
          ))}
        </div>

        {/* Right Controls: 4K Dual Tile Switcher + AR/EN Toggle + Inventory Sheet Button */}
        <div className="flex items-center gap-2">
          {/* Master Inventory Sheet Button */}
          <button
            type="button"
            onClick={() => openInventoryModalForCompound(activeCompound?.name || 'New Cairo')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 hover:bg-amber-500/30 transition shadow-[0_0_15px_rgba(234,179,8,0.2)]"
          >
            <span>📊</span>
            <span>{isAr ? 'شيت المخزون الكامل' : 'Excel Inventory'}</span>
          </button>

          {/* 4K Dual Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setMapMode('obsidian')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                mapMode === 'obsidian'
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'الوضع الداكن 4K' : 'Obsidian 4K'}
            </button>
            <button
              type="button"
              onClick={() => setMapMode('satellite')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                mapMode === 'satellite'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'قمر صناعي هجين' : '4K Satellite'}
            </button>
          </div>

          {/* Bilingual AR/EN Toggle */}
          <button
            type="button"
            onClick={() => setActiveLang((prev) => (prev === 'en' ? 'ar' : 'en'))}
            className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition"
          >
            {isAr ? 'EN' : 'عربي'}
          </button>
        </div>
      </div>

      {/* SUBFEATURE VECTOR LAYERS (Lagoons, Green Spines, Golf, Clubhouses) */}
      <div
        style={{ background: 'rgba(11, 23, 42, 0.88)', backdropFilter: 'blur(16px)' }}
        className="absolute top-20 left-4 z-[1000] rounded-2xl border border-slate-800/90 px-3 py-2 flex flex-wrap items-center gap-2 shadow-2xl"
      >
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#93c5fd]">
          {isAr ? 'الطبقات التفاعلية:' : 'Master Layers:'}
        </span>
        {(Object.keys(SUBFEATURE_STYLES) as Array<SubFeature['category']>).map((key) => {
          const info = SUBFEATURE_STYLES[key];
          const active = activeSubfeatures[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() =>
                setActiveSubfeatures((prev) => ({ ...prev, [key]: !prev[key] }))
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                active
                  ? 'bg-slate-900/95 text-white border-slate-600 shadow'
                  : 'bg-slate-950/40 text-slate-500 border-transparent opacity-60'
              }`}
            >
              <span
                style={{ backgroundColor: info.color }}
                className="w-2 h-2 rounded-full shadow-[0_0_6px_currentColor]"
              />
              <span>{isAr ? info.labelAr : info.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* FLOATING COMPOUND ROI & PAYMENT PLAN INTELLIGENCE CARD */}
      {activeCompound && (
        <div
          style={{ background: 'rgba(6, 17, 34, 0.95)', backdropFilter: 'blur(22px)' }}
          className="absolute top-36 left-4 z-[1000] w-80 rounded-2xl border border-amber-500/40 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] space-y-2.5 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
              {activeCompound.developerTag}
            </span>
            <span className="text-[11px] font-mono text-cyan-300 font-bold">
              {isAr ? `متاح ${activeCompound.syncedUnits} وحدة` : `${activeCompound.syncedUnits} Available Units`}
            </span>
          </div>

          <div className="text-base font-extrabold text-white">
            {isAr ? activeCompound.nameAr : activeCompound.name}
          </div>

          <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800 text-center">
            <div>
              <div className="text-[10px] text-[#93c5fd] font-bold uppercase">{isAr ? 'متوسط السعر' : 'Avg Price'}</div>
              <div className="text-xs font-extrabold text-white">{isAr && activeCompound.avgPriceEGPAr ? activeCompound.avgPriceEGPAr : activeCompound.avgPriceEGP}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#93c5fd] font-bold uppercase">{isAr ? 'العائد الاستثماري' : 'Est. ROI'}</div>
              <div className="text-xs font-extrabold text-emerald-400">{activeCompound.roiAnnual}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#93c5fd] font-bold uppercase">{isAr ? 'خطة السداد' : 'Deal Plan'}</div>
              <div className="text-xs font-extrabold text-amber-300">
                {activeCompound.downPayment} / {activeCompound.installmentYears}Y
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-300 flex items-center justify-between">
            <span className="text-slate-400">{isAr ? 'عرض اليوم المميز:' : 'Featured Deal:'}</span>
            <span className="font-bold text-amber-400">{isAr && activeCompound.paymentPlanAr ? activeCompound.paymentPlanAr : activeCompound.paymentPlan}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => openInventoryModalForCompound(activeCompound.name)}
              className="py-1.5 px-2 rounded-xl text-center text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 transition"
            >
              {isAr ? 'شيت المخزون' : 'Open Sheet'}
            </button>
            <a
              href={`https://wa.me/${SIERRA_WHATSAPP_PHONE}?text=${encodeURIComponent(
                isAr
                  ? `مرحباً سييرا العقارية، أود الاستفسار عن وحدات وخطط سداد كمبوند ${activeCompound.nameAr} (${activeCompound.developerTag}).`
                  : `Hello Sierra Estates, inquiring about units and payment plans for ${activeCompound.name} (${activeCompound.developerTag}).`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-1.5 px-2 rounded-xl text-center text-xs font-bold bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/30 transition flex items-center justify-center gap-1"
            >
              <span>واتساب VIP</span>
            </a>
          </div>
        </div>
      )}

      {/* LEAFLET 4K CANVAS ENGINE */}
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{
          filter:
            mapMode === 'obsidian'
              ? 'contrast(1.08) brightness(0.98) saturate(1.1)'
              : 'none',
        }}
      />

      {/* FLOATING UNIT PREVIEW CARD + DIRECT WHATSAPP VIP (01092048333) */}
      {selectedUnit && (
        <div
          style={{ background: 'rgba(6, 17, 34, 0.95)', backdropFilter: 'blur(24px)' }}
          className="absolute bottom-6 left-6 z-[1000] w-84 max-w-[calc(100%-3rem)] rounded-2xl border border-slate-700/80 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.92)] animate-in slide-in-from-bottom-4 duration-200"
        >
          <div className="relative h-36 w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedUnit.image}
              alt={selectedUnit.title}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => setSelectedUnit(null)}
              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-slate-950/85 text-slate-300 hover:text-white flex items-center justify-center text-xs shadow transition"
            >
              ✕
            </button>
            <div className="absolute top-2.5 left-2.5 bg-amber-400 text-slate-950 font-black text-[10px] uppercase px-2.5 py-0.5 rounded-md shadow">
              {selectedUnit.type}
            </div>
            <div className="absolute bottom-2.5 left-2.5 bg-slate-950/80 text-cyan-300 font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-md border border-cyan-400/40">
              {selectedUnit.mode === 'rent' ? (isAr ? 'إيجار' : 'Rent') : (isAr ? 'إعادة بيع' : 'Resale')}
            </div>
            <div className="absolute bottom-2.5 right-2.5 bg-emerald-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-md shadow">
              ROI {selectedUnit.roiEstimate}
            </div>
          </div>

          <div className="p-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-white">
                {selectedUnit.priceFormatted}
              </span>
              <span className="text-xs font-semibold text-[#93c5fd]">
                {isAr && selectedUnit.compoundNameAr ? selectedUnit.compoundNameAr : selectedUnit.compoundName}
              </span>
            </div>

            <h3 className="text-xs font-bold text-white/90 truncate">
              {isAr && selectedUnit.titleAr ? selectedUnit.titleAr : selectedUnit.title}
            </h3>

            <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-slate-800 font-mono">
              <span>{selectedUnit.beds} Beds</span>
              <span>•</span>
              <span>{selectedUnit.baths} Baths</span>
              <span>•</span>
              <span>{selectedUnit.buaSqm} m² BUA</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1.5">
              <a
                href={`/property/${selectedUnit.id}`}
                className="py-2 text-center rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-extrabold text-xs hover:opacity-95 transition shadow-[0_0_15px_rgba(56,189,248,0.35)]"
              >
                {isAr ? 'عرض الوحدة' : 'View Unit'}
              </a>
              <button
                type="button"
                onClick={() => handleWhatsApp(selectedUnit)}
                className="py-2 text-center rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-extrabold text-xs hover:bg-emerald-500/30 transition flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              >
                <span>{isAr ? 'واتساب VIP' : 'WhatsApp VIP'}</span>
              </button>
            </div>
            <div className="text-[10px] text-center text-slate-400 font-mono pt-0.5">
              {SIERRA_CONTACT_PHONE} · Sierra Advisory Desk
            </div>
          </div>
        </div>
      )}

      {/* EXCEL INVENTORY SHEET MODAL INTEGRATION */}
      {isExcelModalOpen && (
        <CompoundExcelSheetModal
          isOpen={isExcelModalOpen}
          onClose={() => setIsExcelModalOpen(false)}
          compoundName={modalCompoundName}
          isAr={isAr}
        />
      )}
    </div>
  );
}
