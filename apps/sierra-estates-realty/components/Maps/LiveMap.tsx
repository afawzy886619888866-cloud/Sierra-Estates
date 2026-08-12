'use client';

import React from 'react';
import { Marker, MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { CompoundLocation, NEW_CAIRO_COMPOUNDS } from './compounds-data';
export type { CompoundLocation };
export { NEW_CAIRO_COMPOUNDS };

type LiveMapProps = {
  mode?: 'dark' | 'light';
  selectedCode?: string | null;
  onSelectCompound?: (c: CompoundLocation) => void;
};

function createCompoundIcon(compound: CompoundLocation, isSelected: boolean) {
  const name = compound.nameEn;
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
        ">${compound.unitsCount}</span>
      </div>
    `,
    iconSize: undefined,
    iconAnchor: [35, 15],
  });
}

export default function LiveMap({ mode = 'light', selectedCode, onSelectCompound }: LiveMapProps) {
  const isDark = mode === 'dark';
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

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
      {NEW_CAIRO_COMPOUNDS.map((compound) => {
        const isSelected = selectedCode === compound.code;
        return (
          <Marker
            key={compound.code}
            position={[compound.lat, compound.lng]}
            icon={createCompoundIcon(compound, isSelected)}
            eventHandlers={{
              click: () => onSelectCompound?.(compound),
            }}
          />
        );
      })}
    </MapContainer>
  );
}
