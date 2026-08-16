'use client';

import dynamic from 'next/dynamic';

const ClientHome = dynamic(() => import('./ClientHome'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-slate-950" />,
});

export default function HomePageShell() {
  return <ClientHome />;
}
