import { NextRequest, NextResponse } from 'next/server';
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
    // 1. Verify Telegram Webhook Secret Token if configured
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret) {
      const secretHeader = req.headers.get('x-telegram-bot-api-secret-token');
      if (secretHeader !== expectedSecret) {
        console.warn('⚠️ [Telegram Webhook] Unauthorized secret header mismatch.');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

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
