'use client';

import React, { useEffect, useState } from 'react';
import { Marker, Popup, MapContainer, TileLayer, useMap } from 'react-leaflet';
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
  area?: number;
  img?: string;
};


function useLiveUnitCounts(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    fetch('/api/inventory', {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          console.error('[LiveMap] Authorization failure fetching inventory:', r.status);
        }
        return r.ok ? r.json() : null;
      })
      .then((data: { units?: Array<{ location?: string; status?: string }> } | null) => {
        if (cancelled || !data?.units) return;
        const next: Record<string, number> = {};
        for (const unit of data.units) {
          if (unit.status && unit.status !== 'available') continue;
          const key = (unit.location || '').trim().toLowerCase();
          if (!key) continue;
          next[key] = (next[key] || 0) + 1;
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
  const name = compound.code;
  const count = liveCount ?? compound.unitsCount;
  return L.divIcon({
    className: '',
    html: `
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 13px;
        border-radius: 20px;
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        font-size: 12px;
        font-weight: 800;
        white-space: nowrap;
        color: ${isSelected ? '#0d0d0f' : '#ffffff'};
        background: ${isSelected ? 'linear-gradient(135deg, #e9c176, #c8961a)' : 'linear-gradient(135deg, #002b4b, #0077cc)'};
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        border: 2px solid ${isSelected ? '#ffffff' : 'rgba(255,255,255,0.9)'};
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${isSelected ? '#0d0d0f' : '#34d399'};"></span>
        <span>${name}</span>
        <span style="
          background: ${isSelected ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)'};
          color: inherit;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 10px;
          font-family: monospace;
          font-weight: 700;
        ">${count}</span>
      </div>
    `,
    iconSize: undefined,
    iconAnchor: [35, 15],
  });
}

function createUnitIcon(unit: MapUnitPin, isMarked: boolean, isActive: boolean = false) {
  const shortPrice = unit.priceLabel
    .replace(' EGP', '')
    .replace(' / mo', '')
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

  return L.divIcon({
    className: '',
    html: `
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: ${isActive ? '5px 10px' : '4px 8px'};
        border-radius: 14px;
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        font-size: ${isActive ? '12px' : '11px'};
        font-weight: 800;
        white-space: nowrap;
        color: ${textColor};
        background: ${badgeBg};
        border: ${isActive ? '2.5px solid #ffffff' : `1.5px solid ${borderColor}`};
        box-shadow: ${isActive ? '0 0 16px rgba(233,193,118,0.9), 0 4px 14px rgba(0,0,0,0.6)' : '0 2px 10px rgba(0,0,0,0.5)'};
        cursor: pointer;
        transition: transform 0.15s ease;
        transform: ${isActive ? 'scale(1.15)' : 'scale(1)'};
        z-index: ${isActive ? 9999 : 'auto'};
      ">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${isActive ? '#0d0d0f' : isRent ? '#38bdf8' : '#10b981'};"></span>
        <span>${shortPrice}</span>
      </div>
    `,
    iconSize: undefined,
    iconAnchor: [30, 12],
  });
}

function MapController({ flyToCoords, flyToZoom }: { flyToCoords?: [number, number] | null; flyToZoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (flyToCoords && typeof flyToCoords[0] === 'number' && typeof flyToCoords[1] === 'number') {
      map.flyTo(flyToCoords, flyToZoom || 14, { duration: 0.8 });
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
  maxPins = 150,
  height = '100%',
}: LiveMapProps) {
  const isDark = mode === 'dark';
  const liveCounts = useLiveUnitCounts();
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  // Render up to maxPins pins for smooth interactive performance
  const displayUnits = units.slice(0, maxPins);

  return (
    <MapContainer
      center={[30.02, 31.54]}
      zoom={12}
      scrollWheelZoom={false}
      style={{ height, width: '100%' }}
    >
      <MapController flyToCoords={flyToCoords} flyToZoom={flyToZoom} />
      <TileLayer
        url={tileUrl}
        attribution="&copy; OpenStreetMap &copy; CARTO"
        maxZoom={18}
      />

      {/* Compound Cluster Node Markers */}
      {NEW_CAIRO_COMPOUNDS.map((compound, idx) => {
        const isSelected = selectedCode === compound.code;
        const liveCount = liveCounts[compound.nameEn.trim().toLowerCase()] ?? null;
        return (
          <Marker
            key={`compound-${compound.code}-${idx}`}
            position={[compound.lat, compound.lng]}
            icon={createCompoundIcon(compound, isSelected, liveCount)}
            eventHandlers={{
              click: () => onSelectCompound?.(compound),
            }}
          />
        );
      })}

      {/* Filtered Individual Unit Pins with Selection Popup */}
      {displayUnits.map((unit) => {
        if (!unit.lat || !unit.lng) return null;
        const isMarked = selectedUnitIds.has(unit.id);
        const isActive = activeUnitId === unit.id || activeUnitId === unit.code;
        const waMsg = encodeURIComponent(
          `مرحباً سييرا العقارية، أود الاستفسار عن الوحدة [${unit.code}] في كمبوند ${unit.compound} (${unit.priceLabel}). هل هي متاحة للمعاينة؟`
        );

        return (
          <Marker
            key={`unit-${unit.id}`}
            position={[unit.lat, unit.lng]}
            icon={createUnitIcon(unit, isMarked, isActive)}
            eventHandlers={{
              click: () => onSelectUnit?.(unit),
            }}
          >
            <Popup className="custom-unit-popup">
              <div style={{ width: 230, fontFamily: 'system-ui, sans-serif', color: '#0d0d0f' }}>
                {unit.img && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={unit.img}
                    alt={unit.code}
                    style={{ width: '100%', height: 115, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
                  />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <strong style={{ fontSize: 13, color: '#002b4b' }}>{unit.code}</strong>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: unit.mode === 'rent' ? '#e0f2fe' : '#d1fae5', color: unit.mode === 'rent' ? '#0369a1' : '#047857', fontWeight: 700 }}>
                    {unit.mode === 'rent' ? 'إيجار · Rent' : 'بيع · Sale'}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1f2937', marginBottom: 2 }}>
                  {unit.compound}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                  {unit.type} · {unit.beds || 3} غرف · {unit.area || 160} م²
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#059669', marginBottom: 8 }}>
                  {unit.priceLabel}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <a
                    href={`https://wa.me/201065582924?text=${waMsg}`}
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
                    <span>💬 تواصل واتساب فوري</span>
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
                      {isMarked ? '✓ محددة في شبكتك' : '+ إضافة إلى الشبكة (Mark)'}
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
