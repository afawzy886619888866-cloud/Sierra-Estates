/**
 * /api/admin/viewings/[id]/feedback — Phase 9 POST-VIEWING FEEDBACK.
 *
 * GET   (ADMIN): the feedback row for one viewing (404-shaped null → the
 *                admin UI treats absence as "not yet reported").
 * PUT   (ADMIN): upsert the SALES-side report (unit accuracy, client
 *                reaction, price reaction, objections, interest, next action).
 *                Re-submitting resets the manager review to pending_review.
 *                Also nudges the lead's CRM state (pipeline_stage / hot flag)
 *                per the next-action / interest wiring — the DB trigger from
 *                migration 016 audits the stage change in orchestration_history.
 * PATCH (ADMIN): manager combined-analysis review (approve / needs_changes).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRecord, insertRecord, listRecords, updateRecord, type WhereClause } from '@sierra-estates/db';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import {
  salesReportSchema,
  managerReviewSchema,
  NEXT_ACTION_STAGE_EFFECT,
  INTEREST_HOT_EFFECT,
} from '@/lib/server/viewing-feedback-shared';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Fetch the single feedback row for a viewing (UNIQUE(viewing_id)). */
async function findFeedback(viewingId: string) {
  const rows = await listRecords('viewing_feedback', {
    where: [{ column: 'viewingId', value: viewingId } as WhereClause],
    limit: 1,
  });
  return rows[0] ?? null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  const { id } = await params;
  try {
    const feedback = await findFeedback(id);
    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    logger.error('GET /api/admin/viewings/[id]/feedback failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = salesReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) },
      { status: 400 }
    );
  }

  const { id } = await params;
  const report = parsed.data;
  const now = new Date().toISOString();

  try {
    const viewing = await getRecord('viewings', id);
    if (!viewing) {
      return NextResponse.json({ error: 'Viewing not found' }, { status: 404 });
    }

    const existing = await findFeedback(id);
    let saved;
    if (existing) {
      saved = await updateRecord('viewing_feedback', String(existing.id), {
        unitAccuracy: report.unitAccuracy,
        clientReaction: report.clientReaction,
        priceReaction: report.priceReaction,
        objections: report.objections,
        interestLevel: report.interestLevel,
        nextAction: report.nextAction,
        ...(report.notes !== undefined ? { notes: report.notes } : {}),
        submittedBy: auth.uid ?? 'admin',
        submittedAt: now,
        // A re-submitted report needs a fresh manager look.
        reviewStatus: 'pending_review',
        managerNotes: null,
        reviewedBy: null,
        reviewedAt: null,
        updatedAt: now,
      });
    } else {
      saved = await insertRecord('viewing_feedback', {
        viewingId: id,
        ...(viewing.leadId ? { leadId: String(viewing.leadId) } : {}),
        unitAccuracy: report.unitAccuracy,
        clientReaction: report.clientReaction,
        priceReaction: report.priceReaction,
        objections: report.objections,
        interestLevel: report.interestLevel,
        nextAction: report.nextAction,
        ...(report.notes !== undefined ? { notes: report.notes } : {}),
        submittedBy: auth.uid ?? 'admin',
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    // CRM wiring: reflect what happened on the ground on the lead board.
    // Only unambiguous moves change the stage (see NEXT_ACTION_STAGE_EFFECT).
    if (viewing.leadId) {
      const leadPatch: Record<string, unknown> = { updatedAt: now };
      const stageEffect = NEXT_ACTION_STAGE_EFFECT[report.nextAction];
      if (stageEffect?.pipelineStage) leadPatch.pipelineStage = stageEffect.pipelineStage;
      const hotEffect = INTEREST_HOT_EFFECT[report.interestLevel];
      if (hotEffect?.hot !== undefined) leadPatch.hot = hotEffect.hot;
      if (Object.keys(leadPatch).length > 1) {
        // The migration-016 trigger audits this transition and keeps
        // leads.status derived from pipeline_stage.
        await updateRecord('leads', String(viewing.leadId), leadPatch).catch((err: unknown) => {
          logger.warn(`[viewing-feedback] lead ${String(viewing.leadId)} update failed: ${err instanceof Error ? err.message : String(err)}`);
        });
      }
    }

    await insertRecord('audit_logs', {
      actorUid: auth.uid ?? null,
      action: existing ? 'viewing_feedback.updated' : 'viewing_feedback.submitted',
      target: `viewings:${id}`,
      before: existing ? { interestLevel: existing.interestLevel ?? null, nextAction: existing.nextAction ?? null } : null,
      after: { interestLevel: report.interestLevel, nextAction: report.nextAction },
      createdAt: now,
    }).catch((err: unknown) => {
      logger.warn(`[viewing-feedback] audit_logs write failed: ${err instanceof Error ? err.message : String(err)}`);
    });

    return NextResponse.json({ success: true, feedback: saved });
  } catch (error) {
    logger.error('PUT /api/admin/viewings/[id]/feedback failed:', error);
    return NextResponse.json(
      { error: 'Failed to save feedback', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
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

  const parsed = managerReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) },
      { status: 400 }
    );
  }

  const { id } = await params;
  const { reviewStatus, managerNotes } = parsed.data;
  const now = new Date().toISOString();

  try {
    const existing = await findFeedback(id);
    if (!existing) {
      return NextResponse.json({ error: 'No sales report submitted for this viewing yet' }, { status: 404 });
    }
    if (!existing.submittedAt) {
      return NextResponse.json({ error: 'Cannot review a feedback row with no sales report' }, { status: 422 });
    }

    const updated = await updateRecord('viewing_feedback', String(existing.id), {
      reviewStatus,
      ...(managerNotes !== undefined ? { managerNotes } : {}),
      reviewedBy: auth.uid ?? 'admin',
      reviewedAt: now,
      updatedAt: now,
    });

    await insertRecord('audit_logs', {
      actorUid: auth.uid ?? null,
      action: `viewing_feedback.review_${reviewStatus}`,
      target: `viewings:${id}`,
      before: { reviewStatus: existing.reviewStatus ?? 'pending_review' },
      after: { reviewStatus },
      createdAt: now,
    }).catch((err: unknown) => {
      logger.warn(`[viewing-feedback] audit_logs write failed: ${err instanceof Error ? err.message : String(err)}`);
    });

    return NextResponse.json({ success: true, feedback: updated });
  } catch (error) {
    logger.error('PATCH /api/admin/viewings/[id]/feedback failed:', error);
    return NextResponse.json(
      { error: 'Failed to save review', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
