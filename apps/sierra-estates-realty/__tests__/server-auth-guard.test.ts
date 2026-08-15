/**
 * Tests: lib/server/auth-guard.ts
 *
 * This is the guard every admin-only API route depends on
 * (`viewing-requests`, `concierge/send-whatsapp`, `telegram/setup`,
 * `wealth/roi`), plus the service/cron path via `X-SBR-SECRET-KEY`.
 *
 * NOTE: the module reads SBR_SECRET_KEY into a const at import time, so every
 * test that depends on the secret must set the env var and then re-import via
 * `jest.resetModules()`. Importing once at the top would freeze whatever value
 * happened to be set first.
 */
import { NextRequest } from 'next/server';

const verifyIdToken = jest.fn();
const userGet = jest.fn();
const doc = jest.fn(() => ({ get: userGet }));
const collection = jest.fn(() => ({ doc }));

jest.mock('@/lib/server/firebase-admin', () => ({
  adminAuth: {
    get verifyIdToken() {
      return verifyIdToken;
    },
  },
  adminDb: {
    get collection() {
      return collection;
    },
  },
}));

const ORIGINAL_SECRET = process.env.SBR_SECRET_KEY;

function request(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('https://sierra-estates.net/api/anything', { headers } as any);
}

/** Import the module fresh so the module-level SECRET_KEY picks up the env. */
async function loadGuard(secret?: string) {
  if (secret === undefined) delete process.env.SBR_SECRET_KEY;
  else process.env.SBR_SECRET_KEY = secret;
  jest.resetModules();
  return import('../lib/server/auth-guard');
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.SBR_SECRET_KEY;
  else process.env.SBR_SECRET_KEY = ORIGINAL_SECRET;
});

describe('verifyRequest — Firebase ID token', () => {
  it('authenticates a valid Bearer token and returns uid/email', async () => {
    const { verifyRequest } = await loadGuard('s3cret');
    verifyIdToken.mockResolvedValueOnce({ uid: 'user-1', email: 'a@b.com' });

    const result = await verifyRequest(request({ authorization: 'Bearer good-token' }));

    expect(verifyIdToken).toHaveBeenCalledWith('good-token');
    expect(result).toEqual({
      authenticated: true,
      uid: 'user-1',
      email: 'a@b.com',
      method: 'firebase',
    });
  });

  it('passes through a token with no email claim', async () => {
    const { verifyRequest } = await loadGuard('s3cret');
    verifyIdToken.mockResolvedValueOnce({ uid: 'user-2' });

    const result = await verifyRequest(request({ authorization: 'Bearer t' }));

    expect(result.authenticated).toBe(true);
    expect(result.uid).toBe('user-2');
    expect(result.email).toBeUndefined();
  });

  it('ignores an Authorization header that is not a Bearer scheme', async () => {
    const { verifyRequest } = await loadGuard('s3cret');

    const result = await verifyRequest(request({ authorization: 'Basic abc' }));

    expect(verifyIdToken).not.toHaveBeenCalled();
    expect(result).toEqual({ authenticated: false, method: 'none' });
  });

  it('falls through to the secret-key check when the token is rejected', async () => {
    const { verifyRequest } = await loadGuard('s3cret');
    verifyIdToken.mockRejectedValueOnce(new Error('expired'));

    const result = await verifyRequest(
      request({ authorization: 'Bearer expired-token', 'x-sbr-secret-key': 's3cret' }),
    );

    expect(result).toEqual({ authenticated: true, method: 'secret-key' });
  });

  it('returns unauthenticated when the token is rejected and no secret is sent', async () => {
    const { verifyRequest } = await loadGuard('s3cret');
    verifyIdToken.mockRejectedValueOnce(new Error('expired'));

    const result = await verifyRequest(request({ authorization: 'Bearer bad' }));

    expect(result).toEqual({ authenticated: false, method: 'none' });
  });
});

describe('verifyRequest — X-SBR-SECRET-KEY', () => {
  it('authenticates a matching secret header', async () => {
    const { verifyRequest } = await loadGuard('s3cret');

    const result = await verifyRequest(request({ 'x-sbr-secret-key': 's3cret' }));

    expect(result).toEqual({ authenticated: true, method: 'secret-key' });
  });

  it('rejects a mismatched secret header', async () => {
    const { verifyRequest } = await loadGuard('s3cret');

    const result = await verifyRequest(request({ 'x-sbr-secret-key': 'wrong' }));

    expect(result).toEqual({ authenticated: false, method: 'none' });
  });

  it('never authenticates on the secret path when SBR_SECRET_KEY is unset', async () => {
    // Guards against an empty configured secret matching an empty header.
    const { verifyRequest } = await loadGuard(undefined);

    const result = await verifyRequest(request({ 'x-sbr-secret-key': '' }));

    expect(result).toEqual({ authenticated: false, method: 'none' });
  });

  it('returns unauthenticated for a request with no auth headers at all', async () => {
    const { verifyRequest } = await loadGuard('s3cret');

    const result = await verifyRequest(request());

    expect(result).toEqual({ authenticated: false, method: 'none' });
  });
});

describe('unauthorizedResponse', () => {
  it('returns a 401 with the default message', async () => {
    const { unauthorizedResponse } = await loadGuard('s3cret');

    const res = unauthorizedResponse();

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
    });
  });

  it('returns a 401 with a custom message', async () => {
    const { unauthorizedResponse } = await loadGuard('s3cret');

    const res = unauthorizedResponse('Admin only');

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: 'Admin only',
      code: 'UNAUTHORIZED',
    });
  });
});

describe('verifyAdminRequest', () => {
  it('grants access to a user whose Firestore role is admin', async () => {
    const { verifyAdminRequest } = await loadGuard('s3cret');
    verifyIdToken.mockResolvedValueOnce({ uid: 'admin-1', email: 'admin@b.com' });
    userGet.mockResolvedValueOnce({ data: () => ({ role: 'admin' }) });

    const result = await verifyAdminRequest(request({ authorization: 'Bearer t' }));

    expect(collection).toHaveBeenCalledWith('users');
    expect(doc).toHaveBeenCalledWith('admin-1');
    expect(result).toEqual({
      authenticated: true,
      uid: 'admin-1',
      email: 'admin@b.com',
      method: 'firebase',
    });
  });

  it('grants access to a superadmin', async () => {
    const { verifyAdminRequest } = await loadGuard('s3cret');
    verifyIdToken.mockResolvedValueOnce({ uid: 'su-1' });
    userGet.mockResolvedValueOnce({ data: () => ({ role: 'superadmin' }) });

    const result = await verifyAdminRequest(request({ authorization: 'Bearer t' }));

    expect(result.authenticated).toBe(true);
  });

  it.each(['agent', 'manager', undefined])(
    'denies a user whose role is %s',
    async (role) => {
      const { verifyAdminRequest } = await loadGuard('s3cret');
      verifyIdToken.mockResolvedValueOnce({ uid: 'u-1' });
      userGet.mockResolvedValueOnce({ data: () => (role ? { role } : {}) });

      const result = await verifyAdminRequest(request({ authorization: 'Bearer t' }));

      expect(result).toEqual({ authenticated: false, method: 'none' });
    },
  );

  it('denies when the user document does not exist', async () => {
    const { verifyAdminRequest } = await loadGuard('s3cret');
    verifyIdToken.mockResolvedValueOnce({ uid: 'ghost' });
    userGet.mockResolvedValueOnce({ data: () => undefined });

    const result = await verifyAdminRequest(request({ authorization: 'Bearer t' }));

    expect(result).toEqual({ authenticated: false, method: 'none' });
  });

  it('denies (rather than throwing) when the Firestore lookup fails', async () => {
    const { verifyAdminRequest } = await loadGuard('s3cret');
    verifyIdToken.mockResolvedValueOnce({ uid: 'u-1' });
    userGet.mockRejectedValueOnce(new Error('firestore down'));

    const result = await verifyAdminRequest(request({ authorization: 'Bearer t' }));

    expect(result).toEqual({ authenticated: false, method: 'none' });
  });

  it('returns the unauthenticated result without hitting Firestore', async () => {
    const { verifyAdminRequest } = await loadGuard('s3cret');

    const result = await verifyAdminRequest(request());

    expect(collection).not.toHaveBeenCalled();
    expect(result).toEqual({ authenticated: false, method: 'none' });
  });

  // Regression guard for the privilege-escalation fix. A secret-key caller
  // authenticates but carries no identity (no uid), so there is no Firestore
  // user document and therefore no role. This used to early-return the
  // *authenticated* result, letting any holder of SBR_SECRET_KEY clear every
  // admin-only gate — and that secret is also the service/cron/webhook
  // credential, shared far more widely than admin access.
  it('denies a secret-key caller, which has no identity to carry an admin role', async () => {
    const { verifyAdminRequest } = await loadGuard('s3cret');

    const result = await verifyAdminRequest(request({ 'x-sbr-secret-key': 's3cret' }));

    expect(result).toEqual({ authenticated: false, method: 'none' });
  });

  it('does not hit Firestore for a caller with no uid', async () => {
    const { verifyAdminRequest } = await loadGuard('s3cret');

    await verifyAdminRequest(request({ 'x-sbr-secret-key': 's3cret' }));

    expect(collection).not.toHaveBeenCalled();
  });

  it('still admits a Firebase-authenticated admin after the tightening', async () => {
    const { verifyAdminRequest } = await loadGuard('s3cret');
    verifyIdToken.mockResolvedValueOnce({ uid: 'admin-1', email: 'admin@b.com' });
    userGet.mockResolvedValueOnce({ data: () => ({ role: 'admin' }) });

    const result = await verifyAdminRequest(request({ authorization: 'Bearer t' }));

    expect(result.authenticated).toBe(true);
    expect(result.method).toBe('firebase');
  });
});
