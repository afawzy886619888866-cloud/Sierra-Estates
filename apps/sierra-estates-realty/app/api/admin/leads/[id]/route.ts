import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { updateRecord, deleteRecord, type RecordData } from '@sierra-estates/db';
import { mapLeadToSpa, mapSpaToLeadPatch } from '@/lib/server/admin-spa-mappers';
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
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const patch = leadPatchToColumns(mapSpaToLeadPatch(body));

    const updated = await updateRecord('leads', id, { ...patch, updatedAt: new Date().toISOString() });
    if (!updated) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

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
