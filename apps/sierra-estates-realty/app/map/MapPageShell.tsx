'use client';

import dynamic from 'next/dynamic';

const MapPageClient = dynamic(() => import('./MapPageClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#030712] text-slate-100 grid place-items-center">
      <span className="text-xs font-mono text-amber-400">Loading map…</span>
    </div>
  ),
});

export default function MapPageShell() {
  return <MapPageClient />;
}
