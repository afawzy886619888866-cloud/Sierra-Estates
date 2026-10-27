#!/usr/bin/env node
/**
 * scripts/ops/sierra/redact-public-downloads.mjs
 *
 * Section D containment (execution order 2026-10-27): the git-tracked
 * assets under apps/sierra-estates-realty/public/downloads/ are served
 * STATICALLY by Vercel at /downloads/* with no authentication — any owner
 * phone / owner name / direct WhatsApp link inside them is a direct public
 * PII leak that bypasses the (already fixed) authenticated download route
 * and the publication gate entirely.
 *
 * This tool redacts those files IN PLACE using the repo's established
 * concierge doctrine (same policy as scripts/sanitize-public-downloads.mjs
 * and app/api/inventory/download/route.ts):
 *   · phone-like columns    → +201092048333 (PF_AGENT_PHONE override)
 *   · WhatsApp/link columns → https://wa.me/201092048333
 *   · owner/broker/contact-name columns → 'Sierra Estates Advisory'
 *   · every free-text cell additionally scrubbed of Egyptian mobiles and
 *     wa.me deep links
 * Row counts and non-contact data are preserved — redaction, not deletion
 * (the /api/inventory/sheets/* routes and any UI links keep working).
 *
 * Default is DRY-RUN (prints what would change); pass --apply to write.
 * Re-running is idempotent (concierge values are fixed points).
 *
 * NOTE: git HISTORY still contains the raw numbers — purging history needs
 * an owner decision (git filter-repo + force-push is currently out of
 * policy) and/or making the repository private. This tool stops the ongoing
 * leak from HEAD and from the live static serving path.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

const CONCIERGE_NAME = 'Sierra Estates Advisory';
const CONCIERGE_PHONE = process.env.PF_AGENT_PHONE || '+201092048333';
const CONCIERGE_WA = `https://wa.me/${CONCIERGE_PHONE.replace(/[^\d]/g, '')}`;
const EGYPT_PHONE_RE = /(?:\+?20)?1[0125][0-9]{8}/g;
const WA_ME_RE = /https?:\/\/wa\.me\/[0-9]+/gi;

const DIR = path.resolve(process.cwd(), 'apps/sierra-estates-realty/public/downloads');
const APPLY = process.argv.includes('--apply');

const PHONE_HEADER = /(phone|mobile|هاتف|موبايل|تواصل|tel)/i;
const LINK_HEADER = /(whatsapp|واتساب|wa\.me|link)/i;
const NAME_HEADER = /(name|اسم|owner|مالك|وسيط|broker)/i;
/** Columns with numeric semantics — a bare 10-digit number here is data
 * (price/id-scale), not prose, and is left alone by the number-cell scrub. */
const NUMERIC_COL_HEADER = /(price|rent|area|sqm|bed|bath|meter|متر|سعر|id|code|no\b|number\b)/i;

// Single-pass contact scrub: the wa.me alternative is tried FIRST at each
// position so a URL is consumed wholesale — a separate phone pass would
// otherwise bite into the already-replaced concierge URL digits.
const CONTACT_SCRUB_RE = /(https?:\/\/wa\.me\/[0-9]+)|(0?(?:\+?20)?1[0125][0-9]{8})/gi;

function scrubText(v) {
  if (typeof v !== 'string') return v;
  return v.replace(CONTACT_SCRUB_RE, (_m, wa) => (wa ? CONCIERGE_WA : CONCIERGE_PHONE));
}

function redactMatrix(data) {
  // data: array-of-arrays with row 0 = headers
  let phones = 0, links = 0, names = 0, freeText = 0;
  const headers = data[0].map((h) => String(h ?? '').trim().toLowerCase());
  const phoneCols = [], linkCols = [], nameCols = [], numericCols = new Set();
  headers.forEach((h, idx) => {
    if (PHONE_HEADER.test(h)) phoneCols.push(idx);
    else if (LINK_HEADER.test(h)) linkCols.push(idx);
    else if (NAME_HEADER.test(h)) nameCols.push(idx);
    if (NUMERIC_COL_HEADER.test(h)) numericCols.add(idx);
  });
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    if (!row || !row.length) continue;
    for (const c of phoneCols) {
      if (row[c] !== undefined && String(row[c]).trim() !== '' && String(row[c]) !== CONCIERGE_PHONE) {
        row[c] = CONCIERGE_PHONE;
        phones++;
      }
    }
    for (const c of linkCols) {
      if (row[c] !== undefined && String(row[c]).trim() !== '' && String(row[c]) !== CONCIERGE_WA) {
        row[c] = CONCIERGE_WA;
        links++;
      }
    }
    for (const c of nameCols) {
      if (row[c] !== undefined && String(row[c]).trim() !== '' && String(row[c]) !== CONCIERGE_NAME) {
        row[c] = CONCIERGE_NAME;
        names++;
      }
    }
    for (let c = 0; c < row.length; c++) {
      if (typeof row[c] === 'string' && row[c] !== CONCIERGE_PHONE && row[c] !== CONCIERGE_WA && row[c] !== CONCIERGE_NAME) {
        const before = row[c];
        const after = scrubText(before);
        if (after !== before) {
          row[c] = after;
          freeText++;
        }
      } else if (
        typeof row[c] === 'number' &&
        !numericCols.has(c) &&
        String(row[c]).match(CONTACT_SCRUB_RE)
      ) {
        // A bare 10-digit NUMBER in a non-numeric column (e.g. a phone
        // pasted alone into Description/Notes) — the xlsx CSV parse turns
        // it into a number cell the string scrub would otherwise skip.
        row[c] = CONCIERGE_PHONE;
        freeText++;
      }
    }
  }
  return { phones, links, names, freeText };
}

const files = fs.readdirSync(DIR).filter((f) => /\.(csv|xlsx)$/i.test(f));
console.log(`public/downloads redaction (${APPLY ? 'APPLY' : 'DRY-RUN'}) — ${files.length} files`);
console.log(`concierge: ${CONCIERGE_PHONE} | ${CONCIERGE_WA} | ${CONCIERGE_NAME}\n`);
let dirty = 0;
for (const file of files) {
  const full = path.join(DIR, file);
  const isCsv = /\.csv$/i.test(file);
  const wb = isCsv
    ? XLSX.read(fs.readFileSync(full, 'utf-8'), { type: 'string' })
    : XLSX.read(fs.readFileSync(full));
  const stats = { phones: 0, links: 0, names: 0, freeText: 0 };
  for (const sn of wb.SheetNames) {
    const ws = wb.Sheets[sn];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!data || data.length < 2) continue;
    const s = redactMatrix(data);
    stats.phones += s.phones;
    stats.links += s.links;
    stats.names += s.names;
    stats.freeText += s.freeText;
    wb.Sheets[sn] = XLSX.utils.aoa_to_sheet(data);
  }
  const total = stats.phones + stats.links + stats.names + stats.freeText;
  if (total === 0) {
    console.log(`  = ${file}: already clean`);
    continue;
  }
  dirty++;
  console.log(
    `  ${APPLY ? '*' : '!'} ${file}: ${stats.phones} phone-cells, ${stats.links} link-cells, ${stats.names} name-cells, ${stats.freeText} free-text cells`
  );
  if (APPLY) {
    if (isCsv) fs.writeFileSync(full, XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]));
    else fs.writeFileSync(full, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }
}
if (!APPLY && dirty > 0) {
  console.log('\nDRY-RUN ONLY — re-run with --apply to write the redacted files.');
} else if (APPLY) {
  console.log(`\nApplied: ${dirty} file(s) redacted.`);
}
