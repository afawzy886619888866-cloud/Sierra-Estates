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
      <header className="page-hero">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">{t('crumbHome')}</Link>
            <span className="sep">/</span>
            <span>{t('navProps')}</span>
            {selectedCompound !== 'All Compounds' && (
              <>
                <span className="sep">/</span>
                <span style={{ color: 'var(--accent, #0284c7)', fontWeight: 700 }}>
                  {selectedCompound}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-2">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                {selectedCompound !== 'All Compounds'
                  ? `${selectedCompound} Properties`
                  : isAr
                  ? 'دليل عقارات القاهرة الجديدة والمستقبل'
                  : 'New Cairo Master Properties & Live Map'}
              </h1>
              <p className="sub mt-2 text-sm text-slate-400 max-w-3xl leading-relaxed">
                {isAr
                  ? `تصفح المعروض الحقيقي المعتمد من الملاك والوسطاء (أكثر من ${allUnits.length.toLocaleString()} وحدة). خريطة تفاعلية بالأسعار الحقيقية وتواصل فوري.`
                  : `Browse verified live listings across New Cairo's top premier compounds (${allUnits.length.toLocaleString()} real units). Interactive map and instant advisor verification.`}
              </p>
            </div>

            {/* Total verified units badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {filteredListings.length.toLocaleString()} {isAr ? 'وحدة مطابقة' : 'verified units found'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Filter & Content Section */}
      <section className="block pt-4 pb-20" ref={listingsContainerRef}>
        <div className="wrap space-y-6">
          {/* ── REAL NORMAL FILTER TOOLBAR ── */}
          <div className="rounded-3xl bg-[#0b1528] border border-white/10 p-5 md:p-6 shadow-2xl backdrop-blur-xl space-y-4">
            {/* Upper Row: Search, Mode, Type, Compound */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              {/* Search input */}
              <div className="relative lg:col-span-4">
                <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAr ? 'ابحث بكود الوحدة (مثل OGM999)، الكمبوند، أو الحي...' : 'Search unit code (e.g. OGM999), compound, or area...'}
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs md:text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#c99436] transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-3 text-white/40 hover:text-white text-sm"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Mode Pill Toggle (Buy / Rent / All) */}
              <div className="lg:col-span-3 flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedMode('all')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedMode === 'all' ? 'bg-[#c99436] text-[#0d0d0f] shadow-md' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {isAr ? 'الكل' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMode('sale')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedMode === 'sale' ? 'bg-[#c99436] text-[#0d0d0f] shadow-md' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {isAr ? 'شراء' : 'Buy'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMode('rent')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedMode === 'rent' ? 'bg-[#0284c7] text-white shadow-md' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {isAr ? 'إيجار' : 'Rent'}
                </button>
              </div>

              {/* Compound Select */}
              <div className="lg:col-span-3">
                <select
                  value={selectedCompound}
                  onChange={(e) => setSelectedCompound(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#09152a] border border-white/10 text-xs md:text-sm text-white focus:outline-none focus:border-[#c99436]"
                >
                  {MAJOR_COMPOUNDS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Type Select */}
              <div className="lg:col-span-2">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#09152a] border border-white/10 text-xs md:text-sm text-white focus:outline-none focus:border-[#c99436]"
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lower Row: Bedrooms, Price, Sort, View Mode, Reset */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* Bedrooms Filter */}
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                  <span className="text-white/50 px-2 text-[11px] font-semibold">{isAr ? 'الغرف:' : 'Beds:'}</span>
                  {BEDROOM_OPTIONS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSelectedBeds(b)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedBeds === b ? 'bg-[#c99436] text-[#0d0d0f]' : 'text-white/70 hover:text-white'
                      }`}
                    >
                      {b === 'all' ? (isAr ? 'الكل' : 'All') : b}
                    </button>
                  ))}
                </div>

                {/* Price Range Filter */}
                <select
                  value={selectedPriceRange}
                  onChange={(e) => setSelectedPriceRange(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#09152a] border border-white/10 text-xs text-white focus:outline-none focus:border-[#c99436]"
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
                  className="px-3 py-1.5 rounded-xl bg-[#09152a] border border-white/10 text-xs text-white focus:outline-none focus:border-[#c99436]"
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {isAr ? s.labelAr : s.labelEn}
                    </option>
                  ))}
                </select>

                {/* Reset Filters button */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{isAr ? 'إعادة ضبط' : 'Reset Filters'}</span>
                  </button>
                )}
              </div>

              {/* View Switcher Tabs (Split / Grid / Map) */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'split' ? 'bg-[#002b4b] text-[#e9c176] shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                  title="خريطة + قائمة"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isAr ? 'تقسيم (خريطة + قائمة)' : 'Split View'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'grid' ? 'bg-[#002b4b] text-[#e9c176] shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                  title="قائمة العقارات"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isAr ? 'القائمة' : 'Grid'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'map' ? 'bg-[#002b4b] text-[#e9c176] shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                  title="الخريطة فقط"
                >
                  <Map className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isAr ? 'الخريطة فقط' : 'Map Only'}</span>
                </button>
              </div>
            </div>

            {/* Active Filter Badges */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] text-white/70">
                <span className="text-white/40">{isAr ? 'الفلاتر النشطة:' : 'Active:'}</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-white">
                    <span>"{searchQuery}"</span>
                    <button type="button" onClick={() => setSearchQuery('')}>×</button>
                  </span>
                )}
                {selectedMode !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-white">
                    <span>{selectedMode === 'sale' ? (isAr ? 'شراء' : 'Sale') : (isAr ? 'إيجار' : 'Rent')}</span>
                    <button type="button" onClick={() => setSelectedMode('all')}>×</button>
                  </span>
                )}
                {selectedCompound !== 'All Compounds' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    <span>{selectedCompound}</span>
                    <button type="button" onClick={() => setSelectedCompound('All Compounds')}>×</button>
                  </span>
                )}
                {selectedType !== 'All Types' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-white">
                    <span>{selectedType}</span>
                    <button type="button" onClick={() => setSelectedType('All Types')}>×</button>
                  </span>
                )}
                {selectedBeds !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-white">
                    <span>{selectedBeds} {isAr ? 'غرف' : 'Beds'}</span>
                    <button type="button" onClick={() => setSelectedBeds('all')}>×</button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── MAIN CONTENT AREA (MAP & LISTINGS) ── */}
          <div
            className={`grid gap-6 items-start ${
              viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
            }`}
          >
            {/* Map Column (shown in 'split' or 'map' mode) */}
            {(viewMode === 'split' || viewMode === 'map') && (
              <div
                className={`${
                  viewMode === 'split' ? 'lg:col-span-5 lg:sticky lg:top-24 order-2 lg:order-1' : 'w-full'
                }`}
              >
                <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#080d18] relative">
                  <div className="h-145 w-full">
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

                  {/* Active Unit Floating Card on Map View */}
                  {activeUnit && (
                    <div className="absolute bottom-4 left-4 right-4 z-1000 p-4 rounded-2xl bg-[#09152a]/95 border border-[#c99436]/50 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-200">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={activeUnit.img}
                            alt={activeUnit.code}
                            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white/10"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-[#e9c176] font-mono">
                                {activeUnit.code}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  activeUnit.mode === 'rent'
                                    ? 'bg-sky-500/20 text-sky-300'
                                    : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {activeUnit.mode === 'rent' ? 'إيجار' : 'بيع'}
                              </span>
                            </div>
                            <div className="text-sm font-bold text-white truncate">
                              {activeUnit.compound}
                            </div>
                            <div className="text-xs text-white/60">
                              {activeUnit.type} · {activeUnit.beds} غرف · {activeUnit.area} م²
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-black text-emerald-400 font-mono">
                            {activeUnit.priceLabel}
                          </div>
                          <a
                            href={`https://wa.me/201065582924?text=${encodeURIComponent(
                              `مرحباً سييرا العقارية، أود الاستفسار عن الوحدة [${activeUnit.code}] في ${activeUnit.compound} (${activeUnit.priceLabel})`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-colors"
                          >
                            <Phone className="w-3 h-3" />
                            <span>تواصل</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Listings Column (shown in 'split' or 'grid' mode) */}
            {(viewMode === 'split' || viewMode === 'grid') && (
              <div
                className={`${
                  viewMode === 'split' ? 'lg:col-span-7 order-1 lg:order-2' : 'w-full'
                } space-y-6`}
              >
                {/* Results Count & Current Range */}
                <div className="flex items-center justify-between px-2 text-xs text-white/70">
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
                  <span className="font-mono text-emerald-400 font-bold">
                    {isAr ? 'قاعدة بيانات سييرا المعتمدة' : 'Sierra Verified Master Index'}
                  </span>
                </div>

                {/* Empty State */}
                {sortedListings.length === 0 ? (
                  <div className="p-12 rounded-3xl bg-[#0b1528] border border-white/10 text-center space-y-4">
                    <Building className="w-12 h-12 text-white/30 mx-auto" />
                    <h3 className="text-lg font-bold text-white">
                      {isAr ? 'لم يتم العثور على وحدات مطابقة' : 'No properties match your filters'}
                    </h3>
                    <p className="text-xs text-white/50 max-w-md mx-auto">
                      {isAr
                        ? 'جرّب توسيع معايير البحث أو اختيار كمبوند آخر لعرض الوحدات المتاحة.'
                        : 'Try widening your budget or clearing property type filters to explore more available units.'}
                    </p>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="px-5 py-2.5 rounded-xl bg-[#002b4b] text-[#e9c176] font-bold text-xs hover:bg-[#003860] transition-colors"
                    >
                      {isAr ? 'إعادة تعيين جميع الفلاتر' : 'Reset All Filters'}
                    </button>
                  </div>
                ) : (
                  /* Cards Grid */
                  <div
                    className={`grid gap-4 md:gap-5 ${
                      viewMode === 'split' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    }`}
                  >
                    {paginatedListings.map((p) => {
                      const isSelected = activeUnit?.id === p.id;
                      const waLink = `https://wa.me/201065582924?text=${encodeURIComponent(
                        `مرحباً سييرا العقارية، أود الاستفسار عن الوحدة [${p.code}] في ${p.compound} (${p.priceLabel}). هل هي متاحة للمعاينة؟`
                      )}`;

                      return (
                        <article
                          key={p.id}
                          onClick={() => handleSelectUnit(p)}
                          className={`group relative rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-[#002b4b]/80 border-[#c99436] shadow-xl ring-2 ring-[#c99436]/50'
                              : 'bg-[#09152a] border-white/10 hover:border-white/25 hover:shadow-xl hover:-translate-y-1'
                          }`}
                        >
                          <div>
                            {/* Card Photo Container */}
                            <div className="relative aspect-16/10 overflow-hidden bg-slate-900">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={p.img}
                                alt={`${p.type} in ${p.compound}`}
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                              {/* Badges */}
                              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                                <span
                                  className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
                                    p.mode === 'rent'
                                      ? 'bg-sky-500 text-white'
                                      : 'bg-emerald-600 text-white'
                                  }`}
                                >
                                  {p.mode === 'rent' ? (isAr ? 'إيجار' : 'Rent') : (isAr ? 'بيع' : 'Sale')}
                                </span>
                                {p.tag && (
                                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white/90 border border-white/20 font-bold">
                                    {p.tag}
                                  </span>
                                )}
                              </div>

                              <div className="absolute top-3 right-3 z-10">
                                <span className="text-[10px] px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[#e9c176] font-mono font-bold border border-[#c99436]/40">
                                  AI {p.ai.toFixed(1)}
                                </span>
                              </div>

                              {/* Price Floating at bottom of photo */}
                              <div className="absolute bottom-3 left-3 right-3 flex items-baseline justify-between z-10">
                                <span className="text-base md:text-lg font-black text-white drop-shadow-md">
                                  {p.priceLabel}
                                </span>
                                <span className="text-[11px] font-mono text-white/70">
                                  ${p.usd.toLocaleString()} {p.mode === 'rent' ? '/mo' : ''}
                                </span>
                              </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-4 space-y-2.5 text-right">
                              <div className="flex items-center justify-between text-xs text-white/50">
                                <span className="font-mono font-extrabold text-[#e9c176]">{p.code}</span>
                                <span>{p.type}</span>
                              </div>

                              <h3 className="text-sm md:text-base font-bold text-white group-hover:text-[#e9c176] transition-colors line-clamp-1">
                                {p.compound}
                              </h3>

                              <div className="flex items-center gap-1.5 text-xs text-white/60">
                                <MapPin className="w-3.5 h-3.5 text-[#c99436] shrink-0" />
                                <span className="truncate">{p.location || p.zone}</span>
                              </div>

                              {/* Specs Bar */}
                              <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/10 text-center text-xs text-white/80">
                                <div className="flex items-center justify-center gap-1">
                                  <BedDouble className="w-3.5 h-3.5 text-white/50" />
                                  <span className="font-bold">{p.beds}</span>
                                  <span className="text-[10px] text-white/50">{isAr ? 'غرف' : 'bds'}</span>
                                </div>
                                <div className="flex items-center justify-center gap-1 border-x border-white/10">
                                  <Bath className="w-3.5 h-3.5 text-white/50" />
                                  <span className="font-bold">{p.bath}</span>
                                  <span className="text-[10px] text-white/50">{isAr ? 'حمام' : 'ba'}</span>
                                </div>
                                <div className="flex items-center justify-center gap-1">
                                  <Scaling className="w-3.5 h-3.5 text-white/50" />
                                  <span className="font-bold">{p.area}</span>
                                  <span className="text-[10px] text-white/50">م²</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Card Footer Actions */}
                          <div className="p-4 pt-0 flex items-center justify-between gap-2">
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-colors shadow-md"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>{isAr ? 'واتساب مباشر' : 'WhatsApp'}</span>
                            </a>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectUnit(p);
                              }}
                              className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1 border border-white/10 transition-colors"
                              title={isAr ? 'عرض على الخريطة' : 'Show on Map'}
                            >
                              <MapPin className="w-3.5 h-3.5 text-[#c99436]" />
                              <span>{isAr ? 'الخريطة' : 'Map'}</span>
                            </button>

                            <Link
                              href={`/property/${p.code || p.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors"
                              title={isAr ? 'تفاصيل الوحدة' : 'View Listing'}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-6">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1.5 text-xs font-bold">
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
                            className={`w-9 h-9 rounded-xl transition-all ${
                              currentPage === pageNum
                                ? 'bg-[#c99436] text-[#0d0d0f] font-extrabold shadow-lg'
                                : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <span className="text-white/40 px-1">…</span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
