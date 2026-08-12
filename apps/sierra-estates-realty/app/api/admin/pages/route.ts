/**
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
 *     updatedAt: Timestamp,
 *     updatedBy: string (uid)
 *   }
 *
 * Security: admin-only (any role). Superadmin required for delete.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const ALLOWED_SLUGS = [
  'home', 'about', 'listings', 'contact', 'invest',
  'concierge', 'careers', 'pricing', 'blog', 'success-stories',
  'roi', 'virtual-tour', 'dream-decision',
] as const;

const sectionSchema = z.record(z.string(), z.unknown());

const pageSchema = z.object({
  slug: z.enum(ALLOWED_SLUGS),
  locale: z.enum(['en', 'ar']).default('en'),
  sections: z.record(z.string(), sectionSchema).default({}),
  published: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const locale = searchParams.get('locale');

    let query: FirebaseFirestore.Query = adminDb.collection('pages');
    if (slug) query = query.where('slug', '==', slug);
    if (locale) query = query.where('locale', '==', locale);

    const snap = await query.get();
    const pages = snap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, pages, count: pages.length });
  } catch (err) {
    logger.error('[pages] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch pages', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    // Upsert by (slug, locale) — one page per slug per locale
    const existing = await adminDb
      .collection('pages')
      .where('slug', '==', parsed.data.slug)
      .where('locale', '==', parsed.data.locale)
      .limit(1)
      .get();

    const data = {
      ...parsed.data,
      updatedAt: Timestamp.now(),
      updatedBy: authResult.uid ?? 'system',
    };

    if (!existing.empty) {
      const ref = existing.docs[0].ref;
      await ref.update(data);
      return NextResponse.json({ success: true, id: ref.id, action: 'updated' });
    }

    const ref = await adminDb.collection('pages').add({
      ...data,
      createdAt: Timestamp.now(),
    });
    return NextResponse.json({ success: true, id: ref.id, action: 'created' }, { status: 201 });
  } catch (err) {
    logger.error('[pages] POST failed:', err);
    return NextResponse.json(
      { error: 'Failed to save page', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
