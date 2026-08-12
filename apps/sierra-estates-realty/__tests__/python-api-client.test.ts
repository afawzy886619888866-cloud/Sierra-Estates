/**
 * Tests for Python API client.
 * Note: The client reads PYTHON_API_BASE_URL at module import time,
 * so tests mock at the integration level and reset modules between tests.
 */
import type { PortfolioAssetPayload } from '@/lib/server/python-api-client';

jest.mock('@/lib/logger');

describe('lib/server/python-api-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('checkPythonApiHealth()', () => {
    test('returns unreachable when PYTHON_API_BASE_URL is not configured', async () => {
      process.env.PYTHON_API_BASE_URL = '';
      jest.resetModules();

      const { checkPythonApiHealth } = await import('@/lib/server/python-api-client');
      const health = await checkPythonApiHealth();
      expect(health.reachable).toBe(false);
      expect(health.error).toContain('not configured');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('pings health endpoint successfully', async () => {
      process.env.PYTHON_API_BASE_URL = 'http://localhost:8000';
      jest.resetModules();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'ok',
            service: 'apps/api',
          }),
      });

      const { checkPythonApiHealth } = await import('@/lib/server/python-api-client');
      const health = await checkPythonApiHealth();
      expect(health.reachable).toBe(true);
      expect(health.status).toBe('ok');
      expect(health.service).toBe('apps/api');
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/health');
    });

    test('handles HTTP errors gracefully', async () => {
      process.env.PYTHON_API_BASE_URL = 'http://localhost:8000';
      jest.resetModules();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      const { checkPythonApiHealth } = await import('@/lib/server/python-api-client');
      const health = await checkPythonApiHealth();
      expect(health.reachable).toBe(false);
      expect(health.error).toContain('503');
    });

    test('handles network errors', async () => {
      process.env.PYTHON_API_BASE_URL = 'http://localhost:8000';
      jest.resetModules();

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const { checkPythonApiHealth } = await import('@/lib/server/python-api-client');
      const health = await checkPythonApiHealth();
      expect(health.reachable).toBe(false);
    });
  });

  describe('syncPortfolioAssetsViaPythonApi()', () => {
    test('returns failure when PYTHON_API_BASE_URL is not configured', async () => {
      process.env.PYTHON_API_BASE_URL = '';
      jest.resetModules();

      const { syncPortfolioAssetsViaPythonApi } = await import(
        '@/lib/server/python-api-client'
      );
      const result = await syncPortfolioAssetsViaPythonApi([]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    test('syncs portfolio assets successfully', async () => {
      process.env.PYTHON_API_BASE_URL = 'http://localhost:8000';
      jest.resetModules();

      const assets: PortfolioAssetPayload[] = [
        {
          id: 'unit-1',
          title_en: 'Luxury Villa',
          price: 5000000,
          location: 'New Cairo',
        },
        {
          id: 'unit-2',
          title_ar: 'شقة فاخرة',
          price: 2500000,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            sync_status: 'success',
            synced_count: 2,
            errors: [],
          }),
      });

      const { syncPortfolioAssetsViaPythonApi } = await import(
        '@/lib/server/python-api-client'
      );
      const result = await syncPortfolioAssetsViaPythonApi(assets);
      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(2);
      expect(result.errors).toEqual([]);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/property-finder/sync',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assets }),
        })
      );
    });

    test('handles HTTP errors', async () => {
      process.env.PYTHON_API_BASE_URL = 'http://localhost:8000';
      jest.resetModules();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request'),
      });

      const { syncPortfolioAssetsViaPythonApi } = await import(
        '@/lib/server/python-api-client'
      );
      const result = await syncPortfolioAssetsViaPythonApi([]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('400');
    });

    test('handles network errors', async () => {
      process.env.PYTHON_API_BASE_URL = 'http://localhost:8000';
      jest.resetModules();

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      const { syncPortfolioAssetsViaPythonApi } = await import(
        '@/lib/server/python-api-client'
      );
      const result = await syncPortfolioAssetsViaPythonApi([]);
      expect(result.success).toBe(false);
    });
  });

  describe('graceful degradation', () => {
    test('all Python API calls no-op when base URL is missing', async () => {
      process.env.PYTHON_API_BASE_URL = '';
      jest.resetModules();

      const { checkPythonApiHealth, syncPortfolioAssetsViaPythonApi } = await import(
        '@/lib/server/python-api-client'
      );

      const health = await checkPythonApiHealth();
      expect(health.reachable).toBe(false);

      const sync = await syncPortfolioAssetsViaPythonApi([{ id: 'test', price: 1000 }]);
      expect(sync.success).toBe(false);

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
