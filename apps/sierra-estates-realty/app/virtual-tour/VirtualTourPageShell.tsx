'use client';

import dynamic from 'next/dynamic';

const VirtualTourPortal = dynamic(() => import('../client/VirtualTourPortal'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-slate-950" />,
});

export default function VirtualTourPageShell() {
  return <VirtualTourPortal />;
}
