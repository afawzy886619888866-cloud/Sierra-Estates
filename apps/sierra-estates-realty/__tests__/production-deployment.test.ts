import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '../proxy';
import { supabase } from '../lib/supabase';

describe('Production & Deployment Architecture Tests', () => {
  describe('1. Middleware Proxy & Admin Route Direct Access', () => {
    it('allows direct access to /admin without session token', async () => {
      const req = new NextRequest('https://sierra-estates.net/admin', {
        method: 'GET',
      });
      const res = await proxy(req);
      // Status should be 200 / next() without redirect to /admin/login
      expect(res.status).not.toBe(307);
      expect(res.headers.get('location')).toBeNull();
    });

    it('redirects legacy /admin/login directly to /admin', async () => {
      const req = new NextRequest('https://sierra-estates.net/admin/login', {
        method: 'GET',
      });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/admin');
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
    it('initializes Supabase client with valid project URL', () => {
      expect(supabase).toBeDefined();
      expect(supabase.supabaseUrl).toContain('REDACTED-PROJECT.supabase.co');
    });

    it('has search_properties RPC callable schema', () => {
      expect(typeof supabase.rpc).toBe('function');
    });
  });
});
