/**
 * POST /api/listings/submit
 *
 * Public listing submission endpoint, reachable from the /add-listing form.
 *
 * Validates the request payload and triggers a durable workflow that persists the
 * listing, syncs side effects, and returns the canonical response shape expected
 * by the client.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { start } from 'workflow/api';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { listingSubmissionWorkflow } from '@/lib/workflow/listing-submission-workflow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const submitListingSchema = z.object({
  code: z.string().optional(),
  compound: z.string().min(1, 'Compound / Location is required').max(100),
  propertyType: z.string().min(1, 'Property type is required'),
  mode: z.enum(['sale', 'rent']),
  beds: z.coerce.number().int().min(0),
  baths: z.coerce.number().int().min(0),
  area: z.coerce.number().min(0),
  gardenArea: z.coerce.number().min(0).optional().default(0),
  price: z.coerce.number().min(0, 'Price must be positive'),
  finishing: z.string().optional(),
  ownerName: z.string().max(100).optional().default('صاحب الإعلان'),
  ownerType: z.string().optional().default('Owner'),
  mobile: z.string().max(30).optional().default(''),
  ownerPhone: z.string().max(30).optional().default(''),
  brokerPhone: z.string().max(30).optional().default(''),
  brokerName: z.string().max(100).optional().default(''),
  agentName: z.string().max(100).optional().default(''),
  submitterType: z.enum(['owner', 'broker', 'employee', 'bot']).optional().default('owner'),
  rawText: z.string().optional().default(''),
  comment: z.string().max(2000).optional().default(''),
  photos: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  conflictAction: z.enum(['check_only', 'merge', 'new_code', 'overwrite']).optional(),
  baseVersion: z.string().optional(),
});

export async function POST(request: Request) {
  const rateLimitResponse = await applyRateLimit(request, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = submitListingSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const data = {
      ...parseResult.data,
      requestOrigin: new URL(request.url).origin,
    };

    const run = await start(listingSubmissionWorkflow, [data]);
    const result = await run.returnValue;

    if (result.success === false) {
      if (result.conflict) {
        return NextResponse.json(result, { status: 409 });
      }

      return NextResponse.json(
        { success: false, error: result.message || 'Failed to submit listing' },
        { status: 500 },
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit listing';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
