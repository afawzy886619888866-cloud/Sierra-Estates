'use client';

import React, { useState, useMemo } from 'react';
import EasyListingStudio from '@/components/admin/EasyListingStudio';
import { PropertyTeaserBrochure } from '@/components/admin/PropertyTeaserBrochure';
import { Sparkles, ListFilter, PlusCircle, FileText, Search, UserCheck, ShieldCheck } from 'lucide-react';
import consolidatedRaw from '@/data/consolidated-master-inventory.json';
import realListingsRaw from '@/data/real-listings.json';

// Use consolidated inventory when available, with fallback to realListingsRaw
const allListingsData = (consolidatedRaw && Array.isArray(consolidatedRaw) && consolidatedRaw.length > 0)
  ? consolidatedRaw
  : realListingsRaw;

export default function ListingsView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'inventory' | 'easy-listing' | 'brochure'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'owners' | 'whatsapp' | 'sale' | 'rent' | 'new' | 'villa' | 'apartment'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

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
      if (selectedFilter === 'villa') {
        const t = (item.type || '').toLowerCase();
        return t.includes('villa') || t.includes('twin') || t.includes('town');
      }
      if (selectedFilter === 'apartment') {
        const t = (item.type || '').toLowerCase();
        return t.includes('apartment') || t.includes('duplex') || t.includes('penthouse') || t.includes('garden');
      }

      return true;
    });
  }, [searchQuery, selectedFilter]);

  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredListings.slice(start, start + pageSize);
  }, [filteredListings, currentPage]);

  const totalPages = Math.ceil(filteredListings.length / pageSize);

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

    return {
      total: all.length,
      owners: ownersCount,
      whatsapp: whatsappCount,
      sale: saleCount,
      rent: rentCount,
      new: newCount,
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header & Subnav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>{isAr ? 'قاعدة بيانات العقارات والمخزون الحصري' : 'Luxury Inventory & Listings Hub'}</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800">
              {stats.total} {isAr ? 'وحدة نشطة' : 'Live Units'}
            </span>
          </h2>
          <p className="text-sm text-slate-400">
            {isAr
              ? 'إدارة العقارات والوحدات المتاحة والمدرجة تلقائياً عبر واتساب، الملاك المباشرين وشيت المخزون'
              : 'Unified architectural portfolio with verified direct owners, live WhatsApp ingestion, and master inventory.'}
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'inventory'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>{isAr ? 'جميع العقارات والمخزون' : 'All Listings'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('easy-listing')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'easy-listing'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAr ? 'الإدراج السريع الذكي' : 'Easy Listing Studio'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('brochure')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'brochure'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isAr ? 'بروشور استثماري PDF' : 'PDF Teaser & Brochure'}</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Easy Listing Studio */}
      {activeTab === 'easy-listing' && (
        <EasyListingStudio lang={lang} onListingPublished={() => setActiveTab('inventory')} />
      )}

      {/* Tab 2: PDF Brochure & Teaser */}
      {activeTab === 'brochure' && (
        <PropertyTeaserBrochure />
      )}

      {/* Tab 3: Unified Inventory Table */}
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
                <span>{isAr ? 'ملاك مباشرين' : 'Direct Owners'}</span>
              </div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{stats.owners} {isAr ? 'ملاك' : 'Units'}</div>
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
                placeholder={isAr ? 'بحث بالكود، الكمبوند، النوع، أو المالك...' : 'Search by code, compound, type, owner, keyword...'}
                className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: isAr ? `الكل (${stats.total})` : `All (${stats.total})` },
                { id: 'owners', label: isAr ? `🟢 ملاك مباشرين (${stats.owners})` : `🟢 Direct Owners (${stats.owners})` },
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
                className="ml-auto px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-lg shadow-md flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isAr ? '+ إضافة عقار' : '+ Easy Add Listing'}</span>
              </button>
            </div>
          </div>

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

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Code / Ref</th>
                  <th className="p-3.5">Compound & Location</th>
                  <th className="p-3.5">Property Specs</th>
                  <th className="p-3.5">Price & Mode</th>
                  <th className="p-3.5">Source & Owner</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-center">AI Match Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {paginatedListings.map((item, idx) => {
                  const isOwner = item.sourceType === 'owner' || (item.ownerType || '').toLowerCase() === 'owner';
                  const isRent = item.operation === 'Rent' || item.mode === 'rent';
                  const code = item.sierraCode || item.code || `SE-${item.id}`;

                  return (
                    <tr
                      key={code || item.id || idx}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-cyan-400">{code}</div>
                        {item.isNewListing && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-800/60">
                            NEW
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-white">{item.compound || item.location || 'New Cairo'}</div>
                        <div className="text-[11px] text-slate-400">{item.location || item.zone || '5th Settlement'}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-200 font-medium">{item.type || 'Apartment'}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.bedrooms || item.beds || 3} Beds · {item.bathrooms || item.baths || 2} Baths · {item.area_sqm || item.area || 200} m²
                          {item.gardenArea ? ` (+${item.gardenArea}m² gdn)` : ''}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-white">
                          {item.priceFormatted || (item.price > 0 ? `${item.price.toLocaleString()} EGP` : 'Price on Call')}
                        </div>
                        <span
                          className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            isRent
                              ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                              : 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                          }`}
                        >
                          {isRent ? (isAr ? 'إيجار' : 'Rent') : (isAr ? 'للبيع' : 'Sale')}
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
                          <span className="font-medium text-xs truncate max-w-[120px]">{item.ownerName || item.contact_info || 'Direct Client'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {item.sourceGroup || item.ago || 'Verified Sync'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[11px] font-medium inline-block">
                          {item.status || 'Available'}
                        </span>
                        {item.finishing && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[100px]">
                            {item.finishing}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="text-purple-400 font-bold text-xs bg-purple-950/50 px-2 py-1 rounded border border-purple-800/50">
                          {item.aiScore || 9.2} / 10
                        </span>
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
    </div>
  );
}
