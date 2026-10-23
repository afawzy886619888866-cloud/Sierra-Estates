/**
 * Property Finder Enterprise API Client (atlas.propertyfinder.com/v1)
 * OAuth2 token auth with 30-min expiry, auto-refresh
 */

import { 
  PFListing, 
  PFListingRequest, 
  PFLead, 
  PFLocationInfo as PFLocation, 
  PFAuthToken as PFAccessToken,
  PFTranslation,
  PFUser
} from './property-finder/types';
import { EgyptListingValidator } from './property-finder/validation';

export type { PFListing, PFListingRequest, PFLead, PFLocation, PFTranslation, PFUser };

class PropertyFinderClient {
  private static instance: PropertyFinderClient;
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  private constructor() {
    this.baseUrl = process.env.PROPERTY_FINDER_API_GATEWAY || 'https://atlas.propertyfinder.com';
    this.apiKey = process.env.PROPERTY_FINDER_API_KEY || '';
    this.apiSecret = process.env.PROPERTY_FINDER_API_SECRET || '';
  }

  public static getInstance(): PropertyFinderClient {
    if (!PropertyFinderClient.instance) {
      PropertyFinderClient.instance = new PropertyFinderClient();
    }
    return PropertyFinderClient.instance;
  }

  private async getAuthToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.tokenExpiry && now < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch(`${this.baseUrl}/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ apiKey: this.apiKey, apiSecret: this.apiSecret }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`PF Auth failed (${response.status}): ${err}`);
    }

    const data: PFAccessToken = await response.json();
    this.accessToken = data.accessToken;
    this.tokenExpiry = now + (data.expiresIn - 60) * 1000;
    return this.accessToken;
  }

  private async request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAuthToken();
    const url = `${this.baseUrl}/v1${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 204) return null as T;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`PF API ${response.status}: ${errorData.detail || errorData.title || 'Unknown error'}`);
    }

    return response.json();
  }

  // ── Listings ──

  public async searchListings(params: Record<string, string> = {}): Promise<{ data: PFListing[]; pagination: any }> {
    const query = new URLSearchParams(params).toString();
    const response = await this.request<any>(`/listings${query ? `?${query}` : ''}`);
    return {
      data: response.results || [],
      pagination: response.pagination || {}
    };
  }

  public async createListing(listing: PFListingRequest): Promise<PFListing> {
    const validation = EgyptListingValidator.validate(listing);
    if (!validation.isValid) {
      throw new Error(`PF Validation failed: ${validation.errors.join('; ')}`);
    }
    return this.request('/listings', { method: 'POST', body: JSON.stringify(listing) });
  }

  public async updateListing(id: string | number, updates: Partial<PFListingRequest>): Promise<PFListing> {
    return this.request(`/listings/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
  }

  public async deleteListing(id: string | number): Promise<void> {
    return this.request(`/listings/${id}`, { method: 'DELETE' });
  }

  public async publishListing(id: string | number): Promise<void> {
    return this.request(`/listings/${id}/publish`, { method: 'POST' });
  }

  public async unpublishListing(id: string | number): Promise<void> {
    return this.request(`/listings/${id}/unpublish`, { method: 'POST' });
  }

  public async getPublishPrice(id: string | number): Promise<any> {
    return this.request(`/listings/${id}/publish/prices`);
  }

  public async getAmenities(): Promise<string[]> {
    return this.request('/amenities');
  }

  // ── Leads ──

  public async fetchLeads(params: Record<string, string> = {}): Promise<{ data: PFLead[]; pagination: any }> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/leads${query ? `?${query}` : ''}`);
  }

  /**
   * Alias for fetchLeads used by the Sierra Estates Wealth Registry protocol.
   */
  public async fetchInvestmentStakeholderRegistry(params: Record<string, string> = {}): Promise<{ data: PFLead[]; pagination: any }> {
    return this.fetchLeads(params);
  }

  // ── Locations ──

  public async searchLocations(search: string): Promise<{ data: PFLocation[] }> {
    return this.request(`/locations?search=${encodeURIComponent(search)}`);
  }

  public async getLocations(params: Record<string, string> = {}): Promise<{ data: PFLocation[]; pagination: any }> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/locations${query ? `?${query}` : ''}`);
  }

  // ── Users ──

  public async getUsers(params: Record<string, string> = {}): Promise<{ data: PFUser[]; pagination: any }> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/users${query ? `?${query}` : ''}`);
  }

  // ── Webhooks ──

  public async subscribeWebhook(eventId: string, url: string, secret?: string): Promise<any> {
    return this.request('/webhooks', {
      method: 'POST',
      body: JSON.stringify({ eventId, url, ...(secret ? { secret } : {}) }),
    });
  }

  public async listWebhooks(): Promise<any> {
    return this.request('/webhooks');
  }

  // ── Credits ──

  public async getCreditBalance(): Promise<any> {
    return this.request('/credits/balance');
  }
}

export const pfClient = PropertyFinderClient.getInstance();
export default PropertyFinderClient;
