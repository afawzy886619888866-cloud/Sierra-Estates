import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityVerificationService } from '@/lib/services/AvailabilityVerificationService';
import { verifyCronRequest } from '@/lib/server/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Verify authorization header or cron secret
  const denied = verifyCronRequest(req);
  if (denied) return denied;

  try {
    const result = await AvailabilityVerificationService.sweepTimeouts();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      expiredUnitsCount: result.expiredUnitsCount,
      updatedSessions: result.updatedSessions,
      message: `Availability SLA evaluation complete: ${result.expiredUnitsCount} unresponsive units marked unavailable.`,
    });
  } catch (err) {
    console.error('[cron/check-availability-sla] Error:', (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
