'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// STRICT SIERRA PROTOCOL: SOLE AUTHORIZED CONTACT PHONE & WHATSAPP
export const SIERRA_CONTACT_PHONE = '01092048333';
export const SIERRA_WHATSAPP_PHONE = '201092048333';

// Dynamically import the 4K Luxury Map Applet to guarantee zero SSR window errors
const NewCairoLuxuryMapApp = dynamic(
  () => import('@/components/Maps/NewCairoLuxuryMapApp'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-screen bg-[#06090f] flex flex-col items-center justify-center gap-4 text-slate-400">
        <div className="w-12 h-12 border-3 border-amber-400 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(245,158,11,0.4)]" />
        <span className="text-xs font-mono tracking-widest uppercase text-amber-300 animate-pulse">
          Initializing Sierra Estates 4K Retina Masterplan & Live Inventory…
        </span>
      </div>
    ),
  }
);

export default function ClientPage() {
  return <NewCairoLuxuryMapApp />;
}
