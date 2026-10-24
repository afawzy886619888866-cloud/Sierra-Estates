'use client';
import React, { useState, useRef, useEffect } from 'react';
import { 
  Compound, 
  UnitListing, 
  COMPOUNDS, 
  UNIT_LISTINGS, 
  ARTERY_ROADS 
} from './registryData';
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
  Minimize2,
  Sun,
  Moon,
  Compass,
  CheckCircle2,
  Flame
} from 'lucide-react';

interface CartographicMapProps {
  lang: 'en' | 'ar';
  isDarkMode: boolean;
  onSelectCompoundToExcel: (compound: Compound) => void;
  onSelectUnit: (unit: UnitListing) => void;
  onToggleTheme?: () => void;
}

export const CartographicMap: React.FC<CartographicMapProps> = ({
  lang,
  isDarkMode,
  onSelectCompoundToExcel,
  onSelectUnit,
  onToggleTheme,
}) => {
  const isAr = lang === 'ar';
  
  const [activeZoneFilter, setActiveZoneFilter] = useState<string>('all');
  const [mapStyle, setMapStyle] = useState<'previous' | 'vector'>('previous');
  const [showRadarRings, setShowRadarRings] = useState<boolean>(true);
  const [showRoadLabels, setShowRoadLabels] = useState<boolean>(true);
  const [showYieldHeatmap, setShowYieldHeatmap] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredCompoundId, setHoveredCompoundId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

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

  // Zoom handlers with smooth clamping
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.35, 4.0));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.35, 0.8));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Mouse wheel zoom anchored to pointer
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    const newZoom = Math.min(Math.max(zoomLevel + delta, 0.8), 4.0);
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const pointerX = e.clientX - rect.left - rect.width / 2;
      const pointerY = e.clientY - rect.top - rect.height / 2;
      const factor = newZoom / zoomLevel;
      setPanOffset(prev => ({
        x: pointerX - (pointerX - prev.x) * factor,
        y: pointerY - (pointerY - prev.y) * factor,
      }));
    }
    setZoomLevel(newZoom);
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

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!frameRef.current) return;
    if (!document.fullscreenElement) {
      frameRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Local theme state if not externally controlled, or synced
  const [internalDarkMode, setInternalDarkMode] = useState<boolean>(isDarkMode);
  
  useEffect(() => {
    setInternalDarkMode(isDarkMode);
  }, [isDarkMode]);

  const activeDarkMode = onToggleTheme ? isDarkMode : internalDarkMode;
  const toggleThemeMode = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      setInternalDarkMode(prev => !prev);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      
      {/* Top Map Action Toolbar */}
      <div className={`w-full max-w-7xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs border-b transition-colors ${
        activeDarkMode ? 'border-amber-900/30 bg-[#061122]' : 'border-[#E6DEC8] bg-[#FAF8F5]'
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
                  : activeDarkMode 
                    ? 'bg-[#0B192C]/80 text-stone-300 hover:bg-amber-950/40 border border-stone-700/60'
                    : 'bg-white/80 text-stone-700 hover:bg-amber-100/50 border border-stone-200'
              }`}
            >
              {isAr ? z.ar : z.en}
            </button>
          ))}
        </div>

        {/* View Toggles, Theme Toggle & Zoom Controls */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Prominent Dark & Light Edition Toggle Button (Sierra Estates brand identity) */}
          <button
            onClick={toggleThemeMode}
            title={activeDarkMode ? 'التبديل إلى النسخة المضيئة (Alabaster Light Edition)' : 'التبديل إلى النسخة الليلية (Midnight Obsidian Edition)'}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 cursor-pointer transition-all shadow-sm ${
              activeDarkMode 
                ? 'bg-[#0B192C] border-amber-400/50 text-amber-300 hover:border-amber-300 hover:bg-[#11243E]' 
                : 'bg-white border-amber-600/40 text-amber-800 hover:border-amber-600 hover:bg-amber-50'
            }`}
          >
            {activeDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                <span>{isAr ? 'النسخة المضيئة' : 'Light Edition'}</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-amber-700" />
                <span>{isAr ? 'النسخة الليلية' : 'Dark Edition'}</span>
              </>
            )}
          </button>

          {/* AUC Radar Rings Toggle */}
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

          {/* Expressways Toggle */}
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

          {/* Yield Heatmap Overlay Toggle */}
          <button
            onClick={() => setShowYieldHeatmap(!showYieldHeatmap)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-colors ${
              showYieldHeatmap
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-300 shadow-xs'
                : 'bg-transparent border-stone-300 dark:border-stone-700 text-stone-500 hover:text-cyan-500'
            }`}
            title={isAr ? 'عرض الخريطة الحرارية للعوائد الإيجارية' : 'Toggle Rental Yield Heatmap Overlay'}
          >
            <Flame className="w-3.5 h-3.5 text-cyan-500" />
            <span>{isAr ? 'طبقة العوائد' : 'Yield Heat'}</span>
          </button>

          {/* Map Base Style Switcher: Previous Authentic Map vs Vector Edition */}
          <button
            onClick={() => setMapStyle(mapStyle === 'previous' ? 'vector' : 'previous')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-colors ${
              mapStyle === 'previous'
                ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 shadow-xs'
                : 'bg-transparent border-stone-300 dark:border-stone-700 text-stone-500 hover:text-amber-600'
            }`}
            title={isAr ? 'التبديل بين الخريطة الأصلية السابقة والنمط الكارتوغرافي' : 'Toggle between Previous Authentic Masterplan and Vector Cartographic Edition'}
          >
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>{mapStyle === 'previous' ? (isAr ? 'الخريطة الأصلية' : 'Authentic Map') : (isAr ? 'الخريطة المتجهة' : 'Vector Map')}</span>
          </button>

          {/* Zoom Buttons & Percentage Indicator */}
          <div className="flex items-center border border-stone-300 dark:border-stone-700 rounded-md overflow-hidden bg-white/70 dark:bg-stone-800/70">
            <button
              onClick={handleZoomIn}
              title="Zoom In (تكبير)"
              className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-mono font-medium text-stone-600 dark:text-stone-400 border-x border-stone-200 dark:border-stone-700 min-w-[46px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomOut}
              title="Zoom Out (تصغير)"
              className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Reset Zoom & Pan (إعادة الضبط)"
              className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 cursor-pointer border-l border-stone-200 dark:border-stone-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-md border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:text-amber-600 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Cartographic Frame Container */}
      <div className="w-full max-w-7xl p-2 sm:p-4" ref={frameRef}>
        {/* Double Border Editorial Frame */}
        <div className={`relative w-full rounded-2xl overflow-hidden border-2 shadow-2xl transition-all duration-300 ${
          activeDarkMode 
            ? 'border-amber-500/40 bg-[#061122]' 
            : 'border-[#D4AF37]/50 bg-[#FAF8F5]'
        }`}>
          
          {/* Inner hairline framing line */}
          <div className="absolute inset-1.5 rounded-xl border border-amber-500/20 dark:border-amber-400/20 pointer-events-none z-30" />

          {/* Top Title Banner */}
          <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-4 py-1.5 rounded-full border backdrop-blur-md shadow-lg text-center max-w-[92%] transition-all ${
            activeDarkMode 
              ? 'bg-[#061122]/92 border-amber-500/50 text-stone-100' 
              : 'bg-[#FAF8F5]/95 border-amber-600/40 text-stone-900 shadow-stone-400/20'
          }`}>
            <span className="font-cinzel font-extrabold text-[10px] sm:text-xs tracking-widest uppercase">
              {activeDarkMode 
                ? (isAr ? 'النسخة الليلية الفاخرة · SIERRA NOCTURNE' : 'SIERRA ESTATES · OBSIDIAN NOCTURNE MASTERPLAN') 
                : (isAr ? 'النسخة المضيئة الملكية · SIERRA ALABASTER' : 'SIERRA ESTATES · ROYAL ALABASTER MASTERPLAN')}
            </span>
            <span className="mx-2 text-amber-500 font-bold">·</span>
            <span className="text-[10px] font-mono tracking-wider text-cyan-500 font-semibold">
              sierra-estates.net
            </span>
            <span className="mx-2 text-stone-400">·</span>
            <span className="text-[10px] font-mono tracking-wider text-amber-500 font-semibold">
              {isAr ? 'المخطط الأصلي للقاهرة الجديدة 2026' : 'New Cairo Master Registry 2026'}
            </span>
          </div>

          {/* In-Map Quick Dark/Light Switcher Pill */}
          <div className="absolute top-3 right-3 z-35 flex items-center">
            <button
              onClick={toggleThemeMode}
              title={activeDarkMode ? 'التبديل إلى النسخة المضيئة (Light)' : 'التبديل إلى النسخة الليلية (Dark)'}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border backdrop-blur-md flex items-center gap-1.5 cursor-pointer shadow-lg transition-all ${
                activeDarkMode
                  ? 'bg-[#0B192C]/90 border-amber-400/60 text-amber-300 hover:bg-[#132845]'
                  : 'bg-white/95 border-amber-600/50 text-amber-900 hover:bg-amber-50 shadow-md'
              }`}
            >
              {activeDarkMode ? (
                <>
                  <Sun className="w-3 h-3 text-amber-400" />
                  <span>{isAr ? 'فاتح' : 'Light'}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3 h-3 text-amber-700" />
                  <span>{isAr ? 'غامق' : 'Dark'}</span>
                </>
              )}
            </button>
          </div>

          {/* Interactive Map Viewport with Smooth Pan and Wheel Zoom */}
          <div 
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className="relative w-full aspect-[16/9] min-h-[540px] overflow-hidden cursor-grab active:cursor-grabbing select-none"
          >
            {/* High-Resolution 4K + Infinite Vector Zoom Layer (Uses layout dimensions instead of GPU bitmap stretch so zooming never pixelates) */}
            <div 
              style={{
                width: `${zoomLevel * 100}%`,
                height: `${zoomLevel * 100}%`,
                left: `${50 - zoomLevel * 50}%`,
                top: `${50 - zoomLevel * 50}%`,
                transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                transition: isDragging ? 'none' : 'width 0.16s ease-out, height 0.16s ease-out, left 0.16s ease-out, top 0.16s ease-out, transform 0.16s ease-out',
              }}
              className="absolute"
            >
              {/* Base Authentic 4K Ultra-HD Cartographic Backdrop Image (3840x2143) with Dedicated Dark & Light Editions */}
              <img
                src={activeDarkMode 
                  ? '/assets/aistudio/Image_1_dark_4k.jpeg' 
                  : '/assets/aistudio/Image_1_f1dc350b.jpeg'
                }
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes('Image_1_f1dc350b.jpeg')) {
                    target.src = '/assets/aistudio/Image_1_f1dc350b.jpeg';
                  }
                }}
                alt={activeDarkMode ? "New Cairo City 4K Master Registry Map (Dark Edition)" : "New Cairo City 4K Master Registry Map (Light Edition)"}
                decoding="sync"
                fetchPriority="high"
                className="w-full h-full object-cover select-none pointer-events-none transition-opacity duration-300"
                style={{
                  filter: activeDarkMode 
                    ? 'url(#ultraHdSharpen) contrast(1.12) saturate(1.08)' 
                    : 'url(#ultraHdSharpen) brightness(1.02) contrast(1.08) saturate(1.06)',
                }}
                draggable={false}
              />

              {/* Luxury Palette Overlay Tint matching Sierra Estates */}
              {activeDarkMode ? (
                <div 
                  className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-500"
                  style={{
                    background: 'radial-gradient(ellipse at 50% 50%, rgba(6, 17, 34, 0.18) 0%, rgba(6, 17, 34, 0.62) 100%)',
                    mixBlendMode: 'multiply',
                  }}
                />
              ) : (
                <div 
                  className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-500"
                  style={{
                    background: 'radial-gradient(ellipse at 50% 50%, rgba(250, 248, 245, 0.04) 0%, rgba(250, 248, 245, 0.18) 100%)',
                    mixBlendMode: 'soft-light',
                  }}
                />
              )}

              {/* Subtle Editorial Edge Vignette */}
              <div className={`absolute inset-0 pointer-events-none z-12 transition-all duration-500 ${
                activeDarkMode 
                  ? 'bg-gradient-to-t from-[#061122]/70 via-transparent to-[#061122]/50 shadow-[inset_0_0_90px_rgba(6,17,34,0.85)]' 
                  : 'bg-gradient-to-t from-[#FAF8F5]/30 via-transparent to-[#FAF8F5]/20 shadow-[inset_0_0_60px_rgba(180,83,9,0.08)]'
              }`} />

              {/* Infinite-Resolution SVG Vector CAD Overlay: Geometric Precision at Any Zoom Level */}
              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none z-15" 
                viewBox="0 0 1000 562.5"
                preserveAspectRatio="xMidYMid meet"
                shapeRendering="geometricPrecision"
                textRendering="geometricPrecision"
              >
                <defs>
                  {/* Adaptive High-Definition Unsharp Mask Filter for crisp edges on zoom */}
                  <filter id="ultraHdSharpen" x="0%" y="0%" width="100%" height="100%">
                    <feConvolveMatrix
                      order="3 3"
                      preserveAlpha="true"
                      kernelMatrix="0 -0.35 0 -0.35 2.4 -0.35 0 -0.35 0"
                    />
                  </filter>
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
                  <filter id="goldNeonGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur2" />
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
                  <g opacity={activeDarkMode ? "0.75" : "0.6"}>
                    <circle cx="498" cy="285" r="42" fill="none" stroke={activeDarkMode ? "#FFFFFF" : "#B8860B"} strokeWidth={0.8 / Math.sqrt(zoomLevel)} strokeDasharray="3 3" opacity="0.6" />
                    <circle cx="498" cy="285" r="95" fill="none" stroke={activeDarkMode ? '#38BDF8' : '#0284C7'} strokeWidth={1 / Math.sqrt(zoomLevel)} opacity="0.5" />
                    <circle cx="498" cy="285" r="150" fill="none" stroke={activeDarkMode ? '#D4AF37' : '#B45309'} strokeWidth={1 / Math.sqrt(zoomLevel)} strokeDasharray="4 4" opacity="0.45" />
                    <circle cx="498" cy="285" r="210" fill="none" stroke="#D4AF37" strokeWidth={1.2 / Math.sqrt(zoomLevel)} opacity="0.5" />
                    <circle cx="498" cy="285" r="280" fill="none" stroke={activeDarkMode ? '#38BDF8' : '#0284C7'} strokeWidth={0.9 / Math.sqrt(zoomLevel)} strokeDasharray="6 4" opacity="0.35" />
                  </g>
                )}

                {/* Compound Subtle Glowing Thin Boundaries + Progressive Vector CAD Subdivisions on Zoom */}
                {filteredCompounds.map(c => {
                  const cx = (c.xPct / 100) * 1000;
                  const cy = (c.yPct / 100) * 562.5;
                  const isHovered = c.id === hoveredCompoundId;

                  return (
                    <g key={c.id}>
                      {/* Subtle thin line defining compound boundary */}
                      <ellipse
                        cx={cx}
                        cy={cy}
                        rx={c.boundaryRadiusX}
                        ry={c.boundaryRadiusY}
                        fill={isHovered 
                          ? (activeDarkMode ? 'rgba(56, 189, 248, 0.22)' : 'rgba(217, 119, 6, 0.18)') 
                          : 'rgba(255, 255, 255, 0.02)'}
                        stroke={isHovered 
                          ? (activeDarkMode ? '#FDE047' : '#B45309') 
                          : (activeDarkMode ? 'rgba(212, 175, 55, 0.65)' : 'rgba(180, 83, 9, 0.55)')}
                        strokeWidth={(isHovered ? 2.2 : 1.1) / Math.sqrt(zoomLevel)}
                        strokeDasharray={isHovered ? 'none' : '3 3'}
                        filter={isHovered ? 'url(#goldNeonGlow)' : undefined}
                        className="transition-all duration-200"
                      />

                      {/* Progressive Vector CAD Detail when zoomed in (zoomLevel >= 1.35) or hovered — 100% mathematical vector clarity */}
                      {(zoomLevel >= 1.35 || isHovered) && (
                        <g opacity={isHovered ? 0.95 : 0.72}>
                          <ellipse
                            cx={cx}
                            cy={cy}
                            rx={c.boundaryRadiusX * 0.55}
                            ry={c.boundaryRadiusY * 0.55}
                            fill="rgba(56, 189, 248, 0.12)"
                            stroke={activeDarkMode ? '#38BDF8' : '#0284C7'}
                            strokeWidth={0.75 / Math.sqrt(zoomLevel)}
                            strokeDasharray="2 1.5"
                          />
                          <line
                            x1={cx - c.boundaryRadiusX * 0.85}
                            y1={cy}
                            x2={cx + c.boundaryRadiusX * 0.85}
                            y2={cy}
                            stroke={activeDarkMode ? '#D4AF37' : '#B45309'}
                            strokeWidth={0.55 / Math.sqrt(zoomLevel)}
                            strokeDasharray="1.5 1.5"
                          />
                          <line
                            x1={cx}
                            y1={cy - c.boundaryRadiusY * 0.85}
                            x2={cx}
                            y2={cy + c.boundaryRadiusY * 0.85}
                            stroke={activeDarkMode ? '#D4AF37' : '#B45309'}
                            strokeWidth={0.55 / Math.sqrt(zoomLevel)}
                            strokeDasharray="1.5 1.5"
                          />
                          <text
                            x={cx}
                            y={cy + c.boundaryRadiusY + 8}
                            textAnchor="middle"
                            fontSize={Math.max(5.5, 8.5 / Math.sqrt(zoomLevel))}
                            fontFamily="monospace"
                            fontWeight="bold"
                            fill={activeDarkMode ? '#FDE047' : '#78350F'}
                          >
                            {c.nameEn.toUpperCase()}
                          </text>
                        </g>
                      )}

                      {/* Little thin line pointer & index marker when hovered */}
                      {isHovered && (
                        <g>
                          <line
                            x1={cx}
                            y1={cy - c.boundaryRadiusY}
                            x2={cx}
                            y2={cy - c.boundaryRadiusY - 14}
                            stroke={activeDarkMode ? "#FDE047" : "#B45309"}
                            strokeWidth={1.5 / Math.sqrt(zoomLevel)}
                            filter="url(#softGlow)"
                          />
                          <circle
                            cx={cx}
                            cy={cy - c.boundaryRadiusY - 14}
                            r={3 / Math.sqrt(zoomLevel)}
                            fill={activeDarkMode ? "#FDE047" : "#B45309"}
                            filter="url(#goldNeonGlow)"
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
                  <div className={`absolute top-[13%] left-[47%] -translate-x-1/2 px-2 py-0.5 rounded-sm text-[10px] font-mono tracking-wider backdrop-blur-xs border shadow-sm ${
                    activeDarkMode ? 'bg-[#061122]/90 text-amber-200 border-amber-500/30' : 'bg-white/95 text-stone-800 border-amber-600/30'
                  }`}>
                    Cairo Ring Road · الطريق الدائري
                  </div>
                  <div className={`absolute top-[8%] left-[72%] -translate-x-1/2 px-2 py-0.5 rounded-sm text-[10px] font-mono tracking-wider backdrop-blur-xs border shadow-sm ${
                    activeDarkMode ? 'bg-[#061122]/90 text-amber-200 border-amber-500/30' : 'bg-white/95 text-stone-800 border-amber-600/30'
                  }`}>
                    Suez-Cairo Desert Road · طريق السويس
                  </div>
                  <div className={`absolute bottom-[23%] left-[40%] -translate-x-1/2 px-2 py-0.5 rounded-sm text-[10px] font-mono tracking-wider backdrop-blur-xs border shadow-sm ${
                    activeDarkMode ? 'bg-[#061122]/90 text-amber-200 border-amber-500/30' : 'bg-white/95 text-stone-800 border-amber-600/30'
                  }`}>
                    Middle Ring Road · الدائري الأوسطي
                  </div>
                  <div className={`absolute bottom-[7%] left-[58%] -translate-x-1/2 px-2 py-0.5 rounded-sm text-[10px] font-mono tracking-wider backdrop-blur-xs border shadow-sm ${
                    activeDarkMode ? 'bg-[#061122]/90 text-amber-200 border-amber-500/30' : 'bg-white/95 text-stone-800 border-amber-600/30'
                  }`}>
                    Ain Sokhna Road · طريق العين السخنة
                  </div>
                  <div className={`absolute top-[50%] left-[57%] -translate-x-1/2 px-2.5 py-0.5 rounded-sm text-[10px] font-mono tracking-wider backdrop-blur-xs border shadow-md font-bold ${
                    activeDarkMode ? 'bg-[#061122]/95 text-amber-300 border-amber-400/50' : 'bg-amber-100/95 text-amber-950 border-amber-500/50'
                  }`}>
                    90th Street · شارع التسعين
                  </div>
                </div>
              )}

              {/* Interactive Transparent Hit Targets & Floating Popup Signs */}
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
                        ? (activeDarkMode 
                            ? 'bg-amber-400 text-[#061122] shadow-[0_0_18px_rgba(251,191,36,0.95)] scale-110 font-black' 
                            : 'bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.8)] scale-110 font-black')
                        : (activeDarkMode
                            ? 'bg-[#061122]/85 text-amber-300 border border-amber-500/40 backdrop-blur-xs'
                            : 'bg-white/90 text-stone-800 border border-amber-600/40 backdrop-blur-xs shadow-xs')
                    }`}>
                      № {compound.indexNumber < 10 ? `0${compound.indexNumber}` : compound.indexNumber}
                    </div>

                    {/* Optional Yield Heat Pill when layer active */}
                    {showYieldHeatmap && (
                      <div className="absolute -top-3.5 px-1.5 py-0.2 rounded-xs text-[9px] font-mono font-bold bg-cyan-400 text-black shadow-[0_0_8px_rgba(34,211,238,0.9)] animate-pulse pointer-events-none">
                        {compound.rentalYieldRange.split('-')[1]?.trim() || compound.rentalYieldRange}
                      </div>
                    )}

                    {/* DYNAMIC POP-UP SIGN (Appears right above compound when hovered) */}
                    {isHovered && (
                      <div 
                        className="absolute bottom-[105%] left-1/2 -translate-x-1/2 z-30 pointer-events-auto min-w-[240px] max-w-[280px] animate-fade-in"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCompoundToExcel(compound);
                        }}
                      >
                        <div className={`p-3.5 rounded-xl border-2 shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all ${
                          activeDarkMode 
                            ? 'bg-[#061122]/96 text-white border-amber-400/60 shadow-black/90' 
                            : 'bg-[#FAF8F5]/98 text-stone-900 border-amber-600/50 shadow-stone-500/20'
                        }`}>
                          
                          {/* Top Kicker */}
                          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-amber-500/20 text-[10px] font-mono">
                            <span className="text-amber-500 dark:text-amber-300 font-bold">
                              № {compound.indexNumber < 10 ? `0${compound.indexNumber}` : compound.indexNumber} · {compound.zoneEn}
                            </span>
                            <span className="text-emerald-500 dark:text-emerald-400 font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
                              {compound.unitsCount} Units
                            </span>
                          </div>

                          {/* Compound Title */}
                          <div className={`font-cinzel font-extrabold text-sm tracking-wide ${activeDarkMode ? 'text-white' : 'text-stone-900'}`}>
                            {compound.nameEn}
                          </div>
                          <div className="font-cairo font-bold text-xs text-amber-600 dark:text-amber-200">
                            {compound.nameAr}
                          </div>

                          {/* Pricing & Rent Summary */}
                          <div className="mt-2.5 pt-2 border-t border-stone-200 dark:border-white/10 grid grid-cols-2 gap-2 text-[10px] font-mono">
                            <div>
                              <span className="text-stone-500 dark:text-stone-400 block text-[9px]">{isAr ? 'يبدأ البيع من:' : 'Resale from:'}</span>
                              <span className="font-bold text-amber-600 dark:text-amber-300">
                                EGP {(compound.startingPriceEgp / 1000000).toFixed(1)}M
                              </span>
                            </div>
                            <div>
                              <span className="text-stone-500 dark:text-stone-400 block text-[9px]">{isAr ? 'يبدأ الإيجار من:' : 'Rent from:'}</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                EGP {(compound.startingRentEgp / 1000).toFixed(0)}k/mo
                              </span>
                            </div>
                          </div>

                          {/* Cap Rate Yield Badge */}
                          <div className="mt-2 pt-1.5 border-t border-stone-200 dark:border-white/10 flex items-center justify-between text-[10px] font-mono text-cyan-600 dark:text-cyan-300">
                            <span>{isAr ? 'العائد الإيجاري:' : 'Cap Rate Yield:'}</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-300">{compound.rentalYieldRange}</span>
                          </div>

                          {/* Drive Times */}
                          <div className="mt-1.5 text-[9px] font-mono text-stone-600 dark:text-stone-300 flex items-center justify-between">
                            <span>AUC: {compound.driveTimeToAucMin}m</span>
                            <span>Capital: {compound.driveTimeToNewCapitalMin}m</span>
                            <span>Airport: {compound.driveTimeToAirportMin}m</span>
                          </div>

                          {/* CTA Prompt */}
                          <div className="mt-2.5 pt-2 border-t border-stone-200 dark:border-white/10 flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                            <span className="flex items-center gap-1.5">
                              <Table2 className="w-3.5 h-3.5" />
                              <span>{isAr ? 'فتح في شيت الإكسيل' : 'Open in Excel Sheet'}</span>
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
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

              <div className={`backdrop-blur-xs px-2.5 py-1 rounded-sm border ${
                activeDarkMode 
                  ? 'bg-[#061122]/90 border-amber-500/30 text-stone-200' 
                  : 'bg-white/95 border-amber-600/30 text-stone-800 shadow-sm'
              }`}>
                <div className="flex items-center justify-between text-[9px] font-mono tracking-wider">
                  <span>0</span>
                  <span>1</span>
                  <span className="font-bold text-amber-500">METRIC</span>
                  <span>3 KM</span>
                </div>
                <div className={`w-28 h-1.5 border flex mt-0.5 ${activeDarkMode ? 'border-amber-500/40' : 'border-stone-700'}`}>
                  <div className={`w-1/3 ${activeDarkMode ? 'bg-amber-400' : 'bg-stone-900'}`} />
                  <div className="w-1/3 bg-transparent" />
                  <div className={`w-1/3 ${activeDarkMode ? 'bg-amber-400' : 'bg-stone-900'}`} />
                </div>
              </div>
            </div>

            {/* Bottom Right: Sierra Estates Monogram Logo Seal & Signature */}
            <div className={`absolute bottom-4 right-4 z-30 pointer-events-none flex items-center gap-3 backdrop-blur-md px-3.5 py-2 rounded-xl border shadow-xl ${
              activeDarkMode 
                ? 'bg-[#061122]/95 border-amber-400/40 text-stone-100 shadow-black/80' 
                : 'bg-white/95 border-amber-600/40 text-stone-900 shadow-md'
            }`}>
              <div className="w-9 h-9 rounded-lg overflow-hidden border border-amber-500/50 bg-[#061122] shrink-0 p-0.5">
                <img 
                  src="/assets/aistudio/8e9559f6f_image__1__4350f848.png" 
                  alt="Sierra Estates Seal"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className={`font-cinzel font-bold text-xs tracking-wider ${activeDarkMode ? 'text-stone-100' : 'text-stone-900'}`}>
                    SIERRA ESTATES
                  </span>
                  <span className="text-[9px] font-mono font-semibold text-cyan-500">
                    sierra-estates.net
                  </span>
                </div>
                <span className="text-[9px] font-mono uppercase tracking-widest text-amber-500">
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
