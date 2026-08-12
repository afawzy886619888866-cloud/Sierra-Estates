'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MapPin, Search, ChevronDown, MapIcon, Menu, X, Home, Sun, Moon } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet map to avoid SSR issues
const LeafletMap = dynamic(() => import('./PropertyMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-950 flex items-center justify-center"><span className="text-slate-400">Loading map...</span></div>
});

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

interface SearchFilters {
  priceMin: number;
  priceMax: number;
  beds: number | null;
  baths: number | null;
  compound: string;
  sortBy: 'price-asc' | 'price-desc' | 'newest' | 'roi';
}

const MOCK_PROPERTIES: Property[] = [
  {
    id: '1',
    code: 'NC-001',
    title: 'Luxe Penthouse - 4 Beds',
    location: 'Golden Square, New Cairo',
    price: 8500000,
    beds: 4,
    baths: 3,
    area: 450,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=500&fit=crop',
    compound: 'Golden Square',
    roi: 12.5,
    status: 'available',
    lat: 30.0262,
    lng: 31.4855,
  },
  {
    id: '2',
    code: 'NC-002',
    title: 'Modern Villa - 5 Beds',
    location: 'The Meadows, Fifth Settlement',
    price: 12000000,
    beds: 5,
    baths: 4,
    area: 650,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c27c523?w=800&h=500&fit=crop',
    compound: 'The Meadows',
    roi: 15.3,
    status: 'available',
    lat: 30.0214,
    lng: 31.4977,
  },
  {
    id: '3',
    code: 'NC-003',
    title: 'Elegant Townhouse - 3 Beds',
    location: 'Uptown, New Cairo',
    price: 6200000,
    beds: 3,
    baths: 2,
    area: 320,
    image: 'https://images.unsplash.com/photo-1600607687644-c173dc11d4e2?w=800&h=500&fit=crop',
    compound: 'Uptown',
    roi: 10.8,
    status: 'available',
    lat: 30.0289,
    lng: 31.4903,
  },
  {
    id: '4',
    code: 'NC-004',
    title: 'Premium Apartment - 2 Beds',
    location: 'Katameya Dunes, New Cairo',
    price: 4800000,
    beds: 2,
    baths: 2,
    area: 220,
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=500&fit=crop',
    compound: 'Katameya Dunes',
    roi: 9.2,
    status: 'pending',
    lat: 30.0145,
    lng: 31.4901,
  },
];

const COMPOUNDS = ['All Compounds', 'Golden Square', 'The Meadows', 'Uptown', 'Katameya Dunes', 'Five West'];

export default function HouzezPortal() {
  const [filters, setFilters] = useState<SearchFilters>({
    priceMin: 0,
    priceMax: 20000000,
    beds: null,
    baths: null,
    compound: 'All Compounds',
    sortBy: 'price-asc',
  });

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    const results = MOCK_PROPERTIES.filter((p) => {
      const matchesPrice = p.price >= filters.priceMin && p.price <= filters.priceMax;
      const matchesBeds = filters.beds === null || p.beds === filters.beds;
      const matchesBaths = filters.baths === null || p.baths === filters.baths;
      const matchesCompound = filters.compound === 'All Compounds' || p.compound === filters.compound;
      return matchesPrice && matchesBeds && matchesBaths && matchesCompound;
    });

    // Sort
    if (filters.sortBy === 'price-asc') results.sort((a, b) => a.price - b.price);
    if (filters.sortBy === 'price-desc') results.sort((a, b) => b.price - a.price);
    if (filters.sortBy === 'roi') results.sort((a, b) => (b.roi || 0) - (a.roi || 0));

    return results;
  }, [filters]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const bgColor = isDarkMode ? 'bg-[#090d16]' : 'bg-slate-50';
  const textColor = isDarkMode ? 'text-white' : 'text-slate-900';
  const borderColor = isDarkMode ? 'border-slate-800/80' : 'border-slate-200';
  const surfaceColor = isDarkMode ? 'bg-slate-900/80' : 'bg-white';
  const hoverColor = isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100';

  return (
    <div className={`${bgColor} ${textColor} min-h-screen transition-colors duration-300`}>
      {/* Header */}
      <header className={`border-b ${borderColor} sticky top-0 z-40 backdrop-blur-md bg-[#090d16]/80`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center font-bold text-slate-950 text-sm gold-glow">
              S
            </div>
            <span className="text-xl font-display font-bold gold-gradient-text">Sierra Estates</span>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {/* Theme toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-xl ${surfaceColor} border ${borderColor} ${hoverColor} transition btn-tactile text-amber-400`}
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Mobile menu button */}
            <button className={`md:hidden p-2 rounded-xl ${surfaceColor} border ${borderColor} btn-tactile`}>
              <Menu className="w-5 h-5 text-slate-300" />
            </button>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
        {/* Properties sidebar */}
        <div className={`w-full lg:w-[45%] border-r ${borderColor} flex flex-col overflow-hidden`}>
          {/* Search & Filters */}
          <div className={`border-b ${borderColor} p-4 space-y-3`}>
            {/* Main search */}
            <div className={`flex items-center gap-2 ${surfaceColor} rounded-lg px-3 py-2`}>
              <Search className="w-4 h-4 text-amber-500" />
              <input
                type="text"
                placeholder="Search properties, locations..."
                className={`flex-1 bg-transparent outline-none text-sm ${isDarkMode ? 'placeholder-gray-500' : 'placeholder-gray-400'}`}
              />
            </div>

            {/* Filter row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {/* Price dropdown */}
              <div data-dropdown className="relative" ref={(el) => { if (el) dropdownRefs.current.price = el; }}>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'price' ? null : 'price')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${surfaceColor} ${hoverColor} text-sm`}
                >
                  <span>Price</span>
                  <ChevronDown className={`w-4 h-4 transition ${openDropdown === 'price' ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === 'price' && (
                  <div className={`absolute top-full mt-1 w-full ${surfaceColor} border ${borderColor} rounded-lg p-3 z-50 space-y-2`}>
                    <div className="text-xs text-gray-500 mb-2">Min: {(filters.priceMin / 1000000).toFixed(1)}M</div>
                    <input
                      type="range"
                      min="0"
                      max="20000000"
                      step="1000000"
                      value={filters.priceMin}
                      onChange={(e) => setFilters({ ...filters, priceMin: Number(e.target.value) })}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 mt-2">Max: {(filters.priceMax / 1000000).toFixed(1)}M</div>
                    <input
                      type="range"
                      min="0"
                      max="20000000"
                      step="1000000"
                      value={filters.priceMax}
                      onChange={(e) => setFilters({ ...filters, priceMax: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* Beds dropdown */}
              <div data-dropdown className="relative" ref={(el) => { if (el) dropdownRefs.current.beds = el; }}>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'beds' ? null : 'beds')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${surfaceColor} ${hoverColor} text-sm`}
                >
                  <span>Beds</span>
                  <ChevronDown className={`w-4 h-4 transition ${openDropdown === 'beds' ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === 'beds' && (
                  <div className={`absolute top-full mt-1 w-full ${surfaceColor} border ${borderColor} rounded-lg p-2 z-50 space-y-1`}>
                    {[null, 2, 3, 4, 5].map((b) => (
                      <button
                        key={b}
                        onClick={() => {
                          setFilters({ ...filters, beds: b });
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-3 py-1 rounded text-sm ${filters.beds === b ? 'bg-amber-500 text-white' : hoverColor}`}
                      >
                        {b === null ? 'Any' : `${b} Beds`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Compound dropdown */}
              <div data-dropdown className="relative col-span-2 md:col-span-1" ref={(el) => { if (el) dropdownRefs.current.compound = el; }}>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'compound' ? null : 'compound')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${surfaceColor} ${hoverColor} text-sm`}
                >
                  <span className="truncate">{filters.compound}</span>
                  <ChevronDown className={`w-4 h-4 transition flex-shrink-0 ${openDropdown === 'compound' ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === 'compound' && (
                  <div className={`absolute top-full mt-1 w-full ${surfaceColor} border ${borderColor} rounded-lg p-2 z-50 space-y-1 max-h-48 overflow-y-auto`}>
                    {COMPOUNDS.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setFilters({ ...filters, compound: c });
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-3 py-1 rounded text-sm ${filters.compound === c ? 'bg-amber-500 text-white' : hoverColor}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Map toggle on mobile */}
              <button
                onClick={() => setShowMobileMap(!showMobileMap)}
                className={`lg:hidden col-span-1 flex items-center justify-center px-3 py-2 rounded-lg ${surfaceColor} ${hoverColor}`}
                title="Toggle map"
              >
                <MapIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Results count */}
            <div className="text-xs text-gray-500 px-1">
              {filteredProperties.length} properties found
            </div>
          </div>

          {/* Properties list */}
          <div className={`flex-1 overflow-y-auto ${showMobileMap ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
            {filteredProperties.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Home className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No properties match your criteria</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {filteredProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    isSelected={selectedProperty?.id === property.id}
                    onSelect={setSelectedProperty}
                    surfaceColor={surfaceColor}
                    borderColor={borderColor}
                    hoverColor={hoverColor}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map area */}
        <div className={`hidden lg:flex w-[55%] relative overflow-hidden ${surfaceColor}`}>
          <LeafletMap
            properties={filteredProperties}
            selectedProperty={selectedProperty}
            onPropertySelect={setSelectedProperty}
          />
        </div>

        {/* Mobile map overlay */}
        {showMobileMap && (
          <div className="absolute inset-0 lg:relative lg:w-full z-30 flex flex-col">
            <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
              <h3 className="font-semibold">Map View</h3>
              <button
                onClick={() => setShowMobileMap(false)}
                className="lg:hidden p-1 rounded hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1">
              <LeafletMap
                properties={filteredProperties}
                selectedProperty={selectedProperty}
                onPropertySelect={setSelectedProperty}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface PropertyCardProps {
  property: Property;
  isSelected: boolean;
  onSelect: (property: Property) => void;
  surfaceColor: string;
  borderColor: string;
  hoverColor: string;
}

function PropertyCard({
  property,
  isSelected,
  onSelect,
  surfaceColor,
  borderColor,
  hoverColor,
}: PropertyCardProps) {
  const formatPrice = (price: number) => {
    return `EGP ${(price / 1000000).toFixed(1)}M`;
  };

  return (
    <button
      onClick={() => onSelect(property)}
      className={`w-full text-left rounded-lg overflow-hidden transition ${
        isSelected ? `ring-2 ring-amber-500 ${surfaceColor}` : `border ${borderColor} ${surfaceColor} ${hoverColor}`
      }`}
    >
      <div className="relative h-32 overflow-hidden bg-gray-400">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={property.image}
          alt={property.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Property';
          }}
        />
        <div className="absolute top-2 right-2 bg-amber-500 text-white px-2 py-1 rounded text-xs font-semibold">
          {formatPrice(property.price)}
        </div>
        <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold ${
          property.status === 'available' ? 'bg-green-500' : property.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'
        } text-white`}>
          {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
        </div>
      </div>

      {/* Details */}
      <div className="p-3">
        <h3 className="font-serif font-semibold text-sm mb-1">{property.title}</h3>
        <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {property.location}
        </p>

        {/* Features grid */}
        <div className="grid grid-cols-3 gap-2 text-xs mb-2">
          <div>
            <div className="text-gray-400">Beds</div>
            <div className="font-semibold">{property.beds}</div>
          </div>
          <div>
            <div className="text-gray-400">Baths</div>
            <div className="font-semibold">{property.baths}</div>
          </div>
          <div>
            <div className="text-gray-400">Area</div>
            <div className="font-semibold">{property.area}m²</div>
          </div>
        </div>

        {/* ROI badge */}
        {property.roi && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-400">Estimated ROI:</span>
            <span className="text-green-400 font-semibold">{property.roi}%</span>
          </div>
        )}
      </div>
    </button>
  );
}
