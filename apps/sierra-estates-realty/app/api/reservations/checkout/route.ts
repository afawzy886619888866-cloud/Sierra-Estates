import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PaymentService } from '@/lib/services/payment-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reservationSchema = z.object({
  unitId: z.string().min(2),
  investorId: z.string().min(2),
  investorName: z.string().optional(),
  investorEmail: z.string().email().optional(),
  amountInEGP: z.number().positive(),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

/**
 * POST /api/reservations/checkout
 * Generates a down-payment reservation checkout session.
 * GATED: Fails with 403 when ENABLE_UNIT_RESERVATIONS=false.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parse = reservationSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parse.error.flatten() },
        { status: 400 },
      );
    }

    const result = await PaymentService.createReservationCheckout(parse.data);

    if (!result.enabled) {
      return NextResponse.json(
        {
          success: false,
          enabled: false,
          error: result.error,
          legalChecklist: '/docs/RESERVATION_FLOW_LEGAL_CHECKLIST.md',
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        enabled: true,
        sessionId: result.sessionId,
        checkoutUrl: result.checkoutUrl,
        amountInEGP: result.amountInEGP,
        expiresAt: result.expiresAt,
      },
      { status: 201 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to create reservation checkout' },
      { status: 500 },
    );
  }
}
