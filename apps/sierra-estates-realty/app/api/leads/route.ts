import { NextResponse } from 'next/server';
import { insertRecord } from '@sierra-estates/db';
import { COLLECTIONS } from '@/lib/models/schema';
import { sendTelegramMessage, escapeTelegramHtml } from '@/lib/telegram';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { leadCreateSchema, parseRequestBody, isParseFailure } from '@/lib/server/schemas';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const parseResult = await parseRequestBody(req, leadCreateSchema);
    if (isParseFailure(parseResult)) return parseResult.errorResponse;

    const { name, email, phone, message, locale, zone, type, budget, intent, source } = parseResult.data;

    // Construct structured summary notes
    const formattedNotes = [
      intent ? `[Intent: ${intent.toUpperCase()}]` : null,
      zone ? `[Preferred Zone: ${zone}]` : null,
      type ? `[Property Type: ${type}]` : null,
      budget ? `[Budget: ${budget} EGP]` : null,
      message ? `Message: ${message}` : null,
    ].filter(Boolean).join(' | ');

    // 1. Add to Supabase (public.leads; `name` and the free-text message are
    //    stored as full_name / summary_notes, the table's column names).
    const now = new Date().toISOString();
    const lead = await insertRecord<{ id: string }>(COLLECTIONS.stakeholders, {
      fullName: name,
      email: email || undefined,
      phone: phone || undefined,
      summaryNotes: formattedNotes || undefined,
      status: 'new',
      // channel is the normalized intake channel and defaults to 'whatsapp';
      // a web contact form is not that, so it is set explicitly alongside the
      // raw attribution string in `source`.
      channel: 'web',
      mode: intent === 'rent' ? 'rent' : 'sale',
      source: source || 'website',
      zone: zone || locale || undefined,
      phase: 'acquisition',
      priority: 'warm',
      via: 'Website',
      interest: type || 'General Inquiry',
      capitalAllocation: budget || 'To be determined',
      locale: locale || undefined,
      aiProfiling: {
        interests: [type || 'General Inquiry'],
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
<b>🚀 New Inquiry - Sierra Estates Concierge</b>
<b>Name:</b> ${escapeTelegramHtml(name)}
<b>Phone:</b> ${escapeTelegramHtml(phone || 'n/a')}
<b>Email:</b> ${escapeTelegramHtml(email || 'n/a')}
<b>Intent:</b> ${escapeTelegramHtml((intent || 'Inquiry').toUpperCase())}
<b>Zone:</b> ${escapeTelegramHtml(zone || 'Any')}
<b>Type:</b> ${escapeTelegramHtml(type || 'Any')}
<b>Budget:</b> ${escapeTelegramHtml(budget ? `${budget} EGP` : 'Not specified')}
<b>Message:</b> ${escapeTelegramHtml(message || 'n/a')}
    `.trim();

    await sendTelegramMessage(text);

    // 3. Notify the agency owner via WhatsApp (queued, drained by the existing dispatch cron)
    const notifyNumber = process.env.LEAD_NOTIFY_WHATSAPP_NUMBER;
    if (notifyNumber) {
      try {
        await enqueueWhatsAppJob({
          purpose: 'general-outreach',
          toPhone: notifyNumber,
          body: `🚀 New Lead from sierra-estates.net\n👤 Name: ${name}\n📱 Phone: ${phone ?? 'n/a'}\n📧 Email: ${email ?? 'n/a'}\n🎯 Intent: ${(intent || 'Inquiry').toUpperCase()}\n📍 Zone: ${zone || 'Any'}\n🏠 Type: ${type || 'Any'}\n💰 Budget: ${budget ? `${budget} EGP` : 'Not specified'}\n📝 Message: ${message ?? 'n/a'}`,
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
