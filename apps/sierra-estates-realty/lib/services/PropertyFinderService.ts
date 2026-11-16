/**
 * Sierra Estates Enterprise Gateway - Property Finder Service
 *
 * This client-side service talks to the internal Next.js Property Finder API
 * instead of using mock timeout data.
 */

import type { PFListing } from '../property-finder-client';

interface PFSearchResponse {
  data?: PFListing[];
  meta?: Record<string, unknown>;
  error?: string;
}

interface PublishListingResponse {
  success?: boolean;
  result?: PFListing;
  error?: string;
}

export class PropertyFinderService {
  private static instance: PropertyFinderService;
  private apiBase = '/api/property-finder';

  private constructor() {}

  public static getInstance(): PropertyFinderService {
    if (!PropertyFinderService.instance) {
      PropertyFinderService.instance = new PropertyFinderService();
    }
    return PropertyFinderService.instance;
  }

  /**
   * Fetch the latest listings from the internal gateway.
   */
  public async fetchListings(filters: Record<string, string | number> = { status: 'published' }): Promise<PFListing[]> {
    const params = new URLSearchParams({ action: 'search-listings' });
    Object.entries(filters).forEach(([key, value]) => params.set(key, String(value)));

    const response = await fetch(`${this.apiBase}?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
    });

    const result = await response.json() as PFSearchResponse;
    if (!response.ok || result.error) {
      throw new Error(result.error || 'Property Finder listing sync failed.');
    }

    return result.data || [];
  }

  /**
   * Trigger a lead sync from Property Finder into the CRM.
   */
  public async syncIncomingLeads(): Promise<{ created: number; updated: number; skipped: number }> {
    const response = await fetch(`${this.apiBase}?action=sync-leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const result = await response.json() as { success?: boolean; summary?: { created: number; updated: number; skipped: number }; error?: string };
    if (!response.ok || !result.success || !result.summary) {
      throw new Error(result.error || 'Property Finder lead sync failed.');
    }

    return result.summary;
  }

  /**
   * Publish a local Sierra Estates unit to Property Finder through the server API.
   */
  public async publishToPF(listingId: string): Promise<{ success: boolean; externalId?: string }> {
    const response = await fetch(`${this.apiBase}?action=publish-unit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ unitId: listingId }),
    });

    const result = await response.json() as PublishListingResponse;
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Property Finder publish failed.');
    }

    return {
      success: true,
      externalId: result.result?.reference || result.result?.id,
    };
  }
}

export const pfService = PropertyFinderService.getInstance();
