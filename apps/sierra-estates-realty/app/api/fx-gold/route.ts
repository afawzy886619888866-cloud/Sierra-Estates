import { NextResponse } from 'next/server';
import { FxGoldValuationEngine, DEFAULT_FX_RATES } from '@sierra-estates/agents-core/src/fx-gold-engine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const priceParam = searchParams.get('price');
  const priceEGP = priceParam ? parseFloat(priceParam) : 10000000;

  const valuation = FxGoldValuationEngine.calculateParity(priceEGP, DEFAULT_FX_RATES);

  return NextResponse.json({
    success: true,
    rates: DEFAULT_FX_RATES,
    valuation,
    timestamp: new Date().toISOString(),
  });
}
