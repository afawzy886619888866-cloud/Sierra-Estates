'use client';

/**
 * Sierra Estates - Luxury Compounds Masterplan Map
 * Tidy, clean, and organized presentation with smart collision handling,
 * instant district fly-to navigation, price tier filters, and interactive popups.
 */
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { Search, RotateCcw } from 'lucide-react';
import { HZDATA } from '@/lib/site/data';

export interface MapCompound {
  n: string;
  c: [number, number];
  z: string;
  ai: number;
  priceM: number;
  g: string;
  rent?: number;
}

const NEW_CAIRO_CENTER: [number, number] = [30.035, 31.57];

// District bounding coordinates for tidy, one-click camera focus
const DISTRICT_BOUNDS: Record<string, [[number, number], [number, number]]> = {
  'Katameya': [[29.975, 31.465], [30.005, 31.515]],
  '5th Settlement': [[29.995, 31.560], [30.055, 31.660]],
  'New Cairo': [[30.005, 31.455], [30.085, 31.585]],
  'Madinaty': [[30.075, 31.605], [30.125, 31.670]],
  'Shorouk': [[30.115, 31.585], [30.165, 31.650]],
  'Mostakbal': [[30.000, 31.550], [30.085, 31.695]],
};

export default function CompoundsMap({
  compounds,
  featured = [],
  selectedName,
  onSelect,
  showControls = false,
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
  const [activeDistrict, setActiveDistrict] = useState<string>('all');
  const [activeTier, setActiveTier] = useState<string>('all');
  const [mapSearch, setMapSearch] = useState<string>('');
  const [currentZoom, setCurrentZoom] = useState<number>(12);

  // Extract unique zones/districts
  const districts = useMemo(() => {
    const set = new Set(compounds.map((c) => c.z));
    return ['all', ...Array.from(set)];
  }, [compounds]);

  // Filtered compounds based on in-map filters
  const displayedCompounds = useMemo(() => {
    return compounds.filter((c) => {
      if (activeDistrict !== 'all' && c.z !== activeDistrict) return false;
      if (activeTier === 'luxury' && c.priceM < 20) return false;
      if (activeTier === 'premium' && (c.priceM < 10 || c.priceM >= 20)) return false;
      if (activeTier === 'accessible' && c.priceM >= 10) return false;
      if (mapSearch.trim()) {
        const query = mapSearch.trim().toLowerCase();
        if (!c.n.toLowerCase().includes(query) && !c.z.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [compounds, activeDistrict, activeTier, mapSearch]);

  // Initialize Leaflet Map
  useEffect(() => {
    let cancelled = false;
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
        zoomControl: false, // Custom placed zoom control
      });
      mapRef.current = map;

      // Add Zoom Control to Bottom Right for clean layout
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Voyager luxury tile layer (crisp & modern)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO &copy; Sierra Estates',
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      map.on('zoomend', () => {
        setCurrentZoom(map.getZoom());
      });

      layerRef.current = L.layerGroup().addTo(map);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      markersMapRef.current.clear();
    };
  }, []);

  // Render & organize tidy markers
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

      const imgs = ((HZDATA as any).compoundImgs as Record<string, string>) || {};

      displayedCompounds.forEach((c) => {
        const isFeat = featured.includes(c.n);
        const isSelected = selectedName === c.n;
        const isHot = c.ai >= 9.2;
        const isHighTier = c.priceM >= 20;
        const imgUrl = imgs[c.n] || imgs['Mivida'] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80';

        // Tidy, clean pill pin styling
        const markerHtml = `
          <div class="custom-compound-pin ${isSelected ? 'is-selected' : ''} ${isFeat ? 'is-featured' : ''}" style="
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: ${isSelected ? '#071523' : isHighTier ? '#0a1d30' : '#0d2238'};
            color: #ffffff;
            padding: ${isSelected ? '5px 12px 5px 8px' : '4px 9px 4px 6px'};
            border-radius: 999px;
            border: ${isSelected ? '2px solid #E9C176' : isHot ? '1.5px solid #E9C176' : '1px solid rgba(255,255,255,0.3)'};
            box-shadow: ${isSelected ? '0 0 20px rgba(233,193,118,0.7), 0 6px 20px rgba(0,0,0,0.5)' : '0 3px 12px rgba(0,0,0,0.35)'};
            cursor: pointer;
            white-space: nowrap;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: ${isSelected ? '12px' : '11px'};
            font-weight: ${isSelected ? '750' : '600'};
            transform: translate(-50%, -50%) ${isSelected ? 'scale(1.08)' : 'scale(1)'};
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: ${isSelected ? 1000 : isFeat ? 800 : 500};
          ">
            <span style="
              display: inline-block;
              width: 7px;
              height: 7px;
              border-radius: 50%;
              background: ${isHot ? '#E9C176' : isFeat ? '#00AEFF' : '#34D399'};
              box-shadow: 0 0 8px ${isHot ? '#E9C176' : isFeat ? '#00AEFF' : '#34D399'};
              flex-shrink: 0;
            "></span>
            <span style="letter-spacing: -0.01em;">${c.n}</span>
            <span style="
              color: #E9C176;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
              font-size: 10px;
              font-weight: 700;
              background: rgba(233,193,118,0.15);
              padding: 1px 5px;
              border-radius: 4px;
              margin-left: 2px;
            ">${c.priceM}M</span>
          </div>
        `;

        const marker = L.marker(c.c, {
          icon: L.divIcon({
            className: 'compound-leaflet-marker-wrap',
            html: markerHtml,
            iconSize: [110, 28],
            iconAnchor: [55, 14],
          }),
          zIndexOffset: isSelected ? 1000 : isFeat ? 500 : 100,
        });

        // Luxury Glassmorphic Popup
        const popupContent = `
          <div style="min-width: 240px; max-width: 270px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #071523; padding: 2px;">
            <div style="width: 100%; height: 118px; border-radius: 10px; overflow: hidden; margin-bottom: 10px; position: relative; background: #071523;">
              <img src="${imgUrl}" alt="${c.n}" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; top: 8px; right: 8px; background: rgba(7, 21, 35, 0.85); backdrop-filter: blur(8px); color: #E9C176; font-size: 10.5px; font-weight: 800; padding: 3px 7px; border-radius: 6px; border: 1px solid rgba(233,193,118,0.4);">
                AI ${c.ai.toFixed(1)}
              </div>
              <div style="position: absolute; bottom: 8px; left: 8px; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(6px); color: #fff; font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 4px;">
                📍 ${c.z}
              </div>
            </div>
            <div style="margin-bottom: 8px;">
              <h4 style="margin: 0 0 3px 0; font-size: 15px; font-weight: 800; color: #071523;">${c.n}</h4>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: #5a6a7a;">
                <span>Est. Growth: <strong style="color: #059669;">${c.g} YoY</strong></span>
                <span>Avg: <strong style="color: #b45309; font-weight: 800;">EGP ${c.priceM}M</strong></span>
              </div>
            </div>
            <button
              id="pop-view-${c.n.replace(/[^a-zA-Z0-9]/g, '')}"
              style="
                width: 100%;
                background: #071523;
                color: #E9C176;
                border: 1px solid rgba(233,193,118,0.3);
                border-radius: 8px;
                padding: 7px 10px;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s;
              "
              onmouseover="this.style.background='#0d233a'; this.style.borderColor='#E9C176';"
              onmouseout="this.style.background='#071523'; this.style.borderColor='rgba(233,193,118,0.3)';"
            >
              Select Compound & View Units →
            </button>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 290,
          className: 'sierra-map-popup',
        });

        marker.on('popupopen', () => {
          const btnId = `pop-view-${c.n.replace(/[^a-zA-Z0-9]/g, '')}`;
          const btn = document.getElementById(btnId);
          if (btn) {
            btn.onclick = () => {
              onSelect?.(c.n);
              map.closePopup();
            };
          }
        });

        marker.on('click', () => {
          onSelect?.(c.n);
          map.flyTo(c.c, 13.5, { duration: 0.8 });
        });

        marker.addTo(layer);
        markersMapRef.current.set(c.n, { marker, coords: c.c });
      });

      // If active district changed, fit map to district bounds
      if (activeDistrict !== 'all' && DISTRICT_BOUNDS[activeDistrict]) {
        map.flyToBounds(DISTRICT_BOUNDS[activeDistrict], { padding: [40, 40], duration: 0.9 });
      } else if (displayedCompounds.length && !selectedName && activeDistrict === 'all') {
        const bounds = L.latLngBounds(displayedCompounds.map((c) => c.c)).pad(0.12);
        map.fitBounds(bounds, { maxZoom: 13 });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, displayedCompounds, featured, selectedName, onSelect, activeDistrict]);

  // Handle external selection
  useEffect(() => {
    if (!ready || !selectedName || !mapRef.current) return;
    const target = markersMapRef.current.get(selectedName);
    if (target) {
      mapRef.current.flyTo(target.coords, 14, { duration: 0.8 });
      target.marker.openPopup();
    }
  }, [ready, selectedName]);

  // Handle district switch
  const handleDistrictChange = useCallback((d: string) => {
    setActiveDistrict(d);
    if (d === 'all' && mapRef.current) {
      mapRef.current.flyTo(NEW_CAIRO_CENTER, 12, { duration: 0.8 });
    }
  }, []);

  const handleReset = useCallback(() => {
    setActiveDistrict('all');
    setActiveTier('all');
    setMapSearch('');
    if (mapRef.current) {
      mapRef.current.flyTo(NEW_CAIRO_CENTER, 12, { duration: 0.8 });
    }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 480, borderRadius: 16, overflow: 'hidden' }}>
      {/* Floating In-Map District & Tier Organization Bar */}
      {showControls && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            zIndex: 650,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            pointerEvents: 'none',
          }}
        >
          {/* Top Bar: Search + Quick Stats + Reset */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              background: 'rgba(7, 21, 35, 0.88)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              padding: '6px 12px',
              borderRadius: 12,
              border: '1px solid rgba(233,193,118,0.22)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              pointerEvents: 'auto',
            }}
          >
            {/* Live Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 200px', maxWidth: 320 }}>
              <Search style={{ width: 14, height: 14, color: '#E9C176', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Filter compounds by name..."
                value={mapSearch}
                onChange={(e) => setMapSearch(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: 12,
                  width: '100%',
                  fontFamily: 'inherit',
                }}
              />
              {mapSearch && (
                <button
                  type="button"
                  onClick={() => setMapSearch('')}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}
                >
                  ×
                </button>
              )}
            </div>

            {/* Quick Stats Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#E9C176',
                  background: 'rgba(233,193,118,0.12)',
                  padding: '3px 8px',
                  borderRadius: 6,
                  border: '1px solid rgba(233,193,118,0.25)',
                }}
              >
                📍 {displayedCompounds.length} Compounds
              </span>

              {(activeDistrict !== 'all' || activeTier !== 'all' || mapSearch) && (
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw style={{ width: 11, height: 11 }} /> Reset
                </button>
              )}
            </div>
          </div>

          {/* District Selector Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              overflowX: 'auto',
              padding: '2px 0',
              pointerEvents: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            {districts.map((d) => {
              const isCurrent = activeDistrict === d;
              const count = d === 'all' ? compounds.length : compounds.filter((c) => c.z === d).length;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDistrictChange(d)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: isCurrent ? 'linear-gradient(135deg, #E9C176, #c8961a)' : 'rgba(7, 21, 35, 0.85)',
                    color: isCurrent ? '#071523' : '#e2e8f0',
                    border: isCurrent ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 999,
                    padding: '4px 11px',
                    fontSize: 11.5,
                    fontWeight: isCurrent ? 800 : 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    boxShadow: isCurrent ? '0 4px 12px rgba(233,193,118,0.4)' : '0 2px 8px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>{d === 'all' ? 'All Districts' : d}</span>
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      background: isCurrent ? '#071523' : 'rgba(255,255,255,0.15)',
                      color: isCurrent ? '#E9C176' : '#fff',
                      padding: '1px 5px',
                      borderRadius: 10,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Map Canvas Host */}
      <div
        ref={hostRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 480,
          background: '#071523',
          boxShadow: '0 8px 32px rgba(5,18,31,0.12)',
        }}
      />
    </div>
  );
}

