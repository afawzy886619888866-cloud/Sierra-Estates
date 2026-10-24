'use client';

import React from 'react';
import dynamic from 'next/dynamic';

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
          Initializing Sierra Estates 4K Dark &amp; Light Masterplan &amp; Live Inventory…
        </span>
      </div>
    ),
  }
);

export default function ClientPage() {
  return <SierraMasterRegistryApp initialDarkMode={true} />;
}
