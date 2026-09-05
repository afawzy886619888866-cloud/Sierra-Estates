
// Authored against Vitest but this directory runs under Jest, so the import
// threw at load and the whole suite never ran. Jest provides describe/it/expect
// as globals — the assertions below are unchanged.
import { NextRequest } from 'next/server';
import { proxy } from '../proxy';
import { supabase } from '../lib/supabase';

describe('Production & Deployment Architecture Tests', () => {
  // cors.ts builds its allowlist solely from ALLOWED_ORIGINS with no default, so
  // it correctly emits no allow-origin header when the var is unset. Set it here
  // rather than weakening the assertion — and note the deployment implication:
  // ALLOWED_ORIGINS must be configured in production or the site's own origin is
  // refused.
  const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;
  beforeAll(() => {
    process.env.ALLOWED_ORIGINS = 'https://sierra-estates.net,https://admin.sierra-estates.net';
  });
  afterAll(() => {
    if (originalAllowedOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
  });

  describe('1. Middleware Proxy & Admin Route Direct Access', () => {
    it('allows direct access to /admin without session token', async () => {
      const req = new NextRequest('https://sierra-estates.net/admin', {
        method: 'GET',
      });
      const res = await proxy(req);
      // Status should be 200 / next() without redirect to /admin/login
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('allows direct access to /admin/login without redirection', async () => {
      const req = new NextRequest('https://sierra-estates.net/admin/login', {
        method: 'GET',
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('attaches proper CORS headers to API routes', async () => {
      const req = new NextRequest('https://sierra-estates.net/api/listings', {
        method: 'OPTIONS',
        headers: { origin: 'https://sierra-estates.net' },
      });
      const res = await proxy(req);
      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe('https://sierra-estates.net');
    });
  });

  describe('2. Supabase Integration & Data Contract', () => {
    it('initializes the Supabase client from configured credentials', () => {
      // This used to assert the URL contained the hardcoded project ref, which
      // only held because the client fell back to it when the env var was
      // missing. That fallback meant a misconfigured deployment silently talked
      // to the production project, so it was removed: outside production the
      // client resolves to an obvious placeholder, and in production a missing
      // NEXT_PUBLIC_SUPABASE_URL throws instead of guessing.
      expect(supabase).toBeDefined();

      const url = (supabase as unknown as { supabaseUrl: string }).supabaseUrl;
      expect(url).toBe(
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
          process.env.SUPABASE_URL ||
          'https://placeholder.supabase.co'
      );
    });

    it('has search_properties RPC callable schema', () => {
      expect(typeof supabase.rpc).toBe('function');
    });
  });
});
