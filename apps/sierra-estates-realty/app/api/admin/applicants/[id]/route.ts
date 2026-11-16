/**
 * PATCH /api/admin/applicants/[id] — write side of the Recruitment &
 * Applicant Management console (/admin/applicants).
 *
 *   { status }   — hiring workflow transitions on career_applications.status
 *                  (new → pending_review → reviewed → hired | rejected;
 *                  the CHECK constraint vocabulary is preserved as-is)
 *   { stage }    — Module-3 recruitment pipeline stage (New → Screening →
 *                  Interview → Offer → Hired | Rejected); a DB trigger keeps
 *                  `status` aligned so both funnels never drift.
 *   { scorecardRating } — HR candidate-evaluation scorecard (A+ | A | B | C | D).
 *   { notes }    — reviewer notes on the application record
 *   { cvUrl }    — correct/complete the inspected CV link
 *   { action: 'onboard' } — candidate onboarding: queues the WhatsApp
 *                  onboarding message through the production dispatch queue
 *                  (public.whatsapp_queue, drained by /api/cron/whatsapp-dispatch)
 *                  and flips the applicant to 'hired'.
 *
 * Stage/scorecard updates also sync the `Careers_Applicants` Google Sheets
 * row in place (keyed on the App_YYYYMMDD-XXXXXXXX code derived from the row
 * id) so the Admin console and the sheet never disagree.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRecord, updateRecord, insertRecord } from '@sierra-estates/db';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import {
  SHEET_TABS,
  SHEET_HEADERS,
  updateSheetRowByKey,
} from '@/lib/services/GoogleSheetsV4Service';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z
  .object({
    status: z
      .enum(['new', 'pending_review', 'reviewed', 'hired', 'rejected'])
      .optional(),
    stage: z
      .enum(['New', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'])
      .optional(),
    scorecardRating: z.enum(['A+', 'A', 'B', 'C', 'D']).optional(),
    notes: z.string().trim().max(4000).optional(),
    cvUrl: z.string().trim().max(500).optional(),
    action: z.literal('onboard').optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Empty patch — provide status, stage, scorecardRating, notes, cvUrl or action.',
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

      const updates: Record<string, unknown> = { status: 'hired', stage: 'Hired' };
      if (patch.notes !== undefined) {
        updates.message = patch.notes;
        updates.stageNotes = patch.notes;
      }
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

      // Keep the Careers_Applicants sheet row aligned (Hired).
      void syncApplicantSheetRow(id, existing, { Stage: 'Hired' });

      return NextResponse.json({ success: true, row, onboarded: true });
    }

    const updates: Record<string, unknown> = {};
    if (patch.status !== undefined) updates.status = patch.status;
    if (patch.stage !== undefined) updates.stage = patch.stage;
    if (patch.scorecardRating !== undefined) updates.scorecardRating = patch.scorecardRating;
    if (patch.notes !== undefined) {
      updates.message = patch.notes;
      updates.stageNotes = patch.notes;
    }
    if (patch.cvUrl !== undefined) updates.cvUrl = patch.cvUrl;

    const row = await updateRecord('career_applications', id, updates);

    // Two-way sync: mirror stage/scorecard/notes into the Careers_Applicants
    // sheet row (best-effort; failure is logged, never blocks the DB write).
    if (patch.stage || patch.scorecardRating || patch.notes) {
      const sheetOk = await syncApplicantSheetRow(id, existing, {
        ...(patch.stage ? { Stage: patch.stage } : {}),
        ...(patch.scorecardRating ? { Scorecard_Rating: patch.scorecardRating } : {}),
        ...(patch.notes ? { Notes: patch.notes.slice(0, 1000) } : {}),
      });
      if (!sheetOk) {
        logger.warn(`[ADMIN_APPLICANTS_PATCH] Careers_Applicants sheet sync skipped for ${id}`);
      }
    }

    return NextResponse.json({ success: true, row });
  } catch (error) {
    logger.error('[ADMIN_APPLICANTS_PATCH_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to update applicant.' },
      { status: 500 },
    );
  }
}

/**
 * The sheet row is keyed by the App_ID minted at application time
 * (APP-YYYYMMDD-XXXXXXXX, derived from the row id — see the action/route
 * that created it). Re-derive it deterministically for the update, using
 * the row's own createdAt when present.
 */
async function syncApplicantSheetRow(
  applicantId: string,
  existing: Record<string, unknown>,
  updates: Record<string, string>,
): Promise<boolean> {
  try {
    const createdAt = String(existing.createdAt ?? existing.created_at ?? '');
    const datePart = (createdAt || new Date().toISOString()).slice(0, 10).replace(/-/g, '');
    const appCode = `APP-${datePart}-${applicantId.slice(0, 8).toUpperCase()}`;
    const result = await updateSheetRowByKey({
      tab: SHEET_TABS.careersApplicants,
      headers: SHEET_HEADERS.careersApplicants,
      keyColumn: 'App_ID',
      keyValue: appCode,
      updates,
    });
    return result.ok;
  } catch (err) {
    logger.warn(
      `[ADMIN_APPLICANTS_PATCH] sheet sync error: ${err instanceof Error ? err.message : err}`,
    );
    return false;
  }
}
