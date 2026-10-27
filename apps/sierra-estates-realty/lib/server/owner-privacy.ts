/**
 * Owner-privacy redaction helpers — the single shared implementation of the
 * repo's concierge doctrine (precedent: scripts/sanitize-public-downloads.mjs
 * and app/api/inventory/download/route.ts), applied to every surface that
 * can reach owner-adjacent data:
 *   · /api/inventory (description free-text scrub)
 *   · /api/listings + /api/listings/spatial (description scrub)
 *   · /api/inventory/sheets/{all,rent,resale} (column-level CSV redaction)
 *
 * Section D guarantees (execution order 2026-10-27): public outputs never
 * disclose private owner phone numbers, owner-only names, or direct owner
 * WhatsApp links — the public contact is always the Sierra Estates
 * concierge. Deliberately dependency-free so it can be imported by both the
 * Next.js app and the root vitest suite.
 */

export const CONCIERGE_CONTACT_NAME = 'Sierra Estates Advisory';
export const CONCIERGE_PHONE = process.env.PF_AGENT_PHONE || '+201092048333';
export const CONCIERGE_WA_LINK = `https://wa.me/${CONCIERGE_PHONE.replace(/[^\d]/g, '')}`;

/** Egyptian mobile pattern — same shape as the download-route scrub and
 * scripts/sanitize-public-downloads.mjs, extended to consume the local
 * leading zero ('01012345678') so the full local number is replaced rather
 * than leaving a stray '0' behind. */
export const OWNER_PHONE_SCRUB_RE = /0?(?:\+?20)?1[0125][0-9]{8}/g;
const WA_ME_SCRUB_RE = /https?:\/\/wa\.me\/[0-9]+/gi;

/** Single-pass contact scrub: the wa.me alternative is tried FIRST at each
 * position so a URL is consumed wholesale — a separate phone pass would
 * otherwise bite into the already-replaced concierge URL digits and
 * mangle it into 'https://wa.me/+201…'. */
const CONTACT_SCRUB_RE = /(https?:\/\/wa\.me\/[0-9]+)|(0?(?:\+?20)?1[0125][0-9]{8})/gi;

/** Scrub owner-identifying contact data out of free text: Egyptian mobiles
 * and wa.me deep links become the concierge contact. Non-strings pass
 * through untouched (idempotent on already-redacted text). */
export function scrubOwnerContactText<T>(text: T): T {
  if (typeof text !== 'string') return text;
  return text.replace(
    CONTACT_SCRUB_RE,
    (_match, wa: string, _phone: string) => (wa ? CONCIERGE_WA_LINK : CONCIERGE_PHONE),
  ) as unknown as T;
}

/* ── CSV column-level redaction (sheets routes) ────────────────────────── */

/** CSV parser tolerant of quoted fields, embedded commas/newlines and ""
 * escapes — same algorithm as workflows/08-units-sync/sync.js. */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else if (c === '\r') {
      /* skip */
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

function csvField(value: unknown): string {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const PHONE_HEADER_RE = /(phone|mobile|هاتف|موبايل|تواصل|tel)/i;
const LINK_HEADER_RE = /(whatsapp|واتساب|wa\.me|link)/i;
const NAME_HEADER_RE = /(name|اسم|owner|مالك|وسيط|broker)/i;

/**
 * Redact owner-identifying columns + free text from a CSV document.
 * Phone-like columns → concierge phone; WhatsApp/link columns → concierge
 * wa.me; owner/broker/contact name columns → concierge name; every string
 * cell additionally gets the free-text scrub. Row count and non-contact
 * data are preserved (redaction, not data mutation).
 */
export function redactOwnerCsv(csvText: string): string {
  const rows = parseCsvRows(csvText);
  if (!rows.length) return csvText;
  const headers = rows[0].map((h) => String(h).trim().toLowerCase());
  const phoneCols: number[] = [];
  const linkCols: number[] = [];
  const nameCols: number[] = [];
  headers.forEach((h, idx) => {
    if (PHONE_HEADER_RE.test(h)) phoneCols.push(idx);
    else if (LINK_HEADER_RE.test(h)) linkCols.push(idx);
    else if (NAME_HEADER_RE.test(h)) nameCols.push(idx);
  });
  const out: string[][] = [rows[0]];
  for (let r = 1; r < rows.length; r++) {
    const row = [...rows[r]];
    for (const c of phoneCols) {
      if (row[c] !== undefined && String(row[c]).trim() !== '') row[c] = CONCIERGE_PHONE;
    }
    for (const c of linkCols) {
      if (row[c] !== undefined && String(row[c]).trim() !== '') row[c] = CONCIERGE_WA_LINK;
    }
    for (const c of nameCols) {
      if (row[c] !== undefined && String(row[c]).trim() !== '') row[c] = CONCIERGE_CONTACT_NAME;
    }
    for (let c = 0; c < row.length; c++) {
      if (typeof row[c] === 'string') row[c] = scrubOwnerContactText(row[c]);
    }
    out.push(row);
  }
  return `${out.map((row) => row.map(csvField).join(',')).join('\n')}\n`;
}
