/**
 * Tests: lib/auth-guard.ts (the v12.4 guard)
 *
 * Distinct from lib/server/auth-guard.ts: this one also accepts the shared
 * secret as a *Bearer* token (Vercel cron sends it that way) and via an
 * `x-cron-secret` header, and it falls back to CRON_SECRET when
 * SBR_SECRET_KEY is unset.
 *
 * The secret is captured in a module-level const at import time, so each test
 * sets env then re-imports through `loadGuard()`.
 */
import { NextRequest } from 'next/server';

const verifyIdToken = jest.fn();

jest.mock('@/lib/server/firebase-admin', () => ({
  adminAuth: {
    get verifyIdToken() {
      return verifyIdToken;
    },
  },
}));

const ORIGINAL_SBR = process.env.SBR_SECRET_KEY;
const ORIGINAL_CRON = process.env.CRON_SECRET;

function request(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('https://sierra-estates.net/api/cron/sync-leads', { headers } as any);
}

async function loadGuard(env: { sbr?: string; cron?: string }) {
  if (env.sbr === undefined) delete process.env.SBR_SECRET_KEY;
  else process.env.SBR_SECRET_KEY = env.sbr;
  if (env.cron === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = env.cron;
  jest.resetModules();
  return import('../lib/auth-guard');
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  if (ORIGINAL_SBR === undefined) delete process.env.SBR_SECRET_KEY;
  else process.env.SBR_SECRET_KEY = ORIGINAL_SBR;
  if (ORIGINAL_CRON === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL_CRON;
});

describe('secret resolution', () => {
  it('prefers SBR_SECRET_KEY when both env vars are set', async () => {
    const { verifyRequest } = await loadGuard({ sbr: 'sbr-key', cron: 'cron-key' });

    await expect(verifyRequest(request({ 'x-sbr-secret-key': 'sbr-key' }))).resolves.toEqual({
      authenticated: true,
      method: 'secret-key',
    });
    // The CRON_SECRET value is not accepted while SBR_SECRET_KEY is present.
    await expect(verifyRequest(request({ 'x-sbr-secret-key': 'cron-key' }))).resolves.toEqual({
      authenticated: false,
      method: 'none',
    });
  });

  it('falls back to CRON_SECRET when SBR_SECRET_KEY is unset', async () => {
    const { verifyRequest } = await loadGuard({ cron: 'cron-key' });

    await expect(verifyRequest(request({ 'x-sbr-secret-key': 'cron-key' }))).resolves.toEqual({
      authenticated: true,
      method: 'secret-key',
    });
  });

  it('authenticates nothing on the secret paths when neither env var is set', async () => {
    const { verifyRequest } = await loadGuard({});

    await expect(verifyRequest(request({ 'x-sbr-secret-key': '' }))).resolves.toEqual({
      authenticated: false,
      method: 'none',
    });
    await expect(verifyRequest(request({ 'x-cron-secret': '' }))).resolves.toEqual({
      authenticated: false,
      method: 'none',
    });
  });
});

describe('Bearer-token cron secret (how Vercel cron authenticates)', () => {
  it('accepts the shared secret sent as a Bearer token', async () => {
    const { verifyRequest } = await loadGuard({ sbr: 's3cret' });

    const result = await verifyRequest(request({ authorization: 'Bearer s3cret' }));

    expect(result).toEqual({ authenticated: true, method: 'cron-secret' });
  });

  it('short-circuits before Firebase when the Bearer value is the secret', async () => {
    const { verifyRequest } = await loadGuard({ sbr: 's3cret' });

    await verifyRequest(request({ authorization: 'Bearer s3cret' }));

    expect(verifyIdToken).not.toHaveBeenCalled();
  });
});

describe('Firebase ID token', () => {
  it('authenticates a valid token that is not the shared secret', async () => {
    const { verifyRequest } = await loadGuard({ sbr: 's3cret' });
    verifyIdToken.mockResolvedValueOnce({ uid: 'u-1', email: 'a@b.com' });

    const result = await verifyRequest(request({ authorization: 'Bearer jwt-token' }));

    expect(verifyIdToken).toHaveBeenCalledWith('jwt-token');
    expect(result).toEqual({
      authenticated: true,
      uid: 'u-1',
      email: 'a@b.com',
      method: 'firebase',
    });
  });

  it('falls through to the header checks when the token is rejected', async () => {
    const { verifyRequest } = await loadGuard({ sbr: 's3cret' });
    verifyIdToken.mockRejectedValueOnce(new Error('expired'));

    const result = await verifyRequest(
      request({ authorization: 'Bearer bad', 'x-cron-secret': 's3cret' }),
    );

    expect(result).toEqual({ authenticated: true, method: 'cron-secret' });
  });

  it('returns unauthenticated when the token is rejected and no secret follows', async () => {
    const { verifyRequest } = await loadGuard({ sbr: 's3cret' });
    verifyIdToken.mockRejectedValueOnce(new Error('expired'));

    const result = await verifyRequest(request({ authorization: 'Bearer bad' }));

    expect(result).toEqual({ authenticated: false, method: 'none' });
  });

  it('ignores a non-Bearer Authorization scheme', async () => {
    const { verifyRequest } = await loadGuard({ sbr: 's3cret' });

    const result = await verifyRequest(request({ authorization: 'Basic abc' }));

    expect(verifyIdToken).not.toHaveBeenCalled();
    expect(result).toEqual({ authenticated: false, method: 'none' });
  });
});

describe('header-based secrets', () => {
  it('accepts x-sbr-secret-key', async () => {
    const { verifyRequest } = await loadGuard({ sbr: 's3cret' });

    await expect(verifyRequest(request({ 'x-sbr-secret-key': 's3cret' }))).resolves.toEqual({
      authenticated: true,
      method: 'secret-key',
    });
  });

  it('accepts x-cron-secret', async () => {
    const { verifyRequest } = await loadGuard({ sbr: 's3cret' });

    await expect(verifyRequest(request({ 'x-cron-secret': 's3cret' }))).resolves.toEqual({
      authenticated: true,
      method: 'cron-secret',
    });
  });

  it('rejects a mismatched secret on either header', async () => {
    const { verifyRequest } = await loadGuard({ sbr: 's3cret' });

    await expect(verifyRequest(request({ 'x-sbr-secret-key': 'nope' }))).resolves.toEqual({
      authenticated: false,
      method: 'none',
    });
    await expect(verifyRequest(request({ 'x-cron-secret': 'nope' }))).resolves.toEqual({
      authenticated: false,
      method: 'none',
    });
  });

  it('returns unauthenticated for a request with no auth at all', async () => {
    const { verifyRequest } = await loadGuard({ sbr: 's3cret' });

    await expect(verifyRequest(request())).resolves.toEqual({
      authenticated: false,
      method: 'none',
    });
  });
});

describe('unauthorizedResponse', () => {
  it('returns 401 with the default message', async () => {
    const { unauthorizedResponse } = await loadGuard({ sbr: 's3cret' });

    const res = unauthorizedResponse();

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
    });
  });

  it('returns 401 with a custom message', async () => {
    const { unauthorizedResponse } = await loadGuard({ sbr: 's3cret' });

    const res = unauthorizedResponse('Cron only');

    await expect(res.json()).resolves.toEqual({ error: 'Cron only', code: 'UNAUTHORIZED' });
  });
});
