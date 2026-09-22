import type { Metadata } from 'next';
import '../../../site-styles/property.css';
import '../../../site-styles/site-refinements.css';
import PropertyDetail from './PropertyDetail';
import { HZDATA } from '@/lib/site/data';
import snapshot from '@/lib/inventory/snapshot.json';
import waIngested from '@/data/whatsapp-ingested-units.json';

/** Resolve a listing for metadata: live sources first, static fallback. */
function resolveForMeta(id: string) {
  const needle = String(id).trim().toLowerCase();

  // 1. WhatsApp-ingested real listings (same file /api/inventory serves)
  const waUnit = (waIngested as any[]).find(
    (u) =>
      String(u.sierraCode || u.code || '').toLowerCase() === needle ||
      String(u.id || '').toLowerCase() === needle
  );
  if (waUnit) {
    return {
      type: u_type(waUnit),
      cmp: waUnit.compound || waUnit.location || 'New Cairo',
      zone: 'New Cairo',
      beds: waUnit.beds ?? waUnit.bedrooms ?? 3,
      area: waUnit.area ?? waUnit.area_sqm ?? 0,
      ai: 8.5,
    };
  }

  // 2. Committed catalog snapshot
  const units: any[] = (snapshot as any)?.units || [];
  const unit = units.find(
    (u) =>
      String(u.code || '').toLowerCase() === needle ||
      String(u.id || '').toLowerCase() === needle
  );
  if (unit) {
    return {
      type: unit.propertyType || unit.type || 'Apartment',
      cmp: unit.compound || unit.location || 'New Cairo',
      zone: unit.zone || 'New Cairo',
      beds: unit.beds ?? 3,
      area: unit.area ?? 0,
      ai: Number(unit.aiScore ?? 8.5),
    };
  }

  // 3. Static featured catalog
  return (HZDATA.listings as any[]).find(
    (x) =>
      String(x.id) === String(id) ||
      String(x.code).toLowerCase() === needle
  );
}

function u_type(u: any): string {
  return u.propertyType || u.type || 'Apartment';
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const p = resolveForMeta(id);
  if (!p) return { title: 'Listing' };
  return {
    title: `${p.type} in ${p.cmp}`,
    description: `${p.beds}-bed ${String(p.type).toLowerCase()}, ${p.area} m² in ${p.cmp}, ${p.zone}. AI score ${Number(p.ai).toFixed(1)}.`,
    openGraph: {
      title: `${p.type} in ${p.cmp} | Sierra Estates`,
      description: `${p.beds}-bed ${String(p.type).toLowerCase()}, ${p.area} m² in ${p.cmp}, ${p.zone}.`,
      type: 'website',
    },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PropertyDetail id={id} />;
}
