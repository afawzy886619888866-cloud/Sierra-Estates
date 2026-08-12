import { SEED_LISTINGS } from '@/lib/seed';
import { getAdminDb } from '@/lib/firebase-admin';
import { fetchSheetUnits } from '@/lib/inventory/fetch-sheet';
import snapshot from '@/lib/inventory/snapshot.json';
import type { Listing } from '@/lib/types';

export function inventoryUnitToListing(u: any): Listing {
  const price = u.price || 0;
  const egpM = price > 100000 ? price / 1_000_000 : price;
  const usd = u.mode === 'rent' ? Math.round(price / 50) : Math.round(price / 50);
  return {
    id: u.id,
    code: u.code || u.id,
    compound: u.location || 'New Cairo',
    zone: u.zone || '5th Settlement',
    type: u.propertyType || 'Apartment',
    beds: u.beds || 3,
    bath: Math.max(1, (u.beds || 3) - 1),
    area: u.area || 150,
    egpM: Number(egpM.toFixed(2)),
    usd: usd,
    aiScore: 8.5,
    tag: u.status === 'available' ? 'Verified Owner' : null,
    mode: u.mode || 'sale',
    agent: 'Sierra Direct Advisor',
    img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    status: u.status || 'available',
    description: u.comment || '',
  } as Listing;
}

function normalizeFirestoreListing(id: string, data: any): Listing {
  const defaultImg = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80';
  const img = data.img || data.featuredImage || (Array.isArray(data.images) && data.images[0]) || defaultImg;

  return {
    id,
    code: data.code || `SE-${id.slice(0, 4).toUpperCase()}`,
    compound: data.compound || data.cmp || data.location || 'New Cairo',
    zone: data.zone || '5th Settlement',
    type: data.type || data.propertyType || 'Apartment',
    beds: data.beds ?? data.bedrooms ?? 3,
    bath: data.bath ?? data.bathrooms ?? 2,
    area: data.area ?? 150,
    egpM: data.egpM ?? (data.price ? Number((data.price / 1e6).toFixed(2)) : 8),
    usd: data.usd ?? (data.price && data.currency === 'USD' ? data.price : 1500),
    aiScore: data.aiScore ?? data.ai ?? 8.5,
    tag: data.tag ?? data.badge ?? null,
    mode: data.mode ?? 'sale',
    agent: data.agent ?? 'Sierra Broker',
    img,
    status: data.status ?? (data.active === false ? 'archived' : 'available'),
    description: data.description ?? '',
  } as Listing;
}

/** Filter-mode read: Firebase → Live Sheet → Snapshot → Seed fallback (INTEGRATION.md contract). */
export async function readListings(): Promise<Listing[]> {
  // Try Firebase Firestore first (reads houyez_listings + listings merged)
  const db = await getAdminDb();
  if (db) {
    try {
      const [snap1, snap2] = await Promise.all([
        db.collection('houyez_listings').get(),
        db.collection('listings').get(),
      ]);
      const map = new Map<string, Listing>();
      if (!snap1.empty) {
        snap1.docs.forEach((d) => {
          map.set(d.id, normalizeFirestoreListing(d.id, d.data()));
        });
      }
      if (!snap2.empty) {
        snap2.docs.forEach((d) => {
          if (!map.has(d.id)) {
            map.set(d.id, normalizeFirestoreListing(d.id, d.data()));
          }
        });
      }
      if (map.size > 0) {
        return Array.from(map.values());
      }
    } catch (err) {
      console.warn('[listings] Admin SDK read failed, using sheet:', err);
    }
  }

  // Live Sheet fallback
  try {
    const sheetUnits = await fetchSheetUnits({ revalidate: 300 });
    if (sheetUnits && sheetUnits.length > 0) {
      return sheetUnits.map(inventoryUnitToListing);
    }
  } catch (err) {
    console.warn('[listings] Live sheet fetch failed, using snapshot:', err);
  }

  // Snapshot fallback
  if (snapshot && (snapshot as any).units?.length) {
    return (snapshot as any).units.map(inventoryUnitToListing);
  }

  // Final fallback to seed data
  return SEED_LISTINGS;
}
