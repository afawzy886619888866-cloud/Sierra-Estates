'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useI18n } from '@/lib/I18nContext';
import SmartFilter, { MapFilters } from './SmartFilter';
import { Compass, MapPin, ArrowRight, ArrowLeft } from 'lucide-react';
import { NEW_CAIRO_COMPOUNDS, CompoundLocation } from '@/components/Maps/compounds-data';

const LiveMapDynamic = dynamic(() => import('@/components/Maps/LiveMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[480px] bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-mono">Loading New Cairo Map Engine...</span>
    </div>
  ),
});

export default function SmartMap() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';

  const [filters, setFilters] = useState<MapFilters>({
    compound: 'all',
    type: 'all',
    beds: 'all',
    maxPrice: 100000000,
  });

  const [selectedCompound, setSelectedCompound] = useState<CompoundLocation | null>(null);

  const compoundNames = useMemo(() => {
    return NEW_CAIRO_COMPOUNDS.map((c) => (isAr ? c.nameAr : c.nameEn));
  }, [isAr]);

  const handleReset = () => {
    setFilters({
      compound: 'all',
      type: 'all',
      beds: 'all',
      maxPrice: 100000000,
    });
    setSelectedCompound(null);
  };

  return (
    <section id="map-section" className="py-16 sm:py-24 bg-[#070c18] border-b border-white/10 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'الخريطة الجغرافية المباشرة' : 'Spatial Intelligence'}</span>
            </div>
            <h2 className="font-serif font-black text-2xl sm:text-4xl text-white tracking-tight">
              {isAr ? 'خريطة كمبوندات القاهرة الجديدة التفاعلية' : 'Interactive New Cairo Compounds Map'}
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-2">
              {isAr
                ? 'استكشف مواقع 29 كمبوند في التجمع الخامس، الجولدن سكوير، وشرق القاهرة مع إحصاءات الوحدات والأسعار المباشرة.'
                : 'Explore 29 premier gated communities across Golden Square, Katameya, and New Cairo with live inventory pins.'}
            </p>
          </div>

          <Link
            href="/map"
            className="inline-flex items-center gap-2 text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors group self-start md:self-auto"
          >
            <span>{isAr ? 'فتح الخريطة بكامل الشاشة' : 'Full Screen Map View'}</span>
            {isAr ? (
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            ) : (
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            )}
          </Link>
        </div>

        {/* Map & Filters Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Filters Sidebar / Controls */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <SmartFilter
              filters={filters}
              onFilterChange={setFilters}
              onReset={handleReset}
              compounds={compoundNames}
            />

            {/* Selected Compound Preview Card */}
            {selectedCompound ? (
              <div className="bg-[#0f172a] border border-amber-500/40 rounded-2xl p-5 text-white shadow-xl animate-fade-in">
                <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block mb-1">
                  {selectedCompound.code} · {selectedCompound.developer}
                </span>
                <h4 className="font-serif font-bold text-lg text-white">
                  {isAr ? selectedCompound.nameAr : selectedCompound.nameEn}
                </h4>
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {selectedCompound.unitsCount} {isAr ? 'وحدة متاحة' : 'Units Listed'}
                  </span>
                  <Link
                    href={`/properties?compound=${encodeURIComponent(selectedCompound.nameEn)}`}
                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                  >
                    <span>{isAr ? 'عرض الوحدات' : 'View Units'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-slate-400 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {isAr
                    ? 'انقر على أي كمبوند على الخريطة لعرض تفاصيل الوحدات والأسعار المتاحة.'
                    : 'Click any compound pin on the map to inspect unit inventory and live asking prices.'}
                </span>
              </div>
            )}
          </div>

          {/* Leaflet Map Embed Container */}
          <div className="lg:col-span-3 aspect-[16/10] sm:aspect-[16/9] w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 shadow-2xl relative z-0">
            <LiveMapDynamic
              mode="dark"
              selectedCode={selectedCompound?.code}
              onSelectCompound={(c) => setSelectedCompound(c)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
