import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { COLLECTIONS } from '@/lib/models/schema';
import { startOrContinueOwnerNegotiation } from '@/lib/server/whatsapp-queue';
import { logger } from '@/lib/logger';

/**
 * /api/admin/owner-negotiations — start/continue a WhatsApp negotiation with
 * a property owner, and list active threads. Real sending is enqueued via
 * the same quota-gated queue as client recommendations and bulk outreach
 * (see lib/server/whatsapp-queue.ts); inbound replies are routed here
 * automatically by OmnichannelChatService.
 */

const initiateSchema = z.object({
  ownerPhone: z.string().min(6).max(20),
  body: z.string().min(1).max(2000),
  ownerName: z.string().max(200).optional(),
  unitId: z.string().max(128).optional(),
  brokerListingId: z.string().max(128).optional(),
  interestedLeadId: z.string().max(128).optional(),
  askingPrice: z.number().min(0).optional(),
  offerPrice: z.number().min(0).optional(),
});

type InitiateData = z.infer<typeof initiateSchema> & { ownerPhone: string; body: string };

export async function GET(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query: FirebaseFirestore.Query = adminDb.collection(COLLECTIONS.ownerNegotiations);
    if (status) query = query.where('status', '==', status);
    query = query.orderBy('updatedAt', 'desc').limit(100);

    const snap = await query.get();
    const negotiations = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ negotiations });
  } catch (err) {
    logger.error('Error listing owner negotiations:', err);
    return NextResponse.json(
      { error: 'Failed to list owner negotiations', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) return unauthorizedResponse();

  try {
    const parsed = initiateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const { negotiationId, jobId } = await startOrContinueOwnerNegotiation(parsed.data as InitiateData);

    return NextResponse.json({ success: true, negotiationId, jobId });
  } catch (err) {
    logger.error('Error initiating owner negotiation:', err);
    return NextResponse.json(
      { error: 'Failed to initiate owner negotiation', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
