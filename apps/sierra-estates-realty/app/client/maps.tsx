'use client';
/**
 * Sierra Estates — live Leaflet maps.
 * Ported from ui_kits/houzez-portal/{compounds.html,property.html}: CARTO light
 * basemap tiles, custom DivIcon markers (AI-score badge on the compounds
 * overview map, a single blue dot on the property mini-map). Real react-leaflet
 * (npm, already a repo dependency) — not the CDN Leaflet build the static kit used.
 */
import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Compound } from './portalData';
import { NEW_CAIRO_CENTER } from './portalData';

const CARTO_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const CARTO_ATTRIB = '&copy; OpenStreetMap &copy; CARTO';

function compoundIcon(c: Compound, hot: boolean, isSelected: boolean) {
  return L.divIcon({
    className: '',
    html:
      `<span style="display:inline-flex;align-items:center;gap:6px;` +
      `padding:6px 13px;border-radius:20px;font-family:'Plus Jakarta Sans',sans-serif;` +
      `font-size:12px;font-weight:800;line-height:1;color:${isSelected ? '#0d0d0f' : '#fff'};white-space:nowrap;` +
      `background:${isSelected ? 'linear-gradient(135deg,#e9c176,#c8961a)' : hot ? 'linear-gradient(135deg,#00aeff,#0077cc)' : 'linear-gradient(135deg,#0d2136,#162e48)'};` +
      `box-shadow:0 4px 14px rgba(0,0,0,.4);border:2px solid #fff;cursor:pointer;">` +
      `<span style="width:6px;height:6px;border-radius:50%;background:${isSelected ? '#0d0d0f' : '#34d399'};"></span>` +
      `${c.n}` +
      `</span>`,
    iconSize: undefined,
    iconAnchor: [35, 15],
  });
}

function dotIcon() {
  return L.divIcon({
    className: '',
    html:
      '<span style="display:inline-flex;width:18px;height:18px;border-radius:50%;' +
      'background:#00aeff;border:3px solid #fff;box-shadow:0 3px 10px rgba(13,33,54,.4);"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/** Recenters/pans an already-mounted map when `center` changes (e.g. user selects a compound). */
function FlyTo({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  React.useEffect(() => {
    map.panTo(center, { animate: true });
    if (zoom) map.setZoom(zoom);
  }, [center, zoom, map]);
  return null;
}

export function CompoundsMap({
  compounds,
  selected,
  onSelect,
  height = 540,
}: {
  compounds: Compound[];
  selected: Compound | null;
  onSelect: (c: Compound) => void;
  height?: number;
}) {
  const markers = useMemo(() => compounds, [compounds]);
  return (
    <div style={{ height, borderRadius: 'var(--r-card, 10px)', overflow: 'hidden' }}>
      <MapContainer
        center={NEW_CAIRO_CENTER}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url={CARTO_LIGHT} attribution={CARTO_ATTRIB} maxZoom={18} />
        {markers.map((c) => (
          <Marker
            key={c.n}
            position={c.c}
            icon={compoundIcon(c, c.ai >= 9.3, selected?.n === c.n)}
            eventHandlers={{ click: () => onSelect(c) }}
          />
        ))}
        {selected && <FlyTo center={selected.c} zoom={13} />}
      </MapContainer>
    </div>
  );
}

export function PropertyMiniMap({ center, height = 260 }: { center: [number, number]; height?: number }) {
  return (
    <div style={{ height, borderRadius: 'var(--r-card, 10px)', overflow: 'hidden' }}>
      <MapContainer center={center} zoom={14} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer url={CARTO_LIGHT} attribution={CARTO_ATTRIB} maxZoom={18} />
        <Marker position={center} icon={dotIcon()} />
      </MapContainer>
    </div>
  );
}
