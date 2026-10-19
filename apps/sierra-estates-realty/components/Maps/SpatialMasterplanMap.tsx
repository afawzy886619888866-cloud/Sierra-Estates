'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  avgPriceEGP: string;
  roiAnnual: string;
  downPayment: string;
  installmentYears: number;
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
  priceFormatted: string;
  type: 'Villa' | 'Twinhouse' | 'Penthouse' | 'Townhouse' | 'Apartment';
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
  { color: string; fillColor: string; labelEn: string; labelAr: string }
> = {
  lagoon: {
    color: '#22d3ee',
    fillColor: '#06b6d4',
    labelEn: 'Crystal Lagoons',
    labelAr: 'كريستال لاجونز',
  },
  greenspine: {
    color: '#34d399',
    fillColor: '#10b981',
    labelEn: 'Green Spines & Parks',
    labelAr: 'المحاور الخضراء والحدائق',
  },
  golf: {
    color: '#a3e635',
    fillColor: '#84cc16',
    labelEn: 'Championship Golf',
    labelAr: 'ملاعب الجولف',
  },
  clubhouse: {
    color: '#fbbf24',
    fillColor: '#f59e0b',
    labelEn: 'Clubhouses & Hubs',
    labelAr: 'النوادي والمراكز',
  },
};

// Default New Cairo Fifth Settlement Masterplan Data
export const NEW_CAIRO_MASTERPLANS: MasterplanCompound[] = [
  {
    id: 'mivida',
    name: 'Mivida Emaar',
    nameAr: 'ميفيدا إعمار',
    developer: 'Emaar Misr',
    avgPriceEGP: '28.5M EGP',
    roiAnnual: '16.4%',
    downPayment: '10%',
    installmentYears: 7,
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
        name: 'Central Green Spine',
        nameAr: 'المحور الأخضر الرئيسي',
        category: 'greenspine',
        coordinates: [
          [30.019, 31.514],
          [30.019, 31.524],
          [30.016, 31.524],
          [30.016, 31.514],
        ],
      },
    ],
  },
  {
    id: 'hydepark',
    name: 'Hyde Park New Cairo',
    nameAr: 'هايد بارك التجمع',
    developer: 'Hyde Park Developments',
    avgPriceEGP: '24.2M EGP',
    roiAnnual: '15.8%',
    downPayment: '10%',
    installmentYears: 8,
    syncedUnits: 2610,
    center: [30.004, 31.502],
    polygon: [
      [30.012, 31.493],
      [30.012, 31.51],
      [29.996, 31.51],
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
          [30.01, 31.495],
          [30.01, 31.499],
          [30.0075, 31.499],
          [30.0075, 31.495],
        ],
      },
    ],
  },
  {
    id: 'icity',
    name: 'Mountain View iCity',
    nameAr: 'ماونتن فيو آي سيتي',
    developer: 'DMG Mountain View',
    avgPriceEGP: '19.8M EGP',
    roiAnnual: '17.2%',
    downPayment: '10%',
    installmentYears: 9,
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
        name: 'Club Park & Corniche',
        nameAr: 'كلوب بارك والكورنيش',
        category: 'clubhouse',
        coordinates: [
          [30.046, 31.536],
          [30.046, 31.543],
          [30.0435, 31.543],
          [30.0435, 31.536],
        ],
      },
    ],
  },
  {
    id: 'palmhills',
    name: 'Palm Hills New Cairo',
    nameAr: 'بالم هيلز نيو كايرو',
    developer: 'Palm Hills Developments',
    avgPriceEGP: '31.2M EGP',
    roiAnnual: '15.2%',
    downPayment: '10%',
    installmentYears: 8,
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
        name: 'Palm Hills Championship Golf & Lakes',
        nameAr: 'ملاعب جولف وبحيرات بالم هيلز',
        category: 'golf',
        coordinates: [
          [30.025, 31.576],
          [30.023, 31.587],
          [30.017, 31.585],
          [30.019, 31.574],
        ],
      },
    ],
  },
  {
    id: 'waterway',
    name: 'The Waterway New Cairo',
    nameAr: 'ذا ووتر واي التجمع',
    developer: 'Equinox Ventures',
    avgPriceEGP: '22.0M EGP',
    roiAnnual: '18.1%',
    downPayment: '15%',
    installmentYears: 6,
    syncedUnits: 890,
    center: [30.038, 31.494],
    polygon: [
      [30.045, 31.488],
      [30.043, 31.503],
      [30.031, 31.501],
      [30.033, 31.486],
    ],
    subfeatures: [
      {
        id: 'ww-water',
        name: 'Waterway Promenades & Lagoons',
        nameAr: 'ممشى ولاجونز ذا ووتر واي',
        category: 'lagoon',
        coordinates: [
          [30.040, 31.490],
          [30.039, 31.498],
          [30.035, 31.497],
          [30.036, 31.489],
        ],
      },
    ],
  },
];

export const DEFAULT_UNITS: PropertyUnit[] = [
  {
    id: 'se-101',
    title: 'Mivida Lakefront Standalone Villa',
    titleAr: 'فيلا مستقلة على البحيرة - ميفيدا',
    compoundId: 'mivida',
    compoundName: 'Mivida Emaar',
    priceFormatted: '42.5M EGP',
    type: 'Villa',
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
    id: 'se-102',
    title: 'Hyde Park Park-View Twinhouse',
    titleAr: 'توين هاوس إطلالة بارك - هايد بارك',
    compoundId: 'hydepark',
    compoundName: 'Hyde Park',
    priceFormatted: '26.8M EGP',
    type: 'Twinhouse',
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
    id: 'se-103',
    title: 'Mountain View iCity Lagoon iVilla',
    titleAr: 'آي فيلا على اللاجون - ماونتن فيو',
    compoundId: 'icity',
    compoundName: 'Mountain View iCity',
    priceFormatted: '18.9M EGP',
    type: 'Penthouse',
    beds: 3,
    baths: 4,
    buaSqm: 285,
    roiEstimate: '+18.2%',
    lat: 30.0415,
    lng: 31.5425,
    image:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
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

  const [mapMode, setMapMode] = useState<'obsidian' | 'satellite'>('obsidian');
  const [selectedCompoundId, setSelectedCompoundId] = useState<string>('all');
  const [activeSubfeatures, setActiveSubfeatures] = useState<Record<string, boolean>>({
    lagoon: true,
    greenspine: true,
    golf: true,
    clubhouse: true,
  });
  const [selectedUnit, setSelectedUnit] = useState<PropertyUnit | null>(properties[0] || null);

  const isAr = lang === 'ar';

  const filteredUnits = useMemo(() => {
    if (selectedCompoundId === 'all') return properties;
    return properties.filter((u) => u.compoundId === selectedCompoundId);
  }, [properties, selectedCompoundId]);

  const activeCompound = useMemo(
    () => compounds.find((c) => c.id === selectedCompoundId) || null,
    [compounds, selectedCompoundId]
  );

  // 1. Initialize Leaflet Map with Retina High-DPI Support
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30.0185, 31.495], // New Cairo / Fifth Settlement Center
      zoom: 13,
      minZoom: 11,
      maxZoom: 20,
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

  // 2. Switch between Obsidian Dark Retina & 4K Satellite Hybrid Tiles
  useEffect(() => {
    const map = mapInstanceRef.current;
    const tileGroup = tileLayerRef.current;
    if (!map || !tileGroup) return;

    tileGroup.clearLayers();

    if (mapMode === 'obsidian') {
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxNativeZoom: 19,
        maxZoom: 20,
        detectRetina: true,
        attribution: '&copy; CARTO &copy; Sierra Estates Spatial Engine',
      }).addTo(tileGroup);
    } else {
      // 4K Esri World Imagery + Dark Street Labels Hybrid
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxNativeZoom: 19,
          maxZoom: 20,
          detectRetina: true,
          attribution: '&copy; Esri &copy; Sierra Estates',
        }
      ).addTo(tileGroup);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 20,
        detectRetina: true,
      }).addTo(tileGroup);
    }
  }, [mapMode]);

  // 3. Render Masterplan GPS Polygons, Subfeatures & Luxury Price Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const overlayGroup = overlayLayerRef.current;
    if (!map || !overlayGroup) return;

    overlayGroup.clearLayers();

    // Draw Masterplan Compound Boundaries
    compounds.forEach((compound) => {
      const isFocused = selectedCompoundId === compound.id;
      const poly = L.polygon(compound.polygon, {
        color: isFocused ? '#eab308' : '#38bdf8',
        weight: isFocused ? 2.5 : 1.5,
        dashArray: isFocused ? undefined : '6, 6',
        fillColor: isFocused ? '#eab308' : '#0284c7',
        fillOpacity: isFocused ? 0.14 : 0.07,
      });

      poly.bindTooltip(
        `<div style="font-family:'Plus Jakarta Sans','Cairo',sans-serif;background:rgba(6,17,34,0.92);color:#f8fafc;padding:6px 10px;border-radius:8px;border:1px solid rgba(147,197,253,0.3);font-size:11px;font-weight:700;">
          <span style="color:#93c5fd;">${isAr ? compound.nameAr : compound.name}</span>
          <span style="color:#eab308;margin-left:6px;">(${compound.syncedUnits} Units)</span>
        </div>`,
        { sticky: true, direction: 'top', className: 'sierra-clean-tooltip' }
      );

      poly.on('click', () => {
        setSelectedCompoundId(compound.id);
        map.flyToBounds(poly.getBounds(), { padding: [50, 50], maxZoom: 15, duration: 1.1 });
      });

      poly.addTo(overlayGroup);

      // Draw Subfeatures (Crystal Lagoons, Green Spines, Golf, Clubhouses)
      compound.subfeatures.forEach((sf) => {
        if (!activeSubfeatures[sf.category]) return;
        const style = SUBFEATURE_STYLES[sf.category];
        const sfPoly = L.polygon(sf.coordinates, {
          color: style.color,
          weight: 1.8,
          fillColor: style.fillColor,
          fillOpacity: 0.35,
        });

        sfPoly.bindTooltip(
          `<span style="font-size:10px;font-weight:700;color:${style.color};">${
            isAr ? sf.nameAr : sf.name
          }</span>`,
          { direction: 'center', className: 'sierra-subfeature-tooltip' }
        );

        sfPoly.addTo(overlayGroup);
      });
    });

    // Draw Property Unit Price Pills
    filteredUnits.forEach((unit) => {
      const isSelected = selectedUnit?.id === unit.id;
      const icon = L.divIcon({
        className: 'sierra-unit-marker',
        html: `
          <div style="
            display:inline-flex;
            align-items:center;
            gap:6px;
            padding:5px 11px;
            border-radius:9999px;
            font-family:'Plus Jakarta Sans','Cairo',sans-serif;
            font-weight:800;
            font-size:11px;
            white-space:nowrap;
            transition:all 0.2s ease;
            transform:${isSelected ? 'scale(1.16) translateY(-3px)' : 'scale(1)'};
            background:${
              isSelected
                ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)'
                : 'rgba(6, 17, 34, 0.92)'
            };
            color:${isSelected ? '#020617' : '#ffffff'};
            border:1.5px solid ${isSelected ? '#fef08a' : '#38bdf8'};
            box-shadow:${
              isSelected
                ? '0 0 22px rgba(234, 179, 8, 0.65)'
                : '0 6px 18px rgba(0, 0, 0, 0.7)'
            };
          ">
            <span style="width:6px;height:6px;border-radius:50%;background:${
              isSelected ? '#020617' : '#38bdf8'
            };"></span>
            <span>${unit.priceFormatted}</span>
          </div>
        `,
        iconSize: [90, 32],
        iconAnchor: [45, 16],
      });

      const marker = L.marker([unit.lat, unit.lng], { icon });
      marker.on('click', () => {
        setSelectedUnit(unit);
        onSelectUnit?.(unit);
        map.flyTo([unit.lat, unit.lng], 16, { duration: 0.9 });
      });

      marker.addTo(overlayGroup);
    });
  }, [compounds, filteredUnits, selectedCompoundId, activeSubfeatures, selectedUnit, isAr]);

  const handleSelectCompound = (id: string) => {
    setSelectedCompoundId(id);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (id === 'all') {
      map.flyTo([30.0185, 31.495], 13, { duration: 1.1 });
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
    const msg = encodeURIComponent(
      isAr
        ? `مرحباً سييرا العقارية، أود الاستفسار عن ${unit.title} في ${unit.compoundName} (${unit.priceFormatted}).`
        : `Hello Sierra Estates, I would like to inquire about ${unit.title} at ${unit.compoundName} (${unit.priceFormatted}).`
    );
    window.open(`https://wa.me/201092048333?text=${msg}`, '_blank');
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ fontFamily: "'Plus Jakarta Sans', 'Cairo', sans-serif" }}
      className="relative w-full h-[740px] rounded-3xl overflow-hidden border border-slate-800/90 shadow-[0_25px_70px_rgba(0,0,0,0.9)] bg-[#061122] text-white select-none"
    >
      {/* TOP BAR: Obsidian Glass Masterplan Switcher & Mode Controls */}
      <div
        style={{ background: 'rgba(6, 17, 34, 0.90)', backdropFilter: 'blur(20px)' }}
        className="absolute top-4 left-4 right-4 z-[1000] rounded-2xl border border-slate-700/60 p-3 shadow-2xl flex flex-wrap items-center justify-between gap-3"
      >
        {/* Compound Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#93c5fd] px-2">
            {isAr ? 'المخططات الرئيسية:' : 'Masterplans:'}
          </span>
          <button
            type="button"
            onClick={() => handleSelectCompound('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCompoundId === c.id
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(234,179,8,0.45)]'
                  : 'bg-slate-900/80 text-white/85 hover:text-white border border-slate-800'
              }`}
            >
              {isAr ? c.nameAr : c.name}
            </button>
          ))}
        </div>

        {/* High-Res Tile Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950/90 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setMapMode('obsidian')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              mapMode === 'obsidian'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'الوضع الداكن 4K' : 'Obsidian Dark 4K'}
          </button>
          <button
            type="button"
            onClick={() => setMapMode('satellite')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              mapMode === 'satellite'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'قمر صناعي مباشر' : '4K Satellite Hybrid'}
          </button>
        </div>
      </div>

      {/* SUBFEATURE FILTER CHIPS (Lagoons, Green Spines, Golf, Clubhouses) */}
      <div
        style={{ background: 'rgba(11, 23, 42, 0.85)', backdropFilter: 'blur(16px)' }}
        className="absolute top-20 left-4 z-[1000] rounded-2xl border border-slate-800/80 px-3 py-2 flex flex-wrap items-center gap-2 shadow-xl"
      >
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#93c5fd]">
          {isAr ? 'المعالم:' : 'Layers:'}
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
                  ? 'bg-slate-900/95 text-white border-slate-600'
                  : 'bg-slate-950/40 text-slate-500 border-transparent opacity-60'
              }`}
            >
              <span
                style={{ backgroundColor: info.color }}
                className="w-2 h-2 rounded-full"
              />
              <span>{isAr ? info.labelAr : info.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* ACTIVE COMPOUND FINANCIAL INTELLIGENCE PILL */}
      {activeCompound && (
        <div
          style={{ background: 'rgba(6, 17, 34, 0.92)', backdropFilter: 'blur(20px)' }}
          className="absolute top-36 left-4 z-[1000] w-72 rounded-2xl border border-amber-500/40 p-3.5 shadow-2xl space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
              {activeCompound.developer}
            </span>
            <span className="text-[11px] font-mono text-cyan-300">
              {activeCompound.syncedUnits} Synced Units
            </span>
          </div>
          <div className="text-base font-bold text-white">
            {isAr ? activeCompound.nameAr : activeCompound.name}
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
            <div>
              <div className="text-[10px] text-[#93c5fd] font-bold">Avg Price</div>
              <div className="text-xs font-bold text-white">{activeCompound.avgPriceEGP}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#93c5fd] font-bold">Est. ROI</div>
              <div className="text-xs font-bold text-emerald-400">{activeCompound.roiAnnual}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#93c5fd] font-bold">Plan</div>
              <div className="text-xs font-bold text-amber-300">
                {activeCompound.downPayment} / {activeCompound.installmentYears}Y
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LEAFLET MAP CANVAS */}
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{
          filter:
            mapMode === 'obsidian'
              ? 'contrast(1.06) brightness(0.98) saturate(1.1)'
              : 'none',
        }}
      />

      {/* SELECTED PROPERTY SPOTLIGHT & WHATSAPP CONCIERGE CARD */}
      {selectedUnit && (
        <div
          style={{ background: 'rgba(6, 17, 34, 0.94)', backdropFilter: 'blur(22px)' }}
          className="absolute bottom-6 left-6 z-[1000] w-80 max-w-[calc(100%-3rem)] rounded-2xl border border-slate-700/80 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
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
              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-slate-950/80 text-slate-300 hover:text-white flex items-center justify-center text-xs"
            >
              ✕
            </button>
            <div className="absolute top-2.5 left-2.5 bg-amber-400 text-slate-950 font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-md">
              {selectedUnit.type}
            </div>
            <div className="absolute bottom-2.5 right-2.5 bg-emerald-500/90 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded-md">
              ROI {selectedUnit.roiEstimate}
            </div>
          </div>

          <div className="p-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-extrabold text-white">
                {selectedUnit.priceFormatted}
              </span>
              <span className="text-xs font-semibold text-[#93c5fd]">
                {selectedUnit.compoundName}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white/90 truncate">
              {isAr && selectedUnit.titleAr ? selectedUnit.titleAr : selectedUnit.title}
            </h3>

            <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-slate-800">
              <span>{selectedUnit.beds} Beds</span>
              <span>•</span>
              <span>{selectedUnit.baths} Baths</span>
              <span>•</span>
              <span>{selectedUnit.buaSqm} m² BUA</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <a
                href={`/property/${selectedUnit.id}`}
                className="py-2 text-center rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-extrabold text-xs hover:opacity-95 transition"
              >
                {isAr ? 'التفاصيل' : 'View Unit'}
              </a>
              <button
                type="button"
                onClick={() => handleWhatsApp(selectedUnit)}
                className="py-2 text-center rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-extrabold text-xs hover:bg-emerald-500/30 transition"
              >
                {isAr ? 'واتساب' : 'WhatsApp VIP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
