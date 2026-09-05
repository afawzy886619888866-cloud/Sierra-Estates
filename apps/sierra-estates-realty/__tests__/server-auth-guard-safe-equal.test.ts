/**
 * Tests: the constant-time secret comparison inside lib/server/auth-guard.ts.
 *
 * `safeEqual` is module-private, so it is exercised through the public
 * `verifyRequest` secret-key path — which is the only thing that uses it, and
 * the behaviour that actually matters: `X-SBR-SECRET-KEY` must match the
 * configured secret exactly, byte for byte.
 *
 * The interesting negative case is a SAME-LENGTH near-miss: a comparison that
 * short-circuits on length only would still reject it, but a comparison that
 * was accidentally weakened (a prefix/`startsWith`/`includes` check, or a
 * truthiness bug) would not. The differing-length cases pin the early return.
 *
 * NOTE: auth-guard reads SBR_SECRET_KEY into a module const at import time, so
 * every case sets the env var and re-imports via `jest.resetModules()`.
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

const SECRET = 'sbr-shared-s3cret';
const ORIGINAL_SECRET = process.env.SBR_SECRET_KEY;

function request(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('https://sierra-estates.net/api/anything', { headers } as any);
}

async function loadGuard(secret: string | undefined = SECRET) {
  if (secret === undefined) delete process.env.SBR_SECRET_KEY;
  else process.env.SBR_SECRET_KEY = secret;
  jest.resetModules();
  return import('../lib/server/auth-guard');
}

/** True when the given header value authenticates against the configured secret. */
async function authenticates(headerValue: string, secret?: string): Promise<boolean> {
  const { verifyRequest } = await loadGuard(secret);
  const result = await verifyRequest(request({ 'x-sbr-secret-key': headerValue }));
  return result.authenticated;
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.SBR_SECRET_KEY;
  else process.env.SBR_SECRET_KEY = ORIGINAL_SECRET;
});

describe('verifyRequest secret comparison — exact matches', () => {
  it('accepts the exact secret', async () => {
    await expect(authenticates(SECRET)).resolves.toBe(true);
  });

  it('accepts a long high-entropy secret unchanged', async () => {
    const long = 'A1b2C3d4E5f6G7h8I9j0-'.repeat(8);
    await expect(authenticates(long, long)).resolves.toBe(true);
  });
});

describe('verifyRequest secret comparison — same length, different content', () => {
  it.each([
    ['last character differs', 'sbr-shared-s3crea'],
    ['first character differs', 'Sbr-shared-s3cret'],
    ['middle character differs', 'sbr-sharld-s3cret'],
    ['characters transposed', 'sbr-shared-s3certI'.slice(0, SECRET.length)],
    ['entirely different', 'x'.repeat(SECRET.length)],
  ])('rejects a %s value of identical length', async (_label, candidate) => {
    expect(candidate).toHaveLength(SECRET.length);

    await expect(authenticates(candidate)).resolves.toBe(false);
  });

  it('rejects a case-swapped secret of the same length', async () => {
    await expect(authenticates(SECRET.toUpperCase())).resolves.toBe(false);
  });
});

describe('verifyRequest secret comparison — differing length', () => {
  it('rejects a value one character longer', async () => {
    await expect(authenticates(`${SECRET}x`)).resolves.toBe(false);
  });

  it('rejects a value one character shorter', async () => {
    await expect(authenticates(SECRET.slice(0, -1))).resolves.toBe(false);
  });

  it('rejects a correct prefix of the secret', async () => {
    await expect(authenticates(SECRET.slice(0, 5))).resolves.toBe(false);
  });

  it('rejects a value that merely contains the secret', async () => {
    await expect(authenticates(`prefix-${SECRET}-suffix`)).resolves.toBe(false);
  });

  it('rejects an empty header against a configured secret', async () => {
    await expect(authenticates('')).resolves.toBe(false);
  });

  it('rejects a much longer value', async () => {
    await expect(authenticates('a'.repeat(4096))).resolves.toBe(false);
  });
});

describe('verifyRequest secret comparison — nothing configured', () => {
  it('rejects an empty header when SBR_SECRET_KEY is unset (no empty-vs-empty match)', async () => {
    await expect(authenticates('', undefined)).resolves.toBe(false);
  });

  it('rejects any header when SBR_SECRET_KEY is unset', async () => {
    await expect(authenticates('anything', undefined)).resolves.toBe(false);
  });

  it('rejects an empty header when SBR_SECRET_KEY is the empty string', async () => {
    await expect(authenticates('', '')).resolves.toBe(false);
  });
});

describe('verifyAdminRequest is unaffected by a correct shared secret', () => {
  it('still denies admin to a caller holding the exact secret', async () => {
    const { verifyAdminRequest } = await loadGuard(SECRET);

    const result = await verifyAdminRequest(request({ 'x-sbr-secret-key': SECRET }));

    expect(result).toEqual({ authenticated: false, method: 'none' });
    expect(collection).not.toHaveBeenCalled();
  });

  it('denies admin to a non-admin Firebase user even with the secret also present', async () => {
    const { verifyAdminRequest } = await loadGuard(SECRET);
    verifyIdToken.mockResolvedValueOnce({ uid: 'agent-1' });
    userGet.mockResolvedValueOnce({ data: () => ({ role: 'agent' }) });

    const result = await verifyAdminRequest(
      request({ authorization: 'Bearer t', 'x-sbr-secret-key': SECRET }),
    );

    expect(result).toEqual({ authenticated: false, method: 'none' });
  });
});
