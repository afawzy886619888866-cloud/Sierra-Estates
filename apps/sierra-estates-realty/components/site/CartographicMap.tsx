'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './CartographicMap.module.css';
import { 
  Compound, 
  UnitListing, 
  COMPOUNDS, 
  UNIT_LISTINGS, 
  hydrateRegistryWithLiveInventory
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
  Sun,
  Moon,
  Flame
} from 'lucide-react';

interface CartographicMapProps {
  lang: 'en' | 'ar';
  isDarkMode: boolean;
  onSelectCompoundToExcel: (compound: Compound) => void;
  onSelectUnit: (unit: UnitListing) => void;
  onToggleTheme?: () => void;
  selectedCompoundId?: string | null;
}

export const CartographicMap: React.FC<CartographicMapProps> = ({
  lang,
  isDarkMode,
  onSelectCompoundToExcel,
  onSelectUnit,
  onToggleTheme,
  selectedCompoundId,
}) => {
  const isAr = lang === 'ar';
  
  const [activeZoneFilter, setActiveZoneFilter] = useState<string>('all');
  const [showRadarRings, setShowRadarRings] = useState<boolean>(true);
  const [showRoadLabels, setShowRoadLabels] = useState<boolean>(true);
  const [showYieldHeatmap, setShowYieldHeatmap] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredCompoundId, setHoveredCompoundId] = useState<string | null>(selectedCompoundId || null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [liveSyncedCount, setLiveSyncedCount] = useState<number>(UNIT_LISTINGS.length);

  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  // Sync with live /api/inventory when mounted
  useEffect(() => {
    let active = true;
    fetch('/api/inventory?limit=500')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!active || !data || !Array.isArray(data.units)) return;
        const { unitListings } = hydrateRegistryWithLiveInventory(data.units, data.compoundCounts);
        setLiveSyncedCount(data.count || unitListings.length);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedCompoundId) {
      setHoveredCompoundId(selectedCompoundId);
    }
  }, [selectedCompoundId]);

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

  // Zoom handlers with smooth clamping between 0.85x and 3.0x
  const handleZoomIn = () => setZoomLevel(prev => Math.min(+(prev + 0.25).toFixed(2), 3.0));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(+(prev - 0.25).toFixed(2), 0.85));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    const newZoom = Math.min(Math.max(+(zoomLevel + delta).toFixed(2), 0.85), 3.0);
    setZoomLevel(newZoom);
  };

  // Mouse pan handlers with smooth bounded clamping
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const maxPan = 450 * zoomLevel;
    const nextX = e.clientX - dragStart.x;
    const nextY = e.clientY - dragStart.y;
    setPanOffset({
      x: Math.max(-maxPan, Math.min(maxPan, nextX)),
      y: Math.max(-maxPan, Math.min(maxPan, nextY)),
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

  // Local theme state if not externally controlled
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
    <div className={styles.mapRoot}>
      
      {/* Top Map Action Toolbar */}
      <div className={`${styles.toolbar} ${activeDarkMode ? styles.toolbarDark : styles.toolbarLight}`}>
        
        {/* Zone Filters */}
        <div className={styles.zoneFilters}>
          <span className={styles.zoneLabel}>
            {isAr ? 'تصفية المناطق:' : 'Filter Zones:'}
          </span>
          {[
            { id: 'all', en: 'All 18 Master Enclaves', ar: 'جميع المشروعات (18)' },
            { id: 'golden-square', en: 'Golden Square (المربع الذهبي)', ar: 'المربع الذهبي' },
            { id: 'suez-axis', en: 'Suez Road Axis', ar: 'محور طريق السويس' },
            { id: 'southern', en: 'South 90th & Sokhna', ar: 'التسعين الجنوبي والسخنة' },
          ].map(z => {
            const isActive = activeZoneFilter === z.id;
            const btnClass = isActive 
              ? styles.zoneBtnActive 
              : (activeDarkMode ? styles.zoneBtnInactiveDark : styles.zoneBtnInactiveLight);

            return (
              <button
                key={z.id}
                type="button"
                onClick={() => setActiveZoneFilter(z.id)}
                className={`${styles.zoneBtn} ${btnClass}`}
              >
                {isAr ? z.ar : z.en}
              </button>
            );
          })}
        </div>

        {/* View Toggles, Theme Toggle & Zoom Controls */}
        <div className={styles.toolbarControls}>
          
          {/* Prominent Dark & Light Edition Toggle Button */}
          <button
            type="button"
            onClick={toggleThemeMode}
            title={activeDarkMode ? 'التبديل إلى النسخة المضيئة (Alabaster Light Edition)' : 'التبديل إلى النسخة الليلية (Midnight Obsidian Edition)'}
            className={`${styles.themeModeBtn} ${activeDarkMode ? styles.themeModeBtnDark : styles.themeModeBtnLight}`}
          >
            {activeDarkMode ? (
              <>
                <Sun style={{ width: 14, height: 14, color: '#facc15' }} />
                <span>{isAr ? 'النسخة المضيئة' : 'Light Edition'}</span>
              </>
            ) : (
              <>
                <Moon style={{ width: 14, height: 14, color: '#b45309' }} />
                <span>{isAr ? 'النسخة الليلية' : 'Dark Edition'}</span>
              </>
            )}
          </button>

          {/* AUC Radar Rings Toggle */}
          <button
            type="button"
            onClick={() => setShowRadarRings(!showRadarRings)}
            className={`${styles.featureToggle} ${
              showRadarRings 
                ? (activeDarkMode ? styles.featureToggleActiveDark : styles.featureToggleActiveLight)
                : (activeDarkMode ? styles.featureToggleInactiveDark : styles.featureToggleInactiveLight)
            }`}
          >
            <Layers style={{ width: 14, height: 14 }} />
            <span>{isAr ? 'حلقات AUC' : 'AUC Radar'}</span>
          </button>

          {/* Expressways Toggle */}
          <button
            type="button"
            onClick={() => setShowRoadLabels(!showRoadLabels)}
            className={`${styles.featureToggle} ${
              showRoadLabels 
                ? (activeDarkMode ? styles.featureToggleActiveDark : styles.featureToggleActiveLight)
                : (activeDarkMode ? styles.featureToggleInactiveDark : styles.featureToggleInactiveLight)
            }`}
          >
            <Navigation style={{ width: 14, height: 14 }} />
            <span>{isAr ? 'المحاور الرئيسية' : 'Expressways'}</span>
          </button>

          {/* Yield Heatmap Overlay Toggle */}
          <button
            type="button"
            onClick={() => setShowYieldHeatmap(!showYieldHeatmap)}
            className={`${styles.featureToggle} ${
              showYieldHeatmap 
                ? (activeDarkMode ? styles.featureToggleActiveDark : styles.featureToggleActiveLight)
                : (activeDarkMode ? styles.featureToggleInactiveDark : styles.featureToggleInactiveLight)
            }`}
            title={isAr ? 'عرض الخريطة الحرارية للعوائد الإيجارية' : 'Toggle Rental Yield Heatmap Overlay'}
          >
            <Flame style={{ width: 14, height: 14, color: '#06b6d4' }} />
            <span>{isAr ? 'طبقة العوائد' : 'Yield Heat'}</span>
          </button>

          {/* Zoom Buttons & Percentage Indicator */}
          <div className={`${styles.zoomGroup} ${activeDarkMode ? styles.zoomGroupDark : styles.zoomGroupLight}`}>
            <button
              type="button"
              onClick={handleZoomIn}
              title="Zoom In (تكبير)"
              className={styles.zoomBtn}
            >
              <ZoomIn style={{ width: 14, height: 14 }} />
            </button>
            <span className={styles.zoomPercentage}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomOut}
              title="Zoom Out (تصغير)"
              className={styles.zoomBtn}
            >
              <ZoomOut style={{ width: 14, height: 14 }} />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset Zoom & Pan (إعادة الضبط)"
              className={styles.zoomBtn}
              style={{ borderLeft: '1px solid rgba(148, 163, 184, 0.3)' }}
            >
              <RotateCcw style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className={`${styles.iconBtn} ${activeDarkMode ? styles.iconBtnDark : styles.iconBtnLight}`}
          >
            <Maximize2 style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      {/* Main Cartographic Frame Container */}
      <div className={styles.mapFrameWrapper} ref={frameRef}>
        <div className={`${styles.editorialFrame} ${activeDarkMode ? styles.editorialFrameDark : styles.editorialFrameLight}`}>
          
          {/* Inner hairline framing line */}
          <div className={styles.innerFramingLine} />

          {/* Top Title Banner */}
          <div className={`${styles.hudBanner} ${activeDarkMode ? styles.hudBannerDark : styles.hudBannerLight}`}>
            <span className={styles.hudBannerTitle}>
              {activeDarkMode 
                ? (isAr ? 'النسخة الليلية الفاخرة · SIERRA NOCTURNE' : 'SIERRA ESTATES · OBSIDIAN NOCTURNE MASTERPLAN') 
                : (isAr ? 'النسخة المضيئة الملكية · SIERRA ALABASTER' : 'SIERRA ESTATES · ROYAL ALABASTER MASTERPLAN')}
            </span>
            <span className={styles.hudBannerDot}>·</span>
            <span className={styles.hudBannerDomain}>
              sierra-estates.net
            </span>
            <span style={{ color: '#94a3b8' }}>·</span>
            <span className={styles.hudBannerSub}>
              {isAr ? 'المخطط الأصلي للقاهرة الجديدة 2026' : 'New Cairo Master Registry 2026'}
            </span>
          </div>

          {/* In-Map Quick Dark/Light Switcher Pill */}
          <button
            type="button"
            onClick={toggleThemeMode}
            title={activeDarkMode ? 'التبديل إلى النسخة المضيئة (Light)' : 'التبديل إلى النسخة الليلية (Dark)'}
            className={`${styles.quickThemePill} ${activeDarkMode ? styles.quickThemePillDark : styles.quickThemePillLight}`}
          >
            {activeDarkMode ? (
              <>
                <Sun style={{ width: 12, height: 12, color: '#facc15' }} />
                <span>{isAr ? 'فاتح' : 'Light'}</span>
              </>
            ) : (
              <>
                <Moon style={{ width: 12, height: 12, color: '#b45309' }} />
                <span>{isAr ? 'غامق' : 'Dark'}</span>
              </>
            )}
          </button>

          {/* Interactive Map Viewport with Smooth Pan and Wheel Zoom */}
          <div 
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className={`${styles.viewport} ${isDragging ? styles.viewportDragging : ''}`}
          >
            {/* GPU-Accelerated 4K Infinite Canvas Layer */}
            <div 
              className={styles.canvasTransform}
              style={{
                transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomLevel})`,
                transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Base Authentic 4K Ultra-HD Cartographic Backdrop Image (3840x2143) with Dedicated Dark & Light Editions */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeDarkMode 
                  ? '/assets/aistudio/Image_1_dark_4k.jpeg' 
                  : '/assets/aistudio/Image_1_f1dc350b.jpeg'
                }
                onError={(e) => {
                  const target = e.currentTarget;
                  if (activeDarkMode && !target.src.includes('new-cairo-masterplan-dark.jpg')) {
                    target.src = '/maps/new-cairo-masterplan-dark.jpg';
                  } else if (!activeDarkMode && !target.src.includes('new-cairo-masterplan-light.jpg')) {
                    target.src = '/maps/new-cairo-masterplan-light.jpg';
                  }
                }}
                alt={activeDarkMode ? "New Cairo City 4K Master Registry Map (Dark Edition)" : "New Cairo City 4K Master Registry Map (Light Edition)"}
                decoding="async"
                className={`${styles.backdropImage} ${activeDarkMode ? styles.backdropDark : styles.backdropLight}`}
                draggable={false}
              />

              {/* Luxury Palette Overlay Tint */}
              <div className={activeDarkMode ? styles.colorTintDark : styles.colorTintLight} />

              {/* Subtle Editorial Edge Vignette */}
              <div className={activeDarkMode ? styles.vignetteDark : styles.vignetteLight} />

              {/* Infinite-Resolution SVG Vector CAD Overlay */}
              <svg 
                className={styles.svgCadLayer} 
                viewBox="0 0 1000 562.5"
                preserveAspectRatio="xMidYMid meet"
                shapeRendering="geometricPrecision"
                textRendering="geometricPrecision"
              >
                <defs>
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

                {/* Compound Subtle Glowing Boundaries */}
                {filteredCompounds.map(c => {
                  const cx = (c.xPct / 100) * 1000;
                  const cy = (c.yPct / 100) * 562.5;
                  const isHovered = c.id === hoveredCompoundId;

                  return (
                    <g key={c.id}>
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
                      />

                      {/* Progressive Vector CAD Detail when zoomed in or hovered */}
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

                      {/* Line pointer & index marker when hovered */}
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
                <div className={styles.roadBadgesLayer}>
                  <div 
                    className={`${styles.roadBadge} ${activeDarkMode ? styles.roadBadgeDark : styles.roadBadgeLight}`}
                    style={{ top: '13%', left: '47%' }}
                  >
                    Cairo Ring Road · الطريق الدائري
                  </div>
                  <div 
                    className={`${styles.roadBadge} ${activeDarkMode ? styles.roadBadgeDark : styles.roadBadgeLight}`}
                    style={{ top: '8%', left: '72%' }}
                  >
                    Suez-Cairo Desert Road · طريق السويس
                  </div>
                  <div 
                    className={`${styles.roadBadge} ${activeDarkMode ? styles.roadBadgeDark : styles.roadBadgeLight}`}
                    style={{ bottom: '23%', left: '40%' }}
                  >
                    Middle Ring Road · الدائري الأوسطي
                  </div>
                  <div 
                    className={`${styles.roadBadge} ${activeDarkMode ? styles.roadBadgeDark : styles.roadBadgeLight}`}
                    style={{ bottom: '7%', left: '58%' }}
                  >
                    Ain Sokhna Road · طريق العين السخنة
                  </div>
                  <div 
                    className={`${styles.roadBadge} ${activeDarkMode ? styles.roadBadgeHeroDark : styles.roadBadgeHeroLight}`}
                    style={{ top: '50%', left: '57%' }}
                  >
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
                    className={styles.compoundTarget}
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
                    title={`Click to open ${compound.nameEn} Excel Sheet`}
                  >
                    {/* Quiet, delicate number pill that glows on hover */}
                    <div className={`${styles.compoundPill} ${
                      isHovered
                        ? (activeDarkMode ? styles.compoundPillHoverDark : styles.compoundPillHoverLight)
                        : (activeDarkMode ? styles.compoundPillNormalDark : styles.compoundPillNormalLight)
                    }`}>
                      № {compound.indexNumber < 10 ? `0${compound.indexNumber}` : compound.indexNumber}
                    </div>

                    {/* Optional Yield Heat Pill when layer active */}
                    {showYieldHeatmap && (
                      <div className={styles.yieldPill}>
                        {compound.rentalYieldRange.split('-')[1]?.trim() || compound.rentalYieldRange}
                      </div>
                    )}

                    {/* DYNAMIC POP-UP SIGN (Appears right above compound when hovered) */}
                    {isHovered && (
                      <div 
                        className={`${styles.popupCard} ${activeDarkMode ? styles.popupCardDark : styles.popupCardLight}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCompoundToExcel(compound);
                        }}
                      >
                        {/* Top Kicker */}
                        <div className={styles.popupHeader}>
                          <span className={styles.popupIndex}>
                            № {compound.indexNumber < 10 ? `0${compound.indexNumber}` : compound.indexNumber} · {compound.zoneEn}
                          </span>
                          <span className={styles.popupUnitsBadge}>
                            {compound.unitsCount} Units
                          </span>
                        </div>

                        {/* Compound Title */}
                        <h4 className={styles.popupTitleEn}>
                          {compound.nameEn}
                        </h4>
                        <div className={styles.popupTitleAr}>
                          {compound.nameAr}
                        </div>

                        {/* Pricing & Rent Summary */}
                        <div className={styles.popupPricingGrid}>
                          <div>
                            <span className={styles.popupMetricLabel}>{isAr ? 'يبدأ البيع من:' : 'Resale from:'}</span>
                            <span className={styles.popupPriceValue}>
                              EGP {(compound.startingPriceEgp / 1000000).toFixed(1)}M
                            </span>
                          </div>
                          <div>
                            <span className={styles.popupMetricLabel}>{isAr ? 'يبدأ الإيجار من:' : 'Rent from:'}</span>
                            <span className={styles.popupRentValue}>
                              EGP {(compound.startingRentEgp / 1000).toFixed(0)}k/mo
                            </span>
                          </div>
                        </div>

                        {/* Cap Rate Yield Badge */}
                        <div className={styles.popupYieldRow}>
                          <span>{isAr ? 'العائد الإيجاري:' : 'Cap Rate Yield:'}</span>
                          <strong style={{ color: '#10b981' }}>{compound.rentalYieldRange}</strong>
                        </div>

                        {/* Drive Times */}
                        <div className={styles.popupDriveRow}>
                          <span>AUC: {compound.driveTimeToAucMin}m</span>
                          <span>Capital: {compound.driveTimeToNewCapitalMin}m</span>
                          <span>Airport: {compound.driveTimeToAirportMin}m</span>
                        </div>

                        {/* CTA Prompt */}
                        <div className={styles.popupCtaRow}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Table2 style={{ width: 14, height: 14 }} />
                            <span>{isAr ? 'فتح في شيت الإكسيل' : 'Open in Excel Sheet'}</span>
                          </span>
                          <ArrowRight style={{ width: 14, height: 14 }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

            </div>

            {/* Bottom Left: Vintage Compass Rose & Metric Scale Bar */}
            <div className={styles.compassContainer}>
              <div className={styles.compassRose}>
                <svg style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} viewBox="0 0 100 100">
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

              <div className={`${styles.scaleBox} ${activeDarkMode ? styles.scaleBoxDark : styles.scaleBoxLight}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                  <span>0</span>
                  <span>1</span>
                  <span style={{ fontWeight: 800, color: '#dfad3a' }}>METRIC</span>
                  <span>3 KM</span>
                </div>
                <div style={{ width: 110, height: 6, border: activeDarkMode ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid #64748b', display: 'flex', marginTop: 2 }}>
                  <div style={{ width: '33.3%', background: activeDarkMode ? '#facc15' : '#1e293b' }} />
                  <div style={{ width: '33.3%', background: 'transparent' }} />
                  <div style={{ width: '33.3%', background: activeDarkMode ? '#facc15' : '#1e293b' }} />
                </div>
              </div>
            </div>

            {/* Bottom Right: Sierra Estates Seal */}
            <div className={`${styles.sealSignature} ${activeDarkMode ? styles.sealSignatureDark : styles.sealSignatureLight}`}>
              <div className={styles.sealLogoWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/assets/aistudio/8e9559f6f_image__1__4350f848.png" 
                  alt="Sierra Estates Seal"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--font-playfair, serif)', fontWeight: 800, fontSize: 12, letterSpacing: '0.05em' }}>
                    SIERRA ESTATES
                  </span>
                  <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color: '#06b6d4' }}>
                    sierra-estates.net
                  </span>
                </div>
                <span style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#dfad3a' }}>
                  New Cairo Master Plan 2026
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Fast Instruction Strip */}
      <div className={`${styles.instructionStrip} ${activeDarkMode ? styles.instructionStripDark : styles.instructionStripLight}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles style={{ width: 15, height: 15, color: '#dfad3a', flexShrink: 0 }} />
          <span style={{ fontWeight: 600 }}>
            {isAr 
              ? 'مرر الماوس فوق أي مشروع لظهور حدوده المضيئة ورقم الوحدة، واضغط عليه لفتح جدول الإكسيل الشامل لوحدات الإيجار وإعادة البيع.'
              : 'Hover near any compound to see its glowing perimeter and index number. Click on it to open its full Excel inventory sheet.'
            }
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>
            {filteredCompounds.length} Active Enclaves · {liveSyncedCount} Verified Units
          </span>
        </div>
      </div>

    </div>
  );
};

export default CartographicMap;
