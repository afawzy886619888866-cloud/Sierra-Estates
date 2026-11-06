import { NextRequest, NextResponse } from 'next/server';
import { insertRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
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

    // ── PHASE 6: update_id idempotency ledger ──
    // /approve on this route mutates orchestration state; a Telegram retry
    // (this route answers 500 on processing errors, which triggers exactly
    // that) re-ran the command. Every update is now ledgered in
    // telegram_processed_updates and replays are skipped.
    const updateId: number | null =
      typeof body.update_id === 'number' ? body.update_id : null;
    if (updateId != null) {
      try {
        await insertRecord('telegram_processed_updates', {
          updateId,
          kind: 'command-os',
        });
      } catch (err: any) {
        if (/duplicate key|unique constraint/i.test(String(err?.message ?? err))) {
          return NextResponse.json({ status: 'skipped', reason: 'duplicate update_id' });
        }
        logger.warn(`[telegram] update ledger write failed: ${err?.message}`);
      }
    }

    // 2. Extract Message / Command Payload
    const message = body.message || body.edited_message || body.channel_post;
    if (!message || !message.text) {
      // Return 200 for non-text events (e.g. photos, stickers, system events)
      return NextResponse.json({ status: 'ignored', reason: 'No text message present' });
    }

    const chatId = String(message.chat.id);
    const text = message.text.trim();
    const sender = message.from?.username || message.from?.first_name || 'Authorized User';

    const safeSender = String(sender).replace(/\r|\n/g, '');
    const safeChatId = String(chatId).replace(/\r|\n/g, '');
    const safeText = String(text).replace(/\r|\n/g, '');
    console.log(`📡 [Telegram Webhook] Received from ${safeSender} (chat ${safeChatId}): "${safeText}"`);

    // 3. Command Parsing: Check if it's a slash command
    if (text.startsWith('/')) {
      const parts = text.split(/\s+/);
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      await handleTelegramCommand(command, args, chatId);
    } else {
      // 4. OpenClaw Easy Listing Ingestion
      // Check if message is a property listing sent by agents, owners, or bots
      const isListingText = (
        /للبيع|للايجار|شقة|فيلا|دوبلكس|تاون|مساحة|مطلوب|سعر|غرف|حمام|كمبوند|for sale|for rent|apartment|villa|sqm|bedroom|compound/i.test(text) &&
        (text.length > 20 || /\d+/.test(text))
      );

      if (isListingText) {
        try {
          const { parseEasyListing } = await import('@/lib/server/easy-listing');
          const easyResult = parseEasyListing({
            role: 'AGENT',
            name: safeSender,
            details: text,
          });

          const details = easyResult.property_details;
          const unitCode = easyResult.internal_code || `SE-TG-${Date.now().toString(36).toUpperCase()}`;

          // Persist unit to public.listings in review mode
          try {
            await insertRecord('listings', {
              id: unitCode,
              compound: details.compound || 'Unspecified Compound',
              locationArea: details.region || 'New Cairo',
              propertyType: (details.unit_type || 'Apartment').toLowerCase(),
              offerType: details.deal_type || 'sale',
              bedrooms: details.bedrooms ?? null,
              bathrooms: details.bathrooms ?? null,
              areaSqm: details.area_m2 ?? null,
              price: details.price_egp ?? 0,
              priceCurrency: 'EGP',
              status: 'review',
              syncSource: 'telegram_intake',
              description: text.slice(0, 1000),
              agentName: safeSender,
              rawData: {
                telegramChatId: safeChatId,
                telegramSender: safeSender,
                receivedAt: new Date().toISOString(),
                easyListing: {
                  sierraCode: easyResult.sierra_code,
                  bmmCode: easyResult.bmm_code,
                  floorLabel: easyResult.floor_label,
                  routingDestination: easyResult.routing_destination,
                  warnings: easyResult.parse_warnings,
                },
              },
            });
          } catch (dbErr: any) {
            logger.warn(`[telegram-easy-listing] DB insert note: ${dbErr?.message}`);
          }

          const replyLines = [
            `✅ <b>تم استلام وتسجيل الوحدة في Easy Listing بنجاح!</b>`,
            `Unit successfully registered in Easy Listing (Pending Review)`,
            ``,
            `🏷️ <b>الكود / Code:</b> <code>${unitCode}</code>`,
            details.compound ? `📍 <b>الكمبوند / Compound:</b> ${details.compound}` : null,
            details.unit_type ? `🏢 <b>النوع / Type:</b> ${details.unit_type}` : null,
            details.area_m2 ? `📐 <b>المساحة / Area:</b> ${details.area_m2} م²` : null,
            details.bedrooms != null ? `🛏️ <b>الغرف / Bedrooms:</b> ${details.bedrooms}` : null,
            details.price_egp ? `💰 <b>السعر / Price:</b> ${Number(details.price_egp).toLocaleString()} EGP` : null,
            `👤 <b>الراسل / Agent:</b> ${safeSender}`,
            `📋 <b>الحالة / Status:</b> قيد المراجعة (Pending Review)`,
            ``,
            `🔗 <i>مراجعة واعتماد الوحدة من لوحة التحكم:</i>`,
            `https://sierraestates.net/admin/properties`,
          ].filter(Boolean);

          await sendTelegramMessage(replyLines.join('\n'), chatId);
          return NextResponse.json({ status: 'success', action: 'easy_listing_registered', code: unitCode });
        } catch (easyErr: any) {
          logger.warn(`[telegram-easy-listing] Parse failed: ${easyErr?.message}`);
        }
      }

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
          `Hello ${sender}. Send <code>/help</code> for available commands, or send property details to register in Easy Listing.`,
          chatId
        );
      }
    }

    return NextResponse.json({ status: 'success', received: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ [Telegram Webhook Error]:', encodeURIComponent(errMsg));
    return NextResponse.json({ status: 'error', message: 'Internal Webhook Processing Failure' }, { status: 500 });
  }
}
