import type { Metadata } from 'next';
import '../../../site-styles/property.css';
import '../../../site-styles/site-refinements.css';
import PropertyDetail from './PropertyDetail';
import { HZDATA } from '@/lib/site/data';
import snapshot from '@/lib/inventory/snapshot.json';
<<<<<<< HEAD
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
=======
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
        type: (row.propertyType as string) || '',
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
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
  const units: any[] = (snapshot as any)?.units || [];
  const unit = units.find(
    (u) =>
      String(u.code || '').toLowerCase() === needle ||
      String(u.id || '').toLowerCase() === needle
  );
  if (unit) {
    return {
<<<<<<< HEAD
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
=======
      type: unit.propertyType || unit.type || '',
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
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
<<<<<<< HEAD
  const p = resolveForMeta(id);
  if (!p) return { title: 'Listing' };
  return {
    title: `${p.type} in ${p.cmp}`,
    description: `${p.beds}-bed ${String(p.type).toLowerCase()}, ${p.area} m² in ${p.cmp}, ${p.zone}. AI score ${Number(p.ai).toFixed(1)}.`,
    openGraph: {
      title: `${p.type} in ${p.cmp} | Sierra Estates`,
      description: `${p.beds}-bed ${String(p.type).toLowerCase()}, ${p.area} m² in ${p.cmp}, ${p.zone}.`,
=======
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
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
      type: 'website',
    },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PropertyDetail id={id} />;
}
