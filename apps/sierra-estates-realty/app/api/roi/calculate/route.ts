import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { price, rent, appreciation } = body;

    const P = Number(price) || 10000000;
    const R = Number(rent) * 12 || 1200000;
    const A = Number(appreciation) / 100 || 0.15;

    const gross = (R / P) * 100;
    const net = gross * 0.82; // 18% maintenance/tax/void assumption
    const fiveYr = (((R * 5 * 0.82) + P * (Math.pow(1 + A, 5) - 1)) / P) * 100;
    const payback = 100 / Math.max(net, 0.1);

    return NextResponse.json({
      gross,
      net,
      fiveYr,
      payback
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
