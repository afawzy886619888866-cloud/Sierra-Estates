import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppParserService } from '@/lib/services/WhatsAppParserService';
import { logger } from '@/lib/logger';

/**
 * This route used to build and persist its own BrokerListing document
 * inline via WhatsAppParserService.parseMessage — a second, weaker
 * implementation of the same job app/api/webhooks/whatsapp/route.ts does
 * via WhatsAppParserService.processIncomingMessage (which additionally
 * dedupes, generates the Sierra code, geocodes, and persists media). No
 * caller of this route was found anywhere in the codebase — the WhatsApp
 * scraper posts to /api/webhooks/whatsapp, not here — but the endpoint is
 * kept alive (rather than deleted) in case an external provider (this
 * route's own comment names Ultramsg/Wati) still has it registered, now
 * delegating to the same shared implementation instead of diverging from it.
 */

const SECRET_KEY = process.env.SBR_SECRET_KEY || '';

async function verifyWebhookSecret(req: NextRequest): Promise<boolean> {
  if (!SECRET_KEY) return true;
  const secretHeader = req.headers.get('x-sbr-secret-key');
  return secretHeader === SECRET_KEY;
}

export async function POST(req: NextRequest) {
  if (!await verifyWebhookSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Support various common webhook formats (Ultramsg, Wati, Generic)
    const rawMessage = body.message || body.text || body.data?.message?.text || body.Body || body.content;
    const sender = body.sender || body.from || body.From || body.senderName || 'Unknown';
    const group = body.groupName || body.group || body.To || 'Direct Message';

    if (!rawMessage || typeof rawMessage !== 'string') {
      return NextResponse.json({ error: 'No valid message content found' }, { status: 400 });
    }

    logger.info(`[WhatsApp Webhook] Processing message from ${sender} in ${group}`);

    const result = await WhatsAppParserService.processIncomingMessage(rawMessage, sender, group);

    return NextResponse.json({
      success: true,
      id: result.id,
      isListing: result.data?.isListing || false,
      isDuplicate: result.isDuplicate,
      orchestration: result.isDuplicate ? 'Duplicate ignored' : 'Stage 1 Completed',
    });

  } catch (error: any) {
    logger.error('[WhatsApp Webhook Error]:', error);
    return NextResponse.json({
        success: false,
        error: 'Internal Server Error',
        details: error?.message
    }, { status: 500 });
  }
}

// Support GET for simple health check
export async function GET() {
    return NextResponse.json({ status: 'active', service: 'Sierra Estates WhatsApp Webhook Gateway' });
}
