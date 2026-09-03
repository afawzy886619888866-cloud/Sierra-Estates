import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { listRecords, insertRecord, type RecordData } from '@sierra-estates/db';
import { mapLeadToSpa, mapSpaToLeadPatch } from '@/lib/server/admin-spa-mappers';
import { logger } from '@/lib/logger';

// Validates the SPA lead shape; passthrough keeps any extra fields the mapper reads.
const leadCreateSchema = z
  .object({
    name: z.string().min(1).max(200),
    phone: z.string().min(1).max(50),
    interest: z.string().max(1000).optional(),
    stage: z.string().max(100).optional(),
    hot: z.boolean().optional(),
    color: z.string().max(32).optional(),
    budget: z.number().optional(),
    ownerId: z.string().max(128).optional(),
  })
  .passthrough();

/**
 * A `public.leads` row → the document shape the SPA mappers were written
 * against (they still speak the Firestore field names). Three columns were
 * renamed in the Supabase schema and one had to be renamed to avoid a clash:
 *
 *   full_name       → name
 *   summary_notes   → notes
 *   assigned_agent_id → assignedTo
 *   pipeline_stage  → stage   (leads.stage is the public intake routes'
 *                              numeric funnel position, a different field)
 */
function rowToLeadDoc(row: RecordData): Record<string, unknown> {
  const { fullName, summaryNotes, assignedAgentId, pipelineStage, ...rest } = row as Record<string, unknown>;
  return { ...rest, name: fullName, notes: summaryNotes, assignedTo: assignedAgentId, stage: pipelineStage };
}

/** Inverse of rowToLeadDoc, for the patches mapSpaToLeadPatch produces. */
function leadPatchToColumns(patch: Record<string, unknown>): RecordData {
  const { name, notes, assignedTo, stage, ...rest } = patch;
  const out: RecordData = { ...rest };
  if (name !== undefined) out.fullName = name;
  if (notes !== undefined) out.summaryNotes = notes;
  if (assignedTo !== undefined) out.assignedAgentId = assignedTo;
  if (stage !== undefined) out.pipelineStage = stage;
  return out;
}

export async function GET(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const limit = parseInt(new URL(req.url).searchParams.get('limit') || '500', 10);

    // COLLECTIONS.stakeholders resolved to the Firestore collection 'leads',
    // which is now public.leads. This used to fetch the same collection twice
    // (once as 'stakeholders', once as 'leads') and merge the results: every
    // intake path (website, Property Finder, WhatsApp, ...) already writes
    // into the one table, distinguished by `source`.
    const rows = await listRecords('leads', { limit });

    const leads = rows.map((row) => mapLeadToSpa(String(row.id), rowToLeadDoc(row)));

    return NextResponse.json({ success: true, leads, count: leads.length });
  } catch (err) {
    logger.error('Error fetching leads:', err);
    return NextResponse.json(
      { error: 'Failed to fetch leads', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsed = leadCreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid lead payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const values = leadPatchToColumns(mapSpaToLeadPatch(parsed.data));
    const now = new Date().toISOString();

    const created = await insertRecord('leads', {
      ...values,
      pipelineStage: values.pipelineStage || 'inbound',
      source: 'website',
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ success: true, lead: mapLeadToSpa(String(created.id), rowToLeadDoc(created)) });
  } catch (err) {
    logger.error('Error creating lead:', err);
    return NextResponse.json(
      { error: 'Failed to create lead', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
