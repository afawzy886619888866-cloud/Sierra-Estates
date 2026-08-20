'use client';

/**
 * Live luxury compound map with interactive gold pill pins, fly-to transitions,
 * and high-fidelity compound details popup.
 */
import React, { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { HZDATA } from '@/lib/site/data';

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
  selectedName,
  onSelect,
}: {
  compounds: MapCompound[];
  featured?: string[];
  selectedName?: string | null;
  onSelect?: (name: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, any>>(new Map());
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
        zoom: 12,
        scrollWheelZoom: true,
        zoomControl: true,
      });
      mapRef.current = map;

      // Dark / Voyager luxury tile layer
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
      markersMapRef.current.clear();
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
      markersMapRef.current.clear();

      const imgs = (HZDATA as any).compoundImgs as Record<string, string> || {};

      compounds.forEach((c) => {
        const isFeat = featured.includes(c.n);
        const isSelected = selectedName === c.n;
        const hot = c.ai >= 9.2;
        const imgUrl = imgs[c.n] || imgs['Mivida'] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80';

        const markerHtml = `
          <div class="custom-map-pin ${isSelected ? 'is-selected' : ''} ${isFeat ? 'is-featured' : ''}" style="
            display: flex;
            align-items: center;
            gap: 6px;
            background: ${isSelected ? '#071523' : '#0a1e32'};
            color: #fff;
            padding: 4px 10px 4px 6px;
            border-radius: 999px;
            border: 1.5px solid ${isSelected ? '#ffffff' : hot ? '#E9C176' : 'rgba(255,255,255,0.25)'};
            box-shadow: 0 4px 18px rgba(0,0,0,0.45);
            cursor: pointer;
            white-space: nowrap;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11.5px;
            font-weight: 600;
            transform: translate(-50%, -50%);
            transition: all 0.2s ease;
          ">
            <span style="
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: ${hot ? '#E9C176' : isFeat ? '#00AEFF' : '#49D6A2'};
              box-shadow: 0 0 8px ${hot ? '#E9C176' : isFeat ? '#00AEFF' : '#49D6A2'};
            "></span>
            <span>${c.n}</span>
            <span style="color: #E9C176; font-weight: 700; margin-left: 2px;">${c.priceM}M</span>
          </div>
        `;

        const marker = L.marker(c.c, {
          icon: L.divIcon({
            className: 'custom-leaflet-marker',
            html: markerHtml,
            iconSize: [120, 32],
            iconAnchor: [60, 16],
          }),
        });

        const popupContent = `
          <div style="min-width: 220px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #071523; padding: 4px;">
            <div style="width: 100%; height: 110px; border-radius: 8px; overflow: hidden; margin-bottom: 8px; background: #eee;">
              <img src="${imgUrl}" alt="${c.n}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <strong style="font-size: 15px; color: #071523;">${c.n}</strong>
              <span style="background: #E9C176; color: #071523; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">AI ${c.ai.toFixed(1)}</span>
            </div>
            <div style="font-size: 12px; color: #5a6a7a; margin-bottom: 6px;">
              📍 ${c.z} · Growth: <b style="color: #059669;">${c.g}</b>
            </div>
            <div style="font-size: 13px; font-weight: 700; color: #071523;">
              Avg. Price: <span style="color: #b45309;">EGP ${c.priceM}M</span>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 280,
          className: 'sierra-map-popup',
        });

        marker.on('click', () => {
          onSelect?.(c.n);
          map.flyTo(c.c, 13, { duration: 0.8 });
        });

        marker.addTo(layer);
        markersMapRef.current.set(c.n, { marker, coords: c.c });
      });

      if (compounds.length && !selectedName) {
        map.fitBounds(L.latLngBounds(compounds.map((c) => c.c)).pad(0.15), { maxZoom: 13 });
      }
    })();
    return () => { cancelled = true; };
  }, [ready, compounds, featured, selectedName, onSelect]);

  // Fly to selected compound if changed from outside
  useEffect(() => {
    if (!ready || !selectedName || !mapRef.current) return;
    const target = markersMapRef.current.get(selectedName);
    if (target) {
      mapRef.current.flyTo(target.coords, 13, { duration: 0.8 });
      target.marker.openPopup();
    }
  }, [ready, selectedName]);

  return (
    <div
      ref={hostRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 460,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(5,18,31,0.12)',
      }}
    />
  );
}
