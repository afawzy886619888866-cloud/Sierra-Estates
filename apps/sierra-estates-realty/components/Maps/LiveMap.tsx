'use client';

import React, { useEffect, useState } from 'react';
import { Marker, Popup, MapContainer, TileLayer } from 'react-leaflet';
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

type LiveMapProps = {
  mode?: 'dark' | 'light';
  selectedCode?: string | null;
  onSelectCompound?: (c: CompoundLocation) => void;
  units?: MapUnitPin[];
  selectedUnitIds?: Set<string>;
  onToggleUnit?: (id: string) => void;
};

function useLiveUnitCounts(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    fetch('/api/inventory')
      .then((r) => (r.ok ? r.json() : null))
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

function createUnitIcon(unit: MapUnitPin, isMarked: boolean) {
  const shortPrice = unit.priceLabel
    .replace(' EGP', '')
    .replace(' / mo', '')
    .trim();

  return L.divIcon({
    className: '',
    html: `
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 14px;
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        font-size: 11px;
        font-weight: 800;
        white-space: nowrap;
        color: ${isMarked ? '#0d0d0f' : '#ffffff'};
        background: ${isMarked ? '#e9c176' : '#09152a'};
        border: 1.5px solid ${isMarked ? '#ffffff' : '#0077cc'};
        box-shadow: 0 2px 10px rgba(0,0,0,0.5);
        cursor: pointer;
        transition: transform 0.15s ease;
      ">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${isMarked ? '#0d0d0f' : '#10b981'};"></span>
        <span>${shortPrice}</span>
      </div>
    `,
    iconSize: undefined,
    iconAnchor: [30, 12],
  });
}

export default function LiveMap({
  mode = 'light',
  selectedCode,
  onSelectCompound,
  units = [],
  selectedUnitIds = new Set(),
  onToggleUnit,
}: LiveMapProps) {
  const isDark = mode === 'dark';
  const liveCounts = useLiveUnitCounts();
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  // Limit rendered individual unit pins on map for performance (up to 75 pins)
  const displayUnits = units.slice(0, 75);

  return (
    <MapContainer
      center={[30.02, 31.54]}
      zoom={12}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url={tileUrl}
        attribution="&copy; OpenStreetMap &copy; CARTO"
        maxZoom={18}
      />

      {/* Compound Cluster Node Markers */}
      {NEW_CAIRO_COMPOUNDS.map((compound) => {
        const isSelected = selectedCode === compound.code;
        const liveCount = liveCounts[compound.nameEn.trim().toLowerCase()] ?? null;
        return (
          <Marker
            key={`compound-${compound.code}`}
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

        return (
          <Marker
            key={`unit-${unit.id}`}
            position={[unit.lat, unit.lng]}
            icon={createUnitIcon(unit, isMarked)}
          >
            <Popup className="custom-unit-popup">
              <div style={{ width: 220, fontFamily: 'system-ui, sans-serif', color: '#0d0d0f' }}>
                {unit.img && (
                  <img
                    src={unit.img}
                    alt={unit.code}
                    style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
                  />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <strong style={{ fontSize: 13, color: '#002b4b' }}>{unit.code}</strong>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: unit.mode === 'rent' ? '#e0f2fe' : '#d1fae5', color: unit.mode === 'rent' ? '#0369a1' : '#047857', fontWeight: 700 }}>
                    {unit.mode === 'rent' ? 'إيجار' : 'بيع'}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1f2937', marginBottom: 2 }}>
                  {unit.compound}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                  {unit.type} · {unit.beds || 3} غرف · {unit.area || 160} م²
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#059669', marginBottom: 10 }}>
                  {unit.priceLabel}
                </div>

                {onToggleUnit && (
                  <button
                    type="button"
                    onClick={() => onToggleUnit(unit.id)}
                    style={{
                      width: '100%',
                      padding: '7px 0',
                      borderRadius: 8,
                      border: 'none',
                      background: isMarked ? '#002b4b' : 'linear-gradient(135deg, #c99436, #e9c176)',
                      color: isMarked ? '#e9c176' : '#0d0d0f',
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    }}
                  >
                    {isMarked ? '✓ محددة في شبكتك' : '+ إضافة إلى الشبكة (Mark)'}
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
