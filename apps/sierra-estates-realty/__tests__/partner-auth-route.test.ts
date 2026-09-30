/**
 * /api/auth — Path B partner login (PARTNER_ACCOUNTS env).
 * The merged-in property accounts sign in with email+password from the
 * operator-configured list and receive a signed session carrying role
 * 'partner' + their portfolio scope. No committed default: with the env
 * unset, this path is closed (same doctrine as ADMIN_BOOTSTRAP_PASSWORD).
 */
jest.mock('@sierra-estates/db', () => ({
  getSupabaseAdmin: jest.fn(),
  getRecord: jest.fn(),
  updateRecord: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST, GET } from '../app/api/auth/route';
import { verifySession, SESSION_COOKIE, parseCookies } from '../lib/auth';

const signin = (email: string, password: string) =>
  new NextRequest('http://localhost:3000/api/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'signin', email, password }),
  });

const PARTNERS_ENV = JSON.stringify([
  { email: 'partner1@example.com', password: 'partner-one-pass', name: 'Partner One', developers: ['Mountain View'], compounds: ['iCity'] },
  { email: 'partner2@example.com', password: 'partner-two-pass', name: 'Partner Two', developers: ['Emaar'] },
]);

describe('POST /api/auth — Path B (partner accounts)', () => {
  const originalEnv = process.env.PARTNER_ACCOUNTS;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.PARTNER_ACCOUNTS;
    else process.env.PARTNER_ACCOUNTS = originalEnv;
  });

  it('issues a partner session cookie with the portfolio scope', async () => {
    process.env.PARTNER_ACCOUNTS = PARTNERS_ENV;

    const res = await POST(signin('Partner1@Example.com', 'partner-one-pass'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, role: 'partner' });

    const setCookie = res.headers.get('set-cookie') ?? '';
    const token = parseCookies(setCookie)[SESSION_COOKIE];
    expect(token).toBeTruthy();

    const session = await verifySession(token);
    expect(session?.role).toBe('partner');
    expect(session?.name).toBe('Partner One');
    expect(session?.scope).toEqual({ developers: ['mountain view'], compounds: ['icity'] });
  });

  it('rejects a wrong password with 401 and no cookie', async () => {
    process.env.PARTNER_ACCOUNTS = PARTNERS_ENV;

    const res = await POST(signin('partner1@example.com', 'wrong-pass'));

    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('is closed when PARTNER_ACCOUNTS is unset — no committed credential', async () => {
    delete process.env.PARTNER_ACCOUNTS;

    const res = await POST(signin('partner1@example.com', 'partner-one-pass'));

    // Falls through to the bootstrap-admin path, which is also unconfigured
    // in this test env → 401, never a session.
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('is closed when PARTNER_ACCOUNTS is malformed JSON', async () => {
    process.env.PARTNER_ACCOUNTS = 'definitely not json';

    const res = await POST(signin('partner1@example.com', 'partner-one-pass'));

    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });
});

describe('GET /api/auth — partner session introspection', () => {
  const originalEnv = process.env.PARTNER_ACCOUNTS;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.PARTNER_ACCOUNTS;
    else process.env.PARTNER_ACCOUNTS = originalEnv;
  });

  it('reports the partner role and scope so the portal shell can restrict itself', async () => {
    process.env.PARTNER_ACCOUNTS = PARTNERS_ENV;

    const signinRes = await POST(signin('partner1@example.com', 'partner-one-pass'));
    const token = parseCookies(signinRes.headers.get('set-cookie') ?? '')[SESSION_COOKIE];

    const getRes = await GET(
      new NextRequest('http://localhost:3000/api/auth', {
        headers: { cookie: `${SESSION_COOKIE}=${token}` },
      })
    );
    const data = await getRes.json();

    expect(data.signedIn).toBe(true);
    expect(data.role).toBe('partner');
    expect(data.scope).toEqual({ developers: ['mountain view'], compounds: ['icity'] });
  });
});
