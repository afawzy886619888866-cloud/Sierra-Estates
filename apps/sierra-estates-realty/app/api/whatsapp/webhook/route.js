 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
import { WhatsAppParserService } from '@/lib/services/WhatsAppParserService';
import { logger } from '@/lib/logger';
import { verifySharedSecret } from '@/lib/server/webhook-auth';

function verifyWebhookSecret(req) {
  return verifySharedSecret(req, {
    header: 'x-sbr-secret-key',
    secret: process.env.SBR_SECRET_KEY,
    name: 'SBR_SECRET_KEY',
  });
}

export async function POST(req) {
  const denied = verifyWebhookSecret(req);
  if (denied) return denied;

  try {
    const body = await req.json();

    // Support various common webhook formats (Ultramsg, Wati, Generic)
    const rawMessage = body.message || body.text || _optionalChain([body, 'access', _ => _.data, 'optionalAccess', _2 => _2.message, 'optionalAccess', _3 => _3.text]) || body.Body || body.content;
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
      isListing: _optionalChain([result, 'access', _4 => _4.data, 'optionalAccess', _5 => _5.isListing]) || false,
      isDuplicate: result.isDuplicate,
      orchestration: result.isDuplicate ? 'Duplicate ignored' : 'Stage 1 Completed',
    });

  } catch (error) {
    logger.error('[WhatsApp Webhook Error]:', error);
    return NextResponse.json({
        success: false,
        error: 'Internal Server Error',
        details: _optionalChain([error, 'optionalAccess', _6 => _6.message])
    }, { status: 500 });
  }
}

// Support GET for simple health check
export async function GET() {
    return NextResponse.json({ status: 'active', service: 'Sierra Estates WhatsApp Webhook Gateway' });
}
