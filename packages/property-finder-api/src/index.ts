import axios from 'axios';
export * from './connector';

const DEFAULT_ATLAS_BASE = 'https://atlas.propertyfinder.com/v1';

export interface PropertyFinderTokenState {
  accessToken: string;
  expiresAtMs: number;
}

export interface SierraListingInput {
  id?: string;
  code?: string;
  pfReferenceNumber?: string;
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  propertyType?: string;
  dealType?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  areaSqm?: number;
  compound?: string;
  city?: string;
  images?: string[];
  agentEmail?: string;
}

export interface PropertyFinderFormattedPayload {
  reference: string;
  category: 'residential' | 'commercial';
  offeringType: 'RS' | 'RR' | 'CS' | 'CR';
  type: string;
  bedrooms: number;
  bathrooms: number;
  size: number;
  price: {
    type: 'sale' | 'monthly';
    amounts: {
      sale?: number;
      monthly?: number;
    };
  };
  title: {
    en: string;
    ar?: string;
  };
  description: {
    en: string;
    ar?: string;
  };
  media: {
    images: Array<{ original: { url: string } }>;
  };
}

export interface PropertyFinderAtlasListing {
  id: string | number;
  reference?: string;
  category?: string;
  type?: string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  size?: number;
  price?: {
    type?: string;
    amounts?: {
      sale?: number;
      yearly?: number;
      monthly?: number;
    };
  };
  location?: {
    id?: string | number;
    name?: string;
  };
  title?: {
    en?: string;
    ar?: string;
  };
  state?: {
    stage?: string;
    type?: string;
  };
  qualityScore?: {
    value?: number;
  };
}

export interface PropertyFinderAtlasLead {
  id: string;
  channel?: string;
  status?: string;
  createdAt?: string;
  sender?: {
    name?: string;
    contacts?: Array<{ type?: string; value?: string }>;
  };
  listing?: {
    id?: string;
    reference?: string;
  };
  publicProfile?: {
    id?: number | string;
    name?: string;
  };
}

let cachedToken: PropertyFinderTokenState | null = null;

function resolveGatewayBase(): string {
  return (process.env.PROPERTY_FINDER_API_GATEWAY || DEFAULT_ATLAS_BASE).replace(/\/+$/, '');
}

/**
 * Computes token expiry timestamp in ms with a 60-second safety refresh buffer.
 */
export function computeTokenExpiry(expiresInSeconds: number, nowMs: number = Date.now()): number {
  const safeTtlSec = Math.max(0, Number(expiresInSeconds) - 60);
  return nowMs + safeTtlSec * 1000;
}

export function isTokenValid(token: string | null | undefined, expiresAtMs: number, nowMs: number = Date.now()): boolean {
  return Boolean(token && token.trim().length > 0 && nowMs < expiresAtMs);
}

/**
 * Splits large asset arrays into bounded batches (default 50) to respect PF rate limits.
 */
export function chunkAssets<T>(items: readonly T[], batchSize: number = 50): T[][] {
  const safeSize = Math.max(1, Math.floor(batchSize));
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += safeSize) {
    chunks.push(items.slice(i, i + safeSize));
  }
  return chunks;
}

/**
 * Transforms a Sierra Estates listing into Property Finder Enterprise Atlas payload shape.
 */
export function formatForPropertyFinder(unit: SierraListingInput): PropertyFinderFormattedPayload {
  const rawType = String(unit.propertyType || 'apartment').toLowerCase();
  const isCommercial = /(office|commercial|retail|shop|clinic|administrative)/.test(rawType);
  const isRent = /(rent|lease|ايجار)/.test(String(unit.dealType || 'sale').toLowerCase());
  const category: 'residential' | 'commercial' = isCommercial ? 'commercial' : 'residential';
  const offeringType: 'RS' | 'RR' | 'CS' | 'CR' = isCommercial
    ? (isRent ? 'CR' : 'CS')
    : (isRent ? 'RR' : 'RS');

  const reference =
    unit.pfReferenceNumber ||
    unit.code ||
    (unit.id ? `SE-${unit.id.slice(0, 8).toUpperCase()}` : 'SE-DIRECT');

  const amount = Math.max(0, Number(unit.price) || 0);
  const cleanImages = (unit.images || [])
    .filter((u) => /^https?:\/\//i.test(String(u || '').trim()))
    .map((url) => ({ original: { url: url.trim() } }));

  return {
    reference,
    category,
    offeringType,
    type: rawType,
    bedrooms: Math.max(0, Number(unit.bedrooms) || 0),
    bathrooms: Math.max(0, Number(unit.bathrooms) || 0),
    size: Math.max(0, Number(unit.areaSqm) || 0),
    price: {
      type: isRent ? 'monthly' : 'sale',
      amounts: isRent ? { monthly: amount } : { sale: amount },
    },
    title: {
      en: unit.title || `${unit.propertyType || 'Luxury Property'} in ${unit.compound || 'New Cairo'}`,
      ...(unit.titleAr ? { ar: unit.titleAr } : {}),
    },
    description: {
      en: unit.description || unit.title || `Verified property in ${unit.compound || 'New Cairo'}.`,
      ...(unit.descriptionAr ? { ar: unit.descriptionAr } : {}),
    },
    media: {
      images: cleanImages,
    },
  };
}

/**
 * Exchanges `PROPERTY_FINDER_API_KEY` + `PROPERTY_FINDER_API_SECRET` against
 * Property Finder Enterprise Atlas OAuth2 (`POST /v1/auth/token`) with in-memory
 * caching, falling back to `PROPERTY_FINDER_JWT_TOKEN` when set directly.
 */
export async function getAuthToken(): Promise<string> {
  if (cachedToken && isTokenValid(cachedToken.accessToken, cachedToken.expiresAtMs)) {
    return cachedToken.accessToken;
  }

  const apiKey = process.env.PROPERTY_FINDER_API_KEY || '';
  const apiSecret = process.env.PROPERTY_FINDER_API_SECRET || '';
  const staticJwt = process.env.PROPERTY_FINDER_JWT_TOKEN || '';

  if (apiKey && apiSecret) {
    const base = resolveGatewayBase();
    const res = await fetch(`${base}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ apiKey, apiSecret }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`[property-finder-api] Atlas OAuth2 token exchange failed: HTTP ${res.status}`);
    }

    const payload = (await res.json()) as { accessToken?: string; expiresIn?: number };
    if (!payload.accessToken) {
      throw new Error('[property-finder-api] Atlas OAuth2 response missing accessToken');
    }

    cachedToken = {
      accessToken: payload.accessToken,
      expiresAtMs: computeTokenExpiry(payload.expiresIn ?? 1800),
    };
    return cachedToken.accessToken;
  }

  if (staticJwt) {
    return staticJwt;
  }

  if (!apiKey) {
    console.warn('[property-finder-api] PROPERTY_FINDER_API_KEY / PROPERTY_FINDER_API_SECRET unset.');
  }
  return apiKey;
}

export async function listProperties(
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<{ results: PropertyFinderAtlasListing[]; pagination?: Record<string, number> }> {
  const token = await getAuthToken();
  const base = resolveGatewayBase();
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) search.set(k, String(v));
  }
  const qs = search.toString();
  const res = await fetch(`${base}/listings${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    throw new Error(`[property-finder-api] GET /listings failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    results?: PropertyFinderAtlasListing[];
    data?: PropertyFinderAtlasListing[];
    pagination?: Record<string, number>;
  };
  return {
    results: Array.isArray(data.results) ? data.results : Array.isArray(data.data) ? data.data : [],
    pagination: data.pagination,
  };
}

export async function listAtlasLeads(
  params: { perPage?: number; page?: number } = {},
): Promise<{ data: PropertyFinderAtlasLead[]; meta?: Record<string, unknown> }> {
  const token = await getAuthToken();
  const base = resolveGatewayBase();
  const search = new URLSearchParams();
  if (params.perPage) search.set('perPage', String(params.perPage));
  if (params.page) search.set('page', String(params.page));
  const qs = search.toString();
  const res = await fetch(`${base}/leads${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    throw new Error(`[property-finder-api] GET /leads failed: HTTP ${res.status}`);
  }
  const payload = (await res.json()) as {
    data?: PropertyFinderAtlasLead[];
    results?: PropertyFinderAtlasLead[];
    meta?: Record<string, unknown>;
  };
  return {
    data: Array.isArray(payload.data) ? payload.data : Array.isArray(payload.results) ? payload.results : [],
    meta: payload.meta,
  };
}

export async function getProperty(id: string): Promise<Record<string, unknown>> {
  const token = await getAuthToken();
  const response = await axios.get<Record<string, unknown>>(`${resolveGatewayBase()}/listings/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function createListing(data: PropertyFinderFormattedPayload | Record<string, unknown>): Promise<Record<string, unknown>> {
  const token = await getAuthToken();
  const response = await axios.post<Record<string, unknown>>(`${resolveGatewayBase()}/listings`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function updateListing(
  id: string,
  data: Partial<PropertyFinderFormattedPayload> | Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const token = await getAuthToken();
  const response = await axios.put<Record<string, unknown>>(`${resolveGatewayBase()}/listings/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function deleteListing(id: string): Promise<Record<string, unknown>> {
  const token = await getAuthToken();
  const response = await axios.delete<Record<string, unknown>>(`${resolveGatewayBase()}/listings/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function setFeatured(id: string, featured: boolean): Promise<Record<string, unknown>> {
  const token = await getAuthToken();
  const response = await axios.patch<Record<string, unknown>>(
    `${resolveGatewayBase()}/listings/${id}`,
    { featured },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return response.data;
}
