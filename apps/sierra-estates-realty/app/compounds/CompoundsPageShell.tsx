'use client';

import dynamic from 'next/dynamic';

const CompoundsPortal = dynamic(() => import('../client/CompoundsPortal'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-slate-950" />,
});

export default function CompoundsPageShell() {
  return <CompoundsPortal />;
}
