import { NextResponse } from 'next/server';
import { PaymentService } from '@/lib/services/payment-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/reservations/status
 * Returns current status of unit reservations feature gate.
 */
export async function GET() {
  const enabled = PaymentService.isReservationsEnabled();
  return NextResponse.json({
    success: true,
    enabled,
    message: enabled
      ? 'Unit reservations active'
      : 'Unit reservations gated pending legal compliance review (ENABLE_UNIT_RESERVATIONS=false)',
  });
}
