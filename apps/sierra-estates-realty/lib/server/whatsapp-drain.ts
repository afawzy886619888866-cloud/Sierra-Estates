import 'server-only';
import { listRecords, updateRecord } from '@sierra-estates/db';
import { sendWhatsApp, getTwilioStatusCallbackUrl } from '@/lib/server/twilio-client';
import {
  getOutreachConfig,
  isWithinOperatingHours,
  ensureNumbersSeeded,
  claimEligibleNumber,
} from '@/lib/server/whatsapp-queue';
import { logger } from '@/lib/logger';

/**
 * WhatsApp queue drain — the actual dispatch worker body, shared by two
 * triggers so the queue can never become orphaned:
 *
 *   1. /api/cron/whatsapp-dispatch  (manual / external schedulers)
 *   2. /api/cron/sync-leads         (the daily Vercel cron piggybacks the drain
 *      right after importing fresh PF leads — Hobby caps Vercel crons at 2 per
 *      project and both slots are taken, and the GitHub Actions schedules are
 *      disabled by the account spending limit, so this piggyback is what keeps
 *      the queue draining every day inside the outreach window).
 *
 * Sends are subject to the operating-hours window (12:00–20:00 Africa/Cairo by
 * default) and per-sender quota; anything that does not fit in this run stays
 * 'queued' and rolls into the next trigger.
 */

export const MAX_PER_RUN = 80;

export interface WhatsAppDrainSummary {
  skipped?: string;
  processed: number;
  sent: number;
  failed: number;
  skippedQuota: number;
  deferredScheduled: number;
  timestamp: string;
}

export async function drainWhatsAppQueue(): Promise<WhatsAppDrainSummary> {
  const config = await getOutreachConfig();

  if (!isWithinOperatingHours(config)) {
    return {
      skipped: 'outside-operating-hours',
      processed: 0,
      sent: 0,
      failed: 0,
      skippedQuota: 0,
      deferredScheduled: 0,
      timestamp: new Date().toISOString(),
    };
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
      logger.error(`[whatsapp-drain] send failed for job ${job.id}:`, err);
    }
  }

  return {
    processed: sent + failed,
    sent,
    failed,
    skippedQuota,
    deferredScheduled,
    timestamp: new Date().toISOString(),
  };
}
