import { NextRequest, NextResponse } from 'next/server';
import { isValidTwilioSignature, getTwilioInboundWebhookUrl, twilioConfigured } from '@/lib/server/twilio-client';
import { OmnichannelChatService } from '@/lib/services/OmnichannelChatService';
import { logger } from '@/lib/logger';

/**
 * Inbound WhatsApp webhook for the 4 real Twilio senders (register this URL —
 * NEXT_PUBLIC_SITE_URL + /api/webhooks/twilio-inbound — as each number's
 * "incoming message" webhook in the Twilio Console / Messaging Service).
 *
 * Twilio POSTs application/x-www-form-urlencoded, NOT JSON — unlike this. The
 * other inbound routes (webhooks/whatsapp, ingest/whatsapp) call req.json()
 * unconditionally, which would throw on every real Twilio inbound message;
 * this route exists specifically to parse Twilio's actual wire format and
 * validate its signature, then hands off to the same unified router
 * (OmnichannelChatService) those other routes use downstream.
 *
 * No TwiML reply is returned — outbound replies go through the async
 * queue/dispatch worker like every other send in this system, not a
 * synchronous webhook response.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      params[key] = String(value);
    }

    if (twilioConfigured) {
      const url = getTwilioInboundWebhookUrl();
      const signature = req.headers.get('x-twilio-signature');
      if (!url || !isValidTwilioSignature(signature, url, params)) {
        logger.warn('[twilio-inbound] rejected request with invalid/missing X-Twilio-Signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    } else {
      logger.warn('[twilio-inbound] TWILIO_AUTH_TOKEN not set — signature validation skipped');
    }

    const from = (params.From || '').replace(/^whatsapp:/, '');
    const body = params.Body || '';
    const profileName = params.ProfileName || from;

    if (!from || !body) {
      return NextResponse.json({ ok: true, ignored: 'missing From/Body' });
    }

    const result = await OmnichannelChatService.handleIncomingMessage({
      platform: 'whatsapp',
      senderId: from,
      senderName: profileName,
      text: body,
    });

    return NextResponse.json({ ok: true, actionTaken: result.actionTaken });
  } catch (error: any) {
    logger.error('[twilio-inbound] error:', error);
    return NextResponse.json({ error: error?.message || 'inbound processing failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'active', service: 'Twilio WhatsApp Inbound Webhook' });
}
