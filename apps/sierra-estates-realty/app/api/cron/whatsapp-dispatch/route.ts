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

/**
 * CRON: WhatsApp dispatch worker.
 * Drains the whatsapp_message_queue subject to operating hours (12pm–8pm
 * Africa/Cairo) and per-number quota (30/2hr, 480/day across 4 senders).
 * Schedule it every ~10 min within the operating window via Vercel Cron.
 */

const MAX_PER_RUN = 80;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

    for (const jobDoc of queued.docs) {
      const job = jobDoc.data() as Record<string, any>;

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
