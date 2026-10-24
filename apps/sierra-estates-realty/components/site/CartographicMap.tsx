'use client';
import React, { useState, useRef } from 'react';
import { 
  Compound, 
  UnitListing, 
  COMPOUNDS, 
  UNIT_LISTINGS, 
  ARTERY_ROADS 
} from '@/lib/registryData';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  ArrowRight,
  Table2,
  Navigation,
  Sparkles,
  Maximize2,
  Sun,
  Moon
} from 'lucide-react';

interface CartographicMapProps {
  lang: 'en' | 'ar';
  isDarkMode: boolean;
  onToggleTheme?: () => void;
  onSelectCompoundToExcel: (compound: Compound) => void;
  onSelectUnit: (unit: UnitListing) => void;
}

export const CartographicMap: React.FC<CartographicMapProps> = ({
  lang,
  isDarkMode,
  onToggleTheme,
  onSelectCompoundToExcel,
  onSelectUnit,
}) => {
  const isAr = lang === 'ar';
  
  const [activeZoneFilter, setActiveZoneFilter] = useState<string>('all');
  const [showRadarRings, setShowRadarRings] = useState<boolean>(true);
  const [showRoadLabels, setShowRoadLabels] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredCompoundId, setHoveredCompoundId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Filter compounds by active zone filter
  const filteredCompounds = activeZoneFilter === 'all' 
    ? COMPOUNDS 
    : activeZoneFilter === 'golden-square'
      ? COMPOUNDS.filter(c => c.zoneEn.includes('Golden Square'))
      : activeZoneFilter === 'suez-axis'
        ? COMPOUNDS.filter(c => c.zoneEn.includes('Suez'))
        : activeZoneFilter === 'southern'
          ? COMPOUNDS.filter(c => c.zoneEn.includes('South') || c.zoneEn.includes('Sokhna'))
          : COMPOUNDS;

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 2.8));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.85));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="w-full flex flex-col items-center">
      
      {/* Top Map Action Toolbar */}
      <div className={`w-full max-w-7xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs border-b ${
        isDarkMode ? 'border-amber-900/20 bg-[#080F1D]' : 'border-[#E6DEC8] bg-[#F7F3EB]'
      }`}>
        {/* Zone Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
          <span className="text-stone-400 font-medium mr-1 uppercase tracking-wider text-[11px] whitespace-nowrap">
            {isAr ? 'تصفية المناطق:' : 'Filter Zones:'}
          </span>
          {[
            { id: 'all', en: 'All 18 Master Enclaves', ar: 'جميع المشروعات (18)' },
            { id: 'golden-square', en: 'Golden Square (المربع الذهبي)', ar: 'المربع الذهبي' },
            { id: 'suez-axis', en: 'Suez Road Axis', ar: 'محور طريق السويس' },
            { id: 'southern', en: 'South 90th & Sokhna', ar: 'التسعين الجنوبي والسخنة' },
          ].map(z => (
            <button
              key={z.id}
              onClick={() => setActiveZoneFilter(z.id)}
              className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                activeZoneFilter === z.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white/70 dark:bg-stone-800/70 text-stone-700 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-amber-950/40 border border-stone-200 dark:border-stone-700'
              }`}
            >
              {isAr ? z.ar : z.en}
            </button>
          ))}
        </div>

        {/* View Toggles & Zoom Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowRadarRings(!showRadarRings)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 cursor-pointer transition-colors ${
              showRadarRings
                ? 'bg-amber-500/15 border-amber-600 text-amber-700 dark:text-amber-300'
                : 'bg-transparent border-stone-300 dark:border-stone-700 text-stone-500'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isAr ? 'حلقات AUC' : 'AUC Radar'}</span>
          </button>

          <button
            onClick={() => setShowRoadLabels(!showRoadLabels)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 cursor-pointer transition-colors ${
              showRoadLabels
                ? 'bg-amber-500/15 border-amber-600 text-amber-700 dark:text-amber-300'
                : 'bg-transparent border-stone-300 dark:border-stone-700 text-stone-500'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>{isAr ? 'المحاور الرئيسية' : 'Expressways'}</span>
          </button>

          <div className="flex items-center border border-stone-300 dark:border-stone-700 rounded-md overflow-hidden bg-white/70 dark:bg-stone-800/70">
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-mono font-medium text-stone-600 dark:text-stone-400 border-x border-stone-200 dark:border-stone-700">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Reset Zoom & Pan"
              className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 cursor-pointer border-l border-stone-200 dark:border-stone-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 cursor-pointer transition-all shadow-sm ${
                isDarkMode
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-amber-400/80 text-amber-300 hover:border-amber-300'
                  : 'bg-stone-900 border-stone-800 text-amber-300 hover:bg-stone-800 hover:border-amber-500/50'
              }`}
              title={isDarkMode ? (isAr ? 'التبديل إلى الخريطة النهارية' : 'Switch to Light Edition') : (isAr ? 'التبديل إلى الخريطة الليلية الداكنة' : 'Switch to Dark Obsidian Edition')}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-300 animate-spin-slow" /> : <Moon className="w-4 h-4 text-amber-300" />}
              <span className="font-extrabold tracking-wide">
                {isDarkMode ? (isAr ? 'النسخة النهارية' : 'Light Edition') : (isAr ? 'النسخة الداكنة' : 'Dark Edition')}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Cartographic Frame Container */}
      <div className="w-full max-w-7xl p-2 sm:p-4">
        {/* Double Border Editorial Frame */}
        <div className={`relative w-full rounded-2xl overflow-hidden border-2 shadow-2xl transition-all ${
          isDarkMode 
            ? 'border-amber-900/40 bg-[#060D19]' 
            : 'border-[#B8860B]/40 bg-[#FAF8F5]'
        }`}>
          
          {/* Inner hairline framing line */}
          <div className="absolute inset-1.5 rounded-xl border border-amber-600/20 pointer-events-none z-30" />

          {/* Interactive Map Viewport with Pan and Zoom */}
          <div 
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="relative w-full aspect-[16/9] min-h-[520px] overflow-hidden cursor-grab active:cursor-grabbing select-none"
          >
            {/* Transform Canvas Layer */}
            <div 
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                transformOrigin: '50% 50%',
                transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="absolute inset-0 w-full h-full"
            >
              {/* Base Cartographic Backdrop Image (Crystal Clear & Dual-Theme: Dark Obsidian vs Light Editorial) */}
              <img
                src={isDarkMode ? "/maps/new-cairo-masterplan-dark.jpg" : "/maps/new-cairo-masterplan-light.jpg"}
                alt={isDarkMode ? "New Cairo City Master Registry Map (Dark Edition)" : "New Cairo City Master Registry Map (Light Edition)"}
                className="w-full h-full object-cover select-none pointer-events-none transition-all duration-300"
                draggable={false}
              />

              {/* SVG Overlay: Delicate Glowing White Thin Lines around each compound! */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-15" viewBox="0 0 1000 562.5">
                <defs>
                  {/* Subtle white-gold neon glow filter */}
                  <filter id="whiteGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur1" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur2" />
                    <feMerge>
                      <feMergeNode in="blur1" />
                      <feMergeNode in="blur2" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Concentric Radar Overlay from AUC Epicenter */}
                {showRadarRings && (
                  <g opacity="0.6">
                    <circle cx="498" cy="285" r="42" fill="none" stroke="#FFFFFF" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.5" />
                    <circle cx="498" cy="285" r="95" fill="none" stroke="#38BDF8" strokeWidth="1" opacity="0.35" />
                    <circle cx="498" cy="285" r="150" fill="none" stroke="#38BDF8" strokeWidth="0.9" strokeDasharray="4 4" opacity="0.3" />
                    <circle cx="498" cy="285" r="210" fill="none" stroke="#D4AF37" strokeWidth="1" opacity="0.35" />
                    <circle cx="498" cy="285" r="280" fill="none" stroke="#38BDF8" strokeWidth="0.8" strokeDasharray="6 4" opacity="0.2" />
                  </g>
                )}

                {/* Compound Subtle White Thin Boundaries */}
                {filteredCompounds.map(c => {
                  const cx = (c.xPct / 100) * 1000;
                  const cy = (c.yPct / 100) * 562.5;
                  const isHovered = c.id === hoveredCompoundId;

                  return (
                    <g key={c.id}>
                      {/* Subtle thin white line defining compound boundary */}
                      <ellipse
                        cx={cx}
                        cy={cy}
                        rx={c.boundaryRadiusX}
                        ry={c.boundaryRadiusY}
                        fill={isHovered ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.02)'}
                        stroke={isHovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)'}
                        strokeWidth={isHovered ? 2.2 : 0.8}
                        strokeDasharray={isHovered ? 'none' : '3 3'}
                        filter={isHovered ? 'url(#whiteGlow)' : undefined}
                        className="transition-all duration-300"
                      />

                      {/* Little thin line pointer & index marker when hovered */}
                      {isHovered && (
                        <g>
                          <line
                            x1={cx}
                            y1={cy - c.boundaryRadiusY}
                            x2={cx}
                            y2={cy - c.boundaryRadiusY - 14}
                            stroke="#FFFFFF"
                            strokeWidth="1.5"
                            filter="url(#softGlow)"
                          />
                          <circle
                            cx={cx}
                            cy={cy - c.boundaryRadiusY - 14}
                            r="3"
                            fill="#FFFFFF"
                            filter="url(#whiteGlow)"
                          />
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Road Axis Floating Badges */}
              {showRoadLabels && (
                <div className="absolute inset-0 pointer-events-none z-15">
                  <div className="absolute top-[13%] left-[47%] -translate-x-1/2 px-2 py-0.5 rounded-sm bg-black/40 text-stone-200 text-[10px] font-mono tracking-wider backdrop-blur-xs">
                    Cairo Ring Road · الطريق الدائري
                  </div>
                  <div className="absolute top-[8%] left-[72%] -translate-x-1/2 px-2 py-0.5 rounded-sm bg-black/40 text-stone-200 text-[10px] font-mono tracking-wider backdrop-blur-xs">
                    Suez-Cairo Desert Road · طريق السويس
                  </div>
                  <div className="absolute bottom-[23%] left-[40%] -translate-x-1/2 px-2 py-0.5 rounded-sm bg-black/40 text-stone-200 text-[10px] font-mono tracking-wider backdrop-blur-xs">
                    Middle Ring Road · الدائري الأوسطي
                  </div>
                  <div className="absolute bottom-[7%] left-[58%] -translate-x-1/2 px-2 py-0.5 rounded-sm bg-black/40 text-stone-200 text-[10px] font-mono tracking-wider backdrop-blur-xs">
                    Ain Sokhna Road · طريق العين السخنة
                  </div>
                  <div className="absolute top-[50%] left-[57%] -translate-x-1/2 px-2 py-0.5 rounded-sm bg-amber-950/60 text-amber-300 text-[10px] font-mono tracking-wider backdrop-blur-xs">
                    90th Street · شارع التسعين
                  </div>
                </div>
              )}

              {/* Interactive Transparent Hit Targets & Floating Popup Signs (No heavy marks over text!) */}
              {filteredCompounds.map(compound => {
                const isHovered = compound.id === hoveredCompoundId;

                return (
                  <div
                    key={compound.id}
                    style={{
                      left: `${compound.xPct}%`,
                      top: `${compound.yPct}%`,
                      width: `${compound.boundaryRadiusX * 2}px`,
                      height: `${compound.boundaryRadiusY * 2}px`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // As requested: "press on it units in this compounds apears like its excel sheet and make the units apears in the next page"
                      onSelectCompoundToExcel(compound);
                    }}
                    onMouseEnter={() => setHoveredCompoundId(compound.id)}
                    onMouseLeave={() => setHoveredCompoundId(null)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group flex items-center justify-center"
                    title={`Click to open ${compound.nameEn} Excel Sheet`}
                  >
                    {/* Quiet, delicate number pill that glows on hover */}
                    <div className={`px-1.5 py-0.5 rounded-xs text-[9px] font-mono font-bold tracking-widest transition-all duration-200 pointer-events-none ${
                      isHovered
                        ? 'bg-white text-stone-900 shadow-[0_0_15px_rgba(255,255,255,0.9)] scale-110'
                        : 'bg-black/30 text-white/70 border border-white/20'
                    }`}>
                      № {compound.indexNumber < 10 ? `0${compound.indexNumber}` : compound.indexNumber}
                    </div>

                    {/* DYNAMIC POP-UP SIGN (Appears right above compound when hovered/approached) */}
                    {isHovered && (
                      <div 
                        className="absolute bottom-[105%] left-1/2 -translate-x-1/2 z-30 pointer-events-auto min-w-[230px] max-w-[270px] animate-fade-in"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCompoundToExcel(compound);
                        }}
                      >
                        <div className="p-3 rounded-xl bg-[#0F172A]/95 text-white border-2 border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.7)] backdrop-blur-md">
                          
                          {/* Top Kicker */}
                          <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-white/20 text-[10px] font-mono">
                            <span className="text-amber-300 font-bold">
                              № {compound.indexNumber < 10 ? `0${compound.indexNumber}` : compound.indexNumber} · {compound.zoneEn}
                            </span>
                            <span className="text-emerald-400 font-semibold">
                              {compound.unitsCount} Units
                            </span>
                          </div>

                          {/* Compound Title */}
                          <div className="font-cinzel font-extrabold text-sm tracking-wide text-white">
                            {compound.nameEn}
                          </div>
                          <div className="font-cairo font-bold text-xs text-amber-200">
                            {compound.nameAr}
                          </div>

                          {/* Pricing & Rent Summary */}
                          <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-[10px] font-mono">
                            <div>
                              <span className="text-stone-400 block text-[9px]">Resale from:</span>
                              <span className="font-bold text-amber-300">
                                EGP {(compound.startingPriceEgp / 1000000).toFixed(1)}M
                              </span>
                            </div>
                            <div>
                              <span className="text-stone-400 block text-[9px]">Rent from:</span>
                              <span className="font-bold text-emerald-400">
                                EGP {(compound.startingRentEgp / 1000).toFixed(0)}k/mo
                              </span>
                            </div>
                          </div>

                          {/* CTA Prompt */}
                          <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] font-semibold text-emerald-400 group-hover:text-emerald-300">
                            <span className="flex items-center gap-1">
                              <Table2 className="w-3 h-3" />
                              <span>{isAr ? 'فتح في شيت الإكسيل' : 'Open in Excel Sheet'}</span>
                            </span>
                            <ArrowRight className="w-3 h-3" />
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

            </div>

            {/* Bottom Left: Vintage Compass Rose & Metric Scale Bar */}
            <div className="absolute bottom-4 left-4 z-30 pointer-events-none flex flex-col items-start gap-2">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                <svg className="w-full h-full drop-shadow-md" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="#D4AF37" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#D4AF37" strokeWidth="1.2" opacity="0.8" />
                  <polygon points="50,6 45,50 50,44" fill="#B8860B" />
                  <polygon points="50,6 55,50 50,44" fill="#E5C158" />
                  <polygon points="50,94 45,50 50,56" fill="#78350F" />
                  <polygon points="50,94 55,50 50,56" fill="#B8860B" />
                  <polygon points="94,50 50,45 56,50" fill="#E5C158" />
                  <polygon points="94,50 50,55 56,50" fill="#B8860B" />
                  <polygon points="6,50 50,45 44,50" fill="#78350F" />
                  <polygon points="6,50 50,55 44,50" fill="#B8860B" />
                  <text x="50" y="4" textAnchor="middle" fill="#B8860B" fontSize="8" fontWeight="bold" fontFamily="Cinzel">N</text>
                  <text x="96" y="52" textAnchor="start" fill="#B8860B" fontSize="8" fontWeight="bold" fontFamily="Cinzel">E</text>
                  <text x="50" y="99" textAnchor="middle" fill="#B8860B" fontSize="8" fontWeight="bold" fontFamily="Cinzel">S</text>
                  <text x="2" y="52" textAnchor="end" fill="#B8860B" fontSize="8" fontWeight="bold" fontFamily="Cinzel">W</text>
                </svg>
              </div>

              <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-xs px-2.5 py-1 rounded-sm border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200">
                <div className="flex items-center justify-between text-[9px] font-mono tracking-wider">
                  <span>0</span>
                  <span>1</span>
                  <span className="font-bold">METRIC</span>
                  <span>3 KM</span>
                </div>
                <div className="w-28 h-1.5 border border-stone-800 dark:border-stone-200 flex mt-0.5">
                  <div className="w-1/3 bg-stone-900 dark:bg-stone-100" />
                  <div className="w-1/3 bg-transparent" />
                  <div className="w-1/3 bg-stone-900 dark:bg-stone-100" />
                </div>
              </div>
            </div>

            {/* Bottom Right: Sierra Estates Monogram Logo Seal & Signature */}
            <div className="absolute bottom-4 right-4 z-30 pointer-events-none flex items-center gap-3 bg-white/85 dark:bg-stone-950/85 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-amber-500/40 shadow-lg">
              <div className="w-9 h-9 rounded-lg overflow-hidden border border-amber-500/50 bg-stone-900 shrink-0 p-0.5">
                <img 
                  src="/assets/aistudio/8e9559f6f_image__1__4350f848.png" 
                  alt="Sierra Estates Seal"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-cinzel font-bold text-xs tracking-wider text-stone-900 dark:text-stone-100">
                  SIERRA ESTATES
                </span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400">
                  New Cairo Master Plan 2026
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Fast Instruction Strip */}
      <div className={`w-full max-w-7xl px-4 py-3 border-t flex flex-wrap items-center justify-between gap-4 text-xs ${
        isDarkMode ? 'border-amber-900/20 bg-[#080F1D] text-stone-300' : 'border-[#E6DEC8] bg-[#F7F3EB] text-stone-700'
      }`}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-medium">
            {isAr 
              ? 'مرر الماوس فوق أي مشروع لظهور حدوده المضيئة ورقم الوحدة، واضغط عليه لفتح جدول الإكسيل الشامل لوحدات الإيجار وإعادة البيع.'
              : 'Hover near any compound to see its glowing perimeter and index number. Click on it to open its full Excel inventory sheet.'
            }
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-stone-400 font-mono text-[11px]">
            {filteredCompounds.length} Active Enclaves
          </span>
        </div>
      </div>

    </div>
  );
};

export default CartographicMap;
