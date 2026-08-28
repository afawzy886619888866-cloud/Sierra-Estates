import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppStatusService } from '@/lib/services/WhatsAppStatusService';
import { WhatsAppParserService } from '@/lib/services/WhatsAppParserService';
import * as crypto from 'crypto';

/**
 * SIERRA ESTATES WEBHOOK ENTRY POINT
 * Receives real-time streams from Meta WhatsApp Business Cloud API, Twilio, or Automation Bridges.
 */

function verifyMetaSignature(payload: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader || !appSecret) return true; // Optional if secret is not configured
  try {
    const signature = signatureHeader.replace('sha256=', '');
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
  const rawBody = await req.text();
  
  // Optional secret verification for WhatsApp webhook
  const SECRET_KEY = process.env.SBR_SECRET_KEY || '';
  if (SECRET_KEY) {
    const secretHeader = req.headers.get('x-sbr-secret-key');
    if (secretHeader && secretHeader !== SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

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
    const metaMessageObj = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const metaContactObj = body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];

    const message = metaMessageObj?.text?.body || body.message?.text || body.text || body.Body;
    const sender = metaMessageObj?.from || metaContactObj?.wa_id || body.from || body.From || "External Signal";
    const isSenderGroup = typeof sender === 'string' && (sender.includes('@g.us') || sender.toLowerCase().includes('group'));
    const group = body.groupName || body.Source || (isSenderGroup ? sender : "WhatsApp Broker Group");
    const isGroup = body.isGroup === true || body.isGroup === 'true' || isSenderGroup;

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
