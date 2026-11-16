/**
 * Tests: /api/inventory/download owner-privacy gate (2026-10-25).
 *
 * Verified LIVE before this fix: an anonymous GET
 * /api/inventory/download?dataset=owners returned a 21 MB XLSX of the
 * committed snapshot with 12,334 rows — 10,755 of them carrying real owner
 * mobile numbers in "Owner Phone", plus owner names and WhatsApp deep
 * links. No auth. CORS *. That bypassed both the publication gate
 * (snapshot rows are not PUBLISHABLE rows) and the repo's owner-privacy
 * doctrine (scripts/sanitize-public-downloads.mjs).
 *
 * Pinned here:
 *   · PUBLIC output (json + xlsx) never contains an owner phone — the
 *     contact columns carry the Sierra Estates concierge contact, and
 *     phone-like strings in free text are scrubbed;
 *   · AUTHENTICATED ADMIN output keeps the full export (staff tooling);
 *   · the redaction is a gate, not a mutation — public and admin see the
 *     same row count.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as XLSX from 'xlsx';

vi.mock('@/lib/server/auth-guard', () => ({
  verifyPortalRequest: vi.fn(),
}));
// The logger makes network calls in some environments — stub it out.
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { verifyPortalRequest } from '@/lib/server/auth-guard';
import * as route from '../apps/sierra-estates-realty/app/api/inventory/download/route';

const authGuard = { verifyPortalRequest: vi.mocked(verifyPortalRequest) };

const CONCIERGE_PHONE = '+201092048333';
const OWNER_PHONE_CELL_RE = /^01[0125][0-9]{8}$/;
const ANY_MOBILE_RE = /(?:\+?20)?1[0125][0-9]{8}/g;

type Row = Record<string, string>;

function rowOwnerPhone(u: Row): string {
  return String(u['Owner Phone'] || '').trim();
}

function get(url: string) {
  return route.GET(new Request(url) as never);
}

describe('GET /api/inventory/download — owner-privacy gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('public JSON export never exposes owner phones — concierge contact only', async () => {
    authGuard.verifyPortalRequest.mockResolvedValue({ authenticated: false, method: 'none' });

    const res = await get('http://localhost/api/inventory/download?dataset=owners&format=json&dealType=sale');
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(Array.isArray(data.units)).toBe(true);
    expect(data.units.length).toBeGreaterThan(100); // the export still works

    const offending: Row[] = [];
    for (const u of data.units as Row[]) {
      if (
        u['Owner Phone'] !== CONCIERGE_PHONE ||
        u['Owner Contact Name'] !== 'Sierra Estates Advisory' ||
        u['WhatsApp Direct'] !== 'https://wa.me/201092048333'
      ) {
        offending.push(u);
      }
    }
    expect(offending).toEqual([]);
  });

  it('public JSON export scrubs phone-like strings embedded in descriptions', async () => {
    authGuard.verifyPortalRequest.mockResolvedValue({ authenticated: false, method: 'none' });

    const res = await get('http://localhost/api/inventory/download?dataset=owners&format=json');
    const data = await res.json();
    // The only mobile-formatted string allowed anywhere in the public row
    // is the concierge number itself (in any of its written forms).
    const allPhones: string[] = [];
    for (const u of data.units as Row[]) {
      const desc = String(u.Description || '');
      const found = desc.match(ANY_MOBILE_RE) || [];
      for (const p of found) {
        if (p !== '+201092048333' && p !== '201092048333' && p !== '01092048333') allPhones.push(p);
      }
    }
    expect(allPhones).toEqual([]);
  });

  it('public XLSX export redacts the Owner Phone column in the workbook itself', async () => {
    authGuard.verifyPortalRequest.mockResolvedValue({ authenticated: false, method: 'none' });

    const res = await get('http://localhost/api/inventory/download?dataset=owners&format=xlsx&dealType=rent');
    expect(res.status).toBe(200);
    const buf = Buffer.from(await res.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
    expect(rows.length).toBeGreaterThan(10);
    for (const row of rows) {
      expect(row['Owner Phone']).toBe(CONCIERGE_PHONE);
      expect(row['Owner Contact Name']).toBe('Sierra Estates Advisory');
    }
  });

  it('authenticated admin export KEEPS real owner contact data (staff tooling preserved)', async () => {
    authGuard.verifyPortalRequest.mockResolvedValue({
      authenticated: true,
      access: 'admin',
      method: 'session-cookie',
      role: 'admin',
      scope: null,
    });

    const res = await get('http://localhost/api/inventory/download?dataset=owners&format=json&dealType=sale');
    expect(res.status).toBe(200);
    const data = await res.json();
    const realOwnerPhones = (data.units as Row[]).filter((u) => OWNER_PHONE_CELL_RE.test(rowOwnerPhone(u)));
    expect(realOwnerPhones.length).toBeGreaterThan(0);
  });

  it('auth-gate failures fail CLOSED to the redacted export (never the raw one)', async () => {
    authGuard.verifyPortalRequest.mockRejectedValue(new Error('auth backend down'));

    const res = await get('http://localhost/api/inventory/download?dataset=owners&format=json&dealType=rent');
    expect(res.status).toBe(200);
    const data = await res.json();
    for (const u of data.units) {
      expect(u['Owner Phone']).toBe(CONCIERGE_PHONE);
    }
  });
});
