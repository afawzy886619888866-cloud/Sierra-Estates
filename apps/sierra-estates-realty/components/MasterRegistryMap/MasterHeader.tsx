'use client';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Globe, Moon, Sun, Sparkles, Table2, Map, Box, FileText, ShieldCheck, Search, X, Building2, Home, ArrowUpRight } from 'lucide-react';
import { Compound, UnitListing, COMPOUNDS, UNIT_LISTINGS } from './registryData';

interface MasterHeaderProps {
  currentTab: 'map' | 'excel' | 'threed' | 'yield' | 'compounds' | 'radar' | 'dossier';
  onSelectTab: (tab: 'map' | 'excel' | 'threed' | 'yield' | 'compounds' | 'radar' | 'dossier') => void;
  lang: 'en' | 'ar';
  onToggleLang: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenConsultation: () => void;
  onSelectCompound?: (compound: Compound) => void;
  onSelectUnit?: (unit: UnitListing) => void;
}

export const MasterHeader: React.FC<MasterHeaderProps> = ({
  currentTab,
  onSelectTab,
  lang,
  onToggleLang,
  isDarkMode,
  onToggleTheme,
  onOpenConsultation,
  onSelectCompound,
  onSelectUnit,
}) => {
  const isAr = lang === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut `/` or `Cmd/Ctrl + K` to focus global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      } else if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return {
        compounds: COMPOUNDS.slice(0, 4),
        units: UNIT_LISTINGS.slice(0, 5),
        isDefault: true,
      };
    }

    const matchedCompounds = COMPOUNDS.filter(
      c =>
        c.nameEn.toLowerCase().includes(q) ||
        c.nameAr.toLowerCase().includes(q) ||
        c.developerEn.toLowerCase().includes(q) ||
        c.developerAr.toLowerCase().includes(q) ||
        c.zoneEn.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    ).slice(0, 6);

    const matchedUnits = UNIT_LISTINGS.filter(
      u =>
        u.unitCode.toLowerCase().includes(q) ||
        u.compoundNameEn.toLowerCase().includes(q) ||
        u.compoundNameAr.toLowerCase().includes(q) ||
        u.typeEn.toLowerCase().includes(q) ||
        u.typeAr.toLowerCase().includes(q) ||
        u.phaseEn.toLowerCase().includes(q)
    ).slice(0, 8);

    return {
      compounds: matchedCompounds,
      units: matchedUnits,
      isDefault: false,
    };
  }, [searchQuery]);

  const handleCompoundClick = (compound: Compound) => {
    if (onSelectCompound) {
      onSelectCompound(compound);
    } else {
      onSelectTab('excel');
    }
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleUnitClick = (unit: UnitListing) => {
    if (onSelectUnit) {
      onSelectUnit(unit);
    }
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <header className={`w-full border-b transition-colors duration-200 sticky top-0 z-50 ${
      isDarkMode 
        ? 'bg-[#080E1A]/95 border-amber-900/40 text-stone-100 backdrop-blur-md' 
        : 'bg-[#FAF8F5]/95 border-[#E6DEC8] text-stone-900 backdrop-blur-md'
    }`}>
      {/* Top Bar Contract: Brand — Nav Links — Global Search & Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        
        {/* Zone 1: Brand Wordmark with Official Sierra Estates Logo Image */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('map')}
            className="flex items-center gap-3 text-left cursor-pointer group"
          >
            <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-cyan-500/40 bg-stone-900 shadow-md group-hover:border-cyan-400 transition-all p-0.5 flex items-center justify-center">
              <img 
                src="/assets/aistudio/8e9559f6f_image__1__4350f848.png" 
                alt="Sierra Estates Logo"
                className="w-full h-full object-contain filter drop-shadow-xs"
              />
            </div>
            <div className="flex flex-col">
              <span className={`text-base font-extrabold tracking-widest uppercase font-cinzel ${
                isDarkMode ? 'text-white' : 'text-stone-900'
              }`}>
                {isAr ? 'سيرّا العقارية' : 'SIERRA ESTATES'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono tracking-wider uppercase text-cyan-600 dark:text-cyan-400 font-bold">
                  {isAr ? 'مستقبل العقارات' : 'FUTURE OF REAL ESTATES'}
                </span>
                <span className="text-stone-300 dark:text-stone-700">·</span>
                <a
                  href="https://sierra-estates.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[9px] font-mono text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                  title="Visit official portal: sierra-estates.net"
                >
                  <span>sierra-estates.net</span>
                </a>
              </div>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation links */}
        <nav className="hidden xl:flex items-center gap-5 text-xs font-semibold tracking-wide uppercase">
          <button
            onClick={() => onSelectTab('map')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
              currentTab === 'map'
                ? 'text-amber-600 border-b-2 border-amber-600 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>{isAr ? 'الخريطة التفاعلية' : 'Master Plan'}</span>
          </button>

          <button
            onClick={() => onSelectTab('excel')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
              currentTab === 'excel'
                ? 'text-emerald-600 border-b-2 border-emerald-600 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
            }`}
          >
            <Table2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAr ? 'جدول الإكسيل' : 'Units Excel'}</span>
          </button>

          <button
            onClick={() => onSelectTab('yield')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
              currentTab === 'yield'
                ? 'text-cyan-500 border-b-2 border-cyan-500 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            <span>{isAr ? 'عوائد الإيجار' : 'Yield Heatmap'}</span>
          </button>

          <button
            onClick={() => onSelectTab('threed')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
              currentTab === 'threed'
                ? 'text-sky-500 border-b-2 border-sky-500 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-sky-500" />
            <span>{isAr ? 'مجسم 3D' : '3D Scene'}</span>
          </button>

          <button
            onClick={() => onSelectTab('compounds')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
              currentTab === 'compounds'
                ? 'text-amber-600 border-b-2 border-amber-600 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
            }`}
          >
            {isAr ? 'المشروعات' : 'Compounds'}
          </button>

          <button
            onClick={() => onSelectTab('radar')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
              currentTab === 'radar'
                ? 'text-amber-600 border-b-2 border-amber-600 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
            }`}
          >
            {isAr ? 'مسافات AUC' : 'AUC Matrix'}
          </button>

          <button
            onClick={() => onSelectTab('dossier')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 flex items-center gap-1 ${
              currentTab === 'dossier'
                ? 'text-amber-600 border-b-2 border-amber-600 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isAr ? 'الملف' : 'Dossier'}</span>
          </button>
        </nav>

        {/* Zone 3: Global Registry Search + Language, Theme & Primary Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          {/* Global Search Input & Instant Dropdown */}
          <div ref={searchContainerRef} className="relative w-44 sm:w-56 md:w-64">
            <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
              isDarkMode
                ? 'bg-[#0E1729] border-stone-700/80 focus-within:border-amber-400 text-stone-100'
                : 'bg-white border-stone-300 focus-within:border-amber-600 text-stone-900 shadow-2xs'
            }`}>
              <Search className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                placeholder={isAr ? 'ابحث عن كمبوند أو كود وحدة...' : 'Search compound or unit code...'}
                className="w-full bg-transparent outline-none text-xs placeholder:text-stone-400 dark:placeholder:text-stone-500 font-mono"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className={`hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono rounded border ${
                  isDarkMode ? 'bg-stone-800 border-stone-700 text-stone-400' : 'bg-stone-100 border-stone-200 text-stone-500'
                }`}>
                  /
                </kbd>
              )}
            </div>

            {/* Global Search Results Dropdown */}
            {isSearchOpen && (
              <div className={`absolute ${isAr ? 'left-0' : 'right-0'} mt-2 w-80 sm:w-96 rounded-xl border shadow-2xl overflow-hidden z-50 animate-fade-in ${
                isDarkMode
                  ? 'bg-[#0A1220] border-amber-500/30 text-stone-100'
                  : 'bg-[#FAF8F5] border-amber-600/30 text-stone-900'
              }`}>
                <div className="px-3.5 py-2 bg-gradient-to-r from-amber-500/15 via-transparent to-transparent border-b border-stone-200 dark:border-stone-800 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  <span>
                    {searchResults.isDefault
                      ? (isAr ? 'بحث سريع في السجل العقاري' : 'QUICK REGISTRY DIRECTORY')
                      : (isAr ? `نتائج البحث عن "${searchQuery}"` : `RESULTS FOR "${searchQuery}"`)}
                  </span>
                  <span>{COMPOUNDS.length} {isAr ? 'كمبوند' : 'Compounds'} · {UNIT_LISTINGS.length} {isAr ? 'وحدة' : 'Units'}</span>
                </div>

                <div className="max-h-96 overflow-y-auto divide-y divide-stone-200/70 dark:divide-stone-800/80">
                  {/* Matching Compounds Section */}
                  {searchResults.compounds.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
                        <Building2 className="w-3 h-3" />
                        <span>{isAr ? 'المشروعات والكمبوندات' : 'Compounds'} ({searchResults.compounds.length})</span>
                      </div>
                      <div className="space-y-1 mt-1">
                        {searchResults.compounds.map((comp) => (
                          <button
                            key={comp.id}
                            type="button"
                            onClick={() => handleCompoundClick(comp)}
                            className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              isDarkMode
                                ? 'hover:bg-stone-800/80'
                                : 'hover:bg-amber-50/80'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold font-cinzel truncate text-stone-900 dark:text-white flex items-center gap-1.5">
                                <span>{isAr ? comp.nameAr : comp.nameEn}</span>
                                <span className="text-[10px] font-mono font-normal text-amber-600 dark:text-amber-400">
                                  ({comp.developerEn})
                                </span>
                              </div>
                              <div className="text-[10px] font-mono text-stone-500 dark:text-stone-400 truncate">
                                {isAr ? comp.zoneAr : comp.zoneEn} · Avg EGP {comp.avgMeterPriceEgp.toLocaleString()}/m²
                              </div>
                            </div>
                            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <span>{isAr ? 'الإكسيل' : 'Excel'}</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Unit Codes Section */}
                  {searchResults.units.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1.5">
                        <Home className="w-3 h-3" />
                        <span>{isAr ? 'أكواد الوحدات (بيع وإيجار)' : 'Unit Codes & Listings'} ({searchResults.units.length})</span>
                      </div>
                      <div className="space-y-1 mt-1">
                        {searchResults.units.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleUnitClick(u)}
                            className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              isDarkMode
                                ? 'hover:bg-stone-800/80'
                                : 'hover:bg-amber-50/80'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">
                                  {u.unitCode}
                                </span>
                                <span className="text-stone-400">·</span>
                                <span className="text-xs font-semibold truncate text-stone-800 dark:text-stone-200">
                                  {isAr ? u.compoundNameAr : u.compoundNameEn}
                                </span>
                              </div>
                              <div className="text-[10px] font-mono text-stone-500 dark:text-stone-400">
                                {isAr ? u.typeAr : u.typeEn} · {u.buaM2} m² · {u.bedrooms} BR
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-bold font-mono text-stone-900 dark:text-amber-300">
                                {(u.resalePriceEgp / 1_000_000).toFixed(1)}M EGP
                              </div>
                              <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                                {isAr ? 'إيجار' : 'Rent'}: {(u.monthlyRentEgp / 1000).toFixed(0)}K/mo
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {searchResults.compounds.length === 0 && searchResults.units.length === 0 && (
                    <div className="p-6 text-center text-xs font-mono text-stone-500">
                      {isAr
                        ? `لا توجد نتائج مطابقة لـ "${searchQuery}"`
                        : `No compounds or unit codes matching "${searchQuery}"`}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Language Switcher */}
          <button
            onClick={onToggleLang}
            title={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-stone-300 dark:border-stone-700 hover:border-amber-600 dark:hover:border-amber-500 transition-colors text-stone-700 dark:text-stone-300 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-mono">{isAr ? 'EN' : 'عربي'}</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={onToggleTheme}
            title={isDarkMode ? (isAr ? 'التبديل إلى النسخة التحريرية المضيئة' : 'Switch to Light Editorial Edition') : (isAr ? 'التبديل إلى النسخة الليلية الفاخرة' : 'Switch to Obsidian Dark Edition')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-stone-300 dark:border-stone-700 hover:border-amber-600 dark:hover:border-amber-400 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline font-mono text-[11px]">{isAr ? 'مضيء' : 'Light'}</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline font-mono text-[11px]">{isAr ? 'ليلي' : 'Dark'}</span>
              </>
            )}
          </button>

          {/* Primary Action Button */}
          <button
            onClick={onOpenConsultation}
            className="px-3.5 py-2 text-xs font-bold tracking-wider uppercase text-amber-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-500 hover:to-amber-600 rounded-md shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 border border-amber-300/40"
          >
            <ShieldCheck className="w-4 h-4 text-amber-900" />
            <span className="hidden md:inline">{isAr ? 'حجز معاينة واستشارة' : 'Rent & Resale Desk'}</span>
          </button>
        </div>

      </div>
    </header>
  );
};
