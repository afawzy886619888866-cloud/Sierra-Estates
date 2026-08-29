/**
 * Admin Login & Google Mail Authentication Suite
 * Tests Google Mail login, admin email recognition, and auth API route.
 */

import { isAdminEmail, tryDemoLogin, signSession, verifySession } from '../lib/auth';
import { POST, GET } from '../app/api/auth/route';
import { NextRequest } from 'next/server';

describe('Admin Login & Google Mail Authentication', () => {
  describe('isAdminEmail helper', () => {
    it('identifies default bootstrap and standard admin emails', () => {
      expect(isAdminEmail('admin@sierra-estates.net')).toBe(true);
      expect(isAdminEmail('sierra@sierra-estates.net')).toBe(true);
      expect(isAdminEmail('owner@sierra-estates.net')).toBe(true);
      expect(isAdminEmail('developer@sierra-estates.net')).toBe(true);
      expect(isAdminEmail('admin@sierra.com')).toBe(true);
      expect(isAdminEmail('admin')).toBe(true);
    });

    it('identifies Google Mail admin accounts', () => {
      expect(isAdminEmail('admin@gmail.com')).toBe(true);
      expect(isAdminEmail('sierra.admin@gmail.com')).toBe(true);
      expect(isAdminEmail('sierraestates.admin@gmail.com')).toBe(true);
    });

    it('identifies any email on the sierra-estates.net domain', () => {
      expect(isAdminEmail('john.doe@sierra-estates.net')).toBe(true);
      expect(isAdminEmail('sales@sierra-estates.net')).toBe(true);
    });

    it('rejects unauthorized arbitrary emails', () => {
      expect(isAdminEmail('randomuser@gmail.com')).toBe(false);
      expect(isAdminEmail('buyer@yahoo.com')).toBe(false);
      expect(isAdminEmail('')).toBe(false);
    });
  });

  describe('tryDemoLogin with staff credentials', () => {
    it('authenticates admin@sierra-estates.net with sierra2026', () => {
      const session = tryDemoLogin('admin@sierra-estates.net', 'sierra2026');
      expect(session).not.toBeNull();
      expect(session?.role).toBe('admin');
      expect(session?.email).toBe('admin@sierra-estates.net');
    });

    it('authenticates Google Mail admin account with staff password', () => {
      const session = tryDemoLogin('admin@gmail.com', 'sierra2026');
      expect(session).not.toBeNull();
      expect(session?.role).toBe('admin');
    });

    it('rejects invalid password', () => {
      const session = tryDemoLogin('admin@sierra-estates.net', 'wrong-pass');
      expect(session).toBeNull();
    });
  });

  describe('POST /api/auth endpoint', () => {
    it('authenticates Google Mail sign-in with provider=google', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'signin',
          provider: 'google',
          email: 'admin.investor@gmail.com',
          name: 'Admin Google User',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.role).toBe('admin');
      
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toContain('sierra_sess=');
    });

    it('authenticates standard staff login', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'signin',
          email: 'admin@sierra-estates.net',
          password: 'sierra2026',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.role).toBe('admin');
    });

    it('rejects unauthenticated requests without credentials', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'signin',
          email: 'unknown@example.com',
          password: 'bad-password',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('handles signout action cleanly', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'signout' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });
  });

  describe('GET /api/auth endpoint', () => {
    it('returns signedIn: false when no session cookie is present', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth');
      const res = await GET(req);
      const data = await res.json();
      expect(data.signedIn).toBe(false);
    });

    it('returns signedIn: true and user details when session cookie is valid', async () => {
      const token = await signSession({
        uid: 'test-admin',
        email: 'admin@sierra-estates.net',
        name: 'Test Admin',
        role: 'admin',
      });

      const req = new NextRequest('http://localhost:3000/api/auth', {
        headers: {
          cookie: `sierra_sess=${token}`,
        },
      });

      const res = await GET(req);
      const data = await res.json();
      expect(data.signedIn).toBe(true);
      expect(data.email).toBe('admin@sierra-estates.net');
      expect(data.role).toBe('admin');
    });
  });
});
