 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }import { NextResponse } from 'next/server';
import { insertRecord } from '@sierra-estates/db';
import { COLLECTIONS } from '@/lib/models/schema';
import { sendTelegramMessage, escapeTelegramHtml } from '@/lib/telegram';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { leadCreateSchema, parseRequestBody, isParseFailure } from '@/lib/server/schemas';
import { logger } from '@/lib/logger';

export async function POST(req) {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const parseResult = await parseRequestBody(req, leadCreateSchema);
    if (isParseFailure(parseResult)) return parseResult.errorResponse;

    const { name, email, phone, message, locale } = parseResult.data;

    // 1. Add to Supabase (public.leads; `name` and the free-text message are
    //    stored as full_name / summary_notes, the table's column names).
    const now = new Date().toISOString();
    const lead = await insertRecord(COLLECTIONS.stakeholders, {
      fullName: name,
      email: email || undefined,
      phone: phone || undefined,
      summaryNotes: message || undefined,
      status: 'new',
      // channel is the normalised intake channel and defaults to 'whatsapp';
      // a web contact form is not that, so it is set explicitly alongside the
      // raw attribution string in `source`.
      channel: 'web',
      mode: 'sale', // default
      source: 'website',
      zone: locale || undefined,
      phase: 'acquisition',
      priority: 'warm',
      via: 'Website',
      interest: 'General Inquiry',
      capitalAllocation: 'To be determined',
      locale: locale || undefined,
      aiProfiling: {
        interests: ['General Inquiry'],
        topMatches: [],
        lastAnalyzedAt: now,
      },
      automation: {
        followupReminderEnabled: true,
        interactionFrequency: 'medium',
      },
      createdAt: now,
      updatedAt: now,
    });

    // 2. Send Telegram Notification
    const text = `
<b>🚀 New Lead - Sierra Estates Realty</b>
<b>Name:</b> ${escapeTelegramHtml(name)}
<b>Email:</b> ${escapeTelegramHtml(email || 'n/a')}
<b>Phone:</b> ${escapeTelegramHtml(phone || 'n/a')}
<b>Interest:</b> General Inquiry
<b>Message:</b> ${escapeTelegramHtml(message || 'n/a')}
<b>Locale:</b> ${escapeTelegramHtml(locale || 'n/a')}
    `.trim();

    await sendTelegramMessage(text);

    // 3. Notify the agency owner via WhatsApp (queued, drained by the existing dispatch cron)
    const notifyNumber = process.env.LEAD_NOTIFY_WHATSAPP_NUMBER;
    if (notifyNumber) {
      try {
        await enqueueWhatsAppJob({
          purpose: 'general-outreach',
          toPhone: notifyNumber,
          body: `New lead from sierra-estates.net\nName: ${name}\nEmail: ${email}\nPhone: ${_nullishCoalesce(phone, () => ( 'n/a'))}\nMessage: ${_nullishCoalesce(message, () => ( 'n/a'))}`,
          leadId: lead.id,
        });
      } catch (error) {
        logger.error('Failed to enqueue lead WhatsApp notification:', error);
      }
    }

    return NextResponse.json({ success: true, id: lead.id });
  } catch (error) {
    logger.error("Lead submission error:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
