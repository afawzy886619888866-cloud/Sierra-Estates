 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listRecords } from '@sierra-estates/db';
import { COLLECTIONS, } from '@/lib/models/schema';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { logger } from '@/lib/logger';
import { verifyAdminRequest } from '@/lib/server/auth-guard';

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
  ] ).default('custom-outreach'),
  templateName: z.string().optional(),
  templateParams: z.record(z.string(), z.string()).optional(),
  campaignName: z.string().max(100).optional(),
});

/**
 * POST /api/admin/whatsapp/schedule
 * Enqueues single or bulk WhatsApp outreach messages with optional future scheduling date.
 */
export async function POST(req) {
  try {
    // Was `verifyRequest` gated on NODE_ENV === 'production'. Two problems:
    // verifyRequest accepts ANY valid Firebase ID token in the project with no
    // users/{uid}.role check, so any self-registered account could enqueue bulk
    // outreach from the company number; and the guard was skipped entirely on
    // preview deployments. The sibling app/api/admin/whatsapp/send/route.ts was
    // hardened to verifyAdminRequest for exactly this reason — match it.
    const auth = await verifyAdminRequest(req);
    if (!auth.authenticated) {
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

    let targetDate = null;
    if (scheduledFor) {
      targetDate = new Date(scheduledFor);
      if (isNaN(targetDate.getTime())) {
        return NextResponse.json({ success: false, error: 'Invalid scheduledFor date format' }, { status: 400 });
      }
    }

    const jobIds = [];
    for (const recipient of recipients) {
      // Personalize message body if recipient name is provided and placeholder exists
      let personalizedBody = msgBody;
      if (recipient.name) {
        personalizedBody = personalizedBody.replace(/\{\{name\}\}/gi, recipient.name);
      }

      const jobId = await enqueueWhatsAppJob({
        purpose: purpose ,
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
  } catch (error) {
    logger.error('[WHATSAPP_SCHEDULE] Error:', error);
    return NextResponse.json(
      { success: false, error: _optionalChain([error, 'optionalAccess', _ => _.message]) || 'Failed to schedule WhatsApp messages' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/whatsapp/schedule
 * Lists scheduled and recent WhatsApp queue jobs.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100);
    const status = searchParams.get('status') || 'queued';

    const rows = await listRecords










(COLLECTIONS.whatsappMessageQueue, {
      where: [{ column: 'status', value: status }],
      limit,
    });

    // The timestamp columns come back as ISO strings already, so the Firestore
    // .toDate().toISOString() hops are gone; the response shape is unchanged.
    const jobs = rows.map((data) => ({
      id: data.id,
      toPhone: data.toPhone,
      purpose: data.purpose,
      body: data.body,
      status: data.status,
      scheduledFor: _nullishCoalesce(data.scheduledFor, () => ( null)),
      createdAt: _nullishCoalesce(data.createdAt, () => ( null)),
      sentAt: _nullishCoalesce(data.sentAt, () => ( null)),
      attempts: data.attempts || 0,
      errorMessage: data.errorMessage,
    }));

    return NextResponse.json({
      success: true,
      status,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    logger.error('[WHATSAPP_SCHEDULE_GET] Error:', error);
    return NextResponse.json(
      { success: false, error: _optionalChain([error, 'optionalAccess', _2 => _2.message]) || 'Failed to fetch scheduled WhatsApp messages' },
      { status: 500 }
    );
  }
}
