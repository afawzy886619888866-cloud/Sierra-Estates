import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { COLLECTIONS } from '@/lib/models/schema';
import { logger } from '@/lib/logger';
// Force dynamic rendering — uses Firebase/auth at runtime
export const dynamic = 'force-dynamic';

// PATCH accepts a partial of the agent display shape; unknown keys are stripped
// so callers can't write arbitrary fields onto the document.
const agentPatchSchema = z
  .object({
    name: z.string().min(1).max(200),
    desc: z.string().max(1000),
    emoji: z.string().max(16),
    color: z.string().max(32),
    status: z.enum(['Online', 'Running', 'Idle']),
    load: z.number().int().min(0).max(100),
    tasks: z.number().int().min(0),
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
    const parsed = agentPatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid agent payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await adminDb.collection(COLLECTIONS.agentStatus).doc(id).update({
      ...parsed.data,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Error updating agent:', err);
    return NextResponse.json(
      { error: 'Failed to update agent', details: err instanceof Error ? err.message : 'Unknown error' },
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
    await adminDb.collection(COLLECTIONS.agentStatus).doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Error deleting agent:', err);
    return NextResponse.json(
      { error: 'Failed to delete agent', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
