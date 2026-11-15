/**
 * SIERRA ESTATES — CLIENT REQUEST PIPELINE (Module 2)
 *
 * Server-side pipeline behind the /request & /add-request forms:
 *
 *   1. normalize the Egyptian phone to +20XXXXXXXXXX;
 *   2. run the automated inventory matcher against active Supabase listings
 *      (the same `status='available'|'active'` + PUBLISHABLE gate the public
 *      map uses — Hyde Park, Mountain View iCity and every other New Cairo
 *      compound), falling back to the Real_Available_Units sheet when the
 *      database is thin;
 *   3. write the request + top matched unit codes to Supabase
 *      (public.client_requests) AND append the standardized row to the
 *      Google Sheets `Client_Requests` tab via Sheets API v4 (auto-creating
 *      the tab + header row when missing);
 *   4. fire the formatted Telegram notification (client details + matched
 *      unit codes) to the sales lane.
 *
 * Used by BOTH the legacy /api/inquiries route (kept for the public form)
 * and the new Server Action so there is exactly one pipeline.
 */

import 'server-only';
import { listRecords, insertRecord, updateRecord } from '@sierra-estates/db';
import { rankMatches } from '@/lib/server/match-scoring';
import { toListingRecord } from '@/lib/server/listing-columns';
import type { Listing, ListingMode } from '@/lib/types';
import { normalizeEgyptianPhone } from '@/lib/utils/phone';
import {
  SHEET_TABS,
  SHEET_HEADERS,
  appendToManagedTab,
  updateSheetRowByKey,
} from '@/lib/services/GoogleSheetsV4Service';
import {
  sendTelegramNotification,
  formatClientRequestMessage,
  type TelegramSendResult,
} from '@/lib/services/TelegramNotifier';
import { logger } from '@/lib/logger';

export { normalizeEgyptianPhone };

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

export type ClientTransactionType = 'Sale' | 'Rent' | 'Primary' | 'Advisory';
export type ClientRequestStatus = 'New' | 'Contacted' | 'Viewing Scheduled' | 'Closed';

export interface ClientRequestInput {
  clientName: string;
  phone: string;
  email?: string | null;
  transactionType: ClientTransactionType;
  propertyType?: string | null;
  compoundZone?: string | null;
  budgetEgp?: number | null;
  areaSqm?: number | null;
  bedrooms?: number | null;
  promoApplied?: string | null;
  notes?: string | null;
  source?: string;
}

export interface MatchedUnitSummary {
  code: string;
  compound: string;
  score: number;
  reason: string;
}

export interface ClientRequestPipelineResult {
  ok: boolean;
  requestCode: string;
  supabaseId: string;
  phoneNormalized: string;
  matchedUnits: MatchedUnitSummary[];
  sheetSync: { ok: boolean; tab: string; error?: string };
  telegram: TelegramSendResult;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  STEP 1+2 — INVENTORY MATCHER                                       */
/* ------------------------------------------------------------------ */

/** Hard-coded EGP→USD fallback, mirroring the /api/inquiries conversion. */
const EGP_PER_USD = 50;

const PREFERRED_COMPOUND_ALIASES: Record<string, string[]> = {
  'hyde park': ['hyde park', 'hydepark', 'hp'],
  'mountain view icity': ['mountain view icity', 'icity', 'mountain view', 'mv icity', 'mountain view Hyde park'],
};

/** True when the listing's compound matches any requested zone token. */
function compoundMatchesRequest(listingCompound: string, compoundZone?: string | null): boolean {
  if (!compoundZone) return false;
  const zone = compoundZone.trim().toLowerCase();
  if (!zone) return false;
  const listing = listingCompound.toLowerCase();
  if (listing.includes(zone) || zone.includes(listing)) return true;
  for (const aliases of Object.values(PREFERRED_COMPOUND_ALIASES)) {
    const zoneIsAlias = aliases.some((a) => zone.includes(a));
    const listingIsAlias = aliases.some((a) => listing.includes(a));
    if (zoneIsAlias && listingIsAlias) return true;
  }
  return false;
}

/**
 * Automated inventory matcher — active Supabase listings first (the same
 * rows the public map serves), Real_Available_Units sheet fallback when the
 * database returns fewer than 3 candidates. Returns the top-N unit codes.
 */
export async function matchInventoryForRequest(input: ClientRequestInput, limit = 5): Promise<MatchedUnitSummary[]> {
  const answers = {
    budget: (input.budgetEgp ?? 0) / EGP_PER_USD,
    beds: input.bedrooms ?? 0,
    type: (input.propertyType ?? 'Apartment') as Listing['type'],
    mode: (input.transactionType === 'Rent' ? 'rent' : 'sale') as ListingMode,
    preferredZone: input.compoundZone as Listing['zone'],
  };

  let candidates: Listing[] = [];
  try {
    const rows = await listRecords<Record<string, unknown>>('listings', {
      where: [
        { column: 'status', op: 'in', value: ['active', 'available'] },
        { column: 'publish_status', op: 'eq', value: 'PUBLISHABLE' },
      ],
      limit: 500,
    });
    candidates = rows.map(toListingRecord) as unknown as Listing[];
  } catch (err) {
    logger.warn(`[ClientRequestPipeline] Supabase listing read failed: ${err instanceof Error ? err.message : err}`);
  }

  const ranked = rankMatches(candidates, answers, limit);

  const summaries = ranked.map((m) => ({
    code: m.listing.code,
    compound: m.listing.compound,
    score: Math.round(m.score),
    reason: m.reasons[0] ?? 'Inventory match',
  }));

  // Sheet fallback when the DB is thin — never fabricate units.
  if (summaries.length < 3) {
    try {
      const sheetMatches = await fetchRealAvailableMatches(input, limit - summaries.length);
      const seen = new Set(summaries.map((s) => s.code));
      for (const s of sheetMatches) {
        if (!seen.has(s.code)) summaries.push(s);
      }
    } catch (err) {
      logger.warn(
        `[ClientRequestPipeline] Real_Available_Units fallback failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  return summaries.slice(0, limit);
}

/** Read the Real_Available_Units tab (Sheets v4) and match heuristically. */
async function fetchRealAvailableMatches(
  input: ClientRequestInput,
  limit: number,
): Promise<MatchedUnitSummary[]> {
  const { getSheetsV4Client } = await import('@/lib/services/GoogleSheetsV4Service');
  const client = getSheetsV4Client();
  if (!client || limit <= 0) return [];

  const { sheets, spreadsheetId } = client;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_TABS.realAvailableUnits}!A:Z`,
  });
  const rows = res.data.values ?? [];
  if (rows.length < 2) return [];

  // Column indexes per the canonical REAL_HEADERS layout.
  const headers = rows[0].map((h) => String(h ?? '').trim());
  const col = (name: string) => headers.indexOf(name);
  const iCode = col('Unit_Code');
  const iCompound = col('Canonical_Compound');
  const iType = col('Unit_Type');
  const iPrice = col('Price_EGP');
  const iBeds = col('Bedrooms');
  if (iCode < 0) return [];

  const budget = input.budgetEgp ?? 0;
  const results: MatchedUnitSummary[] = [];
  for (let i = 1; i < rows.length && results.length < limit; i++) {
    const row = rows[i] ?? [];
    const code = String(row[iCode] ?? '').trim();
    if (!code) continue;
    const compound = String(row[iCompound] ?? '').trim();
    const price = Number(String(row[iPrice] ?? '').replace(/[^\d.]/g, '')) || 0;
    const beds = Number(row[iBeds] ?? 0) || 0;

    let score = 30;
    const reasons: string[] = ['Available inventory'];
    if (input.compoundZone && compoundMatchesRequest(compound, input.compoundZone)) {
      score += 40;
      reasons.push('compound match');
    }
    if (budget > 0 && price > 0 && price <= budget) {
      score += 30;
      reasons.push('within budget');
    }
    if (input.bedrooms && beds === input.bedrooms) {
      score += 15;
      reasons.push('bedrooms match');
    }
    if (input.propertyType) {
      const unitType = String(row[iType] ?? '').toLowerCase();
      if (unitType && unitType.includes(input.propertyType.toLowerCase())) {
        score += 10;
        reasons.push('type match');
      }
    }
    if (score >= 45) {
      results.push({ code, compound, score, reason: reasons.join(' · ') });
    }
  }
  return results.sort((a, b) => b.score - a.score);
}

/* ------------------------------------------------------------------ */
/*  STEP 3+4 — DUAL WRITE + TELEGRAM                                   */
/* ------------------------------------------------------------------ */

function buildSheetRow(request: {
  requestCode: string;
  createdAt: Date;
  phoneNormalized: string;
  input: ClientRequestInput;
  matchedCodes: string[];
  status: ClientRequestStatus;
  assignedAgent?: string | null;
}): (string | number)[] {
  return [
    request.requestCode,
    request.createdAt.toISOString(),
    request.input.clientName,
    request.phoneNormalized,
    request.input.transactionType,
    request.input.propertyType ?? '',
    request.input.compoundZone ?? '',
    request.input.budgetEgp ?? '',
    request.input.areaSqm ?? '',
    request.input.bedrooms ?? '',
    request.input.promoApplied ?? '',
    request.matchedCodes.join(', '),
    request.assignedAgent ?? '',
    request.status,
    request.input.notes ?? '',
  ];
}

export interface ProcessClientRequestOptions {
  /** Skip the Telegram send (e.g. admin re-sync path). */
  skipTelegram?: boolean;
  assignedAgent?: string | null;
}

/**
 * The complete Module-2 pipeline. Supabase is the system of record: a failed
 * DB write fails the request (returns ok:false). The Sheets append and the
 * Telegram notification are best-effort but HONESTLY reported.
 */
export async function processClientRequest(
  input: ClientRequestInput,
  options: ProcessClientRequestOptions = {},
): Promise<ClientRequestPipelineResult> {
  const phoneNormalized = normalizeEgyptianPhone(input.phone);
  if (!phoneNormalized) {
    return {
      ok: false,
      requestCode: '',
      supabaseId: '',
      phoneNormalized: input.phone,
      matchedUnits: [],
      sheetSync: { ok: false, tab: SHEET_TABS.clientRequests, error: 'not_attempted' },
      telegram: { ok: false, error: 'not_attempted' },
      error: 'invalid_phone',
    };
  }

  // 2. Matcher
  const matchedUnits = await matchInventoryForRequest(input);

  // 3a. Supabase — system of record.
  const createdAt = new Date();
  let requestCode = '';
  let supabaseId = '';
  try {
    const inserted = await insertRecord<{ id: string; requestCode: string }>('client_requests', {
      clientName: input.clientName,
      phoneNormalized,
      email: input.email ?? null,
      transactionType: input.transactionType,
      propertyType: input.propertyType ?? null,
      compoundZone: input.compoundZone ?? null,
      budgetEgp: input.budgetEgp ?? null,
      areaSqm: input.areaSqm ?? null,
      bedrooms: input.bedrooms ?? null,
      promoApplied: input.promoApplied ?? null,
      matchedUnitCodes: matchedUnits.map((m) => m.code),
      assignedAgent: options.assignedAgent ?? null,
      status: 'New',
      notes: input.notes ?? null,
      source: input.source ?? 'website',
      createdAt: createdAt.toISOString(),
    });
    supabaseId = inserted.id;
    requestCode = inserted.requestCode;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[ClientRequestPipeline] Supabase insert failed: ${message}`);
    return {
      ok: false,
      requestCode: '',
      supabaseId: '',
      phoneNormalized,
      matchedUnits,
      sheetSync: { ok: false, tab: SHEET_TABS.clientRequests, error: 'not_attempted' },
      telegram: { ok: false, error: 'not_attempted' },
      error: `supabase_write_failed: ${message}`,
    };
  }

  // 3b. Google Sheets `Client_Requests` append (tab auto-created if missing).
  const sheetRow = buildSheetRow({
    requestCode,
    createdAt,
    phoneNormalized,
    input,
    matchedCodes: matchedUnits.map((m) => m.code),
    status: 'New',
    assignedAgent: options.assignedAgent,
  });
  const sheetSync = await appendToManagedTab({
    tab: SHEET_TABS.clientRequests,
    headers: SHEET_HEADERS.clientRequests,
    values: sheetRow,
  });
  if (sheetSync.ok) {
    try {
      await updateRecord('client_requests', supabaseId, {
        sheetSyncedAt: new Date().toISOString(),
      });
    } catch {
      /* informational stamp only */
    }
  }

  // 4. Telegram — formatted alert to the sales lane.
  let telegram: TelegramSendResult = { ok: false, error: 'skipped' };
  if (!options.skipTelegram) {
    telegram = await sendTelegramNotification(
      formatClientRequestMessage({
        requestId: requestCode,
        clientName: input.clientName,
        phone: phoneNormalized,
        transactionType: input.transactionType,
        propertyType: input.propertyType ?? null,
        compoundZone: input.compoundZone ?? null,
        budgetEgp: input.budgetEgp ?? null,
        bedrooms: input.bedrooms ?? null,
        promoApplied: input.promoApplied ?? null,
        matchedUnitCodes: matchedUnits.map((m) => m.code),
        notes: input.notes ?? null,
      }),
      { role: 'sales_advisor' },
    );
  }

  return {
    ok: true,
    requestCode,
    supabaseId,
    phoneNormalized,
    matchedUnits,
    sheetSync,
    telegram,
  };
}

/* ------------------------------------------------------------------ */
/*  TWO-WAY STATUS SYNC                                                */
/* ------------------------------------------------------------------ */

export const CLIENT_REQUEST_STATUSES: readonly ClientRequestStatus[] = [
  'New',
  'Contacted',
  'Viewing Scheduled',
  'Closed',
];

/**
 * Status update helper — writes Supabase (system of record) and the
 * `Client_Requests` sheet row (matched on Request_ID) in one call so Admin
 * edits and Sheets edits never drift. Returns honest per-target results.
 */
export async function syncClientRequestStatus(params: {
  requestCode: string;
  status: ClientRequestStatus;
  assignedAgent?: string | null;
  notes?: string | null;
  /** 'admin' = Admin console edit; 'sheets' = Apps Script/sheet-side edit. */
  origin: 'admin' | 'sheets';
}): Promise<{ supabase: boolean; sheet: boolean }> {
  const rows = await listRecords<{ id: string }>('client_requests', {
    select: 'id',
    where: [{ column: 'request_code', value: params.requestCode }],
    limit: 1,
  });
  const row = rows[0];
  if (!row) return { supabase: false, sheet: false };

  let supabaseOk = true;
  try {
    await updateRecord('client_requests', row.id, {
      status: params.status,
      ...(params.assignedAgent !== undefined ? { assignedAgent: params.assignedAgent ?? null } : {}),
      ...(params.notes !== undefined ? { notes: params.notes ?? null } : {}),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    supabaseOk = false;
    logger.error(
      `[ClientRequestPipeline] status sync Supabase failed: ${err instanceof Error ? err.message : err}`,
    );
  }

  let sheetOk = false;
  if (params.origin === 'admin') {
    const updated = await updateSheetRowByKey({
      tab: SHEET_TABS.clientRequests,
      headers: SHEET_HEADERS.clientRequests,
      keyColumn: 'Request_ID',
      keyValue: params.requestCode,
      updates: {
        Status: params.status,
        ...(params.assignedAgent !== undefined ? { Assigned_Agent: params.assignedAgent ?? '' } : {}),
        ...(params.notes !== undefined ? { Notes: params.notes ?? '' } : {}),
      },
    });
    sheetOk = updated.ok;
  }

  return { supabase: supabaseOk, sheet: sheetOk };
}
