import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { updateRecord, deleteRecord, type RecordData } from '@sierra-estates/db';
import { mapSpaToLeadPatch } from '@/lib/server/admin-spa-mappers';
import { logger } from '@/lib/logger';

// Force dynamic rendering — uses Supabase/auth at runtime
export const dynamic = 'force-dynamic';

/** See app/api/admin/leads/route.ts — the SPA mappers still speak the old Firestore field names. */
function leadPatchToColumns(patch: Record<string, unknown>): RecordData {
  const { name, notes, assignedTo, stage, ...rest } = patch;
  const out: RecordData = { ...rest };
  if (name !== undefined) out.fullName = name;
  if (notes !== undefined) out.summaryNotes = notes;
  if (assignedTo !== undefined) out.assignedAgentId = assignedTo;
  if (stage !== undefined) out.pipelineStage = stage;
  return out;
}

/**
 * Mirrors the SPA's multi-select actions in LeadsPage.
 *
 * NOTE: this was a Firestore `writeBatch`, which committed all ids atomically.
 * PostgREST has no batch-update-by-differing-id primitive, so the rows are now
 * written one at a time: a failure part-way through leaves the earlier ids
 * already applied. The response still reports the requested count, and the
 * error path is unchanged (a throw becomes the same 500 as before).
 */
export async function POST(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { ids, action, patch } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
    }

    if (action === 'delete') {
      for (const id of ids as string[]) {
        await deleteRecord('leads', id);
      }
    } else if (action === 'update') {
      const mapped = leadPatchToColumns(mapSpaToLeadPatch(patch || {}));
      for (const id of ids as string[]) {
        await updateRecord('leads', id, { ...mapped, updatedAt: new Date().toISOString() });
      }
    } else {
      return NextResponse.json({ error: 'action must be "delete" or "update"' }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: ids.length });
  } catch (err) {
    logger.error('Error in bulk lead operation:', err);
    return NextResponse.json(
      { error: 'Failed bulk operation', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
