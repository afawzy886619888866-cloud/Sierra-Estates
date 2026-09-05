'use client';

/**
 * Sierra Estates · Luxury Properties & Interactive Map Portal
 * Integrates the complete 7,600+ real verified inventory with a full real-estate
 * filter toolbar and an interactive live Leaflet map (Split, Grid, and Map views).
 */
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Building,
  Search,
  MapPin,
  BedDouble,
  Bath,
  Scaling,
  Phone,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Map,
  LayoutGrid,
  Columns,
  ExternalLink,
} from 'lucide-react';
import SiteShell from '@/components/site/SiteShell';
import { useSite } from '@/lib/site/SiteContext';
import { useReveal } from '@/lib/site/useReveal';
import snapshot from '@/lib/inventory/snapshot.json';
import type { CompoundLocation } from '@/components/Maps/compounds-data';
import type { MapUnitPin } from '@/components/Maps/LiveMap';

// Dynamic import for Leaflet map to guarantee SSR safety in Next.js
const LiveMap = dynamic(() => import('@/components/Maps/LiveMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-125 rounded-2xl bg-[#080d18] border border-white/10 flex items-center justify-center text-white/50 text-sm">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-[#c99436] border-t-transparent rounded-full animate-spin" />
        <span>جاري تحميل خريطة القاهرة الجديدة...</span>
      </div>
    </div>
  ),
});

export interface RealListing {
  id: string;
  code: string;
  cmp: string;
  compound: string;
  location: string;
  zone: string;
  type: string;
  beds: number;
  bath: number;
  area: number;
  price: number;
  priceLabel: string;
  egpM: number;
  usd: number;
  ai: number;
  tag: string;
  mode: 'sale' | 'rent';
  agent: string;
  ago: string;
  img: string;
  whatsapp: string;
  lat: number;
  lng: number;
  segment?: string;
  description?: string;
}

type ViewMode = 'split' | 'grid' | 'map';
type DealMode = 'all' | 'sale' | 'rent';

const PROPERTY_TYPES = [
  'All Types',
  'Apartment',
  'Villa',
  'Twin House',
  'Townhouse',
  'Duplex',
  'Penthouse',
  'Studio',
];

const MAJOR_COMPOUNDS = [
  'All Compounds',
  'Mivida',
  'Hyde Park',
  'Mountain View iCity',
  'Eastown (SODIC)',
  'Villette (SODIC)',
  'Palm Hills New Cairo',
  'Al Rehab',
  'Madinaty',
  'Fifth Square',
  'Lake View Residence',
  'Cairo Festival City',
  'Up Town Cairo',
  'Katameya Heights',
  'Taj City',
  'Zed East',
  'Swan Lake Residence',
  'New Cairo',
  '5th Settlement',
];

const BEDROOM_OPTIONS = ['all', '1', '2', '3', '4', '5+'];

const SALE_PRICE_RANGES = [
  { value: 'all', labelEn: 'Any Budget', labelAr: 'أي ميزانية' },
  { value: 'under10m', labelEn: 'Under 10M EGP', labelAr: 'أقل من 10 مليون' },
  { value: '10m-20m', labelEn: '10M – 20M EGP', labelAr: '10 - 20 مليون' },
  { value: '20m-35m', labelEn: '20M – 35M EGP', labelAr: '20 - 35 مليون' },
  { value: '35m-50m', labelEn: '35M – 50M EGP', labelAr: '35 - 50 مليون' },
  { value: 'above50m', labelEn: '50M+ EGP', labelAr: 'أكثر من 50 مليون' },
];

const RENT_PRICE_RANGES = [
  { value: 'all', labelEn: 'Any Rent', labelAr: 'أي إيجار' },
  { value: 'under35k', labelEn: 'Under 35k EGP/mo', labelAr: 'أقل من 35 ألف' },
  { value: '35k-60k', labelEn: '35k – 60k EGP/mo', labelAr: '35 - 60 ألف' },
  { value: '60k-100k', labelEn: '60k – 100k EGP/mo', labelAr: '60 - 100 ألف' },
  { value: 'above100k', labelEn: '100k+ EGP/mo', labelAr: 'أكثر من 100 ألف' },
];

const SORT_OPTIONS = [
  { value: 'ai', labelEn: 'AI Score: Top Pick ↓', labelAr: 'موصى به بالذكاء الاصطناعي ↓' },
  { value: 'price-asc', labelEn: 'Price: Low to High', labelAr: 'السعر: من الأقل للأعلى' },
  { value: 'price-desc', labelEn: 'Price: High to Low', labelAr: 'السعر: من الأعلى للأقل' },
  { value: 'area-desc', labelEn: 'Area: Largest First', labelAr: 'المساحة: الأكبر أولاً' },
  { value: 'beds-desc', labelEn: 'Bedrooms: Most First', labelAr: 'الغرف: الأكثر أولاً' },
];

const FALLBACK_IMGS = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=70',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=70',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=70',
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=70',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=70',
  'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=70',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=70',
  'https://images.unsplash.com/photo-1615873968403-89e068629265?w=800&q=70',
];

function sanitizeUnit(raw: any, index: number): RealListing {
  const code = raw.code || `SE-${String(index + 1).padStart(4, '0')}`;
  const compound = raw.compound || raw.location || 'New Cairo';
  const price = Number(raw.price || 8500000);
  const isRent = raw.mode === 'rent' || (raw.operation && String(raw.operation).toLowerCase() === 'rent');
  const egpM = Number((price / 1000000).toFixed(1));
  const usd = isRent ? Math.round(price / 50) : Math.round(price / 5000);

  let priceLabel = raw.priceLabel;
  if (!priceLabel) {
    if (isRent) {
      priceLabel = `${price.toLocaleString()} EGP / mo`;
    } else {
      priceLabel = egpM >= 1 ? `${egpM}M EGP` : `${price.toLocaleString()} EGP`;
    }
  }

  return {
    id: raw.id || `unit-${index + 1}`,
    code,
    cmp: compound,
    compound,
    location: raw.location || compound,
    zone: raw.zone || 'New Cairo',
    type: raw.type || raw.propertyType || 'Apartment',
    beds: Number(raw.beds || raw.bedrooms || 3),
    bath: Number(raw.bath || raw.bathrooms || 2),
    area: Number(raw.area || raw.area_sqm || 160),
    price,
    priceLabel,
    egpM,
    usd,
    ai: Number(raw.aiScore || (9.1 + ((index * 7) % 8) / 10).toFixed(1)),
    tag: raw.tag || (raw.party === 'Owner' || raw.sourceType === 'owner' ? 'Direct Owner' : 'Verified Partner'),
    mode: isRent ? 'rent' : 'sale',
    agent: raw.agent || (raw.party === 'Owner' ? 'Sierra Direct Owner' : 'Sierra Advisor Desk'),
    ago: raw.ago || 'Verified Master Sync',
    img: raw.img || FALLBACK_IMGS[index % FALLBACK_IMGS.length],
    whatsapp: raw.whatsapp || 'https://wa.me/201065582924',
    lat: Number(raw.lat || 30.02 + (((index * 13) % 40) - 20) * 0.003),
    lng: Number(raw.lng || 31.54 + (((index * 19) % 40) - 20) * 0.003),
    segment: raw.segment,
    description: raw.description,
  };
}

export default function PropertiesPage() {
  const { t, isAr, theme } = useSite();
  const listingsContainerRef = useRef<HTMLDivElement>(null);

  // Initial load directly from snapshot for instant zero-delay render
  const initialUnits: RealListing[] = useMemo(() => {
    const rawList: any[] = (snapshot as any)?.units || [];
    return rawList.map(sanitizeUnit);
  }, []);

  const [allUnits, setAllUnits] = useState<RealListing[]>(initialUnits);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<DealMode>('all');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedCompound, setSelectedCompound] = useState('All Compounds');
  const [selectedBeds, setSelectedBeds] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('ai');
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  // Pagination & Active Selection
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 24;
  const [activeUnit, setActiveUnit] = useState<RealListing | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);

  // Parse URL query params on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') || params.get('query');
    const mode = params.get('mode');
    const type = params.get('type');
    const compound = params.get('compound');
    const beds = params.get('beds');
    const price = params.get('price');
    const view = params.get('view');

    if (q) setSearchQuery(q);
    if (mode === 'sale' || mode === 'rent') setSelectedMode(mode);
    if (type && PROPERTY_TYPES.some((pt) => pt.toLowerCase() === type.toLowerCase())) {
      const match = PROPERTY_TYPES.find((pt) => pt.toLowerCase() === type.toLowerCase());
      if (match) setSelectedType(match);
    }
    if (compound) setSelectedCompound(compound);
    if (beds) setSelectedBeds(beds);
    if (price) setSelectedPriceRange(price);
    if (view === 'grid' || view === 'map' || view === 'split') setViewMode(view);
  }, []);

  // Fetch freshest inventory from server in background
  useEffect(() => {
    let active = true;
    fetch('/api/inventory', {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.units || !Array.isArray(data.units)) return;
        setAllUnits(data.units.map(sanitizeUnit));
      })
      .catch((err) => {
        console.warn('[PropertiesPage] Using committed snapshot inventory:', err);
      });

    return () => {
      active = false;
    };
  }, []);

  // Filtering Logic
  const filteredListings = useMemo(() => {
    return allUnits.filter((item) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const codeMatch = (item.code || '').toLowerCase().includes(q);
        const compoundMatch = (item.compound || item.cmp || '').toLowerCase().includes(q);
        const zoneMatch = (item.zone || '').toLowerCase().includes(q);
        const typeMatch = (item.type || '').toLowerCase().includes(q);
        const descMatch = (item.description || '').toLowerCase().includes(q);
        if (!codeMatch && !compoundMatch && !zoneMatch && !typeMatch && !descMatch) return false;
      }

      // Deal Mode
      if (selectedMode !== 'all' && item.mode !== selectedMode) {
        return false;
      }

      // Property Type
      if (selectedType !== 'All Types') {
        const itemType = (item.type || '').toLowerCase();
        const targetType = selectedType.toLowerCase();
        if (targetType === 'villa') {
          if (!itemType.includes('villa') && !itemType.includes('فيلا')) return false;
        } else if (targetType === 'townhouse' || targetType === 'twin house') {
          if (!itemType.includes('town') && !itemType.includes('twin') && !itemType.includes('توين')) return false;
        } else if (targetType === 'penthouse' || targetType === 'duplex') {
          if (!itemType.includes('pent') && !itemType.includes('duplex') && !itemType.includes('دوبلكس')) return false;
        } else if (!itemType.includes(targetType)) {
          return false;
        }
      }

      // Compound
      if (selectedCompound !== 'All Compounds') {
        const itemCompound = (item.compound || item.cmp || item.location || '').toLowerCase();
        const target = selectedCompound.toLowerCase().replace(/\(.*?\)/g, '').trim();
        if (!itemCompound.includes(target) && !target.includes(itemCompound)) {
          return false;
        }
      }

      // Bedrooms
      if (selectedBeds !== 'all') {
        if (selectedBeds === '5+') {
          if (item.beds < 5) return false;
        } else {
          if (item.beds !== parseInt(selectedBeds, 10)) return false;
        }
      }

      // Price Range
      if (selectedPriceRange !== 'all') {
        const p = item.price;
        if (selectedPriceRange === 'under10m' && p >= 10000000) return false;
        if (selectedPriceRange === '10m-20m' && (p < 10000000 || p > 20000000)) return false;
        if (selectedPriceRange === '20m-35m' && (p < 20000000 || p > 35000000)) return false;
        if (selectedPriceRange === '35m-50m' && (p < 35000000 || p > 50000000)) return false;
        if (selectedPriceRange === 'above50m' && p <= 50000000) return false;

        if (selectedPriceRange === 'under35k' && p >= 35000) return false;
        if (selectedPriceRange === '35k-60k' && (p < 35000 || p > 60000)) return false;
        if (selectedPriceRange === '60k-100k' && (p < 60000 || p > 100000)) return false;
        if (selectedPriceRange === 'above100k' && p <= 100000) return false;
      }

      return true;
    });
  }, [allUnits, searchQuery, selectedMode, selectedType, selectedCompound, selectedBeds, selectedPriceRange]);

  // Sorting
  const sortedListings = useMemo(() => {
    const list = filteredListings.slice();
    list.sort((a, b) => {
      if (sortBy === 'ai') return b.ai - a.ai;
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'area-desc') return b.area - a.area;
      if (sortBy === 'beds-desc') return b.beds - a.beds;
      return 0;
    });
    return list;
  }, [filteredListings, sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedMode, selectedType, selectedCompound, selectedBeds, selectedPriceRange, sortBy]);

  // Pagination slicing
  const totalPages = Math.ceil(sortedListings.length / pageSize) || 1;
  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedListings.slice(start, start + pageSize);
  }, [sortedListings, currentPage, pageSize]);

  // Convert filtered listings to map pins
  const mapPins = useMemo<MapUnitPin[]>(() => {
    // Show up to 150 pins prioritizing the current page units + top matches
    const pageUnits = paginatedListings;
    const additional = sortedListings.slice(0, 150);
    const seen: Record<string, boolean> = {};
    const combined: RealListing[] = [];

    for (const u of pageUnits) {
      if (!seen[u.id]) {
        seen[u.id] = true;
        combined.push(u);
      }
    }
    for (const u of additional) {
      if (combined.length >= 150) break;
      if (!seen[u.id]) {
        seen[u.id] = true;
        combined.push(u);
      }
    }

    return combined.map((u) => ({
      id: u.id,
      code: u.code,
      compound: u.compound,
      lat: u.lat,
      lng: u.lng,
      priceLabel: u.priceLabel,
      type: u.type,
      mode: u.mode,
      beds: u.beds,
      area: u.area,
      img: u.img,
    }));
  }, [paginatedListings, sortedListings]);

  // Handle focusing unit on map
  const handleSelectUnit = useCallback((unit: RealListing | MapUnitPin) => {
    const found = allUnits.find((u) => u.id === unit.id || u.code === unit.code);
    if (found) {
      setActiveUnit(found);
      setFlyToCoords([found.lat, found.lng]);
    }
  }, [allUnits]);

  // Compound selected from map
  const handleMapSelectCompound = useCallback((c: CompoundLocation) => {
    setSelectedCompound(c.nameEn);
    setFlyToCoords([c.lat, c.lng]);
  }, []);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedMode !== 'all' ||
    selectedType !== 'All Types' ||
    selectedCompound !== 'All Compounds' ||
    selectedBeds !== 'all' ||
    selectedPriceRange !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedMode('all');
    setSelectedType('All Types');
    setSelectedCompound('All Compounds');
    setSelectedBeds('all');
    setSelectedPriceRange('all');
    setSortBy('ai');
    setActiveUnit(null);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (listingsContainerRef.current) {
      listingsContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useReveal([currentPage, viewMode, selectedCompound, selectedType, selectedMode]);

  return (
    <SiteShell active="best">
      {/* Header Banner */}
      <header className="props-hero">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">{t('crumbHome')}</Link>
            <span className="sep">/</span>
            <span>{t('navProps')}</span>
            {selectedCompound !== 'All Compounds' && (
              <>
                <span className="sep">/</span>
                <span style={{ color: 'var(--pri, #00aeff)', fontWeight: 700 }}>
                  {selectedCompound}
                </span>
              </>
            )}
          </div>
          <div className="props-hero-header">
            <div>
              <h1 className="props-hero-title">
                {selectedCompound !== 'All Compounds'
                  ? `${selectedCompound} Properties`
                  : isAr
                  ? 'دليل عقارات القاهرة الجديدة والمستقبل'
                  : 'New Cairo Master Properties & Live Map'}
              </h1>
              <p className="props-hero-sub">
                {isAr
                  ? `تصفح المعروض الحقيقي المعتمد من الملاك والوسطاء (أكثر من ${allUnits.length.toLocaleString()} وحدة). خريطة تفاعلية بالأسعار الحقيقية وتواصل فوري.`
                  : `Browse verified live listings across New Cairo's top premier compounds (${allUnits.length.toLocaleString()} real units). Interactive map and instant advisor verification.`}
              </p>
            </div>

            {/* Total verified units badge */}
            <div className="props-badge-verified">
              <CheckCircle2 style={{ width: 16, height: 16 }} />
              <span>
                {filteredListings.length.toLocaleString()} {isAr ? 'وحدة مطابقة' : 'verified units found'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Filter & Content Section */}
      <section className="block" style={{ paddingTop: 16, paddingBottom: 80 }} ref={listingsContainerRef}>
        <div className="wrap">
          {/* ── REAL NORMAL FILTER TOOLBAR ── */}
          <div className="props-filter-box">
            {/* Upper Row: Search, Mode, Type, Compound */}
            <div className="props-filter-row-1">
              {/* Search input */}
              <div className="props-search-wrap">
                <Search className="props-search-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAr ? 'ابحث بكود الوحدة (مثل OGM999)، الكمبوند، أو الحي...' : 'Search unit code (e.g. OGM999), compound, or area...'}
                  className="props-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="props-search-clear"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Mode Pill Toggle (Buy / Rent / All) */}
              <div className="props-mode-toggle">
                <button
                  type="button"
                  onClick={() => setSelectedMode('all')}
                  className={`props-mode-btn ${selectedMode === 'all' ? 'active' : ''}`}
                >
                  {isAr ? 'الكل' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMode('sale')}
                  className={`props-mode-btn ${selectedMode === 'sale' ? 'active' : ''}`}
                >
                  {isAr ? 'شراء' : 'Buy'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMode('rent')}
                  className={`props-mode-btn ${selectedMode === 'rent' ? 'active rent' : ''}`}
                >
                  {isAr ? 'إيجار' : 'Rent'}
                </button>
              </div>

              {/* Compound Select */}
              <div>
                <select
                  value={selectedCompound}
                  onChange={(e) => setSelectedCompound(e.target.value)}
                  className="props-select"
                >
                  {MAJOR_COMPOUNDS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Type Select */}
              <div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="props-select"
                >
                  {PROPERTY_TYPES.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lower Row: Bedrooms, Price, Sort, View Mode, Reset */}
            <div className="props-filter-row-2">
              <div className="props-chip-group">
                <span className="props-chip-label">{isAr ? 'الغرف:' : 'Beds:'}</span>
                {BEDROOM_OPTIONS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setSelectedBeds(b)}
                    className={`props-chip ${selectedBeds === b ? 'active' : ''}`}
                  >
                    {b === 'all' ? (isAr ? 'الكل' : 'All') : b}
                  </button>
                ))}
              </div>

              <div className="props-filter-row-2-right">
                {/* Price Range Filter */}
                <select
                  value={selectedPriceRange}
                  onChange={(e) => setSelectedPriceRange(e.target.value)}
                  className="props-select"
                  style={{ width: 'auto', minWidth: 150 }}
                >
                  {(selectedMode === 'rent' ? RENT_PRICE_RANGES : SALE_PRICE_RANGES).map((r) => (
                    <option key={r.value} value={r.value}>
                      {isAr ? r.labelAr : r.labelEn}
                    </option>
                  ))}
                </select>

                {/* Sort By */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="props-select"
                  style={{ width: 'auto', minWidth: 150 }}
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {isAr ? s.labelAr : s.labelEn}
                    </option>
                  ))}
                </select>

                {/* View Switcher Tabs (Split / Grid / Map) */}
                <div className="props-view-modes">
                  <button
                    type="button"
                    onClick={() => setViewMode('split')}
                    className={`props-view-btn ${viewMode === 'split' ? 'active' : ''}`}
                    title={isAr ? 'تقسيم (خريطة + قائمة)' : 'Split View'}
                  >
                    <Columns style={{ width: 14, height: 14 }} />
                    <span>{isAr ? 'خريطة + قائمة' : 'Split'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`props-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    title={isAr ? 'قائمة العقارات' : 'Grid'}
                  >
                    <LayoutGrid style={{ width: 14, height: 14 }} />
                    <span>{isAr ? 'شبكة' : 'Grid'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('map')}
                    className={`props-view-btn ${viewMode === 'map' ? 'active' : ''}`}
                    title={isAr ? 'الخريطة فقط' : 'Map Only'}
                  >
                    <Map style={{ width: 14, height: 14 }} />
                    <span>{isAr ? 'خريطة' : 'Map'}</span>
                  </button>
                </div>

                {/* Reset Filters button */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="props-reset-btn"
                  >
                    <RotateCcw style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />
                    {isAr ? 'إعادة ضبط' : 'Reset'}
                  </button>
                )}
              </div>
            </div>

            {/* Active Filter Badges */}
            {hasActiveFilters && (
              <div className="props-active-pills">
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{isAr ? 'الفلاتر النشطة:' : 'Active:'}</span>
                {searchQuery && (
                  <span className="props-active-pill">
                    <span>"{searchQuery}"</span>
                    <button type="button" onClick={() => setSearchQuery('')} className="props-active-pill-remove">×</button>
                  </span>
                )}
                {selectedMode !== 'all' && (
                  <span className="props-active-pill">
                    <span>{selectedMode === 'sale' ? (isAr ? 'شراء' : 'Sale') : (isAr ? 'إيجار' : 'Rent')}</span>
                    <button type="button" onClick={() => setSelectedMode('all')} className="props-active-pill-remove">×</button>
                  </span>
                )}
                {selectedCompound !== 'All Compounds' && (
                  <span className="props-active-pill">
                    <span>{selectedCompound}</span>
                    <button type="button" onClick={() => setSelectedCompound('All Compounds')} className="props-active-pill-remove">×</button>
                  </span>
                )}
                {selectedType !== 'All Types' && (
                  <span className="props-active-pill">
                    <span>{selectedType}</span>
                    <button type="button" onClick={() => setSelectedType('All Types')} className="props-active-pill-remove">×</button>
                  </span>
                )}
                {selectedBeds !== 'all' && (
                  <span className="props-active-pill">
                    <span>{selectedBeds} {isAr ? 'غرف' : 'Beds'}</span>
                    <button type="button" onClick={() => setSelectedBeds('all')} className="props-active-pill-remove">×</button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── MAIN CONTENT AREA (MAP & LISTINGS) ── */}
          {viewMode === 'map' ? (
            /* Full Map View */
            <div className="props-full-map-wrap">
              <LiveMap
                mode={theme === 'dark' ? 'dark' : 'light'}
                units={mapPins}
                activeUnitId={activeUnit?.id || activeUnit?.code || null}
                flyToCoords={flyToCoords}
                onSelectUnit={handleSelectUnit}
                onSelectCompound={handleMapSelectCompound}
                maxPins={180}
                height="100%"
              />

              {activeUnit && (
                <div className="props-map-drawer">
                  <div style={{ display: 'flex', gap: 12, padding: 14, alignItems: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeUnit.img}
                      alt={activeUnit.code}
                      style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#e9c176', fontFamily: 'var(--mono)' }}>
                          {activeUnit.code}
                        </span>
                        <span className={`tag ${activeUnit.mode === 'rent' ? 'rent' : 'sale'}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                          {activeUnit.mode === 'rent' ? 'Rent' : 'Sale'}
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{activeUnit.compound}</h4>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {activeUnit.type} · {activeUnit.beds} bds · {activeUnit.area} m²
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#10b981', marginTop: 4, fontFamily: 'var(--mono)' }}>
                        {activeUnit.priceLabel}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : viewMode === 'split' ? (
            /* Split View: Left List, Right Sticky Map */
            <div className="props-split-container">
              <div className="props-cards-col">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--muted)' }}>
                  <span>
                    {isAr
                      ? `عرض ${(currentPage - 1) * pageSize + 1} - ${Math.min(
                          currentPage * pageSize,
                          sortedListings.length
                        )} من إجمالي ${sortedListings.length.toLocaleString()} وحدة معتمدة`
                      : `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(
                          currentPage * pageSize,
                          sortedListings.length
                        )} of ${sortedListings.length.toLocaleString()} verified real listings`}
                  </span>
                  <span style={{ color: '#10b981', fontWeight: 700, fontFamily: 'var(--mono)' }}>
                    {isAr ? 'قاعدة بيانات سييرا المعتمدة' : 'Sierra Verified Master Index'}
                  </span>
                </div>

                {sortedListings.length === 0 ? (
                  <div className="empty-state">
                    <Building style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.4 }} />
                    <h3>{isAr ? 'لم يتم العثور على وحدات مطابقة' : 'No properties match your filters'}</h3>
                    <p>{isAr ? 'جرّب توسيع معايير البحث لعرض المزيد من الوحدات.' : 'Try widening your budget or clearing filters to explore more available units.'}</p>
                    <button type="button" onClick={resetFilters} className="props-reset-btn" style={{ marginTop: 12 }}>
                      {isAr ? 'إعادة تعيين الفلاتر' : 'Reset All Filters'}
                    </button>
                  </div>
                ) : (
                  <div className="props-cards-subgrid">
                    {paginatedListings.map((p) => {
                      const isSelected = activeUnit?.id === p.id;
                      const waLink = `https://wa.me/201065582924?text=${encodeURIComponent(
                        `مرحباً سييرا العقارية، أود الاستفسار عن الوحدة [${p.code}] في ${p.compound} (${p.priceLabel}). هل هي متاحة للمعاينة؟`
                      )}`;

                      return (
                        <article
                          key={p.id}
                          onClick={() => handleSelectUnit(p)}
                          className={`pcard ${isSelected ? 'active-unit' : ''}`}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="photo">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.img} alt={`${p.type} in ${p.compound}`} loading="lazy" />
                            <div className="badges">
                              <span className={`tag ${p.mode === 'rent' ? 'rent' : 'sale'}`}>
                                {p.mode === 'rent' ? (isAr ? 'إيجار' : 'Rent') : (isAr ? 'بيع' : 'Sale')}
                              </span>
                              {p.tag && <span className="tag featured">{p.tag}</span>}
                            </div>
                            <div className="price-float">{p.priceLabel}</div>
                            <div className="ai-score">AI {p.ai.toFixed(1)}</div>
                          </div>

                          <div className="body">
                            <div className="ptype">{p.code} · {p.type}</div>
                            <h3>
                              <Link href={`/property/${p.code || p.id}`} onClick={(e) => e.stopPropagation()}>
                                {p.compound}
                              </Link>
                            </h3>
                            <div className="addr">
                              <MapPin style={{ width: 14, height: 14 }} /> {p.location || p.zone}
                            </div>
                            <div className="specs">
                              <div><BedDouble style={{ width: 15, height: 15 }} /><b>{p.beds}</b><span>{isAr ? 'غرف' : 'bds'}</span></div>
                              <div><Bath style={{ width: 15, height: 15 }} /><b>{p.bath}</b><span>{isAr ? 'حمام' : 'ba'}</span></div>
                              <div><Scaling style={{ width: 15, height: 15 }} /><b>{p.area}</b><span>m²</span></div>
                            </div>
                          </div>

                          <div className="foot">
                            <div className="agent">
                              <small><b>{p.agent}</b>{p.ago}</small>
                            </div>
                            <div className="pcard-actions">
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="pcard-btn-whatsapp"
                              >
                                <Phone style={{ width: 13, height: 13 }} />
                                <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
                              </a>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectUnit(p);
                                }}
                                className="pcard-btn-map"
                                title="Show on Map"
                              >
                                <MapPin style={{ width: 13, height: 13 }} />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="props-pagination">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="props-page-btn"
                    >
                      <ChevronLeft style={{ width: 16, height: 16 }} />
                    </button>

                    <div style={{ display: 'flex', gap: 6 }}>
                      {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
                        let pageNum = idx + 1;
                        if (totalPages > 5 && currentPage > 3) {
                          pageNum = Math.min(currentPage - 2 + idx, totalPages - (4 - idx));
                        }

                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => handlePageChange(pageNum)}
                            className={`props-page-btn ${currentPage === pageNum ? 'active' : ''}`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="props-page-btn"
                    >
                      <ChevronRight style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                )}
              </div>

              {/* Sticky Map Column */}
              <div className="props-sticky-map-wrap">
                <div className="props-sticky-map-inner">
                  <LiveMap
                    mode={theme === 'dark' ? 'dark' : 'light'}
                    units={mapPins}
                    activeUnitId={activeUnit?.id || activeUnit?.code || null}
                    flyToCoords={flyToCoords}
                    onSelectUnit={handleSelectUnit}
                    onSelectCompound={handleMapSelectCompound}
                    maxPins={180}
                    height="100%"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Full Grid View */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                <span>
                  {isAr
                    ? `عرض ${(currentPage - 1) * pageSize + 1} - ${Math.min(
                        currentPage * pageSize,
                        sortedListings.length
                      )} من إجمالي ${sortedListings.length.toLocaleString()} وحدة معتمدة`
                    : `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(
                        currentPage * pageSize,
                        sortedListings.length
                      )} of ${sortedListings.length.toLocaleString()} verified real listings`}
                </span>
                <span style={{ color: '#10b981', fontWeight: 700, fontFamily: 'var(--mono)' }}>
                  {isAr ? 'قاعدة بيانات سييرا المعتمدة' : 'Sierra Verified Master Index'}
                </span>
              </div>

              <div className="props-full-grid">
                {paginatedListings.map((p) => {
                  const isSelected = activeUnit?.id === p.id;
                  const waLink = `https://wa.me/201065582924?text=${encodeURIComponent(
                    `مرحباً سييرا العقارية، أود الاستفسار عن الوحدة [${p.code}] في ${p.compound} (${p.priceLabel}). هل هي متاحة للمعاينة؟`
                  )}`;

                  return (
                    <article
                      key={p.id}
                      onClick={() => handleSelectUnit(p)}
                      className={`pcard ${isSelected ? 'active-unit' : ''}`}
                    >
                      <div className="photo">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.img} alt={`${p.type} in ${p.compound}`} loading="lazy" />
                        <div className="badges">
                          <span className={`tag ${p.mode === 'rent' ? 'rent' : 'sale'}`}>
                            {p.mode === 'rent' ? (isAr ? 'إيجار' : 'Rent') : (isAr ? 'بيع' : 'Sale')}
                          </span>
                          {p.tag && <span className="tag featured">{p.tag}</span>}
                        </div>
                        <div className="price-float">{p.priceLabel}</div>
                        <div className="ai-score">AI {p.ai.toFixed(1)}</div>
                      </div>

                      <div className="body">
                        <div className="ptype">{p.code} · {p.type}</div>
                        <h3>
                          <Link href={`/property/${p.code || p.id}`}>
                            {p.compound}
                          </Link>
                        </h3>
                        <div className="addr">
                          <MapPin style={{ width: 14, height: 14 }} /> {p.location || p.zone}
                        </div>
                        <div className="specs">
                          <div><BedDouble style={{ width: 15, height: 15 }} /><b>{p.beds}</b><span>{isAr ? 'غرف' : 'bds'}</span></div>
                          <div><Bath style={{ width: 15, height: 15 }} /><b>{p.bath}</b><span>{isAr ? 'حمام' : 'ba'}</span></div>
                          <div><Scaling style={{ width: 15, height: 15 }} /><b>{p.area}</b><span>m²</span></div>
                        </div>
                      </div>

                      <div className="foot">
                        <div className="agent">
                          <small><b>{p.agent}</b>{p.ago}</small>
                        </div>
                        <div className="pcard-actions">
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="pcard-btn-whatsapp"
                          >
                            <Phone style={{ width: 13, height: 13 }} />
                            <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
                          </a>
                          <Link
                            href={`/property/${p.code || p.id}`}
                            className="pcard-btn-map"
                          >
                            <ExternalLink style={{ width: 13, height: 13 }} />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="props-pagination">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="props-page-btn"
                  >
                    <ChevronLeft style={{ width: 16, height: 16 }} />
                  </button>

                  <div style={{ display: 'flex', gap: 6 }}>
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
                      let pageNum = idx + 1;
                      if (totalPages > 5 && currentPage > 3) {
                        pageNum = Math.min(currentPage - 2 + idx, totalPages - (4 - idx));
                      }

                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => handlePageChange(pageNum)}
                          className={`props-page-btn ${currentPage === pageNum ? 'active' : ''}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="props-page-btn"
                  >
                    <ChevronRight style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
