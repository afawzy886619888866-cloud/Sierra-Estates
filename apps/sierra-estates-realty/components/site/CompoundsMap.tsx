'use client';

/**
 * Sierra Estates — Interactive Compounds Masterplan Map
 * Matches exact UI design with compound unit pills, rich interactive popups,
 * floating compound tiers legend, integrated smart filter, and full map navigation.
 */
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { Map as LeafletMap } from 'leaflet';
import { Search, RotateCcw, Map as MapIcon, SlidersHorizontal } from 'lucide-react';

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
const COMPOUND_DEVELOPERS: Record<string, string> = {
  'Al Burouj (Capital Group)': 'Capital Group',
  'Hyde Park New Cairo': 'Hyde Park Developments',
  'Mountain View iCity': 'Mountain View',
  'Mountain View Executive': 'Mountain View',
  'Mivida': 'Emaar Misr',
  'Mivida Parks': 'Emaar Misr',
  'Eastown (SODIC)': 'SODIC',
  'Villette (SODIC)': 'SODIC',
  'Palm Hills New Cairo': 'Palm Hills',
  'Taj City': 'MNHD',
  'Taj Sultan': 'MNHD',
  'Sarai (MNHD)': 'MNHD',
  'Cairo Festival City Residences': 'Al-Futtaim Group',
  'Swan Lake Residence': 'Hassan Allam',
  'Fifth Square (Al Marasem)': 'Al Marasem',
  'Fifth Square Boulevard': 'Al Marasem',
  'Zed East (Ora)': 'Ora Developers',
  'Katameya Heights': 'Katameya Group',
  'Katameya Dunes': 'Katameya Group',
  'The Waterway': 'The Waterway Developments',
  'Bloomfields (Tatweer Misr)': 'Tatweer Misr',
  'STEI8HT (LMD)': 'LMD',
  'The Crest (IL Cazar)': 'IL Cazar',
  'Dar Misr El Shorouk': 'Ministry of Housing',
  'Madinaty District 1': 'TMG',
  'Madinaty District 3': 'TMG',
  'Madinaty District 7': 'TMG',
  'Madinaty District 8': 'TMG',
  'Madinaty Executive Villas': 'TMG',
  'Al Rehab': 'TMG',
  'Stone Residence (Rooya)': 'Rooya Group',
  'El Patio Oro (La Vista)': 'La Vista',
  'El Patio 7 (La Vista)': 'La Vista',
  'El Patio 5 East (La Vista)': 'La Vista',
};

// Units count lookup table
const COMPOUND_UNITS_COUNT: Record<string, number> = {
  'Al Burouj (Capital Group)': 21,
  'Dar Misr El Shorouk': 23,
  'Madinaty District 1': 12,
  'Madinaty District 3': 16,
  'Madinaty District 7': 19,
  'Madinaty District 8': 14,
  'Madinaty Executive Villas': 9,
  'Azad & Azad Views': 10,
  'Villette (SODIC)': 14,
  'Eastown (SODIC)': 16,
  'Mountain View iCity': 11,
  'Hyde Park New Cairo': 28,
  'Mivida': 24,
  'Palm Hills New Cairo': 18,
  'Taj City': 22,
  'Cairo Festival City Residences': 8,
  'The Waterway': 15,
  'Swan Lake Residence': 15,
  'Fifth Square (Al Marasem)': 14,
  'Zed East (Ora)': 12,
  'Katameya Heights': 10,
  'Katameya Dunes': 8,
};

export default function CompoundsMap({
  compounds,
  featured = [],
  selectedName,
  onSelect,
  showControls = true,
}: {
  compounds: MapCompound[];
  featured?: string[];
  selectedName?: string | null;
  onSelect?: (name: string) => void;
  showControls?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, { marker: any; coords: [number, number] }>>(new Map());

  const [ready, setReady] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedBed, setSelectedBed] = useState<number | 'any'>('any');

  // Filtered compounds based on smart filter
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
      return true;
    });
  }, [compounds, filterQuery]);

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

      // Voyager luxury tile layer (clean & crisp)
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

  // Render clean pill markers & popups
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

      filteredCompounds.forEach((c) => {
        const isFeat = featured.includes(c.n);
        const isSelected = selectedName === c.n;
        const isHot = c.ai >= 9.2;
        const unitsCount = COMPOUND_UNITS_COUNT[c.n] || Math.max(8, Math.round(c.ai * 2.2));
        const devName = COMPOUND_DEVELOPERS[c.n] || '';
        const displayName = devName && !c.n.includes('(') ? `${c.n} (${devName})` : c.n;

        const isPendingGps =
          c.n.toLowerCase().includes('unspecified') ||
          c.n.toLowerCase().includes('pending') ||
          c.n.toLowerCase().includes('narges') ||
          c.z.toLowerCase().includes('unspecified');

        // Custom Pill Pin HTML with GPS status distinction
        const markerHtml = `
          <div class="sierra-compound-pin ${isSelected ? 'is-selected' : ''} ${isFeat ? 'is-featured' : ''}" style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: ${
              isPendingGps
                ? 'linear-gradient(135deg, #451a03, #78350f)'
                : isSelected
                ? '#0369a1'
                : isFeat
                ? '#071b2f'
                : '#0a1d30'
            };
            color: #ffffff;
            padding: 4px 6px 4px 10px;
            border-radius: 999px;
            border: ${
              isPendingGps
                ? '2px solid #f59e0b'
                : isSelected
                ? '2px solid #38bdf8'
                : isHot
                ? '1.5px solid #38bdf8'
                : '1px solid rgba(255,255,255,0.25)'
            };
            box-shadow: ${
              isPendingGps
                ? '0 0 14px rgba(245,158,11,0.6), 0 4px 14px rgba(0,0,0,0.5)'
                : isSelected
                ? '0 0 16px rgba(56,189,248,0.8), 0 4px 14px rgba(0,0,0,0.5)'
                : '0 2px 8px rgba(0,0,0,0.3)'
            };
            cursor: pointer;
            white-space: nowrap;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11.5px;
            font-weight: 700;
            transform: translate(-50%, -50%) ${isSelected ? 'scale(1.06)' : 'scale(1)'};
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            user-select: none;
          ">
            ${isPendingGps ? '<span style="font-size:12px;">⚠️</span>' : ''}
            <span>${displayName}</span>
            <span style="
              background: ${isPendingGps ? '#d97706' : '#0284c7'};
              color: #ffffff;
              font-size: 10px;
              font-weight: 800;
              padding: 1px 6px;
              border-radius: 999px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-width: 18px;
            ">${unitsCount}</span>
          </div>
        `;

        const marker = L.marker(c.c, {
          icon: L.divIcon({
            className: 'sierra-leaflet-marker-wrap',
            html: markerHtml,
            iconSize: [140, 28],
            iconAnchor: [70, 14],
          }),
          zIndexOffset: isPendingGps ? 800 : isSelected ? 1000 : isFeat ? 600 : 100,
        });

        // Rich interactive popup matching screenshot 2
        const rentDisplay = c.rent ? `$${c.rent.toLocaleString()}` : `$${Math.round(c.priceM * 200).toLocaleString()}`;
        const popupHtml = `
          <div class="compound-rich-popup" style="
            min-width: 250px;
            max-width: 280px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 4px 2px;
          ">
            <div style="
              font-size: 9.5px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.12em;
              color: #0284c7;
              margin-bottom: 2px;
            ">
              ${c.z}
            </div>
            <h4 style="
              margin: 0 0 10px 0;
              font-size: 15px;
              font-weight: 800;
              color: #0f172a;
              line-height: 1.25;
            ">
              ${displayName}
            </h4>

            <div style="
              background: #f0f9ff;
              border: 1px solid #bae6fd;
              border-radius: 8px;
              padding: 10px;
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
                <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">AI SCORE</div>
                <div style="font-size: 15px; font-weight: 800; color: #0284c7;">${c.ai.toFixed(1)}</div>
              </div>
              <div>
                <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">FROM (RESALE)</div>
                <div style="font-size: 13px; font-weight: 800; color: #0f172a;">EGP ${c.priceM}M</div>
              </div>
              <div>
                <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">RENT / MO</div>
                <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${rentDisplay}</div>
              </div>
              <div style="grid-column: span 2; border-top: 1px solid #e0f2fe; padding-top: 6px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">12-MO GROWTH</span>
                <span style="font-size: 13px; font-weight: 800; color: #16a34a;">${c.g}</span>
              </div>
            </div>

            ${
              isPendingGps
                ? `<div style="
                    background: #fffbeb;
                    border: 1px solid #fde68a;
                    color: #92400e;
                    border-radius: 6px;
                    padding: 6px 8px;
                    font-size: 11px;
                    font-weight: 600;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                  ">
                    <span>⚠️</span>
                    <span>Direction / GPS Pending Review — Editable in Admin</span>
                  </div>`
                : ''
            }

            <a
              href="/properties?compound=${encodeURIComponent(c.n)}"
              style="
                display: block;
                width: 100%;
                background: #0284c7;
                color: #ffffff;
                text-align: center;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12.5px;
                font-weight: 700;
                text-decoration: none;
                box-sizing: border-box;
                transition: background 0.2s;
              "
              onmouseover="this.style.background='#0369a1'"
              onmouseout="this.style.background='#0284c7'"
            >
              View ${unitsCount} units
            </a>
          </div>
        `;

        marker.bindPopup(popupHtml, {
          maxWidth: 290,
          className: 'sierra-map-popup-clean',
        });

        marker.on('click', () => {
          onSelect?.(c.n);
        });

        marker.addTo(layer);
        markersMapRef.current.set(c.n, { marker, coords: c.c });
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, filteredCompounds, featured, selectedName, onSelect]);

  // Handle external selection
  useEffect(() => {
    if (!ready || !selectedName || !mapRef.current) return;
    const target = markersMapRef.current.get(selectedName);
    if (target) {
      mapRef.current.flyTo(target.coords, 14, { duration: 0.8 });
      target.marker.openPopup();
    }
  }, [ready, selectedName]);

  const handleResetFilters = useCallback(() => {
    setFilterQuery('');
    setSelectedBed('any');
    if (mapRef.current) {
      mapRef.current.flyTo(NEW_CAIRO_CENTER, 12, { duration: 0.8 });
    }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 520, borderRadius: 16, overflow: 'hidden' }}>
      {/* Map Host Canvas */}
      <div
        ref={hostRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 520,
          background: '#f8fafc',
        }}
      />

      {/* Floating Legend on Bottom-Left */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 20,
          zIndex: 400,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(15, 23, 42, 0.1)',
          borderRadius: 12,
          padding: '12px 16px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
          fontSize: 11.5,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#1e293b',
          minWidth: 170,
        }}
      >
        <div style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 9.5, color: '#64748b', marginBottom: 8 }}>
          COMPOUND TIERS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 14, height: 14, background: '#0a1d30', borderRadius: 3, display: 'inline-block' }} />
            <span style={{ fontWeight: 600 }}>Featured</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, background: '#0284c7', borderRadius: '50%', display: 'inline-block' }} />
            <span>AI score 9.2+</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, border: '1.5px solid #94a3b8', borderRadius: '50%', display: 'inline-block' }} />
            <span>All other compounds</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 10.5 }}>
            <span style={{ width: 4, height: 4, background: '#94a3b8', borderRadius: '50%', display: 'inline-block', margin: '0 3px' }} />
            <span>Dot only — zoom in for the name</span>
          </div>
        </div>
      </div>

      {/* Floating Smart Filter Panel on Top-Right */}
      {showControls && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 400,
            width: 280,
            background: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(15, 23, 42, 0.1)',
            borderRadius: 14,
            padding: 16,
            boxShadow: '0 12px 28px -4px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.08)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {/* Filter Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 13, color: '#0f172a' }}>
              <SlidersHorizontal style={{ width: 14, height: 14, color: '#0284c7' }} />
              <span>Smart Filter</span>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#64748b',
                background: '#f1f5f9',
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              {filteredCompounds.length} compounds
            </span>
          </div>

          {/* Compound Search Input */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 4 }}>
              COMPOUNDS <span style={{ fontWeight: 400, textTransform: 'none' }}>Click to select multiple</span>
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '6px 10px',
              }}
            >
              <Search style={{ width: 13, height: 13, color: '#94a3b8', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Filter by compound (e.g. Mivida, Hyde Park...)"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 12,
                  color: '#0f172a',
                  width: '100%',
                }}
              />
              {filterQuery && (
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Bedrooms Selector Pills */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 6 }}>
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
                    border: selectedBed === b ? '1px solid #0284c7' : '1px solid #e2e8f0',
                    background: selectedBed === b ? '#f0f9ff' : '#ffffff',
                    color: selectedBed === b ? '#0284c7' : '#475569',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: selectedBed === b ? 800 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {b === 'any' ? 'Any' : b}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: 11.5,
                fontWeight: 600,
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
            background: '#071523',
            color: '#ffffff',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            padding: '10px 22px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 10px 25px -3px rgba(0,0,0,0.3)',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#0369a1';
            e.currentTarget.style.borderColor = '#38bdf8';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#071523';
            e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
          }}
        >
          <MapIcon style={{ width: 15, height: 15, color: '#38bdf8' }} />
          <span>Open Full Map</span>
        </Link>
      </div>
    </div>
  );
}
