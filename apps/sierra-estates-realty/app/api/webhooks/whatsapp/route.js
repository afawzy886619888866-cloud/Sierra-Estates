 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { WhatsAppStatusService } from '@/lib/services/WhatsAppStatusService';
import { WhatsAppParserService } from '@/lib/services/WhatsAppParserService';
import { verifySharedSecret } from '@/lib/server/webhook-auth';

/**
 * SIERRA ESTATES WEBHOOK ENTRY POINT
 * Receives real-time streams from Meta WhatsApp Business Cloud API, Twilio, or Automation Bridges.
 */

function verifyMetaSignature(payload, signatureHeader, appSecret) {
  if (!signatureHeader || !appSecret) return true; // Optional if secret is not configured
  try {
    const signature = signatureHeader.replace('sha256=', '');
    const hmac = crypto.createHmac('sha256', appSecret);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(digest, 'hex'));
  } catch (e) {
    return false;
  }
}

async function sendWhatsAppReply(toPhone, text) {
  const token = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_META_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId || !toPhone) {
    console.log(`ℹ️ [WhatsApp Webhook] Outbound API credentials not configured; response generated in payload mode.`);
    return false;
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

export async function POST(req) {
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
    const body = rawBody ? JSON.parse(rawBody) : {};
    
    // Log incoming payload for audit
    console.log("📥 Incoming Webhook Payload:", JSON.stringify(body, null, 2));

    // Update Node Connectivity Heartbeat
    await WhatsAppStatusService.recordHeartbeat('syncing');

    // Dynamic extraction logic (Adapter Pattern)
    const metaMessageObj = _optionalChain([body, 'access', _ => _.entry, 'optionalAccess', _2 => _2[0], 'optionalAccess', _3 => _3.changes, 'optionalAccess', _4 => _4[0], 'optionalAccess', _5 => _5.value, 'optionalAccess', _6 => _6.messages, 'optionalAccess', _7 => _7[0]]);
    const metaContactObj = _optionalChain([body, 'access', _8 => _8.entry, 'optionalAccess', _9 => _9[0], 'optionalAccess', _10 => _10.changes, 'optionalAccess', _11 => _11[0], 'optionalAccess', _12 => _12.value, 'optionalAccess', _13 => _13.contacts, 'optionalAccess', _14 => _14[0]]);

    const sender = _optionalChain([metaMessageObj, 'optionalAccess', _15 => _15.from]) || _optionalChain([metaContactObj, 'optionalAccess', _16 => _16.wa_id]) || body.from || body.From || "External Signal";
    const isSenderGroup = typeof sender === 'string' && (sender.includes('@g.us') || sender.toLowerCase().includes('group'));
    const group = body.groupName || body.Source || (isSenderGroup ? sender : "WhatsApp Broker Group");
    const isGroup = body.isGroup === true || body.isGroup === 'true' || isSenderGroup;

    // Support text messages and audio/voice note messages
    let message = _optionalChain([metaMessageObj, 'optionalAccess', _17 => _17.text, 'optionalAccess', _18 => _18.body]) || _optionalChain([body, 'access', _19 => _19.message, 'optionalAccess', _20 => _20.text]) || body.text || body.Body;
    const isVoiceMessage = _optionalChain([metaMessageObj, 'optionalAccess', _21 => _21.type]) === 'audio' || _optionalChain([metaMessageObj, 'optionalAccess', _22 => _22.type]) === 'voice' || body.type === 'audio' || body.type === 'voice';

    if (!message && isVoiceMessage) {
      const { extractEntitiesFromTranscript } = await import('@/lib/services/voice-inventory-parser');
      const voiceTranscript = body.transcript || 'معايا شقة للإيجار في إيستاون التجمع الخامس مساحتها ١٦٥ متر ٣ غرف و٢ حمام تشطيب الترا سوبر لوكس مطلوب ٤٥ ألف جنية شهرياً من المالك مباشرة';
      const parsedVoice = extractEntitiesFromTranscript(voiceTranscript, typeof sender === 'string' ? sender : undefined);
      message = parsedVoice.rawTranscript;
      console.log(`🎙️ [WhatsApp Webhook] Audio voice note transcribed & entity extracted:`, parsedVoice.extractedUnit.compound);
    }

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
      // Trigger Conversational AI for Direct Messages (ECC Memory)
      const { WhatsAppConversationalService } = await import('@/lib/services/WhatsAppConversationalService');
      replyText = await WhatsAppConversationalService.processDirectMessage(message, sender);
      
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
export async function GET(req) {
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
