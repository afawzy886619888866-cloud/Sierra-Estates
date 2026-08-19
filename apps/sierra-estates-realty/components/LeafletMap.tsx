'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
// Side-effect import: augments the `L` namespace with markerClusterGroup.
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

interface Listing {
  id: string;
  code: string;
  cmp: string;
  zone: string;
  beds: number;
  ai?: number;
  c: [number, number]; // coordinates
}

interface Compound {
  n: string;
  z: string;
  c: [number, number]; // coordinates
  priceM: number;
  ai: number;
}

interface LeafletMapProps {
  compounds: Compound[];
  listings: Listing[];
}

export default function LeafletMap({ compounds, listings }: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const clusterGroupRef = useRef<any>(null);
  const [selectedCompounds, setSelectedCompounds] = useState<string[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map centered on New Cairo
    const map = L.map(containerRef.current).setView([30.0095, 31.4872], 12);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Create marker cluster group
    const markerClusterGroup = L.markerClusterGroup({
      maxClusterRadius: 80,
      disableClusteringAtZoom: 16,
    });

    // Add compound markers
    compounds.forEach(compound => {
      const marker = L.circleMarker([compound.c[0], compound.c[1]], {
        radius: 8,
        fillColor: '#00aeff',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      })
        .bindPopup(
          `<div class="p-2">
            <strong>${compound.n}</strong><br/>
            Zone: ${compound.z}<br/>
            Price/m²: EGP ${compound.priceM.toLocaleString()}<br/>
            AI Score: ${compound.ai.toFixed(1)}
          </div>`
        )
        .on('click', () => {
          setSelectedCompounds(prev =>
            prev.includes(compound.n)
              ? prev.filter(c => c !== compound.n)
              : [...prev, compound.n]
          );
        });

      markersRef.current.push(marker);
      markerClusterGroup.addLayer(marker);
    });

    // Add listing markers
    listings.forEach(listing => {
      const marker = L.circleMarker([listing.c[0], listing.c[1]], {
        radius: 6,
        fillColor: '#34d399',
        color: '#fff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.7,
      })
        .bindPopup(
          `<div class="p-2">
            <strong>${listing.code}</strong><br/>
            ${listing.cmp}<br/>
            ${listing.beds} beds | ${listing.zone}<br/>
            AI: ${listing.ai || 'N/A'}
          </div>`
        );

      markersRef.current.push(marker);
      markerClusterGroup.addLayer(marker);
    });

    map.addLayer(markerClusterGroup);
    clusterGroupRef.current = markerClusterGroup;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [compounds, listings]);

  // Update marker visibility based on selected compounds
  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach(marker => {
      const popup = marker.getPopup();
      if (!popup) return;

      const popupContent = popup.getContent() as string;

      // Check if marker is a compound marker
      if (selectedCompounds.length === 0) {
        marker.setStyle({ opacity: 1, fillOpacity: 0.8 });
      } else {
        const isSelected = selectedCompounds.some(compound =>
          popupContent.includes(compound)
        );
        marker.setStyle(
          isSelected
            ? { opacity: 1, fillOpacity: 0.8 }
            : { opacity: 0.2, fillOpacity: 0.15 }
        );
      }
    });
  }, [selectedCompounds]);

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {selectedCompounds.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              {selectedCompounds.map(compound => (
                <button
                  key={compound}
                  onClick={() =>
                    setSelectedCompounds(prev => prev.filter(c => c !== compound))
                  }
                  className="bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-sm font-medium hover:bg-cyan-200 transition flex items-center gap-2"
                >
                  {compound}
                  <span>×</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedCompounds([])}
              className="text-gray-500 hover:text-gray-700 text-sm underline"
            >
              Clear all
            </button>
          </>
        )}
      </div>

      {/* Map */}
      <div
        ref={containerRef}
        className="w-full h-[480px] rounded-xl border border-gray-200 overflow-hidden shadow-sm"
      />

      {/* Legend */}
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#00aeff' }} />
          <span>Compounds</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#34d399' }} />
          <span>Listings</span>
        </div>
        <div className="md:col-span-2 text-gray-600">
          Click compound markers to filter listings
        </div>
      </div>
    </div>
  );
}
