'use client';
/**
 * InventoryMap — Sierra Estates Houzez-Style Interactive Spatial GIS Map
 *
 * Implements:
 * 1. Houzez Luxury Signature Palette (#00aeff, #002b4b, #0d2136, #16a34a, #e9c176).
 * 2. Multi-Tile Cartography (Houzez Obsidian Dark, Alabaster Light, Esri Photorealistic Satellite).
 * 3. Live Inventory Synchronization with deterministic coordinate fan-out for overlapping centroids.
 * 4. MapCommanderAgent GIS coordinate boundary validation & real-time photo harvesting trigger.
 * 5. Framer-motion fluid drawer transitions and interactive HUD controls.
 *
 * Governed by: /google-maps-platform, /sierra-map-agent, /threat-mitigation-mapping, /impeccable, /ui-ux-pro-max
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Circle, Tooltip, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Camera,
  ExternalLink,
  MessageCircle,
  Building2,
  Sun,
  Moon,
  Globe,
  X,
  Compass,
  Radio,
  Zap,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Phone,
} from 'lucide-react';
import {
  TARGET_14_COMPOUND_POLYGONS,
  NEW_CAIRO_LANDMARKS,
  calculateHaversineDistanceKm,
  calculateDriveTimeMin,
  getCompoundGisData,
  type CompoundGisData,
} from '@/lib/gis/compound-polygons';
import type { InventoryUnit, InventoryStatus } from '@/lib/inventory/types';
import { hasPendingPhoto } from '@/lib/inventory/normalize';
import { NEW_CAIRO_COMPOUNDS, type CompoundLocation } from '@/components/Maps/compounds-data';
import { MapCommanderAgent } from '@/lib/services/MapCommanderAgent';

export const SIERRA_WHATSAPP_PHONE = '201092048333';
export const SIERRA_CONTACT_PHONE = '01092048333';

/* ── Tile Layer Configurations ─────────────────────────────────────────── */
export type MapTileStyle = 'dark' | 'light' | 'satellite';

const TILE_LAYERS: Record<MapTileStyle, { url: string; attrib: string; maxZoom: number }> = {
  dark: {
    url: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attrib: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 22,
  },
  light: {
    url: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attrib: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 22,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attrib: '&copy; Esri &mdash; DigitalGlobe, GeoEye, Earthstar Geographics',
    maxZoom: 22,
  },
};

const NEW_CAIRO_CENTER: [number, number] = [30.025, 31.54];

export const ZONE_PRESETS = [
  { id: 'all', nameEn: 'All New Cairo', nameAr: 'القاهرة الجديدة كاملة', coords: [30.025, 31.54] as [number, number], zoom: 12 },
  { id: 'golden-square', nameEn: 'Golden Square', nameAr: 'المربع الذهبي', coords: [30.015, 31.605] as [number, number], zoom: 14 },
  { id: 'south-90', nameEn: 'South 90th', nameAr: 'التسعين الجنوبي', coords: [30.005, 31.520] as [number, number], zoom: 14 },
  { id: 'north-exp', nameEn: 'North Expansions', nameAr: 'التوسعات الشمالية', coords: [30.055, 31.595] as [number, number], zoom: 14 },
  { id: 'capital-axis', nameEn: 'New Capital Axis', nameAr: 'محور العاصمة', coords: [30.020, 31.670] as [number, number], zoom: 14 },
];

/* ── Houzez Brand Status Colors ────────────────────────────────────────── */
export const _STATUS_COLORS: Record<InventoryStatus, string> = {
  available: '#16a34a', // Emerald green
  follow_up: '#d97706', // Amber gold
  no_answer: '#64748b', // Slate
  unavailable: '#94a3b8', // Gray
};

interface PlacedUnit extends InventoryUnit {
  renderLat: number;
  renderLng: number;
}

/**
 * Deterministically fan out overlapping compound units onto concentric rings
 * so all units remain distinct and clickable.
 */
function placeUnits(units: InventoryUnit[]): PlacedUnit[] {
  const groups = new Map<string, InventoryUnit[]>();
  for (const u of units) {
    const key = `${u.lat.toFixed(4)},${u.lng.toFixed(4)}`;
    const arr = groups.get(key);
    if (arr) arr.push(u);
    else groups.set(key, [u]);
  }
  const placed: PlacedUnit[] = [];
  for (const arr of groups.values()) {
    if (arr.length === 1) {
      placed.push({ ...arr[0], renderLat: arr[0].lat, renderLng: arr[0].lng });
      continue;
    }
    arr.forEach((u, i) => {
      const ring = Math.floor(i / 8) + 1;
      const angle = (i % 8) * (Math.PI / 4) + ring * 0.55;
      const r = 0.0035 * ring;
      placed.push({
        ...u,
        renderLat: u.lat + r * Math.cos(angle),
        renderLng: u.lng + r * Math.sin(angle),
      });
    });
  }
  return placed;
}

/**
 * Custom Houzez Luxury Marker Icon
 */
function createUnitMarkerIcon(u: InventoryUnit, isSelected: boolean) {
  const isSale = u.mode === 'sale';
  const badgeColor = isSale ? '#16a34a' : '#00aeff';
  const ringColor = isSelected ? '#ffffff' : 'rgba(255,255,255,0.85)';
  const glow = isSelected ? '0 0 16px rgba(0,174,255,0.9), 0 4px 12px rgba(0,0,0,0.45)' : '0 2px 8px rgba(0,0,0,0.3)';
  const priceDisplay = u.priceLabel ? u.priceLabel.split(' ')[0] : (isSale ? 'S' : 'R');

  return L.divIcon({
    className: 'houzez-unit-marker',
    html: `
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: ${badgeColor};
        color: #ffffff;
        padding: ${isSelected ? '4px 9px' : '3px 7px'};
        border-radius: 999px;
        border: 2px solid ${ringColor};
        box-shadow: ${glow};
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        font-weight: 800;
        font-size: ${isSelected ? '12px' : '11px'};
        line-height: 1;
        cursor: pointer;
        transform: translate(-50%, -50%) ${isSelected ? 'scale(1.12)' : 'scale(1)'};
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        white-space: nowrap;
      ">
        <span style="
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ffffff;
        "></span>
        <span>${priceDisplay}</span>
      </div>
    `,
    iconSize: [60, 24],
    iconAnchor: [30, 12],
  });
}

function createCompoundHubIcon(comp: CompoundLocation, count: number, isVerified: boolean) {
  return L.divIcon({
    className: 'houzez-compound-hub',
    html: `
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #002b4b;
        color: #ffffff;
        padding: 4px 10px;
        border-radius: 8px;
        border: 1.5px solid rgba(0,174,255,0.6);
        box-shadow: 0 4px 14px rgba(0,43,75,0.45);
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        font-weight: 700;
        font-size: 11px;
        cursor: pointer;
        transform: translate(-50%, -50%);
        white-space: nowrap;
      ">
        <span style="color: #00aeff; font-size: 12px;">★</span>
        <span>${comp.nameEn}</span>
        ${count > 0 ? `<span style="background: rgba(0,174,255,0.25); color: #00aeff; padding: 1px 5px; border-radius: 4px; font-size: 10px;">${count}</span>` : ''}
        ${isVerified ? `<span style="color: #22c55e; font-size: 11px;">✓</span>` : ''}
      </div>
    `,
    iconSize: [110, 28],
    iconAnchor: [55, 14],
  });
}

export interface HarvesterPulse {
  id: string;
  compound: string;
  type: string;
  price: number;
  areaSqm?: number;
  mode: 'sale' | 'rent';
  discountPct?: number;
  hotDeal?: boolean;
  lat: number;
  lng: number;
  timestamp: number;
}

function createHarvesterPulseIcon(pulse: HarvesterPulse) {
  const isHot = pulse.hotDeal || (pulse.discountPct && pulse.discountPct >= 8);
  const pulseColor = isHot ? '#f59e0b' : '#00aeff';
  const pulseBorder = isHot ? '#ef4444' : '#0284c7';

  return L.divIcon({
    className: 'houzez-harvester-pulse-marker',
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); cursor: pointer;">
        <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: ${pulseColor}; opacity: 0.75; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background: ${pulseColor}; border: 2.5px solid #ffffff; box-shadow: 0 0 10px ${pulseBorder};"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

/** Component to programmatically fly map to coordinate */
function MapFlyer({ target, zoom }: { target: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, zoom ?? Math.max(map.getZoom(), 14), { duration: 0.8 });
    }
  }, [target, zoom, map]);
  return null;
}

export interface InventoryMapProps {
  units?: InventoryUnit[];
  selectedId?: string | null;
  onSelect?: (u: InventoryUnit) => void;
  onSelectCompound?: (compoundName: string) => void;
  lang?: 'en' | 'ar';
  isDarkMode?: boolean;
  hideToolbar?: boolean;
}

export default function InventoryMap({
  units: initialUnits,
  selectedId: controlledSelectedId,
  onSelect,
  onSelectCompound,
  lang = 'en',
  isDarkMode = true,
  hideToolbar = false,
}: InventoryMapProps) {
  const isAr = lang === 'ar';

  const [units, setUnits] = useState<InventoryUnit[]>(initialUnits || []);
  const [selectedUnit, setSelectedUnit] = useState<InventoryUnit | null>(null);
  const [activeZone, setActiveZone] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'sale' | 'rent'>('all');
  const [photoFilter, setPhotoFilter] = useState<boolean>(false);
  const [tileStyle, setTileStyle] = useState<MapTileStyle>(isDarkMode ? 'dark' : 'light');
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [flyZoom, setFlyZoom] = useState<number | undefined>(undefined);
  const [showRadarRings, setShowRadarRings] = useState<boolean>(true);
  const [photoRequestStatus, setPhotoRequestStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'cooldown'>>({});

  // Real-time Harvester Live Opportunities & Telemetry (HARV-030-003)
  const [harvesterPulses, setHarvesterPulses] = useState<HarvesterPulse[]>([]);
  const [latestOpportunityAlert, setLatestOpportunityAlert] = useState<HarvesterPulse | null>(null);
  const [sseConnected, setSseConnected] = useState<boolean>(false);

  // Real-time Harvester SSE Stream Connection (HARV-030-003)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pulseExpiryTimer: NodeJS.Timeout | null = null;

    try {
      eventSource = new EventSource('/api/harvester/stream');

      eventSource.addEventListener('connected', () => {
        setSseConnected(true);
      });

      eventSource.addEventListener('opportunity', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
            const pulse: HarvesterPulse = {
              id: data.id || `pulse-${Date.now()}`,
              compound: data.compound || 'New Cairo',
              type: data.type || 'Property',
              price: data.price || 0,
              areaSqm: data.areaSqm,
              mode: data.mode || 'sale',
              discountPct: data.discountPct,
              hotDeal: Boolean(data.hotDeal),
              lat: data.lat,
              lng: data.lng,
              timestamp: Date.now(),
            };

            setHarvesterPulses((prev) => [pulse, ...prev.slice(0, 19)]);
            setLatestOpportunityAlert(pulse);

            setTimeout(() => {
              setLatestOpportunityAlert((current) => (current?.id === pulse.id ? null : current));
            }, 8000);
          }
        } catch (err) {
          console.warn('[InventoryMap] Failed to parse opportunity SSE:', err);
        }
      });

      eventSource.onerror = () => {
        setSseConnected(false);
      };
    } catch (err) {
      console.warn('[InventoryMap] SSE connection failed:', err);
    }

    pulseExpiryTimer = setInterval(() => {
      const now = Date.now();
      setHarvesterPulses((prev) => prev.filter((p) => now - p.timestamp < 180000));
    }, 30000);

    return () => {
      if (eventSource) eventSource.close();
      if (pulseExpiryTimer) clearInterval(pulseExpiryTimer);
    };
  }, []);

  // Sync with initialUnits if provided
  useEffect(() => {
    if (initialUnits && initialUnits.length > 0) {
      setUnits(initialUnits);
    }
  }, [initialUnits]);

  // If no units passed, fetch live /api/inventory
  useEffect(() => {
    if (!initialUnits || initialUnits.length === 0) {
      fetch('/api/inventory?limit=500')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.units)) {
            setUnits(data.units);
          }
        })
        .catch(() => {});
    }
  }, [initialUnits]);

  // Sync tileStyle with isDarkMode if user changes it
  useEffect(() => {
    setTileStyle(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Filtered unit set
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      if (modeFilter !== 'all' && u.mode !== modeFilter) return false;
      if (photoFilter && hasPendingPhoto(u.img)) return false;
      if (activeZone !== 'all') {
        const zoneObj = ZONE_PRESETS.find((z) => z.id === activeZone);
        if (zoneObj && zoneObj.coords) {
          const dist = Math.hypot(u.lat - zoneObj.coords[0], u.lng - zoneObj.coords[1]);
          if (dist > 0.04) return false;
        }
      }
      return true;
    });
  }, [units, modeFilter, photoFilter, activeZone]);

  const placedUnits = useMemo(() => placeUnits(filteredUnits), [filteredUnits]);

  // Compound coverage stats from MapCommanderAgent
  const compoundStats = useMemo(() => {
    // Map inventory units to MapUnitPin format for agent analysis
    const pins = units.map((u) => ({
      id: u.id,
      code: u.code || u.id,
      compound: u.compound || u.location,
      lat: u.lat,
      lng: u.lng,
      priceLabel: u.priceLabel || `${u.price.toLocaleString()} EGP`,
      type: u.propertyType || u.type || 'Property',
      mode: u.mode,
      img: u.img,
      featured: u.featured,
    }));
    return MapCommanderAgent.analyzeCompoundCoverage(NEW_CAIRO_COMPOUNDS, pins);
  }, [units]);

  // Handle unit selection
  const handleSelectUnit = useCallback(
    (u: InventoryUnit) => {
      setSelectedUnit(u);
      setFlyTarget([u.lat, u.lng]);
      setFlyZoom(15);
      if (onSelect) onSelect(u);
    },
    [onSelect]
  );

  // Handle Photo Harvesting trigger
  const handleRequestPhotos = async (unit: InventoryUnit) => {
    const code = unit.code || unit.id;
    setPhotoRequestStatus((prev) => ({ ...prev, [code]: 'loading' }));

    try {
      const res = await fetch('/api/inventory/request-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitCode: code,
          compound: unit.compound || unit.location,
          unitId: unit.id,
          requesterName: 'Sierra Client Portal User',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (data.alreadyRequested) {
        setPhotoRequestStatus((prev) => ({ ...prev, [code]: 'cooldown' }));
      } else if (res.ok && data.success) {
        setPhotoRequestStatus((prev) => ({ ...prev, [code]: 'success' }));
      } else {
        setPhotoRequestStatus((prev) => ({ ...prev, [code]: 'idle' }));
      }
    } catch {
      setPhotoRequestStatus((prev) => ({ ...prev, [code]: 'idle' }));
    }
  };

  const handleZoneSelect = (zoneId: string) => {
    setActiveZone(zoneId);
    const preset = ZONE_PRESETS.find((z) => z.id === zoneId);
    if (preset) {
      setFlyTarget(preset.coords);
      setFlyZoom(preset.zoom);
    }
  };

  return (
    <div className="relative w-full h-170 rounded-2xl overflow-hidden border border-[#00aeff]/30 shadow-2xl bg-[#001f38] flex flex-col font-sans select-none" style={{ position: 'relative', width: '100%', height: 680, minHeight: 680, display: 'flex', flexDirection: 'column' }}>
      {!hideToolbar && (
      <div className="z-30 w-full px-4 py-3 bg-[#002b4b]/95 backdrop-blur-md border-b border-[#00aeff]/25 flex flex-wrap items-center justify-between gap-3 text-xs text-white">
        {/* Left: Zone Jump Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-[#00aeff] font-bold uppercase tracking-wider text-[11px] whitespace-nowrap flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-[#00aeff]" />
            <span>{isAr ? 'المناطق:' : 'Zones:'}</span>
          </span>
          {ZONE_PRESETS.map((z) => (
            <button
              key={z.id}
              onClick={() => handleZoneSelect(z.id)}
              className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                activeZone === z.id
                  ? 'bg-[#00aeff] text-[#002b4b] shadow-sm font-bold'
                  : 'bg-[#001f38]/80 text-slate-300 hover:text-white hover:bg-[#003865] border border-white/10'
              }`}
            >
              {isAr ? z.nameAr : z.nameEn}
            </button>
          ))}
        </div>

        {/* Right: Filters & Tile Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Rent/Sale Mode Filter */}
          <div className="inline-flex rounded-lg p-0.5 bg-[#001f38] border border-white/15">
            <button
              onClick={() => setModeFilter('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                modeFilter === 'all' ? 'bg-[#00aeff] text-[#002b4b]' : 'text-slate-300 hover:text-white'
              }`}
            >
              {isAr ? 'الكل' : 'All'}
            </button>
            <button
              onClick={() => setModeFilter('sale')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                modeFilter === 'sale' ? 'bg-[#16a34a] text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              {isAr ? 'بيع' : 'Sale'}
            </button>
            <button
              onClick={() => setModeFilter('rent')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                modeFilter === 'rent' ? 'bg-[#00aeff] text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              {isAr ? 'إيجار' : 'Rent'}
            </button>
          </div>

          {/* Photo completeness filter */}
          <button
            onClick={() => setPhotoFilter(!photoFilter)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-all ${
              photoFilter
                ? 'bg-[#00aeff]/20 border-[#00aeff] text-[#00aeff]'
                : 'bg-[#001f38] border-white/15 text-slate-300 hover:text-white'
            }`}
            title="Filter properties with verified real photos"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isAr ? 'صور مؤكدة' : 'Verified Photos'}</span>
          </button>

          {/* Radar Circles Toggle */}
          <button
            onClick={() => setShowRadarRings(!showRadarRings)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-all ${
              showRadarRings
                ? 'bg-[#e9c176]/25 border-[#e9c176] text-[#e9c176]'
                : 'bg-[#001f38] border-white/15 text-slate-300 hover:text-white'
            }`}
            title="Toggle AUC & Strategic Radar Rings"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#e9c176]" />
            <span className="hidden sm:inline">{isAr ? 'الرادار' : 'Radar'}</span>
          </button>

          {/* Tile Layer Switcher */}
          <div className="inline-flex rounded-lg p-0.5 bg-[#001f38] border border-white/15">
            <button
              onClick={() => setTileStyle('dark')}
              className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${
                tileStyle === 'dark' ? 'bg-[#00aeff] text-[#002b4b]' : 'text-slate-300'
              }`}
              title="Houzez Obsidian Dark"
            >
              <Moon className="w-3 h-3" />
            </button>
            <button
              onClick={() => setTileStyle('light')}
              className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${
                tileStyle === 'light' ? 'bg-[#00aeff] text-[#002b4b]' : 'text-slate-300'
              }`}
              title="Houzez Alabaster Light"
            >
              <Sun className="w-3 h-3" />
            </button>
            <button
              onClick={() => setTileStyle('satellite')}
              className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${
                tileStyle === 'satellite' ? 'bg-[#00aeff] text-[#002b4b]' : 'text-slate-300'
              }`}
              title="Esri Photorealistic Satellite"
            >
              <Globe className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      
      )}
      {/* ── Main Leaflet Map Stage ────────────────────────────────────── */}
      <div className="relative flex-1 w-full h-full" style={{ position: 'relative', flex: 1, width: '100%', height: 620, minHeight: 600 }}>
        <MapContainer
          center={NEW_CAIRO_CENTER}
          zoom={12}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', background: '#001f38' }}
        >
          <TileLayer
            url={TILE_LAYERS[tileStyle].url}
            attribution={TILE_LAYERS[tileStyle].attrib}
            maxZoom={22}
            maxNativeZoom={19}
            // @ts-ignore
            detectRetina={true}
          />

          {/* AUC Distance Radar Rings */}
          {showRadarRings && (
            <>
              <Circle
                center={[30.019, 31.501]} // AUC New Cairo
                radius={3000}
                pathOptions={{ color: '#00aeff', weight: 1, dashArray: '4, 6', fillOpacity: 0.03, fillColor: '#00aeff' }}
              />
              <Circle
                center={[30.019, 31.501]}
                radius={6000}
                pathOptions={{ color: '#00aeff', weight: 1, dashArray: '4, 8', fillOpacity: 0.02, fillColor: '#00aeff' }}
              />
            </>
          )}

          {/* Master Compound Hub Markers */}
          {NEW_CAIRO_COMPOUNDS.map((comp) => {
            const stat = compoundStats.find((s) => s.compoundCode === comp.code);
            const count = stat ? stat.totalUnits : 0;
            return (
              <Marker
                key={`hub-${comp.code}`}
                position={[comp.lat, comp.lng]}
                icon={createCompoundHubIcon(comp, count, Boolean(comp.isGpsVerified))}
                eventHandlers={{
                  click: () => {
                    if (onSelectCompound) onSelectCompound(comp.nameEn);
                    setFlyTarget([comp.lat, comp.lng]);
                    setFlyZoom(14);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -14]} opacity={0.95}>
                  <div className="text-xs p-1 font-sans">
                    <div className="font-bold text-[#002b4b]">{comp.nameEn} ({comp.nameAr})</div>
                    <div className="text-slate-600">
                      {isAr ? `${count} وحدات متوفرة` : `${count} available units`}
                    </div>
                    {comp.isGpsVerified && (
                      <div className="text-emerald-600 font-semibold text-[10px]">
                        ✓ {isAr ? 'إحداثيات GIS معتمدة' : 'Verified GIS Coordinates'}
                      </div>
                    )}
                  </div>
                </Tooltip>
              </Marker>
            );
          })}

          {/* Live Inventory Unit Pins */}
          {placedUnits.map((u) => {
            const isSelected = selectedUnit?.id === u.id || controlledSelectedId === u.id;
            return (
              <Marker
                key={`unit-${u.id}`}
                position={[u.renderLat, u.renderLng]}
                icon={createUnitMarkerIcon(u, isSelected)}
                eventHandlers={{
                  click: () => handleSelectUnit(u),
                }}
                zIndexOffset={isSelected ? 1000 : u.mode === 'sale' ? 200 : 100}
              />
            );
          })}

          {/* Real-time Harvester Live Opportunity Pulse Markers (HARV-030-003) */}
          {harvesterPulses.map((pulse) => (
            <React.Fragment key={`pulse-${pulse.id}`}>
              <Circle
                center={[pulse.lat, pulse.lng]}
                radius={pulse.hotDeal ? 650 : 350}
                pathOptions={{
                  color: pulse.hotDeal ? '#ef4444' : '#00aeff',
                  fillColor: pulse.hotDeal ? '#f59e0b' : '#00aeff',
                  fillOpacity: 0.22,
                  weight: 2,
                  dashArray: '3, 6',
                }}
              />
              <Marker
                position={[pulse.lat, pulse.lng]}
                icon={createHarvesterPulseIcon(pulse)}
                zIndexOffset={1200}
                eventHandlers={{
                  click: () => {
                    setFlyTarget([pulse.lat, pulse.lng]);
                    setFlyZoom(15);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -16]} opacity={0.95}>
                  <div className="text-xs p-1 font-sans">
                    <div className="flex items-center gap-1 font-bold text-[#002b4b]">
                      <span>⚡ {pulse.hotDeal ? '🔥 Hot Deal Opportunity' : 'Live Harvester Intake'}</span>
                    </div>
                    <div className="font-semibold text-slate-800">{pulse.compound}</div>
                    <div className="text-emerald-700 font-bold">
                      {pulse.price ? `${pulse.price.toLocaleString()} EGP` : 'Price on Inquiry'}
                    </div>
                    {pulse.discountPct ? (
                      <div className="text-amber-600 font-bold text-[10px]">
                        📉 -{pulse.discountPct}% Historical Price Drop
                      </div>
                    ) : null}
                  </div>
                </Tooltip>
              </Marker>
            </React.Fragment>
          ))}

          {/* Programmatic pan & zoom */}
          <MapFlyer target={flyTarget} zoom={flyZoom} />
        </MapContainer>

        {/* ── Live Opportunity SSE Incoming Toast (HARV-030-003) ──────── */}
        <AnimatePresence>
          {latestOpportunityAlert && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-500 flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#002b4b]/95 border border-[#00aeff]/60 shadow-2xl backdrop-blur-md cursor-pointer hover:border-[#00aeff] transition-all"
              onClick={() => {
                setFlyTarget([latestOpportunityAlert.lat, latestOpportunityAlert.lng]);
                setFlyZoom(15);
              }}
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00aeff]/20 text-[#00aeff]">
                <Zap className="w-3.5 h-3.5 animate-pulse text-[#00aeff]" />
              </span>
              <div className="text-xs">
                <span className="font-bold text-white">
                  {latestOpportunityAlert.hotDeal ? '🔥 Hot Deal Detected: ' : '⚡ Live Harvester Offer: '}
                </span>
                <span className="text-[#00aeff] font-semibold">{latestOpportunityAlert.compound}</span>
                <span className="text-slate-300 ml-1.5 font-mono">
                  {latestOpportunityAlert.price ? `${latestOpportunityAlert.price.toLocaleString()} EGP` : ''}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLatestOpportunityAlert(null);
                }}
                className="text-slate-400 hover:text-white ml-1 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Floating MapCommanderAgent Spatial Status Ribbon ─────────── */}
        <div className="absolute bottom-4 left-4 z-500 max-w-sm bg-[#002b4b]/95 backdrop-blur-md border border-[#00aeff]/40 rounded-xl p-3 shadow-2xl text-white text-xs">
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10">
            <span className="font-bold text-[#00aeff] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? 'رادار المخزون الذكي (Map Commander)' : 'Map Commander Live Radar'}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  sseConnected
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
                title={sseConnected ? 'Connected to /api/harvester/stream' : 'Connecting to SSE feed'}
              >
                <Radio className={`w-2.5 h-2.5 ${sseConnected ? 'animate-pulse text-emerald-400' : 'text-amber-400'}`} />
                <span>{sseConnected ? 'LIVE FEED' : 'SYNCING'}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                {filteredUnits.length} {isAr ? 'وحدة' : 'Units'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div>
              <span className="text-slate-400 block">{isAr ? 'نطاق القاهرة الجديدة:' : 'New Cairo Bounds:'}</span>
              <span className="font-semibold text-emerald-400">100% {isAr ? 'معتمد' : 'Compliant'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">{isAr ? 'نسبة الصور المعتمدة:' : 'Photo Coverage:'}</span>
              <span className="font-semibold text-cyan-300">
                {units.length > 0
                  ? `${Math.round(((units.filter((u) => !hasPendingPhoto(u.img)).length) / units.length) * 100)}%`
                  : '100%'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Slide-Out Houzez Property Detail Inspection Drawer ─────── */}
        <AnimatePresence>
          {selectedUnit && (
            <motion.div
              initial={{ x: isAr ? -380 : 380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isAr ? -380 : 380, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`absolute top-4 ${isAr ? 'left-4' : 'right-4'} bottom-4 z-600 w-80 sm:w-96 bg-[#002b4b]/98 backdrop-blur-xl border border-[#00aeff]/50 rounded-2xl p-4 shadow-2xl text-white flex flex-col justify-between overflow-y-auto`}
            >
              <div>
                {/* Header with Close */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                        selectedUnit.mode === 'sale' ? 'bg-[#16a34a] text-white' : 'bg-[#00aeff] text-[#002b4b]'
                      }`}
                    >
                      {selectedUnit.mode === 'sale' ? (isAr ? 'للبيع' : 'FOR SALE') : (isAr ? 'للإيجار' : 'FOR RENT')}
                    </span>
                    {selectedUnit.code && (
                      <span className="font-mono text-xs text-slate-300 font-semibold">{selectedUnit.code}</span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedUnit(null)}
                    className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Property Photo & Pending Badge */}
                <div className="relative mt-3 rounded-xl overflow-hidden aspect-16/10 bg-[#001f38] border border-white/10">
                  {selectedUnit.img && !hasPendingPhoto(selectedUnit.img) ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={selectedUnit.img}
                      alt={selectedUnit.location}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400 p-4 text-center">
                      <Camera className="w-8 h-8 text-[#00aeff]/60" />
                      <span className="text-xs font-semibold">
                        {isAr ? 'صور الوحدة قيد الاعتماد من المالك' : 'Real Photos Pending Owner Verification'}
                      </span>
                    </div>
                  )}

                  {/* Price Tag Overlay */}
                  <div className="absolute bottom-2 left-2 px-3 py-1 rounded-lg bg-[#002b4b]/90 backdrop-blur-md border border-[#00aeff]/40 text-sm font-extrabold text-white">
                    {selectedUnit.priceLabel || `${selectedUnit.price.toLocaleString()} EGP`}
                  </div>
                </div>

                {/* Location & Specs */}
                <div className="mt-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#00aeff]" />
                    <span>{selectedUnit.location}</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    {selectedUnit.zone} {selectedUnit.approxLocation ? '· (Approx GPS)' : '· Verified Coordinate'}
                  </p>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10 text-center text-xs">
                    <div className="bg-[#001f38] p-2 rounded-lg border border-white/5">
                      <span className="text-slate-400 block text-[10px]">{isAr ? 'الغرف' : 'Beds'}</span>
                      <span className="font-bold text-white">{selectedUnit.beds || '—'}</span>
                    </div>
                    <div className="bg-[#001f38] p-2 rounded-lg border border-white/5">
                      <span className="text-slate-400 block text-[10px]">{isAr ? 'الحمامات' : 'Baths'}</span>
                      <span className="font-bold text-white">{selectedUnit.bath || '—'}</span>
                    </div>
                    <div className="bg-[#001f38] p-2 rounded-lg border border-white/5">
                      <span className="text-slate-400 block text-[10px]">{isAr ? 'المساحة' : 'Area'}</span>
                      <span className="font-bold text-white">{selectedUnit.area ? `${selectedUnit.area} m²` : '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                {/* Photo Request Trigger if Missing Photo */}
                {hasPendingPhoto(selectedUnit.img) && (
                  <button
                    onClick={() => handleRequestPhotos(selectedUnit)}
                    disabled={photoRequestStatus[selectedUnit.code || selectedUnit.id] === 'loading'}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
                      photoRequestStatus[selectedUnit.code || selectedUnit.id] === 'success'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : photoRequestStatus[selectedUnit.code || selectedUnit.id] === 'cooldown'
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                        : 'bg-[#00aeff]/15 hover:bg-[#00aeff]/25 border-[#00aeff]/50 text-[#00aeff]'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>
                      {photoRequestStatus[selectedUnit.code || selectedUnit.id] === 'loading'
                        ? (isAr ? 'جاري إرسال الطلب...' : 'Requesting Photos...')
                        : photoRequestStatus[selectedUnit.code || selectedUnit.id] === 'success'
                        ? (isAr ? '✓ تم إرسال طلب الصور للمالك' : '✓ Photo Request Dispatched')
                        : photoRequestStatus[selectedUnit.code || selectedUnit.id] === 'cooldown'
                        ? (isAr ? 'الطلب قيد المتابعة خلال 24 ساعة' : 'Request Pending (24h Cooldown)')
                        : (isAr ? 'طلب صور الوحدة عبر واتساب' : 'Request Owner Photos via WhatsApp')}
                    </span>
                  </button>
                )}

                {/* Direct WhatsApp Concierge Booking */}
                <a
                  href={`https://wa.me/${SIERRA_WHATSAPP_PHONE}?text=${encodeURIComponent(
                    `Hello Sierra Estates, I am inquiring about unit [${selectedUnit.code || selectedUnit.id}] in ${selectedUnit.location} (${selectedUnit.priceLabel}). Please schedule a VIP viewing.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>{isAr ? 'حجز معاينة فورية عبر واتساب' : 'Book Viewing via WhatsApp'}</span>
                </a>

                {/* Synchronize to Excel Sheet */}
                {onSelect && (
                  <button
                    onClick={() => onSelect(selectedUnit)}
                    className="w-full py-2 px-3 rounded-lg bg-[#001f38] hover:bg-[#002e52] border border-white/20 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#00aeff]" />
                    <span>{isAr ? 'معاينة في جدول الوحدات' : 'Inspect in Registry Sheet'}</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
