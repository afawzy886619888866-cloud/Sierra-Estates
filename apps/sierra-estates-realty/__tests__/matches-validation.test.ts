import { POST } from '@/app/api/matches/route';

// M1 hardening: these suites call guarded route handlers directly. The
// real verifyRequest requires Supabase or the module-load SBR_SECRET_KEY,
// neither available in unit tests — mock it to authenticate exactly the
// test-secret header (unauth-expectation cases still see 401).
jest.mock('@/lib/server/auth-guard', () => {
  const actual = jest.requireActual('@/lib/server/auth-guard');
  const authFrom = (req) => {
    const h = req?.headers?.get?.('x-sbr-secret-key');
    return h && h === 'test-sbr-secret'
      ? { authenticated: true, method: 'secret-key' }
      : { authenticated: false, method: 'none' };
  };
  return {
    ...actual,
    verifyRequest: jest.fn(async (req) => authFrom(req)),
    verifyAdminRequest: jest.fn(async (req) => {
      const a = authFrom(req);
      return a.authenticated ? { ...a, role: 'admin', email: 'test@example.com' } : a;
    }),
  };
});


function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/matches', {
      method: 'POST',
     headers: { 'x-sbr-secret-key': 'test-sbr-secret' },
      headers: { 'x-sbr-secret-key': 'test-sbr-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

const valid = { budget: 500_000, beds: 3, type: 'Villa', mode: 'sale' as const };

describe('POST /api/matches validation', () => {
  it('rejects a missing budget instead of scoring it as NaN', async () => {
    const res = await post({ beds: 3, type: 'Villa', mode: 'sale' });
    expect(res.status).toBe(400);
    expect((await res.json()).details).toHaveProperty('budget');
  });

  it('rejects a non-positive budget', async () => {
    expect((await post({ ...valid, budget: 0 })).status).toBe(400);
    expect((await post({ ...valid, budget: -1 })).status).toBe(400);
  });

  it('rejects a budget sent as a string', async () => {
    expect((await post({ ...valid, budget: '500000' })).status).toBe(400);
  });

  it('rejects an unknown mode', async () => {
    expect((await post({ ...valid, mode: 'lease' })).status).toBe(400);
  });

  it('rejects a malformed body', async () => {
    const res = await POST(
      new Request('http://localhost/api/matches', { method: 'POST', body: 'not json' })
    );
    expect(res.status).toBe(400);
  });

  it('accepts a valid body and returns finite numeric scores', async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    const results = await res.json();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(3);
    for (const r of results) {
      expect(Number.isFinite(r.score)).toBe(true);
      expect(r.score).not.toBeNaN();
    }
  });
});
