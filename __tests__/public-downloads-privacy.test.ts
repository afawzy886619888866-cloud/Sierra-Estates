/**
 * Tests: public/downloads static owner-PII containment + the shared
 * owner-privacy helpers (execution order Section D, 2026-10-27).
 *
 * The git-tracked CSV/XLSX assets under
 * apps/sierra-estates-realty/public/downloads/ are served STATICALLY at
 * /downloads/* with no auth — any owner phone in them is a live privacy
 * breach bypassing the publication gate. These tests pin:
 *   1. every tracked file contains ONLY the concierge Egyptian mobile and
 *      concierge wa.me link (no owner numbers, no owner deep links);
 *   2. the runtime helpers used by /api/inventory/sheets/* (defense-in-depth
 *      redaction) and /api/inventory + /api/listings (free-text scrub).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import {
  redactOwnerCsv,
  scrubOwnerContactText,
  CONCIERGE_PHONE,
  CONCIERGE_WA_LINK,
  CONCIERGE_CONTACT_NAME,
} from '../apps/sierra-estates-realty/lib/server/owner-privacy';

const DIR = path.resolve(process.cwd(), 'apps/sierra-estates-realty/public/downloads');
const EGYPT_MOBILE = /(?:\+?20)?1[0125][0-9]{8}/g;
const WA_ME = /https?:\/\/wa\.me\/[0-9]+/gi;
const CONCIERGE_DIGITS = '201092048333';

function readAsText(full: string): string {
  if (/\.xlsx$/i.test(full)) {
    const wb = XLSX.read(fs.readFileSync(full));
    return wb.SheetNames.map((sn) => XLSX.utils.sheet_to_csv(wb.Sheets[sn])).join('\n');
  }
  return fs.readFileSync(full, 'utf-8');
}

describe('public/downloads — static owner-PII containment (Section D)', () => {
  it('every tracked CSV/XLSX is free of raw owner mobiles (concierge only)', () => {
    const files = fs.readdirSync(DIR).filter((f) => /\.(csv|xlsx)$/i.test(f));
    // 15 files were tracked at redaction time (2026-10-27); the guard floor
    // catches an accidental drop of the directory.
    expect(files.length).toBeGreaterThanOrEqual(10);
    for (const f of files) {
      const text = readAsText(path.join(DIR, f));
      const mobiles = (text.match(EGYPT_MOBILE) || []).map((m) => m.replace(/[^\d]/g, ''));
      const foreign = mobiles.filter((m) => m !== CONCIERGE_DIGITS);
      expect(foreign, `${f}: ${foreign.length} non-concierge Egyptian mobiles remain`).toEqual([]);
    }
  });

  it('every tracked CSV/XLSX is free of non-concierge wa.me deep links', () => {
    const files = fs.readdirSync(DIR).filter((f) => /\.(csv|xlsx)$/i.test(f));
    for (const f of files) {
      const text = readAsText(path.join(DIR, f));
      const links = text.match(WA_ME) || [];
      const foreign = links.filter((l) => l.replace(/[^\d]/g, '') !== CONCIERGE_DIGITS);
      expect(foreign, `${f}: non-concierge wa.me links remain`).toEqual([]);
    }
  });
});

describe('owner-privacy helpers (runtime defense-in-depth)', () => {
  it('redactOwnerCsv replaces owner contact columns with the concierge contact', () => {
    const raw = [
      'Code,Owner / Contact Name,Owner Phone,WhatsApp Direct,Notes,Price',
      'MT-1,Ahmed Owner,+201001234567,https://wa.me/201001234567,"call 01012345678 today",8500000',
    ].join('\n');
    const out = redactOwnerCsv(raw);
    expect(out).toContain(CONCIERGE_CONTACT_NAME);
    expect(out).toContain(CONCIERGE_PHONE);
    expect(out).toContain(CONCIERGE_WA_LINK);
    expect(out).not.toContain('Ahmed Owner');
    expect(out).not.toContain('+201001234567');
    expect(out).not.toContain('wa.me/201001234567');
    expect(out).not.toContain('01012345678');
    // Row count preserved (redaction, not deletion).
    expect(out.trim().split('\n')).toHaveLength(2);
    // Non-contact data untouched.
    expect(out).toContain('MT-1');
    expect(out).toContain('8500000');
  });

  it('redactOwnerCsv is idempotent (concierge values are fixed points)', () => {
    const raw = 'Name,Phone\nAhmed Owner,+201001234567\n';
    const once = redactOwnerCsv(raw);
    const twice = redactOwnerCsv(once);
    expect(twice).toBe(once);
  });

  it('redactOwnerCsv handles quoted fields with embedded commas/newlines', () => {
    const raw = 'Name,Phone,Notes\nAhmed,+201001234567,"see note, ""urgent"""\n';
    const out = redactOwnerCsv(raw);
    expect(out).toContain('"see note, ""urgent"""');
    expect(out).not.toContain('+201001234567');
  });

  it('scrubOwnerContactText passes non-strings through untouched', () => {
    expect(scrubOwnerContactText(undefined)).toBeUndefined();
    expect(scrubOwnerContactText(null)).toBeNull();
    expect(scrubOwnerContactText(52)).toBe(52);
  });

  it('scrubOwnerContactText rewrites embedded phones and wa.me links in free text', () => {
    const out = scrubOwnerContactText(
      'Owner says: whatsapp me on 01001234567 or https://wa.me/201234567890',
    );
    expect(out).toBe(`Owner says: whatsapp me on ${CONCIERGE_PHONE} or ${CONCIERGE_WA_LINK}`);
  });

  it('scrubOwnerContactText is idempotent on already-scrubbed text', () => {
    const once = scrubOwnerContactText('call +201001234567');
    expect(scrubOwnerContactText(once)).toBe(once);
  });
});
