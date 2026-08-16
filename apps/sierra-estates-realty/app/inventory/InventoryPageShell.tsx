'use client';

import dynamic from 'next/dynamic';

const InventoryPortal = dynamic(() => import('../client/InventoryPortal'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-slate-950" />,
});

export default function InventoryPageShell() {
  return <InventoryPortal />;
}
