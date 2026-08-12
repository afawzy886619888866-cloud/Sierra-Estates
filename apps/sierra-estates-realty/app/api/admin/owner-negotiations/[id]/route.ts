import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { COLLECTIONS } from '@/lib/models/schema';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

const patchSchema = z
  .object({
    status: z.enum(['contacted', 'negotiating', 'agreed', 'completed', 'rejected', 'stale']),
    askingPrice: z.number().min(0),
    currentOfferPrice: z.number().min(0),
    interestedLeadId: z.string().max(128).nullable(),
    assignedAgentId: z.string().max(128).nullable(),
  })
  .partial()
  .strict();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) return unauthorizedResponse();

  try {
    const { id } = await params;
    const snap = await adminDb.collection(COLLECTIONS.ownerNegotiations).doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Owner negotiation not found' }, { status: 404 });
    }
    return NextResponse.json({ negotiation: { id: snap.id, ...snap.data() } });
  } catch (err) {
    logger.error('Error fetching owner negotiation:', err);
    return NextResponse.json(
      { error: 'Failed to fetch owner negotiation', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) return unauthorizedResponse();

  try {
    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const ref = adminDb.collection(COLLECTIONS.ownerNegotiations).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Owner negotiation not found' }, { status: 404 });
    }

    // null is a valid PATCH value here — it clears interestedLeadId/assignedAgentId.
    const patch: Record<string, any> = { ...parsed.data, updatedAt: Timestamp.now() };
    await ref.update(patch);
    const updated = await ref.get();
    return NextResponse.json({ success: true, negotiation: { id: updated.id, ...updated.data() } });
  } catch (err) {
    logger.error('Error updating owner negotiation:', err);
    return NextResponse.json(
      { error: 'Failed to update owner negotiation', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
