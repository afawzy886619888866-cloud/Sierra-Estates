'use client';

import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  CheckSquare,
  Square,
  Send,
  Trash2,
  MapPin,
  Building,
  Home,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Phone,
  Maximize2,
  MessageCircle
} from 'lucide-react';
import AvailabilityInquiryModal from './AvailabilityInquiryModal';
import { NEW_CAIRO_COMPOUNDS } from '@/components/Maps/compounds-data';
import type { MapUnitPin } from '@/components/Maps/LiveMap';

// Dynamic import for Leaflet map to ensure 100% SSR safety in Next.js
const LiveMap = dynamic(() => import('@/components/Maps/LiveMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[450px] rounded-2xl bg-[#080d18] border border-white/10 flex items-center justify-center text-white/50 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-[#c99436] border-t-transparent rounded-full animate-spin" />
        <span>جاري تحميل رادار الخريطة...</span>
      </div>
    </div>
  ),
});

export interface NetUnit {
  id: string;
  code: string;
  compound: string;
  location: string;
  zone: string;
  type: string;
  mode: 'rent' | 'buy' | string;
  price: number;
  priceLabel: string;
  beds: number;
  bath: number;
  area: number;
  img?: string;
  segment?: string;
  party?: string;
  whatsapp?: string;
  tag?: string;
}

const COMPOUNDS_LIST = [
  'All Compounds',
  'New Cairo',
  'Mivida',
  'Al Rehab',
  'Eastown',
  'Madinaty',
  'Hyde Park',
  'Villette',
  'Lake View Residence',
  '5th Settlement',
  'Mountain View',
  'Fifth Square',
  'Cairo Festival City',
];

const PROPERTY_TYPES = [
  'All Types',
  'Apartment',
  'Standalone Villa',
  'Townhouse',
  'Twin House',
  'Duplex',
  'Penthouse',
  'Studio',
];

export interface ListingNetMapProps {
  initialCompound?: string;
  initialMode?: 'all' | 'rent' | 'buy' | 'sale';
  initialType?: string;
  initialSegment?: string;
  initialBeds?: string;
  initialQuery?: string;
}

function ListingNetMapContent({
  initialCompound,
  initialMode,
  initialType,
  initialSegment,
  initialBeds,
  initialQuery,
}: ListingNetMapProps) {
  const searchParams = useSearchParams();
  const [allUnits, setAllUnits] = useState<NetUnit[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters with props / URL searchParams fallback
  const [query, setQuery] = useState(
    initialQuery || searchParams?.get('q') || searchParams?.get('query') || ''
  );
  const [selectedCompound, setSelectedCompound] = useState(
    initialCompound || searchParams?.get('compound') || 'All Compounds'
  );
  const [selectedType, setSelectedType] = useState(
    initialType || searchParams?.get('type') || 'All Types'
  );
  const [selectedMode, setSelectedMode] = useState<'all' | 'rent' | 'buy'>(() => {
    const m = initialMode || searchParams?.get('mode');
    if (m === 'rent') return 'rent';
    if (m === 'sale' || m === 'buy') return 'buy';
    return 'all';
  });
  const [selectedSegment, setSelectedSegment] = useState<string>(
    initialSegment || searchParams?.get('segment') || 'all'
  );
  const [selectedBeds, setSelectedBeds] = useState<string>(
    initialBeds || searchParams?.get('beds') || 'all'
  );
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>(
    searchParams?.get('price') || 'all'
  );

  // Synchronize when initial props change
  useEffect(() => {
    if (initialCompound) setSelectedCompound(initialCompound);
    if (initialMode) {
      if (initialMode === 'rent') setSelectedMode('rent');
      else if (initialMode === 'sale' || initialMode === 'buy') setSelectedMode('buy');
    }
    if (initialType) setSelectedType(initialType);
    if (initialSegment) setSelectedSegment(initialSegment);
    if (initialBeds) setSelectedBeds(initialBeds);
    if (initialQuery) setQuery(initialQuery);
  }, [initialCompound, initialMode, initialType, initialSegment, initialBeds, initialQuery]);

  // Net Selection (Max 40)
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'grid'>('split');
  const [quotaWarning, setQuotaWarning] = useState(false);

  // Fetch all inventory units
  useEffect(() => {
    let active = true;
    fetch('/api/inventory')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data && Array.isArray(data.units)) {
          setAllUnits(data.units);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('[ListingNetMap] Failed to load units:', err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Filter logic
  const filteredUnits = useMemo(() => {
    return allUnits.filter((u) => {
      // Query filter
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const codeMatch = (u.code || '').toLowerCase().includes(q);
        const compoundMatch = (u.compound || '').toLowerCase().includes(q);
        const typeMatch = (u.type || '').toLowerCase().includes(q);
        const zoneMatch = (u.zone || '').toLowerCase().includes(q);
        if (!codeMatch && !compoundMatch && !typeMatch && !zoneMatch) return false;
      }

      // Compound filter
      if (selectedCompound !== 'All Compounds') {
        const uCompound = (u.compound || '').toLowerCase();
        const target = selectedCompound.toLowerCase();
        if (!uCompound.includes(target) && !target.includes(uCompound)) return false;
      }

      // Property Type
      if (selectedType !== 'All Types') {
        if ((u.type || '').toLowerCase() !== selectedType.toLowerCase()) return false;
      }

      // Mode (Rent vs Buy)
      if (selectedMode !== 'all') {
        if ((u.mode || '').toLowerCase() !== selectedMode) return false;
      }

      // Segment
      if (selectedSegment !== 'all') {
        if (u.segment !== selectedSegment) return false;
      }

      // Bedrooms
      if (selectedBeds !== 'all') {
        const bedsNum = u.beds || 0;
        if (selectedBeds === '4+') {
          if (bedsNum < 4) return false;
        } else {
          if (bedsNum !== parseInt(selectedBeds, 10)) return false;
        }
      }

      // Price Range
      if (selectedPriceRange !== 'all') {
        const p = u.price || 0;
        if (selectedPriceRange === 'under10m' && p >= 10000000) return false;
        if (selectedPriceRange === '10m-25m' && (p < 10000000 || p > 25000000)) return false;
        if (selectedPriceRange === '25m-50m' && (p < 25000000 || p > 50000000)) return false;
        if (selectedPriceRange === 'above50m' && p <= 50000000) return false;
        if (selectedPriceRange === 'rent_under40k' && p >= 40000) return false;
        if (selectedPriceRange === 'rent_40k_100k' && (p < 40000 || p > 100000)) return false;
        if (selectedPriceRange === 'rent_above100k' && p <= 100000) return false;
      }

      return true;
    });
  }, [allUnits, query, selectedCompound, selectedType, selectedMode, selectedSegment, selectedBeds, selectedPriceRange]);

  // Handle Mark / Unmark unit with 40-unit quota constraint
  const toggleUnitSelection = useCallback((unitId: string) => {
    setSelectedUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
        setQuotaWarning(false);
      } else {
        if (next.size >= 40) {
          setQuotaWarning(true);
          return prev;
        }
        next.add(unitId);
        setQuotaWarning(false);
      }
      return next;
    });
  }, []);

  // Bulk selectors
  const selectTopN = (n: number) => {
    const toSelect = filteredUnits.slice(0, Math.min(n, 40));
    const next = new Set(selectedUnitIds);
    for (const u of toSelect) {
      if (next.size >= 40) break;
      next.add(u.id);
    }
    setSelectedUnitIds(next);
  };

  const clearSelection = () => {
    setSelectedUnitIds(new Set());
    setQuotaWarning(false);
  };

  const hasActiveFilters =
    query.trim() !== '' ||
    selectedCompound !== 'All Compounds' ||
    selectedType !== 'All Types' ||
    selectedMode !== 'all' ||
    selectedSegment !== 'all' ||
    selectedBeds !== 'all' ||
    selectedPriceRange !== 'all';

  const resetFilters = () => {
    setQuery('');
    setSelectedCompound('All Compounds');
    setSelectedType('All Types');
    setSelectedMode('all');
    setSelectedSegment('all');
    setSelectedBeds('all');
    setSelectedPriceRange('all');
  };

  const selectedUnitsList = useMemo(() => {
    const idSet = selectedUnitIds;
    return allUnits
      .filter((u) => idSet.has(u.id))
      .map((u) => ({
        id: u.id,
        code: u.code,
        compound: u.compound,
        type: u.type,
        priceLabel: u.priceLabel,
        mode: u.mode,
        img: u.img,
      }));
  }, [allUnits, selectedUnitIds]);

  const shareOnWhatsApp = useCallback(() => {
    if (selectedUnitsList.length === 0) return;
    const summaryLines = selectedUnitsList.slice(0, 15).map(
      (u, i) => `${i + 1}. [${u.code}] ${u.compound} - ${u.type} (${u.priceLabel})`
    ).join('\n');
    const msg = `مرحباً سييرا العقارية، أود الاستفسار عن توافر الوحدات التالية (${selectedUnitsList.length} وحدة):\n\n${summaryLines}${selectedUnitsList.length > 15 ? `\n... و ${selectedUnitsList.length - 15} وحدة أخرى` : ''}\n\nبرجاء موافاتي بالتفاصيل والصور المتاحة.`;
    const url = `https://wa.me/201092048333?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }, [selectedUnitsList]);

  // Compute coordinate pins for filtered units using compound registry
  const mapUnitPins = useMemo<MapUnitPin[]>(() => {
    const DEFAULT_LAT = 30.02;
    const DEFAULT_LNG = 31.54;

    const lookup = new Map<string, { lat: number; lng: number }>();
    for (const c of NEW_CAIRO_COMPOUNDS) {
      lookup.set(c.nameEn.toLowerCase(), { lat: c.lat, lng: c.lng });
      lookup.set(c.nameAr.toLowerCase(), { lat: c.lat, lng: c.lng });
      lookup.set(c.code.toLowerCase(), { lat: c.lat, lng: c.lng });
    }

    return filteredUnits.map((u, index) => {
      let coords = { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
      const compKey = (u.compound || '').toLowerCase().trim();

      for (const [name, pos] of lookup.entries()) {
        if (compKey.includes(name) || name.includes(compKey)) {
          coords = pos;
          break;
        }
      }

      // Add deterministic small jitter so pins in same compound don't overlap completely
      const charA = u.id ? u.id.charCodeAt(0) : index;
      const charB = u.id ? u.id.charCodeAt(u.id.length - 1) : index * 3;
      const jitterLat = (((charA * 17) % 30) - 15) * 0.00035;
      const jitterLng = (((charB * 23) % 30) - 15) * 0.00035;

      return {
        id: u.id,
        code: u.code,
        compound: u.compound,
        lat: coords.lat + jitterLat,
        lng: coords.lng + jitterLng,
        priceLabel: u.priceLabel,
        type: u.type,
        mode: u.mode,
        beds: u.beds,
        area: u.area,
        img: u.img,
      };
    });
  }, [filteredUnits]);

  return (
    <div className="w-full space-y-6 text-white">
      {/* Top Banner / Radar Introduction */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#002b4b] via-[#09152a] to-[#040914] border border-[#c99436]/30 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c99436]/20 border border-[#c99436]/30 text-xs font-bold text-[#e9c176]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>رادار التحقق الفوري (Listing Net Search)</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              شبكة اصطياد الوحدات وخريطة القاهرة الجديدة
            </h2>
            <p className="text-sm text-white/70 leading-relaxed">
              ابحث في قاعدة بياناتنا المعتمدة (أكثر من 7,600 وحدة)، وحدد حتى{' '}
              <strong className="text-[#e9c176]">40 وحدة مستهدفة</strong>. اضغط{' '}
              <strong className="text-white">إرسال للتحقق</strong> وسيقوم روبوت سييرا بالتواصل الفوري مع الملاك والوسطاء عبر واتساب لجلب أحدث الصور وتأكيد التوافر خلال ساعة واحدة.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
            <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-center min-w-[120px]">
              <div className="text-2xl font-extrabold text-[#e9c176] font-mono">
                {filteredUnits.length.toLocaleString()}
              </div>
              <div className="text-[11px] text-white/60">وحدة مطابقة للبحث</div>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-[#002b4b]/80 border border-[#0077cc]/30 text-center min-w-[120px]">
              <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                {selectedUnitIds.size} <span className="text-xs text-white/50">/ 40</span>
              </div>
              <div className="text-[11px] text-white/60">وحدة في شبكتك</div>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-[#c99436] via-[#e9c176] to-[#c99436] text-[#0d0d0f] font-extrabold text-xs hover:brightness-110 transition-all shadow-xl flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{selectedUnitIds.size > 0 ? `إرسال الشبكة (${selectedUnitIds.size})` : 'طلب توفر وصور'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quota Alert Notification */}
      {quotaWarning && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>
              <strong>وصلت للحد الأقصى (40 وحدة):</strong> يمكنك إرسال حتى 40 وحدة كحد أقصى في الطلب الواحد لضمان سرعة جمع الصور والردود خلال ساعة واحدة.
            </span>
          </div>
          <button
            onClick={() => setQuotaWarning(false)}
            className="text-xs px-3 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-100"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-4 md:p-5 rounded-2xl bg-[#09152a]/90 border border-white/10 backdrop-blur-md space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {/* Keyword Search */}
          <div className="relative xl:col-span-1">
            <Search className="w-4 h-4 text-white/40 absolute right-3.5 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="كود، كمبوند، حي..."
              className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#c99436] transition-colors"
            />
          </div>

          {/* Operation (Buy / Rent) */}
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value as any)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] border border-white/10 text-xs text-white focus:outline-none focus:border-[#c99436]"
          >
            <option value="all">كل العمليات (بيع وإيجار)</option>
            <option value="sale">شراء / بيع (Sale / Buy)</option>
            <option value="rent">إيجار (Rent)</option>
          </select>

          {/* Compound */}
          <select
            value={selectedCompound}
            onChange={(e) => setSelectedCompound(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] border border-white/10 text-xs text-white focus:outline-none focus:border-[#c99436]"
          >
            {COMPOUNDS_LIST.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Property Type */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] border border-white/10 text-xs text-white focus:outline-none focus:border-[#c99436]"
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Bedrooms */}
          <select
            value={selectedBeds}
            onChange={(e) => setSelectedBeds(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] border border-white/10 text-xs text-white focus:outline-none focus:border-[#c99436]"
          >
            <option value="all">كل الغرف (All Beds)</option>
            <option value="1">1 غرفة نوم</option>
            <option value="2">2 غرف نوم</option>
            <option value="3">3 غرف نوم</option>
            <option value="4+">4+ غرف نوم</option>
          </select>

          {/* Price Range */}
          <select
            value={selectedPriceRange}
            onChange={(e) => setSelectedPriceRange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] border border-white/10 text-xs text-white focus:outline-none focus:border-[#c99436]"
          >
            <option value="all">ميزانية السعر (الكل)</option>
            <option value="under10m">أقل من 10 مليون ج.م</option>
            <option value="10m-25m">10 إلى 25 مليون ج.م</option>
            <option value="25m-50m">25 إلى 50 مليون ج.م</option>
            <option value="above50m">أكثر من 50 مليون ج.م</option>
            <option value="rent_under40k">إيجار: أقل من 40 ألف/شهر</option>
            <option value="rent_40k_100k">إيجار: 40 - 100 ألف/شهر</option>
            <option value="rent_above100k">إيجار: أكثر من 100 ألف/شهر</option>
          </select>

          {/* Segment Filter (Owners vs Brokers) */}
          <select
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] border border-white/10 text-xs text-white focus:outline-none focus:border-[#c99436]"
          >
            <option value="all">كل الفئات (ملاك ووسطاء)</option>
            <option value="owners_rent">ملاك مباشر (إيجار)</option>
            <option value="owners_buy">ملاك مباشر (بيع)</option>
            <option value="broker_rent">وسطاء (إيجار)</option>
            <option value="broker_buy">وسطاء (بيع)</option>
          </select>
        </div>

        {/* Quick Actions & View Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-white/50 font-semibold">تحديد سريع للشبكة:</span>
            <button
              onClick={() => selectTopN(10)}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition-colors"
            >
              أول 10 وحدات
            </button>
            <button
              onClick={() => selectTopN(20)}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition-colors"
            >
              أول 20 وحدة
            </button>
            <button
              onClick={() => selectTopN(40)}
              className="px-3 py-1.5 rounded-lg bg-[#c99436]/20 hover:bg-[#c99436]/30 border border-[#c99436]/40 text-[#e9c176] font-bold transition-colors"
            >
              الحد الأقصى (40 وحدة)
            </button>
            {selectedUnitIds.size > 0 && (
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>إفراغ الشبكة</span>
              </button>
            )}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-400/30 flex items-center gap-1.5 transition-colors"
              >
                <Filter className="w-3 h-3" />
                <span>إلغاء الفلاتر ({filteredUnits.length})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'split' ? 'bg-[#002b4b] text-white font-bold' : 'text-white/60 hover:text-white'
              }`}
            >
              تقسيم (خريطة + قائمة)
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'map' ? 'bg-[#002b4b] text-white font-bold' : 'text-white/60 hover:text-white'
              }`}
            >
              الخريطة فقط
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-[#002b4b] text-white font-bold' : 'text-white/60 hover:text-white'
              }`}
            >
              القائمة فقط
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Map and Grid */}
      <div
        className={`grid gap-6 ${
          viewMode === 'split'
            ? 'grid-cols-1 lg:grid-cols-12'
            : 'grid-cols-1'
        }`}
      >
        {/* Map Section */}
        {(viewMode === 'split' || viewMode === 'map') && (
          <div
            className={`space-y-3 ${
              viewMode === 'split' ? 'lg:col-span-6' : 'w-full'
            }`}
          >
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold text-white/70 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#c99436]" />
                رادار المواقع والكمبوندات النشطة
              </span>
              <span className="text-[11px] text-white/40">انقر على أي كمبوند لتصفية الوحدات</span>
            </div>
            <div className="h-[520px] rounded-2xl overflow-hidden border border-white/10 shadow-xl bg-[#080d18]">
              <LiveMap
                mode="dark"
                onSelectCompound={(c) => setSelectedCompound(c.nameEn)}
                units={mapUnitPins}
                selectedUnitIds={selectedUnitIds}
                onToggleUnit={toggleUnitSelection}
              />
            </div>
          </div>
        )}

        {/* Listings Grid Section */}
        {(viewMode === 'split' || viewMode === 'grid') && (
          <div
            className={`space-y-3 ${
              viewMode === 'split' ? 'lg:col-span-6' : 'w-full'
            }`}
          >
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold text-white/70 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-emerald-400" />
                نتائج البحث المباشرة ({filteredUnits.length.toLocaleString()})
              </span>
              <span className="text-[11px] text-emerald-400 font-mono font-bold">
                {selectedUnitIds.size} مختارة للإرسال
              </span>
            </div>

            {loading ? (
              <div className="h-[520px] rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-sm text-white/50">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-[#c99436] border-t-transparent rounded-full animate-spin" />
                  <span>جاري تحميل بيانات الوحدات...</span>
                </div>
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="h-[520px] rounded-2xl border border-white/10 bg-white/5 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <Home className="w-10 h-10 text-white/30" />
                <h4 className="text-base font-bold text-white">لا توجد وحدات مطابقة للفلتر المحدد</h4>
                <p className="text-xs text-white/50 max-w-sm">
                  جرّب تغيير الكمبوند أو توسيع نطاق البحث لعرض المزيد من الوحدات المتاحة.
                </p>
                <button
                  onClick={() => {
                    setQuery('');
                    setSelectedCompound('All Compounds');
                    setSelectedType('All Types');
                    setSelectedMode('all');
                    setSelectedSegment('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 text-xs text-white hover:bg-white/15 transition-colors"
                >
                  إعادة تعيين الفلاتر
                </button>
              </div>
            ) : (
              <div className="h-[520px] overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
                {filteredUnits.slice(0, 100).map((unit) => {
                  const isMarked = selectedUnitIds.has(unit.id);
                  return (
                    <div
                      key={unit.id}
                      onClick={() => toggleUnitSelection(unit.id)}
                      className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                        isMarked
                          ? 'bg-[#002b4b]/60 border-[#c99436] shadow-lg ring-1 ring-[#c99436]/50'
                          : 'bg-[#09152a]/70 border-white/10 hover:border-white/20 hover:bg-[#0c1a33]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Checkbox Trigger */}
                        <div className="pt-0.5">
                          {isMarked ? (
                            <div className="p-1 rounded-lg bg-[#c99436] text-[#0d0d0f]">
                              <CheckSquare className="w-4 h-4 stroke-[2.5]" />
                            </div>
                          ) : (
                            <div className="p-1 rounded-lg bg-white/10 text-white/40 group-hover:text-white/80">
                              <Square className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        {/* Unit Specs & Info */}
                        <div className="flex-1 min-w-0 space-y-1 text-right">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-[#e9c176] font-mono">
                              {unit.code}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                unit.mode === 'rent'
                                  ? 'bg-sky-500/20 text-sky-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {unit.mode === 'rent' ? 'إيجار' : 'بيع'}
                            </span>
                          </div>

                          <div className="text-sm font-bold text-white truncate">
                            {unit.compound}
                          </div>

                          <div className="text-xs text-white/60 flex items-center justify-between gap-2">
                            <span>
                              {unit.type} · {unit.beds || 3} غرف · {unit.area || 160} م²
                            </span>
                            <span className="font-extrabold text-emerald-400 font-mono">
                              {unit.priceLabel}
                            </span>
                          </div>

                          {unit.tag && (
                            <div className="pt-1 flex items-center gap-2">
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-white/50 border border-white/5">
                                {unit.tag}
                              </span>
                              {unit.whatsapp && (
                                <span className="text-[10px] text-emerald-400/80 flex items-center gap-1">
                                  <Phone className="w-2.5 h-2.5" />
                                  <span>واتساب مسجل</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Bottom Net Bar (When at least 1 unit is marked) */}
      {selectedUnitIds.size > 0 && (
        <div className="fixed bottom-6 inset-x-4 max-w-3xl mx-auto z-[999] animate-in slide-in-from-bottom duration-300">
          <div className="p-4 rounded-2xl bg-[#0e1626]/95 border border-[#c99436]/60 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-4 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#c99436] text-[#0d0d0f] font-black">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold flex items-center gap-2">
                  <span>شبكة الاختيار:</span>
                  <span className="text-[#e9c176] font-mono font-black">
                    {selectedUnitIds.size} / 40 وحدة
                  </span>
                </div>
                <div className="text-xs text-white/60">
                  معيار استجابة 1 ساعة · التحقق وطلب الصور آلياً
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearSelection}
                className="px-3 py-2 rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={shareOnWhatsApp}
                className="hidden sm:inline-flex px-3.5 py-2.5 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] font-bold text-xs hover:bg-[#25D366]/30 transition-all items-center gap-1.5"
                title="مشاركة الوحدات المختارة عبر واتساب"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>مشاركة واتساب</span>
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#c99436] via-[#e9c176] to-[#c99436] text-[#0d0d0f] font-extrabold text-xs hover:brightness-110 transition-all shadow-lg flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال للتحقق الفوري ({selectedUnitIds.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Availability Inquiry Modal */}
      <AvailabilityInquiryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedUnits={selectedUnitsList}
        onClearSelection={clearSelection}
        onAutoPickN={(n) => selectTopN(n)}
      />
    </div>
  );
}

export default function ListingNetMap(props: ListingNetMapProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-96 rounded-3xl bg-[#09152a]/60 border border-white/10 flex items-center justify-center text-white/50">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-[#c99436] border-t-transparent rounded-full animate-spin" />
            <span>جاري تحميل رادار الوحدات...</span>
          </div>
        </div>
      }
    >
      <ListingNetMapContent {...props} />
    </Suspense>
  );
}
