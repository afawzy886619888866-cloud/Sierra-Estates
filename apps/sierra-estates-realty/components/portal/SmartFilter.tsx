'use client';

import React from 'react';
import { useI18n } from '@/lib/I18nContext';
import { EN, AR } from '@/app/client/copy';
import { Filter, RotateCcw, MapPin, Bed, Building } from 'lucide-react';

export interface MapFilters {
  compound: string;
  type: string;
  beds: string;
  maxPrice: number;
}

interface SmartFilterProps {
  filters: MapFilters;
  onFilterChange: (filters: MapFilters) => void;
  onReset: () => void;
  compounds: string[];
}

export default function SmartFilter({
  filters,
  onFilterChange,
  onReset,
  compounds,
}: SmartFilterProps) {
  const { locale } = useI18n();
  const isAr = locale === 'ar';
  const t = isAr ? AR : EN;

  return (
    <div className="bg-[#0b1329]/90 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 text-white shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Filter className="w-4 h-4 text-amber-400" />
          <span>{isAr ? 'فلتر الخريطة الذكي' : 'Smart Map Filters'}</span>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Compound Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
            <Building className="w-3 h-3 text-amber-400" />
            <span>{t.fLoc}</span>
          </label>
          <select
            value={filters.compound}
            onChange={(e) => onFilterChange({ ...filters, compound: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
          >
            <option value="all" className="bg-[#0b1329] text-slate-300">
              {isAr ? 'جميع الكمبوندات' : 'All Compounds'}
            </option>
            {compounds.map((cpd) => (
              <option key={cpd} value={cpd} className="bg-[#0b1329] text-white">
                {cpd}
              </option>
            ))}
          </select>
        </div>

        {/* Property Type */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-amber-400" />
            <span>{t.fType}</span>
          </label>
          <select
            value={filters.type}
            onChange={(e) => onFilterChange({ ...filters, type: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
          >
            <option value="all" className="bg-[#0b1329] text-slate-300">{t.filterAll}</option>
            <option value="Villa" className="bg-[#0b1329] text-white">{t.filterVilla}</option>
            <option value="Apartment" className="bg-[#0b1329] text-white">{t.filterApt}</option>
            <option value="Townhouse" className="bg-[#0b1329] text-white">{t.filterTown}</option>
            <option value="Penthouse" className="bg-[#0b1329] text-white">{t.filterPent}</option>
          </select>
        </div>

        {/* Bedrooms */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
            <Bed className="w-3 h-3 text-amber-400" />
            <span>{t.fBeds}</span>
          </label>
          <select
            value={filters.beds}
            onChange={(e) => onFilterChange({ ...filters, beds: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
          >
            <option value="all" className="bg-[#0b1329] text-slate-300">{t.filterAll}</option>
            <option value="1" className="bg-[#0b1329] text-white">1 {t.beds}</option>
            <option value="2" className="bg-[#0b1329] text-white">2 {t.beds}</option>
            <option value="3" className="bg-[#0b1329] text-white">3 {t.beds}</option>
            <option value="4" className="bg-[#0b1329] text-white">4 {t.beds}</option>
            <option value="5" className="bg-[#0b1329] text-white">5+ {t.beds}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
