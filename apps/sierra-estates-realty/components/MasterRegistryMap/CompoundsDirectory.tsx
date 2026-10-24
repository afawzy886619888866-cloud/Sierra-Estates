'use client';
import React, { useState } from 'react';
import { Compound, COMPOUNDS } from './registryData';
import { Building, MapPin, Compass, Clock, ArrowRight, Shield, Layers } from 'lucide-react';

interface CompoundsDirectoryProps {
  lang: 'en' | 'ar';
  isDarkMode: boolean;
  onViewOnMap: (compound: Compound) => void;
  onSelectCompound: (compound: Compound) => void;
}

export const CompoundsDirectory: React.FC<CompoundsDirectoryProps> = ({
  lang,
  isDarkMode,
  onViewOnMap,
  onSelectCompound,
}) => {
  const isAr = lang === 'ar';
  const [activeZone, setActiveZone] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const zones = [
    { id: 'all', en: 'All Master Enclaves', ar: 'جميع المشروعات' },
    { id: 'Golden Square', en: 'Golden Square (المربع الذهبي)', ar: 'المربع الذهبي' },
    { id: 'Suez Road', en: 'Suez Road Axis', ar: 'محور طريق السويس' },
    { id: 'Eastern', en: 'Eastern Expansions & Mostakbal', ar: 'التوسعات الشرقية والمستقبل' },
    { id: 'South', en: 'South 90th & Sokhna', ar: 'التسعين الجنوبي ومحور السخنة' },
  ];

  const filtered = COMPOUNDS.filter(c => {
    const matchZone = activeZone === 'all' || c.zoneEn.includes(activeZone) || c.zoneAr.includes(activeZone);
    const matchSearch = 
      c.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      c.nameAr.includes(search) ||
      c.developerEn.toLowerCase().includes(search.toLowerCase());
    return matchZone && matchSearch;
  });

  return (
    <div className={`w-full max-w-7xl mx-auto px-4 py-8 ${isDarkMode ? 'text-stone-100' : 'text-stone-900'}`}>
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-amber-900/20 dark:border-amber-500/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-1">
            <span>{isAr ? 'دليل المجتمعات العمرانية' : 'MASTER DEVELOPMENTS COMPENDIUM'}</span>
            <span>·</span>
            <span>NEW CAIRO CITY & EASTERN EXPANSIONS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-cinzel text-stone-900 dark:text-white">
            {isAr ? 'دليل المشروعات والمطورين العقاريين' : 'Compounds & Developers Compendium'}
          </h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300 max-w-2xl">
            {isAr 
              ? 'السجل المفصل لمشروعات القاهرة الجديدة، شامل المساحات الإجمالية، المطورين، المسافات الدقيقة من الجامعة الأمريكية (AUC)، ومتوسط الأسعار.'
              : 'Official survey of all 23 master-planned residential developments depicted on the regional cartography, complete with acreage and infrastructure metrics.'
            }
          </p>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? 'ابحث عن اسم المشروع أو المطور...' : 'Filter by compound or developer...'}
            className="w-full px-3 py-2 text-xs rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 focus:outline-hidden focus:border-amber-600"
          />
        </div>
      </div>

      {/* Zone Pill Buttons */}
      <div className="my-6 flex items-center gap-2 overflow-x-auto pb-2">
        {zones.map(z => (
          <button
            key={z.id}
            onClick={() => setActiveZone(z.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
              activeZone === z.id
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-stone-700'
            }`}
          >
            {isAr ? z.ar : z.en}
          </button>
        ))}
      </div>

      {/* Grid of Compounds */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(compound => (
          <div
            key={compound.id}
            className={`rounded-xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
              compound.featured
                ? 'border-amber-400 dark:border-amber-500/50 bg-gradient-to-b from-amber-50/40 via-white to-white dark:from-stone-900 dark:to-stone-950 shadow-md ring-1 ring-amber-400/30'
                : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-amber-300'
            }`}
          >
            {/* Card Top */}
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-amber-700 dark:text-amber-400">
                    {compound.code} · {isAr ? compound.zoneAr : compound.zoneEn}
                  </span>
                  <h3 className="text-lg font-bold font-cinzel text-stone-900 dark:text-white mt-0.5">
                    {compound.nameEn}
                  </h3>
                  <div className="text-xs font-cairo font-bold text-stone-600 dark:text-stone-400">
                    {compound.nameAr}
                  </div>
                </div>

                {compound.featured && (
                  <span className="px-2 py-0.5 rounded-sm bg-amber-500/15 border border-amber-600/30 text-amber-800 dark:text-amber-300 font-mono text-[9px] uppercase font-bold tracking-wider shrink-0">
                    {isAr ? 'مشروع مميز' : 'Featured'}
                  </span>
                )}
              </div>

              {/* Developer */}
              <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-300">
                <Building className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-medium">{isAr ? 'المطور:' : 'Developer:'} {isAr ? compound.developerAr : compound.developerEn}</span>
              </div>

              {/* Description */}
              <p className="mt-3 text-xs text-stone-600 dark:text-stone-400 leading-relaxed line-clamp-3">
                {isAr ? compound.descriptionAr : compound.descriptionEn}
              </p>

              {/* Metrics Strip */}
              <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-md bg-stone-50 dark:bg-stone-850">
                  <div className="text-[10px] text-stone-400 font-mono">{isAr ? 'المساحة' : 'Master Area'}</div>
                  <div className="text-xs font-bold font-mono text-stone-800 dark:text-stone-200 mt-0.5">
                    {compound.areaHa} {isAr ? 'فدان' : 'Acres'}
                  </div>
                </div>

                <div className="p-2 rounded-md bg-stone-50 dark:bg-stone-850">
                  <div className="text-[10px] text-stone-400 font-mono">{isAr ? 'زمن الوصول AUC' : 'AUC Drive'}</div>
                  <div className="text-xs font-bold font-mono text-amber-700 dark:text-amber-400 mt-0.5">
                    {compound.driveTimeToAucMin} min
                  </div>
                </div>

                <div className="p-2 rounded-md bg-stone-50 dark:bg-stone-850">
                  <div className="text-[10px] text-stone-400 font-mono">{isAr ? 'الوحدات المتاحة' : 'Units Listed'}</div>
                  <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {compound.unitsCount}
                  </div>
                </div>
              </div>

              {/* Starting Price and Handover */}
              <div className="mt-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-stone-400 font-mono block">{isAr ? 'الأسعار تبدأ من:' : 'Starting From:'}</span>
                  <span className="font-bold font-mono text-stone-900 dark:text-amber-300">
                    EGP {(compound.startingPriceEgp / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 font-mono block">{isAr ? 'حالة التسليم:' : 'Handover Status:'}</span>
                  <span className="font-semibold text-stone-700 dark:text-stone-300 text-[11px]">
                    {isAr ? compound.deliveryStatusAr : compound.deliveryStatusEn}
                  </span>
                </div>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="p-3 bg-stone-50 dark:bg-stone-850/60 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
              <button
                onClick={() => onViewOnMap(compound)}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 hover:text-amber-900 transition-colors cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{isAr ? 'تحديد على الخريطة' : 'Locate on Map'}</span>
              </button>

              <button
                onClick={() => onSelectCompound(compound)}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-amber-600 transition-colors cursor-pointer"
              >
                <span>{isAr ? 'عرض الوحدات' : 'Inspect Units'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
