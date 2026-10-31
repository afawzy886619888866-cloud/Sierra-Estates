/**
 * Admin Route Protection & Server Gate Regression Test (FIX 4)
 *
 * Verifies that:
 * 1. Unauthenticated requests to /admin/* are redirected to /admin/login.
 * 2. /admin/login is accessible without an active session (no infinite redirect).
 * 3. Authenticated admin requests are admitted.
 */
import { proxy } from '../proxy';
import { NextRequest } from 'next/server';
import { SESSION_COOKIE, signSession } from '../lib/auth';

describe('Admin Route Gate (proxy & layout)', () => {
  it('redirects unauthenticated visitor requesting /admin to /admin/login', async () => {
    const req = new NextRequest('http://localhost:3000/admin', {
      headers: { host: 'localhost:3000' },
    });

    const res = await proxy(req);
    expect(res).toBeDefined();
    expect(res.status).toBe(307); // NextResponse.redirect default
    const location = res.headers.get('location');
    expect(location).toContain('/admin/login');
  });

  it('redirects unauthenticated visitor requesting /admin/properties to /admin/login with redirect param', async () => {
    const req = new NextRequest('http://localhost:3000/admin/properties', {
      headers: { host: 'localhost:3000' },
    });

    const res = await proxy(req);
    expect(res).toBeDefined();
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/admin/login');
    expect(location).toContain('redirect=%2Fadmin%2Fproperties');
  });

  it('allows access to /admin/login without redirection', async () => {
    const req = new NextRequest('http://localhost:3000/admin/login', {
      headers: { host: 'localhost:3000' },
    });

    const res = await proxy(req);
    expect(res).toBeDefined();
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('admits authenticated admin session to /admin', async () => {
    const token = await signSession({
      uid: 'admin-test-1',
      email: 'admin@sierra-estates.net',
      role: 'admin',
      name: 'Admin User',
    });

    const req = new NextRequest('http://localhost:3000/admin', {
      headers: {
        host: 'localhost:3000',
        cookie: `${SESSION_COOKIE}=${token}`,
      },
    });

    const res = await proxy(req);
    expect(res).toBeDefined();
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });
});
