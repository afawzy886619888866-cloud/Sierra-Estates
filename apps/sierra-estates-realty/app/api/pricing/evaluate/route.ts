import { NextResponse } from 'next/server';

/**
 * POST /api/pricing/evaluate — zone-rate valuation heuristic.
 *
 * Input contract: an ABSENT field falls back to its default; a PRESENT field
 * must parse to a finite number. Previously a non-numeric `beds` produced
 * `NaN` all the way through to `value`, which serialises to `null` in JSON —
 * the caller received a valuation of `null` with a 200 status rather than an
 * error. `Number(area) || 0` likewise turned a non-numeric area into the
 * 50 sqm floor instead of rejecting it.
 */

const ZONE_RATE: Record<string, number> = {
  'New Cairo': 62000,
  'Madinaty': 48000,
  'El Shorouk': 38000,
  'Mostakbal': 42000,
  'Fifth Settlement': 65000,
  'Sheikh Zayed': 45000,
};

const FALLBACK_RATE = 50000;
/** Smallest area the heuristic is meaningful for. */
const MIN_AREA_SQM = 50;
const BASELINE_BEDS = 3;
const PER_BEDROOM_PREMIUM = 0.04;

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
    const { zone = 'New Cairo', area, beds, fin, furn } = body ?? {};

    const rawArea = readNumber(area, 'area', 150);
    const bedrooms = readNumber(beds, 'beds', BASELINE_BEDS);
    const finishing = readNumber(fin, 'fin', 1);
    const furnishing = readNumber(furn, 'furn', 1);

    if (finishing <= 0 || furnishing <= 0) {
      return NextResponse.json(
        { error: '"fin" and "furn" must be greater than 0' },
        { status: 400 },
      );
    }

    const rate = ZONE_RATE[zone] || FALLBACK_RATE;
    // Areas below the floor (including 0 and negatives) are clamped rather
    // than rejected — the heuristic simply is not meaningful below it.
    const safeArea = Math.max(MIN_AREA_SQM, rawArea);
    const bedPrem = 1 + (bedrooms - BASELINE_BEDS) * PER_BEDROOM_PREMIUM;

    const val = rate * safeArea * finishing * furnishing * bedPrem;

    return NextResponse.json({
      value: val,
      rangeLow: val * 0.93,
      rangeHigh: val * 1.07,
      breakdown: {
        rate,
        area: safeArea,
        fin: finishing.toFixed(2),
        bedPrem: bedPrem.toFixed(2),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
