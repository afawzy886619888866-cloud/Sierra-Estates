'use client';

import dynamic from 'next/dynamic';

const PropertyDetail = dynamic(() => import('../../client/PropertyDetail'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-slate-950" />,
});

export default function PropertyDetailPageShell({ id }: { id: string }) {
  return <PropertyDetail id={id} />;
}
