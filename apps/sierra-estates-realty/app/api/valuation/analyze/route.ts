import { NextRequest, NextResponse } from 'next/server';
import { evaluatePropertyValuation, ValuationInput } from '@/lib/valuationArbitrageEngine';
import { analyzeValuationViaPythonApi } from '@/lib/server/python-api-client';

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

    // Try Python Valuation Engine microservice first if configured
    const pythonResult = await analyzeValuationViaPythonApi(body as Record<string, any>);
    const result = pythonResult.success && pythonResult.valuation
      ? pythonResult.valuation
      : evaluatePropertyValuation(body);

    return NextResponse.json({
      success: true,
      agent: 'The Curator (AVM & Valuation Engine)',
      source: pythonResult.success ? 'python-microservice' : 'local-ts-engine',
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
