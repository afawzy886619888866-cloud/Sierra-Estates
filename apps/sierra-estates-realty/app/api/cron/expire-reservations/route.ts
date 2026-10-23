/**
 * CRON: GET /api/cron/expire-reservations
 *
 * Daily enforcement of the Inventory OS v2 escrow reservation window
 * (RESERVATION_WINDOW_DAYS = 14): every listing whose reserved_until has
 * lapsed goes back on the market (reserved → published, audited by the DB
 * trigger) and its owner contact gets a WhatsApp notification through the
 * standard outreach queue. See lib/services/ReservationExpiryMonitor.ts.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET` (same as the other cron routes).
 */
import { NextRequest, NextResponse } from 'next/server';
import { insertRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { verifyCronRequest } from '@/lib/server/cron-auth';
import { ReservationExpiryMonitor } from '@/lib/services/ReservationExpiryMonitor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const denied = verifyCronRequest(req);
  if (denied) return denied;

  try {
    const result = await ReservationExpiryMonitor.expireReservations();

    if (result.expired.length > 0) {
      // Activity feed entry — same pattern as the maintenance cron, so the
      // admin portal shows the market-return events alongside other ops news.
      await insertRecord('activities', {
        type: 'reservations_expired',
        actorId: 'system',
        actorName: 'Reservation Expiry Monitor',
        description:
          `${result.expired.length} reservation window(s) lapsed — units returned to market` +
          ` (${result.notifiedCount} owner notification(s) queued via WhatsApp)`,
        text:
          `${result.expired.length} reservation window(s) lapsed — units returned to market` +
          ` (${result.notifiedCount} owner notification(s) queued via WhatsApp)`,
        color: 'var(--amber-light)',
        createdAt: new Date().toISOString(),
      }).catch((err: unknown) => {
        // An activity-feed hiccup must never fail the expiry run itself.
        logger.warn(
          `[cron/expire-reservations] activity log write failed: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      });
    }

    return NextResponse.json({
      success: true,
      expiredCount: result.expired.length,
      notifiedCount: result.notifiedCount,
      failures: result.failures,
      expired: result.expired.map((r) => ({
        id: r.id,
        code: r.code,
        compound: r.compound,
        reservationRef: r.reservationRef,
        notified: r.notified,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Expiry pipeline interrupted';
    logger.error(`[cron/expire-reservations] failed: ${message}`);
    return NextResponse.json(
      { success: false, error: message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
