/**
 * RequestSheetSyncService — Real-time synchronization for Buyer Requests & Viewing Demands.
 *
 * Connects:
 *   - Google Sheets (Tab: `Client_Requests` / `Requests`)
 *   - Supabase PostgreSQL (`public.inquiries`, `public.viewings`, `public.leads`)
 *   - Admin Intelligence OS (`/admin` -> Requests Online Spreadsheet)
 *   - Local JSON mirror (`data/online-sheet-requests.json`)
 */

import fs from 'fs';
import path from 'path';
import { listRecords, insertRecord, updateRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';

export interface RequestSheetRow {
  id: string;
  type: 'buyer_demand' | 'viewing_request';
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  mode: 'sale' | 'rent' | 'resale';
  preferredZone: string;
  unitType: string;
  bedrooms?: number;
  budget?: string | number;
  finishing?: string;
  campaign?: string;
  voucherCode?: string;
  targetDate?: string;
  matchedUnits?: string[];
  status: 'new' | 'contacted' | 'viewing_scheduled' | 'closed';
  notes?: string;
  createdAt: string;
  source: string;
}

export interface RequestSyncResult {
  ok: boolean;
  row?: number;
  sheet?: string;
  error?: string;
}

function resolveRequestsDataFile(): string {
  const cwd = process.cwd();
  const candidate = path.resolve(cwd, 'data', 'online-sheet-requests.json');
  const dir = path.dirname(candidate);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return candidate;
}

export function loadLocalRequestsMirror(): RequestSheetRow[] {
  try {
    const file = resolveRequestsDataFile();
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      return JSON.parse(content || '[]');
    }
  } catch (err) {
    logger.warn('[REQUEST_SHEET] Error reading local requests mirror:', err);
  }
  return [];
}

export function saveLocalRequestsMirror(rows: RequestSheetRow[]): void {
  try {
    const file = resolveRequestsDataFile();
    fs.writeFileSync(file, JSON.stringify(rows, null, 2), 'utf8');
  } catch (err) {
    logger.warn('[REQUEST_SHEET] Error saving local requests mirror:', err);
  }
}

/**
 * Forward a single buyer request / viewing demand to the Google Apps Script Web App
 * and persist to the local spreadsheet mirror.
 */
export async function syncRequestToSheet(
  requestData: Partial<RequestSheetRow> & { clientName: string; clientPhone: string },
  timeoutMs = 30_000
): Promise<RequestSyncResult> {
  const now = new Date().toISOString();
  const id = requestData.id || `REQ-${Date.now().toString(36).toUpperCase()}`;

  const fullRow: RequestSheetRow = {
    id,
    type: requestData.type || 'buyer_demand',
    clientName: requestData.clientName,
    clientPhone: requestData.clientPhone,
    clientEmail: requestData.clientEmail || '',
    mode: requestData.mode || 'sale',
    preferredZone: requestData.preferredZone || '',
    unitType: requestData.unitType || '',
    bedrooms: requestData.bedrooms ?? 0,
    budget: requestData.budget || 'Open',
    finishing: requestData.finishing || 'Any',
    campaign: requestData.campaign || '',
    voucherCode: requestData.voucherCode || '',
    targetDate: requestData.targetDate || '',
    matchedUnits: requestData.matchedUnits || [],
    status: requestData.status || 'new',
    notes: requestData.notes || '',
    createdAt: requestData.createdAt || now,
    source: requestData.source || 'website',
  };

  // 1. Update local JSON mirror immediately for zero-latency admin UI
  const existingRows = loadLocalRequestsMirror();
  const index = existingRows.findIndex((r) => r.id === fullRow.id);
  if (index >= 0) {
    existingRows[index] = { ...existingRows[index], ...fullRow };
  } else {
    existingRows.unshift(fullRow);
  }
  saveLocalRequestsMirror(existingRows);

  // 2. Dispatch to Google Apps Script Web App
  const url = process.env.SHEETS_WEBAPP_URL || process.env.WF_SHEET_WRITE_URL;
  const secret =
    // Fail-closed: env-only secret chain — the hardcoded legacy literal was
    // removed (rotation point: SIERRA_SECRET_KEY). An empty secret makes the
    // Apps Script reject the write; the DB/local-mirror save still succeeds.
    process.env.SIERRA_SECRET_KEY ||
    process.env.SHEETS_WEBAPP_SECRET ||
    process.env.WF_SHEET_WRITE_SECRET ||
    '';

  if (!url) {
    logger.info('[REQUEST_SHEET] SHEETS_WEBAPP_URL not configured — saved to local requests mirror & DB.');
    return { ok: true, sheet: 'Client_Requests (Local Mirror)' };
  }

  const payload = {
    action: 'request_submission',
    secret,
    tab: 'Client_Requests',
    request: {
      ...fullRow,
      matchedUnitsStr: (fullRow.matchedUnits || []).join(', '),
    },
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Apps Script responded HTTP ${res.status}`);
    }

    const text = await res.text();
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = { ok: true, raw: text };
    }

    return {
      ok: true,
      row: json.row,
      sheet: json.sheet || 'Client_Requests',
    };
  } catch (err: any) {
    logger.warn('[REQUEST_SHEET] Google Sheet sync dispatch warning:', err.message);
    // honest failure: ok:true here masked dispatch outages
    return { ok: false, error: err.message, sheet: 'Client_Requests (Local Mirror only — Apps Script dispatch failed)' };
  }
}

/**
 * Retrieve all unified requests for the online spreadsheet:
 * Combines Supabase `inquiries` and `viewings` with the local spreadsheet mirror.
 */
export async function getRequestsSpreadsheetRows(): Promise<RequestSheetRow[]> {
  const mergedMap = new Map<string, RequestSheetRow>();

  // 1. Seed from local JSON mirror
  const localRows = loadLocalRequestsMirror();
  for (const r of localRows) {
    mergedMap.set(r.id, r);
  }

  // 2. Load from Supabase `inquiries`
  try {
    const inquiries = await listRecords<Record<string, any>>('inquiries', {
      orderBy: { column: 'createdAt', ascending: false },
      limit: 300,
    });

    for (const inq of inquiries) {
      const id = inq.id || `INQ-${inq.phone}`;
      const mode = (inq.mode || inq.dealType || 'sale') as 'sale' | 'rent' | 'resale';
      const row: RequestSheetRow = {
        id,
        type: 'buyer_demand',
        clientName: inq.name || inq.fullName || 'Client',
        clientPhone: inq.phone || '',
        clientEmail: inq.email || '',
        mode: ['sale', 'rent', 'resale'].includes(mode) ? mode : 'sale',
        preferredZone: inq.zone || (Array.isArray(inq.compounds) ? inq.compounds.join(', ') : inq.compounds) || '',
        unitType: inq.unitType || inq.propertyType || inq.type || '',
        bedrooms: inq.bedrooms ?? undefined,
        budget: inq.budgetMax ? `${inq.budgetMin || 0} - ${inq.budgetMax} EGP` : inq.budget || 'Open',
        finishing: inq.finishing || 'Any',
        campaign: inq.campaign || (inq.voucherCode ? `Black Friday (${inq.discountPercent || 25}%)` : ''),
        voucherCode: inq.voucherCode || '',
        targetDate: inq.targetDate || '',
        matchedUnits: Array.isArray(inq.matchedUnits)
          ? inq.matchedUnits
          : Array.isArray(inq.matched_unit_codes)
            ? inq.matched_unit_codes
            : mergedMap.get(id)?.matchedUnits || [],
        status: (inq.status?.toLowerCase().includes('close') ? 'closed' : inq.status?.toLowerCase().includes('contact') ? 'contacted' : 'new'),
        notes: inq.notes || '',
        createdAt: inq.createdAt || new Date().toISOString(),
        source: inq.source || 'website_inquiry',
      };

      if (!mergedMap.has(id)) {
        mergedMap.set(id, row);
      } else {
        const existing = mergedMap.get(id)!;
        mergedMap.set(id, {
          ...row,
          ...existing,
          matchedUnits:
            existing.matchedUnits && existing.matchedUnits.length > 0
              ? existing.matchedUnits
              : row.matchedUnits,
        });
      }
    }
  } catch (err) {
    logger.warn('[REQUEST_SHEET] Error loading inquiries from DB:', err);
  }

  // 3. Load from Supabase `viewings`
  try {
    const viewings = await listRecords<Record<string, any>>('viewings', {
      orderBy: { column: 'createdAt', ascending: false },
      limit: 200,
    });

    for (const v of viewings) {
      const id = v.id || `VIEW-${v.propertyCode}-${v.visitorPhone}`;
      const row: RequestSheetRow = {
        id,
        type: 'viewing_request',
        clientName: v.visitorName || 'Visitor',
        clientPhone: v.visitorPhone || '',
        clientEmail: v.visitorEmail || '',
        mode: 'resale',
        preferredZone: v.propertyCode ? `Unit ${v.propertyCode}` : '',
        unitType: 'Viewing Request',
        bedrooms: undefined,
        budget: 'Viewing',
        finishing: 'As Inspected',
        campaign: 'Viewing Tour',
        voucherCode: '',
        targetDate: `${v.preferredDate || ''} ${v.preferredTime || ''}`.trim(),
        matchedUnits: v.propertyCode ? [v.propertyCode] : [],
        status: v.status === 'confirmed' ? 'viewing_scheduled' : v.status === 'completed' ? 'closed' : 'new',
        notes: v.notes || v.message || '',
        createdAt: v.createdAt || new Date().toISOString(),
        source: 'viewing_request',
      };

      if (!mergedMap.has(id)) {
        mergedMap.set(id, row);
      } else {
        const prev = mergedMap.get(id)!;
        mergedMap.set(id, {
          ...row,
          ...prev,
          matchedUnits:
            prev.matchedUnits && prev.matchedUnits.length > 0
              ? prev.matchedUnits
              : row.matchedUnits,
        });
      }
    }
  } catch (err) {
    logger.warn('[REQUEST_SHEET] Error loading viewings from DB:', err);
  }

  const allRows = Array.from(mergedMap.values());
  allRows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return allRows;
}
