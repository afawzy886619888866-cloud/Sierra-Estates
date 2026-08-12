/**
 * SIERRA ESTATES — CLIENT INVENTORY SERVICE (SAFE)
 * This file is a safe wrapper that calls the API instead of the DB directly.
 */

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
  bathrooms: number;
  price: number;
  pricePerSqm: number;
  coordinates?: { lat: number; lng: number };
  finishingType?: string;
  description?: string;
}

export const InventoryService = {
  async getProperty(id: string): Promise<Property | null> {
    try {
      const res = await fetch(`/api/listings?id=${id}`);
      const data = await res.json();
      if (data.success && data.listing) {
        return data.listing as Property;
      }
      return null;
    } catch (err) {
      console.error('Client Inventory Error:', err);
      return null;
    }
  },

  async getFeaturedListings(count: number = 3): Promise<Property[]> {
    try {
      const res = await fetch(`/api/listings?limit=${count}`);
      const data = await res.json();
      if (data.success && data.listings) {
        return data.listings as Property[];
      }
      return [];
    } catch (err) {
      console.error('Client Inventory Error:', err);
      return [];
    }
  }
};
