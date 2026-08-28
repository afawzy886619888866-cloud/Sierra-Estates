import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppParserService } from '@/lib/services/WhatsAppParserService';
import { logger } from '@/lib/logger';
import { verifySharedSecret } from '@/lib/server/webhook-auth';

function verifyWebhookSecret(req: NextRequest) {
  return verifySharedSecret(req, {
    header: 'x-sbr-secret-key',
    secret: process.env.SBR_SECRET_KEY,
    name: 'SBR_SECRET_KEY',
  });
}

export async function POST(req: NextRequest) {
  const denied = verifyWebhookSecret(req);
  if (denied) return denied;

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
