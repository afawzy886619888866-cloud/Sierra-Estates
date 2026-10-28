/**
 * Property Finder Enterprise API Client (OpenAPI 3.1.0)
 * Supports both Production (https://atlas.propertyfinder.com) and
 * Sandbox (https://sandbox.atlas.propertyfinder.com) via PROPERTY_FINDER_ENV.
 */

import {
  PFEnvironment,
  PFListing,
  PFListingRequest,
  PFLead,
  PFLocationInfo as PFLocation,
  PFAuthToken as PFAccessToken,
  PFPagination,
  PFProblemDetail,
  PFTranslation,
  PFUser,
  PFWebhookSubscription,
} from './property-finder/types';
import { EgyptListingValidator } from './property-finder/validation';

export type {
  PFEnvironment,
  PFListing,
  PFListingRequest,
  PFLead,
  PFLocation,
  PFPagination,
  PFProblemDetail,
  PFTranslation,
  PFUser,
  PFWebhookSubscription,
};

interface ResolvedPFConfig {
  env: PFEnvironment;
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
}

function resolvePFConfig(): ResolvedPFConfig {
  const envRaw = (process.env.PROPERTY_FINDER_ENV || 'production').trim().toLowerCase();
  const env: PFEnvironment = envRaw === 'sandbox' ? 'sandbox' : 'production';

  const explicitGateway = (process.env.PROPERTY_FINDER_API_GATEWAY || '')
    .trim()
    .replace(/\/v1\/?$/i, '')
    .replace(/\/+$/, '');

  if (env === 'sandbox') {
    return {
      env,
      baseUrl: explicitGateway || 'https://sandbox.atlas.propertyfinder.com',
      apiKey: process.env.PROPERTY_FINDER_SANDBOX_API_KEY || process.env.PROPERTY_FINDER_API_KEY || '',
      apiSecret: process.env.PROPERTY_FINDER_SANDBOX_API_SECRET || process.env.PROPERTY_FINDER_API_SECRET || '',
    };
  }

  return {
    env,
    baseUrl: explicitGateway || 'https://atlas.propertyfinder.com',
    apiKey: process.env.PROPERTY_FINDER_API_KEY || '',
    apiSecret: process.env.PROPERTY_FINDER_API_SECRET || '',
  };
}

class PropertyFinderClient {
  private static instance: PropertyFinderClient;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;
  private cachedConfigKey: string | null = null;

  public static getInstance(): PropertyFinderClient {
    if (!PropertyFinderClient.instance) {
      PropertyFinderClient.instance = new PropertyFinderClient();
    }
    return PropertyFinderClient.instance;
  }

  public getEnvironment(): PFEnvironment {
    return resolvePFConfig().env;
  }

  private async getAuthToken(): Promise<{ token: string; baseUrl: string }> {
    const cfg = resolvePFConfig();
    const configKey = `${cfg.env}|${cfg.baseUrl}|${cfg.apiKey}`;
    const now = Date.now();

    if (
      this.accessToken &&
      this.tokenExpiry &&
      this.cachedConfigKey === configKey &&
      now < this.tokenExpiry
    ) {
      return { token: this.accessToken, baseUrl: cfg.baseUrl };
    }

    const response = await fetch(`${cfg.baseUrl}/v1/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-PF-Error-Format': 'problem-json-v2',
      },
      body: JSON.stringify({ apiKey: cfg.apiKey, apiSecret: cfg.apiSecret }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`PF Auth failed (${cfg.env} ${response.status}): ${err}`);
    }

    const data = (await response.json()) as PFAccessToken;
    this.accessToken = data.accessToken;
    this.tokenExpiry = now + Math.max(0, (data.expiresIn || 1800) - 60) * 1000;
    this.cachedConfigKey = configKey;
    return { token: this.accessToken, baseUrl: cfg.baseUrl };
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const { token, baseUrl } = await this.getAuthToken();
    const url = `${baseUrl}/v1${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-PF-Error-Format': 'problem-json-v2',
        ...options.headers,
      },
    });

    if (response.status === 204) return null as unknown as T;

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({ detail: response.statusText }))) as PFProblemDetail;
      const fieldSummary = Array.isArray(errorData.errors) && errorData.errors.length > 0
        ? ` [${errorData.errors.map((e) => `${e.pointer || e.field || 'field'}: ${e.detail || e.code || 'invalid'}`).join('; ')}]`
        : '';
      const codePrefix = errorData.code ? `(${errorData.code}) ` : '';
      throw new Error(
        `PF API ${response.status}: ${codePrefix}${errorData.detail || errorData.title || 'Unknown error'}${fieldSummary}`
      );
    }

    return (await response.json()) as T;
  }

  // ── Listings ──

  public async searchListings(
    params: Record<string, string> = {},
  ): Promise<{ data: PFListing[]; pagination: PFPagination }> {
    const query = new URLSearchParams(params).toString();
    const response = await this.request<{
      results?: PFListing[];
      data?: PFListing[];
      pagination?: PFPagination;
    }>(`/listings${query ? `?${query}` : ''}`);
    return {
      data: response?.results || response?.data || [],
      pagination: response?.pagination || {},
    };
  }

  public async createListing(listing: PFListingRequest): Promise<PFListing> {
    const validation = EgyptListingValidator.validate(listing);
    if (!validation.isValid) {
      throw new Error(`PF Validation failed: ${validation.errors.join('; ')}`);
    }
    return this.request<PFListing>('/listings', {
      method: 'POST',
      body: JSON.stringify(listing),
    });
  }

  public async updateListing(
    id: string | number,
    updates: Partial<PFListingRequest>,
  ): Promise<PFListing> {
    return this.request<PFListing>(`/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public async deleteListing(id: string | number): Promise<void> {
    return this.request<void>(`/listings/${id}`, { method: 'DELETE' });
  }

  public async publishListing(id: string | number): Promise<void> {
    return this.request<void>(`/listings/${id}/publish`, { method: 'POST' });
  }

  public async unpublishListing(id: string | number): Promise<void> {
    return this.request<void>(`/listings/${id}/unpublish`, { method: 'POST' });
  }

  public async getPublishPrice(id: string | number): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/listings/${id}/publish/prices`);
  }

  public async getAmenities(): Promise<string[]> {
    return this.request<string[]>('/amenities');
  }

  // ── Leads ──

  public async fetchLeads(
    params: Record<string, string> = {},
  ): Promise<{ data: PFLead[]; pagination: PFPagination }> {
    const query = new URLSearchParams(params).toString();
    const response = await this.request<{
      data?: PFLead[];
      results?: PFLead[];
      pagination?: PFPagination;
    }>(`/leads${query ? `?${query}` : ''}`);
    return {
      data: response?.data || response?.results || [],
      pagination: response?.pagination || {},
    };
  }

  /**
   * Alias for fetchLeads used by the Sierra Estates Wealth Registry protocol.
   */
  public async fetchInvestmentStakeholderRegistry(
    params: Record<string, string> = {},
  ): Promise<{ data: PFLead[]; pagination: PFPagination }> {
    return this.fetchLeads(params);
  }

  // ── Locations ──

  public async searchLocations(search: string): Promise<{ data: PFLocation[] }> {
    const response = await this.request<{ data?: PFLocation[]; results?: PFLocation[] }>(
      `/locations?search=${encodeURIComponent(search)}`,
    );
    return { data: response?.data || response?.results || [] };
  }

  public async getLocations(
    params: Record<string, string> = {},
  ): Promise<{ data: PFLocation[]; pagination: PFPagination }> {
    const query = new URLSearchParams(params).toString();
    const response = await this.request<{
      data?: PFLocation[];
      results?: PFLocation[];
      pagination?: PFPagination;
    }>(`/locations${query ? `?${query}` : ''}`);
    return {
      data: response?.data || response?.results || [],
      pagination: response?.pagination || {},
    };
  }

  // ── Users ──

  public async getUsers(
    params: Record<string, string> = {},
  ): Promise<{ data: PFUser[]; pagination: PFPagination }> {
    const query = new URLSearchParams(params).toString();
    const response = await this.request<{
      data?: PFUser[];
      results?: PFUser[];
      pagination?: PFPagination;
    }>(`/users${query ? `?${query}` : ''}`);
    return {
      data: response?.data || response?.results || [],
      pagination: response?.pagination || {},
    };
  }

  // ── Webhooks ──

  public async subscribeWebhook(
    eventId: string,
    url: string,
    secret?: string,
  ): Promise<PFWebhookSubscription> {
    return this.request<PFWebhookSubscription>('/webhooks', {
      method: 'POST',
      body: JSON.stringify({ eventId, url, ...(secret ? { secret } : {}) }),
    });
  }

  public async listWebhooks(): Promise<{ data: PFWebhookSubscription[] }> {
    const response = await this.request<
      PFWebhookSubscription[] | { data?: PFWebhookSubscription[]; results?: PFWebhookSubscription[] }
    >('/webhooks');
    if (Array.isArray(response)) {
      return { data: response };
    }
    return { data: response?.data || response?.results || [] };
  }

  // ── Credits ──

  public async getCreditBalance(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('/credits/balance');
  }
}

export const pfClient = PropertyFinderClient.getInstance();
export default PropertyFinderClient;
