import { listRecords } from '@sierra-estates/db';
import { COLLECTIONS } from '@/lib/models/schema';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { logger } from '@/lib/logger';

const conciergeParamsSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
});

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ leadId: string }> }
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

    // Query Supabase for the concierge portfolio
    const portfolios = await listRecords(COLLECTIONS.conciergeSelections, {
      where: [{ column: 'leadId', value: leadId }],
    });

    if (portfolios.length === 0) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(portfolios[0]);
  } catch (error) {
    logger.error('Error fetching portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
};
