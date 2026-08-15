/**
 * Tests: Edge Proxy (proxy.ts)
 *
 * Target architecture (INTEGRATION.md — two-domain host split):
 *   - CLIENT host (sierra-estates.net): serves the public site; /admin
 *     requests are 307-redirected to the admin host when ADMIN_HOST is set.
 *   - ADMIN host (admin.sierra-estates.net): the root `/` is rewritten to
 *     /admin so the console is served directly on its own domain.
 *   - Single-deployment mode (no ADMIN_HOST): /admin renders locally — the
 *     split is entirely inert.
 *
 * The proxy also handles:
 *   1. CORS preflight for /api routes
 *   2. Shared-secret gate on /api/orchestrate
 */
import { NextRequest } from 'next/server';
import { config, middleware } from '../proxy';

const ORIGINAL_SBR = process.env.SBR_SECRET_KEY;
const ORIGINAL_ADMIN_HOST = process.env.ADMIN_HOST;

function request(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(url, init as any);
}

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restore('SBR_SECRET_KEY', ORIGINAL_SBR);
  restore('ADMIN_HOST', ORIGINAL_ADMIN_HOST);
});

describe('proxy config', () => {
  it('matches the root, /api and /admin routes', () => {
    expect(config.matcher).toEqual(['/', '/api/:path*', '/admin/:path*']);
  });
});

describe('proxy — admin / public host split', () => {
  it('redirects /admin on the client host to the admin host (307)', async () => {
    process.env.ADMIN_HOST = 'admin.sierra-estates.net';
    const res = await middleware(request('https://sierra-estates.net/admin'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://admin.sierra-estates.net/admin');
  });

  it('serves /admin/login as-is on the admin host', async () => {
    process.env.ADMIN_HOST = 'admin.sierra-estates.net';
    const res = await middleware(request('https://admin.sierra-estates.net/admin/login'));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('rewrites the admin-host root `/` for unauthenticated user to redirect /admin/login', async () => {
    process.env.ADMIN_HOST = 'admin.sierra-estates.net';
    const res = await middleware(request('https://admin.sierra-estates.net/'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/admin/login');
  });

  it('leaves the client-host root `/` untouched', async () => {
    process.env.ADMIN_HOST = 'admin.sierra-estates.net';
    const res = await middleware(request('https://sierra-estates.net/'));
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects unauthenticated /admin to /admin/login when ADMIN_HOST is omitted', async () => {
    delete process.env.ADMIN_HOST;
    const admin = await middleware(request('https://example.com/admin'));
    expect(admin.status).toBe(307);
    expect(admin.headers.get('location')).toContain('/admin/login');
    const root = await middleware(request('https://example.com/'));
    expect(root.status).toBe(200);
  });
});

describe('proxy — CORS preflight', () => {
  it('answers OPTIONS /api with 204', async () => {
    const res = await middleware(
      request('https://sierra-estates.net/api/listings', { method: 'OPTIONS' }),
    );
    expect(res.status).toBe(204);
  });

  it('does not hijack OPTIONS on non-api routes', async () => {
    const res = await middleware(
      request('https://sierra-estates.net/', { method: 'OPTIONS' }),
    );
    expect(res.status).toBe(200);
  });
});

describe('proxy — /api/orchestrate shared-secret gate', () => {
  beforeEach(() => {
    process.env.SBR_SECRET_KEY = 'test-secret';
  });

  it('blocks /api/orchestrate without X-SBR-SECRET-KEY', async () => {
    const res = await middleware(
      request('https://sierra-estates.net/api/orchestrate', { method: 'POST' }),
    );
    expect(res.status).toBe(401);
  });

  it('blocks /api/orchestrate with wrong X-SBR-SECRET-KEY', async () => {
    const res = await middleware(
      request('https://sierra-estates.net/api/orchestrate', {
        method: 'POST',
        headers: { 'X-SBR-SECRET-KEY': 'wrong' },
      }),
    );
    expect(res.status).toBe(401);
  });

  it('allows /api/orchestrate with correct X-SBR-SECRET-KEY', async () => {
    const res = await middleware(
      request('https://sierra-estates.net/api/orchestrate', {
        method: 'POST',
        headers: { 'X-SBR-SECRET-KEY': 'test-secret' },
      }),
    );
    expect(res.status).toBe(200);
  });

  it('allows /api/orchestrate when SBR_SECRET_KEY is unset (local dev)', async () => {
    delete process.env.SBR_SECRET_KEY;
    const res = await middleware(
      request('https://sierra-estates.net/api/orchestrate', { method: 'POST' }),
    );
    expect(res.status).toBe(200);
  });

  it('blocks /api/orchestrate in production when SBR_SECRET_KEY is unset', async () => {
    delete process.env.SBR_SECRET_KEY;
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      configurable: true,
    });

    try {
      const res = await middleware(
        request('https://sierra-estates.net/api/orchestrate', { method: 'POST' }),
      );
      expect(res.status).toBe(503);
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        configurable: true,
      });
    }
  });
});
