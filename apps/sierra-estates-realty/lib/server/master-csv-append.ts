import 'server-only';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { normalizeDealType, resolveUnitCode } from '@/lib/server/unit-codes';
import type { TelegramListingSpec } from '@/lib/server/telegram-listing-formatter';

/**
 * SIERRA ESTATES 3.0 — MASTER CSV APPEND (Phase 2.4)
 *
 * Appends a broadcast rental listing to the local Owners-Rent master CSV
 * using the semantics of scripts/merge-owners-rent-csv.mjs:
 *  - dedupe on Unit Code (+ owner phone last-10-digits backstop),
 *  - richer-record-wins with sparse-field backfill,
 *  - status/notes refreshed from the newer row.
 *
 * The published master lives at
 * apps/sierra-estates-realty/public/downloads/Sierra_Estates_Owners_Rent_Master.csv
 * (the repo-root copy is created by the standalone script when it runs).
 * Sale listings do not target the Owners-Rent master — they are reported as
 * skipped, honestly (no fabrication of a sales row into a rent ledger).
 *
 * Serverless runtimes have an ephemeral read-only FS: any failure returns
 * `unavailable` with the exact reason instead of pretending the row landed.
 */

const MASTER_COLUMNS = [
  'Unit Code',
  'Compound / Community',
  'Zone / Area',
  'Property Type',
  'Monthly Rent (EGP)',
  'Rent Display',
  'Area (sqm)',
  'Bedrooms',
  'Bathrooms',
  'Furnishing',
  'Owner / Contact Name',
  'Owner Phone',
  'Direct WhatsApp',
  'Listing Status',
  'Source Channel',
  'Listing Notes',
  'Record ID',
] as const;

type MasterRow = Record<string, string>;

export interface MasterCsvAppendResult {
  ok: boolean;
  action: 'appended' | 'updated' | 'skipped' | 'unavailable';
  path?: string;
  note?: string;
}

function resolveMasterPath(): string | null {
  // Prefer the committed published master; fall back to the repo-root copy.
  const candidates = [
    path.join(process.cwd(), 'public', 'downloads', 'Sierra_Estates_Owners_Rent_Master.csv'),
    path.join(process.cwd(), 'Sierra_Estates_Owners_Rent_Master.csv'),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // fs unavailable — handled by caller
    }
  }
  return null;
}

function phoneTail(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '').slice(-10);
}

function countFilled(row: MasterRow): number {
  return Object.values(row).filter((v) => v != null && String(v).trim() !== '' && String(v).trim() !== 'Upon Request').length;
}

/** Append or merge a broadcast listing into the Owners-Rent master CSV. */
export async function appendListingToOwnersRentMaster(
  unit: TelegramListingSpec,
  formattedCaption: string,
): Promise<MasterCsvAppendResult> {
  if (normalizeDealType(unit.dealType) !== 'rent') {
    return {
      ok: true,
      action: 'skipped',
      note: 'Sale listings do not target the Owners-Rent master CSV (rentals ledger only).',
    };
  }

  let masterPath: string | null = null;
  try {
    masterPath = resolveMasterPath();
  } catch (err) {
    return { ok: false, action: 'unavailable', note: `File system unavailable: ${(err as Error)?.message}` };
  }
  if (!masterPath) {
    return {
      ok: false,
      action: 'unavailable',
      note:
        'Sierra_Estates_Owners_Rent_Master.csv not present on this runtime ' +
        '(serverless/ephemeral FS). Run scripts/merge-owners-rent-csv.mjs from the repository to merge offline.',
    };
  }

  try {
    const { code } = resolveUnitCode(unit);
    const raw = fs.readFileSync(masterPath, 'utf-8');
    const parsed = Papa.parse<MasterRow>(raw.replace(/^\uFEFF/, ''), {
      header: true,
      skipEmptyLines: true,
    });
    const rows: MasterRow[] = (parsed.data ?? []).filter((r) => r && typeof r === 'object');

    const rentDisplay = Number(unit.price) > 0 ? `${Number(unit.price).toLocaleString('en-US')} EGP` : 'Price on Call';
    const ownerPhone = (unit.contactPhone ?? '').replace(/\D/g, '');
    const waLink = unit.whatsappNumber ?? unit.contactPhone;

    const newRow: MasterRow = {
      'Unit Code': code,
      'Compound / Community': unit.compound ?? '',
      // §21 no-fabrication: absent facts stay empty — never defaulted.
      'Zone / Area': unit.zone ?? '',
      'Property Type': unit.unitType ?? '',
      'Monthly Rent (EGP)': Number(unit.price) > 0 ? String(Number(unit.price)) : 'Price on Call',
      'Rent Display': rentDisplay,
      'Area (sqm)': Number(unit.areaSqm) > 0 ? String(Number(unit.areaSqm)) : 'Upon Request',
      'Bedrooms': Number(unit.bedrooms) > 0 ? String(Number(unit.bedrooms)) : 'Upon Request',
      'Bathrooms': Number(unit.bathrooms) > 0 ? String(Number(unit.bathrooms)) : 'Upon Request',
      'Furnishing': unit.finishing ?? '',
      'Owner / Contact Name': unit.contactName ?? 'Sierra Estates',
      'Owner Phone': ownerPhone || 'Upon Request',
      'Direct WhatsApp': waLink ? `https://wa.me/${ownerPhone}` : '',
      'Listing Status': 'Available for Rent',
      'Source Channel': 'Telegram Channel Broadcast',
      'Listing Notes': formattedCaption.replace(/\s+/g, ' ').slice(0, 300),
      'Record ID': `TG-${code}`,
    };

    // merge-owners-rent-csv.mjs semantics: match by Unit Code (phone-tail
    // backstop), richer record wins, sparse fields backfilled.
    const tail = phoneTail(ownerPhone);
    const existingIndex = rows.findIndex(
      (r) =>
        String(r['Unit Code'] ?? '').trim().toUpperCase() === code.toUpperCase() ||
        (tail.length === 10 && phoneTail(r['Owner Phone']) === tail && String(r['Unit Code'] ?? '').trim() === ''),
    );

    let action: 'appended' | 'updated';
    if (existingIndex >= 0) {
      const existing = rows[existingIndex];
      const merged: MasterRow = { ...existing };
      for (const col of MASTER_COLUMNS) {
        const newVal = String(newRow[col] ?? '').trim();
        const oldVal = String(existing[col] ?? '').trim();
        if (newVal && (!oldVal || oldVal === 'Upon Request')) merged[col] = newVal;
        else if (!newVal && oldVal) merged[col] = oldVal;
        else if (newVal && oldVal && countFilled({ ...existing, [col]: newVal }) >= countFilled(existing)) {
          merged[col] = newVal;
        }
      }
      // The broadcast row is always the fresher source for these columns.
      merged['Listing Status'] = newRow['Listing Status'];
      merged['Source Channel'] = newRow['Source Channel'];
      rows[existingIndex] = countFilled(merged) >= countFilled(newRow) ? merged : { ...merged, ...newRow };
      action = 'updated';
    } else {
      rows.push(newRow);
      action = 'appended';
    }

    const serialized = Papa.unparse(rows, { columns: [...MASTER_COLUMNS], newline: '\r\n' });
    fs.writeFileSync(masterPath, `${serialized}\r\n`, 'utf-8');
    return { ok: true, action, path: masterPath };
  } catch (err) {
    return {
      ok: false,
      action: 'unavailable',
      path: masterPath ?? undefined,
      note: `Master CSV merge failed: ${(err as Error)?.message}`,
    };
  }
}
