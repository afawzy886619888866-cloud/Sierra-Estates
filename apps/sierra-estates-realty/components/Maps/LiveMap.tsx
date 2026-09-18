'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Marker, Popup, MapContainer, TileLayer, useMap, Circle, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { CompoundLocation, NEW_CAIRO_COMPOUNDS } from './compounds-data';
export type { CompoundLocation };
export { NEW_CAIRO_COMPOUNDS };

export type MapUnitPin = {
  id: string;
  code: string;
  compound: string;
  lat: number;
  lng: number;
  priceLabel: string;
  type: string;
  mode: string;
  beds?: number;
  baths?: number;
  area?: number;
  img?: string;
  distanceKm?: number;
  featured?: boolean;
};

export type PlacedMapUnitPin = MapUnitPin & {
  renderLat: number;
  renderLng: number;
};

export type MapTileStyle = 'dark' | 'light' | 'satellite';

const TILE_LAYERS: Record<MapTileStyle, { url: string; attrib: string }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attrib: '&copy; OpenStreetMap &copy; CARTO',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attrib: '&copy; OpenStreetMap &copy; CARTO',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attrib: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
};

const NEW_CAIRO_DEFAULT_CENTER: [number, number] = [30.025, 31.54];

/* ── Brand constants (Sierra champagne gold on obsidian) ─────────────── */
const GOLD = '#C8961A';
const GOLD_LT = '#E9C176';
const GOLD_SHEEN = '#F5D78E';
const NAVY_PILL = 'linear-gradient(135deg, #0d2136, #1e3a5f)';
const GOLD_PILL = `linear-gradient(135deg, ${GOLD_SHEEN}, ${GOLD})`;
const PANEL_BG = 'rgba(9, 18, 33, 0.92)';
const PANEL_BORDER = 'rgba(233, 193, 118, 0.22)';
const RENT_BLUE = '#38bdf8';
const SALE_GREEN = '#10b981';

/* ── Compound-name normalization (fixes double-counted live badges) ──── */

/** Normalize a free-text compound/location label to a comparable key. */
export function normalizeCompoundKey(raw: string): string {
  let s = (raw || '').toLowerCase().trim();
  s = s.replace(/[–—]/g, ' ');
  // Strip phase qualifiers, city/area noise and articles — "Hyde Park Phase 2
  // New Cairo" and "hyde park" must resolve to the same compound.
  s = s.replace(/\bphase\s*[-]?\s*\d+\b/g, ' ');
  s = s.replace(/\b(new cairo|fifth settlement|5th settlement|compound|the|nc|tagamoo|tagamo3)\b/g, ' ');
  s = s.replace(/[^a-z0-9\u0600-\u06ff\s]/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Resolve the live count for a compound exactly: normalized key first, then a
 * unique-containment fallback (only when exactly one candidate matches).
 * The previous bidirectional-substring scan double-counted families like
 * "Hyde Park" vs "Hyde Park Phase 2" and absorbed neighbours.
 */
function resolveCompoundCount(
  compound: CompoundLocation,
  countsByNorm: Record<string, number>
): number | null {
  const target = normalizeCompoundKey(compound.nameEn);
  if (target && countsByNorm[target] != null) return countsByNorm[target];

  let match: string | null = null;
  let matchCount = 0;
  for (const key of Object.keys(countsByNorm)) {
    if (!key || key === target) continue;
    if (key.includes(target) || target.includes(key)) {
      match = key;
      matchCount += countsByNorm[key];
    }
  }
  // Only accept a fuzzy roll-up when exactly ONE distinct family matched.
  const distinctMatches = Object.keys(countsByNorm).filter(
    (key) => key && key !== target && (key.includes(target) || target.includes(key))
  );
  if (distinctMatches.length === 1 && match) return matchCount;
  return null;
}

/**
 * Fan out unit pins sharing the same base coordinate onto tight concentric
 * rings (~50 m steps — compound-block scale, not the previous ~350 m rings
 * that scattered pins far outside their compound boundaries).
 */
function placePins(pins: MapUnitPin[]): PlacedMapUnitPin[] {
  const groups = new Map<string, MapUnitPin[]>();
  for (const p of pins) {
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') continue;
    const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
    const arr = groups.get(key);
    if (arr) arr.push(p);
    else groups.set(key, [p]);
  }

  const placed: PlacedMapUnitPin[] = [];
  for (const arr of groups.values()) {
    if (arr.length === 1) {
      placed.push({ ...arr[0], renderLat: arr[0].lat, renderLng: arr[0].lng });
      continue;
    }

    arr.forEach((p, i) => {
      const ring = Math.floor(i / 8) + 1;
      const angle = (i % 8) * (Math.PI / 4) + ring * 0.55;
      const r = 0.00045 * ring; // ~50 m per ring — block-level fan-out
      placed.push({
        ...p,
        renderLat: p.lat + r * Math.cos(angle),
        renderLng: p.lng + r * Math.sin(angle),
      });
    });
  }
  return placed;
}

function useLiveUnitCounts(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    fetch('/api/inventory', {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { units?: Array<{ location?: string; compound?: string; status?: string }> } | null) => {
        if (cancelled || !data?.units) return;
        const next: Record<string, number> = {};
        for (const unit of data.units) {
          if (unit.status && unit.status !== 'available') continue;
          const key = normalizeCompoundKey(unit.compound || unit.location || '');
          if (key) next[key] = (next[key] || 0) + 1;
        }
        setCounts(next);
      })
      .catch((err) => console.warn('[LiveMap] Listings fetch failed:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  return counts;
}

/* ── Marker icon builders (centered via translate, not fixed anchors) ── */

function createCompoundIcon(
  compound: CompoundLocation,
  isSelected: boolean,
  liveCount: number | null,
  lang: 'en' | 'ar' = 'en'
) {
  const name = (lang === 'ar' ? compound.nameAr : compound.nameEn) || compound.code;
  const count = liveCount ?? compound.unitsCount;
  const verified = compound.isGpsVerified;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        position: absolute;
        left: 0; top: 0;
        transform: translate(-50%, -50%) ${isSelected ? 'scale(1.12)' : 'scale(1)'};
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 9999px;
        font-family: var(--font-jakarta, 'Plus Jakarta Sans'), system-ui, sans-serif;
        font-size: 11.5px;
        font-weight: 800;
        white-space: nowrap;
        color: ${isSelected ? '#0d0d0f' : '#ffffff'};
        background: ${isSelected ? GOLD_PILL : NAVY_PILL};
        box-shadow: ${isSelected ? `0 0 20px rgba(233,193,118,0.7), 0 4px 16px rgba(0,0,0,0.5)` : '0 4px 14px rgba(0,0,0,0.45)'};
        border: ${isSelected ? '2.5px solid #ffffff' : `1.5px solid ${verified ? 'rgba(233,193,118,0.6)' : 'rgba(245,158,11,0.7)'}`};
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <span title="${verified ? 'GPS verified' : 'Location pending verification'}" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${isSelected ? '#0d0d0f' : verified ? '#34d399' : '#f59e0b'};box-shadow:0 0 6px ${verified ? 'rgba(52,211,153,0.8)' : 'rgba(245,158,11,0.8)'};"></span>
        <span style="letter-spacing:-0.01em;">${name}</span>
        <span style="
          background: ${isSelected ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'};
          color: inherit;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 8px;
          font-family: var(--font-mono, ui-monospace), monospace;
          font-weight: 700;
        ">${count}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -16],
  });
}

function createUnitIcon(unit: MapUnitPin, isMarked: boolean, isActive: boolean = false) {
  const shortPrice = unit.priceLabel
    .replace(' EGP', '')
    .replace(' / mo', '/m')
    .trim();

  const isRent = unit.mode === 'rent';
  const badgeBg = isActive
    ? GOLD_LT
    : isMarked
    ? '#002b4b'
    : isRent
    ? '#0284c7'
    : '#0f2942';

  const textColor = isActive ? '#0d0d0f' : isMarked ? GOLD_LT : '#ffffff';
  const borderColor = isActive
    ? '#ffffff'
    : isMarked
    ? GOLD_LT
    : isRent
    ? RENT_BLUE
    : '#c99436';

  const distBadge = unit.distanceKm != null
    ? `<span style="opacity:0.9;font-size:9.5px;font-weight:700;margin-left:3px;color:${isActive ? '#0d0d0f' : GOLD_LT};">· ${unit.distanceKm.toFixed(1)}km</span>`
    : '';

  return L.divIcon({
    className: '',
    html: `
      <div style="
        position: absolute;
        left: 0; top: 0;
        transform: translate(-50%, -50%) ${isActive ? 'scale(1.18)' : 'scale(1)'};
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: ${isActive ? '5px 10px' : '3.5px 8px'};
        border-radius: 12px;
        font-family: var(--font-jakarta, 'Plus Jakarta Sans'), system-ui, sans-serif;
        font-size: ${isActive ? '11.5px' : '10.5px'};
        font-weight: 800;
        white-space: nowrap;
        color: ${textColor};
        background: ${badgeBg};
        border: ${isActive ? '2.5px solid #ffffff' : `1.5px solid ${borderColor}`};
        box-shadow: ${isActive ? `0 0 20px rgba(233,193,118,0.9), 0 4px 14px rgba(0,0,0,0.6)` : '0 2px 10px rgba(0,0,0,0.5)'};
        cursor: pointer;
        transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: ${isActive ? 9999 : 'auto'};
      ">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${isActive ? '#0d0d0f' : isRent ? RENT_BLUE : SALE_GREEN};"></span>
        <span>${shortPrice}</span>
        ${distBadge}
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -12],
  });
}

/* ── Map helpers ─────────────────────────────────────────────────────── */

function MapController({
  flyToCoords,
  flyToZoom,
}: {
  flyToCoords?: [number, number] | null;
  flyToZoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (flyToCoords && typeof flyToCoords[0] === 'number' && typeof flyToCoords[1] === 'number') {
      map.flyTo(flyToCoords, flyToZoom || 14, { duration: 0.75 });
    }
  }, [flyToCoords, flyToZoom, map]);
  return null;
}

/** Publishes map zoom changes so the shell can declutter layers by zoom. */
function ZoomWatcher({ onChange }: { onChange: (zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const report = () => onChange(map.getZoom());
    report();
    map.on('zoomend', report);
    return () => {
      map.off('zoomend', report);
    };
  }, [map, onChange]);
  return null;
}

/* ── Shared glass-panel primitives ──────────────────────────────────── */

const panelStyle: React.CSSProperties = {
  background: PANEL_BG,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: `1px solid ${PANEL_BORDER}`,
  borderRadius: 14,
  boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
  color: '#ffffff',
  fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans'), system-ui, sans-serif",
};

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'JetBrains Mono'), ui-monospace, monospace",
  fontSize: 8.5,
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'rgba(233,193,118,0.75)',
};

function panelButton(
  selected: boolean,
  opts: { wide?: boolean } = {}
): React.CSSProperties {
  return {
    background: selected ? GOLD_PILL : 'rgba(255,255,255,0.07)',
    color: selected ? '#0d0d0f' : 'rgba(255,255,255,0.82)',
    fontWeight: selected ? 800 : 600,
    border: selected ? 'none' : '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: opts.wide ? '5px 10px' : '4px 8px',
    cursor: 'pointer',
    fontSize: 10.5,
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  };
}

/* ── Component ──────────────────────────────────────────────────────── */

export interface LiveMapProps {
  mode?: 'dark' | 'light';
  lang?: 'en' | 'ar';
  selectedCode?: string | null;
  onSelectCompound?: (c: CompoundLocation) => void;
  units?: MapUnitPin[];
  selectedUnitIds?: Set<string>;
  onToggleUnit?: (id: string) => void;
  activeUnitId?: string | null;
  onSelectUnit?: (unit: MapUnitPin) => void;
  flyToCoords?: [number, number] | null;
  flyToZoom?: number;
  maxPins?: number;
  height?: string;
  radiusKm?: number | null;
  onRadiusChange?: (radius: number | null) => void;
  centerCoords?: [number, number] | null;
  onCenterChange?: (coords: [number, number]) => void;
  /** Zoom level at which individual unit pins start rendering. */
  unitZoomThreshold?: number;
  /** Zoom level at which compound nodes fade out (street scale). */
  compoundZoomCutoff?: number;
  /** Render the collapsible legend panel. */
  showLegend?: boolean;
  /** Render the "showing X of Y units" counter chip. */
  showPinCounter?: boolean;
}

export default function LiveMap({
  mode = 'light',
  lang = 'en',
  selectedCode,
  onSelectCompound,
  units = [],
  selectedUnitIds = new Set(),
  onToggleUnit,
  activeUnitId = null,
  onSelectUnit,
  flyToCoords = null,
  flyToZoom = 14,
  maxPins = 250,
  height = '100%',
  radiusKm = null,
  onRadiusChange,
  centerCoords = NEW_CAIRO_DEFAULT_CENTER,
  onCenterChange,
  unitZoomThreshold = 14,
  compoundZoomCutoff = 16,
  showLegend = true,
  showPinCounter = true,
}: LiveMapProps) {
  const isAr = lang === 'ar';
  const [tileStyle, setTileStyle] = useState<MapTileStyle>(mode === 'dark' ? 'dark' : 'light');
  const [zoom, setZoom] = useState(12);
  const [legendOpen, setLegendOpen] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(true);
  const liveCounts = useLiveUnitCounts();

  const t = useMemo(
    () => ({
      basemap: isAr ? 'الخريطة' : 'Basemap',
      dark: isAr ? 'داكن' : 'Dark',
      light: isAr ? 'فاتح' : 'Light',
      satellite: isAr ? 'قمر صناعي' : 'Satellite',
      radius: isAr ? 'النطاق' : 'Radius',
      all: isAr ? 'الكل' : 'All',
      recenter: isAr ? 'إعادة التمركز' : 'Recenter',
      recenterTitle: isAr ? 'العودة إلى القاهرة الجديدة' : 'Recenter to New Cairo',
      legend: isAr ? 'الدليل' : 'Legend',
      forSale: isAr ? 'للبيع' : 'For Sale',
      forRent: isAr ? 'للإيجار' : 'For Rent',
      selected: isAr ? 'محدد' : 'Selected',
      inSelection: isAr ? 'ضمن المختار' : 'In Selection',
      compoundNode: isAr ? 'عقد كمباند' : 'Compound node',
      gpsVerified: isAr ? 'موقع مؤكد' : 'GPS verified',
      gpsPending: isAr ? 'موقع قيد التأكيد' : 'Location pending',
      showing: isAr ? 'عرض' : 'Showing',
      of: isAr ? 'من' : 'of',
      unitsWord: isAr ? 'وحدة' : 'units',
      compoundsWord: isAr ? 'كمباند' : 'compounds',
      zoomHint: isAr ? 'قرّب لعرض الوحدات' : 'Zoom in to reveal units',
      unitsHere: isAr ? 'وحدة هنا' : 'units here',
      availableUnits: isAr ? 'وحدة متاحة' : 'Available Units',
      directWhatsapp: isAr ? 'واتساب مباشر' : 'Direct WhatsApp',
      addToSelection: isAr ? '+ أضف للمختار' : '+ Add to Selection',
      beds: isAr ? 'غرف' : 'Beds',
      viewingQ: isAr
        ? 'مرحباً سييرا العقارية، أود الاستفسار عن الوحدة'
        : 'Hello Sierra Estates, I would like to ask about unit',
    }),
    [isAr]
  );

  const handleZoomChange = useCallback((z: number) => setZoom(z), []);
  const handleRecenter = useCallback(() => {
    onCenterChange?.(NEW_CAIRO_DEFAULT_CENTER);
  }, [onCenterChange]);

  const activeTile = TILE_LAYERS[tileStyle] || TILE_LAYERS.dark;

  // Fan out overlapping coordinates so all units stay visible and clickable
  const displayUnits = useMemo(() => {
    const sliced = units.slice(0, maxPins);
    return placePins(sliced);
  }, [units, maxPins]);

  // Zoom-aware decluttering: compounds at city scale, units at street scale.
  const showUnits = zoom >= unitZoomThreshold;
  const showCompounds = zoom < compoundZoomCutoff;

  const activePlaced = useMemo(
    () => displayUnits.find((u) => u.id === activeUnitId || u.code === activeUnitId) ?? null,
    [displayUnits, activeUnitId]
  );

  return (
    <div style={{ position: 'relative', width: '100%', height, overflow: 'hidden' }}>
      {/* ── ORGANIZED CONTROL PANEL (top-left) ── */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ ...panelStyle, padding: controlsOpen ? '10px 12px' : '8px 12px', width: 218 }}>
          <button
            type="button"
            onClick={() => setControlsOpen((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              color: GOLD_LT, fontFamily: 'inherit',
            }}
            aria-expanded={controlsOpen}
          >
            <span style={sectionLabelStyle}>{t.basemap} · Sierra Live Map</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>{controlsOpen ? '▾' : '▸'}</span>
          </button>

          {controlsOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {/* Basemap */}
              <div style={{ display: 'flex', gap: 4 }}>
                {(['dark', 'light', 'satellite'] as MapTileStyle[]).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setTileStyle(style)}
                    style={{ ...panelButton(tileStyle === style), flex: 1 }}
                  >
                    {style === 'dark' ? `🌙 ${t.dark}` : style === 'light' ? `☀️ ${t.light}` : `🛰️ ${t.satellite}`}
                  </button>
                ))}
              </div>

              {/* Radius (only when the host page wires the filter) */}
              {onRadiusChange && (
                <div>
                  <div style={{ ...sectionLabelStyle, marginBottom: 5 }}>📍 {t.radius}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[null, 5, 10, 25].map((r) => {
                      const isSelected = r === radiusKm || (r === null && !radiusKm);
                      return (
                        <button
                          key={r === null ? 'all' : `${r}km`}
                          type="button"
                          onClick={() => onRadiusChange(r)}
                          style={{ ...panelButton(isSelected), flex: 1 }}
                        >
                          {r === null ? t.all : `${r}km`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recenter */}
              <button
                type="button"
                onClick={handleRecenter}
                title={t.recenterTitle}
                style={{ ...panelButton(false, { wide: true }), width: '100%' }}
              >
                🎯 {t.recenter}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── PIN COUNTER (top-right) ── */}
      {showPinCounter && (
        <div
          style={{
            ...panelStyle,
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1000,
            padding: '7px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono'), monospace",
              fontWeight: 700,
              color: GOLD_LT,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {t.showing} {showUnits ? displayUnits.length : 0} {t.of} {units.length} {t.unitsWord}
          </span>
          <span style={{ opacity: 0.35 }}>|</span>
          <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: 10.5 }}>
            {NEW_CAIRO_COMPOUNDS.length} {t.compoundsWord}
          </span>
          {!showUnits && units.length > 0 && (
            <span
              style={{
                background: 'rgba(233,193,118,0.16)',
                border: `1px solid ${PANEL_BORDER}`,
                color: GOLD_LT,
                borderRadius: 999,
                fontSize: 9.5,
                fontWeight: 700,
                padding: '2px 8px',
              }}
            >
              🔍 {t.zoomHint}
            </span>
          )}
        </div>
      )}

      {/* ── LEGEND (bottom-left, collapsible) ── */}
      {showLegend && (
        <div style={{ ...panelStyle, position: 'absolute', bottom: 18, left: 12, zIndex: 1000, padding: legendOpen ? '10px 12px' : '7px 12px', maxWidth: 230 }}>
          <button
            type="button"
            onClick={() => setLegendOpen((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              color: GOLD_LT, fontFamily: 'inherit',
            }}
            aria-expanded={legendOpen}
          >
            <span style={sectionLabelStyle}>{t.legend}</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>{legendOpen ? '▾' : '▸'}</span>
          </button>

          {legendOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              <LegendRow>
                <LegendPill bg="#0f2942" border="#c99436" dot={SALE_GREEN} label="8.5M" />
                <LegendLabel>{t.forSale}</LegendLabel>
              </LegendRow>
              <LegendRow>
                <LegendPill bg="#0284c7" border={RENT_BLUE} dot={RENT_BLUE} label="28k/m" />
                <LegendLabel>{t.forRent}</LegendLabel>
              </LegendRow>
              <LegendRow>
                <LegendPill bg={GOLD_LT} border="#ffffff" dot="#0d0d0f" label="12.4M" />
                <LegendLabel>{t.selected}</LegendLabel>
              </LegendRow>
              <LegendRow>
                <LegendPill bg="#002b4b" border={GOLD_LT} dot={GOLD_LT} label="5.2M" />
                <LegendLabel>{t.inSelection}</LegendLabel>
              </LegendRow>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '2px 0' }} />
              <LegendRow>
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: NAVY_PILL, border: `1.5px solid rgba(233,193,118,0.6)`,
                    color: '#fff', borderRadius: 999, padding: '3px 9px', fontSize: 9.5, fontWeight: 800,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
                  Mivida · 27
                </span>
              </LegendRow>
              <LegendRow>
                <LegendDot color="#34d399" />
                <LegendLabel>{t.gpsVerified}</LegendLabel>
              </LegendRow>
              <LegendRow>
                <LegendDot color="#f59e0b" />
                <LegendLabel>{t.gpsPending}</LegendLabel>
              </LegendRow>
            </div>
          )}
        </div>
      )}

      <MapContainer
        center={centerCoords || NEW_CAIRO_DEFAULT_CENTER}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <MapController flyToCoords={flyToCoords || (activePlaced ? [activePlaced.renderLat, activePlaced.renderLng] : null)} flyToZoom={flyToZoom} />
        <ZoomWatcher onChange={handleZoomChange} />
        <TileLayer url={activeTile.url} attribution={activeTile.attrib} maxZoom={19} />

        {/* Proximity Radius Circle */}
        {radiusKm && radiusKm > 0 && (
          <Circle
            center={centerCoords || NEW_CAIRO_DEFAULT_CENTER}
            radius={radiusKm * 1000}
            pathOptions={{
              color: '#c99436',
              fillColor: '#c99436',
              fillOpacity: 0.12,
              weight: 2,
              dashArray: '6, 6',
            }}
          />
        )}

        {/* Compound Cluster Nodes — city & district scale (hidden at street zoom) */}
        {showCompounds &&
          NEW_CAIRO_COMPOUNDS.map((compound, idx) => {
            const isSelected = selectedCode === compound.code;
            const liveCount = resolveCompoundCount(compound, liveCounts);

            return (
              <Marker
                key={`compound-${compound.code}-${idx}`}
                position={[compound.lat, compound.lng]}
                icon={createCompoundIcon(compound, isSelected, liveCount, lang)}
                eventHandlers={{
                  click: () => {
                    onSelectCompound?.(compound);
                    onCenterChange?.([compound.lat, compound.lng]);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -18]} opacity={0.95}>
                  <div style={{ fontFamily: 'system-ui', fontSize: 11.5 }}>
                    <strong>{lang === 'ar' ? compound.nameAr : compound.nameEn}</strong>
                    {lang === 'en' && <> ({compound.nameAr})</>}
                    <div style={{ color: '#64748b', fontSize: 10 }}>
                      {compound.developer} · {liveCount ?? compound.unitsCount} {t.availableUnits}
                      {!compound.isGpsVerified && ' · ⏳'}
                    </div>
                  </div>
                </Tooltip>
              </Marker>
            );
          })}

        {/* Individual Unit Pins — street scale (decluttered at city zoom) */}
        {showUnits &&
          displayUnits.map((unit) => {
            const isMarked = selectedUnitIds.has(unit.id);
            const isActive = activeUnitId === unit.id || activeUnitId === unit.code;
            const waMsg = encodeURIComponent(
              isAr
                ? `${t.viewingQ} [${unit.code}] في كمبوند ${unit.compound} (${unit.priceLabel})؟`
                : `مرحباً سييرا العقارية، أود الاستفسار عن الوحدة [${unit.code}] في كمبوند ${unit.compound} (${unit.priceLabel}). هل هي متاحة للمعاينة؟`
            );

            return (
              <Marker
                key={`unit-${unit.id}`}
                position={[unit.renderLat, unit.renderLng]}
                icon={createUnitIcon(unit, isMarked, isActive)}
                eventHandlers={{
                  click: () => onSelectUnit?.(unit),
                }}
              >
                <Popup className="custom-unit-popup" maxWidth={260}>
                  <div style={{ width: 230, fontFamily: 'system-ui, sans-serif', color: '#0d0d0f' }}>
                    {unit.img && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={unit.img}
                        alt={unit.code}
                        style={{
                          width: '100%',
                          height: 120,
                          objectFit: 'cover',
                          borderRadius: 8,
                          marginBottom: 8,
                          backgroundColor: '#f1f5f9',
                        }}
                      />
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <strong style={{ fontSize: 13, color: '#8a6414' }}>{unit.code}</strong>
                      <span
                        style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 6,
                          background: unit.mode === 'rent' ? '#e0f2fe' : '#faf0d7',
                          color: unit.mode === 'rent' ? '#0369a1' : '#8a6414',
                          fontWeight: 700,
                        }}
                      >
                        {unit.mode === 'rent' ? t.forRent : t.forSale}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1f2937', marginBottom: 2 }}>
                      {unit.compound}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                      {unit.type} · {unit.beds ? `${unit.beds} ${t.beds}` : `3 ${t.beds}`} · {unit.area ? `${unit.area} m²` : '160 m²'}
                      {unit.distanceKm != null && (
                        <span style={{ color: '#8a6414', fontWeight: 700, marginLeft: 4 }}>
                          · 📍 {unit.distanceKm.toFixed(1)} km
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#059669', marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>
                      {unit.priceLabel}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <a
                        href={`https://wa.me/201092048333?text=${waMsg}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          width: '100%',
                          padding: '7px 0',
                          borderRadius: 8,
                          background: '#10b981',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: 11.5,
                          textDecoration: 'none',
                          boxShadow: '0 2px 6px rgba(16,185,129,0.2)',
                        }}
                      >
                        <span>💬 {t.directWhatsapp}</span>
                      </a>

                      {onToggleUnit && (
                        <button
                          type="button"
                          onClick={() => onToggleUnit(unit.id)}
                          style={{
                            width: '100%',
                            padding: '6px 0',
                            borderRadius: 8,
                            border: 'none',
                            background: isMarked ? '#002b4b' : '#f3f4f6',
                            color: isMarked ? GOLD_LT : '#374151',
                            fontWeight: 700,
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          {isMarked ? `✓ ${t.inSelection}` : t.addToSelection}
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}

/* ── Legend primitives ──────────────────────────────────────────────── */

function LegendRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>;
}

function LegendLabel({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.78)' }}>{children}</span>;
}

function LegendPill({ bg, border, dot, label }: { bg: string; border: string; dot: string; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 7px',
        borderRadius: 9,
        background: bg,
        border: `1.5px solid ${border}`,
        color: '#fff',
        fontSize: 9,
        fontWeight: 800,
        fontFamily: "var(--font-mono, 'JetBrains Mono'), monospace",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot }} />
      {label}
    </span>
  );
}

function LegendDot({ color }: { color: string }) {
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />;
}
