import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin, updateRecord } from '@sierra-estates/db';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { adminPhotoRequestMessage } from '@/lib/server/photo-messages';
import { PFIntegrationService } from '@/lib/services/PFIntegrationService';
import { resolveEgyptPfLocationId, SIERRA_PF_PROFILES } from '@/lib/property-finder/egypt-locations';
import {
  PF_AD_MIN_PHOTOS,
  PF_MIN_IMAGE_WIDTH,
  PF_MIN_IMAGE_HEIGHT,
  evaluatePfAdMediaReadiness,
  isGenuineListingPhotoUrl,
  type ProbedPhotoReport,
} from '@/lib/property-finder/media-quality';
import { logger } from '@/lib/logger';

/**
 * Admin Property Finder Visual Approval API (`/api/admin/pf-approval`)
 *
 * - GET: Returns candidate units with actual photo URLs, live probed pixel
 *        dimensions (`width x height`), `qualifyingCount / 6` readiness,
 *        resolved Egypt `location.id`, and complete unit specs (zero PII leak).
 * - POST:
 *    1) `approve_and_publish`: Enforces `>= 6` qualifying (`>= 800x600` px)
 *       photos, stamps staff verification provenance (`verified_at`,
 *       `verified_by`), and publishes (or dry-runs) via `PFIntegrationService`.
 *    2) `request_owner_photos`: Enqueues a 6-photo (`>= 800x600` px) WhatsApp
 *       request to the unit's owner/broker on file.
 */

interface ListingDbRow {
  id: string;
  code: string | null;
  unit_code: string | null;
  pf_reference_number: string | null;
  pf_status: string | null;
  title: string | null;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  compound: string | null;
  location_area: string | null;
  city: string | null;
  property_type: string | null;
  deal_type: string | null;
  price: number | null;
  price_currency: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  status: string | null;
  availability: string | null;
  publish_status: string | null;
  data_quality_score: number | null;
  verified_at: string | null;
  verified_by: string | null;
  sync_source: string | null;
  images: string[] | null;
  owner_phone: string | null;
  owner_name: string | null;
  automation: Record<string, unknown> | null;
}

export interface PfApprovalCandidateDto {
  id: string;
  code: string;
  title: string | null;
  titleAr: string | null;
  description: string | null;
  compound: string | null;
  locationArea: string | null;
  city: string | null;
  pfLocationId: number | null;
  propertyType: string | null;
  dealType: string | null;
  price: number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: number | null;
  status: string | null;
  publishStatus: string | null;
  syncSource: string | null;
  hasOwnerPhone: boolean;
  verifiedAt: string | null;
  totalPhotos: number;
  qualifyingPhotos: number;
  requiredPhotos: number;
  missingPhotos: number;
  minWidthPx: number;
  minHeightPx: number;
  readyForPfApproval: boolean;
  photos: ProbedPhotoReport[];
  blockers: string[];
}

const postBodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve_and_publish'),
    listingId: z.string().uuid(),
    dryRun: z.boolean().optional().default(false),
    publicProfileId: z.number().int().positive().optional(),
  }),
  z.object({
    action: z.literal('request_owner_photos'),
    listingId: z.string().uuid(),
  }),
]);

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sb = getSupabaseAdmin();
    const limitParam = Number(req.nextUrl.searchParams.get('limit') || '20');
    const maxItems = Math.min(Math.max(1, Number.isFinite(limitParam) ? limitParam : 20), 40);

    const selectCols = [
      'id', 'code', 'unit_code', 'pf_reference_number', 'pf_status',
      'title', 'title_ar', 'description', 'description_ar',
      'compound', 'location_area', 'city',
      'property_type', 'deal_type', 'price', 'price_currency',
      'bedrooms', 'bathrooms', 'area_sqm',
      'status', 'availability', 'publish_status',
      'data_quality_score', 'verified_at', 'verified_by',
      'sync_source', 'images', 'owner_phone', 'owner_name', 'automation',
    ].join(',');

    const [photoRes, sheetRes] = await Promise.all([
      sb
        .from('listings')
        .select(selectCols)
        .neq('images', '{}')
        .in('status', ['active', 'available', 'verified'])
        .order('price', { ascending: false })
        .limit(80),
      sb
        .from('listings')
        .select(selectCols)
        .in('sync_source', ['sheets-units', 'master-owner-sheet'])
        .eq('availability', 'Available')
        .order('price', { ascending: false })
        .limit(25),
    ]);

    if (photoRes.error) {
      throw new Error(photoRes.error.message);
    }

    const mergedMap = new Map<string, ListingDbRow>();
    const rawRows = [
      ...((photoRes.data as unknown as ListingDbRow[] | null) ?? []),
      ...((sheetRes.data as unknown as ListingDbRow[] | null) ?? []),
    ];

    for (const row of rawRows) {
      if (!row?.id) continue;
      const auto = row.automation ?? {};
      if (auto.isPublishedToPF === true || row.pf_status === 'published' || row.pf_status === 'live') {
        // Keep only units not already marked published/live, EXCEPT historic rows no longer on PF like Oriana 2
        if (row.pf_status === 'published' || auto.isPublishedToPF === true) continue;
        if (row.code && /^PF-01J/i.test(row.code)) continue;
      }
      mergedMap.set(row.id, row);
    }

    const sortedRaw = [...mergedMap.values()]
      .sort((a, b) => {
        const aLen = Array.isArray(a.images) ? a.images.filter(isGenuineListingPhotoUrl).length : 0;
        const bLen = Array.isArray(b.images) ? b.images.filter(isGenuineListingPhotoUrl).length : 0;
        if (bLen !== aLen) return bLen - aLen;
        return (Number(b.price) || 0) - (Number(a.price) || 0);
      })
      .slice(0, maxItems);

    const candidates: PfApprovalCandidateDto[] = await Promise.all(
      sortedRaw.map(async (row) => {
        const media = await evaluatePfAdMediaReadiness(row.images ?? [], { timeoutMs: 6000 });
        const pfLocationId =
          resolveEgyptPfLocationId(row.compound) ??
          resolveEgyptPfLocationId(row.location_area) ??
          resolveEgyptPfLocationId(row.city);

        const blockers: string[] = [];
        if (!media.ready) {
          blockers.push(
            `Needs ${media.missingCount} more photo(s) >= ${PF_MIN_IMAGE_WIDTH}x${PF_MIN_IMAGE_HEIGHT}px (${media.qualifyingCount}/${PF_AD_MIN_PHOTOS} valid)`
          );
        }
        if (pfLocationId === null) blockers.push('Unresolved Property Finder Egypt location.id');
        if (!(Number(row.price) > 0)) blockers.push('Missing price');
        if (!(Number(row.area_sqm) > 0)) blockers.push('Missing area (m²)');
        if (!row.property_type) blockers.push('Missing property type');

        const code = row.code || row.unit_code || row.id.slice(0, 8).toUpperCase();

        return {
          id: row.id,
          code,
          title: row.title,
          titleAr: row.title_ar,
          description: row.description,
          compound: row.compound,
          locationArea: row.location_area,
          city: row.city,
          pfLocationId,
          propertyType: row.property_type,
          dealType: row.deal_type,
          price: row.price,
          currency: row.price_currency || 'EGP',
          bedrooms: row.bedrooms,
          bathrooms: row.bathrooms,
          areaSqm: row.area_sqm,
          status: row.status,
          publishStatus: row.publish_status,
          syncSource: row.sync_source,
          hasOwnerPhone: Boolean(row.owner_phone && row.owner_phone.trim().length >= 8),
          verifiedAt: row.verified_at,
          totalPhotos: media.totalCandidateUrls,
          qualifyingPhotos: media.qualifyingCount,
          requiredPhotos: PF_AD_MIN_PHOTOS,
          missingPhotos: media.missingCount,
          minWidthPx: PF_MIN_IMAGE_WIDTH,
          minHeightPx: PF_MIN_IMAGE_HEIGHT,
          readyForPfApproval: blockers.length === 0,
          photos: media.photos,
          blockers,
        };
      })
    );

    candidates.sort(
      (a, b) =>
        Number(b.readyForPfApproval) - Number(a.readyForPfApproval) ||
        b.qualifyingPhotos - a.qualifyingPhotos ||
        b.totalPhotos - a.totalPhotos ||
        (Number(b.price) || 0) - (Number(a.price) || 0)
    );

    return NextResponse.json({
      success: true,
      policy: {
        minPhotos: PF_AD_MIN_PHOTOS,
        minWidthPx: PF_MIN_IMAGE_WIDTH,
        minHeightPx: PF_MIN_IMAGE_HEIGHT,
      },
      profiles: SIERRA_PF_PROFILES,
      candidates,
    });
  } catch (err) {
    logger.error('GET /api/admin/pf-approval error:', err);
    return NextResponse.json(
      { error: 'Failed to load Property Finder approval queue', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = postBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request payload', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const sb = getSupabaseAdmin();
    const { data: rowData, error: rowErr } = await sb
      .from('listings')
      .select('id, code, unit_code, compound, images, owner_phone, owner_name, data_quality_score, status')
      .eq('id', parsed.data.listingId)
      .single();

    if (rowErr || !rowData) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const row = rowData as unknown as ListingDbRow;
    const codeLabel = row.code || row.unit_code || row.id.slice(0, 8).toUpperCase();

    if (parsed.data.action === 'request_owner_photos') {
      if (!row.owner_phone) {
        return NextResponse.json(
          { error: 'No owner phone number on file for this listing.' },
          { status: 422 }
        );
      }

      await enqueueWhatsAppJob({
        purpose: 'general-outreach',
        toPhone: row.owner_phone,
        toName: row.owner_name || 'المالك الكريم',
        body: adminPhotoRequestMessage(row.owner_name || 'يا فندم', codeLabel),
        metadata: {
          kind: 'pf-6photo-request',
          listing_id: row.id,
          internal_code: codeLabel,
          requested_by: auth.email ?? auth.uid ?? 'admin',
        },
      });

      return NextResponse.json({
        success: true,
        queued: true,
        code: codeLabel,
      });
    }

    // Action: approve_and_publish -> Enforce >= 6 photos with >= 800x600px
    const mediaCheck = await evaluatePfAdMediaReadiness(row.images ?? [], { timeoutMs: 8000 });
    if (!mediaCheck.ready) {
      return NextResponse.json(
        {
          error: `Cannot publish to Property Finder: unit has ${mediaCheck.qualifyingCount}/${PF_AD_MIN_PHOTOS} qualifying photos (>=${PF_MIN_IMAGE_WIDTH}x${PF_MIN_IMAGE_HEIGHT}px).`,
          media: mediaCheck,
        },
        { status: 422 }
      );
    }

    const nowIso = new Date().toISOString();
    const verifier = auth.email ?? auth.uid ?? 'admin';
    const nextQuality = Math.max(Number(row.data_quality_score) || 0, 85);

    // Human admin approval explicitly stamps verification provenance
    await updateRecord('listings', row.id, {
      publishStatus: 'PUBLISHABLE',
      verifiedAt: nowIso,
      verifiedBy: verifier,
      dataQualityScore: nextQuality,
      images: mediaCheck.photos.filter((p) => p.qualifying).map((p) => p.url),
      updatedAt: nowIso,
    });

    const publishRes = await PFIntegrationService.publishListing(row.id, {
      dryRun: parsed.data.dryRun,
      publicProfileId: parsed.data.publicProfileId,
    });

    return NextResponse.json({
      success: true,
      code: codeLabel,
      media: mediaCheck,
      publishResult: publishRes,
    });
  } catch (err) {
    logger.error('POST /api/admin/pf-approval error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Approval action failed' },
      { status: 500 }
    );
  }
}
