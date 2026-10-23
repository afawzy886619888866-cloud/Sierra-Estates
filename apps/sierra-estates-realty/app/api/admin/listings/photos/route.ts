import { NextRequest, NextResponse } from 'next/server';
import { verifyPortalRequest } from '@/lib/server/auth-guard';
import { listRecords, updateRecord, type RecordData } from '@sierra-estates/db';
import { StorageService } from '@/lib/services/StorageService';
import { listingInScope } from '@/lib/server/partner-scope';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/listings/photos — attach photos to a listing.
 *
 * The WhatsApp bot accepts conversations (text) but NOT images, so unit photos
 * enter the system HERE: an admin (or the unit's own partner account) attaches
 * them from the admin portal. Two request shapes share the route:
 *
 *   1. multipart/form-data  { file, code }  → upload the file to the public
 *      `property-media` bucket (StorageService) and persist the public URL.
 *   2. application/json     { code, urls }  → persist externally-hosted URLs
 *      (community presets, Property Finder links) without an upload.
 *
 * Photos are persisted onto the listing row (photos[] + images[] + img) so
 * they survive a refresh — the SPA's previous local-state-only attach is
 * retired with this endpoint.
 */

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB per image
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

/** Resolve a listing row from the SPA-facing code (falls through the id). */
async function resolveListing(code: string): Promise<RecordData | null> {
  if (!code) return null;
  // listings.code / ref_id / reference_code / id — first match wins.
  for (const column of ['code', 'refId', 'referenceCode', 'id']) {
    const rows = await listRecords('listings', {
      where: [{ column, value: code }],
      limit: 1,
    }).catch(() => [] as RecordData[]);
    if (rows.length > 0) return rows[0];
  }
  return null;
}

/** Persist a photo-URL list onto the listing row and return the merged list. */
async function persistPhotos(
  listingId: string,
  existingPhotos: string[],
  newUrls: string[]
): Promise<string[]> {
  const merged = Array.from(new Set([...(existingPhotos ?? []), ...newUrls])).filter(Boolean);
  const now = new Date().toISOString();
  await updateRecord('listings', listingId, {
    photos: merged,
    images: merged,
    img: merged[0] ?? null,
    updatedAt: now,
  });
  return merged;
}

function existingPhotoUrls(row: RecordData): string[] {
  const photos = Array.isArray(row.photos) ? (row.photos as unknown[]) : [];
  const images = Array.isArray(row.images) ? (row.images as unknown[]) : [];
  return [...photos, ...images].filter((u): u is string => typeof u === 'string' && u.length > 0);
}

export async function POST(req: NextRequest) {
  const auth = await verifyPortalRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = req.headers.get('content-type') || '';

  try {
    /* ── Shape 2: JSON { code, urls } — persist externally-hosted URLs ── */
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      const code = typeof body?.code === 'string' ? body.code.trim() : '';
      const urls: string[] = Array.isArray(body?.urls)
        ? body.urls.filter((u: unknown): u is string => typeof u === 'string' && /^https?:\/\//i.test(u))
        : [];

      if (!code || urls.length === 0) {
        return NextResponse.json(
          { error: 'code (string) and urls (array of http(s) URLs) are required' },
          { status: 400 }
        );
      }

      const listing = await resolveListing(code);
      if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
      if (auth.access === 'partner' && !listingInScope(listing, auth.scope)) {
        return NextResponse.json(
          { error: 'Forbidden — unit outside partner portfolio' },
          { status: 403 }
        );
      }

      const photos = await persistPhotos(String(listing.id), existingPhotoUrls(listing), urls);
      return NextResponse.json({ success: true, added: urls.length, photos });
    }

    /* ── Shape 1: multipart { file, code } — upload + persist ── */
    const formData = await req.formData();
    const file = formData.get('file');
    const code = String(formData.get('code') || '').trim();

    if (!code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required (multipart/form-data)' }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported image type "${file.type}" — use JPEG/PNG/WebP/GIF/AVIF` },
        { status: 415 }
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `Image too large (${(file.size / 1024 / 1024).toFixed(1)}MB) — 10MB max` },
        { status: 413 }
      );
    }

    const listing = await resolveListing(code);
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    if (auth.access === 'partner' && !listingInScope(listing, auth.scope)) {
      return NextResponse.json(
        { error: 'Forbidden — unit outside partner portfolio' },
        { status: 403 }
      );
    }

    // Upload to the PUBLIC property-media bucket — listing photos are long-lived
    // public URLs rendered on the site for the life of the listing.
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const publicUrl = await StorageService.uploadPropertyMedia(
      String(listing.id),
      base64,
      file.type,
      file.name || 'upload.jpg'
    );

    const photos = await persistPhotos(String(listing.id), existingPhotoUrls(listing), [publicUrl]);
    return NextResponse.json({ success: true, url: publicUrl, added: 1, photos });
  } catch (err) {
    logger.error('Error attaching listing photos:', err);
    return NextResponse.json(
      { error: 'Failed to attach photos', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/** GET is unused — declared so the route reads as photos-only by intent. */
export async function GET() {
  return NextResponse.json(
    { error: 'Use POST with multipart/form-data (file+code) or JSON (code+urls)' },
    { status: 405 }
  );
}
