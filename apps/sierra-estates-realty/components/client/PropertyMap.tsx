'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Property {
  id: string;
  code: string;
  title: string;
  location: string;
  price: number;
  beds: number;
  baths: number;
  area: number;
  image: string;
  compound: string;
  roi?: number;
  status: 'available' | 'sold' | 'pending';
  lat: number;
  lng: number;
}

interface PropertyMapProps {
  properties: Property[];
  selectedProperty: Property | null;
  onPropertySelect: (property: Property) => void;
}

const CAIRO_CENTER = { lat: 30.0262, lng: 31.4855 };

// Custom icon for properties
const createPropertyIcon = (isSelected: boolean, status: string) => {
  const color = isSelected ? '#f59e0b' : status === 'available' ? '#10b981' : status === 'pending' ? '#f59e0b' : '#6b7280';
  return L.divIcon({
    html: `<div style="
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: ${color};
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
      transition: all 0.2s;
    ">🏠</div>`,
    className: 'property-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

export default function PropertyMap({
  properties,
  selectedProperty,
  onPropertySelect,
}: PropertyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<{ [key: string]: L.Marker }>({});

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = L.map(mapContainer.current, {
      scrollWheelZoom: false,
      zoomControl: true,
      touchZoom: true,
      dragging: true,
    }).setView([CAIRO_CENTER.lat, CAIRO_CENTER.lng], 13);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    Object.values(markers.current).forEach((marker) => marker.remove());
    markers.current = {};

    // Add new markers
    properties.forEach((property) => {
      const isSelected = selectedProperty?.id === property.id;
      const marker = L.marker([property.lat, property.lng], {
        icon: createPropertyIcon(isSelected, property.status),
      })
        .addTo(map.current!)
        .bindPopup(
          `<div style="font-family: system-ui; font-size: 13px;">
            <strong>${property.title}</strong><br/>
            <small>${property.location}</small><br/>
            <strong>EGP ${(property.price / 1000000).toFixed(1)}M</strong><br/>
            <small>${property.beds} Beds • ${property.baths} Baths • ${property.area}m²</small>
          </div>`,
          { maxWidth: 250 }
        )
        .on('click', () => {
          onPropertySelect(property);
        });

      markers.current[property.id] = marker;
    });
  }, [properties, selectedProperty, onPropertySelect]);

  // Pan to selected property
  useEffect(() => {
    if (!map.current || !selectedProperty) return;

    map.current.setView([selectedProperty.lat, selectedProperty.lng], 14);

    // Show popup
    const marker = markers.current[selectedProperty.id];
    if (marker) {
      marker.openPopup();
    }
  }, [selectedProperty]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
