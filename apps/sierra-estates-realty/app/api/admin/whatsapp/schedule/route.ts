import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS, type WhatsAppMessagePurpose } from '@/lib/models/schema';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { logger } from '@/lib/logger';
import { verifyRequest } from '@/lib/server/auth-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const scheduleMessageSchema = z.object({
  recipients: z.array(
    z.object({
      phone: z.string().min(6, 'Valid phone number required'),
      name: z.string().optional(),
      leadId: z.string().optional(),
      unitId: z.string().optional(),
      ownerNegotiationId: z.string().optional(),
    })
  ).min(1, 'At least one recipient is required'),
  body: z.string().min(1, 'Message body is required').max(4000),
  scheduledFor: z.string().datetime({ offset: true }).or(z.string().datetime()).optional().nullable(),
  purpose: z.enum([
    'lead-qualification',
    'viewing-confirmation',
    'property-recommendation',
    'owner-negotiation',
    'closer-handshake',
    'campaign-broadcast',
    'custom-outreach',
  ] as const).default('custom-outreach'),
  templateName: z.string().optional(),
  templateParams: z.record(z.string(), z.string()).optional(),
  campaignName: z.string().max(100).optional(),
});

/**
 * POST /api/admin/whatsapp/schedule
 * Enqueues single or bulk WhatsApp outreach messages with optional future scheduling date.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyRequest(req);
    // Allow service/internal or authenticated admin requests
    if (!auth.authenticated && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = scheduleMessageSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { recipients, body: msgBody, scheduledFor, purpose, templateName, templateParams, campaignName } = parseResult.data;

    let targetDate: Date | null = null;
    if (scheduledFor) {
      targetDate = new Date(scheduledFor);
      if (isNaN(targetDate.getTime())) {
        return NextResponse.json({ success: false, error: 'Invalid scheduledFor date format' }, { status: 400 });
      }
    }

    const jobIds: string[] = [];
    for (const recipient of recipients) {
      // Personalize message body if recipient name is provided and placeholder exists
      let personalizedBody = msgBody;
      if (recipient.name) {
        personalizedBody = personalizedBody.replace(/\{\{name\}\}/gi, recipient.name);
      }

      const jobId = await enqueueWhatsAppJob({
        purpose: purpose as WhatsAppMessagePurpose,
        toPhone: recipient.phone,
        body: personalizedBody,
        leadId: recipient.leadId,
        unitId: recipient.unitId,
        ownerNegotiationId: recipient.ownerNegotiationId,
        templateName,
        templateParams: {
          ...templateParams,
          ...(campaignName ? { campaignName } : {}),
        },
        scheduledFor: targetDate,
      });

      jobIds.push(jobId);
    }

    logger.info(`[WHATSAPP_SCHEDULE] Queued ${jobIds.length} messages. Scheduled for: ${targetDate ? targetDate.toISOString() : 'Immediate dispatch'}`);

    return NextResponse.json({
      success: true,
      count: jobIds.length,
      jobIds,
      scheduledFor: targetDate ? targetDate.toISOString() : null,
      message: targetDate
        ? `Successfully scheduled ${jobIds.length} WhatsApp message(s) for ${targetDate.toLocaleString()}`
        : `Successfully queued ${jobIds.length} WhatsApp message(s) for immediate dispatch`,
    });
  } catch (error: any) {
    logger.error('[WHATSAPP_SCHEDULE] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to schedule WhatsApp messages' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/whatsapp/schedule
 * Lists scheduled and recent WhatsApp queue jobs.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100);
    const status = searchParams.get('status') || 'queued';

    const snap = await adminDb
      .collection(COLLECTIONS.whatsappMessageQueue)
      .where('status', '==', status)
      .limit(limit)
      .get();

    const jobs = snap.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        toPhone: data.toPhone,
        purpose: data.purpose,
        body: data.body,
        status: data.status,
        scheduledFor: data.scheduledFor ? data.scheduledFor.toDate().toISOString() : null,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        sentAt: data.sentAt ? data.sentAt.toDate().toISOString() : null,
        attempts: data.attempts || 0,
        errorMessage: data.errorMessage,
      };
    });

    return NextResponse.json({
      success: true,
      status,
      count: jobs.length,
      jobs,
    });
  } catch (error: any) {
    logger.error('[WHATSAPP_SCHEDULE_GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch scheduled WhatsApp messages' },
      { status: 500 }
    );
  }
}
