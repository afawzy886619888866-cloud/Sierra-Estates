'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Marker, Popup, MapContainer, TileLayer, useMap, Circle, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Moon,
  Sun,
  Globe,
  Compass,
  Crosshair,
  MapPin,
  ExternalLink,
  MessageCircle,
  Sparkles,
  Check,
  Plus,
  Search,
  Layers,
  Navigation,
  Eye,
  X,
  Share2,
} from 'lucide-react';

import { CompoundLocation, NEW_CAIRO_COMPOUNDS } from './compounds-data';
import { compoundShortName } from '@/lib/site/smart-search';
import CompoundUnitsExcelDrawer from './CompoundUnitsExcelDrawer';

export type { CompoundLocation };
export { NEW_CAIRO_COMPOUNDS };

export interface MapZonePreset {
  id: string;
  nameEn: string;
  nameAr: string;
  coords: [number, number];
  zoom: number;
}

export const NEW_CAIRO_ZONES: MapZonePreset[] = [
  { id: 'golden-square', nameEn: 'Golden Square', nameAr: 'المربع الذهبي', coords: [30.015, 31.605], zoom: 14 },
  { id: 'south-90', nameEn: 'South 90th', nameAr: 'التسعين الجنوبي', coords: [30.005, 31.520], zoom: 14 },
  { id: 'north-exp', nameEn: 'North Exp', nameAr: 'التوسعات الشمالية', coords: [30.055, 31.595], zoom: 14 },
  { id: 'capital-axis', nameEn: 'New Capital Axis', nameAr: 'محور العاصمة', coords: [30.020, 31.670], zoom: 14 },
];

export interface CairoLandmark {
  id: string;
  nameEn: string;
  nameAr: string;
  coords: [number, number];
}

export const NEW_CAIRO_LANDMARKS: CairoLandmark[] = [
  { id: 'auc', nameEn: 'AUC New Cairo', nameAr: 'الجامعة الأمريكية', coords: [30.0194, 31.5003] },
  { id: 'cfc', nameEn: 'Cairo Festival City', nameAr: 'كايرو فستيفال سيتي', coords: [30.0306, 31.4089] },
  { id: 'nac', nameEn: 'New Capital City Gate', nameAr: 'بوابة العاصمة الإدارية', coords: [30.0142, 31.7354] },
  { id: 'golden-sq', nameEn: 'Golden Square 90th', nameAr: 'محور التسعين / المربع الذهبي', coords: [30.015, 31.605] },
];

/** Haversine formula to compute distance in km between two GPS coordinates */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/** Google Maps Deeplink Helpers */
export function getGoogleMapsSearchUrl(lat: number, lng: number, label?: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}${label ? `+(${encodeURIComponent(label)})` : ''}`;
}

export function getGoogleMapsDirectionsUrl(destLat: number, destLng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
}

export function getGoogleStreetViewUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
}

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

export type MapTileStyle = 'google-hybrid' | 'google-streets' | 'google-terrain' | 'dark' | 'light' | 'satellite';

interface TileDefinition {
  url: string;
  attrib: string;
  subdomains?: string[];
  maxNativeZoom?: number;
  labelEn: string;
  labelAr: string;
  badge?: string;
}

const TILE_LAYERS: Record<MapTileStyle, TileDefinition> = {
  // Google Maps Hybrid: High-Res Satellite with Google Roads, Landmarks & Arabic/English Labels
  'google-hybrid': {
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attrib: '&copy; Google Maps & Sierra GIS Engine',
    subdomains: ['0', '1', '2', '3'],
    maxNativeZoom: 20,
    labelEn: 'Google Hybrid',
    labelAr: 'قمر صناعي جوجل',
    badge: 'HD',
  },
  // Google Maps Standard Streets: Authentic Google Maps Road Cartography
  'google-streets': {
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attrib: '&copy; Google Maps',
    subdomains: ['0', '1', '2', '3'],
    maxNativeZoom: 20,
    labelEn: 'Google Roads',
    labelAr: 'شوارع جوجل',
  },
  // Google Maps Terrain: Topography and Elevation Contours
  'google-terrain': {
    url: 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    attrib: '&copy; Google Maps Terrain',
    subdomains: ['0', '1', '2', '3'],
    maxNativeZoom: 20,
    labelEn: 'Google Terrain',
    labelAr: 'تضاريس جوجل',
  },
  // Sierra Obsidian: Signature Luxury Navy with Gold Highlights
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attrib: '&copy; CARTO & OpenStreetMap &copy; Google Maps Data',
    subdomains: ['a', 'b', 'c', 'd'],
    maxNativeZoom: 20,
    labelEn: 'Sierra Dark',
    labelAr: 'سييرا الليلي',
  },
  // Sierra Daylight Voyager: High-Contrast Editorial Map
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attrib: '&copy; CARTO & OpenStreetMap',
    subdomains: ['a', 'b', 'c', 'd'],
    maxNativeZoom: 20,
    labelEn: 'Sierra Daylight',
    labelAr: 'سييرا النهاري',
  },
  // Satellite alias mapped to Google Hybrid
  satellite: {
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attrib: '&copy; Google Maps Satellite',
    subdomains: ['0', '1', '2', '3'],
    maxNativeZoom: 20,
    labelEn: 'Google Hybrid',
    labelAr: 'قمر صناعي جوجل',
  },
};

const NEW_CAIRO_DEFAULT_CENTER: [number, number] = [30.025, 31.54];

/* ── Brand constants (Sierra champagne gold on obsidian) ─────────────── */
const GOLD = '#C8961A';
const GOLD_LT = '#E9C176';
const GOLD_SHEEN = '#F5D78E';
const NAVY_PILL = 'linear-gradient(135deg, #0d2136, #1e3a5f)';
const GOLD_PILL = `linear-gradient(135deg, ${GOLD_SHEEN}, ${GOLD})`;
const PANEL_BG = 'rgba(9, 18, 33, 0.94)';
const PANEL_BORDER = 'rgba(233, 193, 118, 0.28)';
const RENT_BLUE = '#38bdf8';
const SALE_GREEN = '#10b981';

/** Normalize a free-text compound/location label to a comparable key. */
export function normalizeCompoundKey(raw: string): string {
  let s = (raw || '').toLowerCase().trim();
  s = s.replace(/[–—]/g, ' ');
  s = s.replace(/\bphase\s*[-]?\s*\d+\b/g, ' ');
  s = s.replace(/\b(new cairo|fifth settlement|5th settlement|compound|the|nc|tagamoo|tagamo3)\b/g, ' ');
  s = s.replace(/[^a-z0-9\u0600-\u06ff\s]/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

/** Resolve the live count for a compound exactly */
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
  const distinctMatches = Object.keys(countsByNorm).filter(
    (key) => key && key !== target && (key.includes(target) || target.includes(key))
  );
  if (distinctMatches.length === 1 && match) return matchCount;
  return null;
}

/** Fan out unit pins sharing the same base coordinate */
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
      const r = 0.00045 * ring;
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

/** Stagger cap for smooth entrance */
function pinDelay(index: number, step = 26, cap = 600): number {
  return Math.min(index * step, cap);
}

function createCompoundIcon(
  compound: CompoundLocation,
  isSelected: boolean,
  liveCount: number | null,
  lang: 'en' | 'ar' = 'en',
  index = 0
) {
  const name =
    lang === 'ar'
      ? compound.nameAr || compound.code
      : compoundShortName(compound.nameEn) || compound.nameEn || compound.code;
  const count = liveCount ?? compound.unitsCount;
  const verified = compound.isGpsVerified;

  return L.divIcon({
    className: 'se-compound-wrap',
    html: `
      <div class="se-pill-inner se-compound-pill${isSelected ? ' se-pill-on' : ''}" style="
        animation-delay:${pinDelay(index, 22)}ms;
        position: absolute;
        left: 0; top: 0;
        transform: translate(-50%, -50%) ${isSelected ? 'perspective(400px) rotateX(10deg) scale(1.18)' : 'scale(1)'};
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: ${isSelected ? '7px 15px' : '5px 12px'};
        border-radius: 9999px;
        font-family: var(--font-jakarta, 'Plus Jakarta Sans'), system-ui, sans-serif;
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
        color: ${isSelected ? '#070b14' : '#ffffff'};
        background: ${isSelected ? GOLD_PILL : NAVY_PILL};
        box-shadow: ${isSelected ? `0 0 30px rgba(233,193,118,0.9), 0 8px 24px rgba(0,0,0,0.7)` : '0 4px 16px rgba(0,0,0,0.5)'};
        border: ${isSelected ? '2.5px solid #ffffff' : `1.5px solid ${verified ? 'rgba(233,193,118,0.7)' : 'rgba(245,158,11,0.8)'}`};
        cursor: pointer;
        transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease;
      ">
        ${isSelected ? '<span class="se-spark-ring"></span>' : ''}
        <span title="${verified ? 'GPS Google Maps verified' : 'Location pending verification'}" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${isSelected ? '#070b14' : verified ? '#34d399' : '#f59e0b'};box-shadow:0 0 6px ${verified ? 'rgba(52,211,153,0.9)' : 'rgba(245,158,11,0.9)'};"></span>
        ${isSelected ? '<span class="se-spark-icon">✨</span>' : ''}
        <span style="letter-spacing:-0.01em;">${name}</span>
        <span style="
          background: ${isSelected ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.2)'};
          color: inherit;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 8px;
          font-family: var(--font-mono, ui-monospace), monospace;
          font-weight: 800;
        ">${count}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -18],
  });
}

function createUnitIcon(unit: MapUnitPin, isMarked: boolean, isActive: boolean = false, index = 0) {
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
    ? '#0d2e4a'
    : '#0f2942';

  const textColor = isActive ? '#070b14' : isMarked ? GOLD_LT : '#ffffff';
  const borderColor = isActive
    ? '#ffffff'
    : isMarked
    ? GOLD_LT
    : isRent
    ? RENT_BLUE
    : '#c99436';

  const distBadge = unit.distanceKm != null
    ? `<span style="opacity:0.9;font-size:9.5px;font-weight:700;margin-left:3px;color:${isActive ? '#070b14' : GOLD_LT};">· ${unit.distanceKm.toFixed(1)}km</span>`
    : '';

  return L.divIcon({
    className: 'se-unit-wrap',
    html: `
      <div class="se-pin-inner se-unit-pin${isActive ? ' se-active' : ''}" style="
        animation-delay:${pinDelay(index)}ms;
        position: absolute;
        left: 0; top: 0;
        transform: translate(-50%, -50%) ${isActive ? 'scale(1.18)' : 'scale(1)'};
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: ${isActive ? '5px 11px' : '4px 9px'};
        border-radius: 12px;
        font-family: var(--font-jakarta, 'Plus Jakarta Sans'), system-ui, sans-serif;
        font-size: ${isActive ? '11.5px' : '10.5px'};
        font-weight: 800;
        white-space: nowrap;
        color: ${textColor};
        background: ${badgeBg};
        border: ${isActive ? '2.5px solid #ffffff' : `1.5px solid ${borderColor}`};
        box-shadow: ${isActive ? `0 0 24px rgba(233,193,118,0.95), 0 4px 16px rgba(0,0,0,0.6)` : '0 2px 10px rgba(0,0,0,0.5)'};
        cursor: pointer;
        transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.15s ease;
        z-index: ${isActive ? 9999 : 'auto'};
      ">
        ${isActive ? '<span class="se-ping"></span>' : ''}
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${isActive ? '#070b14' : isRent ? RENT_BLUE : SALE_GREEN};"></span>
        <span>${shortPrice}</span>
        ${distBadge}
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -14],
  });
}

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
      map.flyTo(flyToCoords, flyToZoom || 14, { duration: 0.85 });
    }
  }, [flyToCoords, flyToZoom, map]);
  return null;
}

/** Publishes map zoom & center changes */
function MapSyncWatcher({
  onZoomChange,
  onCenterChange,
}: {
  onZoomChange: (zoom: number) => void;
  onCenterChange?: (center: [number, number]) => void;
}) {
  const map = useMap();
  useEffect(() => {
    const report = () => {
      onZoomChange(map.getZoom());
      const c = map.getCenter();
      onCenterChange?.([c.lat, c.lng]);
    };
    report();
    map.on('zoomend', report);
    map.on('moveend', report);
    return () => {
      map.off('zoomend', report);
      map.off('moveend', report);
    };
  }, [map, onZoomChange, onCenterChange]);
  return null;
}

/* ── Shared glass-panel primitives ──────────────────────────────────── */

const panelStyle: React.CSSProperties = {
  background: PANEL_BG,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${PANEL_BORDER}`,
  borderRadius: 16,
  boxShadow: '0 12px 36px rgba(0,0,0,0.55), 0 0 20px rgba(200,150,26,0.1)',
  color: '#ffffff',
  fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans'), system-ui, sans-serif",
};

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'JetBrains Mono'), ui-monospace, monospace",
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: GOLD_LT,
};

function panelButton(
  selected: boolean,
  opts: { wide?: boolean; isGoogle?: boolean } = {}
): React.CSSProperties {
  return {
    background: selected
      ? GOLD_PILL
      : opts.isGoogle
      ? 'rgba(66, 133, 244, 0.14)'
      : 'rgba(255,255,255,0.08)',
    color: selected
      ? '#070b14'
      : opts.isGoogle
      ? '#93c5fd'
      : 'rgba(255,255,255,0.88)',
    fontWeight: selected ? 800 : 600,
    border: selected
      ? 'none'
      : opts.isGoogle
      ? '1px solid rgba(66, 133, 244, 0.35)'
      : '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: opts.wide ? '6px 12px' : '5px 9px',
    cursor: 'pointer',
    fontSize: 10.5,
    fontFamily: 'inherit',
    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  };
}

const MAP_MOTION_CSS = `
@keyframes se-map-fade{from{opacity:0}to{opacity:1}}
.se-map-root{animation:se-map-fade .45s ease both}
@keyframes se-pin-in{from{opacity:0;transform:translate(-50%,-38%) scale(.55)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
.se-unit-pin{animation:se-pin-in .4s cubic-bezier(.16,1,.3,1) backwards}
@keyframes se-pill-in{from{opacity:0;transform:translate(-50%,-78%) scale(.82)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
.se-compound-pill{animation:se-pill-in .45s cubic-bezier(.16,1,.3,1) backwards}
.se-unit-wrap:hover .se-unit-pin:not(.se-active){transform:translate(-50%,-50%) scale(1.12) !important;box-shadow:0 8px 24px rgba(9,18,33,.7) !important}
.se-compound-wrap:hover .se-compound-pill:not(.se-pill-on){transform:translate(-50%,-50%) scale(1.08) !important;box-shadow:0 8px 24px rgba(9,18,33,.65) !important}
.se-unit-pin.se-active{animation:none}
.se-ping{position:absolute;left:50%;top:50%;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;background:radial-gradient(circle,rgba(233,193,118,.55),rgba(233,193,118,0) 65%);animation:se-ping 1.8s cubic-bezier(0,0,.2,1) infinite;pointer-events:none}
@keyframes se-ping{0%{transform:scale(.35);opacity:.95}80%,100%{transform:scale(1.55);opacity:0}}
.se-radius-ring{animation:se-dash 1.8s linear infinite}
@keyframes se-dash{to{stroke-dashoffset:-24}}
.custom-unit-popup .leaflet-popup-content-wrapper{border-radius:16px;box-shadow:0 20px 50px rgba(7,15,27,.6);animation:se-pop-in .24s cubic-bezier(.16,1,.3,1);background:transparent;padding:0;border:1px solid rgba(233,193,118,0.25)}
.custom-unit-popup .leaflet-popup-content{margin:0;line-height:normal}
.custom-unit-popup .leaflet-popup-tip{background:#0d1f33;border:1px solid rgba(233,193,118,0.25)}
@keyframes se-pop-in{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}
.se-wa-btn{transition:transform .15s ease,filter .15s ease}
.se-wa-btn:hover{transform:translateY(-1px);filter:brightness(1.08)}
.se-gmap-btn{transition:all .15s ease}
.se-gmap-btn:hover{transform:translateY(-1px);background:rgba(66,133,244,0.25) !important;border-color:rgba(66,133,244,0.6) !important}

/* 3D golden spark animations */
@keyframes se-sparkle{0%,100%{transform:scale(1) rotate(0deg);opacity:.9;filter:drop-shadow(0 0 4px #e9c176)}50%{transform:scale(1.3) rotate(15deg);opacity:1;filter:drop-shadow(0 0 10px #f5d78e)}}
@keyframes se-spark-pulse{0%{transform:scale(.7);opacity:.95}60%{transform:scale(1.5);opacity:.35}100%{transform:scale(2.2);opacity:0}}
.se-spark-ring{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;border:2px solid rgba(245,215,142,.85);box-shadow:0 0 16px rgba(200,150,26,.7);animation:se-spark-pulse 1.6s cubic-bezier(0,0,.2,1) infinite;pointer-events:none}
.se-spark-icon{display:inline-block;font-size:11px;animation:se-sparkle 2.2s ease-in-out infinite;color:#f5d78e;margin-right:2px}
.se-compound-pill.se-pill-on{transform:translate(-50%,-50%) perspective(400px) rotateX(10deg) scale(1.18) !important;box-shadow:0 0 32px rgba(233,193,118,.95),0 8px 26px rgba(7,15,27,.8) !important}

@media(prefers-reduced-motion:reduce){
  .se-map-root,.se-unit-pin,.se-compound-pill,.se-radius-ring,.custom-unit-popup .leaflet-popup-content-wrapper{animation:none}
  .se-ping,.se-spark-ring,.se-spark-icon{display:none}
}
`;

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
  unitZoomThreshold?: number;
  compoundZoomCutoff?: number;
  showLegend?: boolean;
  showPinCounter?: boolean;
  visibleCompoundCodes?: string[] | null;
  showExcelDrawer?: boolean;
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
  visibleCompoundCodes = null,
  showExcelDrawer = true,
}: LiveMapProps) {
  const isAr = lang === 'ar';
  // Default to Google Hybrid for rich satellite + road overlays
  const [tileStyle, setTileStyle] = useState<MapTileStyle>('google-hybrid');
  const [zoom, setZoom] = useState(12);
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(centerCoords || NEW_CAIRO_DEFAULT_CENTER);
  const [legendOpen, setLegendOpen] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeExcelCompound, setActiveExcelCompound] = useState<CompoundLocation | null>(null);
  const liveCounts = useLiveUnitCounts();

  // Keep track of external selectedCode
  useEffect(() => {
    if (selectedCode) {
      const match = NEW_CAIRO_COMPOUNDS.find(
        (c) => c.code.toLowerCase() === selectedCode.toLowerCase()
      );
      if (match) {
        setActiveExcelCompound(match);
      }
    }
  }, [selectedCode]);

  const t = useMemo(
    () => ({
      basemap: isAr ? 'الخرائط' : 'Basemap',
      googleHybrid: isAr ? 'قمر صناعي جوجل' : 'Google Satellite HD',
      googleStreets: isAr ? 'شوارع جوجل' : 'Google Streets',
      sierraDark: isAr ? 'سييرا الليلي' : 'Sierra Dark',
      sierraLight: isAr ? 'سييرا النهاري' : 'Voyager',
      radius: isAr ? 'نطاق المسافة' : 'Radius Distance',
      all: isAr ? 'الكل' : 'All',
      recenter: isAr ? 'إعادة التمركز' : 'Recenter New Cairo',
      recenterTitle: isAr ? 'العودة إلى القاهرة الجديدة' : 'Recenter to New Cairo',
      legend: isAr ? 'دليل الخريطة' : 'Map Legend',
      forSale: isAr ? 'للبيع' : 'For Sale',
      forRent: isAr ? 'للإيجار' : 'For Rent',
      selected: isAr ? 'محدد حالياً' : 'Selected',
      inSelection: isAr ? 'ضمن المختار' : 'In Selection',
      gpsVerified: isAr ? 'موقع GPS مؤكد بجوجل' : 'Google GPS Verified',
      gpsPending: isAr ? 'قيد التدقيق الجغرافي' : 'Location Pending',
      showing: isAr ? 'معروض' : 'Showing',
      of: isAr ? 'من أصل' : 'of',
      unitsWord: isAr ? 'وحدة' : 'units',
      compoundsWord: isAr ? 'كمباند' : 'compounds',
      zoomHint: isAr ? 'قرّب لعرض الوحدات' : 'Zoom in to reveal units',
      availableUnits: isAr ? 'وحدة متاحة' : 'Available Units',
      directWhatsapp: isAr ? 'واتساب مباشر للمعاينة' : 'Direct WhatsApp',
      openInGoogleMaps: isAr ? 'خرائط جوجل' : 'Google Maps',
      getDirections: isAr ? 'الاتجاهات' : 'Directions',
      streetView: isAr ? 'بانوراما 360°' : 'Street View',
      addToSelection: isAr ? '+ أضف للمختار' : '+ Add to Selection',
      beds: isAr ? 'غرف' : 'Beds',
      keyZones: isAr ? 'المناطق والمحاور' : 'Key City Zones',
      searchCompound: isAr ? 'ابحث عن كمباند بالاسم...' : 'Search compound by name...',
      googleMapsEngine: isAr ? 'خرائط جوجل الرسمية + محرك سييرا GIS' : 'Google Maps Engine · Sierra GIS Active',
      openViewportInGoogle: isAr ? 'فتح المنطقة في Google Maps ↗' : 'Open Area in Google Maps ↗',
      landmarksProximity: isAr ? 'أقرب المعالم' : 'Landmark Proximity',
      viewingQ: isAr
        ? 'مرحباً سييرا العقارية، أود الاستفسار عن الوحدة'
        : 'Hello Sierra Estates, I would like to ask about unit',
    }),
    [isAr]
  );

  const handleZoomChange = useCallback((z: number) => setZoom(z), []);
  const handleCenterChange = useCallback((c: [number, number]) => {
    setCurrentCenter(c);
    onCenterChange?.(c);
  }, [onCenterChange]);

  const handleRecenter = useCallback(() => {
    onCenterChange?.(NEW_CAIRO_DEFAULT_CENTER);
    setCurrentCenter(NEW_CAIRO_DEFAULT_CENTER);
  }, [onCenterChange]);

  const activeTile = TILE_LAYERS[tileStyle] || TILE_LAYERS['google-hybrid'];

  // Sliced & spread pins
  const displayUnits = useMemo(() => {
    const sliced = units.slice(0, maxPins);
    return placePins(sliced);
  }, [units, maxPins]);

  // Zoom decluttering thresholds
  const showUnits = zoom >= unitZoomThreshold;
  const showCompounds = zoom < compoundZoomCutoff;

  const activePlaced = useMemo(
    () => displayUnits.find((u) => u.id === activeUnitId || u.code === activeUnitId) ?? null,
    [displayUnits, activeUnitId]
  );

  // Search filtered compounds
  const filteredSearchCompounds = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return NEW_CAIRO_COMPOUNDS.filter(
      (c) =>
        c.nameEn.toLowerCase().includes(q) ||
        c.nameAr.includes(q) ||
        c.code.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [searchQuery]);

  return (
    <div className="se-map-root" style={{ position: 'relative', width: '100%', height, overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: MAP_MOTION_CSS }} />

      {/* ── TOP-LEFT HUD & GOOGLE MAPS CONTROLLER ── */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 'calc(100vw - 24px)' }}>
        <div style={{ ...panelStyle, padding: controlsOpen ? '12px 14px' : '9px 14px', width: 280 }}>
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
            <span style={{ ...sectionLabelStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px rgba(59,130,246,0.8)' }} />
              <Layers size={12} className="shrink-0" />
              {t.googleMapsEngine}
            </span>
            <span style={{ fontSize: 11, opacity: 0.8, color: GOLD_LT }}>{controlsOpen ? '▾' : '▸'}</span>
          </button>

          {controlsOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              {/* Live Search Compound Jump */}
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', padding: '4px 8px' }}>
                  <Search size={12} style={{ color: GOLD_LT, marginRight: 6, flexShrink: 0 }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchCompound}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#ffffff',
                      fontSize: 11,
                      width: '100%',
                      fontFamily: 'inherit',
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {filteredSearchCompounds.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                    background: 'rgba(9, 18, 33, 0.98)', border: `1px solid ${PANEL_BORDER}`,
                    borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.7)', zIndex: 1200,
                    overflow: 'hidden',
                  }}>
                    {filteredSearchCompounds.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          onCenterChange?.([c.lat, c.lng]);
                          setActiveExcelCompound(c);
                          onSelectCompound?.(c);
                          setSearchQuery('');
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          width: '100%', padding: '6px 10px', background: 'none', border: 'none',
                          color: '#f8fafc', fontSize: 11, textAlign: isAr ? 'right' : 'left',
                          cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(233,193,118,0.15)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        <span style={{ fontWeight: 700, color: GOLD_LT }}>{isAr ? c.nameAr : c.nameEn}</span>
                        <span style={{ fontSize: 9.5, color: '#94a3b8' }}>{c.developer}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Basemap Selection with Google Maps Highlights */}
              <div>
                <div style={{ ...sectionLabelStyle, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{t.basemap}</span>
                  <span style={{ fontSize: 8.5, color: '#60a5fa' }}>Google Satellite Active</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                  <button
                    type="button"
                    onClick={() => setTileStyle('google-hybrid')}
                    style={panelButton(tileStyle === 'google-hybrid' || tileStyle === 'satellite', { isGoogle: true })}
                    title="Google High-Definition Satellite with Road and Place Overlays"
                  >
                    <Globe size={11} />
                    <span>{t.googleHybrid}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTileStyle('google-streets')}
                    style={panelButton(tileStyle === 'google-streets', { isGoogle: true })}
                    title="Google Maps Official Street Cartography"
                  >
                    <Navigation size={11} />
                    <span>{t.googleStreets}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTileStyle('dark')}
                    style={panelButton(tileStyle === 'dark')}
                    title="Sierra Signature Obsidian Dark Mode"
                  >
                    <Moon size={11} />
                    <span>{t.sierraDark}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTileStyle('light')}
                    style={panelButton(tileStyle === 'light')}
                    title="Sierra Clean Daylight Mode"
                  >
                    <Sun size={11} />
                    <span>{t.sierraLight}</span>
                  </button>
                </div>
              </div>

              {/* Key City Zones Jump */}
              <div>
                <div style={{ ...sectionLabelStyle, marginBottom: 5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Compass size={10} /> {t.keyZones}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {NEW_CAIRO_ZONES.map((z) => (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => {
                        onCenterChange?.(z.coords);
                      }}
                      style={{
                        ...panelButton(false),
                        fontSize: 9.5,
                        padding: '4px 6px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textAlign: 'center',
                        justifyContent: 'center',
                      }}
                      title={isAr ? z.nameAr : z.nameEn}
                    >
                      {isAr ? z.nameAr : z.nameEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Radius Filter */}
              {onRadiusChange && (
                <div>
                  <div style={{ ...sectionLabelStyle, marginBottom: 5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={10} /> {t.radius}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[null, 5, 10, 20].map((r) => {
                      const isSelected = r === radiusKm || (r === null && !radiusKm);
                      return (
                        <button
                          key={r === null ? 'all' : `${r}km`}
                          type="button"
                          onClick={() => onRadiusChange(r)}
                          style={{ ...panelButton(isSelected), flex: 1, justifyContent: 'center' }}
                        >
                          {r === null ? t.all : `${r}km`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Actions Row */}
              <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
                {/* Recenter button */}
                <button
                  type="button"
                  onClick={handleRecenter}
                  title={t.recenterTitle}
                  style={{
                    ...panelButton(false, { wide: true }),
                    flex: 1,
                    justifyContent: 'center',
                  }}
                >
                  <Crosshair size={11} /> {t.recenter}
                </button>

                {/* Open Viewport in Google Maps */}
                <a
                  href={`https://www.google.com/maps/@${currentCenter[0]},${currentCenter[1]},${zoom}z`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open this exact view in Google Maps"
                  style={{
                    ...panelButton(false, { wide: true, isGoogle: true }),
                    flex: 1,
                    justifyContent: 'center',
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={11} />
                  <span>Google Maps</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── TOP-RIGHT METRICS & GOOGLE CALIBRATION BADGE ── */}
      {showPinCounter && (
        <div
          style={{
            ...panelStyle,
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1000,
            padding: '7px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 11,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.8)' }} />
            <span
              style={{
                fontFamily: "var(--font-mono, 'JetBrains Mono'), monospace",
                fontWeight: 800,
                color: GOLD_LT,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {t.showing} {showUnits ? displayUnits.length : 0} {t.of} {units.length} {t.unitsWord}
            </span>
          </div>

          <span style={{ opacity: 0.35 }}>|</span>

          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10.5, fontWeight: 700 }}>
            {NEW_CAIRO_COMPOUNDS.length} {t.compoundsWord}
          </span>

          {!showUnits && units.length > 0 && (
            <span
              style={{
                background: 'rgba(233,193,118,0.18)',
                border: `1px solid ${PANEL_BORDER}`,
                color: GOLD_SHEEN,
                borderRadius: 999,
                fontSize: 9.5,
                fontWeight: 700,
                padding: '2px 8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Search size={9} /> {t.zoomHint}
            </span>
          )}
        </div>
      )}

      {/* ── BOTTOM-LEFT LEGEND ── */}
      {showLegend && (
        <div style={{ ...panelStyle, position: 'absolute', bottom: 18, left: 12, zIndex: 1000, padding: legendOpen ? '10px 14px' : '7px 12px', maxWidth: 240 }}>
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
                <LegendPill bg="#0f2942" border={RENT_BLUE} dot={RENT_BLUE} label="28k/m" />
                <LegendLabel>{t.forRent}</LegendLabel>
              </LegendRow>
              <LegendRow>
                <LegendPill bg={GOLD_LT} border="#ffffff" dot="#070b14" label="12.4M" />
                <LegendLabel>{t.selected}</LegendLabel>
              </LegendRow>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '2px 0' }} />
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

      {/* ── LEAFLET MAP CONTAINER ── */}
      <MapContainer
        center={centerCoords || NEW_CAIRO_DEFAULT_CENTER}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <MapController flyToCoords={flyToCoords || (activePlaced ? [activePlaced.renderLat, activePlaced.renderLng] : null)} flyToZoom={flyToZoom} />
        <MapSyncWatcher onZoomChange={handleZoomChange} onCenterChange={handleCenterChange} />
        <TileLayer
          url={activeTile.url}
          attribution={activeTile.attrib}
          subdomains={activeTile.subdomains || ['a', 'b', 'c', 'd']}
          maxZoom={20}
          maxNativeZoom={activeTile.maxNativeZoom || 20}
          detectRetina={true}
        />

        {/* Proximity Radius Circle */}
        {radiusKm && radiusKm > 0 && (
          <Circle
            center={centerCoords || NEW_CAIRO_DEFAULT_CENTER}
            radius={radiusKm * 1000}
            pathOptions={{
              className: 'se-radius-ring',
              color: '#c99436',
              fillColor: '#e9c176',
              fillOpacity: 0.12,
              weight: 2,
              dashArray: '6, 6',
            }}
          />
        )}

        {/* Compound Cluster Nodes — city & district scale */}
        {showCompounds &&
          (visibleCompoundCodes && visibleCompoundCodes.length > 0
            ? NEW_CAIRO_COMPOUNDS.filter((c) => visibleCompoundCodes.includes(c.code))
            : NEW_CAIRO_COMPOUNDS
          ).map((compound, idx) => {
            const isSelected = selectedCode === compound.code || activeExcelCompound?.code === compound.code;
            const liveCount = resolveCompoundCount(compound, liveCounts);

            // Compute distance to AUC for reference
            const distToAuc = calculateDistanceKm(compound.lat, compound.lng, 30.0194, 31.5003);

            return (
              <Marker
                key={`compound-${compound.code}-${idx}`}
                position={[compound.lat, compound.lng]}
                icon={createCompoundIcon(compound, isSelected, liveCount, lang, idx)}
                eventHandlers={{
                  click: () => {
                    setActiveExcelCompound(compound);
                    onSelectCompound?.(compound);
                    onCenterChange?.([compound.lat, compound.lng]);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -20]} opacity={0.96}>
                  <div style={{ fontFamily: "var(--font-jakarta, system-ui)", fontSize: 12, padding: '4px 2px' }}>
                    <div style={{ fontWeight: 800, color: '#f5d78e', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{lang === 'ar' ? compound.nameAr : compound.nameEn}</span>
                      {compound.isGpsVerified && <span title="Google Maps Verified" style={{ fontSize: 10 }}>📍</span>}
                    </div>
                    {lang === 'en' && <div style={{ color: '#cbd5e1', fontSize: 10.5 }}>{compound.nameAr}</div>}
                    <div style={{ color: '#94a3b8', fontSize: 10.5, marginTop: 3 }}>
                      {compound.developer} · <strong style={{ color: '#ffffff' }}>{liveCount ?? compound.unitsCount}</strong> {t.availableUnits}
                    </div>
                    <div style={{ color: '#60a5fa', fontSize: 9.5, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Navigation size={9} />
                      <span>{distToAuc} km from AUC Campus</span>
                    </div>
                  </div>
                </Tooltip>
              </Marker>
            );
          })}

        {/* Individual Unit Pins — street scale */}
        {showUnits &&
          displayUnits.map((unit, idx) => {
            const isMarked = selectedUnitIds.has(unit.id);
            const isActive = activeUnitId === unit.id || activeUnitId === unit.code;
            const waMsg = encodeURIComponent(
              isAr
                ? `${t.viewingQ} [${unit.code}] في كمبوند ${unit.compound} (${unit.priceLabel})؟`
                : `مرحباً سييرا العقارية، أود الاستفسار عن الوحدة [${unit.code}] في كمبوند ${unit.compound} (${unit.priceLabel}). هل هي متاحة للمعاينة؟`
            );

            const gMapUrl = getGoogleMapsSearchUrl(unit.lat, unit.lng, `${unit.code} ${unit.compound}`);
            const gDirUrl = getGoogleMapsDirectionsUrl(unit.lat, unit.lng);
            const gStreetUrl = getGoogleStreetViewUrl(unit.lat, unit.lng);

            return (
              <Marker
                key={`unit-${unit.id}`}
                position={[unit.renderLat, unit.renderLng]}
                icon={createUnitIcon(unit, isMarked, isActive, idx)}
                eventHandlers={{
                  click: () => onSelectUnit?.(unit),
                }}
              >
                <Popup className="custom-unit-popup" maxWidth={285}>
                  <div style={{ width: 260, fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans'), system-ui, sans-serif", color: '#f8fafc', background: '#0a1626', padding: 13, borderRadius: 16 }}>
                    {unit.img && (
                      <div style={{ position: 'relative', width: '100%', height: 130, borderRadius: 10, overflow: 'hidden', marginBottom: 10, backgroundColor: '#071523' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={unit.img}
                          alt={unit.code}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,22,38,0.8) 0%, transparent 55%)' }} />
                        <div style={{ position: 'absolute', bottom: 6, left: 8, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 4, fontSize: 9.5, color: '#f8fafc' }}>
                          <MapPin size={9} style={{ color: '#60a5fa' }} />
                          <span>Google GPS {unit.lat.toFixed(4)}, {unit.lng.toFixed(4)}</span>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <Link
                        href={`/property/${encodeURIComponent(unit.id || unit.code)}`}
                        style={{ fontSize: 13.5, color: GOLD_SHEEN, fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        {unit.code}
                        <ExternalLink size={11} style={{ opacity: 0.8 }} />
                      </Link>
                      <span
                        style={{
                          fontSize: 10,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: unit.mode === 'rent' ? 'rgba(56,189,248,0.2)' : 'rgba(200,150,26,0.25)',
                          color: unit.mode === 'rent' ? '#7dd3fc' : GOLD_LT,
                          border: `1px solid ${unit.mode === 'rent' ? 'rgba(56,189,248,0.45)' : 'rgba(200,150,26,0.5)'}`,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {unit.mode === 'rent' ? t.forRent : t.forSale}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', marginBottom: 3 }}>
                      {unit.compound}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
                      <span>{unit.type}</span>
                      <span>·</span>
                      <span>{unit.beds ? `${unit.beds} ${t.beds}` : `? ${t.beds}`}</span>
                      <span>·</span>
                      <span style={{ fontFamily: "var(--font-mono, 'JetBrains Mono'), monospace" }}>{unit.area ? `${unit.area} m²` : '? m²'}</span>
                      {unit.distanceKm != null && (
                        <span style={{ color: GOLD_LT, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                          · <MapPin size={10} /> {unit.distanceKm.toFixed(1)} km
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#34d399', marginBottom: 10, fontFamily: "var(--font-mono, 'JetBrains Mono'), monospace" }}>
                      {unit.priceLabel}
                    </div>

                    {/* Integrated Google Maps Actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 8 }}>
                      <a
                        className="se-gmap-btn"
                        href={gMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          padding: '5px 8px',
                          borderRadius: 8,
                          background: 'rgba(66, 133, 244, 0.16)',
                          border: '1px solid rgba(66, 133, 244, 0.4)',
                          color: '#93c5fd',
                          fontSize: 10.5,
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        <MapPin size={11} />
                        <span>{t.openInGoogleMaps}</span>
                      </a>
                      <a
                        className="se-gmap-btn"
                        href={gDirUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          padding: '5px 8px',
                          borderRadius: 8,
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#e2e8f0',
                          fontSize: 10.5,
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        <Navigation size={11} />
                        <span>{t.getDirections}</span>
                      </a>
                    </div>

                    {/* Direct Contact Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <a
                        className="se-wa-btn"
                        href={`https://wa.me/201092048333?text=${waMsg}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          width: '100%',
                          padding: '8px 0',
                          borderRadius: 8,
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: 12,
                          textDecoration: 'none',
                          boxShadow: '0 3px 12px rgba(16,185,129,0.35)',
                        }}
                      >
                        <MessageCircle size={14} />
                        <span>{t.directWhatsapp}</span>
                      </a>

                      {onToggleUnit && (
                        <button
                          type="button"
                          onClick={() => onToggleUnit(unit.id)}
                          style={{
                            width: '100%',
                            padding: '6px 0',
                            borderRadius: 8,
                            border: `1px solid ${isMarked ? GOLD_LT : 'rgba(255,255,255,0.12)'}`,
                            background: isMarked ? '#002b4b' : 'rgba(255,255,255,0.06)',
                            color: isMarked ? GOLD_LT : '#cbd5e1',
                            fontWeight: 700,
                            fontSize: 11,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                          }}
                        >
                          {isMarked ? <Check size={12} /> : <Plus size={12} />}
                          {isMarked ? t.inSelection : t.addToSelection}
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* ── Compound Units Excel HUD Sheet Drawer ── */}
      {activeExcelCompound && showExcelDrawer && (
        <CompoundUnitsExcelDrawer
          compound={activeExcelCompound}
          units={units}
          lang={lang}
          onClose={() => setActiveExcelCompound(null)}
          onSelectUnit={onSelectUnit}
        />
      )}
    </div>
  );
}

/* ── Legend primitives ──────────────────────────────────────────────── */

function LegendRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>;
}

function LegendLabel({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.85)' }}>{children}</span>;
}

function LegendPill({ bg, border, dot, label }: { bg: string; border: string; dot: string; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 9,
        background: bg,
        border: `1.5px solid ${border}`,
        color: '#fff',
        fontSize: 9.5,
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
