import { NextResponse } from 'next/server';

/**
 * POST /api/roi/calculate — gross / net / 5-year yield and payback period.
 *
 * Input contract: a field that is ABSENT falls back to its default; a field
 * that is PRESENT is used as given. Previously this used `Number(x) || default`,
 * which treats a legitimate 0 as "missing" — so a price of 0 silently became
 * 10,000,000, a rent of 0 became 1.2M/yr, and 0% appreciation became 15%. Those
 * substitutions changed the figures shown to the user rather than erroring,
 * which is the worst failure mode for a financial projection.
 */

const DEFAULT_PRICE = 10_000_000;
const DEFAULT_MONTHLY_RENT = 100_000; // 1.2M/yr, the previous annual default
const DEFAULT_APPRECIATION_PCT = 15;

/** Costs assumed against gross yield: maintenance, tax and void periods. */
const NET_YIELD_FACTOR = 0.82;

/**
 * Coerce a supplied field. `undefined`/`null` yields the default; anything
 * else must parse to a finite number, otherwise the caller gets a 400 rather
 * than a silently substituted value.
 */
function readNumber(value: unknown, field: string, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`"${field}" must be a number`);
  }
  return n;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { price, rent, appreciation } = body ?? {};

    const P = readNumber(price, 'price', DEFAULT_PRICE);
    const monthlyRent = readNumber(rent, 'rent', DEFAULT_MONTHLY_RENT);
    const appreciationPct = readNumber(appreciation, 'appreciation', DEFAULT_APPRECIATION_PCT);

    // A yield is undefined at a zero or negative price, and a negative rent is
    // not a thing. Reject rather than returning a nonsense figure.
    if (P <= 0) {
      return NextResponse.json({ error: '"price" must be greater than 0' }, { status: 400 });
    }
    if (monthlyRent < 0) {
      return NextResponse.json({ error: '"rent" must not be negative' }, { status: 400 });
    }

    const R = monthlyRent * 12;
    const A = appreciationPct / 100;

    const gross = (R / P) * 100;
    const net = gross * NET_YIELD_FACTOR;
    const fiveYr = ((R * 5 * NET_YIELD_FACTOR + P * (Math.pow(1 + A, 5) - 1)) / P) * 100;
    // Payback is undefined at zero net yield; clamp the divisor so the response
    // stays a finite number rather than Infinity.
    const payback = 100 / Math.max(net, 0.1);

    return NextResponse.json({ gross, net, fiveYr, payback });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
