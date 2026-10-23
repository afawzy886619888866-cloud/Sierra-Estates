'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sun,
  Moon,
  ExternalLink,
  MapPin,
  Compass,
  Layers,
  Building2,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

export interface MiniMapHotspot {
  id: string;
  name: string;
  nameAr: string;
  dev: string;
  devAr: string;
  zone: string;
  zoneAr: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  flagCode: string;
  avgPriceM: number;
  tier: 'premier' | 'verified' | 'core';
  unitsCount?: number;
}

export const ADMIN_MINIMAP_HOTSPOTS: MiniMapHotspot[] = [
  {
    id: 'mivida',
    name: 'Mivida',
    nameAr: 'ميفيدا',
    dev: 'Emaar Misr',
    devAr: 'إعمار مصر',
    zone: 'Golden Square',
    zoneAr: 'المربع الذهبي',
    x: 49.5,
    y: 50.0,
    flagCode: 'MV',
    avgPriceM: 28.5,
    tier: 'premier',
    unitsCount: 142,
  },
  {
    id: 'hyde-park',
    name: 'Hyde Park',
    nameAr: 'هايد بارك',
    dev: 'Hyde Park Developments',
    devAr: 'هايد بارك للتطوير',
    zone: 'Golden Square',
    zoneAr: 'المربع الذهبي',
    x: 50.0,
    y: 22.0,
    flagCode: 'HP',
    avgPriceM: 22.0,
    tier: 'premier',
    unitsCount: 168,
  },
  {
    id: 'mv-hyde-park',
    name: 'Mountain View HP',
    nameAr: 'ماونتن فيو هايد بارك',
    dev: 'Mountain View',
    devAr: 'ماونتن فيو',
    zone: 'Golden Square',
    zoneAr: 'المربع الذهبي',
    x: 50.0,
    y: 36.5,
    flagCode: 'MV',
    avgPriceM: 21.0,
    tier: 'premier',
    unitsCount: 89,
  },
  {
    id: 'villette',
    name: 'Villette',
    nameAr: 'فيليت',
    dev: 'SODIC',
    devAr: 'سوديك',
    zone: 'Golden Square',
    zoneAr: 'المربع الذهبي',
    x: 58.5,
    y: 36.5,
    flagCode: 'VL',
    avgPriceM: 26.0,
    tier: 'premier',
    unitsCount: 94,
  },
  {
    id: 'palm-hills',
    name: 'Palm Hills New Cairo',
    nameAr: 'بالم هيلز القاهرة الجديدة',
    dev: 'Palm Hills',
    devAr: 'بالم هيلز',
    zone: 'Golden Square',
    zoneAr: 'المربع الذهبي',
    x: 57.0,
    y: 43.0,
    flagCode: 'PH',
    avgPriceM: 29.0,
    tier: 'premier',
    unitsCount: 112,
  },
  {
    id: 'fifth-square',
    name: 'Fifth Square',
    nameAr: 'فيفث سكوير',
    dev: 'Al Marasem',
    devAr: 'المراسم الدولية',
    zone: 'North 90th',
    zoneAr: 'التسعين الشمالي',
    x: 41.2,
    y: 49.5,
    flagCode: 'FS',
    avgPriceM: 19.5,
    tier: 'premier',
    unitsCount: 104,
  },
  {
    id: 'mv-icity',
    name: 'MV iCity',
    nameAr: 'ماونتن فيو آي سيتي',
    dev: 'Mountain View',
    devAr: 'ماونتن فيو',
    zone: '5th Settlement',
    zoneAr: 'التجمع الخامس',
    x: 33.6,
    y: 54.5,
    flagCode: 'IC',
    avgPriceM: 18.0,
    tier: 'premier',
    unitsCount: 135,
  },
  {
    id: 'the-waterway',
    name: 'The Waterway',
    nameAr: 'ذا ووتر واي',
    dev: 'The Waterway',
    devAr: 'ذا ووتر واي للتطوير',
    zone: 'North 90th',
    zoneAr: 'التسعين الشمالي',
    x: 43.5,
    y: 44.0,
    flagCode: 'WW',
    avgPriceM: 27.5,
    tier: 'premier',
    unitsCount: 52,
  },
  {
    id: 'swan-lake',
    name: 'Swan Lake Residence',
    nameAr: 'سوان ليك ريزيدنس',
    dev: 'Hassan Allam',
    devAr: 'حسن علام العقارية',
    zone: '1st Settlement',
    zoneAr: 'التجمع الأول',
    x: 35.0,
    y: 45.0,
    flagCode: 'SL',
    avgPriceM: 34.0,
    tier: 'premier',
    unitsCount: 48,
  },
  {
    id: 'katameya-heights',
    name: 'Katameya Heights',
    nameAr: 'قطامية هايتس',
    dev: 'Katameya Group',
    devAr: 'مجموعة القطامية',
    zone: 'Katameya',
    zoneAr: 'القطامية',
    x: 40.5,
    y: 76.5,
    flagCode: 'KH',
    avgPriceM: 65.0,
    tier: 'premier',
    unitsCount: 46,
  },
  {
    id: 'katameya-dunes',
    name: 'Katameya Dunes',
    nameAr: 'قطامية ديونز',
    dev: 'Katameya Group',
    devAr: 'مجموعة القطامية',
    zone: 'Katameya',
    zoneAr: 'القطامية',
    x: 49.8,
    y: 76.5,
    flagCode: 'KD',
    avgPriceM: 58.0,
    tier: 'premier',
    unitsCount: 38,
  },
  {
    id: 'cfc',
    name: 'Cairo Festival City',
    nameAr: 'كايرو فيستيفال سيتي',
    dev: 'Al-Futtaim',
    devAr: 'الفطيم العقارية',
    zone: '5th Settlement',
    zoneAr: 'التجمع الخامس',
    x: 22.2,
    y: 68.0,
    flagCode: 'CF',
    avgPriceM: 32.0,
    tier: 'premier',
    unitsCount: 92,
  },
  {
    id: 'madinaty',
    name: 'Madinaty',
    nameAr: 'مدينتي',
    dev: 'TMG',
    devAr: 'طلعت مصطفى',
    zone: 'Suez Road / Shorouk',
    zoneAr: 'طريق السويس / الشروق',
    x: 79.5,
    y: 11.5,
    flagCode: 'MD',
    avgPriceM: 14.5,
    tier: 'verified',
    unitsCount: 285,
  },
  {
    id: 'el-rehab',
    name: 'Al Rehab',
    nameAr: 'الرحاب',
    dev: 'TMG',
    devAr: 'طلعت مصطفى',
    zone: 'Suez Road',
    zoneAr: 'طريق السويس',
    x: 30.0,
    y: 11.5,
    flagCode: 'RH',
    avgPriceM: 12.5,
    tier: 'core',
    unitsCount: 210,
  },
  {
    id: 'eastown',
    name: 'Eastown Sodic',
    nameAr: 'إيست تاون سوديك',
    dev: 'SODIC',
    devAr: 'سوديك',
    zone: 'South 90th',
    zoneAr: 'التسعين الجنوبي',
    x: 46.2,
    y: 62.0,
    flagCode: 'ET',
    avgPriceM: 16.5,
    tier: 'premier',
    unitsCount: 88,
  },
  {
    id: 'zed-east',
    name: 'Zed East',
    nameAr: 'زيد إيست',
    dev: 'Ora Developers',
    devAr: 'أورا للتطوير العقاري',
    zone: 'New Cairo Ring',
    zoneAr: 'الطريق الدائري الأوسطي',
    x: 64.5,
    y: 68.0,
    flagCode: 'ZD',
    avgPriceM: 23.5,
    tier: 'premier',
    unitsCount: 75,
  },
];

export const ZONE_PRESETS = [
  { label: 'All', labelAr: 'الكل', panX: 0, panY: 0, zoom: 1 },
  { label: 'Golden Square', labelAr: 'المربع الذهبي', panX: -8, panY: 10, zoom: 1.6 },
  { label: '5th Settlement', labelAr: 'التجمع الخامس', panX: 18, panY: -8, zoom: 1.6 },
  { label: 'North 90th', labelAr: 'التسعين الشمالي', panX: 8, panY: -2, zoom: 1.6 },
  { label: 'South 90th', labelAr: 'التسعين الجنوبي', panX: 4, panY: -14, zoom: 1.6 },
  { label: 'Katameya', labelAr: 'القطامية', panX: 5, panY: -28, zoom: 1.7 },
  { label: 'Madinaty', labelAr: 'مدينتي', panX: -32, panY: 30, zoom: 1.7 },
];

export interface AdminMiniMapProps {
  isAr?: boolean;
  onNavigateAction?: (tab: string) => void;
  onSelectCompound?: (compoundName: string) => void;
}

export default function AdminMiniMap({
  isAr = false,
  onNavigateAction,
  onSelectCompound,
}: AdminMiniMapProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedHotspot, setSelectedHotspot] = useState<MiniMapHotspot | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const mapSrc =
    theme === 'dark'
      ? '/maps/new-cairo-masterplan-dark.jpg'
      : '/maps/new-cairo-masterplan-light.jpg';

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.3, 2.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.3, 1));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedHotspot(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoneSelect = (zone: typeof ZONE_PRESETS[0]) => {
    setZoom(zone.zoom);
    setPan({ x: zone.panX * 2.5, y: zone.panY * 2.5 });
  };

  return (
    <div className="relative flex flex-col rounded-2xl border border-slate-800 bg-[#0B132B]/85 overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/70 z-20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#C8961A]/20 border border-[#C8961A]/40 flex items-center justify-center text-[#E9C176] shadow-inner">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5 font-mono">
              <span>{isAr ? 'رادار المخطط العام · القاهرة الجديدة' : 'New Cairo Cartography Radar'}</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </h4>
            <p className="text-[10px] text-slate-400 font-mono">
              {isAr ? 'المخطط الاستراتيجي للكمبوندات الرئيسية' : 'Masterplan & Strategic Enclaves'}
            </p>
          </div>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-1.5">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-[#E9C176] hover:border-[#C8961A]/50 transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Masterplan' : 'Switch to Dark Masterplan'}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Reset view"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Yield Heatmap jump button */}
          {onNavigateAction && (
            <button
              type="button"
              onClick={() => onNavigateAction('heatmap')}
              className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60 text-[10px] font-mono font-bold transition-all cursor-pointer"
              title={isAr ? 'الانتقال إلى خريطة عوائد الاستثمار' : 'Inspect New Cairo Cap Rates'}
            >
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>{isAr ? 'خريطة العوائد' : 'Heatmap'}</span>
            </button>
          )}

          {/* Full Masterplan Link */}
          <Link
            href="/compounds#map"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#C8961A]/20 border border-[#C8961A]/40 text-[#E9C176] hover:bg-[#C8961A]/30 text-[10px] font-mono font-bold transition-all"
            title="Open Full Masterplan Interactive Explorer"
          >
            <span>{isAr ? 'الخريطة الكاملة' : 'Full Map'}</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Zone fast switcher */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-950/50 border-b border-slate-800/50 overflow-x-auto scrollbar-none text-[10px] font-mono z-10">
        <span className="text-slate-500 mr-1 flex items-center gap-1 shrink-0">
          <Layers className="w-3 h-3" />
          <span>{isAr ? 'المنطقة:' : 'Zone:'}</span>
        </span>
        {ZONE_PRESETS.map((z) => (
          <button
            key={z.label}
            type="button"
            onClick={() => handleZoneSelect(z)}
            className="px-2 py-0.5 rounded bg-slate-900/80 hover:bg-[#C8961A]/20 hover:text-[#E9C176] text-slate-300 border border-slate-800 hover:border-[#C8961A]/40 transition-colors whitespace-nowrap cursor-pointer"
          >
            {isAr ? z.labelAr : z.label}
          </button>
        ))}
      </div>

      {/* Map viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative w-full h-80 bg-slate-950 overflow-hidden cursor-${isDragging ? 'grabbing' : 'grab'} select-none`}
      >
        <div
          className="absolute inset-0 transition-transform duration-100 ease-out origin-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* Base illustrated masterplan map */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mapSrc}
            alt="New Cairo Illustrated Masterplan Cartography"
            className="w-full h-full object-cover object-center pointer-events-none"
            loading="lazy"
          />

          {/* Interactive compound hotspot pins */}
          {ADMIN_MINIMAP_HOTSPOTS.map((spot) => {
            const isSelected = selectedHotspot?.id === spot.id;
            return (
              <button
                key={spot.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedHotspot(isSelected ? null : spot);
                  if (onSelectCompound) onSelectCompound(spot.name);
                }}
                className={`absolute group -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 transition-transform ${
                  isSelected ? 'scale-125 z-30' : 'hover:scale-115'
                }`}
                style={{
                  left: `${spot.x}%`,
                  top: `${spot.y}%`,
                }}
              >
                {/* Pin badge */}
                <div
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-mono font-bold shadow-lg transition-all ${
                    isSelected
                      ? 'bg-[#E9C176] text-slate-950 border-white ring-2 ring-[#C8961A]'
                      : 'bg-slate-900/90 text-[#F5D78E] border-[#C8961A]/60 hover:bg-[#C8961A] hover:text-slate-950'
                  }`}
                >
                  <MapPin className="w-2.5 h-2.5 text-[#C8961A] group-hover:text-slate-950" />
                  <span>{spot.flagCode}</span>
                </div>

                {/* Subtle pulse aura */}
                <span className="absolute -inset-1 rounded-full bg-[#C8961A]/20 -z-10 animate-ping opacity-60 pointer-events-none" />
              </button>
            );
          })}
        </div>

        {/* Selected Compound Overlay Info Card */}
        {selectedHotspot && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs p-3 rounded-xl bg-slate-950/95 border border-[#C8961A]/60 shadow-2xl backdrop-blur-xl z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-[#C8961A]/20 border border-[#C8961A]/40 text-[#E9C176] font-mono text-[9px] font-bold">
                    {selectedHotspot.flagCode}
                  </span>
                  <h5 className="text-xs font-bold text-white font-mono">
                    {isAr ? selectedHotspot.nameAr : selectedHotspot.name}
                  </h5>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  {isAr ? `${selectedHotspot.devAr} · ${selectedHotspot.zoneAr}` : `${selectedHotspot.dev} · ${selectedHotspot.zone}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHotspot(null)}
                className="text-slate-400 hover:text-white text-xs p-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800 text-[10px] font-mono">
              <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[9px]">
                  {isAr ? 'متوسط السعر' : 'Avg Resale'}
                </span>
                <span className="font-bold text-[#E9C176]">~{selectedHotspot.avgPriceM}M EGP</span>
              </div>
              <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[9px]">
                  {isAr ? 'الوحدات المتاحة' : 'Units'}
                </span>
                <span className="font-bold text-emerald-400">{selectedHotspot.unitsCount ?? '—'}</span>
              </div>
            </div>

            {/* Direct Interactive Actions */}
            <div className="flex items-center gap-1.5 mt-2.5">
              {onNavigateAction ? (
                <button
                  type="button"
                  onClick={() => onNavigateAction('inventory_command')}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-linear-to-r from-[#C8961A] to-[#E9C176] text-slate-950 text-[10px] font-mono font-bold hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-md"
                >
                  <Building2 className="w-3 h-3" />
                  <span>{isAr ? 'فتح في المخزون' : 'Open in Inventory'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <Link
                  href={`/properties?search=${encodeURIComponent(selectedHotspot.name)}`}
                  target="_blank"
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-[#C8961A]/30 border border-[#C8961A]/60 text-[#F5D78E] text-[10px] font-mono font-bold hover:bg-[#C8961A]/50 transition-colors"
                >
                  <span>{isAr ? 'عرض العقارات' : 'View Listings'}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}

              {onNavigateAction && (
                <button
                  type="button"
                  onClick={() => onNavigateAction('heatmap')}
                  title={isAr ? 'تحليل العوائد الاستثمارية' : 'View Investment Cap Rates'}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-600/50 transition-colors cursor-pointer"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Small Compass / Legend watermark */}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[9px] font-mono text-slate-400 pointer-events-none">
          Zoom: {zoom.toFixed(1)}x
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 bg-slate-950/80 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1">
          <span className="text-[#C8961A]">●</span>
          {isAr
            ? 'انقر واسحب للتنقل · انقر فوق أي دبوس لعرض تفاصيل الكمبوند وربطه بالمخزون'
            : 'Click & drag to pan · Click any pin to open compound specs & wire to inventory'}
        </span>
        <span className="text-slate-500 hidden sm:inline">New Cairo Masterplan</span>
      </div>
    </div>
  );
}
