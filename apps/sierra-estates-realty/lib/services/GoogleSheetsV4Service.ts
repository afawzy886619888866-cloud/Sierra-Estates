/**
 * SIERRA ESTATES — GOOGLE SHEETS V4 CANONICAL WRITER
 *
 * Direct Google Sheets API v4 writer (service-account auth) used by the
 * public intake flows (Client_Requests, Careers_Applicants) and the
 * inventory pipeline (Owners Master, Master_Inventory, Real_Available_Units).
 *
 * Why this exists alongside the legacy bridges:
 *   - `SheetsIntegrationService` writes Master_Inventory/Real_Available_Units
 *     but never creates the tab or writes the header row when missing, and
 *     swallows auth failures.
 *   - `RequestSheetSyncService` / `CareerSheetSyncService` POST to a Google
 *     Apps Script web app (SHEETS_WEBAPP_URL) and report `ok: true` even
 *     when the write failed — callers cannot detect a lost row.
 *
 * This service talks to Sheets v4 directly and:
 *   1. auto-creates the tab (batchUpdate addSheet) when missing;
 *   2. writes the canonical header row when missing;
 *   3. appends rows (values.append, USER_ENTERED);
 *   4. updates a row in place (values.update) by scanning a key column —
 *      the two-way status sync for Client_Requests / Careers_Applicants;
 *   5. returns an HONEST result (`ok` is only true when the API accepted
 *      the write); failures are logged, never silently downgraded.
 *
 * Env contract (.env.example documents all of these):
 *   GOOGLE_SERVICE_ACCOUNT_KEY   service-account JSON (raw or base64)
 *   GOOGLE_SERVICE_ACCOUNT_JSON  alias
 *   GOOGLE_SHEET_ID              master spreadsheet id (alias chain below)
 */

import { google } from 'googleapis';
import { logger } from '@/lib/logger';

export const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

/** Canonical spreadsheet id, resolved through the documented alias chain. */
export function resolveSpreadsheetId(): string {
  return (
    process.env.GOOGLE_SHEET_ID ||
    process.env.TELEGRAM_MASTER_SHEET_ID ||
    process.env.UNITS_SHEET_ID ||
    process.env.MASTER_SHEET_ID ||
    ''
  ).trim();
}

/** Service-account credentials from env (raw JSON or base64). */
function parseServiceAccountKey(): Record<string, unknown> | null {
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyRaw) return null;
  try {
    return keyRaw.trim().startsWith('{')
      ? JSON.parse(keyRaw)
      : JSON.parse(Buffer.from(keyRaw, 'base64').toString('utf8'));
  } catch (err) {
    logger.warn(
      `[GoogleSheetsV4] GOOGLE_SERVICE_ACCOUNT_KEY is set but not valid JSON/base64: ${err instanceof Error ? err.message : err}`,
    );
    return null;
  }
}

export interface SheetsV4Client {
  sheets: ReturnType<typeof google.sheets>;
  spreadsheetId: string;
}

/** Cached auth+client per process (credentials never change mid-boot). */
let cachedClient: SheetsV4Client | null | undefined;

export function getSheetsV4Client(): SheetsV4Client | null {
  if (cachedClient !== undefined) return cachedClient;

  const spreadsheetId = resolveSpreadsheetId();
  const credentials = parseServiceAccountKey();
  if (!credentials || !spreadsheetId) {
    // Missing configuration is a normal, expected state in dev — log once.
    logger.warn(
      '[GoogleSheetsV4] Google Sheets not configured (need GOOGLE_SERVICE_ACCOUNT_KEY + GOOGLE_SHEET_ID); sheet writes will be skipped.',
    );
    cachedClient = null;
    return cachedClient;
  }

  try {
    const auth = new google.auth.GoogleAuth({ credentials, scopes: [SHEETS_SCOPE] });
    const sheets = google.sheets({ version: 'v4', auth });
    cachedClient = { sheets, spreadsheetId };
    return cachedClient;
  } catch (err) {
    logger.error(
      `[GoogleSheetsV4] Google Sheets auth initialization failed: ${err instanceof Error ? err.message : err}`,
    );
    cachedClient = null;
    return cachedClient;
  }
}

/** Sheet-tab names used by the intake pipelines (single source of truth). */
export const SHEET_TABS = {
  clientRequests: process.env.CLIENT_REQUESTS_TAB || 'Client_Requests',
  careersApplicants: process.env.CAREERS_APPLICANTS_TAB || 'Careers_Applicants',
  ownersMaster: process.env.OWNERS_MASTER_TAB || 'Owners Master',
  masterInventory: process.env.MASTER_INVENTORY_TAB || 'Master_Inventory',
  realAvailableUnits: process.env.REAL_AVAILABLE_TAB || 'Real_Available_Units',
} as const;

/** Standardized header rows for each managed tab. */
export const SHEET_HEADERS = {
  /** Request_ID | Timestamp | Client_Name | Phone_Normalized | Transaction_Type | Property_Type | Compound_Zone | Budget_EGP | Area_SQM | Bedrooms | Promo_Applied | Matched_Unit_Codes | Assigned_Agent | Status | Notes */
  clientRequests: [
    'Request_ID',
    'Timestamp',
    'Client_Name',
    'Phone_Normalized',
    'Transaction_Type',
    'Property_Type',
    'Compound_Zone',
    'Budget_EGP',
    'Area_SQM',
    'Bedrooms',
    'Promo_Applied',
    'Matched_Unit_Codes',
    'Assigned_Agent',
    'Status',
    'Notes',
  ],
  /** App_ID | Timestamp | Full_Name | Phone | Email | Role | Work_Mode | Experience_Yrs | Current_Brokerage | CV_Link | Scorecard_Rating | Stage | Notes */
  careersApplicants: [
    'App_ID',
    'Timestamp',
    'Full_Name',
    'Phone',
    'Email',
    'Role',
    'Work_Mode',
    'Experience_Yrs',
    'Current_Brokerage',
    'CV_Link',
    'Scorecard_Rating',
    'Stage',
    'Notes',
  ],
} as const;

export type SheetTabName = (typeof SHEET_TABS)[keyof typeof SHEET_TABS];

export interface EnsureTabOptions {
  tab: SheetTabName | string;
  headers: readonly string[];
}

export interface EnsureTabResult {
  ok: boolean;
  tab: string;
  created?: boolean;
  headerWritten?: boolean;
  error?: string;
}

/**
 * Ensure a tab exists and carries the canonical header row.
 * Idempotent: an existing tab with a header row is left untouched; a missing
 * tab is created (addSheet) and its header row written (values.update A1).
 */
export async function ensureSheetTab({ tab, headers }: EnsureTabOptions): Promise<EnsureTabResult> {
  const client = getSheetsV4Client();
  if (!client) return { ok: false, tab, error: 'sheets_not_configured' };

  const { sheets, spreadsheetId } = client;
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existing = (meta.data.sheets ?? []).find(
      (s) => (s.properties?.title ?? '') === tab,
    );
    if (!existing) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: tab } } }],
        },
      });
    }

    // Header row: only write when A1 is empty — never clobber live data.
    const head = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tab}!A1`,
    });
    const a1 = head.data.values?.[0]?.[0];
    if (!a1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tab}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers as unknown as string[]] },
      });
    }

    return { ok: true, tab, created: !existing, headerWritten: !a1 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[GoogleSheetsV4] ensureSheetTab(${tab}) failed: ${message}`);
    return { ok: false, tab, error: message };
  }
}

export interface AppendRowResult {
  ok: boolean;
  tab: string;
  updatedRange?: string;
  error?: string;
}

/** Append a row to a tab with USER_ENTERED (URLs become clickable). */
export async function appendSheetRow(
  tab: SheetTabName | string,
  values: (string | number | boolean | null | undefined)[],
): Promise<AppendRowResult> {
  const client = getSheetsV4Client();
  if (!client) return { ok: false, tab, error: 'sheets_not_configured' };

  const { sheets, spreadsheetId } = client;
  try {
    const res = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [values.map((v) => (v == null ? '' : String(v)))] },
    });
    return { ok: true, tab, updatedRange: res.data.updates?.updatedRange ?? undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[GoogleSheetsV4] appendSheetRow(${tab}) failed: ${message}`);
    return { ok: false, tab, error: message };
  }
}

export interface UpdateRowByKeyOptions {
  tab: SheetTabName | string;
  headers: readonly string[];
  /** Header name of the key column, e.g. 'Request_ID'. */
  keyColumn: string;
  /** Row key to match, e.g. 'REQ-20261115-0001'. */
  keyValue: string;
  /** Header → new value for every column to update. */
  updates: Record<string, string | number | boolean | null>;
}

export interface UpdateRowByKeyResult {
  ok: boolean;
  tab: string;
  rowNumber?: number;
  error?: string;
}

/**
 * Two-way status sync primitive: find the row whose keyColumn equals
 * keyValue (column A scan of the whole tab) and update the given columns in
 * place. Used by the Admin console so status edits never revert on reload.
 */
export async function updateSheetRowByKey({
  tab,
  headers,
  keyColumn,
  keyValue,
  updates,
}: UpdateRowByKeyOptions): Promise<UpdateRowByKeyResult> {
  const client = getSheetsV4Client();
  if (!client) return { ok: false, tab, error: 'sheets_not_configured' };

  const { sheets, spreadsheetId } = client;
  try {
    const read = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tab}!A:Z`,
    });
    const rows = read.data.values ?? [];
    const keyIndex = headers.indexOf(keyColumn);
    if (keyIndex < 0) return { ok: false, tab, error: `unknown key column ${keyColumn}` };

    // Row 0 is the header; find the first data row whose key matches.
    let rowNumber = 0;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i]?.[keyIndex] ?? '').trim() === String(keyValue).trim()) {
        rowNumber = i + 1; // sheets are 1-indexed
        break;
      }
    }
    if (!rowNumber) return { ok: false, tab, error: 'key_not_found' };

    // Merge updates into the existing row (never blank out untouched cells).
    const row = (rows[rowNumber - 1] ?? []).map((c) => String(c ?? ''));
    while (row.length < headers.length) row.push('');
    for (const [header, value] of Object.entries(updates)) {
      const idx = headers.indexOf(header);
      if (idx >= 0) row[idx] = value == null ? '' : String(value);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
    return { ok: true, tab, rowNumber };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[GoogleSheetsV4] updateSheetRowByKey(${tab}) failed: ${message}`);
    return { ok: false, tab, error: message };
  }
}

/** Ensure + append in one call — the standard intake write path. */
export async function appendToManagedTab(options: {
  tab: SheetTabName | string;
  headers: readonly string[];
  values: (string | number | boolean | null | undefined)[];
}): Promise<AppendRowResult & { tabReady?: EnsureTabResult }> {
  const tabReady = await ensureSheetTab({ tab: options.tab, headers: options.headers });
  if (!tabReady.ok) {
    return { ok: false, tab: options.tab, error: tabReady.error, tabReady };
  }
  const appended = await appendSheetRow(options.tab, options.values);
  return { ...appended, tabReady };
}
