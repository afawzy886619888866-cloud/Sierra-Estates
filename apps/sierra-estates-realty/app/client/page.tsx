'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Map, FileSpreadsheet, Building2, ArrowUpRight } from 'lucide-react';

// STRICT SIERRA PROTOCOL: SOLE AUTHORIZED CONTACT PHONE & WHATSAPP
export const SIERRA_CONTACT_PHONE = '01092048333';
export const SIERRA_WHATSAPP_PHONE = '201092048333';

const SierraMasterRegistryApp = dynamic(
  () => import('@/components/MasterRegistryMap/SierraMasterRegistryApp'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-screen bg-[#061122] flex flex-col items-center justify-center gap-4 text-slate-300">
        <div className="w-12 h-12 border-3 border-amber-400 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(245,158,11,0.4)]" />
        <span className="text-xs font-mono tracking-widest uppercase text-amber-300 animate-pulse">
          Initializing Sierra Estates 4K Dark &amp; Light Masterplan Registry…
        </span>
      </div>
    ),
  }
);

const NewCairoLuxuryMapApp = dynamic(
  () => import('@/components/Maps/NewCairoLuxuryMapApp'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-screen bg-[#06090f] flex flex-col items-center justify-center gap-4 text-slate-400">
        <div className="w-12 h-12 border-3 border-amber-400 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(245,158,11,0.4)]" />
        <span className="text-xs font-mono tracking-widest uppercase text-amber-300 animate-pulse">
          Initializing Sierra Estates Live GIS Satellite Map…
        </span>
      </div>
    ),
  }
);

export default function ClientPage() {
  const [clientMode, setClientMode] = useState<'registry-dark' | 'gis-leaflet'>('registry-dark');

  return (
    <div className="relative min-h-screen bg-[#061122]">
      {/* Floating Client Portal Mode Switcher */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 bg-[#061122]/95 backdrop-blur-md border border-amber-500/40 rounded-full p-1.5 shadow-2xl">
        <button
          type="button"
          onClick={() => setClientMode('registry-dark')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            clientMode === 'registry-dark'
              ? 'bg-amber-500 text-stone-950 shadow-md'
              : 'text-stone-300 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>4K Masterplan &amp; Excel Registry (Dark/Light)</span>
        </button>

        <button
          type="button"
          onClick={() => setClientMode('gis-leaflet')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            clientMode === 'gis-leaflet'
              ? 'bg-cyan-500 text-stone-950 shadow-md'
              : 'text-stone-300 hover:text-white'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span>GIS Vector Satellite View</span>
        </button>

        <a
          href="/properties"
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-amber-300 hover:text-amber-200 border border-amber-500/30 bg-amber-500/10"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Live Inventory</span>
          <ArrowUpRight className="w-3 h-3" />
        </a>
      </div>

      {clientMode === 'registry-dark' ? (
        <SierraMasterRegistryApp initialDarkMode={true} />
      ) : (
        <NewCairoLuxuryMapApp />
      )}
    </div>
  );
}
