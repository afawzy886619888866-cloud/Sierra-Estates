import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppParserService } from '@/lib/services/WhatsAppParserService';
import { processLailaIntake, resetLailaSession } from '@/lib/services/LailaLeadIntakeService';
import { logger } from '@/lib/logger';
import { verifySharedSecret } from '@/lib/server/webhook-auth';

/**
 * WhatsApp Webhook Gateway — routes to the correct service:
 *
 *   • BROKER GROUPS  → WhatsAppParserService (The Scribe) — extracts inventory listings
 *   • DIRECT CLIENTS → LailaLeadIntakeService — qualification flow → matching → CRM
 *
 * Routing key: `isGroup` flag from the gateway payload. If missing, falls back
 * to checking if the group field contains known broker group names.
 */

// Known broker / owner group identifiers (partial match, case-insensitive)
const BROKER_GROUP_KEYWORDS = [
  'broker',
  'بروكر',
  'وسيط',
  'ملاك',
  'owners',
  'property',
  'عقار',
  'real estate',
  'agents',
  'وكلاء',
  'مجموعة',
  'whatsapp scraper',
  'scraper',
  'group',
  'مجموعه',
];

// Words that trigger a Laila session reset
const RESET_KEYWORDS = ['reset', 'ابدأ', 'restart', 'start', 'مرحبا', 'هاي', 'hi', 'hello', 'أهلا'];

function isBrokerGroup(group: string, isGroup?: boolean): boolean {
  if (isGroup === false) return false;
  if (!group || group === 'Direct Message') return false;
  const lower = group.toLowerCase();
  return BROKER_GROUP_KEYWORDS.some((kw) => lower.includes(kw));
}

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

    // ── Parse payload ────────────────────────────────────────────
    const rawMessage =
      body.message || body.text || body.data?.message?.text || body.Body || body.content || '';
    const sender: string =
      body.sender || body.from || body.From || body.senderName || 'Unknown';
    const phone: string =
      body.phone || body.senderPhone || body.msisdn || sender.replace(/[^0-9+]/g, '') || sender;
    const group: string =
      body.groupName || body.group || body.To || 'Direct Message';
    const isGroup: boolean | undefined = body.isGroup;
    const mediaData: string | undefined = body.media?.data || body.mediaData;
    const mediaMime: string | undefined = body.media?.mimetype || body.mediaMimeType;

    if (!rawMessage && !mediaData) {
      return NextResponse.json({ error: 'No valid message content found' }, { status: 400 });
    }

    // ── Route: Broker groups → The Scribe (inventory parser) ────
    if (isBrokerGroup(group, isGroup)) {
      logger.info(`[Webhook] BROKER GROUP message from ${sender} in "${group}" → The Scribe`);

      const media =
        mediaData && mediaMime ? { data: mediaData, mimeType: mediaMime } : undefined;

      const result = await WhatsAppParserService.processIncomingMessage(
        rawMessage || '[media]',
        sender,
        group,
        media
      );

      return NextResponse.json({
        success: true,
        route: 'scribe',
        id: result.id,
        isListing: result.data?.isListing || false,
        isDuplicate: result.isDuplicate,
        orchestration: result.isDuplicate ? 'Duplicate ignored' : 'Stage 1 Completed — Inventory Ingestion',
      });
    }

    // ── Route: Direct messages → Laila (lead intake) ─────────────
    logger.info(`[Webhook] DIRECT MESSAGE from ${phone} → Laila Intake (Stage)`);

    const msgLower = rawMessage.toLowerCase().trim();
    const isReset = RESET_KEYWORDS.some((kw) => msgLower === kw || msgLower.startsWith(kw + ' '));

    let reply: string;
    if (isReset) {
      reply = await resetLailaSession(phone);
    } else {
      reply = await processLailaIntake(rawMessage, phone);
    }

    // ── Dispatch reply via configured WhatsApp gateway ───────────
    const gatewayUrl = process.env.WHATSAPP_GATEWAY_URL;
    const gatewayToken = process.env.WHATSAPP_GATEWAY_TOKEN || process.env.ULTRAMSG_TOKEN;
    const gatewayInstance = process.env.ULTRAMSG_INSTANCE_ID;

    if (gatewayUrl && reply) {
      try {
        // Support Ultramsg-style API
        const dispatchUrl = gatewayInstance
          ? `https://api.ultramsg.com/${gatewayInstance}/messages/chat`
          : gatewayUrl;

        await fetch(dispatchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(gatewayToken && !gatewayInstance ? { Authorization: `Bearer ${gatewayToken}` } : {}),
          },
          body: JSON.stringify({
            token: gatewayToken,
            to: phone,
            body: reply,
            priority: 10,
          }),
        });
        logger.info(`[Webhook] Reply dispatched to ${phone} via gateway`);
      } catch (sendErr) {
        logger.warn('[Webhook] Failed to dispatch reply via gateway:', sendErr);
      }
    }

    return NextResponse.json({
      success: true,
      route: 'laila',
      phone,
      reply,
      replyLength: reply.length,
    });

  } catch (error: any) {
    logger.error('[WhatsApp Webhook Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error', details: error?.message },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'Sierra Estates WhatsApp Webhook Gateway',
    routes: {
      brokerGroups: 'WhatsAppParserService (The Scribe) — Inventory ingestion',
      directMessages: 'LailaLeadIntakeService — Lead qualification + AI matching',
    },
  });
}
