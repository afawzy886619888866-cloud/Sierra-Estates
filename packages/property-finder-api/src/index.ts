import axios from 'axios';
export * from './connector';

const PROD_ATLAS_BASE = 'https://atlas.propertyfinder.com/v1';
const SANDBOX_ATLAS_BASE = 'https://sandbox.atlas.propertyfinder.com/v1';

export type PropertyFinderEnvironment = 'production' | 'sandbox';

export interface PropertyFinderTokenState {
  accessToken: string;
  expiresAtMs: number;
  cacheKey: string;
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
  locationId?: number;
  publicProfileId?: number;
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

/**
 * Strict OpenAPI 3.1.0 `request-combined-flat` payload shape for Egypt `POST /v1/listings`.
 */
export interface PropertyFinderAtlasRequestPayload {
  reference: string;
  category: 'residential' | 'commercial';
  offeringType: 'sale' | 'rent';
  type: string;
  bedrooms: string;
  bathrooms: string;
  size: number;
  location: { id: number };
  assignedTo?: { id: number };
  price: {
    type: 'sale' | 'monthly' | 'yearly';
    amounts: {
      sale?: number;
      monthly?: number;
      yearly?: number;
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

export function resolveEnvironment(): PropertyFinderEnvironment {
  return (process.env.PROPERTY_FINDER_ENV || 'production').trim().toLowerCase() === 'sandbox'
    ? 'sandbox'
    : 'production';
}

export function resolveGatewayBase(): string {
  const explicit = (process.env.PROPERTY_FINDER_API_GATEWAY || '').trim().replace(/\/+$/, '');
  if (explicit) {
    return explicit.endsWith('/v1') ? explicit : `${explicit}/v1`;
  }
  return resolveEnvironment() === 'sandbox' ? SANDBOX_ATLAS_BASE : PROD_ATLAS_BASE;
}

function resolveCredentials(): { apiKey: string; apiSecret: string; staticJwt: string } {
  if (resolveEnvironment() === 'sandbox') {
    return {
      apiKey: process.env.PROPERTY_FINDER_SANDBOX_API_KEY || process.env.PROPERTY_FINDER_API_KEY || '',
      apiSecret: process.env.PROPERTY_FINDER_SANDBOX_API_SECRET || process.env.PROPERTY_FINDER_API_SECRET || '',
      staticJwt: process.env.PROPERTY_FINDER_SANDBOX_JWT_TOKEN || process.env.PROPERTY_FINDER_JWT_TOKEN || '',
    };
  }
  return {
    apiKey: process.env.PROPERTY_FINDER_API_KEY || '',
    apiSecret: process.env.PROPERTY_FINDER_API_SECRET || '',
    staticJwt: process.env.PROPERTY_FINDER_JWT_TOKEN || '',
  };
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

  const locationSuffix = unit.compound ? ` in ${unit.compound}` : unit.city ? ` in ${unit.city}` : '';

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
      en: unit.title || `${unit.propertyType || 'Luxury Property'}${locationSuffix}`,
      ...(unit.titleAr ? { ar: unit.titleAr } : {}),
    },
    description: {
      en: unit.description || unit.title || `Verified property${locationSuffix}.`,
      ...(unit.descriptionAr ? { ar: unit.descriptionAr } : {}),
    },
    media: {
      images: cleanImages,
    },
  };
}

/**
 * Builds an OpenAPI 3.1.0 `request-combined-flat` payload ready for `POST /v1/listings`.
 * Requires an explicit integer `locationId` (never fabricates a fallback).
 */
export function buildAtlasListingRequest(
  unit: SierraListingInput,
  options: { locationId: number; publicProfileId?: number },
): PropertyFinderAtlasRequestPayload {
  const formatted = formatForPropertyFinder(unit);
  const isRent = /(rent|lease|ايجار)/.test(String(unit.dealType || 'sale').toLowerCase());
  const normalizedType =
    formatted.type === 'office'
      ? 'office-space'
      : formatted.type === 'twin house'
        ? 'twin-house'
        : formatted.type === 'standalone villa'
          ? 'villa'
          : formatted.type;

  return {
    reference: formatted.reference,
    category: formatted.category,
    offeringType: isRent ? 'rent' : 'sale',
    type: normalizedType,
    bedrooms: formatted.bedrooms === 0 ? 'studio' : String(formatted.bedrooms),
    bathrooms: formatted.bathrooms === 0 ? 'none' : String(formatted.bathrooms),
    size: formatted.size,
    location: { id: options.locationId },
    ...(options.publicProfileId ? { assignedTo: { id: options.publicProfileId } } : {}),
    price: formatted.price,
    title: formatted.title,
    description: formatted.description,
    media: formatted.media,
  };
}

/**
 * Exchanges API Key + Secret against Property Finder Enterprise Atlas OAuth2
 * (`POST /v1/auth/token`) with environment-aware in-memory caching.
 */
export async function getAuthToken(): Promise<string> {
  const base = resolveGatewayBase();
  const { apiKey, apiSecret, staticJwt } = resolveCredentials();
  const cacheKey = `${base}|${apiKey}`;

  if (cachedToken && cachedToken.cacheKey === cacheKey && isTokenValid(cachedToken.accessToken, cachedToken.expiresAtMs)) {
    return cachedToken.accessToken;
  }

  if (apiKey && apiSecret) {
    const res = await fetch(`${base}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-PF-Error-Format': 'problem-json-v2',
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
      cacheKey,
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
      'X-PF-Error-Format': 'problem-json-v2',
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
      'X-PF-Error-Format': 'problem-json-v2',
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
    headers: { Authorization: `Bearer ${token}`, 'X-PF-Error-Format': 'problem-json-v2' },
  });
  return response.data;
}

export async function createListing(
  data: PropertyFinderFormattedPayload | PropertyFinderAtlasRequestPayload | Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const token = await getAuthToken();
  const response = await axios.post<Record<string, unknown>>(`${resolveGatewayBase()}/listings`, data, {
    headers: { Authorization: `Bearer ${token}`, 'X-PF-Error-Format': 'problem-json-v2' },
  });
  return response.data;
}

export async function updateListing(
  id: string,
  data: Partial<PropertyFinderFormattedPayload> | Partial<PropertyFinderAtlasRequestPayload> | Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const token = await getAuthToken();
  const response = await axios.put<Record<string, unknown>>(`${resolveGatewayBase()}/listings/${id}`, data, {
    headers: { Authorization: `Bearer ${token}`, 'X-PF-Error-Format': 'problem-json-v2' },
  });
  return response.data;
}

export async function deleteListing(id: string): Promise<Record<string, unknown>> {
  const token = await getAuthToken();
  const response = await axios.delete<Record<string, unknown>>(`${resolveGatewayBase()}/listings/${id}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-PF-Error-Format': 'problem-json-v2' },
  });
  return response.data;
}

export async function publishListing(id: string): Promise<Record<string, unknown>> {
  const token = await getAuthToken();
  const response = await axios.post<Record<string, unknown>>(
    `${resolveGatewayBase()}/listings/${id}/publish`,
    {},
    { headers: { Authorization: `Bearer ${token}`, 'X-PF-Error-Format': 'problem-json-v2' } },
  );
  return response.data;
}

export async function unpublishListing(id: string): Promise<Record<string, unknown>> {
  const token = await getAuthToken();
  const response = await axios.post<Record<string, unknown>>(
    `${resolveGatewayBase()}/listings/${id}/unpublish`,
    {},
    { headers: { Authorization: `Bearer ${token}`, 'X-PF-Error-Format': 'problem-json-v2' } },
  );
  return response.data;
}

export async function setFeatured(id: string, featured: boolean): Promise<Record<string, unknown>> {
  const token = await getAuthToken();
  const response = await axios.patch<Record<string, unknown>>(
    `${resolveGatewayBase()}/listings/${id}`,
    { featured },
    { headers: { Authorization: `Bearer ${token}`, 'X-PF-Error-Format': 'problem-json-v2' } },
  );
  return response.data;
}
