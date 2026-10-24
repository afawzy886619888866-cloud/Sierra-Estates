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
import { UnitListing, Compound, COMPOUNDS } from './registryData';
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

    // Wire with live /api/inventory endpoint
    fetch('/api/inventory')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && Array.isArray(data.units)) {
          setLiveInventoryCount(data.units.length);
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

  const isAr = lang === 'ar';

  return (
    <div 
      dir={isAr ? 'rtl' : 'ltr'} 
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDarkMode 
          ? 'bg-[#060D19] text-stone-100 selection:bg-amber-900/50 dark' 
          : 'bg-[#FAF8F5] text-stone-900 selection:bg-amber-200/60'
      }`}
    >
      {/* Top Bar with Global Search & Theme Switcher */}
      <MasterHeader
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'dossier') {
            setIsDossierOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        lang={lang}
        onToggleLang={toggleLang}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        onOpenConsultation={() => {
          setConsultationUnit(null);
          setConsultationCompound(selectedCompound);
          setIsConsultationOpen(true);
        }}
        onSelectCompound={handleSelectCompoundToExcel}
        onSelectUnit={handleSelectUnit}
      />

      {/* Cross-Portal Integration Strip: Connects Map <-> Live Inventory (/properties) <-> Client Page (/client) */}
      <div className={`w-full border-b px-4 py-2 text-xs transition-colors ${
        isDarkMode ? 'bg-[#091426] border-amber-500/25 text-stone-200' : 'bg-[#F3EFE6] border-[#E2D9C5] text-stone-800'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <Sparkles className="w-3 h-3" />
              <span>
                {liveInventoryCount !== null
                  ? (isAr ? `متصل بالمخزون الحي (${liveInventoryCount} وحدة)` : `Wired to Live Inventory (${liveInventoryCount} Active Units)`)
                  : (isAr ? 'سجل القاهرة الجديدة المعتمد ٢٠٢٦' : 'Verified New Cairo 2026 Master Registry')}
              </span>
            </span>
            <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
              {isAr ? 'المشروع النشط:' : 'Active Enclave:'}{' '}
              <strong className="text-amber-600 dark:text-amber-400">{isAr ? selectedCompound.nameAr : selectedCompound.nameEn}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border flex items-center gap-1.5 cursor-pointer transition-all ${
                isDarkMode
                  ? 'bg-amber-400/15 border-amber-400/50 text-amber-300 hover:bg-amber-400/25'
                  : 'bg-[#061122] border-[#061122] text-amber-300 hover:bg-[#0c1f3d]'
              }`}
            >
              {isDarkMode ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
              <span>{isDarkMode ? (isAr ? 'التبديل للنسخة الفاتحة' : 'Switch to Light Map') : (isAr ? 'التبديل للنسخة الغامقة' : 'Switch to Dark Map')}</span>
            </button>

            <a
              href={`/properties?compound=${encodeURIComponent(selectedCompound.nameEn)}`}
              className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 flex items-center gap-1 transition-colors"
            >
              <Building2 className="w-3 h-3" />
              <span>{isAr ? `وحدات ${selectedCompound.nameAr} في الكتالوج` : `${selectedCompound.nameEn} Catalog`}</span>
              <ArrowUpRight className="w-3 h-3" />
            </a>

            <a
              href={`/client?compound=${encodeURIComponent(selectedCompound.id)}&theme=dark`}
              className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-colors"
            >
              <span>{isAr ? 'بوابة العملاء (النسخة الليلية)' : 'Client Portal (Dark Edition)'}</span>
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Header Announcement Ribbon */}
      <EditorialRibbon isDarkMode={isDarkMode} lang={lang} />

      {/* Primary Screen Views */}
      <main className="flex-1 w-full pb-16">
        {currentTab === 'map' && (
          <div className="animate-fade-in">
            <CartographicMap
              lang={lang}
              isDarkMode={isDarkMode}
              onSelectCompoundToExcel={handleSelectCompoundToExcel}
              onSelectUnit={handleSelectUnit}
              onToggleTheme={toggleTheme}
            />
          </div>
        )}

        {currentTab === 'excel' && (
          <div className="animate-fade-in">
            <ExcelInventorySheet
              selectedCompound={selectedCompound}
              onSelectCompound={(comp) => setSelectedCompound(comp)}
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
              onSelectCompoundToExcel={handleSelectCompoundToExcel}
              onViewOnMap={(compound) => {
                setSelectedCompound(compound);
                setCurrentTab('map');
              }}
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
      <footer className={`w-full py-8 border-t text-xs transition-colors ${
        isDarkMode ? 'border-cyan-900/30 bg-[#070E1A] text-stone-400' : 'border-[#E6DEC8] bg-[#F4EFE6] text-stone-600'
      }`}>
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
                {isAr ? 'أفضل مخطط للقاهرة الجديدة 2026 في مصر للإيجار وإعادة البيع' : 'Best Plan for New Cairo 2026 in Egypt for Rent and Resale'}
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
