/**
 * /api/admin/viewings — Phase 9 admin VIEWINGS board data source.
 *
 * GET (ADMIN): list viewings (canonical public.viewings, migration 014) with
 * their feedback row (migration 015) merged in, newest first. Supports
 * ?status= filtering. This is the read for the admin ViewingsView; the public
 * GET lives on /api/viewing-requests and stays untouched for back-compat.
 */
import { NextRequest, NextResponse } from 'next/server';
import { listRecords, type WhereClause } from '@sierra-estates/db';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { VIEWING_STATUSES, type ViewingStatus } from '@/lib/server/viewing-feedback-shared';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    if (status && !VIEWING_STATUSES.includes(status as ViewingStatus)) {
      return NextResponse.json({ error: `status must be one of: ${VIEWING_STATUSES.join(', ')}` }, { status: 400 });
    }

    const where: WhereClause[] = [];
    if (status) where.push({ column: 'status', value: status });

    const viewings = await listRecords('viewings', {
      where,
      orderBy: { column: 'createdAt', ascending: false },
      limit: 200,
    });

    // Merge the feedback rows (one per viewing at most — UNIQUE(viewing_id)).
    // Straight join through the generic helper is not available, and two
    // indexed reads are cheaper than an N+1 loop.
    const feedbackRows = await listRecords('viewing_feedback', { limit: 500 });
    const feedbackByViewing = new Map(feedbackRows.map((f) => [String(f.viewingId), f]));

    const rows = viewings.map((v) => {
      const feedback = feedbackByViewing.get(String(v.id));
      return {
        ...v,
        feedback: feedback
          ? {
              // Sales-side presence
              salesSubmittedAt: feedback.submittedAt ?? null,
              unitAccuracy: feedback.unitAccuracy ?? null,
              clientReaction: feedback.clientReaction ?? null,
              priceReaction: feedback.priceReaction ?? null,
              objections: Array.isArray(feedback.objections) ? feedback.objections : [],
              interestLevel: feedback.interestLevel ?? null,
              nextAction: feedback.nextAction ?? null,
              notes: feedback.notes ?? null,
              // Client-side presence (token-gated public survey)
              clientRating: feedback.clientRating ?? null,
              clientComment: feedback.clientComment ?? null,
              wouldRecommend: feedback.wouldRecommend ?? null,
              surveySubmittedAt: feedback.surveySubmittedAt ?? null,
              // Manager review
              reviewStatus: feedback.reviewStatus ?? 'pending_review',
              managerNotes: feedback.managerNotes ?? null,
            }
          : null,
      };
    });

    return NextResponse.json({ success: true, count: rows.length, viewings: rows }, { status: 200 });
  } catch (error) {
    logger.error('GET /api/admin/viewings failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch viewings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
