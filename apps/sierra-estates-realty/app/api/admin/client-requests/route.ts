/**
 * /api/admin/client-requests — Admin console surface for the Module-2
 * Client_Requests pipeline (public.client_requests + Google Sheets tab).
 *
 *   GET  ?status=&q=&limit=   → rows + funnel stats (reads Supabase, the
 *                               system of record; falls back to the Sheets
 *                               tab when the table is empty/unreachable).
 *   PATCH { requestCode, status, assignedAgent?, notes? }
 *                            → two-way sync: Supabase update + in-place
 *                               Client_Requests sheet row update (matched on
 *                               Request_ID), so Admin edits and Sheets edits
 *                               never drift and never revert on reload.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { listRecords } from '@sierra-estates/db';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import {
  CLIENT_REQUEST_STATUSES,
  syncClientRequestStatus,
} from '@/lib/services/ClientRequestPipeline';
import { SHEET_TABS, getSheetsV4Client } from '@/lib/services/GoogleSheetsV4Service';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  requestCode: z.string().trim().min(3).max(60),
  status: z.enum(['New', 'Contacted', 'Viewing Scheduled', 'Closed']),
  assignedAgent: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const params = new URL(req.url).searchParams;
    const status = params.get('status') ?? '';
    const q = (params.get('q') ?? '').trim().toLowerCase();
    const limit = Math.min(Math.max(parseInt(params.get('limit') ?? '200', 10) || 200, 1), 500);

    const where: { column: string; value: unknown }[] = [];
    if (CLIENT_REQUEST_STATUSES.includes(status as never)) {
      where.push({ column: 'status', value: status });
    }

    let rows: Record<string, unknown>[] = [];
    try {
      rows = await listRecords<Record<string, unknown>>('client_requests', {
        where,
        orderBy: { column: 'created_at', ascending: false },
        limit,
      });
    } catch (err) {
      logger.warn(
        `[admin/client-requests] Supabase read failed, falling back to sheet: ${err instanceof Error ? err.message : err}`,
      );
    }

    // Sheets fallback — the Client_Requests tab is the secondary copy.
    if (rows.length === 0) {
      const sheetRows = await readClientRequestsSheet();
      const filtered = sheetRows.filter((r) => {
        if (status && r.status !== status) return false;
        if (q && !`${r.requestCode} ${r.clientName} ${r.phone}`.toLowerCase().includes(q)) return false;
        return true;
      });
      return NextResponse.json({
        ok: true,
        source: 'sheet',
        rows: filtered.slice(0, limit),
        stats: computeStats(filtered),
        sheetTab: SHEET_TABS.clientRequests,
        updatedAt: new Date().toISOString(),
      });
    }

    const filtered = q
      ? rows.filter((r) =>
          `${r.requestCode ?? ''} ${r.clientName ?? ''} ${r.phoneNormalized ?? ''}`
            .toLowerCase()
            .includes(q))
      : rows;

    return NextResponse.json({
      ok: true,
      source: 'supabase',
      rows: filtered,
      stats: computeStats(filtered),
      sheetTab: SHEET_TABS.clientRequests,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[admin/client-requests] GET failed: ${message}`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid patch.' },
        { status: 400 },
      );
    }
    const { requestCode, status, assignedAgent, notes } = parsed.data;

    const result = await syncClientRequestStatus({
      requestCode,
      status,
      assignedAgent,
      notes,
      origin: 'admin',
    });

    if (!result.supabase && !result.sheet) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      requestCode,
      status,
      supabase: result.supabase,
      sheet: result.sheet,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[admin/client-requests] PATCH failed: ${message}`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */

interface SheetRowView {
  requestCode: string;
  timestamp: string;
  clientName: string;
  phone: string;
  transactionType: string;
  propertyType: string;
  compoundZone: string;
  budgetEgp: string;
  bedrooms: string;
  promoApplied: string;
  matchedUnitCodes: string;
  assignedAgent: string;
  status: string;
  notes: string;
}

/** Read the Client_Requests sheet tab into console-shaped rows. */
async function readClientRequestsSheet(): Promise<SheetRowView[]> {
  const client = getSheetsV4Client();
  if (!client) return [];
  try {
    const res = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.spreadsheetId,
      range: `${SHEET_TABS.clientRequests}!A:O`,
    });
    const values = res.data.values ?? [];
    const header = values[0] ?? [];
    const idx = (name: string) => header.indexOf(name);
    const out: SheetRowView[] = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i] ?? [];
      out.push({
        requestCode: String(row[idx('Request_ID')] ?? ''),
        timestamp: String(row[idx('Timestamp')] ?? ''),
        clientName: String(row[idx('Client_Name')] ?? ''),
        phone: String(row[idx('Phone_Normalized')] ?? ''),
        transactionType: String(row[idx('Transaction_Type')] ?? ''),
        propertyType: String(row[idx('Property_Type')] ?? ''),
        compoundZone: String(row[idx('Compound_Zone')] ?? ''),
        budgetEgp: String(row[idx('Budget_EGP')] ?? ''),
        bedrooms: String(row[idx('Bedrooms')] ?? ''),
        promoApplied: String(row[idx('Promo_Applied')] ?? ''),
        matchedUnitCodes: String(row[idx('Matched_Unit_Codes')] ?? ''),
        assignedAgent: String(row[idx('Assigned_Agent')] ?? ''),
        status: String(row[idx('Status')] ?? 'New'),
        notes: String(row[idx('Notes')] ?? ''),
      });
    }
    return out;
  } catch (err) {
    logger.warn(
      `[admin/client-requests] sheet read failed: ${err instanceof Error ? err.message : err}`,
    );
    return [];
  }
}

function computeStats(rows: Array<Record<string, unknown> | SheetRowView>): Record<string, number> {
  return {
    total: rows.length,
    new: rows.filter((r) => r.status === 'New').length,
    contacted: rows.filter((r) => r.status === 'Contacted').length,
    scheduled: rows.filter((r) => r.status === 'Viewing Scheduled').length,
    closed: rows.filter((r) => r.status === 'Closed').length,
    withPromo: rows.filter((r) => Boolean(r.promoApplied)).length,
    withMatches: rows.filter(
      (r) =>
        (Array.isArray(r.matchedUnitCodes) && (r.matchedUnitCodes as string[]).length > 0) ||
        (typeof r.matchedUnitCodes === 'string' && r.matchedUnitCodes.trim() !== ''),
    ).length,
  };
}
