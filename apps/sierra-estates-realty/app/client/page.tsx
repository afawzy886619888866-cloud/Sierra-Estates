'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import './client-portal.css';

// STRICT SIERRA PROTOCOL: SOLE AUTHORIZED CONTACT PHONE & WHATSAPP
const _SIERRA_CONTACT_PHONE = '01092048333';
const _SIERRA_WHATSAPP_PHONE = '201092048333';

const SierraMasterRegistryApp = dynamic(
  () => import('@/components/MasterRegistryMap/SierraMasterRegistryApp'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center gap-4 text-[#002B4B]">
        <div className="w-12 h-12 border-3 border-[#C9A84C] border-t-transparent rounded-full animate-spin shadow-[0_0_24px_rgba(201,168,76,0.35)]" />
        <span className="text-xs font-mono tracking-widest uppercase text-[#C9A84C] animate-pulse">
          Initializing Sierra Estates GIS &amp; Live Registry…
        </span>
      </div>
    ),
  }
);

export default function ClientPage() {
  return <SierraMasterRegistryApp initialDarkMode={false} />;
}
