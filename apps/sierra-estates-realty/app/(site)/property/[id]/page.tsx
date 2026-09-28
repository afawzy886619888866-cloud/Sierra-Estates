import type { Metadata } from 'next';
import '../../../site-styles/property.css';
import '../../../site-styles/site-refinements.css';
import PropertyDetail from './PropertyDetail';
import { HZDATA } from '@/lib/site/data';
import snapshot from '@/lib/inventory/snapshot.json';
import { getRecord } from '@sierra-estates/db';

/**
 * Resolve a listing for metadata (Phase 4):
 *   1. live DB row (single-row read, same source as /api/listings/[id])
 *   2. committed catalog snapshot (server-side only — it is no longer in any
 *      client bundle)
 *   3. static curated catalog (empty by design — anti-fabrication)
 *
 * No invented values: missing beds/area simply drop out of the description
 * instead of defaulting to fabricated specs (previously `?? 3` beds,
 * `?? 8.5` AI score).
 */
async function resolveForMeta(id: string): Promise<Record<string, any> | null> {
  const needle = String(id).trim().toLowerCase();

  // 1. Live DB row
  try {
    const row = await getRecord<Record<string, unknown>>('listings', id);
    if (row) {
      return {
        type: (row.propertyType as string) || 'Apartment',
        cmp: (row.compound as string) || '',
        zone: (row.locationArea as string) || '',
        beds: (row.bedrooms as number) ?? null,
        area: Number(row.areaSqm ?? row.area_sqm ?? 0) || null,
      };
    }
  } catch {
    // DB unreachable — fall through to the committed snapshot below.
  }

  // 2. Committed catalog snapshot (server-side only)
  const units: any[] = (snapshot as any)?.units || [];
  const unit = units.find(
    (u) =>
      String(u.code || '').toLowerCase() === needle ||
      String(u.id || '').toLowerCase() === needle
  );
  if (unit) {
    return {
      type: unit.propertyType || unit.type || 'Apartment',
      cmp: unit.compound || unit.location || '',
      zone: unit.zone || '',
      beds: unit.beds ?? null,
      area: Number(unit.area ?? unit.area_sqm ?? 0) || null,
    };
  }

  // 3. Static curated catalog
  return (HZDATA.listings as any[]).find(
    (x) => String(x.id) === String(id) || String(x.code).toLowerCase() === needle
  ) || null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const p = await resolveForMeta(id);
  if (!p) return { title: 'Listing' };
  const bedsPart = p.beds ? `${p.beds}-bed ` : '';
  const areaPart = p.area ? `, ${p.area} m²` : '';
  const zonePart = p.zone ? `, ${p.zone}` : '';
  return {
    title: `${p.type} in ${p.cmp}`,
    description: `${bedsPart}${String(p.type).toLowerCase()}${areaPart} in ${p.cmp}${zonePart}.`,
    openGraph: {
      title: `${p.type} in ${p.cmp} | Sierra Estates`,
      description: `${bedsPart}${String(p.type).toLowerCase()}${areaPart} in ${p.cmp}${zonePart}.`,
      type: 'website',
    },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PropertyDetail id={id} />;
}
