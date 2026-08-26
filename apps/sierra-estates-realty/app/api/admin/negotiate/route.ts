import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { simulateNegotiationFromBody } from '@/lib/services/negotiation-simulate';

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const body = await req.json();
    const outcome = simulateNegotiationFromBody(body);

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
