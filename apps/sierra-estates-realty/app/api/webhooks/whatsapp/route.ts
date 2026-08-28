import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppStatusService } from '@/lib/services/WhatsAppStatusService';
import { WhatsAppParserService } from '@/lib/services/WhatsAppParserService';
import { safeEqual } from '@/lib/auth';

/**
 * SIERRA ESTATES WEBHOOK ENTRY POINT
 * This endpoint receives real-time streams from messaging gateways.
 * 
 * Supports: WhatsApp Business API, Telegram Bot Webhooks, or Automation Bridges.
 */

export async function POST(req: NextRequest) {
  // Secret verification for the WhatsApp webhook. A missing SBR_SECRET_KEY
  // used to skip the check entirely (FAIL-OPEN), leaving the ingest pipeline
  // open to anonymous callers. Fail CLOSED in production, keep the
  // unauthenticated path in development — same shape as lib/server/cron-auth.ts.
  const SECRET_KEY = process.env.SBR_SECRET_KEY || '';
  if (!SECRET_KEY) {
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 SBR_SECRET_KEY is not configured — rejecting webhook request');
      return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 });
    }
  } else {
    const secretHeader = req.headers.get('x-sbr-secret-key');
    if (!secretHeader || !safeEqual(secretHeader, SECRET_KEY)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const body = await req.json();
    
    // Log incoming payload for audit
    console.log("📥 Incoming Webhook Payload:", JSON.stringify(body, null, 2));

    // Update Node Connectivity Heartbeat
    await WhatsAppStatusService.recordHeartbeat('syncing');

    // Dynamic extraction logic (Adapter Pattern)
    const message = body.message?.text || body.text || body.Body;
    const sender = body.from || body.From || "External Signal";
    const group = body.groupName || body.Source || "WhatsApp Broker Group";
    const isGroup = body.isGroup === true || body.isGroup === 'true';

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
      
      return NextResponse.json({ 
        status: "success",
        replyMessage: replyText,
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
