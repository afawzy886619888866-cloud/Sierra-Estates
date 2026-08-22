import { NextRequest, NextResponse } from 'next/server';
import { NegotiationEngine } from '@sierra-estates/agents-core';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const askingPrice = Number(body.askingPrice) || 38000000;
    const buyerOfferPrice = Number(body.buyerOfferPrice) || Math.round(askingPrice * 0.92);
    const sellerFloorPrice = body.sellerFloorPrice ? Number(body.sellerFloorPrice) : undefined;
    const buyerMaxYears = Number(body.buyerMaxYears) || 7;

    const outcome = NegotiationEngine.simulateNegotiation(
      askingPrice,
      buyerOfferPrice,
      sellerFloorPrice,
      buyerMaxYears
    );

    return NextResponse.json({
      success: true,
      outcome,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
