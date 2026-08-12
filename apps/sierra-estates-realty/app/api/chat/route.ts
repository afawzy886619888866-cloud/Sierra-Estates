import { NextRequest, NextResponse } from 'next/server';
import { OmnichannelChatService } from '@/lib/services/OmnichannelChatService';

/**
 * SIERRA ESTATES WEB CONCIERGE CHAT API
 * Serves as the dynamic gateway between the web-based LeilaConcierge widget and OmnichannelChatService.
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId, message, name } = await req.json();

    if (!sessionId || !message) {
      return NextResponse.json({ error: "Missing sessionId or message payload" }, { status: 400 });
    }

    const result = await OmnichannelChatService.handleIncomingMessage({
      platform: 'web',
      senderId: sessionId,
      senderName: name || 'Web Guest',
      text: message
    });

    return NextResponse.json({
      success: result.success,
      reply: result.replyText,
      stakeholderId: result.stakeholderId,
      action: result.actionTaken
    });
  } catch (error: any) {
    console.error("🚨 Web Concierge API Failure:", error);
    return NextResponse.json({ error: "Failed to process luxury concierge signal", details: error.message }, { status: 500 });
  }
}
