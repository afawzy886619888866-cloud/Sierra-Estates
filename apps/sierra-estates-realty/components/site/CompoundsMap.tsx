'use client';

/**
 * Sierra Estates — Interactive Compounds Masterplan Map
 *
 * Central interactive command deck featuring:
 * - Luxury Cairo Emerald & Champagne Gold custom pill markers
 * - Zone fast-switching (Golden Square, 5th Settlement, Katameya, South/North 90th, Mostakbal City)
 * - 5-way segment bar (All Inventory, Owners Rent, Owners Buy, Broker Rent, Broker Buy)
 * - Rich interactive popup cards with AI investment score, pricing, growth rate, and developer tag
 * - Responsive floating Smart Filter with tactile buttons
 * - Synchronized compound selection with live inventory
 */
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { Map as LeafletMap } from 'leaflet';
import { Search, RotateCcw, Map as MapIcon, SlidersHorizontal, Sparkles, Navigation, X, Building2 } from 'lucide-react';

export interface MapCompound {
  n: string;
  c: [number, number];
  z: string;
  ai: number;
  priceM: number;
  g: string;
  rent?: number;
  dev?: string;
  units?: number;
}

const NEW_CAIRO_CENTER: [number, number] = [30.045, 31.59];

// Developer mapping for New Cairo compounds
export const COMPOUND_DEVELOPERS: Record<string, string> = {
  'Al Burouj': 'Capital Group',
  'Al Burouj (Capital Group)': 'Capital Group',
  'Hyde Park': 'Hyde Park Developments',
  'Hyde Park New Cairo': 'Hyde Park Developments',
  'Mountain View iCity': 'Mountain View',
  'Mountain View Executive': 'Mountain View',
  'Mivida': 'Emaar Misr',
  'Mivida Parks': 'Emaar Misr',
  'Eastown': 'SODIC',
  'Eastown (SODIC)': 'SODIC',
  'Villette': 'SODIC',
  'Villette (SODIC)': 'SODIC',
  'Palm Hills New Cairo': 'Palm Hills',
  'Taj City': 'MNHD',
  'Taj Sultan': 'MNHD',
  'Sarai': 'MNHD',
  'Sarai (MNHD)': 'MNHD',
  'Cairo Festival City': 'Al-Futtaim Group',
  'Cairo Festival City Residences': 'Al-Futtaim Group',
  'Swan Lake Residence': 'Hassan Allam',
  'Fifth Square': 'Al Marasem',
  'Fifth Square (Al Marasem)': 'Al Marasem',
  'Fifth Square Boulevard': 'Al Marasem',
  'Zed East': 'Ora Developers',
  'Zed East (Ora)': 'Ora Developers',
  'Katameya Heights': 'Katameya Group',
  'Katameya Dunes': 'Katameya Group',
  'The Waterway': 'The Waterway Developments',
  'Bloomfields': 'Tatweer Misr',
  'Bloomfields (Tatweer Misr)': 'Tatweer Misr',
  'STEI8HT': 'LMD',
  'STEI8HT (LMD)': 'LMD',
  'The Crest': 'IL Cazar',
  'The Crest (IL Cazar)': 'IL Cazar',
  'Dar Misr El Shorouk': 'Ministry of Housing',
  'Madinaty': 'TMG',
  'Madinaty District 1': 'TMG',
  'Madinaty District 3': 'TMG',
  'Madinaty District 7': 'TMG',
  'Madinaty District 8': 'TMG',
  'Madinaty Executive Villas': 'TMG',
  'Al Rehab': 'TMG',
  'Uptown Cairo': 'Emaar Misr',
  'Stone Residence': 'Rooya Group',
  'Stone Residence (Rooya)': 'Rooya Group',
  'The Square': 'Al Ahly Sabbour',
  'El Patio Oro': 'La Vista',
  'El Patio Oro (La Vista)': 'La Vista',
  'El Patio 7': 'La Vista',
  'El Patio 7 (La Vista)': 'La Vista',
  'El Patio 5 East': 'La Vista',
  'El Patio 5 East (La Vista)': 'La Vista',
  'District 5': 'Marakez',
  '90 Avenue': 'Tabarak',
  'The Brooks': 'PRE',
  'La Mirada': 'Inertia',
  'Aeon': 'Tabarak',
  'Green Square': 'Sabbour',
  'Layan Residence': 'MNHD',
  'Jayd': 'IWAN',
  'Galleria Moon Valley': 'Arabia Holding',
  'Azzar New Cairo': 'Reedy Group',
};

// Masterplan footprint polygons for top New Cairo luxury compounds
export const COMPOUND_POLYGONS: Record<string, [number, number][]> = {
  'Hyde Park': [
    [30.021, 31.562],
    [30.018, 31.588],
    [29.997, 31.586],
    [30.000, 31.560],
  ],
  'Mivida': [
    [30.028, 31.525],
    [30.025, 31.547],
    [30.008, 31.544],
    [30.011, 31.522],
  ],
  'Mountain View iCity': [
    [30.064, 31.550],
    [30.062, 31.572],
    [30.047, 31.569],
    [30.049, 31.547],
  ],
  'Katameya Heights': [
    [29.999, 31.413],
    [29.996, 31.438],
    [29.977, 31.435],
    [29.980, 31.410],
  ],
  'Swan Lake Residence': [
    [30.050, 31.507],
    [30.048, 31.525],
    [30.034, 31.523],
    [30.036, 31.505],
  ],
  'Eastown': [
    [30.022, 31.497],
    [30.020, 31.514],
    [30.006, 31.512],
    [30.008, 31.495],
  ],
  'Villette': [
    [30.033, 31.539],
    [30.031, 31.558],
    [30.017, 31.556],
    [30.019, 31.537],
  ],
  'Palm Hills New Cairo': [
    [30.031, 31.571],
    [30.029, 31.591],
    [30.013, 31.589],
    [30.015, 31.569],
  ],
  'Zed East': [
    [30.011, 31.546],
    [30.009, 31.566],
    [29.993, 31.564],
    [29.995, 31.544],
  ],
  'The Waterway': [
    [30.045, 31.488],
    [30.043, 31.503],
    [30.031, 31.501],
    [30.033, 31.486],
  ],
  'Cairo Festival City': [
    [30.041, 31.398],
    [30.039, 31.420],
    [30.021, 31.418],
    [30.023, 31.396],
  ],
  'District 5': [
    [30.004, 31.446],
    [30.002, 31.465],
    [29.986, 31.463],
    [29.988, 31.444],
  ],
  'Stone Residence': [
    [30.007, 31.403],
    [30.005, 31.422],
    [29.989, 31.420],
    [29.991, 31.401],
  ],
  'Fifth Square': [
    [30.035, 31.520],
    [30.033, 31.535],
    [30.022, 31.533],
    [30.024, 31.518],
  ],
  'Al Rehab': [
    [30.075, 31.480],
    [30.072, 31.515],
    [30.050, 31.512],
    [30.053, 31.477],
  ],
  'Madinaty': [
    [30.125, 31.620],
    [30.120, 31.670],
    [30.080, 31.665],
    [30.085, 31.615],
  ],
};

export interface ZonePreset {
  key: string;
  label: string;
  center: [number, number];
  zoom: number;
}

export const NEW_CAIRO_ZONES: ZonePreset[] = [
  { key: 'all', label: 'All New Cairo', center: [30.045, 31.59], zoom: 12 },
  { key: 'Golden Square', label: 'Golden Square', center: [30.015, 31.60], zoom: 13 },
  { key: '5th Settlement', label: '5th Settlement', center: [30.02, 31.55], zoom: 13 },
  { key: 'Katameya', label: 'Katameya', center: [29.988, 31.485], zoom: 13 },
  { key: 'South 90th', label: 'South 90th St', center: [30.018, 31.54], zoom: 13 },
  { key: 'North 90th', label: 'North 90th St', center: [30.035, 31.56], zoom: 13 },
  { key: 'Mostakbal', label: 'Mostakbal City', center: [30.065, 31.65], zoom: 12 },
  { key: 'TMG', label: 'Al Rehab & Madinaty', center: [30.08, 31.60], zoom: 12 },
];

export type SegmentKey = 'all' | 'owners_rent' | 'owners_buy' | 'broker_rent' | 'broker_buy' | 'unknown';

export interface SegmentTab {
  key: SegmentKey;
  label: string;
  defaultBadge: string;
  color: string;
}

export const SEGMENT_TABS: SegmentTab[] = [
  { key: 'all', label: 'All Inventory', defaultBadge: '13,892', color: '#0284c7' },
  { key: 'owners_rent', label: 'Direct Rent', defaultBadge: '302', color: '#059669' },
  { key: 'owners_buy', label: 'Direct Resale', defaultBadge: '262', color: '#c8961a' },
  { key: 'broker_rent', label: 'Broker Rent', defaultBadge: '4,955', color: '#d97706' },
  { key: 'broker_buy', label: 'Broker Resale', defaultBadge: '7,495', color: '#6366f1' },
];

function cleanCpdName(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\b(new cairo|residence|residences|district \d+|phase \d+)\b/g, '')
    .trim();
}

function estimateUnitsCount(aiScore: number): number {
  return Math.max(12, Math.round(aiScore * 2.8));
}

interface InventoryApiData {
  count: number;
  segments?: {
    total: number;
    owners_rent: number;
    owners_buy: number;
    broker_rent: number;
    broker_buy: number;
    unknown: number;
  };
  compoundCounts?: Record<string, number>;
  compoundSegmentCounts?: Record<string, Record<string, number>>;
}

export interface CompoundsMapProps {
  compounds: MapCompound[];
  featured?: string[];
  selectedName?: string | null;
  onSelectAction?: (name: string) => void;
  onSelect?: (name: string) => void;
  showControls?: boolean;
}

export default function CompoundsMap({
  compounds,
  featured = [],
  selectedName,
  onSelectAction,
  onSelect,
  showControls = true,
}: CompoundsMapProps) {
  const handleSelect = onSelectAction || onSelect;
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, { marker: any; coords: [number, number] }>>(new Map());

  const [ready, setReady] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedBed, setSelectedBed] = useState<number | 'any'>('any');
  const [selectedSegment, setSelectedSegment] = useState<SegmentKey>('all');
  const [inventoryData, setInventoryData] = useState<InventoryApiData | null>(null);
  const [rentCounts, setRentCounts] = useState<Record<string, number>>({});
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Fetch full live inventory and segment aggregates
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/inventory').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/inventory?mode=rent').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([allData, rentData]: [InventoryApiData | null, InventoryApiData | null]) => {
        if (cancelled) return;
        if (allData) setInventoryData(allData);
        if (rentData?.compoundCounts) setRentCounts(rentData.compoundCounts);
      })
      .catch((err) => console.warn('[CompoundsMap] Listings fetch failed:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute unit count for a given compound in the selected segment
  const getCompoundCount = useCallback(
    (compoundName: string): number => {
      if (!inventoryData) return 0;
      const target = cleanCpdName(compoundName);
      if (!target) return 0;

      const segmentCounts = inventoryData.compoundSegmentCounts || {};
      const compoundCounts = inventoryData.compoundCounts || {};

      for (const [key, segObj] of Object.entries(segmentCounts)) {
        const cleanK = cleanCpdName(key);
        if (cleanK === target || cleanK.startsWith(target) || target.startsWith(cleanK)) {
          if (selectedSegment === 'all') {
            return segObj.all || compoundCounts[key] || 0;
          }
          return segObj[selectedSegment] || 0;
        }
      }

      if (selectedSegment === 'all') {
        for (const [key, count] of Object.entries(compoundCounts)) {
          const cleanK = cleanCpdName(key);
          if (cleanK === target || cleanK.startsWith(target) || target.startsWith(cleanK)) {
            return count;
          }
        }
      }

      return 0;
    },
    [inventoryData, selectedSegment]
  );

  // Filtered compounds based on query and zone
  const filteredCompounds = useMemo(() => {
    return compounds.filter((c) => {
      if (filterQuery.trim()) {
        const q = filterQuery.toLowerCase().trim();
        const matchesName = c.n.toLowerCase().includes(q);
        const matchesZone = c.z.toLowerCase().includes(q);
        const dev = COMPOUND_DEVELOPERS[c.n] || '';
        const matchesDev = dev.toLowerCase().includes(q);
        if (!matchesName && !matchesZone && !matchesDev) return false;
      }
      if (selectedZone !== 'all') {
        if (selectedZone === 'Golden Square') {
          const isGolden = c.z.includes('5th') && (c.n.includes('Mivida') || c.n.includes('Villette') || c.n.includes('Palm') || c.n.includes('Mountain View') || c.n.includes('Eastown') || c.n.includes('Fifth Square'));
          if (!isGolden) return false;
        } else if (selectedZone === 'TMG') {
          if (!c.n.includes('Rehab') && !c.n.includes('Madinaty')) return false;
        } else if (!c.z.toLowerCase().includes(selectedZone.toLowerCase()) && !c.n.toLowerCase().includes(selectedZone.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [compounds, filterQuery, selectedZone]);

  // Initialize Leaflet Map
  useEffect(() => {
    let cancelled = false;
    const markersMap = markersMapRef.current;
    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !hostRef.current || mapRef.current) return;

      const map = L.map(hostRef.current, {
        center: NEW_CAIRO_CENTER,
        zoom: 12,
        minZoom: 10,
        maxZoom: 18,
        scrollWheelZoom: true,
        zoomControl: true,
      });
      mapRef.current = map;

      // Voyager luxury tile layer (clean, crisp, and high-contrast)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO &copy; Sierra Estates',
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      layerRef.current = L.layerGroup().addTo(map);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      markersMap.clear();
    };
  }, []);

  // Render clean luxury pill markers & popups
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled) return;
      const layer = layerRef.current;
      const map = mapRef.current;
      if (!layer || !map) return;

      layer.clearLayers();
      markersMapRef.current.clear();

      const getRentCount = (name: string): number => {
        const target = cleanCpdName(name);
        for (const [key, count] of Object.entries(rentCounts)) {
          const k = cleanCpdName(key);
          if (k === target || k.startsWith(target) || target.startsWith(k)) return count;
        }
        return 0;
      };

      filteredCompounds.forEach((c) => {
        const isFeat = featured.includes(c.n);
        const isSelected = selectedName === c.n;
        const isHot = c.ai >= 9.2;
        const liveUnits = getCompoundCount(c.n);
        const unitsCount = liveUnits > 0 ? liveUnits : (selectedSegment === 'all' ? (c.units ?? estimateUnitsCount(c.ai)) : 0);
        const liveRentCount = getRentCount(c.n);
        const hasRentInventory = liveRentCount > 0;
        const devName = COMPOUND_DEVELOPERS[c.n] || '';
        const displayName = devName && !c.n.includes('(') ? `${c.n} (${devName})` : c.n;
        const activeSegmentObj = SEGMENT_TABS.find((s) => s.key === selectedSegment);

        // Custom Pill Pin with Cairo Emerald & Champagne Gold Accent
        const markerHtml = `
          <div class="sierra-compound-pin ${isSelected ? 'is-selected' : ''}" style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: ${
              isSelected
                ? '#071523'
                : isFeat
                ? 'linear-gradient(135deg, #04261c, #0a382b)'
                : 'linear-gradient(135deg, #0b1c2d, #14283d)'
            };
            color: #ffffff;
            padding: 5px 8px 5px 12px;
            border-radius: 999px;
            border: ${
              isSelected
                ? '2px solid #dfad3a'
                : isHot
                ? '1.5px solid rgba(223, 173, 58, 0.7)'
                : '1px solid rgba(255, 255, 255, 0.22)'
            };
            box-shadow: ${
              isSelected
                ? '0 0 22px rgba(223, 173, 58, 0.8), 0 6px 16px rgba(0,0,0,0.6)'
                : isHot
                ? '0 0 14px rgba(223, 173, 58, 0.4), 0 4px 12px rgba(0,0,0,0.35)'
                : '0 2px 8px rgba(0,0,0,0.3)'
            };
            cursor: pointer;
            white-space: nowrap;
            font-family: -apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Segoe UI', sans-serif;
            font-size: 11.5px;
            font-weight: 700;
            letter-spacing: 0.01em;
            transform: translate(-50%, -50%) ${isSelected ? 'scale(1.08)' : 'scale(1)'};
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            user-select: none;
          ">
            <span style="color: ${isSelected ? '#e9c176' : '#ffffff'};">${c.n}</span>
            <span style="
              background: ${isSelected ? '#dfad3a' : activeSegmentObj?.color || '#0284c7'};
              color: ${isSelected ? '#071523' : '#ffffff'};
              font-size: 10px;
              font-weight: 800;
              padding: 1px 7px;
              border-radius: 999px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-width: 18px;
            ">${unitsCount}</span>
            ${hasRentInventory ? `<span style="
              background: #059669;
              color: #ffffff;
              font-size: 9px;
              font-weight: 800;
              padding: 1px 5px;
              border-radius: 999px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              margin-left: -2px;
            ">R·${liveRentCount}</span>` : ''}
          </div>
        `;

        const marker = L.marker(c.c, {
          icon: L.divIcon({
            className: 'sierra-leaflet-marker-wrap',
            html: markerHtml,
            iconSize: [140, 30],
            iconAnchor: [70, 15],
          }),
          zIndexOffset: isSelected ? 1000 : isFeat ? 700 : 100,
        });

        // Rich Interactive Popup
        const rentDisplay = c.rent ? `$${c.rent.toLocaleString()}` : `$${Math.round(c.priceM * 200).toLocaleString()}`;
        const queryParamSeg = selectedSegment !== 'all' ? `&segment=${selectedSegment}` : '';
        const popupHtml = `
          <div class="compound-rich-popup" style="
            min-width: 260px;
            max-width: 290px;
            font-family: -apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Segoe UI', sans-serif;
            padding: 4px 2px;
          ">
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 6px;
            ">
              <span style="
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                color: #c8961a;
              ">${c.z}</span>
              <span style="
                font-size: 9.5px;
                font-weight: 700;
                padding: 2px 7px;
                border-radius: 999px;
                background: #04261c;
                color: #34d399;
                border: 1px solid rgba(52, 211, 153, 0.3);
              ">AI ${c.ai.toFixed(1)}</span>
            </div>
            <h4 style="
              margin: 0 0 10px 0;
              font-size: 15.5px;
              font-weight: 800;
              color: #0f172a;
              line-height: 1.25;
            ">
              ${displayName}
            </h4>

            <div style="
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 10px 12px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 12px;
              margin-bottom: 12px;
            ">
              <div>
                <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">UNITS</div>
                <div style="font-size: 15px; font-weight: 800; color: #0f172a;">${unitsCount}</div>
              </div>
              <div>
                <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">CAPITAL GAIN</div>
                <div style="font-size: 15px; font-weight: 800; color: #059669;">${c.g}</div>
              </div>
              <div>
                <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">FROM RESALE</div>
                <div style="font-size: 13px; font-weight: 800; color: #0f172a;">EGP ${c.priceM}M</div>
              </div>
              <div>
                <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">RENT / MO</div>
                <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${rentDisplay}</div>
              </div>
            </div>

            <a
              href="/properties?compound=${encodeURIComponent(c.n)}${queryParamSeg}"
              style="
                display: block;
                width: 100%;
                background: #04261c;
                color: #ffffff;
                text-align: center;
                padding: 9px 12px;
                border-radius: 8px;
                font-size: 12.5px;
                font-weight: 700;
                text-decoration: none;
                box-sizing: border-box;
                border: 1px solid rgba(223, 173, 58, 0.4);
                transition: all 0.2s ease;
              "
              onmouseover="this.style.background='#071523'; this.style.borderColor='#dfad3a';"
              onmouseout="this.style.background='#04261c'; this.style.borderColor='rgba(223, 173, 58, 0.4)';"
            >
              Explore ${unitsCount} Units in ${c.n} →
            </a>
          </div>
        `;

        marker.bindPopup(popupHtml, {
          maxWidth: 300,
          className: 'sierra-map-popup-clean',
        });

        marker.on('click', () => {
          handleSelect?.(c.n);
        });

        // Render Masterplan Boundary Polygon (if available)
        const polyCoords = COMPOUND_POLYGONS[c.n];
        if (polyCoords) {
          const polygon = L.polygon(polyCoords, {
            color: isSelected ? '#dfad3a' : isFeat ? '#10b981' : '#64748b',
            weight: isSelected ? 2.5 : isFeat ? 1.5 : 1,
            dashArray: isSelected ? undefined : isFeat ? '4, 4' : '3, 6',
            fillColor: isSelected ? '#dfad3a' : isFeat ? '#059669' : '#0f172a',
            fillOpacity: isSelected ? 0.22 : isFeat ? 0.12 : 0.04,
            smoothFactor: 1,
          });

          polygon.on('click', () => {
            handleSelect?.(c.n);
            marker.openPopup();
          });

          polygon.addTo(layer);
        }

        marker.addTo(layer);
        markersMapRef.current.set(c.n, { marker, coords: c.c });
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, filteredCompounds, featured, selectedName, handleSelect, getCompoundCount, selectedSegment]);

  // Handle external selection & smooth zoom
  useEffect(() => {
    if (!ready || !selectedName || !mapRef.current) return;
    const target = markersMapRef.current.get(selectedName);
    if (target) {
      mapRef.current.flyTo(target.coords, 14, { duration: 0.9, easeLinearity: 0.25 });
      target.marker.openPopup();
    }
  }, [ready, selectedName]);

  const handleZoneSelect = useCallback((zone: ZonePreset) => {
    setSelectedZone(zone.key);
    if (mapRef.current) {
      mapRef.current.flyTo(zone.center, zone.zoom, { duration: 0.9 });
    }
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilterQuery('');
    setSelectedZone('all');
    setSelectedBed('any');
    setSelectedSegment('all');
    if (mapRef.current) {
      mapRef.current.flyTo(NEW_CAIRO_CENTER, 12, { duration: 0.8 });
    }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 560, borderRadius: 16, overflow: 'hidden' }}>
      {/* Map Host Canvas */}
      <div
        ref={hostRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 560,
          background: '#071523',
        }}
      />

      {/* Floating Header Control Deck at Top-Left */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxWidth: 'calc(100% - 310px)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", "Segoe UI", sans-serif',
        }}
      >
        {/* Segment Filter Bar */}
        <div
          style={{
            background: 'rgba(7, 21, 35, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(223, 173, 58, 0.25)',
            borderRadius: 14,
            padding: '6px 8px',
            boxShadow: '0 12px 28px -4px rgba(0,0,0,0.3)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          {SEGMENT_TABS.map((tab) => {
            const isCurrent = selectedSegment === tab.key;
            const badgeCount =
              tab.key === 'all'
                ? (inventoryData?.segments?.total ? inventoryData.segments.total.toLocaleString() : tab.defaultBadge)
                : (inventoryData?.segments?.[tab.key] ? (inventoryData.segments[tab.key] as number).toLocaleString() : tab.defaultBadge);

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedSegment(tab.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: isCurrent ? 800 : 600,
                  background: isCurrent ? 'linear-gradient(135deg, #c8961a, #dfad3a)' : 'rgba(255, 255, 255, 0.06)',
                  color: isCurrent ? '#071523' : '#e2e8f0',
                  border: isCurrent ? '1px solid #dfad3a' : '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isCurrent ? '0 2px 10px rgba(223, 173, 58, 0.4)' : 'none',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '1px 5px',
                    borderRadius: 999,
                    background: isCurrent ? '#071523' : 'rgba(255, 255, 255, 0.14)',
                    color: isCurrent ? '#dfad3a' : '#ffffff',
                  }}
                >
                  {badgeCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Zone Fast-Pill Navigation Bar */}
        <div
          style={{
            background: 'rgba(7, 21, 35, 0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 12,
            padding: '5px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginInlineEnd: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Navigation style={{ width: 11, height: 11, color: '#dfad3a' }} />
            <span>Zone:</span>
          </span>
          {NEW_CAIRO_ZONES.map((zone) => {
            const isZoneActive = selectedZone === zone.key;
            return (
              <button
                key={zone.key}
                type="button"
                onClick={() => handleZoneSelect(zone)}
                style={{
                  padding: '3px 9px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: isZoneActive ? 800 : 500,
                  whiteSpace: 'nowrap',
                  background: isZoneActive ? 'rgba(223, 173, 58, 0.25)' : 'transparent',
                  color: isZoneActive ? '#dfad3a' : '#cbd5e1',
                  border: isZoneActive ? '1px solid #dfad3a' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                {zone.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Smart Filter Panel on Top-Right */}
      {showControls && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 400,
            width: 280,
            background: 'rgba(7, 21, 35, 0.94)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(223, 173, 58, 0.25)',
            borderRadius: 14,
            padding: 16,
            boxShadow: '0 16px 36px -4px rgba(0,0,0,0.4)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", "Segoe UI", sans-serif',
            color: '#ffffff',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 13, color: '#dfad3a' }}>
              <SlidersHorizontal style={{ width: 14, height: 14 }} />
              <span>Smart Masterplan Filter</span>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#e2e8f0',
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              {filteredCompounds.length} compounds
            </span>
          </div>

          {/* Search Input */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 4 }}>
              FIND COMPOUND
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 8,
                padding: '6px 10px',
              }}
            >
              <Search style={{ width: 13, height: 13, color: '#94a3b8', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Mivida, Hyde Park, SODIC..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 12,
                  color: '#ffffff',
                  width: '100%',
                }}
              />
              {filterQuery && (
                <button
                  type="button"
                  title="Clear search query"
                  aria-label="Clear search query"
                  onClick={() => setFilterQuery('')}
                  style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                >
                  <X style={{ width: 12, height: 12 }} />
                </button>
              )}
            </div>
          </div>

          {/* Bedrooms Selector */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 6 }}>
              BEDROOMS
            </label>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['any', 1, 2, 3, 4, 5] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSelectedBed(b)}
                  style={{
                    flex: 1,
                    padding: '5px 0',
                    border: selectedBed === b ? '1px solid #dfad3a' : '1px solid rgba(255, 255, 255, 0.12)',
                    background: selectedBed === b ? 'rgba(223, 173, 58, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    color: selectedBed === b ? '#dfad3a' : '#cbd5e1',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: selectedBed === b ? 800 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {b === 'any' ? 'Any' : `${b}+`}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Action */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, color: '#94a3b8' }}>
              {selectedName ? `Selected: ${selectedName}` : 'Click any pin to inspect'}
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'transparent',
                border: 'none',
                color: '#dfad3a',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                padding: '4px 6px',
              }}
            >
              <RotateCcw style={{ width: 11, height: 11 }} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Legend on Bottom-Left */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 16,
          zIndex: 400,
          background: 'rgba(7, 21, 35, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(223, 173, 58, 0.2)',
          borderRadius: 12,
          padding: '10px 14px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
          fontSize: 11,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif',
          color: '#e2e8f0',
          minWidth: 160,
        }}
      >
        <div style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 9, color: '#dfad3a', marginBottom: 6 }}>
          MASTERPLAN TIERS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, background: '#dfad3a', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #dfad3a' }} />
            <span style={{ fontWeight: 700, color: '#ffffff' }}>Selected / Active</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, background: '#059669', borderRadius: '50%', display: 'inline-block' }} />
            <span>AI Score 9.2+ (Premier)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, background: '#0284c7', borderRadius: '50%', display: 'inline-block' }} />
            <span>Verified Portfolio</span>
          </div>
        </div>
      </div>

      {/* Center Bottom Floating CTA: Open Full Map */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 400,
        }}
      >
        <Link
          href="/compounds"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'linear-gradient(135deg, #071523, #04261c)',
            color: '#ffffff',
            border: '1px solid #dfad3a',
            padding: '10px 24px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '0.02em',
            textDecoration: 'none',
            boxShadow: '0 10px 25px -3px rgba(0,0,0,0.5)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#c8961a';
            e.currentTarget.style.color = '#071523';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #071523, #04261c)';
            e.currentTarget.style.color = '#ffffff';
          }}
        >
          <MapIcon style={{ width: 15, height: 15 }} />
          <span>Open Full Interactive Masterplan</span>
        </Link>
      </div>
    </div>
  );
}
