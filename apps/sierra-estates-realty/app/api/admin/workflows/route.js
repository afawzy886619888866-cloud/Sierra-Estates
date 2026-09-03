import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { listRecords, insertRecord } from '@sierra-estates/db';
import { toWorkflowColumns, toWorkflowRecord } from '@/lib/server/workflow-columns';
import { COLLECTIONS } from '@/lib/models/schema';
import { logger } from '@/lib/logger';

const workflowCreateSchema = z.object({
  name: z.string().min(1).max(200),
  nameAr: z.string().max(200).optional(),
  desc: z.string().max(1000).optional(),
  descAr: z.string().max(1000).optional(),
  color: z.string().max(32).optional(),
});

export async function GET(req) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = await listRecords(COLLECTIONS.automationWorkflows);
    const workflows = rows.map(toWorkflowRecord);

    return NextResponse.json({ success: true, workflows });
  } catch (err) {
    logger.error('Error fetching workflows:', err);
    return NextResponse.json(
      { error: 'Failed to fetch workflows', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsed = workflowCreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid workflow payload', details: parsed.error.flatten() }, { status: 400 });
    }
    const { name, nameAr, desc, descAr, color } = parsed.data;

    const ref = await insertRecord(
      COLLECTIONS.automationWorkflows,
      toWorkflowColumns({
        name,
        nameAr: nameAr || '',
        desc: desc || '',
        descAr: descAr || '',
        color: color || '#6366f1',
        status: 'paused',
        runs: 0,
        last: 'never',
        updatedAt: new Date().toISOString(),
      })
    );

    return NextResponse.json({ success: true, workflowId: ref.id });
  } catch (err) {
    logger.error('Error creating workflow:', err);
    return NextResponse.json(
      { error: 'Failed to create workflow', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
