import { NextResponse } from 'next/server';
import { WealthService } from '@/lib/services/WealthService';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';

export async function GET(request) {
  const rateLimitResponse = await applyRateLimit(request, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const count = parseInt(searchParams.get('count') || '6');
  const market = searchParams.get('market') ;

  try {
    const portfolio = await WealthService.getCuratedPortfolio(count, market);
    return NextResponse.json(portfolio);
  } catch (error) {
    console.error('[Wealth API] Portfolio fetch failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
