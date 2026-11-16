/**
 * POST /api/listings/add — Module 4 public Add-Listing endpoint.
 *
 * Serves the public Owner/Broker submission page (/add-listing) and the
 * Admin/Broker quick-add drawer. Runs the canonical pipeline in
 * lib/services/AddListingPipeline.ts:
 *
 *   dedup (phone + compound + unit no./BUA ±5%) → merge or create with the
 *   official SE-SL/SE-RNT unit code → Supabase + Google Sheets
 *   (Master_Inventory / Real_Available_Units / Owners Master family) →
 *   Supabase Storage photo upload → Telegram notification.
 *
 * The legacy /api/listings/submit (Apps Script workflow) remains untouched
 * for the Easy Listing studio; this route is the structured, spec-complete
 * path with dedup-by-identity rather than dedup-by-code.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { processAddListing } from '@/lib/services/AddListingPipeline';
import { normalizeEgyptianPhone } from '@/lib/utils/phone';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { revalidateTag } from 'next/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PHOTOS = 10;
const MAX_BODY_BYTES = 15 * 1024 * 1024; // 10 photos ≈ 1.4 MB each after compression

const addListingSchema = z.object({
  submitterRole: z.enum(['Direct Owner', 'Co-Broker', 'Internal Agent']),
  contactName: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .refine((v) => normalizeEgyptianPhone(v) !== null, {
      message: 'Enter a valid Egyptian mobile (e.g. 01012345678).',
    }),
  transaction: z.enum(['Sale', 'Rent']),
  category: z.enum([
    'Apartment', 'Villa', 'Twin House', 'Townhouse',
    'Duplex', 'Penthouse', 'Commercial',
  ]),
  compound: z.string().trim().min(2).max(120),
  zone: z.string().trim().max(160).optional(),
  areaSqm: z.coerce.number().min(20).max(10_000),
  gardenSqm: z.coerce.number().min(0).max(10_000).optional(),
  bedrooms: z.coerce.number().int().min(0).max(20),
  bathrooms: z.coerce.number().int().min(0).max(20),
  floor: z.string().trim().max(40).optional(),
  finishing: z.enum(['Core & Shell', 'Semi-Finished', 'Fully Finished', 'Furnished']),
  priceEgp: z.coerce.number().min(1000).max(1_000_000_000),
  monthlyRentEgp: z.coerce.number().min(0).max(10_000_000).optional(),
  downPaymentEgp: z.coerce.number().min(0).max(1_000_000_000).optional(),
  installmentYears: z.coerce.number().int().min(0).max(30).optional(),
  monthlyInstallmentEgp: z.coerce.number().min(0).max(10_000_000).optional(),
  availability: z.enum(['Available', 'Reserved', 'Sold/Rented']).default('Available'),
  photos: z.array(z.string().max(2_000_000)).max(MAX_PHOTOS).optional(),
  notes: z.string().trim().max(4000).optional(),
  unitNumber: z.string().trim().max(60).optional(),
});

export async function POST(req: NextRequest) {
  if (req.headers.get('content-length') && Number(req.headers.get('content-length')) > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: 'Request is too large.' }, { status: 413 });
  }

  const body = await req.json().catch(() => null);
  const parsed = addListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid listing payload.' },
      { status: 400 },
    );
  }

  // Admin/Broker quick-add drawer calls with staff credentials → the listing
  // lands verified + PUBLISHABLE instead of the public REVIEW_REQUIRED queue.
  const auth = await verifyAdminRequest(req).catch(() => ({ authenticated: false }));
  const isInternal = auth.authenticated || parsed.data.submitterRole === 'Internal Agent';

  const result = await processAddListing(parsed.data, { isInternal });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error:
          result.error === 'invalid_phone'
            ? 'Enter a valid Egyptian mobile number (e.g. 01012345678).'
            : 'We could not save this listing right now. Please try again shortly.',
      },
      { status: result.error === 'invalid_phone' ? 400 : 503 },
    );
  }

  // Cache revalidation: the inventory feed + admin views must see the new
  // unit immediately (Next.js data cache + the inventory route's memory cache
  // was already busted inside the pipeline).
  revalidateTag('inventory', 'max');
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin');
    revalidatePath('/admin/console');
    revalidatePath('/properties');
    revalidatePath('/compounds');
  } catch {
    /* path revalidation is best-effort */
  }

  return NextResponse.json(
    {
      ok: true,
      unitCode: result.unitCode,
      listingId: result.listingId,
      action: result.action,
      mergedInto: result.mergedInto ?? null,
      photos: result.photos,
      sheetSync: result.sheetSync,
      telegramSent: result.telegram.ok,
      message:
        result.action === 'merged'
          ? `Duplicate detected (${result.unitCode}) — existing record updated with the new details instead of creating a second row.`
          : `Listing saved with unit code ${result.unitCode}. Our team will verify and publish it within 24 hours.`,
    },
    { status: result.action === 'merged' ? 200 : 201 },
  );
}
