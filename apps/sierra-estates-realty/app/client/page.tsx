'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// STRICT SIERRA PROTOCOL: SOLE AUTHORIZED CONTACT PHONE & WHATSAPP
const _SIERRA_CONTACT_PHONE = '01092048333';
const _SIERRA_WHATSAPP_PHONE = '201092048333';

const SierraMasterRegistryApp = dynamic(
  () => import('@/components/MasterRegistryMap/SierraMasterRegistryApp'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-screen bg-[#001f38] flex flex-col items-center justify-center gap-4 text-slate-300">
        <div className="w-12 h-12 border-3 border-[#00aeff] border-t-transparent rounded-full animate-spin shadow-[0_0_24px_rgba(0,174,255,0.45)]" />
        <span className="text-xs font-mono tracking-widest uppercase text-[#00aeff] animate-pulse">
          Initializing Sierra Estates Houzez GIS &amp; Live Registry…
        </span>
      </div>
    ),
  }
);

export default function ClientPage() {
  return <SierraMasterRegistryApp initialDarkMode={true} />;
}
