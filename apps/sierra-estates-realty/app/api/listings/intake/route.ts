/**
 * POST /api/listings/intake
 *
 * Unified Add Listing & AI Intake endpoint (Phase 5):
 *  - Evaluates Arabic/English NLP confidence + PF Title (30-47 chars) & Bilingual
 *    Description (750-2,000 chars) quality metrics.
 *  - On full submit, runs the durable `listingSubmissionWorkflow` (Supabase persistence)
 *    and dispatches `upsert_units` to `WF_SHEET_WRITE_URL` when configured.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { start } from 'workflow/api';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { listingSubmissionWorkflow } from '@/lib/workflow/listing-submission-workflow';
import { evaluateIntakeQuality } from '@/lib/server/listing-intake-scoring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const analyzeSchema = z.object({
  action: z.literal('analyze'),
  rawText: z.string().optional().default(''),
  pfTitle: z.string().optional().default(''),
  description: z.string().optional().default(''),
  confidence: z.number().optional(),
});

const intakeListingSchema = z.object({
  action: z.literal('submit').optional().default('submit'),
  code: z.string().optional(),
  compound: z.string().min(1, 'Compound / Location is required').max(120),
  propertyType: z.string().min(1, 'Property type is required'),
  mode: z.enum(['sale', 'rent']),
  beds: z.coerce.number().int().min(0).optional().default(0),
  baths: z.coerce.number().int().min(0).optional().default(0),
  area: z.coerce.number().min(0).optional().default(0),
  gardenArea: z.coerce.number().min(0).optional().default(0),
  price: z.coerce.number().min(0, 'Price must be positive'),
  finishing: z.string().optional(),
  pfTitle: z.string().max(200).optional().default(''),
  description: z.string().max(6000).optional().default(''),
  confidence: z.number().optional(),
  ownerName: z.string().max(100).optional().default('صاحب الإعلان'),
  ownerType: z.string().optional().default('Owner'),
  mobile: z.string().max(30).optional().default(''),
  ownerPhone: z.string().max(30).optional().default(''),
  brokerPhone: z.string().max(30).optional().default(''),
  brokerName: z.string().max(100).optional().default(''),
  agentName: z.string().max(100).optional().default(''),
  employeeName: z.string().max(100).optional().default(''),
  submitterType: z.enum(['owner', 'broker', 'agent', 'employee', 'bot']).optional().default('owner'),
  rawText: z.string().optional().default(''),
  comment: z.string().max(6000).optional().default(''),
  photos: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  conflictAction: z.enum(['check_only', 'merge', 'new_code', 'overwrite']).optional(),
  baseVersion: z.string().optional(),
});

async function pushIntakeUnitToSheetWebhook(payload: {
  code: string;
  compound: string;
  propertyType: string;
  mode: 'sale' | 'rent';
  area: number;
  beds: number;
  baths: number;
  price: number;
  finishing?: string;
  ownerName: string;
  mobile: string;
  comment: string;
  pfTitle: string;
}): Promise<{ ok: boolean; skipped?: boolean; status?: number }> {
  const writeUrl = (process.env.WF_SHEET_WRITE_URL || '').trim();
  if (!writeUrl) return { ok: false, skipped: true };

  try {
    const nowIso = new Date().toISOString();
    const res = await fetch(writeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.WF_SHEET_WRITE_SECRET || '',
        action: 'upsert_units',
        tab: process.env.MASTER_INVENTORY_TAB || 'Master_Inventory',
        rows: [
          [
            payload.code,
            nowIso,
            nowIso,
            payload.mode === 'rent' ? 'Rent' : 'Sale',
            payload.compound,
            payload.propertyType,
            payload.area,
            payload.beds,
            payload.baths,
            'NULL',
            'NULL',
            payload.finishing || 'NULL',
            payload.price,
            'NULL',
            'FALSE',
            payload.ownerName || 'NULL',
            payload.mobile || 'NULL',
            'Not Contacted Yet',
            'Pending Verification',
            'web-intake',
            'NULL',
            'NULL',
            payload.pfTitle ? `${payload.pfTitle} | ${payload.comment}` : payload.comment || 'NULL',
          ],
        ],
      }),
      signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(5000)
        : undefined,
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false };
  }
}

export async function POST(request: Request) {
  const rateLimitResponse = await applyRateLimit(request, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    if (body.action === 'analyze') {
      const parsedAnalyze = analyzeSchema.safeParse(body);
      if (!parsedAnalyze.success) {
        return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 400 });
      }
      const quality = evaluateIntakeQuality({
        rawText: parsedAnalyze.data.rawText,
        pfTitle: parsedAnalyze.data.pfTitle,
        description: parsedAnalyze.data.description,
        explicitConfidence: parsedAnalyze.data.confidence,
      });
      return NextResponse.json({ ok: true, success: true, ...quality }, { status: 200 });
    }

    const parseResult = intakeListingSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const parsed = parseResult.data;
    const effectiveDescription = (parsed.description || parsed.comment || parsed.rawText || '').trim();
    const quality = evaluateIntakeQuality({
      rawText: parsed.rawText || effectiveDescription,
      pfTitle: parsed.pfTitle,
      description: effectiveDescription,
      explicitConfidence: parsed.confidence,
    });

    const workflowInput = {
      code: parsed.code,
      compound: parsed.compound,
      propertyType: parsed.propertyType,
      mode: parsed.mode,
      beds: parsed.beds,
      baths: parsed.baths,
      area: parsed.area,
      gardenArea: parsed.gardenArea,
      price: parsed.price,
      finishing: parsed.finishing,
      ownerName: parsed.ownerName,
      ownerType: parsed.ownerType,
      mobile: parsed.mobile,
      ownerPhone: parsed.ownerPhone,
      brokerPhone: parsed.brokerPhone,
      brokerName: parsed.brokerName,
      agentName: parsed.agentName,
      employeeName: parsed.employeeName,
      submitterType: parsed.submitterType,
      rawText: parsed.rawText || effectiveDescription,
      comment: effectiveDescription.slice(0, 2000),
      photos: parsed.photos,
      images: parsed.images,
      tags: parsed.tags,
      conflictAction: parsed.conflictAction,
      baseVersion: parsed.baseVersion,
      requestOrigin: new URL(request.url).origin,
    };

    const run = await start(listingSubmissionWorkflow, [workflowInput]);
    const result = await run.returnValue;

    if (result.success === false) {
      if (result.conflict) {
        return NextResponse.json({ ...result, quality }, { status: 409 });
      }
      return NextResponse.json(
        { success: false, error: result.message || 'Failed to submit listing', quality },
        { status: 500 },
      );
    }

    const wfSheetSync = await pushIntakeUnitToSheetWebhook({
      code: String(result.code || parsed.code || ''),
      compound: parsed.compound,
      propertyType: parsed.propertyType,
      mode: parsed.mode,
      area: parsed.area,
      beds: parsed.beds,
      baths: parsed.baths,
      price: parsed.price,
      finishing: parsed.finishing,
      ownerName: parsed.ownerName,
      mobile: parsed.mobile || parsed.ownerPhone || parsed.brokerPhone || '',
      comment: effectiveDescription,
      pfTitle: parsed.pfTitle,
    });

    return NextResponse.json(
      {
        ...result,
        quality,
        wfSheetSync,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process listing intake';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
