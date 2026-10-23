import { listRecords, updateRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';

/**
 * Reservation auto-expiry — the enforcement half of the Inventory OS v2
 * escrow window.
 *
 * When a unit is reserved (POST /api/admin/inventory-os transition to
 * "reserved"), the listing row is stamped with `reserved_until`
 * (now + 14 days) and a `reservation_ref` (ESC-xxxx). Nothing else ever
 * cleared that stamp: if the buyer walked away, the unit sat reserved
 * forever and disappeared from the sellable pool while the pipeline board
 * showed a countdown that had already hit zero.
 *
 * This monitor, driven by /api/cron/expire-reservations (daily, see
 * vercel.json), finds every reservation whose window has lapsed and:
 *
 *   1. returns the unit to the market — status reserved → published, which
 *      is on the lifecycle transition matrix, so the DB trigger records the
 *      change in status_history and stamps the actor as "system";
 *   2. clears reserved_until / reservation_ref;
 *   3. queues a WhatsApp notification to the unit's owner contact through
 *      the standard outreach queue (whatsapp_queue), so it is sent within
 *      operating hours and quota by /api/cron/whatsapp-dispatch.
 *
 * Idempotent by construction: an expired row flips to "published" on the
 * first pass and no longer matches the query on subsequent runs.
 */

/** Reservation window length — must match RESERVATION_WINDOW_DAYS in the admin route. */
export const RESERVATION_WINDOW_DAYS = 14;

export interface ExpiredReservation {
  id: string;
  code: string | null;
  compound: string | null;
  propertyType: string | null;
  reservationRef: string | null;
  reservedUntil: string;
  notified: boolean;
}

export interface ExpiryRunResult {
  expired: ExpiredReservation[];
  notifiedCount: number;
  failures: number;
}

export class ReservationExpiryMonitor {
  /** Expire every lapsed reservation. Never throws: per-row failures are counted. */
  static async expireReservations(now: Date = new Date()): Promise<ExpiryRunResult> {
    const expiredRows = await listRecords<Record<string, unknown>>('listings', {
      where: [
        { column: 'status', op: 'eq', value: 'reserved' },
        { column: 'reservedUntil', op: 'lt', value: now.toISOString() },
      ],
      select: 'id, code, compound, propertyType, status, reservedUntil, reservationRef, ownerPhone, ownerName',
      orderBy: { column: 'reservedUntil', ascending: true },
      limit: 200,
    });

    if (expiredRows.length === 0) {
      logger.info('[ReservationExpiry] No lapsed reservations found.');
      return { expired: [], notifiedCount: 0, failures: 0 };
    }

    logger.info(
      `[ReservationExpiry] ${expiredRows.length} reservation(s) past their window — expiring.`
    );

    const expired: ExpiredReservation[] = [];
    let notifiedCount = 0;
    let failures = 0;

    for (const row of expiredRows) {
      const summary: ExpiredReservation = {
        id: String(row.id),
        code: (row.code as string) ?? null,
        compound: (row.compound as string) ?? null,
        propertyType: (row.propertyType as string) ?? null,
        reservationRef: (row.reservationRef as string) ?? null,
        reservedUntil: String(row.reservedUntil ?? ''),
        notified: false,
      };

      try {
        // reserved → published is on the transition matrix; the DB trigger
        // writes status_history (actor "system") and keeps published_at.
        await updateRecord('listings', summary.id, {
          status: 'published',
          reservedUntil: null,
          reservationRef: null,
          updatedAt: now.toISOString(),
        });

        // Queue the owner notification — best effort, never blocks expiry.
        const ownerPhone = (row.ownerPhone as string) || '';
        if (ownerPhone) {
          try {
            await enqueueWhatsAppJob({
              purpose: 'general-outreach',
              toPhone: ownerPhone,
              unitId: summary.id,
              body:
                `⏰ Reservation Expired — Sierra Estates\n` +
                `🔖 Unit: ${summary.code || summary.id}${summary.compound ? ` — ${summary.compound}` : ''}\n` +
                `🏠 ${summary.propertyType || 'Unit'}${summary.reservationRef ? ` · Ref ${summary.reservationRef}` : ''}\n` +
                `The ${RESERVATION_WINDOW_DAYS}-day escrow reservation window has lapsed and the unit is back on the market (Published).\n` +
                `Reply to this message to re-reserve the unit or discuss incoming offers.`,
            });
            summary.notified = true;
            notifiedCount += 1;
          } catch (waErr) {
            logger.warn(
              `[ReservationExpiry] WhatsApp queue failed for ${summary.code || summary.id}: ${
                waErr instanceof Error ? waErr.message : String(waErr)
              }`
            );
          }
        }

        expired.push(summary);
      } catch (err) {
        failures += 1;
        logger.error(
          `[ReservationExpiry] Failed to expire ${summary.code || summary.id}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    logger.info(
      `[ReservationExpiry] Done: ${expired.length} expired, ${notifiedCount} owner notifications queued, ${failures} failures.`
    );

    return { expired, notifiedCount, failures };
  }
}
