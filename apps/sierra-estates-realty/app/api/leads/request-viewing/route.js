import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { COLLECTIONS } from '@/lib/models/schema';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';

import { z } from 'zod';
import { logger } from '@/lib/logger';

const viewingSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  unitId: z.string().min(1, "Unit ID is required"),
  portfolioId: z.string().optional().nullable()
});

export async function POST(req) {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const data = await req.json();
    const parseResult = viewingSchema.safeParse(data);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { leadId, unitId, portfolioId } = parseResult.data;

    // Create a viewing request record
    const viewingDoc = await adminDb.collection(COLLECTIONS.viewings).add({
      leadId,
      unitId,
      portfolioId: portfolioId || null,
      status: 'pending_approval',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Update the lead status
    const leadRef = adminDb.collection(COLLECTIONS.stakeholders).doc(leadId);
    const leadSnap = await leadRef.get();

    if (leadSnap.exists) {
      await leadRef.update({
        status: 'Viewing Requested',
        stage: 2,
        updatedAt: new Date()
      });
    }

    // Update the concierge selection if provided
    if (portfolioId) {
      const portfolioRef = adminDb.collection(COLLECTIONS.conciergeSelections).doc(portfolioId);
      await portfolioRef.update({
        [`engagement.requested_viewing`]: new Date(),
        status: 'viewing_requested',
        lastUpdatedUnit: unitId
      });
    }

    return NextResponse.json({
      success: true,
      viewingId: viewingDoc.id,
      message: 'Viewing request received. Laila is preparing matches for agent confirmation.'
    });
  } catch (error) {
    logger.error('Error requesting viewing:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
