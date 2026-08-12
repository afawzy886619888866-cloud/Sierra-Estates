/**
 * GET /api/pages/:slug — fetch a published page by slug
 * Public endpoint. Defaults to English locale; pass ?locale=ar for Arabic.
 *
 * Example:
 *   GET /api/pages/home              → English home page
 *   GET /api/pages/home?locale=ar    → Arabic home page
 */

import { NextResponse } from 'next/server';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { adminDb } from '@/lib/server/firebase-admin';
import { logger } from '@/lib/logger';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get('locale') === 'ar' ? 'ar' : 'en';

    const snap = await adminDb
      .collection('pages')
      .where('slug', '==', slug)
      .where('locale', '==', locale)
      .where('published', '==', true)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json(
        { success: false, error: 'Page not found', slug, locale },
        { status: 404 }
      );
    }

    const doc = snap.docs[0];
    return NextResponse.json({
      success: true,
      page: { id: doc.id, ...doc.data() },
    });
  } catch (err) {
    logger.error('[public-pages] GET by slug failed:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch page' },
      { status: 500 }
    );
  }
}
