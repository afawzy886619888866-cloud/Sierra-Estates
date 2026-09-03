 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }/**
 * /api/admin/pages — CMS for client-site marketing content
 *
 * Lets admins edit the headlines, body copy, and CTAs that appear on the
 * public Sierra Estates site WITHOUT requiring a code deploy. Pages are
 * stored in the `pages` Firestore collection and read by the public site
 * via /api/pages/:slug (a separate public endpoint).
 *
 * Schema (per page doc):
 *   {
 *     slug: 'home' | 'about' | 'listings' | 'contact' | 'invest' | ...,
 *     locale: 'en' | 'ar',
 *     sections: {
 *       hero: { title, subtitle, ctaText, ctaHref, backgroundImage },
 *       about: { title, body, image },
 *       testimonials: { title, items: [{quote, author, role, avatar}] },
 *       ...
 *     },
 *     updatedAt: timestamptz,
 *     updatedBy: string (uid)
 *   }
 *
 * Security: admin-only (any role). Superadmin required for delete.
 */

import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { listRecords, insertRecord, updateRecord, } from '@sierra-estates/db';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const ALLOWED_SLUGS = [
  'home', 'about', 'listings', 'contact', 'invest',
  'concierge', 'careers', 'pricing', 'blog', 'success-stories',
  'roi', 'virtual-tour', 'dream-decision',
] ;

const sectionSchema = z.record(z.string(), z.unknown());

const pageSchema = z.object({
  slug: z.enum(ALLOWED_SLUGS),
  locale: z.enum(['en', 'ar']).default('en'),
  sections: z.record(z.string(), sectionSchema).default({}),
  published: z.boolean().default(false),
});

export async function GET(req) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const locale = searchParams.get('locale');

    const where = [];
    if (slug) where.push({ column: 'slug', value: slug });
    if (locale) where.push({ column: 'locale', value: locale });

    const pages = await listRecords('pages', { where });

    return NextResponse.json({ success: true, pages, count: pages.length });
  } catch (err) {
    logger.error('[pages] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch pages', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = pageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Upsert by (slug, locale) — one page per slug per locale, which the table
    // also enforces with a UNIQUE constraint. Read-then-write is kept rather
    // than a bare upsert so the response can still report created vs updated.
    const [existing] = await listRecords('pages', {
      where: [
        { column: 'slug', value: parsed.data.slug },
        { column: 'locale', value: parsed.data.locale },
      ],
      limit: 1,
    });

    const data = {
      ...parsed.data,
      updatedAt: new Date().toISOString(),
      updatedBy: _nullishCoalesce(authResult.uid, () => ( 'system')),
    };

    if (existing) {
      await updateRecord('pages', existing.id, data);
      return NextResponse.json({ success: true, id: existing.id, action: 'updated' });
    }

    const created = await insertRecord('pages', data);
    return NextResponse.json({ success: true, id: created.id, action: 'created' }, { status: 201 });
  } catch (err) {
    logger.error('[pages] POST failed:', err);
    return NextResponse.json(
      { error: 'Failed to save page', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
