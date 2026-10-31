/**
 * PATCH /api/admin/applicants/[id] — write side of the Recruitment &
 * Applicant Management console (/admin/applicants).
 *
 *   { status }   — hiring workflow transitions on career_applications.status
 *                  (new → pending_review → reviewed → hired | rejected;
 *                  the CHECK constraint vocabulary is preserved as-is)
 *   { notes }    — reviewer notes on the application record
 *   { cvUrl }    — correct/complete the inspected CV link
 *   { action: 'onboard' } — candidate onboarding: queues the WhatsApp
 *                  onboarding message through the production dispatch queue
 *                  (public.whatsapp_queue, drained by /api/cron/whatsapp-dispatch)
 *                  and flips the applicant to 'hired'.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRecord, updateRecord, insertRecord } from '@sierra-estates/db';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z
  .object({
    status: z
      .enum(['new', 'pending_review', 'reviewed', 'hired', 'rejected'])
      .optional(),
    notes: z.string().trim().max(4000).optional(),
    cvUrl: z.string().trim().max(500).optional(),
    action: z.literal('onboard').optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Empty patch — provide status, notes, cvUrl or action.',
  });

function onboardingMessage(name: string, position: string): string {
  const first = name.split(' ')[0] || 'there';
  return [
    `Welcome to Sierra Estates, ${first}! 🏛️`,
    '',
    `Your application for ${position} has been accepted.`,
    'Onboarding steps:',
    '1. Our HR desk will call you within 24 hours to confirm your start date.',
    '2. Please have your ID, diploma and any brokerage licence ready.',
    '3. Day one starts with the Sierra Intelligence OS walkthrough.',
    '',
    'We are glad to have you on the team.',
    '— Sierra Estates Careers',
  ].join('\n');
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  const { id } = await params;

  try {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid applicant patch.' },
        { status: 400 },
      );
    }
    const patch = parsed.data;

    // The view is read-only; all writes target the base table.
    const existing = await getRecord<Record<string, unknown>>(
      'career_applications',
      id,
    );
    if (!existing) {
      return NextResponse.json({ error: 'Applicant not found.' }, { status: 404 });
    }

    if (patch.action === 'onboard') {
      const phone = String(existing.phone ?? '').trim();
      const name = String(existing.name ?? 'Candidate');
      const position = String(existing.position ?? 'the team');
      if (!phone) {
        return NextResponse.json(
          { error: 'Applicant has no phone number — onboarding message cannot be queued.' },
          { status: 422 },
        );
      }

      const updates: Record<string, unknown> = { status: 'hired' };
      if (patch.notes !== undefined) updates.message = patch.notes;
      if (patch.cvUrl !== undefined) updates.cvUrl = patch.cvUrl;
      const row = await updateRecord('career_applications', id, updates);

      await enqueueWhatsAppJob({
        purpose: 'general-outreach',
        toPhone: phone,
        toName: name,
        body: onboardingMessage(name, position),
        metadata: { flow: 'applicant-onboarding', applicantId: id, position },
      }).catch((err) => {
        logger.warn('[APPLICANT_ONBOARD_QUEUE_FAILED]', err);
        throw err;
      });

      try {
        await insertRecord('activities', {
          type: 'applicant_onboarded',
          actorId: 'system',
          actorName: 'Command Center',
          description: `${name} onboarded for ${position} — WhatsApp onboarding queued`,
          relatedId: id,
          relatedType: 'applicant',
          text: `${name} onboarded · ${position}`,
          color: 'var(--emerald)',
        });
      } catch {
        // Activity feed is best-effort.
      }

      return NextResponse.json({ success: true, row, onboarded: true });
    }

    const updates: Record<string, unknown> = {};
    if (patch.status !== undefined) updates.status = patch.status;
    if (patch.notes !== undefined) updates.message = patch.notes;
    if (patch.cvUrl !== undefined) updates.cvUrl = patch.cvUrl;

    const row = await updateRecord('career_applications', id, updates);
    return NextResponse.json({ success: true, row });
  } catch (error) {
    logger.error('[ADMIN_APPLICANTS_PATCH_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to update applicant.' },
      { status: 500 },
    );
  }
}
