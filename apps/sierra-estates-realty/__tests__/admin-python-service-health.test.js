/**
 * Tests for the admin Python service health route.
 * This route provides a real entry point to check the apps/api Python service.
 */
import { NextRequest } from 'next/server';

jest.mock('@/lib/server/python-api-client');
jest.mock('@/lib/server/auth-guard');

describe('GET /api/admin/python-service/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns health status when Python API is reachable and user is admin', async () => {
    const { checkPythonApiHealth } = require('@/lib/server/python-api-client');
    checkPythonApiHealth.mockResolvedValueOnce({
      reachable: true,
      status: 'ok',
      service: 'apps/api',
    });

    const { verifyAdminRequest } = require('@/lib/server/auth-guard');
    verifyAdminRequest.mockResolvedValueOnce({
      authenticated: true,
      uid: 'test-admin-uid',
      method: 'firebase',
    });

    const { GET } = require('@/app/api/admin/python-service/health/route');
    const req = new NextRequest('http://localhost:3000/api/admin/python-service/health', {
      method: 'GET',
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reachable).toBe(true);
    expect(data.status).toBe('ok');
    expect(data.service).toBe('apps/api');
  });

  test('returns 503 when Python API is unreachable but user is authenticated', async () => {
    const { checkPythonApiHealth } = require('@/lib/server/python-api-client');
    checkPythonApiHealth.mockResolvedValueOnce({
      reachable: false,
      error: 'Connection refused',
    });

    const { verifyAdminRequest } = require('@/lib/server/auth-guard');
    verifyAdminRequest.mockResolvedValueOnce({
      authenticated: true,
      uid: 'test-admin-uid',
      method: 'firebase',
    });

    const { GET } = require('@/app/api/admin/python-service/health/route');
    const req = new NextRequest('http://localhost:3000/api/admin/python-service/health', {
      method: 'GET',
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.reachable).toBe(false);
  });

  test('returns 401 when user is not authenticated', async () => {
    const { verifyAdminRequest } = require('@/lib/server/auth-guard');
    verifyAdminRequest.mockResolvedValueOnce({
      authenticated: false,
      method: 'none',
    });

    const { unauthorizedResponse } = require('@/lib/server/auth-guard');
    unauthorizedResponse.mockReturnValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );

    const { GET } = require('@/app/api/admin/python-service/health/route');
    const req = new NextRequest('http://localhost:3000/api/admin/python-service/health', {
      method: 'GET',
    });

    const response = await GET(req);

    expect(response.status).toBe(401);
  });
});
