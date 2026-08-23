'use client';

import React, { useState, useMemo } from 'react';
import EasyListingStudio from '@/components/admin/EasyListingStudio';
import { PropertyTeaserBrochure } from '@/components/admin/PropertyTeaserBrochure';
import { Sparkles, ListFilter, PlusCircle, FileText, Search, MessageSquare, Tag } from 'lucide-react';
import realListingsRaw from '@/data/real-listings.json';

export default function ListingsView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'inventory' | 'easy-listing' | 'brochure'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'whatsapp' | 'sale' | 'rent' | 'villa' | 'apartment'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Filter listings
  const filteredListings = useMemo(() => {
    return (realListingsRaw as any[]).filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        item.code?.toLowerCase().includes(q) ||
        item.compound?.toLowerCase().includes(q) ||
        item.cmp?.toLowerCase().includes(q) ||
        item.zone?.toLowerCase().includes(q) ||
        item.type?.toLowerCase().includes(q) ||
        item.comment?.toLowerCase().includes(q) ||
        item.ownerName?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (selectedFilter === 'whatsapp') {
        return (
          item.ago?.toLowerCase().includes('whatsapp') ||
          item.agent?.toLowerCase().includes('whatsapp') ||
          item.code?.startsWith('UNIT-WA') ||
          item.code?.startsWith('MD-B10') ||
          item.code?.startsWith('RH-P4') ||
          item.code?.startsWith('MV-GS') ||
          item.code?.startsWith('ET-R90') ||
          item.code?.startsWith('HP-GR') ||
          item.code?.startsWith('SL-HAF') ||
          item.code?.startsWith('BD-PH') ||
          item.code?.startsWith('VS-3A') ||
          item.code?.startsWith('MV-POOL') ||
          item.code?.startsWith('HP-LAKE')
        );
      }
      if (selectedFilter === 'sale') return item.mode === 'sale';
      if (selectedFilter === 'rent') return item.mode === 'rent';
      if (selectedFilter === 'villa') {
        const t = (item.type || '').toLowerCase();
        return t.includes('villa') || t.includes('twin') || t.includes('town');
      }
      if (selectedFilter === 'apartment') {
        const t = (item.type || '').toLowerCase();
        return t.includes('apartment') || t.includes('duplex') || t.includes('penthouse');
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
    const all = realListingsRaw as any[];
    const whatsappCount = all.filter(
      (item) =>
        item.ago?.toLowerCase().includes('whatsapp') ||
        item.agent?.toLowerCase().includes('whatsapp') ||
        item.code?.startsWith('UNIT-WA') ||
        item.code?.startsWith('MD-B10') ||
        item.code?.startsWith('RH-P4') ||
        item.code?.startsWith('MV-GS') ||
        item.code?.startsWith('ET-R90') ||
        item.code?.startsWith('HP-GR') ||
        item.code?.startsWith('SL-HAF') ||
        item.code?.startsWith('BD-PH') ||
        item.code?.startsWith('VS-3A') ||
        item.code?.startsWith('MV-POOL') ||
        item.code?.startsWith('HP-LAKE')
    ).length;
    const saleCount = all.filter((x) => x.mode === 'sale').length;
    const rentCount = all.filter((x) => x.mode === 'rent').length;

    return {
      total: all.length,
      whatsapp: whatsappCount,
      sale: saleCount,
      rent: rentCount,
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
              {realListingsRaw.length} {isAr ? 'وحدة متاحة' : 'Live Units'}
            </span>
          </h2>
          <p className="text-sm text-slate-400">
            {isAr
              ? 'إدارة العقارات والوحدات المتاحة والمدرجة تلقائياً عبر واتساب والذكاء الاصطناعي'
              : 'Complete unified inventory with live WhatsApp ingested units, direct owner resales, and verified rentals.'}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400">{isAr ? 'إجمالي المخزون النشط' : 'Total Active Units'}</div>
              <div className="text-xl font-bold text-white mt-1">{stats.total}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-emerald-400 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{isAr ? 'وارد الواتساب المباشر' : 'WhatsApp Ingested'}</span>
              </div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{stats.whatsapp} {isAr ? 'وحدات' : 'Units'}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-cyan-400">{isAr ? 'عقارات للبيع' : 'Units For Sale'}</div>
              <div className="text-xl font-bold text-cyan-400 mt-1">{stats.sale}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-amber-400">{isAr ? 'عقارات للإيجار' : 'Units For Rent'}</div>
              <div className="text-xl font-bold text-amber-400 mt-1">{stats.rent}</div>
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
                { id: 'all', label: isAr ? 'الكل' : 'All' },
                { id: 'whatsapp', label: isAr ? '📲 وارد واتساب' : '📲 WhatsApp Import' },
                { id: 'sale', label: isAr ? 'للبيع' : 'For Sale' },
                { id: 'rent', label: isAr ? 'للإيجار' : 'For Rent' },
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
                ? `عرض ${filteredListings.length} عقار من إجمالي ${realListingsRaw.length}`
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
                  <th className="p-3.5 text-center">AI Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {paginatedListings.map((item, idx) => {
                  const isWhatsApp =
                    item.ago?.toLowerCase().includes('whatsapp') ||
                    item.agent?.toLowerCase().includes('whatsapp') ||
                    item.code?.startsWith('UNIT-WA') ||
                    item.code?.startsWith('MD-B10') ||
                    item.code?.startsWith('RH-P4') ||
                    item.code?.startsWith('MV-GS') ||
                    item.code?.startsWith('ET-R90') ||
                    item.code?.startsWith('HP-GR') ||
                    item.code?.startsWith('SL-HAF') ||
                    item.code?.startsWith('BD-PH') ||
                    item.code?.startsWith('VS-3A') ||
                    item.code?.startsWith('MV-POOL') ||
                    item.code?.startsWith('HP-LAKE');

                  return (
                    <tr
                      key={item.code || item.id || idx}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-cyan-400">{item.code || `SE-${item.id}`}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">#{item.id}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-white">{item.compound || item.cmp || 'New Cairo'}</div>
                        <div className="text-[11px] text-slate-400">{item.zone || '5th Settlement'}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-200 font-medium">{item.type || 'Apartment'}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.beds} Beds · {item.baths || item.bath || 2} Baths · {item.area} m²
                          {item.gardenArea ? ` (+${item.gardenArea}m² gdn/rf)` : ''}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-white">
                          {item.mode === 'rent'
                            ? `${(item.price || item.egpM || 0).toLocaleString()} EGP / mo`
                            : typeof item.egpM === 'number'
                            ? `${item.egpM}M EGP`
                            : `${item.price?.toLocaleString()} EGP`}
                        </div>
                        <span
                          className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            item.mode === 'rent'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                              : 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                          }`}
                        >
                          {item.mode === 'rent' ? (isAr ? 'إيجار' : 'Rent') : (isAr ? 'للبيع' : 'Sale')}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 text-slate-300">
                          {isWhatsApp && <span className="text-emerald-400 font-bold">📲</span>}
                          <span>{item.ownerName || item.agent || 'Owner Direct'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {isWhatsApp ? 'WhatsApp Multi-Device Gateway' : item.ago || 'Master Sheet Sync'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[11px] font-medium inline-block">
                          {item.status || 'Available'}
                        </span>
                        {item.tag && (
                          <div className="text-[10px] text-purple-400 mt-1 flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5" />
                            <span>{item.tag}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="text-purple-400 font-bold text-xs bg-purple-950/50 px-2 py-1 rounded border border-purple-800/50">
                          {item.aiScore || 9.0} / 10
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
