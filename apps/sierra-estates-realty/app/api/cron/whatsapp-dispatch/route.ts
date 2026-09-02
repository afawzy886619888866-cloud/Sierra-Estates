import { NextRequest, NextResponse } from 'next/server';
import { listRecords, updateRecord } from '@sierra-estates/db';
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
 *
 * ⚠️ Cross-store dependency: this worker now drains public.whatsapp_queue in
 * Postgres, but the enqueue side (enqueueWhatsAppJob in
 * lib/server/whatsapp-queue.ts) and the sender-number quota bookkeeping
 * (ensureNumbersSeeded / claimEligibleNumber, backed by the whatsapp_numbers
 * collection) still write Firestore. Until that helper is migrated, jobs
 * enqueued by the app will not be visible here. The mapping the helper must
 * adopt: toPhone → recipient_phone, body → message_body, everything else keeps
 * its own column (see supabase/schema.sql).
 *
 * Drains the queue subject to operating hours (10:00–10:59
 * Africa/Cairo, see DEFAULT_OUTREACH_CONFIG) and per-number quota (30/2hr,
 * 480/day across 4 senders). Fired once daily by
 * .github/workflows/whatsapp-dispatch-cron.yml.
 */

// Now a single daily invocation instead of one of many every-10-min runs, so
// it needs room to drain a full day's backlog of up to MAX_PER_RUN jobs in
// one go. 60s is the Vercel Hobby plan ceiling (higher values are silently
// capped there); anything left unsent when time runs out simply stays
// 'queued' and rolls into tomorrow's run.
export const maxDuration = 60;

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

    const queued = await listRecords<Record<string, any>>('whatsapp_queue', {
      where: [{ column: 'status', value: 'queued' }],
      limit: MAX_PER_RUN,
    });

    let sent = 0;
    let failed = 0;
    let skippedQuota = 0;
    let deferredScheduled = 0;
    const nowMs = Date.now();

    for (const job of queued) {
      // If job is scheduled for a future time/date, leave it queued for later dispatch
      if (job.scheduledFor) {
        const scheduledTimeMs = typeof job.scheduledFor?.toMillis === 'function'
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
        skippedQuota = queued.length - sent - failed;
        break;
      }

      await updateRecord('whatsapp_queue', job.id, {
        status: 'sending',
        assignedNumberId: claim.id,
        updatedAt: new Date().toISOString(),
      });

      try {
        const result = await sendWhatsApp(claim.e164Phone, job.recipientPhone, job.messageBody, statusCallback);
        await updateRecord('whatsapp_queue', job.id, {
          status: 'sent',
          twilioMessageSid: result.sid,
          sentAt: new Date().toISOString(),
          attempts: (job.attempts ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        });
        sent++;
      } catch (err: any) {
        await updateRecord('whatsapp_queue', job.id, {
          status: 'failed',
          errorMessage: err?.message || String(err),
          attempts: (job.attempts ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        });
        failed++;
        logger.error(`[whatsapp-dispatch] send failed for job ${job.id}:`, err);
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
