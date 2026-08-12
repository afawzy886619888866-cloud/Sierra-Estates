import { NextResponse } from 'next/server';

const ZONE_RATE: Record<string, number> = { 
  'New Cairo': 62000, 
  'Madinaty': 48000, 
  'El Shorouk': 38000, 
  'Mostakbal': 42000, 
  'Fifth Settlement': 65000, 
  'Sheikh Zayed': 45000 
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { zone = 'New Cairo', area = 150, beds = 3, fin = 1, furn = 1 } = body;

    const rate = ZONE_RATE[zone] || 50000;
    const safeArea = Math.max(50, Number(area) || 0);
    const bedPrem = 1 + (Number(beds) - 3) * 0.04;
    
    // Core valuation heuristic calculation
    const val = rate * safeArea * Number(fin) * Number(furn) * bedPrem;

    return NextResponse.json({
      value: val,
      rangeLow: val * 0.93,
      rangeHigh: val * 1.07,
      breakdown: {
        rate,
        area: safeArea,
        fin: Number(fin).toFixed(2),
        bedPrem: bedPrem.toFixed(2),
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
