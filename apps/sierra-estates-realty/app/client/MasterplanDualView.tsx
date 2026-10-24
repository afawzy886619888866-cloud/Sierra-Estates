'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import MasterplanPortal from './MasterplanPortal';
import { Map, FileSpreadsheet } from 'lucide-react';

const SierraMasterRegistryApp = dynamic(
  () => import('@/components/MasterRegistryMap/SierraMasterRegistryApp'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-3 bg-[#061122] text-slate-300">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono uppercase text-amber-300">Loading Cadastral Master Registry…</span>
      </div>
    ),
  }
);

export default function MasterplanDualView() {
  const [viewMode, setViewMode] = useState<'gis' | 'registry'>('gis');

  return (
    <div className="relative min-h-screen">
      {/* Floating Engine Switcher Bar matching Sierra Estates identity */}
      <div className="fixed top-20 right-4 lg:right-8 z-50 flex items-center bg-[#061122]/92 backdrop-blur-md border border-amber-500/40 rounded-full p-1 shadow-2xl shadow-black/60">
        <button
          onClick={() => setViewMode('gis')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            viewMode === 'gis'
              ? 'bg-[#094cb2] text-white shadow-md shadow-[#094cb2]/40'
              : 'text-slate-300 hover:text-white'
          }`}
          title="Switch to original 4K GIS Leaflet Spatial Masterplan"
        >
          <Map className="w-3.5 h-3.5 text-cyan-300" />
          <span>GIS Masterplan (الأساسي)</span>
        </button>

        <button
          onClick={() => setViewMode('registry')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            viewMode === 'registry'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/40'
              : 'text-slate-300 hover:text-white'
          }`}
          title="Switch to Cadastral Master Registry with Excel sheets, comparison & yields"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
          <span>Cadastral Registry (السجل الكارتوغرافي)</span>
        </button>
      </div>

      {/* Active Map Engine - Default is original GIS MasterplanPortal */}
      {viewMode === 'gis' ? (
        <MasterplanPortal />
      ) : (
        <SierraMasterRegistryApp />
      )}
    </div>
  );
}
