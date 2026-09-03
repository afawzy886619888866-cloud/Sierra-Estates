 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Admin Login & Google Mail Authentication Suite
 * Tests Google Mail login, admin email recognition, and auth API route.
 */

import { isAdminEmail, tryDemoLogin, signSession } from '../lib/auth';
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

  // The hardcoded staff-password list ("sierra2026", "admin", "password", …)
  // was removed: it made the email check irrelevant and handed out signed
  // admin cookies in production. These now exercise the replacement contract —
  // a single operator-configured password. Full coverage, including the
  // regression guard on the old passwords, lives in auth-bootstrap-login.test.ts.
  describe('tryDemoLogin with staff credentials', () => {
    const ORIGINAL_BOOTSTRAP_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD;

    beforeEach(() => {
      process.env.ADMIN_BOOTSTRAP_PASSWORD = 'operator-configured-pass';
    });

    afterEach(() => {
      if (ORIGINAL_BOOTSTRAP_PASSWORD === undefined) delete process.env.ADMIN_BOOTSTRAP_PASSWORD;
      else process.env.ADMIN_BOOTSTRAP_PASSWORD = ORIGINAL_BOOTSTRAP_PASSWORD;
    });

    it('authenticates admin@sierra-estates.net with the configured password', () => {
      const session = tryDemoLogin('admin@sierra-estates.net', 'operator-configured-pass');
      expect(session).not.toBeNull();
      expect(_optionalChain([session, 'optionalAccess', _ => _.role])).toBe('admin');
      expect(_optionalChain([session, 'optionalAccess', _2 => _2.email])).toBe('admin@sierra-estates.net');
    });

    it('authenticates a Google Mail admin account with the configured password', () => {
      const session = tryDemoLogin('admin@gmail.com', 'operator-configured-pass');
      expect(session).not.toBeNull();
      expect(_optionalChain([session, 'optionalAccess', _3 => _3.role])).toBe('admin');
    });

    it('rejects invalid password', () => {
      const session = tryDemoLogin('admin@sierra-estates.net', 'wrong-pass');
      expect(session).toBeNull();
    });

    it('rejects the retired hardcoded staff password', () => {
      expect(tryDemoLogin('admin@sierra-estates.net', 'sierra2026')).toBeNull();
    });
  });

  describe('POST /api/auth endpoint', () => {
    it('refuses a google sign-in claim that carries no verified token', async () => {
      // This previously returned 200 with an admin cookie: `provider`, `email`
      // and `name` all came from the request body and none was verified, so
      // any caller could name themselves admin. Under Supabase Auth the client
      // completes the Google flow and sends a real access token, which Path A
      // verifies; a body-only claim has no way in.
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
      expect(res.status).not.toBe(200);
      expect(res.headers.get('set-cookie')).toBeNull();
    });

    it('authenticates standard staff login with the configured operator password', async () => {
      const original = process.env.ADMIN_BOOTSTRAP_PASSWORD;
      process.env.ADMIN_BOOTSTRAP_PASSWORD = 'operator-configured-pass';
      try {
        const req = new NextRequest('http://localhost:3000/api/auth', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'signin',
            email: 'admin@sierra-estates.net',
            password: 'operator-configured-pass',
          }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(data.role).toBe('admin');
      } finally {
        if (original === undefined) delete process.env.ADMIN_BOOTSTRAP_PASSWORD;
        else process.env.ADMIN_BOOTSTRAP_PASSWORD = original;
      }
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
