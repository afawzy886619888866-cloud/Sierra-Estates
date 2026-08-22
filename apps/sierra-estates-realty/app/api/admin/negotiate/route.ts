import { NextResponse } from 'next/server';
import { NegotiationEngine } from '@sierra-estates/agents-core/src/negotiation-engine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const askingPrice = Number(body.askingPrice) || 38000000;
    const buyerOffer = Number(body.buyerOffer) || 34000000;
    const sellerFloor = body.sellerFloor ? Number(body.sellerFloor) : undefined;
    const maxYears = Number(body.maxYears) || 7;

    const outcome = NegotiationEngine.simulateNegotiation(
      askingPrice,
      buyerOffer,
      sellerFloor,
      maxYears
    );

    return NextResponse.json({
      success: true,
      outcome,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Negotiation simulation failed' },
      { status: 500 }
    );
  }
}
