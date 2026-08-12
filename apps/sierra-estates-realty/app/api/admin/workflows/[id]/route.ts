import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { COLLECTIONS } from '@/lib/models/schema';
import { logger } from '@/lib/logger';
// Force dynamic rendering — uses Firebase/auth at runtime
export const dynamic = 'force-dynamic';

// PATCH accepts a partial of the workflow display shape; unknown keys are
// stripped so callers can't write arbitrary fields onto the document.
const workflowPatchSchema = z
  .object({
    name: z.string().min(1).max(200),
    status: z.enum(['active', 'warning', 'paused']),
    runs: z.number().int().min(0),
    last: z.string().max(200),
    color: z.string().max(32),
  })
  .partial()
  .strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const parsed = workflowPatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid workflow payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await adminDb.collection(COLLECTIONS.automationWorkflows).doc(id).update({
      ...parsed.data,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Error updating workflow:', err);
    return NextResponse.json(
      { error: 'Failed to update workflow', details: err instanceof Error ? err.message : 'Unknown error' },
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
    await adminDb.collection(COLLECTIONS.automationWorkflows).doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Error deleting workflow:', err);
    return NextResponse.json(
      { error: 'Failed to delete workflow', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
