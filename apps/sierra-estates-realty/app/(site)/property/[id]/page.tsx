import type { Metadata } from 'next';
import '../../../site-styles/property.css';
import '../../../site-styles/site-refinements.css';
import PropertyDetail from './PropertyDetail';
import { HZDATA } from '@/lib/site/data';

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const p = (HZDATA.listings as any[]).find((x) => String(x.id) === String(id));
  if (!p) return { title: 'Listing' };
  return {
    title: `${p.type} in ${p.cmp}`,
    description: `${p.beds}-bed ${p.type.toLowerCase()}, ${p.area} m² in ${p.cmp}, ${p.zone}. AI score ${p.ai.toFixed(1)}.`,
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PropertyDetail id={id} />;
}
