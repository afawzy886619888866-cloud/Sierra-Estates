/**
 * verifyPortalRequest (lib/server/auth-guard.ts) — the portal-level guard that
 * serves staff (full admin) and partner accounts (scoped) on the same routes.
 *
 * Pinned here:
 *   · partner session → access 'partner' + scope from the signed cookie
 *   · admin session → access 'admin', scope null
 *   · ESCALATION REGRESSION: a partner whose email lands on the owned
 *     sierra-estates.net domain must NOT be upgraded to admin by the
 *     isAdminEmail fallback — the explicit role always wins.
 *   · verifyAdminRequest must keep REJECTING partner sessions (every other
 *     admin route stays staff-only).
 */
jest.mock('@sierra-estates/db', () => ({
  getSupabaseAdmin: jest.fn(),
  getRecord: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { verifyAdminRequest, verifyPortalRequest } from '../lib/server/auth-guard';
import { signSession, SESSION_COOKIE } from '../lib/auth';

const makeReq = (cookie?: string) =>
  new NextRequest('http://localhost:3000/api/admin/example', {
    headers: cookie ? { cookie } : {},
  });

async function signedCookie(session: Parameters<typeof signSession>[0]): Promise<string> {
  const token = await signSession(session);
  return `${SESSION_COOKIE}=${token}`;
}

describe('verifyPortalRequest', () => {
  it('authenticates an admin session with full access and no scope', async () => {
    const cookie = await signedCookie({ uid: 'u1', email: 'admin@sierra-estates.net', name: 'Admin', role: 'admin' });
    const result = await verifyPortalRequest(makeReq(cookie));
    expect(result.authenticated).toBe(true);
    expect(result.access).toBe('admin');
    if (result.authenticated) expect(result.scope).toBeNull();
  });

  it('authenticates a partner session with the scoped access', async () => {
    const cookie = await signedCookie({
      uid: 'partner-p1',
      email: 'p1@partner.example',
      name: 'Partner One',
      role: 'partner',
      scope: { developers: ['Mountain View'], compounds: ['iCity'] },
    });
    const result = await verifyPortalRequest(makeReq(cookie));
    expect(result.authenticated).toBe(true);
    expect(result.access).toBe('partner');
    if (result.authenticated && result.access === 'partner') {
      expect(result.scope).toEqual({ developers: ['mountain view'], compounds: ['icity'] });
      expect(result.email).toBe('p1@partner.example');
    }
  });

  it('keeps a partner scoped (empty) when the session carries no scope — fail closed on data', async () => {
    const cookie = await signedCookie({ uid: 'partner-p2', email: 'p2@partner.example', name: 'P2', role: 'partner' });
    const result = await verifyPortalRequest(makeReq(cookie));
    expect(result.authenticated).toBe(true);
    expect(result.access).toBe('partner');
    if (result.authenticated && result.access === 'partner') {
      expect(result.scope).toEqual({ developers: [], compounds: [] });
    }
  });

  it('ESCALATION REGRESSION: an owned-domain email never upgrades a partner session to admin', async () => {
    // partner1@sierra-estates.net satisfies isAdminEmail — the explicit
    // partner role must still win.
    const cookie = await signedCookie({
      uid: 'partner-1',
      email: 'partner1@sierra-estates.net',
      name: 'Domain Partner',
      role: 'partner',
      scope: { developers: ['mountain view'] },
    });
    const portal = await verifyPortalRequest(makeReq(cookie));
    expect(portal.authenticated).toBe(true);
    expect(portal.access).toBe('partner');

    const admin = await verifyAdminRequest(makeReq(cookie));
    expect(admin.authenticated).toBe(false);
  });

  it('rejects anonymous callers', async () => {
    const result = await verifyPortalRequest(makeReq());
    expect(result.authenticated).toBe(false);
  });

  it('rejects a garbage session cookie', async () => {
    const result = await verifyPortalRequest(makeReq(`${SESSION_COOKIE}=garbage.sig`));
    expect(result.authenticated).toBe(false);
  });

  it('rejects non-admin, non-partner roles (e.g. viewer sessions)', async () => {
    const cookie = await signedCookie({ uid: 'v1', email: 'v@example.com', name: 'V', role: 'viewer' });
    const result = await verifyPortalRequest(makeReq(cookie));
    expect(result.authenticated).toBe(false);
  });

  it('secret-key callers carry no identity and get no portal access', async () => {
    process.env.SBR_SECRET_KEY = 'svc-key';
    try {
      const req = new NextRequest('http://localhost:3000/api/admin/example', {
        headers: { 'x-sbr-secret-key': 'svc-key' },
      });
      const result = await verifyPortalRequest(req);
      expect(result.authenticated).toBe(false);
    } finally {
      delete process.env.SBR_SECRET_KEY;
    }
  });
});

describe('verifyAdminRequest keeps partners out of staff-only routes', () => {
  it('rejects a partner session outright (regression pin)', async () => {
    const cookie = await signedCookie({
      uid: 'partner-p1',
      email: 'p1@partner.example',
      name: 'Partner One',
      role: 'partner',
      scope: { developers: ['mountain view'] },
    });
    const result = await verifyAdminRequest(makeReq(cookie));
    expect(result.authenticated).toBe(false);
  });
});
