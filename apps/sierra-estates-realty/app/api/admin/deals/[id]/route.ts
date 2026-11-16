/**
 * PATCH /api/admin/deals/[id] — kanban card moves.
 *
 * The stage move is the primary action (drag & drop / prev / next on the
 * board). The endpoint validates the stage against the public.deals CHECK
 * constraint, re-derives commission_amount when the value changes, and
 * writes an audit_logs entry on every stage transition (same convention as
 * the CRM lead stage change in /api/admin/leads/[id]).
 *
 * Partner accounts may move stages on their own portfolio's deals only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyPortalRequest } from '@/lib/server/auth-guard';
import { getRecord, updateRecord, insertRecord, type RecordData } from '@sierra-estates/db';
import { leadInScope, listingInScope } from '@/lib/server/partner-scope';
import { logger } from '@/lib/logger';
import { DEAL_STAGES } from '@/lib/server/deal-stages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const dealPatchSchema = z
  .object({
    stage: z.enum(DEAL_STAGES).optional(),
    dealValue: z.number().min(0).max(10_000_000_000).optional(),
    commissionPercentage: z.number().min(0).max(100).optional(),
    closingProbability: z.number().int().min(0).max(100).optional(),
    targetClosingDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
      .optional()
      .nullable(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyPortalRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const parsed = dealPatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid deal patch', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const patch = parsed.data;

    const previous = await getRecord<RecordData>('deals', id);
    if (!previous) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    if (auth.access === 'partner') {
      // The deal must fall inside the partner's portfolio (its client lead or
      // its unit listing), and partners may only move stages — not reprice.
      const lead = previous.leadId ? await getRecord('leads', String(previous.leadId)).catch(() => null) : null;
      const listing = previous.listingId ? await getRecord('listings', String(previous.listingId)).catch(() => null) : null;
      const inScope = leadInScope(lead, auth.scope) || listingInScope(listing, auth.scope);
      if (!inScope) {
        return NextResponse.json(
          { error: 'Forbidden — deal outside partner portfolio' },
          { status: 403 }
        );
      }
      const attempted = Object.keys(patch).filter((k) => k !== 'stage');
      if (attempted.length > 0) {
        return NextResponse.json(
          { error: `Partners may only move stages — rejected: ${attempted.join(', ')}` },
          { status: 403 }
        );
      }
    }

    // Re-derive commission_amount whenever value or percentage changes so the
    // two columns can never disagree.
    const prevValue = typeof previous.dealValue === 'string' ? parseFloat(previous.dealValue) : Number(previous.dealValue ?? 0);
    const prevPct = typeof previous.commissionPercentage === 'string'
      ? parseFloat(previous.commissionPercentage)
      : Number(previous.commissionPercentage ?? 2.5);
    const nextValue = patch.dealValue ?? (Number.isFinite(prevValue) ? prevValue : 0);
    const nextPct = patch.commissionPercentage ?? (Number.isFinite(prevPct) ? prevPct : 2.5);

    const update: RecordData = { updatedAt: new Date().toISOString() };
    if (patch.stage !== undefined) update.stage = patch.stage;
    if (patch.dealValue !== undefined) update.dealValue = patch.dealValue;
    if (patch.commissionPercentage !== undefined) update.commissionPercentage = patch.commissionPercentage;
    if (patch.dealValue !== undefined || patch.commissionPercentage !== undefined) {
      update.commissionAmount = Math.round(nextValue * (nextPct / 100) * 100) / 100;
    }
    if (patch.closingProbability !== undefined) update.closingProbability = patch.closingProbability;
    if (patch.targetClosingDate !== undefined) update.targetClosingDate = patch.targetClosingDate || undefined;
    if (patch.notes !== undefined) update.notes = patch.notes;

    const updated = await updateRecord<RecordData>('deals', id, update);
    if (!updated) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    if (patch.stage !== undefined && String(previous.stage ?? '') !== String(patch.stage)) {
      await insertRecord('audit_logs', {
        actorUid: auth.uid ?? null,
        action: 'deal.stage_change',
        target: `deals:${id}`,
        before: { stage: previous.stage ?? null },
        after: { stage: patch.stage },
        createdAt: new Date().toISOString(),
      }).catch((err: unknown) => {
        logger.warn(
          `[admin/deals] audit_logs write failed: ${err instanceof Error ? err.message : String(err)}`
        );
      });
    }

    return NextResponse.json({ success: true, deal: updated });
  } catch (err) {
    logger.error('Error updating deal:', err);
    return NextResponse.json(
      { error: 'Failed to update deal', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
