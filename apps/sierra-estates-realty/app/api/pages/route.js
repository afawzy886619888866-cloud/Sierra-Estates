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
import { listRecords, } from '@sierra-estates/db';
import { logger } from '@/lib/logger';

export async function GET(req) {
  const rateLimitResponse = await applyRateLimit(req, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const locale = searchParams.get('locale');

    const where = [{ column: 'published', value: true }];
    if (slug) where.push({ column: 'slug', value: slug });
    if (locale) where.push({ column: 'locale', value: locale });

    const pages = await listRecords('pages', { where });

    return NextResponse.json({ success: true, pages, count: pages.length });
  } catch (err) {
    logger.error('[public-pages] GET failed:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}
