import axios from 'axios';

const API_BASE = process.env.PROPERTY_FINDER_API_GATEWAY || '';
const API_KEY = process.env.PROPERTY_FINDER_API_KEY || '';
const CLIENT_ID = process.env.PROPERTY_FINDER_CLIENT_ID || '';
const CLIENT_SECRET = process.env.PROPERTY_FINDER_CLIENT_SECRET || '';

/** Simple wrapper with token handling (placeholder) */
async function getAuthToken() {
  // In a real implementation you would exchange client_id/secret for a token.
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
