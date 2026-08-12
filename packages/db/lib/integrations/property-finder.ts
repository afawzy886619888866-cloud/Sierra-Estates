/**
 * packages/db — Property Finder integration types and helpers
 */

export interface PFListing {
  id?: string;
  externalId?: string;
  title: string;
  titleAr?: string;
  compound: string;
  city: string;
  location: string;
  propertyType: string;
  offerType: 'sale' | 'rent';
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  finishingType?: string;
  furnishingStatus?: string;
  status: string;
  syncedToPF?: boolean;
  dealStatus?: string;
  aiScore?: number;
  images?: string[];
  description?: string;
  descriptionAr?: string;
  [key: string]: unknown;
}

export type SBRListing = PFListing;

export interface PFSyncResult     { success: boolean; id?: string; error?: string; }
export interface PFListingAnalytics { views: number; leads: number; phoneReveals: number; impressions: number; ctr: number; }

export async function pushListingToPF(listing: SBRListing): Promise<PFSyncResult> {
  if (!listing.id) return { success: false, error: 'listing.id is required' };

  // Test seam: unit tests inject a token via globalThis.__TEST_TOKEN__ so we
  // don't need a live Firebase Auth session. Never set in production.
  let token: string | undefined =
    (globalThis as { __TEST_TOKEN__?: string }).__TEST_TOKEN__;
  if (!token && typeof window !== 'undefined') {
    try {
      const { getAuth } = await import('firebase/auth');
      token = await getAuth().currentUser?.getIdToken();
    } catch { /* ignore */ }
  }

  if (!token) return { success: false, error: 'Authentication required' };

  try {
    const res  = await fetch('/api/sync/publish', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitId: listing.id }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true, id: data.id ?? listing.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getPFListingAnalytics(_pfListingId: string): Promise<PFListingAnalytics> {
  return { views: 0, leads: 0, phoneReveals: 0, impressions: 0, ctr: 0 };
}
