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

/**
 * Fan out unit pins sharing the exact same base coordinate onto a small spiral ring,
 * ensuring every property remains individually selectable without stacking into a single dot.
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
      const r = 0.0032 * ring; // ~350m step per ring
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
          const cmp = (unit.compound || unit.location || '').trim().toLowerCase();
          if (cmp) {
            next[cmp] = (next[cmp] || 0) + 1;
          }
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

function createCompoundIcon(compound: CompoundLocation, isSelected: boolean, liveCount: number | null) {
  const name = compound.nameEn || compound.code;
  const count = liveCount ?? compound.unitsCount;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 9999px;
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        font-size: 11.5px;
        font-weight: 800;
        white-space: nowrap;
        color: ${isSelected ? '#0d0d0f' : '#ffffff'};
        background: ${isSelected ? 'linear-gradient(135deg, #f7d58d, #c99436)' : 'linear-gradient(135deg, #0d2136, #1e3a5f)'};
        box-shadow: ${isSelected ? '0 0 20px rgba(233,193,118,0.7), 0 4px 16px rgba(0,0,0,0.5)' : '0 4px 14px rgba(0,0,0,0.45)'};
        border: ${isSelected ? '2.5px solid #ffffff' : '1.5px solid rgba(233,193,118,0.6)'};
        cursor: pointer;
        transition: all 0.2s ease;
        transform: ${isSelected ? 'scale(1.12)' : 'scale(1)'};
      ">
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${isSelected ? '#0d0d0f' : '#34d399'};box-shadow:0 0 6px rgba(52,211,153,0.8);"></span>
        <span style="letter-spacing:-0.01em;">${name}</span>
        <span style="
          background: ${isSelected ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'};
          color: inherit;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 8px;
          font-family: ui-monospace, monospace;
          font-weight: 700;
        ">${count}</span>
      </div>
    `,
    iconSize: undefined,
    iconAnchor: [45, 16],
  });
}

function createUnitIcon(unit: MapUnitPin, isMarked: boolean, isActive: boolean = false) {
  const shortPrice = unit.priceLabel
    .replace(' EGP', '')
    .replace(' / mo', '/m')
    .trim();

  const isRent = unit.mode === 'rent';
  const badgeBg = isActive
    ? '#e9c176'
    : isMarked
    ? '#002b4b'
    : isRent
    ? '#0284c7'
    : '#0f2942';

  const textColor = isActive ? '#0d0d0f' : isMarked ? '#e9c176' : '#ffffff';
  const borderColor = isActive
    ? '#ffffff'
    : isMarked
    ? '#e9c176'
    : isRent
    ? '#38bdf8'
    : '#c99436';

  const distBadge = unit.distanceKm != null
    ? `<span style="opacity:0.9;font-size:9.5px;font-weight:700;margin-left:3px;color:${isActive ? '#0d0d0f' : '#e9c176'};">· ${unit.distanceKm.toFixed(1)}km</span>`
    : '';

  return L.divIcon({
    className: '',
    html: `
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: ${isActive ? '5px 10px' : '3.5px 8px'};
        border-radius: 12px;
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        font-size: ${isActive ? '11.5px' : '10.5px'};
        font-weight: 800;
        white-space: nowrap;
        color: ${textColor};
        background: ${badgeBg};
        border: ${isActive ? '2.5px solid #ffffff' : `1.5px solid ${borderColor}`};
        box-shadow: ${isActive ? '0 0 20px rgba(233,193,118,0.9), 0 4px 14px rgba(0,0,0,0.6)' : '0 2px 10px rgba(0,0,0,0.5)'};
        cursor: pointer;
        transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        transform: ${isActive ? 'scale(1.18)' : 'scale(1)'};
        z-index: ${isActive ? 9999 : 'auto'};
      ">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${isActive ? '#0d0d0f' : isRent ? '#38bdf8' : '#10b981'};"></span>
        <span>${shortPrice}</span>
        ${distBadge}
      </div>
    `,
    iconSize: undefined,
    iconAnchor: [32, 12],
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
      map.flyTo(flyToCoords, flyToZoom || 14, { duration: 0.75 });
    }
  }, [flyToCoords, flyToZoom, map]);
  return null;
}

export interface LiveMapProps {
  mode?: 'dark' | 'light';
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
}

export default function LiveMap({
  mode = 'light',
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
}: LiveMapProps) {
  const [tileStyle, setTileStyle] = useState<MapTileStyle>(mode === 'dark' ? 'dark' : 'light');
  const liveCounts = useLiveUnitCounts();

  // Fan out overlapping coordinates so all units stay visible and clickable
  const displayUnits = useMemo(() => {
    const sliced = units.slice(0, maxPins);
    return placePins(sliced);
  }, [units, maxPins]);

  const activePlaced = useMemo(
    () => displayUnits.find((u) => u.id === activeUnitId || u.code === activeUnitId) ?? null,
    [displayUnits, activeUnitId]
  );

  const handleRecenter = useCallback(() => {
    onCenterChange?.(NEW_CAIRO_DEFAULT_CENTER);
  }, [onCenterChange]);

  const activeTile = TILE_LAYERS[tileStyle] || TILE_LAYERS.dark;

  return (
    <div style={{ position: 'relative', width: '100%', height, overflow: 'hidden' }}>
      {/* ── TOP CONTROLS BAR ── */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          right: 14,
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {/* Map Style Selector */}
        <div
          style={{
            pointerEvents: 'auto',
            background: 'rgba(13, 20, 36, 0.88)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 12,
            padding: '4px',
            display: 'flex',
            gap: 3,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {(['dark', 'light', 'satellite'] as MapTileStyle[]).map((style) => {
            const isSelected = tileStyle === style;
            const labels: Record<MapTileStyle, string> = {
              dark: '🌙 Dark',
              light: '☀️ Light',
              satellite: '🛰️ Satellite',
            };
            return (
              <button
                key={style}
                type="button"
                onClick={() => setTileStyle(style)}
                style={{
                  background: isSelected ? 'linear-gradient(135deg, #f7d58d, #c99436)' : 'transparent',
                  color: isSelected ? '#0d0d0f' : '#ffffff',
                  fontWeight: isSelected ? 800 : 600,
                  border: 'none',
                  borderRadius: 8,
                  padding: '4px 9px',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  transition: 'all 0.15s ease',
                }}
              >
                {labels[style]}
              </button>
            );
          })}
        </div>

        {/* Radius Filter & Recenter */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {onRadiusChange && (
            <div
              style={{
                background: 'rgba(13, 20, 36, 0.88)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 12,
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                fontSize: 11,
                color: '#ffffff',
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              }}
            >
              <span style={{ color: '#c99436', fontWeight: 700 }}>📍 Radius:</span>
              {[null, 5, 10, 25].map((r) => {
                const isSelected = r === radiusKm || (r === null && !radiusKm);
                return (
                  <button
                    key={r === null ? 'all' : `${r}km`}
                    type="button"
                    onClick={() => onRadiusChange(r)}
                    style={{
                      background: isSelected ? '#c99436' : 'rgba(255,255,255,0.08)',
                      color: isSelected ? '#0d0d0f' : '#ffffff',
                      fontWeight: isSelected ? 800 : 600,
                      border: 'none',
                      borderRadius: 6,
                      padding: '3px 7px',
                      cursor: 'pointer',
                      fontSize: 10.5,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {r === null ? 'All' : `${r}km`}
                  </button>
                );
              })}
            </div>
          )}

          {/* Reset Map View */}
          <button
            type="button"
            onClick={handleRecenter}
            title="Recenter to New Cairo"
            style={{
              background: 'rgba(13, 20, 36, 0.88)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 12,
              padding: '6px 11px',
              color: '#c99436',
              fontWeight: 800,
              fontSize: 11,
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            }}
          >
            🎯 Recenter
          </button>
        </div>
      </div>

      <MapContainer
        center={centerCoords || NEW_CAIRO_DEFAULT_CENTER}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <MapController flyToCoords={flyToCoords || (activePlaced ? [activePlaced.renderLat, activePlaced.renderLng] : null)} flyToZoom={flyToZoom} />
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

        {/* Compound Cluster Node Markers */}
        {NEW_CAIRO_COMPOUNDS.map((compound, idx) => {
          const isSelected = selectedCode === compound.code;
          const target = compound.nameEn.trim().toLowerCase();
          let liveCount = liveCounts[target] ?? null;
          if (liveCount === null) {
            for (const [k, count] of Object.entries(liveCounts)) {
              if (k.length >= 4 && (k.includes(target) || target.includes(k))) {
                liveCount = (liveCount || 0) + count;
              }
            }
          }

          return (
            <Marker
              key={`compound-${compound.code}-${idx}`}
              position={[compound.lat, compound.lng]}
              icon={createCompoundIcon(compound, isSelected, liveCount)}
              eventHandlers={{
                click: () => {
                  onSelectCompound?.(compound);
                  onCenterChange?.([compound.lat, compound.lng]);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -14]} opacity={0.95}>
                <div style={{ fontFamily: 'system-ui', fontSize: 11.5 }}>
                  <strong>{compound.nameEn}</strong> ({compound.nameAr})
                  <div style={{ color: '#64748b', fontSize: 10 }}>
                    {compound.developer} · {liveCount ?? compound.unitsCount} Available Units
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}

        {/* Filtered Individual Unit Pins with Luxury Popup */}
        {displayUnits.map((unit) => {
          const isMarked = selectedUnitIds.has(unit.id);
          const isActive = activeUnitId === unit.id || activeUnitId === unit.code;
          const waMsg = encodeURIComponent(
            `مرحباً سييرا العقارية، أود الاستفسار عن الوحدة [${unit.code}] في كمبوند ${unit.compound} (${unit.priceLabel}). هل هي متاحة للمعاينة؟`
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
                    <strong style={{ fontSize: 13, color: '#002b4b' }}>{unit.code}</strong>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 6,
                        background: unit.mode === 'rent' ? '#e0f2fe' : '#d1fae5',
                        color: unit.mode === 'rent' ? '#0369a1' : '#047857',
                        fontWeight: 700,
                      }}
                    >
                      {unit.mode === 'rent' ? 'For Rent' : 'For Sale'}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1f2937', marginBottom: 2 }}>
                    {unit.compound}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                    {unit.type} · {unit.beds ? `${unit.beds} Beds` : '3 Beds'} · {unit.area ? `${unit.area} m²` : '160 m²'}
                    {unit.distanceKm != null && (
                      <span style={{ color: '#c99436', fontWeight: 700, marginLeft: 4 }}>
                        · 📍 {unit.distanceKm.toFixed(1)} km
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#059669', marginBottom: 8 }}>
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
                      <span>💬 Direct WhatsApp</span>
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
                          color: isMarked ? '#e9c176' : '#374151',
                          fontWeight: 700,
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        {isMarked ? '✓ In Selection' : '+ Add to Selection'}
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
