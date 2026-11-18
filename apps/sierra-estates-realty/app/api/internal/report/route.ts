import { NextResponse } from 'next/server';
import { verifyRequest, unauthorizedResponse } from '@/lib/server/auth-guard';

export async function GET(request: Request) {
  const __auth = await verifyRequest(request as import('next/server').NextRequest);
  if (!__auth.authenticated) return unauthorizedResponse();
  return NextResponse.json({
    reportId: `rep-${Date.now()}`,
    title: 'Sierra Estates Strategic Real Inventory Report',
    activeProperties: 306,
    monitoredCompounds: 19,
    valuationConfidence: 0.94,
    source: 'static-fallback',
    mockMode: true,
    generatedAt: new Date().toISOString(),
  });
}
