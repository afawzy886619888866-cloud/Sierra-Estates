import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/models/schema';
import { sendWhatsApp, getTwilioStatusCallbackUrl } from '@/lib/server/twilio-client';
import {
  getOutreachConfig,
  isWithinOperatingHours,
  ensureNumbersSeeded,
  claimEligibleNumber,
} from '@/lib/server/whatsapp-queue';
import { logger } from '@/lib/logger';
import { verifyCronRequest } from '@/lib/server/cron-auth';

/**
 * CRON: WhatsApp dispatch worker.
 * Drains the whatsapp_message_queue subject to operating hours (10:00–10:59
 * Africa/Cairo, see DEFAULT_OUTREACH_CONFIG) and per-number quota (30/2hr,
 * 480/day across 4 senders). Fired once daily by
 * .github/workflows/whatsapp-dispatch-cron.yml.
 */

const MAX_PER_RUN = 80;

export async function GET(req: NextRequest) {
  const denied = verifyCronRequest(req);
  if (denied) return denied;

  try {
    const config = await getOutreachConfig();

    if (!isWithinOperatingHours(config)) {
      return NextResponse.json({ success: true, skipped: 'outside-operating-hours', timestamp: new Date().toISOString() });
    }

    await ensureNumbersSeeded(config);

    const statusCallback = getTwilioStatusCallbackUrl();

    const queued = await adminDb
      .collection(COLLECTIONS.whatsappMessageQueue)
      .where('status', '==', 'queued')
      .limit(MAX_PER_RUN)
      .get();

    let sent = 0;
    let failed = 0;
    let skippedQuota = 0;
    let deferredScheduled = 0;
    const nowMs = Date.now();

    for (const jobDoc of queued.docs) {
      const job = jobDoc.data() as Record<string, any>;

      // If job is scheduled for a future time/date, leave it queued for later dispatch
      if (job.scheduledFor) {
        const scheduledTimeMs = typeof job.scheduledFor.toMillis === 'function'
          ? job.scheduledFor.toMillis()
          : new Date(job.scheduledFor).getTime();

        if (!isNaN(scheduledTimeMs) && scheduledTimeMs > nowMs) {
          deferredScheduled++;
          continue;
        }
      }

      const claim = await claimEligibleNumber(config);
      if (!claim) {
        // No sender has remaining quota this window — leave the rest queued.
        skippedQuota = queued.size - sent - failed;
        break;
      }

      await jobDoc.ref.update({
        status: 'sending',
        assignedNumberId: claim.id,
        updatedAt: Timestamp.now(),
      });

      try {
        const result = await sendWhatsApp(claim.e164Phone, job.toPhone, job.body, statusCallback);
        await jobDoc.ref.update({
          status: 'sent',
          twilioMessageSid: result.sid,
          sentAt: Timestamp.now(),
          attempts: (job.attempts ?? 0) + 1,
          updatedAt: Timestamp.now(),
        });
        sent++;
      } catch (err: any) {
        await jobDoc.ref.update({
          status: 'failed',
          errorMessage: err?.message || String(err),
          attempts: (job.attempts ?? 0) + 1,
          updatedAt: Timestamp.now(),
        });
        failed++;
        logger.error(`[whatsapp-dispatch] send failed for job ${jobDoc.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      processed: sent + failed,
      sent,
      failed,
      skippedQuota,
      deferredScheduled,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[whatsapp-dispatch] worker error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'dispatch failed' },
      { status: 500 },
    );
  }
}
