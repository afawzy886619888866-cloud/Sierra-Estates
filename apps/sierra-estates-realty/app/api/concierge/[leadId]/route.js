import { adminDb } from '@/lib/server/firebase-admin';
import { COLLECTIONS } from '@/lib/models/schema';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { logger } from '@/lib/logger';

const conciergeParamsSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
});

export const GET = async (
  req,
  { params }
) => {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const parseResult = conciergeParamsSchema.safeParse(await params);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { leadId } = parseResult.data;

    // Query Firestore for the concierge portfolio
    const snapshot = await adminDb.collection(COLLECTIONS.conciergeSelections)
      .where('leadId', '==', leadId)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      );
    }

    const portfolio = snapshot.docs[0].data();
    portfolio.id = snapshot.docs[0].id;

    return NextResponse.json(portfolio);
  } catch (error) {
    logger.error('Error fetching portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
};
