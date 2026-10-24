'use client';

import React, { useState, useEffect } from 'react';
import { MasterHeader } from './MasterHeader';
import { EditorialRibbon } from './EditorialRibbon';
import { CartographicMap } from './CartographicMap';
import { ExcelInventorySheet } from './ExcelInventorySheet';
import { ThreeMasterPlanView } from './ThreeMasterPlanView';
import { CompoundsDirectory } from './CompoundsDirectory';
import { DistanceMatrix } from './DistanceMatrix';
import { UnitDetailModal } from './UnitDetailModal';
import { VipInquiryModal } from './VipInquiryModal';
import { ExportDossierModal } from './ExportDossierModal';
import { YieldHeatmapView } from './YieldHeatmapView';
import { UnitListing, Compound, COMPOUNDS, UNIT_LISTINGS, hydrateRegistryWithLiveInventory } from './registryData';
import { Sparkles, ArrowUpRight, Moon, Sun, Building2 } from 'lucide-react';

interface SierraMasterRegistryAppProps {
  initialDarkMode?: boolean;
  initialCompoundId?: string;
}

export default function SierraMasterRegistryApp({
  initialDarkMode = false,
  initialCompoundId,
}: SierraMasterRegistryAppProps) {
  const [currentTab, setCurrentTab] = useState<'map' | 'excel' | 'threed' | 'yield' | 'compounds' | 'radar' | 'dossier'>('map');
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(initialDarkMode);

  // Selected compound for Excel and Blueprint views
  const [selectedCompound, setSelectedCompound] = useState<Compound>(() => {
    if (initialCompoundId) {
      const found = COMPOUNDS.find(
        c => c.id.toLowerCase() === initialCompoundId.toLowerCase() || c.nameEn.toLowerCase().includes(initialCompoundId.toLowerCase())
      );
      if (found) return found;
    }
    return COMPOUNDS[0];
  });

  // Live inventory sync state from /api/inventory
  const [liveInventoryCount, setLiveInventoryCount] = useState<number | null>(null);

  useEffect(() => {
    // Check URL search params for ?compound=... or ?theme=dark|light
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const themeParam = params.get('theme');
      if (themeParam === 'dark') setIsDarkMode(true);
      if (themeParam === 'light') setIsDarkMode(false);
      const cmpParam = params.get('compound');
      if (cmpParam) {
        const found = COMPOUNDS.find(
          c => c.id.toLowerCase() === cmpParam.toLowerCase() || c.nameEn.toLowerCase().includes(cmpParam.toLowerCase())
        );
        if (found) {
          setSelectedCompound(found);
        }
      }
    }

    // Wire with live /api/inventory endpoint and hydrate registry
    fetch('/api/inventory?limit=500')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && Array.isArray(data.units)) {
          const { unitListings } = hydrateRegistryWithLiveInventory(data.units, data.compoundCounts);
          setLiveInventoryCount(data.count || unitListings.length);
        }
      })
      .catch(() => {});
  }, []);

  // Selected unit for detail inspection
  const [inspectedUnit, setInspectedUnit] = useState<UnitListing | null>(null);

  // VIP Consultation modal
  const [isConsultationOpen, setIsConsultationOpen] = useState<boolean>(false);
  const [consultationUnit, setConsultationUnit] = useState<UnitListing | null>(null);
  const [consultationCompound, setConsultationCompound] = useState<Compound | null>(null);

  // Dossier modal
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  const toggleLang = () => setLang(prev => (prev === 'en' ? 'ar' : 'en'));
  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const handleSelectCompoundToExcel = (compound: Compound) => {
    setSelectedCompound(compound);
    setCurrentTab('excel');
  };

  const handleSelectUnit = (unit: UnitListing) => {
    setInspectedUnit(unit);
  };

  const handleBookViewing = (unit: UnitListing) => {
    setConsultationUnit(unit);
    setIsConsultationOpen(true);
  };

  const handleSearchSelectCompound = (compound: Compound) => {
    setSelectedCompound(compound);
    if (currentTab !== 'map' && currentTab !== 'excel') {
      setCurrentTab('map');
    }
  };

  const handleSearchSelectUnit = (unit: UnitListing) => {
    const parentCompound = COMPOUNDS.find(c => c.id === unit.compoundId);
    if (parentCompound) {
      setSelectedCompound(parentCompound);
    }
    setInspectedUnit(unit);
  };

  const isAr = lang === 'ar';

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        isDarkMode ? 'dark bg-[#070E1A] text-stone-100' : 'bg-[#F9F6F0] text-stone-900'
      }`}
    >
      {/* Top Integrated Site Bar with Light/Dark Edition Switcher & Live Inventory Link */}
      <div
        className={`w-full px-4 sm:px-6 lg:px-8 py-2 border-b text-xs flex flex-wrap items-center justify-between gap-2 transition-colors ${
          isDarkMode
            ? 'bg-[#040811] border-amber-500/20 text-stone-300'
            : 'bg-[#EFE9DC] border-[#E6DEC8] text-stone-700'
        }`}
      >
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="font-bold tracking-wider uppercase text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'العودة للرئيسية (Sierra Estates)' : '← Sierra Estates Home'}</span>
          </a>
          <span className="opacity-30">|</span>
          <a
            href={`/properties?compound=${encodeURIComponent(selectedCompound.nameEn)}`}
            className="inline-flex items-center gap-1 font-semibold hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
          >
            <span>
              {isAr
                ? `عرض وحدات ${selectedCompound.nameAr} في صفحة العقارات`
                : `Browse ${selectedCompound.nameEn} in Live Properties`}
            </span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-bold">
            {liveInventoryCount !== null
              ? isAr
                ? `متصل بالمخزون الحي (${liveInventoryCount.toLocaleString()} وحدة)`
                : `LIVE INVENTORY SYNCED (${liveInventoryCount.toLocaleString()} UNITS)`
              : isAr
              ? `سجل الوحدات المعتمد (${UNIT_LISTINGS.length} وحدة)`
              : `VERIFIED REGISTRY (${UNIT_LISTINGS.length} UNITS)`}
          </span>
        </div>

        {/* Instant Light / Dark Edition Switcher Pill */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold opacity-75">
            {isAr ? 'نسخة الخريطة (4K):' : '4K Map Edition:'}
          </span>
          <div
            className={`inline-flex items-center rounded-lg p-0.5 border ${
              isDarkMode ? 'bg-stone-900 border-stone-700' : 'bg-white border-stone-300'
            }`}
          >
            <button
              type="button"
              onClick={() => setIsDarkMode(false)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                !isDarkMode
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Sun className="w-3 h-3" />
              <span>{isAr ? 'فاتح (Light 4K)' : 'Light 4K'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDarkMode(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-cyan-500 text-stone-950 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Moon className="w-3 h-3" />
              <span>{isAr ? 'داكن (Dark 4K)' : 'Dark 4K'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Master Sovereign Navigation Header */}
      <MasterHeader
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          if (tab === 'dossier') {
            setIsDossierOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        lang={lang}
        toggleLang={toggleLang}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        onOpenVipModal={() => {
          setConsultationUnit(null);
          setConsultationCompound(selectedCompound);
          setIsConsultationOpen(true);
        }}
        onOpenDossierModal={() => setIsDossierOpen(true)}
        onSelectCompound={handleSearchSelectCompound}
        onSelectUnit={handleSearchSelectUnit}
      />

      {/* Editorial KPI & Quick Mode Ribbon */}
      <EditorialRibbon
        lang={lang}
        isDarkMode={isDarkMode}
        onOpenExcel={() => setCurrentTab('excel')}
        onOpenRadar={() => setCurrentTab('radar')}
        onOpen3D={() => setCurrentTab('threed')}
      />

      {/* Main Content Stage */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'map' && (
          <div className="space-y-8 animate-fade-in">
            <CartographicMap
              lang={lang}
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
              selectedCompoundId={selectedCompound.id}
              onSelectCompoundToExcel={handleSelectCompoundToExcel}
              onSelectUnit={handleSelectUnit}
            />

            <div className="pt-4 border-t border-[#E6DEC8] dark:border-cyan-900/30">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {isAr ? 'معاينة سريعة لجدول الوحدات والمخطط' : 'INSTANT INVENTORY & BLUEPRINT PREVIEW'}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-white">
                    {isAr
                      ? `سجل وحدات الإيجار وإعادة البيع — ${selectedCompound.nameAr}`
                      : `Active Rent & Resale Sheet — ${selectedCompound.nameEn}`}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/properties?compound=${encodeURIComponent(selectedCompound.nameEn)}`}
                    className="px-3.5 py-2 rounded-lg text-xs font-bold border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-all inline-flex items-center gap-1.5"
                  >
                    <span>{isAr ? 'فتح في صفحة العقارات' : 'View in Properties Page'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => setCurrentTab('excel')}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-all cursor-pointer"
                  >
                    {isAr ? 'فتح شيت الإكسل الكامل ←' : 'Expand Full Excel Sheet →'}
                  </button>
                </div>
              </div>

              <ExcelInventorySheet
                selectedCompound={selectedCompound}
                onSelectCompound={(c) => setSelectedCompound(c)}
                onSelectUnit={handleSelectUnit}
                lang={lang}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>
        )}

        {currentTab === 'excel' && (
          <div className="animate-fade-in">
            <ExcelInventorySheet
              selectedCompound={selectedCompound}
              onSelectCompound={(c) => setSelectedCompound(c)}
              onSelectUnit={handleSelectUnit}
              lang={lang}
              isDarkMode={isDarkMode}
            />
          </div>
        )}

        {currentTab === 'yield' && (
          <div className="animate-fade-in">
            <YieldHeatmapView
              lang={lang}
              isDarkMode={isDarkMode}
              onSelectCompound={handleSelectCompoundToExcel}
              onSelectUnit={handleSelectUnit}
            />
          </div>
        )}

        {currentTab === 'threed' && (
          <div className="animate-fade-in">
            <ThreeMasterPlanView
              lang={lang}
              isDarkMode={isDarkMode}
              onSelectCompoundToExcel={handleSelectCompoundToExcel}
            />
          </div>
        )}

        {currentTab === 'compounds' && (
          <div className="animate-fade-in">
            <CompoundsDirectory
              lang={lang}
              isDarkMode={isDarkMode}
              onViewOnMap={(compound) => {
                setSelectedCompound(compound);
                setCurrentTab('map');
              }}
              onSelectCompound={handleSelectCompoundToExcel}
            />
          </div>
        )}

        {currentTab === 'radar' && (
          <div className="animate-fade-in">
            <DistanceMatrix
              lang={lang}
              isDarkMode={isDarkMode}
              onLocateCompound={(compound) => {
                setSelectedCompound(compound);
                setCurrentTab('map');
              }}
            />
          </div>
        )}
      </main>

      {/* Luxury Editorial Quiet Footer */}
      <footer
        className={`w-full py-8 border-t text-xs transition-colors ${
          isDarkMode ? 'border-cyan-900/30 bg-[#070E1A] text-stone-400' : 'border-[#E6DEC8] bg-[#F4EFE6] text-stone-600'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden border border-cyan-500/40 bg-stone-900 p-0.5 shrink-0">
              <img
                src="/assets/aistudio/8e9559f6f_image__1__4350f848.png"
                alt="Sierra Estates Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-cinzel tracking-wider font-bold text-stone-900 dark:text-stone-100">
                  SIERRA ESTATES
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-mono font-semibold border border-cyan-500/20">
                  sierra-estates.net
                </span>
              </div>
              <span className="text-[10px] font-mono text-stone-500 block">
                {isAr
                  ? 'أفضل مخطط للقاهرة الجديدة 2026 في مصر للإيجار وإعادة البيع'
                  : 'Best Plan for New Cairo 2026 in Egypt for Rent and Resale'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-mono text-[11px] text-stone-500">
            <a href="mailto:info@sierra-estates.net" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
              info@sierra-estates.net
            </a>
            <span>·</span>
            <a href="https://sierra-estates.net" target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 font-bold hover:underline">
              www.sierra-estates.net
            </a>
            <span>·</span>
            <span>AUC DATUM 30.0197° N</span>
            <span>·</span>
            <span>© 2026 SIERRA ESTATES</span>
          </div>
        </div>
      </footer>

      {inspectedUnit && (
        <UnitDetailModal
          unit={inspectedUnit}
          onClose={() => setInspectedUnit(null)}
          lang={lang}
          isDarkMode={isDarkMode}
          onBookViewing={handleBookViewing}
        />
      )}

      {isConsultationOpen && (
        <VipInquiryModal
          onClose={() => setIsConsultationOpen(false)}
          lang={lang}
          isDarkMode={isDarkMode}
          selectedUnit={consultationUnit}
          selectedCompound={consultationCompound}
        />
      )}

      {isDossierOpen && (
        <ExportDossierModal
          onClose={() => setIsDossierOpen(false)}
          lang={lang}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
}
