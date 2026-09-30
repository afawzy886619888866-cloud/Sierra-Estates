import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppStatusService } from '@/lib/services/WhatsAppStatusService';
import { WhatsAppParserService } from '@/lib/services/WhatsAppParserService';
import { verifySharedSecret } from '@/lib/server/webhook-auth';
<<<<<<< HEAD
=======
import { botMediaDeclineMessage } from '@/lib/server/photo-messages';
import { mentionsCairoPlaza, withCairoPlazaNotice } from '@/lib/server/cairo-plaza-notice';
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1

/**
 * SIERRA ESTATES WEBHOOK ENTRY POINT
 * Receives real-time streams from Meta WhatsApp Business Cloud API, Twilio, or Automation Bridges.
<<<<<<< HEAD
 */

function verifyMetaSignature(payload: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader || !appSecret) return true; // Optional if secret is not configured
  try {
    const signature = signatureHeader.replace('sha256=', '');
=======
 *
 * MEDIA POLICY — the bot accepts CONVERSATIONS (text, voice transcripts, image
 * captions) but NOT IMAGES: media is never downloaded, never parsed into a
 * listing, and never stored from the bot. Unit photos reach the system through
 * the admin portal instead (/api/admin/listings/photos), which is also where
 * the team re-requests photos from the owner/broker. A media-only message in
 * a DM gets the polite decline copy; in a group it is skipped silently.
 */

/** Message types the conversation layer treats as media (never parsed). */
const MEDIA_MESSAGE_TYPES = new Set([
  'image', 'video', 'sticker', 'document', 'location', 'contacts', 'reaction', 'unsupported', 'template',
]);

/**
 * Verify a Meta X-Hub-Signature-256 HMAC over the raw body.
 *
 * Phase 13 hardening: this used to `return true` when the signature header or
 * the app secret was missing (fail-open), and it verified against the WHATSAPP
 * API *token* — Meta signs webhooks with the App *secret*. The route-level
 * logic now decides what "missing" means; this function ONLY answers whether
 * the presented signature is valid. Missing inputs can never validate.
 */
function verifyMetaSignature(payload: string, signatureHeader: string, appSecret: string): boolean {
  if (!signatureHeader || !appSecret) return false;
  try {
    const signature = signatureHeader.replace(/^sha256=/, '');
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
    const hmac = crypto.createHmac('sha256', appSecret);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(digest, 'hex'));
  } catch {
    return false;
  }
}

async function sendWhatsAppReply(toPhone: string, text: string): Promise<boolean> {
  const token = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_META_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId || !toPhone) {
    console.log(`ℹ️ [WhatsApp Webhook] Outbound API credentials not configured; response generated in payload mode.`);
    return false;
<<<<<<< HEAD
  }

  try {
    const cleanPhone = toPhone.replace(/[^0-9]/g, '');
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: text },
      }),
    });

    if (!res.ok) {
      console.error(`⚠️ [WhatsApp Webhook] Outbound message failed with status ${res.status}: ${await res.text()}`);
      return false;
    }
    console.log(`✅ [WhatsApp Webhook] Outbound reply dispatched to ${cleanPhone}`);
    return true;
  } catch (err) {
    console.error(`❌ [WhatsApp Webhook] Outbound dispatch error:`, err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  // Shared-secret verification. This used to be `if (SECRET_KEY) { ...check... }`,
  // i.e. FAIL-OPEN: with SBR_SECRET_KEY unset the webhook accepted anything from
  // anyone and fed it straight into the listing parser. `verifySharedSecret`
  // fails closed in production (503 when unconfigured) while still allowing
  // local development without a secret — the same contract as
  // /api/ingest/whatsapp and /api/telegram/webhook.
  const denied = verifySharedSecret(req, {
    header: 'x-sbr-secret-key',
    secret: process.env.SBR_SECRET_KEY,
    name: 'SBR_SECRET_KEY',
  });
  if (denied) return denied;

  const rawBody = await req.text();

  // Meta X-Hub-Signature-256 validation
  const metaSecret = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_META_TOKEN || '';
  const hubSignature = req.headers.get('x-hub-signature-256');
  if (hubSignature && metaSecret && !verifyMetaSignature(rawBody, hubSignature, metaSecret)) {
    return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 403 });
  }

  try {
=======
  }

  try {
    const cleanPhone = toPhone.replace(/[^0-9]/g, '');
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: text },
      }),
    });

    if (!res.ok) {
      console.error(`⚠️ [WhatsApp Webhook] Outbound message failed with status ${res.status}: ${await res.text()}`);
      return false;
    }
    console.log(`✅ [WhatsApp Webhook] Outbound reply dispatched to ${cleanPhone}`);
    return true;
  } catch (err) {
    console.error(`❌ [WhatsApp Webhook] Outbound dispatch error:`, err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  // Shared-secret verification. This used to be `if (SECRET_KEY) { ...check... }`,
  // i.e. FAIL-OPEN: with SBR_SECRET_KEY unset the webhook accepted anything from
  // anyone and fed it straight into the listing parser. `verifySharedSecret`
  // fails closed in production (503 when unconfigured) while still allowing
  // local development without a secret — the same contract as
  // /api/ingest/whatsapp and /api/telegram/webhook.
  const denied = verifySharedSecret(req, {
    header: 'x-sbr-secret-key',
    secret: process.env.SBR_SECRET_KEY,
    name: 'SBR_SECRET_KEY',
  });
  if (denied) return denied;

  // OPPORTUNISTIC SCHEDULED-SEND DRAIN (fire-and-forget): every authenticated
  // inbound hit also nudges the outbound queue so scheduled jobs dispatch
  // within seconds of live traffic instead of waiting for the daily cron
  // piggyback. In-flight-guarded inside the drain module; never throws and
  // never blocks this request. The /api/cron/whatsapp-dispatch route remains
  // the authoritative scheduled drain.
  const { piggybackWhatsAppDrain } = await import('@/lib/server/whatsapp-drain');
  piggybackWhatsAppDrain();

  const rawBody = await req.text();

  // Meta X-Hub-Signature-256 validation (defense in depth on top of the
  // shared-secret gate above). Semantics after the Phase 13 hardening:
  //   · Signature PRESENTED but no app secret configured → 403: a caller
  //     presenting a Meta signature we cannot verify is not authenticatable.
  //   · Signature PRESENTED and app secret configured → verify or 403.
  //   · No signature header → allowed: the request already passed the
  //     fail-closed shared-secret gate (automation bridges do not sign).
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const hubSignature = req.headers.get('x-hub-signature-256');
  if (hubSignature) {
    if (!appSecret) {
      return NextResponse.json(
        { error: 'Meta signature presented but WHATSAPP_APP_SECRET is not configured' },
        { status: 403 },
      );
    }
    if (!verifyMetaSignature(rawBody, hubSignature, appSecret)) {
      return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 403 });
    }
  }

  try {
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
    const body = rawBody ? JSON.parse(rawBody) : {};
    
    // Log incoming payload for audit
    console.log("📥 Incoming Webhook Payload:", JSON.stringify(body, null, 2));

    // Update Node Connectivity Heartbeat
    await WhatsAppStatusService.recordHeartbeat('syncing');

    // Dynamic extraction logic (Adapter Pattern)
    const metaMessageObj = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const metaContactObj = body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];

    const sender = metaMessageObj?.from || metaContactObj?.wa_id || body.from || body.From || "External Signal";
    const isSenderGroup = typeof sender === 'string' && (sender.includes('@g.us') || sender.toLowerCase().includes('group'));
    const group = body.groupName || body.Source || (isSenderGroup ? sender : "WhatsApp Broker Group");
    const isGroup = body.isGroup === true || body.isGroup === 'true' || isSenderGroup;

<<<<<<< HEAD
    // Support text messages and audio/voice note messages
    let message = metaMessageObj?.text?.body || body.message?.text || body.text || body.Body;
    const isVoiceMessage = metaMessageObj?.type === 'audio' || metaMessageObj?.type === 'voice' || body.type === 'audio' || body.type === 'voice';

    if (!message && isVoiceMessage) {
      const { extractEntitiesFromTranscript } = await import('@/lib/services/voice-inventory-parser');
      const voiceTranscript = body.transcript || 'معايا شقة للإيجار في إيستاون التجمع الخامس مساحتها ١٦٥ متر ٣ غرف و٢ حمام تشطيب الترا سوبر لوكس مطلوب ٤٥ ألف جنية شهرياً من المالك مباشرة';
=======
    // Support text messages and audio/voice note messages. An image caption
    // IS conversation text (the bot accepts the conversation, not the image).
    let message =
      metaMessageObj?.text?.body ||
      metaMessageObj?.image?.caption ||
      body.message?.text ||
      body.text ||
      body.Body;
    const messageType = metaMessageObj?.type || body.type;
    const isVoiceMessage = messageType === 'audio' || messageType === 'voice';
    const isMediaMessage = MEDIA_MESSAGE_TYPES.has(String(messageType));

    if (!message && isVoiceMessage) {
      const { extractEntitiesFromTranscript } = await import('@/lib/services/voice-inventory-parser');
      // ANTI-FABRICATION: the demo transcript fallback was removed. Without a
      // real transcript the voice note is acknowledged but NOT parsed into a
      // listing — a missing transcript must not become a fake unit.
      const voiceTranscript = body.transcript;
      if (!voiceTranscript) {
        console.warn('[WhatsApp Webhook] Voice note received without transcript — skipping parse (no fabricated listings).');
        return NextResponse.json({ status: 'skipped', reason: 'voice_note_without_transcript' });
      }
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
      const parsedVoice = extractEntitiesFromTranscript(voiceTranscript, typeof sender === 'string' ? sender : undefined);
      message = parsedVoice.rawTranscript;
      console.log(`🎙️ [WhatsApp Webhook] Audio voice note transcribed & entity extracted:`, parsedVoice.extractedUnit.compound);
    }
<<<<<<< HEAD
=======

    // ── MEDIA POLICY: accept the conversation, decline the media ──
    // A media message carrying no text (no caption) is acknowledged, never
    // parsed, and (in DMs) answered with the decline copy. Groups are skipped
    // silently — the bot must not spam broker groups with auto-replies.
    if (!message && isMediaMessage) {
      if (isGroup) {
        return NextResponse.json({ status: 'skipped', reason: 'media_not_supported_in_group' });
      }
      await sendWhatsAppReply(sender, botMediaDeclineMessage());
      return NextResponse.json({
        status: 'success',
        type: 'media_declined_text_only_bot',
        media_type: String(messageType),
        processed_at: new Date().toISOString(),
      });
    }
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1

    if (!message) {
      return NextResponse.json({ error: "Empty signal ignored" }, { status: 400 });
    }

    let replyText = null;

    if (isGroup) {
      // Trigger AI Neural Processing for Listings
      const result = await WhatsAppParserService.processIncomingMessage(message, sender, group);
      return NextResponse.json({ 
        status: "success", 
        id: result.id,
        ai_confidence: "high",
        processed_at: new Date().toISOString()
      });
    } else {
      // 1. Check if incoming message is an Owner/Broker replying to an Availability Request
      const { AvailabilityVerificationService } = await import('@/lib/services/AvailabilityVerificationService');
      const ownerReplyResult = await AvailabilityVerificationService.handleOwnerReply({
        fromPhone: sender,
        replyText: message,
      });

      if (ownerReplyResult) {
        return NextResponse.json({
          status: 'success',
          type: 'availability_owner_reply_processed',
          matchedUnitCode: ownerReplyResult.matchedUnitCode,
          clientNotified: ownerReplyResult.clientNotified,
          processed_at: new Date().toISOString(),
        });
      }

      // 2. Check if incoming message is a Client confirming a viewing date
      const lower = message.toLowerCase();
      if (lower.includes('معاينة') || lower.includes('موعد') || lower.includes('بكرة') || lower.includes('viewing') || lower.includes('schedule') || lower.includes('visit')) {
        const viewingResult = await AvailabilityVerificationService.handleClientViewingConfirmation({
          clientPhone: sender,
          clientMessage: message,
        });
        if (viewingResult.scheduled) {
          return NextResponse.json({
            status: 'success',
            type: 'client_viewing_scheduled',
            viewingId: viewingResult.viewingId,
            processed_at: new Date().toISOString(),
          });
        }
      }

      // 3. Fall back to standard Conversational AI for Direct Messages (ECC Memory)
      const { WhatsAppConversationalService } = await import('@/lib/services/WhatsAppConversationalService');
      replyText = await WhatsAppConversationalService.processDirectMessage(message, sender);

      // MANDATORY Cairo Plaza notice: any auto-reply that discusses (or was
      // prompted by a message discussing) Cairo Plaza El-Mataria carries the
      // official Booking & Contracting steps verbatim at the bottom —
      // announcement/DISCLAIMER-POLICY.md. Exact text, never altered.
      if (replyText && (mentionsCairoPlaza(message) || mentionsCairoPlaza(replyText))) {
        replyText = withCairoPlazaNotice(replyText);
      }
      
      // Attempt Outbound Meta Dispatch if configured
      if (replyText && sender) {
        await sendWhatsAppReply(sender, replyText);
      }

      return NextResponse.json({ 
        status: "success", 
        replyMessage: replyText,
        dispatched: true,
        processed_at: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error("🚨 Webhook Critical Failure:", error);
    return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
  }
}

/**
 * GET Handler for Webhook Verification (Required by Meta/Twilio)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verify the webhook setup
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ status: "Sierra Estates Webhook Active" });
}
