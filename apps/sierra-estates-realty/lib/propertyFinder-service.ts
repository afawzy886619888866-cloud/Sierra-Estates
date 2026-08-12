type Primitive = string | number | boolean | null | undefined;

interface PropertyFinderLeadInput {
  propertyId: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  message?: string;
}

interface PropertyFinderPrice {
  value?: number;
  currency?: string;
  period?: string;
}

interface PropertyFinderImage {
  url?: string;
}

interface PropertyFinderPhoto {
  url?: string;
}

interface PropertyFinderLocation {
  id?: number | string;
  name?: string;
  latitude?: number;
  longitude?: number;
  coordinates?: {
    lat?: number;
    lng?: number;
  };
}

export interface PropertyFinderListing {
  id?: string | number;
  reference_number?: string;
  publishedDate?: string;
  created_at?: string;
  updated_at?: string;
  price?: number | PropertyFinderPrice;
  type?: string | { name?: string };
  status?: string;
  offering_type?: string;
  bedrooms?: number;
  city?: { name?: string };
  location?: PropertyFinderLocation;
  images?: PropertyFinderImage[];
  photos?: PropertyFinderPhoto[];
  agent?: { name?: string; phone?: string };
  isAvailable?: boolean;
  furnish?: { name?: string };
  postedBy?: string;
  [key: string]: Primitive | object | Array<unknown>;
}

interface PropertyFinderSearchResponse {
  data?: PropertyFinderListing[];
  results?: PropertyFinderListing[];
}

class PropertyFinderService {
  private static readonly TOKEN_BUFFER_SECONDS = 60;
  private static readonly MILLISECONDS_PER_SECOND = 1000;
  private readonly configuredBaseUrl =
    process.env.PROPERTY_FINDER_API_GATEWAY || 'https://gateway.propertyfinder.com/v2';
  private readonly clientId = process.env.PROPERTY_FINDER_CLIENT_ID || '';
  private readonly clientSecret = process.env.PROPERTY_FINDER_CLIENT_SECRET || '';
  private readonly apiKey = process.env.PROPERTY_FINDER_API_KEY || '';
  private readonly apiSecret = process.env.PROPERTY_FINDER_API_SECRET || '';
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  private get usesLegacyCredentials() {
    return !this.clientId && !this.clientSecret && !!this.apiKey && !!this.apiSecret;
  }

  private get requestBaseUrl() {
    if (this.usesLegacyCredentials) {
      return this.configuredBaseUrl.replace(/\/v2\/?$/, '/v1');
    }

    return this.configuredBaseUrl.replace(/\/$/, '');
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    if (this.accessToken && this.tokenExpiry && now < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.usesLegacyCredentials && (!this.clientId || !this.clientSecret)) {
      throw new Error('Property Finder credentials are missing');
    }

    if (this.usesLegacyCredentials && (!this.apiKey || !this.apiSecret)) {
      throw new Error('Property Finder API key credentials are missing');
    }

    const tokenUrl = `${this.requestBaseUrl}/auth/token`;

    const body = this.usesLegacyCredentials
      ? { apiKey: this.apiKey, apiSecret: this.apiSecret }
      : {
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        };

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Property Finder auth failed (${response.status}): ${details}`);
    }

    const payload = (await response.json()) as {
      access_token?: string;
      accessToken?: string;
      expires_in?: number;
      expiresIn?: number;
    };

    this.accessToken = payload.access_token || payload.accessToken || null;
    if (!this.accessToken) {
      throw new Error('Property Finder auth response did not include an access token');
    }

    const expiresIn = payload.expires_in ?? payload.expiresIn ?? 1800;
    this.tokenExpiry =
      now +
      Math.max(
        expiresIn - PropertyFinderService.TOKEN_BUFFER_SECONDS,
        PropertyFinderService.TOKEN_BUFFER_SECONDS
      ) *
        PropertyFinderService.MILLISECONDS_PER_SECOND;

    return this.accessToken;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.requestBaseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 204) {
      return null as T;
    }

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Property Finder request failed (${response.status}): ${details}`);
    }

    return (await response.json()) as T;
  }

  async createLead(input: PropertyFinderLeadInput) {
    return this.request('/leads', {
      method: 'POST',
      body: JSON.stringify({
        listing_id: input.propertyId,
        customer: {
          name: input.visitorName,
          email: input.visitorEmail,
          phone: input.visitorPhone,
        },
        message: input.message || '',
        source: 'website',
      }),
    });
  }

  async syncPropertiesForCity(cityId: string | number): Promise<PropertyFinderListing[]> {
    const query = new URLSearchParams({
      location_id: String(cityId),
      limit: '100',
    });

    const response = await this.request<PropertyFinderSearchResponse>(`/listings?${query.toString()}`);
    return response.data || response.results || [];
  }
}

export const propertyFinderService = new PropertyFinderService();
