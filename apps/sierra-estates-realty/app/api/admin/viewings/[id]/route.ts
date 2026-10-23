/**
 * /api/admin/viewings/[id] — Phase 9 viewing lifecycle operations.
 *
 * PATCH (ADMIN): legal status transitions only (viewing-feedback-shared):
 *   pending_approval → scheduled | cancelled
 *   scheduled        → completed | cancelled | no_show
 *
 * Scheduling accepts { status: 'scheduled', scheduledAt, location?, notes? }.
 * Completing a viewing:
 *   1. mints the client's survey capability token (48 hex chars) on the row;
 *   2. enqueues a REAL WhatsApp message with the survey link through the
 *      standard outbound queue (enqueueWhatsAppJob — dispatch needs WhatsApp
 *      creds; the queue row itself is real and observable either way);
 *   3. writes an audit_logs entry with the acting admin as actor.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { getRecord, updateRecord, insertRecord } from '@sierra-estates/db';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { isViewingTransitionAllowed, mintSurveyToken, VIEWING_STATUSES, type ViewingStatus } from '@/lib/server/viewing-feedback-shared';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  status: z.enum(VIEWING_STATUSES),
  scheduledAt: z.string().datetime().optional(),
  location: z.string().max(300).optional(),
  notes: z.string().max(4000).optional(),
});

function baseUrlFromEnv(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://sierra-estates.net'
  );
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) },
      { status: 400 }
    );
  }

  const { id } = await params;
  const { status, scheduledAt, location, notes } = parsed.data;

  try {
    const viewing = await getRecord('viewings', id);
    if (!viewing) {
      return NextResponse.json({ error: 'Viewing not found' }, { status: 404 });
    }

    const from = String(viewing.status ?? 'pending_approval');
    if (from === status) {
      return NextResponse.json({ error: `Viewing is already ${status}` }, { status: 409 });
    }
    if (!isViewingTransitionAllowed(from, status)) {
      return NextResponse.json(
        { error: `Illegal transition ${from} → ${status}. Terminal statuses cannot be reopened (edit notes instead).` },
        { status: 422 }
      );
    }
    if (status === 'scheduled' && !scheduledAt && !viewing.scheduledAt) {
      return NextResponse.json({ error: 'scheduledAt is required to confirm a viewing slot' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status, updatedAt: now };
    if (scheduledAt) patch.scheduledAt = scheduledAt;
    if (location !== undefined) patch.location = location;
    if (notes !== undefined) patch.notes = notes;

    // Completing the viewing mints the client survey capability token.
    if (status === 'completed') {
      const token = mintSurveyToken(crypto.randomBytes(24));
      patch.surveyToken = token;
      patch.surveySentAt = now;
    }

    const updated = await updateRecord('viewings', id, patch);

    // Audit every lifecycle change (Phase 9/10 transition audit trail).
    await insertRecord('audit_logs', {
      actorUid: auth.uid ?? null,
      action: 'viewing.status_transition',
      target: `viewings:${id}`,
      before: { status: from },
      after: { status },
      createdAt: now,
    }).catch((err: unknown) => {
      logger.warn(`[admin/viewings] audit_logs write failed: ${err instanceof Error ? err.message : String(err)}`);
    });

    // Queue the survey WhatsApp to the visitor (real queue row; delivery
    // depends on the WhatsApp dispatch worker having credentials).
    let surveyQueued = false;
    let surveyLink: string | null = null;
    if (status === 'completed' && typeof patch.surveyToken === 'string' && typeof viewing.visitorPhone === 'string' && viewing.visitorPhone) {
      surveyLink = `${baseUrlFromEnv()}/viewing-feedback?token=${patch.surveyToken}`;
      const property = (viewing.propertyCode as string) || (viewing.unitId as string) || 'the unit';
      try {
        await enqueueWhatsAppJob({
          purpose: 'viewing-followup',
          toPhone: viewing.visitorPhone,
          ...(viewing.visitorName ? { toName: String(viewing.visitorName) } : {}),
          body:
            `Thank you for viewing ${property} with Sierra Estates today. ` +
            `How did it go? Share your feedback (30 seconds): ${surveyLink}`,
          ...(viewing.leadId ? { leadId: String(viewing.leadId) } : {}),
          metadata: { kind: 'viewing-survey', viewingId: id },
        });
        surveyQueued = true;
      } catch (err) {
        logger.warn('[admin/viewings] survey WhatsApp enqueue failed (viewing still completed):', err);
      }
    }

    return NextResponse.json({
      success: true,
      viewing: updated,
      ...(status === 'completed' ? { surveyQueued, surveyLink } : {}),
    });
  } catch (error) {
    logger.error('PATCH /api/admin/viewings/[id] failed:', error);
    return NextResponse.json(
      { error: 'Failed to update viewing', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const { id } = await params;
    const viewing = await getRecord('viewings', id);
    if (!viewing) {
      return NextResponse.json({ error: 'Viewing not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, viewing });
  } catch (error) {
    logger.error('GET /api/admin/viewings/[id] failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch viewing', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Re-export for tests / consumers that want the enum without another import.
export type { ViewingStatus };
