'use client';

import React, { useState } from 'react';
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
import { UnitListing, Compound, COMPOUNDS, UNIT_LISTINGS } from './registryData';

export default function SierraMasterRegistryApp() {
  const [currentTab, setCurrentTab] = useState<'map' | 'excel' | 'threed' | 'yield' | 'compounds' | 'radar' | 'dossier'>('map');
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true); // default to dark identity for sierra-estates.net

  // Selected compound for Excel and Blueprint views
  const [selectedCompound, setSelectedCompound] = useState<Compound>(COMPOUNDS[0]);

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

  // When a compound is clicked on the map or in 3D:
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
          ? 'bg-[#060D19] text-stone-100 selection:bg-amber-900/50' 
          : 'bg-[#FAF8F5] text-stone-900 selection:bg-amber-200/60'
      }`}
    >
      {/* 3-Zone Clean Top Bar Contract with Official Sierra Estates Logo */}
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
      />

      {/* Header Announcement Ribbon: Best Plan for New Cairo 2026 in Egypt for Rent and Resale — by Sierra Estates */}
      <EditorialRibbon isDarkMode={isDarkMode} lang={lang} />

      {/* Primary Screen Views */}
      <main className="flex-1 w-full pb-16">
        
        {/* Screen 1: Master Cartographic Plan with Glowing Boundary Lines & Hover Signs */}
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

        {/* Screen 2: Next Page — Units Excel Sheet with Authentic Formulas, Rent & Resale, Clear Blueprint Plan */}
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

        {/* Screen 3: Rental Yield Heatmap & High-Return Investment Engine */}
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

        {/* Screen 4: Three.js Interactive 3D Architectural Twin Scene */}
        {currentTab === 'threed' && (
          <div className="animate-fade-in">
            <ThreeMasterPlanView
              lang={lang}
              isDarkMode={isDarkMode}
              onSelectCompoundToExcel={handleSelectCompoundToExcel}
            />
          </div>
        )}

        {/* Screen 5: Compounds Directory */}
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

        {/* Screen 6: AUC Proximity & Transit Matrix */}
        {currentTab === 'radar' && (
          <div className="animate-fade-in">
            <DistanceMatrix
              lang={lang}
              isDarkMode={isDarkMode}
              onSelectCompoundToExcel={handleSelectCompoundToExcel}
            />
          </div>
        )}
      </main>

      {/* Unit Inspection Modal */}
      {inspectedUnit && (
        <UnitDetailModal
          unit={inspectedUnit}
          onClose={() => setInspectedUnit(null)}
          onBookViewing={handleBookViewing}
          lang={lang}
          isDarkMode={isDarkMode}
        />
      )}

      {/* VIP Consultation & Booking Modal */}
      {isConsultationOpen && (
        <VipInquiryModal
          unit={consultationUnit}
          compound={consultationCompound}
          onClose={() => {
            setIsConsultationOpen(false);
            setConsultationUnit(null);
            setConsultationCompound(null);
          }}
          lang={lang}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Export Dossier Modal */}
      {isDossierOpen && (
        <ExportDossierModal
          compound={selectedCompound}
          units={UNIT_LISTINGS.filter(u => u.compoundId === selectedCompound.id)}
          onClose={() => setIsDossierOpen(false)}
          lang={lang}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
}
