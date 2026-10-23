/**
 * Tests: the public calculator routes.
 *
 *   POST /api/roi/calculate       — gross/net/5-year yield + payback
 *   POST /api/pricing/evaluate    — zone-rate valuation heuristic
 *
 * Both are pure arithmetic over the request body, so they are covered exactly
 * rather than approximately. Several `Number(x) || default` fallbacks treat a
 * legitimate 0 as "missing"; those are pinned as characterisation tests below
 * because they change the returned figures rather than erroring.
 */
import { POST as roiCalculate } from '../app/api/roi/calculate/route';
import { POST as pricingEvaluate } from '../app/api/pricing/evaluate/route';

function post(body: unknown, url = 'https://sierra-estates.net/api/x'): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** A request whose body is not valid JSON. */
function malformed(url = 'https://sierra-estates.net/api/x'): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{not json',
  });
}

describe('POST /api/roi/calculate', () => {
  it('computes gross, net, five-year and payback for a standard input', async () => {
    // price 10,000,000 · rent 100,000/mo (1.2M/yr) · appreciation 15%
    const res = await roiCalculate(post({ price: 10_000_000, rent: 100_000, appreciation: 15 }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.gross).toBeCloseTo(12, 10); // 1.2M / 10M
    expect(body.net).toBeCloseTo(9.84, 10); // gross × 0.82
    expect(body.payback).toBeCloseTo(100 / 9.84, 10);

    const expectedFiveYr =
      ((1_200_000 * 5 * 0.82 + 10_000_000 * (Math.pow(1.15, 5) - 1)) / 10_000_000) * 100;
    expect(body.fiveYr).toBeCloseTo(expectedFiveYr, 10);
  });

  it('applies the documented defaults for an empty body', async () => {
    const res = await roiCalculate(post({}));
    const body = await res.json();

    // price 10M, annual rent 1.2M, appreciation 0.15
    expect(body.gross).toBeCloseTo(12, 10);
    expect(body.net).toBeCloseTo(9.84, 10);
  });

  it('scales the yield down as price rises', async () => {
    const cheap = await (await roiCalculate(post({ price: 5_000_000, rent: 50_000 }))).json();
    const dear = await (await roiCalculate(post({ price: 20_000_000, rent: 50_000 }))).json();

    expect(cheap.gross).toBeGreaterThan(dear.gross);
  });

  it('never divides by zero on payback, even at zero net yield', async () => {
    // net clamps to a 0.1 floor before the division.
    const body = await (await roiCalculate(post({ price: 10_000_000, rent: 0.0000001 }))).json();

    expect(Number.isFinite(body.payback)).toBe(true);
    expect(body.payback).toBeLessThanOrEqual(1000);
  });

  it('returns 400 for a malformed JSON body', async () => {
    const res = await roiCalculate(malformed());

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toHaveProperty('error');
  });

  // ── a supplied 0 is honoured, not treated as "missing" ───────────────────
  it('rejects a price of 0 instead of silently substituting 10,000,000', async () => {
    const res = await roiCalculate(post({ price: 0, rent: 100_000 }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: '"price" must be greater than 0' });
  });

  it('rejects a negative price', async () => {
    const res = await roiCalculate(post({ price: -5, rent: 100_000 }));

    expect(res.status).toBe(400);
  });

  it('honours a rent of 0 as a genuine zero yield', async () => {
    const body = await (await roiCalculate(post({ price: 10_000_000, rent: 0 }))).json();

    expect(body.gross).toBe(0);
    expect(body.net).toBe(0);
  });

  it('rejects a negative rent', async () => {
    const res = await roiCalculate(post({ price: 10_000_000, rent: -1 }));

    expect(res.status).toBe(400);
  });

  it('honours 0% appreciation instead of substituting 15%', async () => {
    const zero = await (await roiCalculate(post({ price: 10_000_000, rent: 100_000, appreciation: 0 }))).json();
    const fifteen = await (await roiCalculate(post({ price: 10_000_000, rent: 100_000, appreciation: 15 }))).json();

    // With no appreciation the 5-year return is rent-only: 12% × 5 × 0.82.
    expect(zero.fiveYr).toBeCloseTo(12 * 5 * 0.82, 10);
    expect(zero.fiveYr).toBeLessThan(fifteen.fiveYr);
  });

  it('supports negative appreciation (depreciation)', async () => {
    const body = await (
      await roiCalculate(post({ price: 10_000_000, rent: 100_000, appreciation: -10 }))
    ).json();

    expect(Number.isFinite(body.fiveYr)).toBe(true);
    expect(body.fiveYr).toBeLessThan(12 * 5 * 0.82);
  });

  it('rejects a non-numeric price rather than substituting a default', async () => {
    const res = await roiCalculate(post({ price: 'abc', rent: 100_000 }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: '"price" must be a number' });
  });

  it('still defaults a genuinely absent field', async () => {
    const body = await (await roiCalculate(post({ rent: 100_000 }))).json();

    expect(body.gross).toBeCloseTo(12, 10); // price defaulted to 10M
  });
});

describe('POST /api/pricing/evaluate', () => {
  it('values a listing from the zone rate, area, and bedroom premium', async () => {
    const res = await pricingEvaluate(post({ zone: 'New Cairo', area: 200, beds: 3 }));
    const body = await res.json();

    expect(res.status).toBe(200);
    // 62,000 × 200 × 1 × 1 × 1.00 (beds == 3 → no premium)
    expect(body.value).toBeCloseTo(12_400_000, 10);
    expect(body.rangeLow).toBeCloseTo(12_400_000 * 0.93, 10);
    expect(body.rangeHigh).toBeCloseTo(12_400_000 * 1.07, 10);
  });

  it('applies a 4% premium per bedroom above three', async () => {
    const three = await (await pricingEvaluate(post({ area: 200, beds: 3 }))).json();
    const five = await (await pricingEvaluate(post({ area: 200, beds: 5 }))).json();

    expect(five.value / three.value).toBeCloseTo(1.08, 10);
  });

  it('discounts below three bedrooms', async () => {
    const two = await (await pricingEvaluate(post({ area: 200, beds: 2 }))).json();
    const three = await (await pricingEvaluate(post({ area: 200, beds: 3 }))).json();

    expect(two.value / three.value).toBeCloseTo(0.96, 10);
  });

  it.each([
    ['New Cairo', 62_000],
    ['Madinaty', 48_000],
    ['El Shorouk', 38_000],
    ['Mostakbal', 42_000],
    ['Fifth Settlement', 65_000],
    ['Sheikh Zayed', 45_000],
  ])('uses the %s zone rate', async (zone, rate) => {
    const body = await (await pricingEvaluate(post({ zone, area: 100, beds: 3 }))).json();

    expect(body.breakdown.rate).toBe(rate);
    expect(body.value).toBeCloseTo(rate * 100, 10);
  });

  it('falls back to a 50,000 rate for an unknown zone', async () => {
    const body = await (await pricingEvaluate(post({ zone: 'Atlantis', area: 100, beds: 3 }))).json();

    expect(body.breakdown.rate).toBe(50_000);
  });

  it('defaults to New Cairo, 150 sqm, 3 beds for an empty body', async () => {
    const body = await (await pricingEvaluate(post({}))).json();

    expect(body.breakdown.rate).toBe(62_000);
    expect(body.breakdown.area).toBe(150);
    expect(body.value).toBeCloseTo(62_000 * 150, 10);
  });

  it('clamps area to a 50 sqm floor', async () => {
    const tiny = await (await pricingEvaluate(post({ area: 10, beds: 3 }))).json();
    const fifty = await (await pricingEvaluate(post({ area: 50, beds: 3 }))).json();

    expect(tiny.breakdown.area).toBe(50);
    expect(tiny.value).toBeCloseTo(fifty.value, 10);
  });

  it('clamps a zero or negative area to the same floor', async () => {
    const zero = await (await pricingEvaluate(post({ area: 0, beds: 3 }))).json();
    const negative = await (await pricingEvaluate(post({ area: -100, beds: 3 }))).json();

    expect(zero.breakdown.area).toBe(50);
    expect(negative.breakdown.area).toBe(50);
  });

  it('multiplies by the finishing and furnishing factors', async () => {
    const base = await (await pricingEvaluate(post({ area: 100, beds: 3 }))).json();
    const premium = await (await pricingEvaluate(post({ area: 100, beds: 3, fin: 1.2, furn: 1.1 }))).json();

    expect(premium.value / base.value).toBeCloseTo(1.32, 10);
  });

  it('reports fin and bedPrem as 2-decimal strings in the breakdown', async () => {
    const body = await (await pricingEvaluate(post({ area: 100, beds: 5, fin: 1.234 }))).json();

    expect(body.breakdown.fin).toBe('1.23');
    expect(body.breakdown.bedPrem).toBe('1.08');
  });

  it('returns 400 for a malformed JSON body', async () => {
    const res = await pricingEvaluate(malformed());

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toHaveProperty('error');
  });

  // ── invalid numerics are rejected, not silently propagated as NaN ────────
  it('rejects a non-numeric beds instead of returning a null valuation', async () => {
    // Previously `Number('abc')` → NaN propagated through bedPrem into value,
    // and NaN serialises to null — so the caller got `{ value: null }` with a
    // 200 status rather than an error.
    const res = await pricingEvaluate(post({ area: 100, beds: 'abc' }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: '"beds" must be a number' });
  });

  it('rejects a non-numeric area', async () => {
    const res = await pricingEvaluate(post({ area: 'big', beds: 3 }));

    expect(res.status).toBe(400);
  });

  it('rejects a non-positive finishing or furnishing factor', async () => {
    expect((await pricingEvaluate(post({ area: 100, beds: 3, fin: 0 }))).status).toBe(400);
    expect((await pricingEvaluate(post({ area: 100, beds: 3, furn: -1 }))).status).toBe(400);
  });

  it('never returns a null or NaN valuation for accepted input', async () => {
    const body = await (await pricingEvaluate(post({ area: 100, beds: 4 }))).json();

    expect(body.value).not.toBeNull();
    expect(Number.isFinite(body.value)).toBe(true);
  });
});
