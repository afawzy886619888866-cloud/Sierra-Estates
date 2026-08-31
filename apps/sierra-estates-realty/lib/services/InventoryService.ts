import 'server-only';
import { adminDb } from '@/lib/server/firebase-admin';

/**
 * Server-only inventory reads via the Firebase Admin SDK. Previously this
 * read through the client `firebase/firestore` SDK with NEXT_PUBLIC_* keys —
 * meaning a server route (WealthService -> /api/wealth/portfolio) was
 * silently depending on Firestore security rules instead of the admin-trust
 * model every other app/api/ route uses. Client-side code should call
 * /api/listings instead of importing this file.
 */

export type OfferType = 'sale' | 'rent';
export type ListingType = 'primary' | 'resale' | 'landlord_direct' | 'developer_inventory';

export interface Property {
  id: string;
  title: string;
  propertyType: string;
  status: string;
  compound: string;
  location: string;
  city: string;
  area: number;
  bedrooms: number;
  price: number;
  pricePerSqm: number;
  coordinates?: { lat: number; lng: number };
  finishingType?: string;
  description?: string;
  offerType?: OfferType;
  listingType?: ListingType;
}

export const InventoryService = {
  async getProperty(id: string): Promise<Property | null> {
    const docSnap = await adminDb.collection('listings').doc(id).get();
    if (docSnap.exists) {
      return { id: docSnap.id, ...docSnap.data() } as Property;
    }
    return null;
  },

  async getFeaturedListings(count: number = 3): Promise<Property[]> {
    const snap = await adminDb.collection('listings').limit(count).get();
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Property));
  },
};
