'use client';

/**
 * Inventory Command Center — the master inventory operations surface.
 *
 * Unifies the committed master-inventory JSON baselines with the live
 * /api/admin/listings Supabase feed into one governed grid: KPI strip,
 * faceted filters, status workflow (Available → Reserved → Sold/Rented),
 * bulk governance, CSV export, a geographic live-map tab, and a unit
 * drawer with the Egyptian payment-plan studio.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Building2,
  Search,
  RefreshCw,
  Download,
  X,
  Eye,
  Map as MapIcon,
  LayoutGrid,
  Database,
  CircleDollarSign,
  Image as ImageIcon,
  Globe,
  Layers,
} from 'lucide-react';

import consolidatedRaw from '@/data/consolidated-master-inventory.json';
import realListingsRaw from '@/data/real-listings.json';
import { resolveLocation } from '@/lib/inventory/gazetteer';
import { exportCSV } from './admin-shared';
import { UnitDetailDrawer, formatEGP, type DrawerUnit } from './InventoryPaymentLab';
import type { MapUnitPin } from '@/components/Maps/LiveMap';

const LiveMap = dynamic(() => import('@/components/Maps/LiveMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0a1424] text-slate-400 text-sm font-mono">
      loading live map…
    </div>
  ),
});

/* ── Baseline: committed JSON + live Supabase merge ─────────────────── */

function buildUnifiedBaseline(): any[] {
  const map = new Map<string, any>();

  if (Array.isArray(realListingsRaw)) {
    realListingsRaw.forEach((item: any) => {
      const code = item.sierraCode || item.code || `SE-${item.id}`;
      map.set(code, {
        ...item,
        sierraCode: code,
        photos: item.photos || (item.image ? [item.image] : item.img ? [item.img] : []),
        hasPhotos: Boolean((item.photos && item.photos.length > 0) || item.image || item.img),
        status: item.status || 'Available',
      });
    });
  }

  if (Array.isArray(consolidatedRaw)) {
    consolidatedRaw.forEach((item: any) => {
      const code = item.sierraCode || item.code || `SE-${item.id}`;
      if (!map.has(code)) {
        map.set(code, {
          ...item,
          sierraCode: code,
          photos: item.photos || [],
          hasPhotos: Boolean(item.photos && item.photos.length > 0),
          status: item.status || 'Available',
        });
      }
    });
  }

  return Array.from(map.values());
}

/* ── Status model ───────────────────────────────────────────────────── */

export type InventoryStatus = 'available' | 'reserved' | 'sold' | 'rented' | 'hold' | 'archived';

function normalizeStatus(raw: string | undefined): InventoryStatus {
  const s = (raw || '').toLowerCase();
  if (s.includes('sold')) return 'sold';
  if (s.includes('rented') || s === 'unavailable' || s === 'no_answer') return 'rented';
  if (s.includes('hold')) return 'hold';
  if (s.includes('reserved')) return 'reserved';
  if (s.includes('archive')) return 'archived';
  if (s === 'follow_up' || s.includes('pending')) return 'hold';
  // Rent inventory that is simply "available" stays available regardless of operation.
  return 'available';
}

const STATUS_META: Record<InventoryStatus, { label: string; labelAr: string; cls: string; dot: string }> = {
  available: { label: 'Available', labelAr: 'متاح', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: '#34D399' },
  reserved: { label: 'Reserved', labelAr: 'محجوز', cls: 'bg-[#C8961A]/15 text-[#E9C176] border-[#C8961A]/40', dot: '#E9C176' },
  sold: { label: 'Sold', labelAr: 'تم البيع', cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30 line-through decoration-slate-400/60', dot: '#94a3b8' },
  rented: { label: 'Rented', labelAr: 'تم الإيجار', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30', dot: '#38bdf8' },
  hold: { label: 'On Hold', labelAr: 'معلّق', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', dot: '#f59e0b' },
  archived: { label: 'Archived', labelAr: 'مؤرشف', cls: 'bg-slate-700/30 text-slate-400 border-slate-600/40', dot: '#64748b' },
};

/** Allowed transitions — the unit lifecycle Sierra operates. */
const STATUS_FLOW: Record<InventoryStatus, InventoryStatus[]> = {
  available: ['available', 'reserved', 'sold', 'rented', 'hold', 'archived'],
  reserved: ['reserved', 'available', 'sold', 'rented', 'archived'],
  sold: ['sold', 'available'], // reopened after a fallen deal
  rented: ['rented', 'available'],
  hold: ['hold', 'available', 'reserved', 'archived'],
  archived: ['archived', 'available'],
};

/* ── Helpers ────────────────────────────────────────────────────────── */

function unitPrice(item: any): number {
  return Number(item.price) || 0;
}

function unitOperation(item: any): 'sale' | 'rent' {
  const op = String(item.operation || item.mode || item.dealType || '').toLowerCase();
  if (op.includes('rent')) return 'rent';
  return 'sale';
}

function hashJitter(seed: string): [number, number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return [((h % 40) - 20) * 0.00035, (((h >> 8) % 40) - 20) * 0.00035];
}

/* ── View ───────────────────────────────────────────────────────────── */

export default function InventoryCommandView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [tab, setTab] = useState<'grid' | 'map'>('grid');
  const [allUnits, setAllUnits] = useState<any[]>(() => buildUnifiedBaseline());
  const [liveMerged, setLiveMerged] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState('');
  const [compoundFilter, setCompoundFilter] = useState('all');
  const [operationFilter, setOperationFilter] = useState<'all' | 'sale' | 'rent'>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | InventoryStatus>('all');
  const [bedsFilter, setBedsFilter] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sort, setSort] = useState('price-desc');

  // Selection & pagination
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Drawer
  const [drawerUnit, setDrawerUnit] = useState<DrawerUnit | null>(null);

  const t = useMemo(
    () => ({
      title: isAr ? 'مركز قيادة المخزون' : 'Inventory Command Center',
      subtitle: isAr
        ? 'إدارة موحدة للمخزون — فلترة، دورة حياة الحالة، خطة سداد، وخريطة مباشرة'
        : 'Unified inventory governance — faceted filters, status lifecycle, payment plans, and the live map in one deck',
      grid: isAr ? 'الجدول' : 'Grid',
      map: isAr ? 'الخريطة' : 'Map',
      refresh: isAr ? 'تحديث' : 'Refresh',
      search: isAr ? 'ابحث: كود، كمباند، نوع…' : 'Search code, compound, type…',
      compound: isAr ? 'الكمباند' : 'Compound',
      allCompounds: isAr ? 'كل الكمبوندات' : 'All compounds',
      operation: isAr ? 'الغرض' : 'Operation',
      sale: isAr ? 'بيع' : 'Sale',
      rent: isAr ? 'إيجار' : 'Rent',
      type: isAr ? 'النوع' : 'Type',
      allTypes: isAr ? 'كل الأنواع' : 'All types',
      status: isAr ? 'الحالة' : 'Status',
      allStatuses: isAr ? 'كل الحالات' : 'All statuses',
      beds: isAr ? 'الغرف' : 'Beds',
      any: isAr ? 'أي' : 'Any',
      priceRange: isAr ? 'السعر (EGP)' : 'Price (EGP)',
      min: isAr ? 'أدنى' : 'min',
      max: isAr ? 'أقصى' : 'max',
      reset: isAr ? 'إعادة ضبط' : 'Reset',
      export: isAr ? 'تصدير CSV' : 'Export CSV',
      total: isAr ? 'إجمالي الوحدات' : 'Total Units',
      available: isAr ? 'متاح' : 'Available',
      reserved: isAr ? 'محجوز' : 'Reserved',
      closed: isAr ? 'مغلق (بيع/إيجار)' : 'Closed (Sold/Rented)',
      portfolio: isAr ? 'قيمة المحفظة (بيع)' : 'Portfolio Value (Sale)',
      perSqm: isAr ? 'متوسط سعر المتر' : 'Avg Price / m²',
      photoCov: isAr ? 'تغطية الصور' : 'Photo Coverage',
      webLive: isAr ? 'منشور للموقع' : 'Website Live',
      unit: isAr ? 'الوحدة' : 'Unit',
      specs: isAr ? 'المواصفات' : 'Specs',
      price: isAr ? 'السعر' : 'Price',
      actions: isAr ? 'إجراءات' : 'Actions',
      view: isAr ? 'عرض' : 'View',
      selected: isAr ? 'محدد' : 'selected',
      setStatus: isAr ? 'تغيير الحالة' : 'Set Status',
      clear: isAr ? 'إلغاء التحديد' : 'Clear',
      live: isAr ? 'مباشر' : 'LIVE',
      baseline: isAr ? 'قاعدة محلية' : 'Committed Baseline',
      showing: isAr ? 'عرض' : 'Showing',
      of: isAr ? 'من' : 'of',
      savedLocal: isAr ? 'حُفظ محلياً — قاعدة البيانات غير متاحة' : 'Applied locally — live DB unreachable',
      savedLive: isAr ? 'تم الحفظ في قاعدة البيانات' : 'Saved to live database',
      noResults: isAr ? 'لا توجد وحدات مطابقة' : 'No matching units',
    }),
    [isAr]
  );

  /* ── Live merge from /api/admin/listings ── */
  const loadLive = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/listings?limit=500', { cache: 'no-store' });
      if (res.ok) {
        const payload = (await res.json()) as { listings?: any[] };
        if (Array.isArray(payload.listings) && payload.listings.length > 0) {
          setAllUnits((prev) => {
            const map = new Map(prev.map((i) => [i.sierraCode || i.code || i.id, i]));
            payload.listings!.forEach((liveItem) => {
              const code = liveItem.sierraCode || liveItem.code || liveItem.id;
              const existing = map.get(code);
              map.set(code, { ...(existing || {}), ...liveItem, sierraCode: code });
            });
            return Array.from(map.values());
          });
          setLiveMerged(true);
        }
      }
    } catch {
      // Baseline already loaded — Supabase unreachable in this environment.
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLive();
  }, [loadLive]);

  /* ── Derived facets ── */
  const compounds = useMemo(
    () =>
      Array.from(new Set(allUnits.map((u) => (u.compound || u.cmp || u.location || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [allUnits]
  );
  const types = useMemo(
    () =>
      Array.from(new Set(allUnits.map((u) => (u.type || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [allUnits]
  );

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    const qLower = q.toLowerCase().trim();
    const pMin = parseFloat(priceMin) || 0;
    const pMax = parseFloat(priceMax) || Infinity;

    return allUnits.filter((u) => {
      const compound = u.compound || u.cmp || u.location || '';
      const operation = unitOperation(u);
      const status = normalizeStatus(u.status);
      const price = unitPrice(u);

      if (qLower) {
        const hay = `${u.sierraCode || u.code || ''} ${compound} ${u.type || ''} ${u.developer || ''}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      if (compoundFilter !== 'all' && compound !== compoundFilter) return false;
      if (operationFilter !== 'all' && operation !== operationFilter) return false;
      if (typeFilter !== 'all' && (u.type || '') !== typeFilter) return false;
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (bedsFilter !== 'all') {
        const beds = Number(u.beds) || 0;
        if (bedsFilter === '5+') { if (beds < 5) return false; } else if (beds !== Number(bedsFilter)) return false;
      }
      if (price > 0 && price < pMin) return false;
      if (price > 0 && price > pMax) return false;
      return true;
    });
  }, [allUnits, q, compoundFilter, operationFilter, typeFilter, statusFilter, bedsFilter, priceMin, priceMax]);

  const sorted = useMemo(() => {
    const withPricePerSqm = (u: any) => {
      const area = Number(u.area) || 0;
      return area > 0 ? unitPrice(u) / area : 0;
    };
    const arr = [...filtered];
    switch (sort) {
      case 'price-asc': arr.sort((a, b) => unitPrice(a) - unitPrice(b)); break;
      case 'price-desc': arr.sort((a, b) => unitPrice(b) - unitPrice(a)); break;
      case 'sqm-asc': arr.sort((a, b) => withPricePerSqm(a) - withPricePerSqm(b)); break;
      case 'sqm-desc': arr.sort((a, b) => withPricePerSqm(b) - withPricePerSqm(a)); break;
      case 'beds-desc': arr.sort((a, b) => (Number(b.beds) || 0) - (Number(a.beds) || 0)); break;
      case 'area-desc': arr.sort((a, b) => (Number(b.area) || 0) - (Number(a.area) || 0)); break;
    }
    return arr;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [q, compoundFilter, operationFilter, typeFilter, statusFilter, bedsFilter, priceMin, priceMax, sort]);

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const sale = allUnits.filter((u) => unitOperation(u) === 'sale');
    const available = allUnits.filter((u) => normalizeStatus(u.status) === 'available').length;
    const reserved = allUnits.filter((u) => normalizeStatus(u.status) === 'reserved').length;
    const closed = allUnits.filter((u) => ['sold', 'rented'].includes(normalizeStatus(u.status))).length;
    const portfolio = sale.reduce((s, u) => s + unitPrice(u), 0);
    const withArea = sale.filter((u) => unitPrice(u) > 0 && (Number(u.area) || 0) > 0);
    const avgSqm = withArea.length
      ? Math.round(withArea.reduce((s, u) => s + unitPrice(u) / Number(u.area), 0) / withArea.length)
      : 0;
    const withPhotos = allUnits.filter((u) => (u.photos && u.photos.length) || u.img || u.image).length;
    const photoPct = allUnits.length ? Math.round((withPhotos / allUnits.length) * 100) : 0;
    return { total: allUnits.length, available, reserved, closed, portfolio, avgSqm, photoPct };
  }, [allUnits]);

  /* ── Status mutation (live PATCH with local fallback) ── */
  const applyStatus = useCallback(
    async (unitId: string, nextLabel: string) => {
      // Optimistic local update
      setAllUnits((prev) =>
        prev.map((u) => ((u.sierraCode || u.code || u.id) === unitId ? { ...u, status: nextLabel } : u))
      );
      setDrawerUnit((d) => (d && d.id === unitId ? { ...d, status: nextLabel } : d));
      try {
        const res = await fetch(`/api/admin/listings/${encodeURIComponent(unitId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextLabel }),
        });
        setNotice(res.ok ? t.savedLive : t.savedLocal);
      } catch {
        setNotice(t.savedLocal);
      }
      setTimeout(() => setNotice(null), 3200);
    },
    [t]
  );

  const bulkSetStatus = useCallback(
    async (label: string) => {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await applyStatus(id, label);
      }
      setSelectedIds(new Set());
    },
    [selectedIds, applyStatus]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allPageSelected = pageRows.length > 0 && pageRows.every((u) => selectedIds.has(u.sierraCode || u.code || u.id));

  const resetFilters = () => {
    setQ('');
    setCompoundFilter('all');
    setOperationFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
    setBedsFilter('all');
    setPriceMin('');
    setPriceMax('');
    setSort('price-desc');
  };

  /* ── Map pins ── */
  const mapPins: MapUnitPin[] = useMemo(() => {
    return sorted.slice(0, 250).map((u, idx) => {
      const compound = u.compound || u.cmp || u.location || 'New Cairo';
      const loc = resolveLocation(compound);
      const [jLat, jLng] = hashJitter(String(u.sierraCode || u.code || idx));
      const price = unitPrice(u);
      const op = unitOperation(u);
      return {
        id: String(u.sierraCode || u.code || u.id),
        code: String(u.sierraCode || u.code || `SE-${idx}`),
        compound,
        lat: loc.lat + jLat,
        lng: loc.lng + jLng,
        priceLabel: op === 'rent' ? `${(price / 1000).toFixed(0)}K/mo` : `${(price / 1_000_000).toFixed(1)}M`,
        type: u.type || 'Unit',
        mode: op,
        beds: Number(u.beds) || undefined,
        baths: Number(u.baths) || undefined,
        area: Number(u.area) || undefined,
        img: (u.photos && u.photos[0]) || u.img || u.image,
      };
    });
  }, [sorted]);

  const toDrawerUnit = (u: any): DrawerUnit => ({
    id: String(u.sierraCode || u.code || u.id),
    code: String(u.sierraCode || u.code || '—'),
    compound: u.compound || u.cmp || u.location || '—',
    developer: u.developer,
    zone: u.zone,
    type: u.type || '—',
    operation: unitOperation(u) === 'rent' ? 'Rent' : 'Sale',
    beds: u.beds != null ? Number(u.beds) : null,
    baths: u.baths != null ? Number(u.baths) : null,
    area: u.area != null ? Number(u.area) : null,
    price: unitPrice(u),
    status: STATUS_META[normalizeStatus(u.status)].label,
    photos: u.photos || (u.img ? [u.img] : []),
    img: u.img || u.image,
    finishing: u.finishing,
    aiScore: u.aiScore != null ? Number(u.aiScore) : undefined,
    source: u.ago || u.source,
    tag: u.tag,
  });

  /* ── Render ── */

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0d1a2c]/70 p-5 rounded-2xl border border-[#C8961A]/25">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#211A0D] border border-[#C8961A]/40 text-[#E9C176]">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              {t.title}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#C8961A]/20 text-[#E9C176] border border-[#C8961A]/40">
                {liveMerged ? `● ${t.live}` : t.baseline}
              </span>
            </h1>
            <p className="text-slate-400 text-xs mt-0.5 max-w-xl">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border border-[#C8961A]/30">
            <button
              type="button"
              onClick={() => setTab('grid')}
              className={`px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${tab === 'grid' ? 'bg-[#C8961A] text-[#0d0d0f]' : 'bg-[#0a1424] text-slate-300 hover:text-white'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> {t.grid}
            </button>
            <button
              type="button"
              onClick={() => setTab('map')}
              className={`px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${tab === 'map' ? 'bg-[#C8961A] text-[#0d0d0f]' : 'bg-[#0a1424] text-slate-300 hover:text-white'}`}
            >
              <MapIcon className="w-3.5 h-3.5" /> {t.map}
            </button>
          </div>
          <button
            type="button"
            onClick={loadLive}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-[#0a1424] border border-[#C8961A]/30 text-[#E9C176] hover:border-[#E9C176] cursor-pointer disabled:opacity-50"
            title={t.refresh}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI strip (grid tab only — the map tab needs the vertical space) */}
      {tab === 'grid' && (
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <Kpi label={t.total} value={kpis.total.toLocaleString('en-EG')} icon={<Layers className="w-4 h-4" />} />
        <Kpi label={t.available} value={kpis.available.toLocaleString('en-EG')} icon={<CircleDollarSign className="w-4 h-4" />} accent="#34D399" />
        <Kpi label={t.reserved} value={kpis.reserved.toLocaleString('en-EG')} icon={<CircleDollarSign className="w-4 h-4" />} accent="#E9C176" />
        <Kpi label={t.closed} value={kpis.closed.toLocaleString('en-EG')} icon={<CircleDollarSign className="w-4 h-4" />} accent="#94a3b8" />
        <Kpi label={t.portfolio} value={formatEGP(kpis.portfolio)} icon={<CircleDollarSign className="w-4 h-4" />} accent="#F5D78E" />
        <Kpi label={t.perSqm} value={kpis.avgSqm ? `${kpis.avgSqm.toLocaleString('en-EG')} EGP` : '—'} icon={<CircleDollarSign className="w-4 h-4" />} />
        <Kpi label={t.photoCov} value={`${kpis.photoPct}%`} icon={<ImageIcon className="w-4 h-4" />} accent={kpis.photoPct >= 70 ? '#34D399' : '#f59e0b'} />
      </div>
      )}

      {tab === 'grid' ? (
        <>
          {/* Filter bar */}
          <div className="bg-[#0d1a2c]/70 p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t.search}
                  className="w-full bg-[#0a1424] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#E9C176]/60"
                />
              </div>
              <Select value={compoundFilter} onChange={setCompoundFilter} ariaLabel={t.compound}>
                <option value="all">{t.allCompounds} ({compounds.length})</option>
                {compounds.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
              <div className="flex rounded-xl overflow-hidden border border-white/10">
                {(['all', 'sale', 'rent'] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setOperationFilter(op)}
                    className={`px-3 py-2 text-[11px] font-bold cursor-pointer transition-colors ${operationFilter === op ? 'bg-[#C8961A] text-[#0d0d0f]' : 'bg-[#0a1424] text-slate-300 hover:text-white'}`}
                  >
                    {op === 'all' ? t.any : op === 'sale' ? t.sale : t.rent}
                  </button>
                ))}
              </div>
              <Select value={typeFilter} onChange={setTypeFilter} ariaLabel={t.type}>
                <option value="all">{t.allTypes}</option>
                {types.map((ty) => (
                  <option key={ty} value={ty}>{ty}</option>
                ))}
              </Select>
              <Select value={statusFilter} onChange={(v) => setStatusFilter(v as 'all' | InventoryStatus)} ariaLabel={t.status}>
                <option value="all">{t.allStatuses}</option>
                {(Object.keys(STATUS_META) as InventoryStatus[]).map((s) => (
                  <option key={s} value={s}>{isAr ? STATUS_META[s].labelAr : STATUS_META[s].label}</option>
                ))}
              </Select>
              <Select value={bedsFilter} onChange={setBedsFilter} ariaLabel={t.beds}>
                <option value="all">{t.beds}: {t.any}</option>
                {['1', '2', '3', '4', '5+'].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </Select>
              <div className="flex items-center gap-1.5 bg-[#0a1424] border border-white/10 rounded-xl px-2.5 py-1.5">
                <span className="text-[9.5px] font-mono text-slate-400 uppercase">{t.priceRange}</span>
                <input
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  placeholder={t.min}
                  inputMode="numeric"
                  className="w-16 bg-transparent text-[11px] text-white placeholder:text-slate-600 outline-none font-mono"
                />
                <span className="text-slate-600 text-[10px]">–</span>
                <input
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  placeholder={t.max}
                  inputMode="numeric"
                  className="w-16 bg-transparent text-[11px] text-white placeholder:text-slate-600 outline-none font-mono"
                />
              </div>
              <Select value={sort} onChange={setSort} ariaLabel="Sort">
                <option value="price-desc">↓ Price</option>
                <option value="price-asc">↑ Price</option>
                <option value="sqm-desc">↓ EGP/m²</option>
                <option value="sqm-asc">↑ EGP/m²</option>
                <option value="beds-desc">↓ Beds</option>
                <option value="area-desc">↓ Area</option>
              </Select>
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-2 text-[11px] font-bold rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-[#E9C176]/50 cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-3 h-3" /> {t.reset}
              </button>
            </div>

            {/* Bulk bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <Database className="w-3.5 h-3.5 text-[#E9C176]" />
                {t.showing} {sorted.length.toLocaleString('en-EG')} {t.of} {allUnits.length.toLocaleString('en-EG')}
                {selectedIds.size > 0 && (
                  <span className="text-[#E9C176] font-bold">· {selectedIds.size} {t.selected}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <>
                    <Select value="" onChange={(v) => v && bulkSetStatus(v)} ariaLabel={t.setStatus} small>
                      <option value="">{t.setStatus}…</option>
                      {(Object.keys(STATUS_META) as InventoryStatus[]).map((s) => (
                        <option key={s} value={STATUS_META[s].label}>{isAr ? STATUS_META[s].labelAr : STATUS_META[s].label}</option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
                    >
                      {t.clear}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() =>
                    exportCSV(
                      sorted.map((u) => ({
                        code: u.sierraCode || u.code || '',
                        compound: u.compound || u.cmp || u.location || '',
                        type: u.type || '',
                        operation: unitOperation(u),
                        beds: u.beds ?? '',
                        baths: u.baths ?? '',
                        area_sqm: u.area ?? '',
                        price_egp: unitPrice(u),
                        status: STATUS_META[normalizeStatus(u.status)].label,
                      })),
                      'sierra-inventory-export.csv'
                    )
                  }
                  className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-[#211A0D] border border-[#C8961A]/40 text-[#E9C176] hover:border-[#E9C176] cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3 h-3" /> {t.export}
                </button>
              </div>
            </div>
          </div>

          {/* Data table */}
          <div className="bg-[#0d1a2c]/70 rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <thead>
                  <tr className="text-left text-slate-400 border-b border-white/10 bg-[#0a1424]">
                    <th className="px-3 py-2.5 w-8">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={() => {
                          const next = new Set(selectedIds);
                          pageRows.forEach((u) => {
                            const id = u.sierraCode || u.code || u.id;
                            if (allPageSelected) next.delete(id);
                            else next.add(id);
                          });
                          setSelectedIds(next);
                        }}
                        className="accent-[#C8961A] cursor-pointer"
                        aria-label="Select page"
                      />
                    </th>
                    <th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider">{t.unit}</th>
                    <th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider">{t.compound}</th>
                    <th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider">{t.specs}</th>
                    <th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider">{t.price}</th>
                    <th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider">{t.status}</th>
                    <th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider">{t.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((u) => {
                    const id = String(u.sierraCode || u.code || u.id);
                    const operation = unitOperation(u);
                    const status = normalizeStatus(u.status);
                    const meta = STATUS_META[status];
                    const price = unitPrice(u);
                    const area = Number(u.area) || 0;
                    const photo = (u.photos && u.photos[0]) || u.img || u.image;
                    const compound = u.compound || u.cmp || u.location || '—';
                    const allowed = STATUS_FLOW[status];

                    return (
                      <tr key={id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(id)}
                            onChange={() => toggleSelect(id)}
                            className="accent-[#C8961A] cursor-pointer"
                            aria-label={`Select ${id}`}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            {photo ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={photo} alt={id} className="w-11 h-8 rounded-md object-cover border border-white/10" />
                            ) : (
                              <div className="w-11 h-8 rounded-md border border-dashed border-white/15 bg-[#0a1424] flex items-center justify-center">
                                <ImageIcon className="w-3 h-3 text-slate-600" />
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-white font-mono text-[11px]">{id}</div>
                              <div className="text-[9.5px] text-slate-500">
                                {operation === 'rent' ? (isAr ? 'إيجار' : 'Rent') : isAr ? 'بيع' : 'Sale'}
                                {u.tag ? ` · ${u.tag}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="text-slate-200 font-semibold">{compound}</div>
                          <div className="text-[9.5px] text-slate-500">{u.developer || u.zone || ''}</div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-300">
                          <div>{u.type || '—'}</div>
                          <div className="text-[9.5px] text-slate-500">
                            {u.beds ?? '—'} bd · {u.baths ?? '—'} ba · {area ? `${area} m²` : '—'}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-mono font-bold text-[#E9C176]">{formatEGP(price)}</div>
                          {area > 0 && price > 0 && (
                            <div className="text-[9.5px] text-slate-500 font-mono">{Math.round(price / area).toLocaleString('en-EG')}/m²</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            value={meta.label}
                            onChange={(e) => applyStatus(id, e.target.value)}
                            className={`text-[10px] font-bold rounded-lg px-2 py-1 border cursor-pointer outline-none ${meta.cls}`}
                          >
                            {(Object.keys(STATUS_META) as InventoryStatus[])
                              .filter((s) => allowed.includes(s))
                              .map((s) => (
                                <option key={s} value={STATUS_META[s].label} className="bg-[#0b1a2e] text-white">
                                  {isAr ? STATUS_META[s].labelAr : STATUS_META[s].label}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => setDrawerUnit(toDrawerUnit(u))}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-[#E9C176] hover:border-[#E9C176]/50 cursor-pointer"
                            title={t.view}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-14 text-center text-slate-500 text-sm">
                        {t.noResults}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-[#0a1424] border border-white/10 text-slate-300 disabled:opacity-40 cursor-pointer"
                >
                  ‹
                </button>
                <span className="text-[11px] text-slate-400 font-mono">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-[#0a1424] border border-white/10 text-slate-300 disabled:opacity-40 cursor-pointer"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Map tab — the admin geographic view (fills the content area) */
        <div className="bg-[#0d1a2c]/70 rounded-2xl border border-white/10 overflow-hidden" style={{ height: 'calc(100vh - 230px)', minHeight: 520 }}>
          <LiveMap
            mode="dark"
            lang={isAr ? 'ar' : 'en'}
            units={mapPins}
            selectedUnitIds={selectedIds}
            onToggleUnit={(id) => toggleSelect(id)}
            onSelectUnit={(unit) => {
              const full = allUnits.find((u) => String(u.sierraCode || u.code || u.id) === unit.id);
              if (full) setDrawerUnit(toDrawerUnit(full));
            }}
            height="100%"
            maxPins={250}
          />
        </div>
      )}

      {/* Drawer */}
      <UnitDetailDrawer
        unit={drawerUnit}
        onClose={() => setDrawerUnit(null)}
        onStatusChange={applyStatus}
        isAr={isAr}
      />

      {/* Toast */}
      {notice && (
        <div className="fixed bottom-6 right-6 z-[1300] px-4 py-3 rounded-xl bg-[#211A0D] border border-[#C8961A]/50 text-[#E9C176] text-xs font-bold shadow-2xl flex items-center gap-2">
          <Globe className="w-3.5 h-3.5" /> {notice}
        </div>
      )}
    </div>
  );
}

/* ── Small primitives ───────────────────────────────────────────────── */

function Kpi({ label, value, icon, accent = '#E9C176' }: { label: string; value: string; icon: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl bg-[#0d1a2c]/70 border border-white/10 px-3.5 py-3 flex items-center gap-3">
      <span className="p-2 rounded-lg bg-[#211A0D] border border-[#C8961A]/30" style={{ color: accent }}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[9px] text-slate-400 uppercase tracking-wider font-mono truncate">{label}</div>
        <div className="text-sm font-extrabold text-white font-mono truncate" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
  ariaLabel,
  small = false,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  ariaLabel?: string;
  small?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className={`bg-[#0a1424] border border-white/10 rounded-xl text-slate-200 outline-none focus:border-[#E9C176]/60 cursor-pointer ${small ? 'px-2 py-1 text-[10.5px]' : 'px-2.5 py-2 text-[11px]'}`}
    >
      {children}
    </select>
  );
}
