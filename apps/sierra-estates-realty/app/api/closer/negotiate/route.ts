import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { simulateNegotiationFromBody } from '@/lib/services/negotiation-simulate';

export async function POST(req: NextRequest) {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const outcome = simulateNegotiationFromBody(body);

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
