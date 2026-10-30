import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { insertRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GATEWAY_URL = process.env.WHATSAPP_API_URL || 'http://127.0.0.1:2785';

interface RecipientItem {
  phone: string;
  name?: string;
}

/**
 * POST /api/admin/whatsapp/direct-send
 *
 * Dispatches an instant, human-simulated WhatsApp outreach message directly through
 * the active OpenWA multi-session gateway pool (port 2785) with stealth presence simulation
 * (sendSeen, simulateTyping, natural typing delay, and jitter).
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) {
    return unauthorizedResponse('Authorized personnel only');
  }

  try {
    const json = await req.json().catch(() => ({}));
    const { recipients: rawRecipients, body: rawBody, sessionId = 'auto' } = json;

    if (!rawBody || typeof rawBody !== 'string' || !rawBody.trim()) {
      return NextResponse.json({ success: false, error: 'Message body is required' }, { status: 400 });
    }

    if (!rawRecipients || (!Array.isArray(rawRecipients) && typeof rawRecipients !== 'string')) {
      return NextResponse.json({ success: false, error: 'Recipients list is required' }, { status: 400 });
    }

    // Normalize recipients
    const recipients: RecipientItem[] = [];
    if (Array.isArray(rawRecipients)) {
      for (const item of rawRecipients) {
        if (typeof item === 'string' && item.trim()) {
          recipients.push({ phone: item.trim() });
        } else if (item && typeof item === 'object' && item.phone) {
          recipients.push({ phone: String(item.phone).trim(), name: item.name ? String(item.name).trim() : undefined });
        }
      }
    } else if (typeof rawRecipients === 'string') {
      const parts = rawRecipients.split(/[\n,;]+/).map((p) => p.trim()).filter((p) => p.length >= 6);
      for (const p of parts) {
        recipients.push({ phone: p });
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid recipient phone numbers provided' }, { status: 400 });
    }

    // Max batch limit for direct instant dispatch to prevent accidental mass blast
    const MAX_DIRECT_BATCH = 20;
    const batch = recipients.slice(0, MAX_DIRECT_BATCH);

    const results: Array<{
      phone: string;
      ok: boolean;
      messageId?: string;
      session?: string;
      error?: string;
    }> = [];

    for (const recipient of batch) {
      const cleanDigits = recipient.phone.replace(/\D/g, '');
      if (cleanDigits.length < 8) {
        results.push({ phone: recipient.phone, ok: false, error: 'Invalid phone number format' });
        continue;
      }

      // Format E.164 style or Egypt default if missing prefix
      let normalizedDigits = cleanDigits;
      if (normalizedDigits.startsWith('01') && normalizedDigits.length === 11) {
        normalizedDigits = `20${normalizedDigits.slice(1)}`;
      }

      const chatId = `${normalizedDigits}@c.us`;

      // Group safety guardrail
      if (chatId.includes('@g.us') || chatId.startsWith('120363')) {
        results.push({ phone: recipient.phone, ok: false, error: 'Group messaging blocked by safety guard' });
        continue;
      }

      // Personalize message body
      let personalizedText = rawBody;
      if (recipient.name) {
        personalizedText = personalizedText.replace(/\{\{name\}\}/gi, recipient.name);
      }

      // Determine endpoint based on session selection
      const targetEndpoint =
        sessionId && sessionId !== 'auto'
          ? `${GATEWAY_URL}/api/sessions/${sessionId}/messages/send-text`
          : `${GATEWAY_URL}/api/messages/send-text`;

      try {
        const gwRes = await fetch(targetEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId,
            text: personalizedText,
          }),
          signal: AbortSignal.timeout(45000), // Gateway emulates typing so give adequate timeout
        });

        const gwJson = await gwRes.json().catch(() => ({}));

        if (!gwRes.ok || (gwJson && gwJson.ok === false)) {
          results.push({
            phone: recipient.phone,
            ok: false,
            error: gwJson?.error || `Gateway returned HTTP ${gwRes.status}`,
          });
          continue;
        }

        const msgId = gwJson?.data?.messageId || gwJson?.messageId || `msg_${Date.now()}`;
        const usedSession = gwJson?.data?.session || gwJson?.routedSession || sessionId;

        results.push({
          phone: recipient.phone,
          ok: true,
          messageId: msgId,
          session: usedSession,
        });

        // Record activity log in database for full audit observability
        const now = new Date().toISOString();
        await insertRecord('activities', {
          type: 'whatsapp_direct_sent',
          actorId: auth.uid || 'admin',
          actorName: auth.email || 'Admin Workstation',
          description: `Direct WhatsApp message sent to ${recipient.phone} via line ${usedSession}`,
          relatedId: msgId,
          relatedType: 'whatsapp_message',
          metadata: {
            phone: recipient.phone,
            session: usedSession,
            messageId: msgId,
            bodySnippet: personalizedText.slice(0, 100),
          },
          createdAt: now,
        }).catch((e: Error) => logger.warn(`[DIRECT_SEND] Activity log write skipped: ${e.message}`));
      } catch (sendErr: any) {
        results.push({
          phone: recipient.phone,
          ok: false,
          error: sendErr?.message || 'Failed to dispatch via gateway',
        });
      }
    }

    const sentCount = results.filter((r) => r.ok).length;
    const failedCount = results.filter((r) => !r.ok).length;

    return NextResponse.json({
      success: sentCount > 0,
      sentCount,
      failedCount,
      totalRequested: batch.length,
      results,
      message: `Direct dispatch completed: ${sentCount} sent, ${failedCount} failed`,
    });
  } catch (error: any) {
    logger.error('[WHATSAPP_DIRECT_SEND]', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
