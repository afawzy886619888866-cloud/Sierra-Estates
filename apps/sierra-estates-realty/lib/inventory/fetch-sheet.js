 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }/**
 * Shared Google-Sheet reader for the inventory pipeline.
 *
 * Fetches the owner-inventory sheet as CSV, parses it, and returns public-safe
 * `InventoryUnit[]` (owner PII already stripped in normalize.js). Used by both
 * the sheets → domain ingestion cron and the /api/inventory fallback path.
 */
import Papa from 'papaparse';
import { resolveLocation } from '@/lib/inventory/gazetteer';
import { normalizeRows } from '@/lib/inventory/normalize';


export const SHEET_ID =
  process.env.INVENTORY_SHEET_ID || '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk';
export const SHEET_GID = process.env.INVENTORY_SHEET_GID || '1127958606';
export const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

/**
 * Read + normalize the sheet. Returns null on any failure (network, non-2xx,
 * empty) so callers can fall back gracefully.
 */
export async function fetchSheetUnits(
  opts = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), _nullishCoalesce(opts.timeoutMs, () => ( 8000)));
  try {
    const res = await fetch(SHEET_CSV_URL, {
      signal: controller.signal,
      next: { revalidate: _nullishCoalesce(opts.revalidate, () => ( 300)) },
    });
    if (!res.ok) return null;
    const csv = await res.text();
    const parsed = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
    });
    const units = normalizeRows(parsed.data, { resolveLocation });
    return units.length ? units : null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
