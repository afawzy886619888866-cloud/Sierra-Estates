'use client';
/**
 * InventoryMap — plots owner-inventory units (from /api/inventory) on a live
 * Leaflet map. Uses react-leaflet (a repo dependency) with L.divIcon markers so
 * no external marker-image assets are needed.
 *
 * Many units share a single compound centroid (the sheet has ~80 units in
 * Madinaty alone), so overlapping markers are fanned out on a small circle,
 * deterministically, so every unit stays clickable.
 *
 * Dynamically imported with `ssr: false` by the parent — Leaflet needs `window`.
 */
import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { InventoryUnit, InventoryStatus } from '@/lib/inventory/types';

const CARTO_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const CARTO_ATTRIB = '&copy; OpenStreetMap &copy; CARTO';
const NEW_CAIRO: [number, number] = [30.03, 31.53];

const STATUS_COLOR: Record<InventoryStatus, string> = {
  available: '#16a34a', // green
  follow_up: '#d97706', // amber
  no_answer: '#64748b', // slate
  unavailable: '#9ca3af', // gray
};

/** A unit plus the (possibly fanned-out) coordinates it renders at. */
interface PlacedUnit extends InventoryUnit {
  renderLat: number;
  renderLng: number;
}

/**
 * Fan out units that share the same base coordinate onto a small circle so they
 * don't stack into a single un-clickable dot. Deterministic (index-based).
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
      // Spiral: several units per ring, radius grows slowly outward (~0.5–2 km).
      const ring = Math.floor(i / 8) + 1;
      const angle = (i % 8) * (Math.PI / 4) + ring * 0.6;
      const r = 0.004 * ring;
      placed.push({
        ...u,
        renderLat: u.lat + r * Math.cos(angle),
        renderLng: u.lng + r * Math.sin(angle),
      });
    });
  }
  return placed;
}

function unitIcon(u: InventoryUnit, isSelected: boolean) {
  const color = STATUS_COLOR[u.status];
  const size = isSelected ? 34 : 26;
  const ring = isSelected ? '#0d2136' : '#ffffff';
  const label = u.mode === 'rent' ? 'R' : 'S';
  return L.divIcon({
    className: '',
    html:
      `<span style="display:inline-flex;align-items:center;justify-content:center;` +
      `width:${size}px;height:${size}px;border-radius:50%;background:${color};` +
      `border:3px solid ${ring};box-shadow:0 3px 10px rgba(13,33,54,.4);` +
      `color:#fff;font:700 ${isSelected ? 13 : 11}px/1 system-ui;cursor:pointer;">${label}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function UnitPopup({ u }: { u: InventoryUnit }) {
  const facts = [u.beds ? `${u.beds} bd` : null, u.area ? `${u.area} m²` : null, u.propertyType]
    .filter(Boolean)
    .join(' · ');
  return (
    <div style={{ minWidth: 190, fontFamily: 'system-ui' }}>
      <div style={{ fontWeight: 800, fontSize: 14, color: '#0d2136' }}>{u.priceLabel}</div>
      <div style={{ color: '#64748b', fontSize: 12, margin: '2px 0 6px' }}>
        {u.location}
        {u.approxLocation ? ' · approx.' : ''}
      </div>
      {facts && <div style={{ fontSize: 12, color: '#334155' }}>{facts}</div>}
      <div
        style={{
          marginTop: 6,
          fontSize: 11,
          letterSpacing: '.04em',
          textTransform: 'uppercase',
          color: STATUS_COLOR[u.status],
        }}
      >
        {u.statusLabel} · {u.mode === 'rent' ? 'For rent' : 'For sale'}
      </div>
      {u.code && (
        <div style={{ marginTop: 4, font: '600 11px/1 ui-monospace, monospace', color: '#94a3b8' }}>
          {u.code}
        </div>
      )}
    </div>
  );
}

/** Pans/zooms the mounted map when the selection changes. */
function FlyTo({ target }: { target: PlacedUnit | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (target) map.flyTo([target.renderLat, target.renderLng], Math.max(map.getZoom(), 13), { duration: 0.6 });
  }, [target, map]);
  return null;
}

export default function InventoryMap({
  units,
  selectedId,
  onSelect,
}: {
  units: InventoryUnit[];
  selectedId: string | null;
  onSelect: (u: InventoryUnit) => void;
}) {
  const placed = useMemo(() => placeUnits(units), [units]);
  const selected = useMemo(
    () => placed.find((p) => p.id === selectedId) ?? null,
    [placed, selectedId],
  );

  return (
    <MapContainer
      center={NEW_CAIRO}
      zoom={11}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer url={CARTO_LIGHT} attribution={CARTO_ATTRIB} maxZoom={18} />
      {placed.map((u) => (
        <Marker
          key={u.id}
          position={[u.renderLat, u.renderLng]}
          icon={unitIcon(u, u.id === selectedId)}
          eventHandlers={{ click: () => onSelect(u) }}
          zIndexOffset={u.id === selectedId ? 1000 : u.status === 'available' ? 100 : 0}
        >
          <Popup maxWidth={260}>
            <UnitPopup u={u} />
          </Popup>
        </Marker>
      ))}
      <FlyTo target={selected} />
    </MapContainer>
  );
}
