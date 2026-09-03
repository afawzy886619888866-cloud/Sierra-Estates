import { NextResponse } from 'next/server';
import { getRecord, insertRecord, updateRecord } from '@sierra-estates/db';
import { COLLECTIONS } from '@/lib/models/schema';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';

import { z } from 'zod';
import { logger } from '@/lib/logger';

const viewingSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  unitId: z.string().min(1, "Unit ID is required"),
  portfolioId: z.string().optional().nullable()
});

export async function POST(req: Request) {
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

    const now = new Date().toISOString();

    // Create a viewing request record
    const viewing = await insertRecord<{ id: string }>(COLLECTIONS.viewings, {
      leadId,
      unitId,
      portfolioId: portfolioId || null,
      status: 'pending_approval',
      createdAt: now,
      updatedAt: now,
    });

    // Update the lead status
    const lead = await getRecord(COLLECTIONS.stakeholders, leadId);
    if (lead) {
      await updateRecord(COLLECTIONS.stakeholders, leadId, {
        status: 'Viewing Requested',
        stage: 2,
        updatedAt: now,
      });
    }

    // Update the concierge selection if provided. `engagement` is a JSONB
    // column rather than a Firestore map, so the existing keys are read and
    // merged instead of patched with a dotted field path.
    if (portfolioId) {
      const portfolio = await getRecord<{ engagement?: Record<string, unknown> }>(
        COLLECTIONS.conciergeSelections,
        portfolioId
      );
      await updateRecord(COLLECTIONS.conciergeSelections, portfolioId, {
        engagement: { ...(portfolio?.engagement ?? {}), requestedViewing: now },
        status: 'viewing_requested',
        lastUpdatedUnit: unitId,
      });
    }

    return NextResponse.json({
      success: true,
      viewingId: viewing.id,
      message: 'Viewing request received. Laila is preparing matches for agent confirmation.'
    });
  } catch (error: any) {
    logger.error('Error requesting viewing:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
