import { NextRequest, NextResponse } from 'next/server';
<<<<<<< HEAD
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { updateRecord, deleteRecord, type RecordData } from '@sierra-estates/db';
import { mapLeadToSpa, mapSpaToLeadPatch } from '@/lib/server/admin-spa-mappers';
=======
import { verifyAdminRequest, verifyPortalRequest } from '@/lib/server/auth-guard';
import { getRecord, insertRecord, updateRecord, deleteRecord, type RecordData } from '@sierra-estates/db';
import { mapLeadToSpa, mapSpaToLeadPatch } from '@/lib/server/admin-spa-mappers';
import { leadInScope } from '@/lib/server/partner-scope';
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
import { logger } from '@/lib/logger';

// Force dynamic rendering — uses Supabase/auth at runtime
export const dynamic = 'force-dynamic';

/** See app/api/admin/leads/route.ts — the SPA mappers still speak the old Firestore field names. */
function rowToLeadDoc(row: RecordData): Record<string, unknown> {
  const { fullName, summaryNotes, assignedAgentId, pipelineStage, ...rest } = row as Record<string, unknown>;
  return { ...rest, name: fullName, notes: summaryNotes, assignedTo: assignedAgentId, stage: pipelineStage };
}

function leadPatchToColumns(patch: Record<string, unknown>): RecordData {
  const { name, notes, assignedTo, stage, ...rest } = patch;
  const out: RecordData = { ...rest };
  if (name !== undefined) out.fullName = name;
  if (notes !== undefined) out.summaryNotes = notes;
  if (assignedTo !== undefined) out.assignedAgentId = assignedTo;
  if (stage !== undefined) out.pipelineStage = stage;
  return out;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // The CRM board is interactive for partners too (stage advance / hot flag)
  // — but a partner may only touch leads inside their own portfolio.
  const auth = await verifyPortalRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const patch = leadPatchToColumns(mapSpaToLeadPatch(body));

<<<<<<< HEAD
=======
    // Phase 10 transition audit: capture the stage BEFORE the write so the
    // actor-context record (audit_logs) complements the DB trigger that logs
    // into orchestration_history.
    const previous = await getRecord('leads', id).catch(() => null);

    if (auth.access === 'partner') {
      // A lead the partner cannot even see may not be mutated.
      if (!previous) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }
      if (!leadInScope(previous, auth.scope)) {
        return NextResponse.json(
          { error: 'Forbidden — lead outside partner portfolio' },
          { status: 403 }
        );
      }
      // Partners advance stages / toggle hot on their own board only.
      const allowedKeys = ['pipelineStage', 'hot', 'updatedAt'];
      const attempted = Object.keys(patch).filter((k) => !allowedKeys.includes(k));
      if (attempted.length > 0) {
        return NextResponse.json(
          { error: `Partners may only update stage/hot — rejected: ${attempted.join(', ')}` },
          { status: 403 }
        );
      }
    }

>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
    const updated = await updateRecord('leads', id, { ...patch, updatedAt: new Date().toISOString() });
    if (!updated) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

<<<<<<< HEAD
=======
    if (patch.pipelineStage !== undefined && previous && previous.pipelineStage !== undefined
        && String(previous.pipelineStage) !== String(patch.pipelineStage)) {
      await insertRecord('audit_logs', {
        actorUid: auth.uid ?? null,
        action: 'lead.stage_change',
        target: `leads:${id}`,
        before: { stage: previous.pipelineStage },
        after: { stage: patch.pipelineStage },
        createdAt: new Date().toISOString(),
      }).catch((err: unknown) => {
        logger.warn(`[admin/leads] audit_logs write failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    }

>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
    return NextResponse.json({ success: true, lead: mapLeadToSpa(id, rowToLeadDoc(updated)) });
  } catch (err) {
    logger.error('Error updating lead:', err);
    return NextResponse.json(
      { error: 'Failed to update lead', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    await deleteRecord('leads', id);
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Error deleting lead:', err);
    return NextResponse.json(
      { error: 'Failed to delete lead', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
