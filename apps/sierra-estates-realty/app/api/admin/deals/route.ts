/**
 * /api/admin/deals — the live deal pipeline (public.deals) behind the
 * admin SPA's Deals Pipeline kanban.
 *
 * GET  (manager+)  — every deal, each enriched with its client (public.leads)
 *                    and unit (public.listings) so the kanban card can show
 *                    who is buying what without a second round trip.
 *                    Partner accounts only see deals whose lead/listing falls
 *                    inside their portfolio scope.
 * POST (admin)     — create a deal from a CRM lead (the kanban's
 *                    "+ New Deal" modal). commission_amount is derived from
 *                    deal_value × commission_percentage server-side so the
 *                    client can never write an inconsistent number.
 *
 * Schema (public.deals; snake_case in Postgres, camelCase over the wire):
 *   stage CHECK (stage IN ('proposal','viewing','offer_made','under_contract',
 *                          'closing','closed_won','closed_lost'))
 *   deal_value NUMERIC(15,2) NOT NULL, commission_percentage NUMERIC(5,2),
 *   commission_amount NUMERIC(15,2), closing_probability INT (0..100),
 *   target_closing_date DATE, notes TEXT, metadata JSONB
 *
 * ANTI-FABRICATION: the endpoint only returns rows that exist. An empty
 * pipeline returns [] — never seeded demo deals (see data-constants.ts).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest, verifyPortalRequest } from '@/lib/server/auth-guard';
import { listRecords, getRecord, insertRecord, type RecordData } from '@sierra-estates/db';
import { leadInScope, listingInScope } from '@/lib/server/partner-scope';
import { logger } from '@/lib/logger';
import { DEAL_STAGES, type DealStage } from '@/lib/server/deal-stages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const dealCreateSchema = z.object({
  leadId: z.string().min(1).max(128),
  listingId: z.string().max(128).optional().nullable(),
  dealValue: z.number().min(0).max(10_000_000_000),
  stage: z.enum(DEAL_STAGES).optional(),
  commissionPercentage: z.number().min(0).max(100).optional(),
  closingProbability: z.number().int().min(0).max(100).optional(),
  targetClosingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
    .optional()
    .nullable(),
  notes: z.string().max(2000).optional(),
});

/** numeric columns come back from Postgres as strings — normalize to number. */
function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function rowToSpaDeal(
  row: RecordData,
  leadById: Map<string, RecordData>,
  listingById: Map<string, RecordData>
) {
  const lead = row.leadId ? leadById.get(String(row.leadId)) : undefined;
  const listing = row.listingId ? listingById.get(String(row.listingId)) : undefined;
  return {
    id: String(row.id),
    leadId: (row.leadId as string) ?? null,
    listingId: (row.listingId as string) ?? null,
    agentId: (row.agentId as string) ?? null,
    stage: (row.stage as DealStage) ?? 'proposal',
    dealValue: num(row.dealValue),
    commissionPercentage: num(row.commissionPercentage),
    commissionAmount: num(row.commissionAmount),
    closingProbability:
      typeof row.closingProbability === 'number' ? row.closingProbability : num(row.closingProbability),
    targetClosingDate: (row.targetClosingDate as string) ?? null,
    notes: (row.notes as string) ?? '',
    metadata: row.metadata ?? {},
    client: lead
      ? {
          id: String(lead.id),
          name: (lead.fullName as string) || 'Inbound Client',
          phone: (lead.phone as string) || '',
          source: (lead.source as string) ?? null,
        }
      : null,
    listing: listing
      ? {
          id: String(listing.id),
          code: (listing.code as string) ?? null,
          compound: (listing.compound as string) ?? null,
          title: (listing.title as string) ?? null,
          status: (listing.status as string) ?? null,
        }
      : null,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}

export async function GET(req: NextRequest) {
  const auth = await verifyPortalRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsedLimit = parseInt(new URL(req.url).searchParams.get('limit') || '500', 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 500;

    const [rows, leadRows, listingRows] = await Promise.all([
      listRecords('deals', {
        limit,
        orderBy: { column: 'updatedAt', ascending: false },
        select: 'id,lead_id,listing_id,agent_id,stage,deal_value,commission_percentage,commission_amount,closing_probability,target_closing_date,notes,metadata,created_at,updated_at',
      }),
      // Lightweight projections for the joins — never pull embeddings/media.
      listRecords('leads', { select: 'id,full_name,phone,source,target_compound', limit: 2000 }),
      listRecords('listings', { select: 'id,code,compound,title,status,developer', limit: 5000 }),
    ]);

    const leadById = new Map(leadRows.map((l) => [String(l.id), l as RecordData]));
    const listingById = new Map(listingRows.map((l) => [String(l.id), l as RecordData]));

    let deals = rows.map((row) => rowToSpaDeal(row as RecordData, leadById, listingById));

    // Partner accounts: only deals whose client lead or unit listing falls
    // inside their own portfolio scope (mirrors /api/admin/leads).
    if (auth.access === 'partner') {
      deals = deals.filter((d) => {
        const lead = d.leadId ? leadById.get(d.leadId) : undefined;
        const listing = d.listingId ? listingById.get(d.listingId) : undefined;
        return leadInScope(lead ?? null, auth.scope) || listingInScope(listing ?? null, auth.scope);
      });
    }

    return NextResponse.json({ success: true, deals, count: deals.length, stages: DEAL_STAGES });
  } catch (err) {
    logger.error('Error fetching deals:', err);
    return NextResponse.json(
      { error: 'Failed to fetch deals', details: err instanceof Error ? err.message : 'Unknown error' },
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
    const parsed = dealCreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid deal payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { leadId, listingId, dealValue, stage, commissionPercentage, closingProbability, targetClosingDate, notes } =
      parsed.data;

    // The deal must hang off a real lead — a kanban card without a client is
    // exactly the kind of fabricated row §21 forbids.
    const lead = await getRecord('leads', leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    if (listingId) {
      const listing = await getRecord('listings', listingId);
      if (!listing) {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
      }
    }

    const pct = commissionPercentage ?? 2.5;
    const now = new Date().toISOString();
    const deal = await insertRecord<RecordData>('deals', {
      id: `deal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      leadId,
      listingId: listingId || undefined,
      stage: stage ?? 'proposal',
      dealValue,
      commissionPercentage: pct,
      commissionAmount: Math.round(dealValue * (pct / 100) * 100) / 100,
      closingProbability: closingProbability ?? (stage === 'closed_won' ? 100 : 50),
      targetClosingDate: targetClosingDate || undefined,
      notes: notes || undefined,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      deal: rowToSpaDeal(deal, new Map([[leadId, lead as RecordData]]), new Map()),
    });
  } catch (err) {
    logger.error('Error creating deal:', err);
    return NextResponse.json(
      { error: 'Failed to create deal', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
