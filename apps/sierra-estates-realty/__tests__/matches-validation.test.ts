import { POST } from '@/app/api/matches/route';

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
