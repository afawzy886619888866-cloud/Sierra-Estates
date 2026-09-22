import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { OmnichannelChatService } from '@/lib/services/OmnichannelChatService';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { parseRequestBody } from '@/lib/server/schemas';

/**
 * SIERRA ESTATES WEB CONCIERGE CHAT API
 * Serves as the dynamic gateway between the web-based LeilaConcierge widget and OmnichannelChatService.
 *
 * Deliberately public — this is the site chat widget — but rate limited and
 * strictly validated so it cannot be used as an unbounded LLM / Supabase
 * write amplifier.
 */
const chatRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(2000),
  name: z.string().max(120).optional(),
});

export async function POST(req: NextRequest) {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = await parseRequestBody(req, chatRequestSchema);
  if (!parsed.success) return parsed.errorResponse;
  const { sessionId, message, name } = parsed.data;

  try {
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
