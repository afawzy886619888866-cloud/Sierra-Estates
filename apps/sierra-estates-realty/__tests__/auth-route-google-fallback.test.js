/**
 * Tests: POST /api/auth "Path B" — the Google sign-in direct fallback.
 *
 * Everything this path trusts (provider, email, uid, name) comes from the
 * request body and none of it is verified, so it used to mint a signed admin
 * session from unverified claims whenever the Admin SDK was unconfigured or
 * `verifyIdToken` threw. It is now closed in production: there, only a real ID
 * token verified by Path A gets in.
 *
 * The route itself is owned by another change; this suite only pins its
 * behaviour. NODE_ENV is read inside the handler, so no re-import is needed.
 */
import { NextRequest } from 'next/server';
import { POST } from '../app/api/auth/route';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

/** NODE_ENV is typed read-only (Next augments ProcessEnv); assign via a widened cast. */
function setNodeEnv(value) {
  (process.env ).NODE_ENV = value;
}

function signin(body) {
  return new NextRequest('https://admin.sierra-estates.net/api/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'signin', ...body }),
  } );
}

afterEach(() => {
  setNodeEnv(ORIGINAL_NODE_ENV);
});

describe('POST /api/auth — Path B in production', () => {
  beforeEach(() => {
    setNodeEnv('production');
  });

  it('refuses an unverified google claim with 503 and sets no cookie', async () => {
    const res = await POST(signin({ provider: 'google', email: 'admin@sierra-estates.net' }));

    expect(res.status).toBe(503);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('refuses even a claim carrying an allowlisted email and a uid', async () => {
    const res = await POST(
      signin({
        provider: 'google',
        email: 'admin@sierra-estates.net',
        uid: 'attacker-chosen-uid',
        name: 'Not Verified',
      }),
    );

    expect(res.status).toBe(503);
  });

  it('refuses before the email allowlist is even consulted', async () => {
    // A non-allowlisted email would be a 403 outside production; in production
    // the path is closed outright, so the answer is the same 503 either way —
    // no oracle telling a caller which addresses are admin addresses.
    const res = await POST(signin({ provider: 'google', email: 'attacker@evil.com' }));

    expect(res.status).toBe(503);
  });
});

describe('POST /api/auth — Path B outside production', () => {
  beforeEach(() => {
    setNodeEnv('development');
  });

  it('still rejects a non-allowlisted email with 403', async () => {
    const res = await POST(signin({ provider: 'google', email: 'attacker@evil.com' }));

    expect(res.status).toBe(403);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('issues a session for an allowlisted email so local dev keeps working', async () => {
    const res = await POST(signin({ provider: 'google', email: 'admin@sierra-estates.net' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, role: 'admin' });
    expect(res.headers.get('set-cookie')).toContain('sierra_sess=');
  });
});

describe('POST /api/auth — request shape', () => {
  it('rejects a signin with neither email nor token', async () => {
    const res = await POST(signin({}));

    expect(res.status).toBe(400);
  });

  it('rejects an unknown action', async () => {
    const req = new NextRequest('https://admin.sierra-estates.net/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'elevate' }),
    } );

    expect((await POST(req)).status).toBe(400);
  });

  it('clears the session cookie on signout', async () => {
    const req = new NextRequest('https://admin.sierra-estates.net/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'signout' }),
    } );

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toContain('sierra_sess=');
    expect(res.headers.get('set-cookie')).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
  });
});
