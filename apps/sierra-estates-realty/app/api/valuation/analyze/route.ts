import { NextRequest, NextResponse } from 'next/server';
import { evaluatePropertyValuation, ValuationInput } from '@/lib/valuationArbitrageEngine';

export async function POST(req: NextRequest) {
  try {
    const body: ValuationInput = await req.json();

    if (!body || (!body.offered_purchase_price && !body.offered_rent)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either offered_purchase_price or offered_rent is required for valuation analysis.',
        },
        { status: 400 }
      );
    }

    const result = evaluatePropertyValuation(body);

    return NextResponse.json({
      success: true,
      agent: 'The Curator (AVM & Valuation Engine)',
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
