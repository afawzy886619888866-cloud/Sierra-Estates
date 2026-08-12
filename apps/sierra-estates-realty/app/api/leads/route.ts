import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/models/schema';
import { sendTelegramMessage } from '@/lib/telegram';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';

import { z } from 'zod';
import { logger } from '@/lib/logger';
const leadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional(),
  message: z.string().optional(),
  locale: z.string().optional()
});

export async function POST(req: Request) {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const data = await req.json();
    const parseResult = leadSchema.safeParse(data);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 }
      );
    }
    
    const { name, email, phone, message, locale } = parseResult.data;

    // 1. Add to Firestore
    const leadRef = await adminDb.collection(COLLECTIONS.stakeholders).add({
      name,
      email: email || undefined,
      phone: phone || undefined,
      notes: message || undefined,
      status: 'new',
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
        lastAnalyzedAt: Timestamp.now(),
      },
      automation: {
        followupReminderEnabled: true,
        interactionFrequency: 'medium',
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    // 2. Send Telegram Notification
    const text = `
<b>🚀 New Lead - Sierra Estates Realty</b>
<b>Name:</b> ${name}
<b>Email:</b> ${email || 'n/a'}
<b>Phone:</b> ${phone || 'n/a'}
<b>Interest:</b> General Inquiry
<b>Message:</b> ${message || 'n/a'}
<b>Locale:</b> ${locale || 'n/a'}
    `.trim();

    await sendTelegramMessage(text);

    // 3. Notify the agency owner via WhatsApp (queued, drained by the existing dispatch cron)
    const notifyNumber = process.env.LEAD_NOTIFY_WHATSAPP_NUMBER;
    if (notifyNumber) {
      try {
        await enqueueWhatsAppJob({
          purpose: 'general-outreach',
          toPhone: notifyNumber,
          body: `New lead from sierra-estates.net\nName: ${name}\nEmail: ${email}\nPhone: ${phone ?? 'n/a'}\nMessage: ${message ?? 'n/a'}`,
          leadId: leadRef.id,
        });
      } catch (error) {
        logger.error('Failed to enqueue lead WhatsApp notification:', error);
      }
    }

    return NextResponse.json({ success: true, id: leadRef.id });
  } catch (error) {
    logger.error("Lead submission error:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
