/**
 * /api/viewing-feedback — Phase 9 PUBLIC client survey (token-gated).
 *
 * GET  ?token=… : minimal survey context for the client (property code,
 *                preferred date, visitor FIRST NAME ONLY — no other PII).
 * POST { token, clientRating, clientComment?, wouldRecommend? }
 *
 * SECURITY MODEL (mirrors the password-reset / share-link pattern):
 *   The 48-hex-char survey token minted at viewing completion IS the client's
 *   capability. It is validated server-side against viewings.survey_token
 *   through the service-role records helper — viewing_feedback rows are
 *   staff-only under RLS (no anon policy exists), so nothing is exposed to
 *   anonymous clients: knowing the token identifies exactly one viewing, the
 *   same one the client just visited.
 *
 * One submission per token (409 on repeat). Rate-limited like the other
 * public endpoints.
 */
import { NextRequest, NextResponse } from 'next/server';
import { listRecords, insertRecord, updateRecord } from '@sierra-estates/db';
import { clientSurveySchema } from '@/lib/server/viewing-feedback-shared';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Look up the viewing by its survey capability token. */
async function findViewingByToken(token: string) {
  const rows = await listRecords('viewings', {
    where: [{ column: 'surveyToken', value: token }],
    limit: 1,
  });
  return rows[0] ?? null;
}

export async function GET(req: NextRequest) {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  const token = new URL(req.url).searchParams.get('token') ?? '';
  if (!/^[0-9a-f]{48}$/.test(token)) {
    return NextResponse.json({ error: 'Invalid survey link' }, { status: 400 });
  }

  try {
    const viewing = await findViewingByToken(token);
    if (!viewing) {
      return NextResponse.json({ error: 'Survey link not found or expired' }, { status: 404 });
    }

    // First name only — the link holder already knows their own details; we
    // return just enough to render a personalised survey page.
    const firstName = String(viewing.visitorName ?? '').trim().split(/\s+/)[0] || '';

    return NextResponse.json({
      success: true,
      propertyCode: viewing.propertyCode ?? viewing.unitId ?? null,
      preferredDate: viewing.preferredDate ?? null,
      visitorFirstName: firstName || null,
    });
  } catch (error) {
    logger.error('GET /api/viewing-feedback failed:', error);
    return NextResponse.json({ error: 'Failed to load survey' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = clientSurveySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) },
      { status: 400 }
    );
  }

  const { token, clientRating, clientComment, wouldRecommend } = parsed.data;
  const now = new Date().toISOString();

  try {
    const viewing = await findViewingByToken(token);
    if (!viewing) {
      return NextResponse.json({ error: 'Survey link not found or expired' }, { status: 404 });
    }
    if (String(viewing.status) !== 'completed') {
      return NextResponse.json({ error: 'This survey is only available after the viewing is completed' }, { status: 409 });
    }

    const existing = await listRecords('viewing_feedback', {
      where: [{ column: 'viewingId', value: String(viewing.id) }],
      limit: 1,
    });
    const feedback = existing[0] ?? null;
    if (feedback?.surveySubmittedAt) {
      return NextResponse.json({ error: 'Feedback for this viewing was already submitted — thank you!' }, { status: 409 });
    }

    const surveyFields = {
      clientRating,
      ...(clientComment !== undefined ? { clientComment } : {}),
      ...(wouldRecommend !== undefined ? { wouldRecommend } : {}),
      surveySubmittedAt: now,
      updatedAt: now,
    };

    if (feedback) {
      await updateRecord('viewing_feedback', String(feedback.id), surveyFields);
    } else {
      await insertRecord('viewing_feedback', {
        viewingId: String(viewing.id),
        ...(viewing.leadId ? { leadId: String(viewing.leadId) } : {}),
        ...surveyFields,
        createdAt: now,
      });
    }

    return NextResponse.json({ success: true, message: 'Thank you — your feedback was recorded.' });
  } catch (error) {
    logger.error('POST /api/viewing-feedback failed:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
