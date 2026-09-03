/**
 * Property Finder Enterprise API Client (atlas.propertyfinder.com/v1)
 * OAuth2 token auth with 30-min expiry, auto-refresh
 */

import { 
  PFListing, 
  PFListingRequest, 
  PFLead, 
  PFLocationInfo as PFLocation,

  PFTranslation,
  PFUser
} from './property-finder/types';
import { EgyptListingValidator } from './property-finder/validation';

;

class PropertyFinderClient {
  
  
  
  
   __init() {this.accessToken = null}
   __init2() {this.tokenExpiry = null}

   constructor() {;PropertyFinderClient.prototype.__init.call(this);PropertyFinderClient.prototype.__init2.call(this);
    this.baseUrl = process.env.PROPERTY_FINDER_API_GATEWAY || 'https://atlas.propertyfinder.com';
    this.apiKey = process.env.PROPERTY_FINDER_API_KEY || '';
    this.apiSecret = process.env.PROPERTY_FINDER_API_SECRET || '';
  }

   static getInstance() {
    if (!PropertyFinderClient.instance) {
      PropertyFinderClient.instance = new PropertyFinderClient();
    }
    return PropertyFinderClient.instance;
  }

   async getAuthToken() {
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

    const data = await response.json();
    this.accessToken = data.accessToken;
    this.tokenExpiry = now + (data.expiresIn - 60) * 1000;
    return this.accessToken;
  }

   async request(path, options = {}) {
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

    if (response.status === 204) return null ;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`PF API ${response.status}: ${errorData.detail || errorData.title || 'Unknown error'}`);
    }

    return response.json();
  }

  // ── Listings ──

   async searchListings(params = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await this.request(`/listings${query ? `?${query}` : ''}`);
    return {
      data: response.results || [],
      pagination: response.pagination || {}
    };
  }

   async createListing(listing) {
    const validation = EgyptListingValidator.validate(listing);
    if (!validation.isValid) {
      throw new Error(`PF Validation failed: ${validation.errors.join('; ')}`);
    }
    return this.request('/listings', { method: 'POST', body: JSON.stringify(listing) });
  }

   async updateListing(id, updates) {
    return this.request(`/listings/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
  }

   async deleteListing(id) {
    return this.request(`/listings/${id}`, { method: 'DELETE' });
  }

   async publishListing(id) {
    return this.request(`/listings/${id}/publish`, { method: 'POST' });
  }

   async unpublishListing(id) {
    return this.request(`/listings/${id}/unpublish`, { method: 'POST' });
  }

   async getPublishPrice(id) {
    return this.request(`/listings/${id}/publish/prices`);
  }

   async getAmenities() {
    return this.request('/amenities');
  }

  // ── Leads ──

   async fetchLeads(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/leads${query ? `?${query}` : ''}`);
  }

  /**
   * Alias for fetchLeads used by the Sierra Estates Wealth Registry protocol.
   */
   async fetchInvestmentStakeholderRegistry(params = {}) {
    return this.fetchLeads(params);
  }

  // ── Locations ──

   async searchLocations(search) {
    return this.request(`/locations?search=${encodeURIComponent(search)}`);
  }

   async getLocations(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/locations${query ? `?${query}` : ''}`);
  }

  // ── Users ──

   async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/users${query ? `?${query}` : ''}`);
  }

  // ── Webhooks ──

   async subscribeWebhook(eventId, url, secret) {
    return this.request('/webhooks', {
      method: 'POST',
      body: JSON.stringify({ eventId, url, ...(secret ? { secret } : {}) }),
    });
  }

   async listWebhooks() {
    return this.request('/webhooks');
  }

  // ── Credits ──

   async getCreditBalance() {
    return this.request('/credits/balance');
  }
}

export const pfClient = PropertyFinderClient.getInstance();
export default PropertyFinderClient;
