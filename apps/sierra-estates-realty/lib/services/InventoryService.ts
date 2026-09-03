import 'server-only';
import { getRecord, listRecords } from '@sierra-estates/db';

/**
 * Server-only inventory reads through the Supabase service-role client.
 * Client-side code should call /api/listings rather than importing this file:
 * this bypasses RLS by design, on the same admin-trust model every other
 * app/api/ route uses.
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
    return await getRecord<Property>('listings', id);
  },

  async getFeaturedListings(count: number = 3): Promise<Property[]> {
    return await listRecords<Property>('listings', { limit: count });
  },
};
