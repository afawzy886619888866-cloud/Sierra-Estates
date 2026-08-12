/**
 * GET /api/pages — list all published CMS pages
 * Public endpoint (no auth). Returns only pages where published === true.
 *
 * Query params:
 *   - slug   (filter by slug, e.g. 'home')
 *   - locale (filter by locale, e.g. 'en' or 'ar')
 */

import { NextResponse } from 'next/server';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { adminDb } from '@/lib/server/firebase-admin';
import { logger } from '@/lib/logger';

export async function GET(req: Request) {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const locale = searchParams.get('locale');

    let query: FirebaseFirestore.Query = adminDb
      .collection('pages')
      .where('published', '==', true);

    if (slug) query = query.where('slug', '==', slug);
    if (locale) query = query.where('locale', '==', locale);

    const snap = await query.get();
    const pages = snap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, pages, count: pages.length });
  } catch (err) {
    logger.error('[public-pages] GET failed:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}
