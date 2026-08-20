'use client';

/**
 * Live compound map. Leaflet touches `window`, so this module is only ever
 * pulled in through a `ssr: false` dynamic import.
 */
import React, { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';

export interface MapCompound {
  n: string;
  c: [number, number];
  z: string;
  ai: number;
  priceM: number;
  g: string;
}

const NEW_CAIRO: [number, number] = [30.03, 31.52];

export default function CompoundsMap({
  compounds,
  featured = [],
  onSelect,
}: {
  compounds: MapCompound[];
  featured?: string[];
  onSelect?: (name: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<any>(null);
  // Map creation is async; the marker effect must wait for it, so it depends
  // on this flag rather than racing the import.
  const [ready, setReady] = useState(false);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !hostRef.current || mapRef.current) return;

      const map = L.map(hostRef.current, {
        center: NEW_CAIRO,
        zoom: 11,
        scrollWheelZoom: false,
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      layerRef.current = L.layerGroup().addTo(map);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Repaint markers whenever the filtered set changes.
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

      compounds.forEach((c) => {
        const isFeat = featured.includes(c.n);
        const hot = c.ai >= 9.2;
        const color = isFeat ? '#00aeff' : hot ? '#e9c176' : '#7c8b99';
        const size = isFeat ? 15 : hot ? 13 : 10;

        const marker = L.marker(c.c, {
          icon: L.divIcon({
            className: 'cpd-pin',
            html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></span>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          }),
        });

        marker.bindPopup(
          `<strong style="font-size:13px">${c.n}</strong><br/>` +
            `<span style="font-size:12px;color:#616d79">${c.z} · EGP ${c.priceM}M avg · AI ${c.ai.toFixed(1)} · ${c.g}</span>`
        );
        marker.on('click', () => onSelect?.(c.n));
        marker.addTo(layer);
      });

      if (compounds.length) {
        map.fitBounds(L.latLngBounds(compounds.map((c) => c.c)).pad(0.2), { maxZoom: 13 });
      }
    })();
    return () => { cancelled = true; };
  }, [ready, compounds, featured, onSelect]);

  return <div ref={hostRef} style={{ width: '100%', height: '100%', minHeight: 420 }} />;
}
