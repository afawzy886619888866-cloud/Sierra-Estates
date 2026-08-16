'use client';

import dynamic from 'next/dynamic';

const PropertiesPortal = dynamic(() => import('../client/PropertiesPortal'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-slate-950" />,
});

export default function PropertiesPageShell() {
  return <PropertiesPortal />;
}
