import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@sierra-estates/db';
import { WhatsAppParserService } from '@/lib/services/WhatsAppParserService';
import { processLailaIntake, resetLailaSession } from '@/lib/services/LailaLeadIntakeService';
import { logger } from '@/lib/logger';
import { verifySharedSecret } from '@/lib/server/webhook-auth';

/**
 * WhatsApp Webhook Gateway — routes to the correct service:
 *
 *   • BROKER GROUPS       → WhatsAppParserService (The Scribe) — extracts inventory listings
 *   • OWNER PHOTO HARVEST → WhatsAppParserService — attaches owner-sent media to matching listing
 *   • DIRECT CLIENTS      → LailaLeadIntakeService — qualification flow → matching → CRM
 */

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

async function isKnownDirectOwnerPhone(rawPhone: string): Promise<{ matched: boolean; code?: string }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { matched: false };
  const suffix = rawPhone.replace(/\D/g, '').slice(-9);
  if (suffix.length < 9) return { matched: false };
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('listings')
      .select('id, code')
      .ilike('owner_phone', `%${suffix}%`)
      .limit(1);
    if (Array.isArray(data) && data.length > 0) {
      return { matched: true, code: String(data[0].code || data[0].id) };
    }
  } catch (err: unknown) {
    logger.warn('[Webhook] Owner phone media lookup skipped:', err instanceof Error ? err.message : String(err));
  }
  return { matched: false };
}

export async function POST(req: NextRequest) {
  const denied = verifyWebhookSecret(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const nestedData = (body.data && typeof body.data === 'object' ? body.data : {}) as Record<string, unknown>;
    const nestedMsg = (nestedData.message && typeof nestedData.message === 'object' ? nestedData.message : {}) as Record<string, unknown>;
    const nestedMedia = (body.media && typeof body.media === 'object' ? body.media : {}) as Record<string, unknown>;

    const rawMessage = String(
      body.message || body.text || nestedMsg.text || body.Body || body.content || '',
    );
    const sender = String(
      body.sender || body.from || body.From || body.senderName || 'Unknown',
    );
    const phone = String(
      body.phone || body.senderPhone || body.msisdn || sender.replace(/[^0-9+]/g, '') || sender,
    );
    const group = String(
      body.groupName || body.group || body.To || 'Direct Message',
    );
    const isGroup = typeof body.isGroup === 'boolean' ? body.isGroup : undefined;
    const mediaData = typeof nestedMedia.data === 'string'
      ? nestedMedia.data
      : typeof body.mediaData === 'string'
        ? body.mediaData
        : undefined;
    const mediaMime = typeof nestedMedia.mimetype === 'string'
      ? nestedMedia.mimetype
      : typeof body.mediaMimeType === 'string'
        ? body.mediaMimeType
        : undefined;

    if (!rawMessage && !mediaData) {
      return NextResponse.json({ error: 'No valid message content found' }, { status: 400 });
    }

    // ── Route 1: Broker groups → The Scribe (inventory parser) ────
    if (isBrokerGroup(group, isGroup)) {
      logger.info(`[Webhook] BROKER GROUP message from ${sender} in "${group}" → The Scribe`);

      const media =
        mediaData && mediaMime ? { data: mediaData, mimeType: mediaMime } : undefined;

      const result = await WhatsAppParserService.processIncomingMessage(
        rawMessage || '[media]',
        sender,
        group,
        media,
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

    // ── Route 2: Direct Owner sending unit photos → Media Harvester ─
    if (mediaData && mediaMime) {
      const ownerMatch = await isKnownDirectOwnerPhone(phone);
      if (ownerMatch.matched) {
        logger.info(`[Webhook] DIRECT OWNER MEDIA from ${phone} (listing ${ownerMatch.code}) → Media Harvester`);
        const result = await WhatsAppParserService.processIncomingMessage(
          rawMessage || `[owner-media:${ownerMatch.code}]`,
          sender,
          'Direct Owner Media Harvest',
          { data: mediaData, mimeType: mediaMime },
        );
        return NextResponse.json({
          success: true,
          route: 'owner-media-harvest',
          id: result.id,
          listingCode: ownerMatch.code,
          orchestration: 'Direct Owner Photo Harvested',
        });
      }
    }

    // ── Route 3: Direct messages → Laila (lead intake) ─────────────
    logger.info(`[Webhook] DIRECT MESSAGE from ${phone} → Laila Intake (Stage)`);

    const msgLower = rawMessage.toLowerCase().trim();
    const isReset = RESET_KEYWORDS.some((kw) => msgLower === kw || msgLower.startsWith(kw + ' '));

    let reply: string;
    if (isReset) {
      reply = await resetLailaSession(phone);
    } else {
      reply = await processLailaIntake(rawMessage, phone);
    }

    const gatewayUrl = process.env.WHATSAPP_GATEWAY_URL;
    const gatewayToken = process.env.WHATSAPP_GATEWAY_TOKEN || process.env.ULTRAMSG_TOKEN;
    const gatewayInstance = process.env.ULTRAMSG_INSTANCE_ID;

    if (gatewayUrl && reply) {
      try {
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
      } catch (sendErr: unknown) {
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
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : String(error);
    logger.error('[WhatsApp Webhook Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error', details },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'Sierra Estates WhatsApp Webhook Gateway',
    routes: {
      brokerGroups: 'WhatsAppParserService (The Scribe) — Inventory ingestion',
      ownerMediaHarvest: 'WhatsAppParserService — Direct Owner photo attachment',
      directMessages: 'LailaLeadIntakeService — Lead qualification + AI matching',
    },
  });
}
