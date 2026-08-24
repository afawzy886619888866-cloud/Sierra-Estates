import axios from 'axios';
export * from './connector';

const API_BASE = process.env.PROPERTY_FINDER_API_GATEWAY || '';
const API_KEY = process.env.PROPERTY_FINDER_API_KEY || '';
const CLIENT_ID = process.env.PROPERTY_FINDER_CLIENT_ID || '';
const CLIENT_SECRET = process.env.PROPERTY_FINDER_CLIENT_SECRET || '';

/**
 * Placeholder — returns the raw API key with no OAuth/JWT exchange, even though
 * CLAUDE.md documents PROPERTY_FINDER_JWT_TOKEN as the real bearer token flow.
 * listProperties/getProperty/etc below will send this as-is; against the real
 * Property Finder API that will fail auth until a proper token exchange is wired in.
 */
async function getAuthToken() {
  if (!API_KEY) {
    console.warn('[property-finder-api] PROPERTY_FINDER_API_KEY is unset — requests will fail auth.');
  }
  return API_KEY;
}

export async function listProperties(params: Record<string, any> = {}) {
  const token = await getAuthToken();
  const response = await axios.get(`${API_BASE}/properties`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return response.data;
}

export async function getProperty(id: string) {
  const token = await getAuthToken();
  const response = await axios.get(`${API_BASE}/properties/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function createListing(data: any) {
  const token = await getAuthToken();
  const response = await axios.post(`${API_BASE}/properties`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function updateListing(id: string, data: any) {
  const token = await getAuthToken();
  const response = await axios.put(`${API_BASE}/properties/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function deleteListing(id: string) {
  const token = await getAuthToken();
  const response = await axios.delete(`${API_BASE}/properties/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function setFeatured(id: string, featured: boolean) {
  const token = await getAuthToken();
  const response = await axios.patch(`${API_BASE}/properties/${id}`, { featured }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}
