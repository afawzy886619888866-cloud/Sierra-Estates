'use client';

import React, { useState, useMemo, useEffect } from 'react';
import EasyListingStudio from '@/components/admin/EasyListingStudio';
import { PropertyTeaserBrochure } from '@/components/admin/PropertyTeaserBrochure';
import ValuationArbitrageStudio from '@/components/admin/ValuationArbitrageStudio';
import AccidentalDataLossGuardModal from '@/components/admin/AccidentalDataLossGuardModal';
import {
  Sparkles,
  ListFilter,
  PlusCircle,
  FileText,
  Search,
  UserCheck,
  ShieldCheck,
  Calculator,
  Download,
  Zap,
  Eye,
} from 'lucide-react';

import consolidatedRaw from '@/data/consolidated-master-inventory.json';
import realListingsRaw from '@/data/real-listings.json';
import { evaluatePropertyValuation } from '@/lib/valuationArbitrageEngine';

// Use consolidated inventory as the immediate fallback while the canonical
// Supabase/admin feed loads.
const FALLBACK_LISTINGS_DATA =
  consolidatedRaw && Array.isArray(consolidatedRaw) && consolidatedRaw.length > 0
    ? consolidatedRaw
    : realListingsRaw;

export default function ListingsView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'inventory' | 'easy-listing' | 'brochure' | 'valuation'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'owners' | 'whatsapp' | 'sale' | 'rent' | 'new' | 'month' | 'villa' | 'apartment'
  >('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>('Available');
  const [bulkNotification, setBulkNotification] = useState<string | null>(null);
  const [isGuardModalOpen, setIsGuardModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [allListingsData, setAllListingsData] = useState<any[]>(FALLBACK_LISTINGS_DATA as any[]);
  const [isLoadingLiveListings, setIsLoadingLiveListings] = useState(true);
  const [liveListingsError, setLiveListingsError] = useState<string | null>(null);

  // Quick valuation preview state
  const [activeValuationUnit, setActiveValuationUnit] = useState<any | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/listings?limit=500', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json() as { listings?: any[]; error?: string };
        if (!response.ok) throw new Error(payload.error || 'Failed to load live listings');
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        if (Array.isArray(payload.listings)) setAllListingsData(payload.listings);
        setLiveListingsError(null);
      })
      .catch((error) => {
        if (!active) return;
        setLiveListingsError(error instanceof Error ? error.message : 'Live listings unavailable');
      })
      .finally(() => {
        if (active) setIsLoadingLiveListings(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Filter listings
  const filteredListings = useMemo(() => {
    return (allListingsData as any[]).filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        item.sierraCode?.toLowerCase().includes(q) ||
        item.code?.toLowerCase().includes(q) ||
        item.compound?.toLowerCase().includes(q) ||
        item.cmp?.toLowerCase().includes(q) ||
        item.zone?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) ||
        item.type?.toLowerCase().includes(q) ||
        item.comment?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.ownerName?.toLowerCase().includes(q) ||
        item.contact_info?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (selectedFilter === 'owners') {
        return item.sourceType === 'owner' || (item.ownerType || '').toLowerCase() === 'owner';
      }
      if (selectedFilter === 'whatsapp') {
        return (
          item.origin === 'whatsapp_group' ||
          item.sourceGroup?.toLowerCase().includes('whatsapp') ||
          item.ago?.toLowerCase().includes('whatsapp') ||
          item.agent?.toLowerCase().includes('whatsapp') ||
          item.code?.startsWith('UNIT-WA') ||
          item.sierraCode?.startsWith('UNIT-WA') ||
          item.sierraCode?.startsWith('MD-B10') ||
          item.sierraCode?.startsWith('RH-P4') ||
          item.sierraCode?.startsWith('MV-GS') ||
          item.sierraCode?.startsWith('ET-R90') ||
          item.sierraCode?.startsWith('HP-GR') ||
          item.sierraCode?.startsWith('SL-HAF') ||
          item.sierraCode?.startsWith('BD-PH') ||
          item.sierraCode?.startsWith('VS-3A') ||
          item.sierraCode?.startsWith('MV-POOL') ||
          item.sierraCode?.startsWith('HP-LAKE')
        );
      }
      if (selectedFilter === 'sale') return item.operation === 'Sale' || item.mode === 'sale';
      if (selectedFilter === 'rent') return item.operation === 'Rent' || item.mode === 'rent';
      if (selectedFilter === 'new') return Boolean(item.isNewListing);
      if (selectedFilter === 'month') {
        if (!item.listedAt) return true;
        const ts = new Date(item.listedAt).getTime();
        if (isNaN(ts)) return true;
        return Date.now() - ts <= 30 * 24 * 60 * 60 * 1000;
      }
      if (selectedFilter === 'villa') {
        const t = (item.type || '').toLowerCase();
        return t.includes('villa') || t.includes('twin') || t.includes('town');
      }
      if (selectedFilter === 'apartment') {
        const t = (item.type || '').toLowerCase();
        return t.includes('apartment') || t.includes('duplex') || t.includes('penthouse') || t.includes('garden');
      }

      if (zoneFilter !== 'all') {
        const itemZone = (item.zone || item.location || '').toLowerCase();
        if (!itemZone.includes(zoneFilter.toLowerCase())) return false;
      }

      return true;
    });
  }, [allListingsData, searchQuery, selectedFilter, zoneFilter]);

  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredListings.slice(start, start + pageSize);
  }, [filteredListings, currentPage]);

  const totalPages = Math.ceil(filteredListings.length / pageSize);

  const availableZones = useMemo(() => {
    const set = new Set<string>();
    allListingsData.forEach((x) => {
      const z = x.zone || x.location;
      if (z && typeof z === 'string') set.add(z);
    });
    return Array.from(set);
  }, [allListingsData]);

  const handleToggleSelectAllPage = () => {
    const pageIds = paginatedListings.map((item) => item.sierraCode || item.code || `SE-${item.id}`);
    const allSelected = pageIds.every((id) => selectedListingIds.includes(id));
    if (allSelected) {
      setSelectedListingIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedListingIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedListingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleExportSelectedCSV = () => {
    const selectedRows = (allListingsData as any[]).filter((x) => {
      const id = x.sierraCode || x.code || `SE-${x.id}`;
      return selectedListingIds.includes(id);
    });
    if (selectedRows.length === 0) return;

    const headers = ['Code', 'Compound', 'Location', 'Type', 'Bedrooms', 'Area_SQM', 'Price_EGP', 'Mode', 'Owner_Name', 'Status'];
    const rows = selectedRows.map((r) => [
      `"${r.sierraCode || r.code || r.id || ''}"`,
      `"${r.compound || r.cmp || ''}"`,
      `"${r.location || r.zone || ''}"`,
      `"${r.type || ''}"`,
      r.bedrooms || r.beds || '',
      r.area_sqm || r.area || '',
      r.price || '',
      r.operation || r.mode || 'Sale',
      `"${r.ownerName || r.contact_info || ''}"`,
      `"${r.status || 'Available'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sierra-selected-inventory-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setBulkNotification(`Exported ${selectedRows.length} listings to CSV`);
    setTimeout(() => setBulkNotification(null), 3000);
  };

  const handleApplyBulkStatus = () => {
    if (selectedListingIds.length === 0) return;
    if (bulkStatus === 'Archived') {
      setIsGuardModalOpen(true);
      return;
    }
    executeBulkStatusUpdate();
  };

  const executeBulkStatusUpdate = () => {
    setBulkNotification(`Updated status for ${selectedListingIds.length} listings to "${bulkStatus}"`);
    setSelectedListingIds([]);
    setIsGuardModalOpen(false);
    setTimeout(() => setBulkNotification(null), 3500);
  };

  const stats = useMemo(() => {
    const all = allListingsData as any[];
    const ownersCount = all.filter((x) => x.sourceType === 'owner' || (x.ownerType || '').toLowerCase() === 'owner').length;
    const whatsappCount = all.filter(
      (item) =>
        item.origin === 'whatsapp_group' ||
        item.sourceGroup?.toLowerCase().includes('whatsapp') ||
        item.ago?.toLowerCase().includes('whatsapp') ||
        item.agent?.toLowerCase().includes('whatsapp') ||
        item.code?.startsWith('UNIT-WA') ||
        item.sierraCode?.startsWith('UNIT-WA') ||
        item.sierraCode?.startsWith('MD-B10') ||
        item.sierraCode?.startsWith('RH-P4') ||
        item.sierraCode?.startsWith('MV-GS') ||
        item.sierraCode?.startsWith('ET-R90') ||
        item.sierraCode?.startsWith('HP-GR') ||
        item.sierraCode?.startsWith('SL-HAF') ||
        item.sierraCode?.startsWith('BD-PH') ||
        item.sierraCode?.startsWith('VS-3A') ||
        item.sierraCode?.startsWith('MV-POOL') ||
        item.sierraCode?.startsWith('HP-LAKE')
    ).length;
    const saleCount = all.filter((x) => x.operation === 'Sale' || x.mode === 'sale').length;
    const rentCount = all.filter((x) => x.operation === 'Rent' || x.mode === 'rent').length;
    const newCount = all.filter((x) => Boolean(x.isNewListing)).length;
    const monthCount = all.filter((x) => {
      if (!x.listedAt) return true;
      const ts = new Date(x.listedAt).getTime();
      return isNaN(ts) || Date.now() - ts <= 30 * 24 * 60 * 60 * 1000;
    }).length;

    return {
      total: all.length,
      owners: ownersCount,
      whatsapp: whatsappCount,
      sale: saleCount,
      rent: rentCount,
      new: newCount,
      month: monthCount,
    };
  }, [allListingsData]);

  return (
    <div className="space-y-6" data-testid="admin-listings-view">
      {/* Top Header & Subnav */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>{isAr ? 'قاعدة بيانات العقارات والمخزون الحصري' : 'Luxury Inventory & Listings Hub'}</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800">
              {stats.total} {isAr ? 'وحدة نشطة' : 'Live Units'}
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isAr
              ? 'إدارة العقارات والوحدات المتاحة والمدرجة تلقائياً عبر محفظة سييرا وشبكة الوسطاء المعتمدة'
              : 'Unified architectural portfolio with verified Sierra inventory and broker network.'}
          </p>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Master Excel Download Button */}
          <a
            href="https://raw.githubusercontent.com/sierrablue8866-droid/SE-Vercel-deploy-main/main/apps/sierra-estates-realty/data/sierra-estates-master-inventory.csv"
            target="_blank"
            rel="noopener noreferrer"
            download="sierra-estates-master-inventory.csv"
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isAr ? 'تحميل الشيت الرئيسي (CSV/Excel)' : 'Master Sheet (Excel)'}</span>
          </a>

          {/* Tab Controls */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'inventory'
                  ? 'bg-linear-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>{isAr ? 'المخزون' : 'All Listings'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('valuation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'valuation'
                  ? 'bg-linear-to-r from-emerald-600 to-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-300" />
              <span>{isAr ? 'التقييم والمراجحة' : 'Valuation & Arbitrage'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('easy-listing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'easy-listing'
                  ? 'bg-linear-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? 'الإدراج الذكي' : 'Easy Add'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('brochure')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'brochure'
                  ? 'bg-linear-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isAr ? 'بروشور PDF' : 'PDF Teaser'}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-400">
            {isLoadingLiveListings
              ? (isAr ? 'جاري جلب بيانات Property Finder...' : 'Fetching live Property Finder inventory...')
              : liveListingsError
                ? (isAr ? 'يتم عرض النسخة المحلية الاحتياطية' : 'Showing the committed fallback inventory')
                : (isAr ? 'متصل بالمخزون الموحد من Property Finder وSupabase' : 'Live Property Finder / Supabase inventory connected')}
          </span>
          <span className="px-2 py-1 rounded-md border border-orange-500/30 bg-orange-500/10 text-orange-300">
            {allListingsData.filter((item) => item.syncSource === 'property-finder').length} Property Finder
          </span>
        </div>
      </div>

      {/* Tab 1: Valuation & Arbitrage Studio */}
      {activeTab === 'valuation' && <ValuationArbitrageStudio lang={lang} />}

      {/* Tab 2: Easy Listing Studio */}
      {activeTab === 'easy-listing' && (
        <EasyListingStudio lang={lang} onListingPublished={() => setActiveTab('inventory')} />
      )}

      {/* Tab 3: PDF Brochure & Teaser */}
      {activeTab === 'brochure' && <PropertyTeaserBrochure />}

      {/* Tab 4: Unified Inventory Table */}
      {activeTab === 'inventory' && (
        <div className="space-y-5">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400">{isAr ? 'إجمالي المخزون النشط' : 'Total Active Units'}</div>
              <div className="text-xl font-bold text-white mt-1">{stats.total}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-emerald-400 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>{isAr ? 'محفظة حصرية' : 'Exclusive Portfolio'}</span>
              </div>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {stats.owners} {isAr ? 'وحدة' : 'Units'}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-cyan-400">{isAr ? 'عقارات للبيع' : 'Units For Sale'}</div>
              <div className="text-xl font-bold text-cyan-400 mt-1">{stats.sale}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-amber-400">{isAr ? 'عقارات للإيجار' : 'Units For Rent'}</div>
              <div className="text-xl font-bold text-amber-400 mt-1">{stats.rent}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-purple-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isAr ? 'مدرج حديثاً (48س)' : 'New Listings'}</span>
              </div>
              <div className="text-xl font-bold text-purple-400 mt-1">{stats.new}</div>
            </div>
          </div>

          {/* Search & Filter Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={
                  isAr
                    ? 'بحث بالكود، الكمبوند، النوع، أو المالك...'
                    : 'Search by code, compound, type, owner, keyword...'
                }
                className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Filter Pills & Zone Selector */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Zone Filter Dropdown */}
              <select
                value={zoneFilter}
                onChange={(e) => {
                  setZoneFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-cyan-400 font-semibold focus:outline-none focus:border-cyan-500"
              >
                <option value="all">{isAr ? 'جميع المناطق / الكمبوندات' : '🌐 All Zones & Compounds'}</option>
                {availableZones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>

              {[
                { id: 'all', label: isAr ? `الكل (${stats.total})` : `All (${stats.total})` },
                {
                  id: 'month',
                  label: isAr ? `📅 آخر شهر (${stats.month})` : `📅 Last 30 Days (${stats.month})`,
                },
                {
                  id: 'owners',
                  label: isAr ? `🟢 محفظة حصرية (${stats.owners})` : `🟢 Exclusive Portfolio (${stats.owners})`,
                },
                { id: 'sale', label: isAr ? `للبيع (${stats.sale})` : `For Sale (${stats.sale})` },
                { id: 'rent', label: isAr ? `للإيجار (${stats.rent})` : `For Rent (${stats.rent})` },
                { id: 'new', label: isAr ? `🆕 حديث (${stats.new})` : `🆕 New (<48h)` },
                { id: 'villa', label: isAr ? 'فيلات وتوين' : 'Villas & Twins' },
                { id: 'apartment', label: isAr ? 'شقق ودوبلكس' : 'Apartments' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setSelectedFilter(f.id as any);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedFilter === f.id
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <button
                onClick={() => setActiveTab('easy-listing')}
                className="ml-auto px-3 py-1.5 bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-lg shadow-md flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isAr ? '+ إضافة عقار' : '+ Easy Add Listing'}</span>
              </button>
            </div>
          </div>

          {/* Bulk Action Bar (when rows are selected) */}
          {selectedListingIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-linear-to-r from-cyan-950/80 via-slate-900 to-cyan-950/80 border border-cyan-500/50 shadow-lg animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-cyan-600 text-white font-bold text-xs">
                  {selectedListingIds.length} {isAr ? 'عقارات محددة' : 'Selected'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedListingIds([])}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  {isAr ? 'إلغاء التحديد' : 'Deselect All'}
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Bulk Status Dropdown & Apply */}
                <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400">{isAr ? 'تغيير الحالة:' : 'Set Status:'}</span>
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    className="bg-transparent text-xs text-white font-medium focus:outline-none"
                  >
                    <option value="Available" className="bg-slate-900 text-white">Available</option>
                    <option value="Reserved" className="bg-slate-900 text-white">Reserved</option>
                    <option value="Sold" className="bg-slate-900 text-white">Sold</option>
                    <option value="Archived" className="bg-slate-900 text-white">Archived</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleApplyBulkStatus}
                    className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold transition-colors"
                  >
                    {isAr ? 'تطبيق' : 'Apply'}
                  </button>
                </div>

                {/* Export Selected to CSV */}
                <button
                  type="button"
                  onClick={handleExportSelectedCSV}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isAr ? 'تصدير المحدد (CSV)' : 'Export Selected'}</span>
                </button>

                {/* Bulk Broadcast via WhatsApp */}
                <button
                  type="button"
                  onClick={() => {
                    setBulkNotification(`Created draft WhatsApp broadcast batch for ${selectedListingIds.length} properties.`);
                    setTimeout(() => setBulkNotification(null), 4000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>💬</span>
                  <span>{isAr ? 'إرسال عبر واتساب' : 'WhatsApp Broadcast'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Bulk Notification Banner */}
          {bulkNotification && (
            <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fadeIn">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{bulkNotification}</span>
            </div>
          )}

          {/* Results Summary */}
          <div className="flex justify-between items-center text-xs text-slate-400 px-1">
            <span>
              {isAr
                ? `عرض ${filteredListings.length} عقار من إجمالي ${stats.total}`
                : `Showing ${filteredListings.length} matching units (Page ${currentPage} of ${totalPages || 1})`}
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-cyan-400 hover:underline text-xs"
              >
                {isAr ? 'مسح البحث' : 'Clear search'}
              </button>
            )}
          </div>

          {/* Valuation Quick Modal / Drawer when a row is evaluated */}
          {activeValuationUnit && (
            <div className="p-4 rounded-2xl bg-linear-to-r from-slate-900 via-emerald-950/30 to-slate-900 border border-emerald-500/40 space-y-3 animate-fadeIn shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white font-mono uppercase">
                    VALUATION & ARBITRAGE ASSESSMENT: {activeValuationUnit.sierraCode || activeValuationUnit.code}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveValuationUnit(null)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg"
                >
                  ✕ Close
                </button>
              </div>

              {(() => {
                const evalRes = evaluatePropertyValuation({
                  property_type: activeValuationUnit.type || 'apartment',
                  size_sqm: activeValuationUnit.area_sqm || activeValuationUnit.area,
                  location: activeValuationUnit.compound || activeValuationUnit.location,
                  offered_purchase_price: activeValuationUnit.price || undefined,
                  offered_rent: activeValuationUnit.operation === 'Rent' ? activeValuationUnit.price : undefined,
                  amenities: ['underground parking'],
                });

                return (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 font-mono">AI VERDICT</span>
                      <div className="text-emerald-300 font-bold mt-0.5">{evalRes.verdict}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 font-mono">PAYBACK PERIOD</span>
                      <div className="text-white font-bold font-mono mt-0.5">
                        {evalRes.investment_metrics.payback_period_years
                          ? `${evalRes.investment_metrics.payback_period_years} Yrs`
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 font-mono">IMPLIED CAP RATE</span>
                      <div className="text-cyan-300 font-bold font-mono mt-0.5">
                        {evalRes.offered_price_assessment.implied_cap_rate_pct
                          ? `${evalRes.offered_price_assessment.implied_cap_rate_pct}%`
                          : '8.5% Base'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 font-mono">FAIR VALUE SPECTRUM</span>
                      <div className="text-amber-300 font-bold font-mono mt-0.5">
                        {(evalRes.calculated_fair_value_range.conservative_cap_value / 1000000).toFixed(1)}M -{' '}
                        {(evalRes.calculated_fair_value_range.premium_adjusted_optimistic / 1000000).toFixed(1)}M EGP
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      aria-label="Select all listings on page"
                      checked={
                        paginatedListings.length > 0 &&
                        paginatedListings.every((i) =>
                          selectedListingIds.includes(i.sierraCode || i.code || `SE-${i.id}`)
                        )
                      }
                      onChange={handleToggleSelectAllPage}
                      className="rounded border-slate-700 bg-slate-900 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5">Code / Ref</th>
                  <th className="p-3.5">Compound & Location</th>
                  <th className="p-3.5">Property Specs</th>
                  <th className="p-3.5">Price & Mode</th>
                  <th className="p-3.5">Source & Owner</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-center">AI Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {paginatedListings.map((item, idx) => {
                  const isOwner =
                    item.sourceType === 'owner' || (item.ownerType || '').toLowerCase() === 'owner';
                  const isRent = item.operation === 'Rent' || item.mode === 'rent';
                  const code = item.sierraCode || item.code || `SE-${item.id}`;
                  const isSelected = selectedListingIds.includes(code);

                  return (
                    <tr
                      key={code || item.id || idx}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-cyan-950/30' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Select listing ${code}`}
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(code)}
                          className="rounded border-slate-700 bg-slate-900 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-cyan-400">{code}</div>
                        {item.isNewListing && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-800/60">
                            NEW
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-white">
                          {item.compound || item.location || 'New Cairo'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.location || item.zone || '5th Settlement'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-200 font-medium">{item.type || 'Apartment'}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.bedrooms || item.beds || 3} Beds · {item.bathrooms || item.baths || 2} Baths ·{' '}
                          {item.area_sqm || item.area || 200} m²
                          {item.gardenArea ? ` (+${item.gardenArea}m² gdn)` : ''}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-white">
                          {item.priceFormatted ||
                            (item.price > 0 ? `${item.price.toLocaleString()} EGP` : 'Price on Call')}
                        </div>
                        <span
                          className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            isRent
                              ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                              : 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                          }`}
                        >
                          {isRent ? (isAr ? 'إيجار' : 'Rent') : isAr ? 'للبيع' : 'Sale'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 text-slate-300">
                          {isOwner ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center gap-0.5">
                              <UserCheck className="w-2.5 h-2.5" />
                              <span>{isAr ? 'مالك مباشر' : 'Owner'}</span>
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-950 text-blue-400 border border-blue-800/60">
                              {isAr ? 'وسيط' : 'Broker'}
                            </span>
                          )}
                          <span className="font-medium text-xs truncate max-w-30">
                            {item.ownerName || item.contact_info || 'Direct Client'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                          <span>{item.sourceGroup || item.ago || 'Verified Sync'}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[11px] font-medium inline-block">
                          {item.status || 'Available'}
                        </span>
                        {item.finishing && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-25">
                            {item.finishing}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveValuationUnit(item)}
                            className="px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 font-mono text-[11px] font-bold flex items-center gap-1 transition-colors"
                            title="Instant AVM Valuation"
                          >
                            <Zap className="w-3 h-3 text-emerald-400" />
                            <span>Valuate</span>
                          </button>
                          <a
                            href={`/property/${encodeURIComponent(code)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 hover:bg-cyan-900 transition-colors"
                            title="Preview on Client Portal"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={`https://wa.me/201092048333?text=${encodeURIComponent(
                              `Hello Sierra Estates Broker Desk — Inquiring about ${code} in ${item.compound || item.location || 'New Cairo'}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900 transition-colors"
                            title="Chat on WhatsApp"
                          >
                            <span className="text-xs">💬</span>
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isAr ? '← السابق' : '← Previous'}
              </button>
              <div className="text-xs text-slate-400">
                {isAr ? `صفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isAr ? 'التالي →' : 'Next →'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Accidental Data Loss Guard Modal for Bulk Operations */}
      <AccidentalDataLossGuardModal
        isOpen={isGuardModalOpen}
        title={{
          en: 'Bulk Archive Listings Safeguard',
          ar: 'حاجز الأمان لأرشفة العقارات جماعياً',
        }}
        actionDescription={{
          en: `You are about to set status to "${bulkStatus}" across ${selectedListingIds.length} properties.`,
          ar: `أنت على وشك تغيير الحالة إلى "${bulkStatus}" لـ ${selectedListingIds.length} عقاراً.`,
        }}
        impactSummary={{
          en: 'Archived listings will be hidden from public catalog discovery and Property Finder sync feed.',
          ar: 'العقارات المؤرشفة سيتم إخفاؤها من كتالوج البحث العام ومزامنة بروبرتي فايندر.',
        }}
        affectedCount={selectedListingIds.length}
        lang={lang}
        onConfirm={executeBulkStatusUpdate}
        onCancel={() => setIsGuardModalOpen(false)}
      />
    </div>
  );
}
