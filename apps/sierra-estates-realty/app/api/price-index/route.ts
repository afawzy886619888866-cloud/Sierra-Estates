import { NextRequest, NextResponse } from 'next/server';
import { PriceIndexService } from '@/lib/services/PriceIndexService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/price-index
 * Returns the monthly compound price index for New Cairo.
 * Optional query parameter: ?period=YYYY-MM
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || undefined;

    const data = await PriceIndexService.getMonthlyPriceIndex(period);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch price index' },
      { status: 500 },
    );
  }
}
