import { NextRequest, NextResponse } from 'next/server';
import { verifySharedSecret } from '@/lib/server/webhook-auth';
import { handleTelegramCommand, sendTelegramMessage } from '@/lib/services/telegram-controller';

/**
 * SIERRA ESTATES TELEGRAM WEBHOOK ENDPOINT
 * Receives real-time updates and commands from the Telegram Bot platform.
 */

export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'Sierra Estates Telegram Command OS',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    // Verify the Telegram webhook secret. This was `if (expectedSecret) { check }`,
    // so an unset TELEGRAM_WEBHOOK_SECRET removed the check entirely and anyone
    // could POST a command here — handleTelegramCommand dispatches /leads,
    // /inventory and /approve and replies to the chat id in the request body, so
    // an open route exfiltrates the CRM lead list to an attacker's chat.
    // The sibling route app/api/telegram/webhook/route.ts already fails closed;
    // use the same guard so the two cannot drift again.
    const denied = verifySharedSecret(req, {
      header: 'x-telegram-bot-api-secret-token',
      secret: process.env.TELEGRAM_WEBHOOK_SECRET,
      name: 'TELEGRAM_WEBHOOK_SECRET',
    });
    if (denied) return denied;

    const body = await req.json();

    // 2. Extract Message / Command Payload
    const message = body.message || body.edited_message || body.channel_post;
    if (!message || !message.text) {
      // Return 200 for non-text events (e.g. photos, stickers, system events)
      return NextResponse.json({ status: 'ignored', reason: 'No text message present' });
    }

    const chatId = String(message.chat.id);
    const text = message.text.trim();
    const sender = message.from?.username || message.from?.first_name || 'Authorized User';

    console.log(`📡 [Telegram Webhook] Received from ${sender} (chat ${chatId}): "${text}"`);

    // 3. Command Parsing: Check if it's a slash command
    if (text.startsWith('/')) {
      const parts = text.split(/\s+/);
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      await handleTelegramCommand(command, args, chatId);
    } else {
      // Natural language / query routing
      const lower = text.toLowerCase();
      if (lower.includes('lead') || lower.includes('client') || lower.includes('عميل')) {
        await handleTelegramCommand('/leads', [], chatId);
      } else if (lower.includes('inventory') || lower.includes('unit') || lower.includes('مخزون')) {
        await handleTelegramCommand('/inventory', [], chatId);
      } else if (lower.includes('maintenance') || lower.includes('clean') || lower.includes('صيانة')) {
        await handleTelegramCommand('/maintenance', [], chatId);
      } else {
        await sendTelegramMessage(
          `Hello ${sender}. Send <code>/help</code> to see available command deck actions.`,
          chatId
        );
      }
    }

    return NextResponse.json({ status: 'success', received: true });
  } catch (error) {
    console.error('❌ [Telegram Webhook Error]:', error);
    return NextResponse.json({ status: 'error', message: 'Internal Webhook Processing Failure' }, { status: 500 });
  }
}
