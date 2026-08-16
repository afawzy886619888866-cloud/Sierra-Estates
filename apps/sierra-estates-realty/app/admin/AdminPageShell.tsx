'use client';

import dynamic from 'next/dynamic';

const AdminPortal = dynamic(() => import('./AdminPortal'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-slate-950" />,
});

export default function AdminPageShell() {
  return <AdminPortal />;
}
