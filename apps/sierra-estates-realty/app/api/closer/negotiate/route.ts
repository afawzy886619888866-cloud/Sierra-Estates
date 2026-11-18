import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { simulateNegotiationFromBody } from '@/lib/services/negotiation-simulate';
import { verifyRequest, unauthorizedResponse } from '@/lib/server/auth-guard';

export async function POST(req: NextRequest) {
  const __auth = await verifyRequest(req as import('next/server').NextRequest);
  if (!__auth.authenticated) return unauthorizedResponse();
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
