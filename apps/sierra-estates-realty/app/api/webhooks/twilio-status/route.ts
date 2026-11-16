import { NextRequest, NextResponse } from 'next/server';
import { listRecords, updateRecord } from '@sierra-estates/db';
import { isValidTwilioSignature, getTwilioStatusCallbackUrl, twilioConfigured } from '@/lib/server/twilio-client';
import { logger } from '@/lib/logger';

/**
 * Twilio delivery/read status callback. Twilio POSTs form-encoded params
 * (MessageSid, MessageStatus, …) for each WhatsApp message we send with a
 * StatusCallback URL. We map the Twilio status onto the queued job's status.
 *
 * Validates X-Twilio-Signature so this can't be spoofed to forge delivery
 * statuses. Skipped (with a warning) only when Twilio isn't configured at
 * all — in that mode every send is already simulated, so there's no real
 * Twilio traffic to authenticate.
 */

const TWILIO_TO_JOB_STATUS: Record<string, string> = {
  queued: 'sent',
  sending: 'sending',
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
  undelivered: 'failed',
};

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      params[key] = String(value);
    }

    if (twilioConfigured) {
      const callbackUrl = getTwilioStatusCallbackUrl();
      const signature = req.headers.get('x-twilio-signature');
      if (!callbackUrl || !isValidTwilioSignature(signature, callbackUrl, params)) {
        logger.warn('[twilio-status] rejected request with invalid/missing X-Twilio-Signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      // Was a bare warn-and-continue, so with TWILIO_AUTH_TOKEN unset anyone
      // could POST MessageSid/MessageStatus and corrupt delivery state for
      // queued messages. The sibling twilio-inbound route already fails closed
      // in production; match it.
      logger.error('[twilio-status] TWILIO_AUTH_TOKEN is not configured — rejecting request');
      return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 });
    } else {
      logger.warn('[twilio-status] TWILIO_AUTH_TOKEN not set — signature validation skipped (development only)');
    }

    const sid = params['MessageSid'] || params['SmsSid'] || '';
    const twilioStatus = params['MessageStatus'] || params['SmsStatus'] || '';

    if (!sid) {
      return NextResponse.json({ error: 'Missing MessageSid' }, { status: 400 });
    }

    const jobs = await listRecords<{ id: string; status?: string }>('whatsapp_queue', {
      where: [{ column: 'twilioMessageSid', value: sid }],
      limit: 1,
    });

    if (jobs.length === 0) {
      // Unknown SID (e.g. a message not sent by the queue) — ack so Twilio stops retrying.
      logger.warn(`[twilio-status] no job found for SID ${sid} (status ${twilioStatus})`);
      return NextResponse.json({ ok: true, matched: false });
    }

    const mapped = TWILIO_TO_JOB_STATUS[twilioStatus];
    const update: Record<string, any> = { twilioStatus, updatedAt: new Date().toISOString() };
    // Never regress a 'read' job back to 'delivered'/'sent' on out-of-order callbacks.
    const current = jobs[0].status;
    const rank: Record<string, number> = { sent: 1, delivered: 2, read: 3, failed: 3 };
    if (mapped && (rank[mapped] ?? 0) >= (rank[current ?? ''] ?? 0)) {
      update.status = mapped;
    }

    await updateRecord('whatsapp_queue', jobs[0].id, update);
    return NextResponse.json({ ok: true, matched: true });
  } catch (error: any) {
    logger.error('[twilio-status] callback error:', error);
    return NextResponse.json({ error: error?.message || 'callback failed' }, { status: 500 });
  }
}
