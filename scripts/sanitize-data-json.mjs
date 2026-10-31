/**
 * scripts/sanitize-data-json.mjs — v2 (2026-10-31)
 *
 * Owner-phone privacy scrubber for every committed TEXT data file.
 * Doctrine (lib/server/owner-privacy.ts): the public repo must never carry
 * a real owner mobile — every Egyptian mobile becomes the Sierra Estates
 * concierge number +201092048333, and every wa.me deep link points at it.
 *
 * v1 blind spots fixed here (audit 2026-10-31):
 *   1. snapshot.json was resolved under data/ but actually lives in
 *      lib/inventory/ — v1 silently skipped it (12k+ rows kept raw numbers).
 *   2. EG_MOBILE_RE matched no separators, so spaced/dashed/parenthesized
 *      forms ("+20 100 882 1490 (Owner Direct)") survived untouched.

 *   3. Only phone-named KEY fields were scrubbed — numbers embedded in free
 *      text under other keys (contactName, notes, descriptions) survived.
 *   4. packages/whatsapp-shared/*.json (outreach queue: 108 real numbers)
 *      and the public/downloads CSVs were not targeted at all.
 *   5. No verification pass — v1 reported "sanitized" without proving it.
 * v3 blind spots fixed (fleet-dispatch session, 2026-10-31):
 *   - labeled-context malformed contacts — 11-digit mistypes
 *     ("contact: 11155953366") and 9-digit truncations
 *     ("رقم المالك: +20 10 2924495") sat outside the strict 10-digit
 *     pattern BY DESIGN (to protect prices/ids); a digit run under an
 *     explicit contact label (رقم المالك / contact / phone / tel …) is
 *     contact material BY INTENT and is now scrubbed + verified at
 *     9–13 digits, and JSON numbers under phone-ish keys get the same
 *     treatment.
 *
 * v2 guarantees:
 *   - Scrubs EVERY string value (JSON walk) / whole file (text) with a
 *     separator-tolerant Egyptian-mobile pattern; wa.me links are consumed
 *     FIRST so their digits never leak into the phone pass.
 *   - Price-shaped numeric strings under price-ish keys are skipped
 *     (lesson: cairo-plaza brochure prices like "1500020000" are NOT phones).
 *   - CSV handling is column-aware: phone/whatsapp/contact columns are
 *     scrubbed unconditionally; message/notes columns get the guarded scrub;
 *     Record ID / Unit Code / price columns are never touched.
 *   - The concierge (any prefix form, matched by its last 10 digits) is
 *     left intact, so the script is idempotent.
 *   - Ends with a normalized verification scan of every target; exits 1
 *     if a single non-concierge Egyptian mobile remains.
 *
 * Does NOT rewrite git history — only the working tree. Run from repo root:
 *   node scripts/sanitize-data-json.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const CONCIERGE = '+201092048333';
const CONCIERGE_BARE = '201092048333';
const CONCIERGE_LAST10 = '1092048333';

// ── Matching machinery ────────────────────────────────────────────────────
// ≤1 separator char (space, dash, dot, parens, NBSP, narrow NBSP) between
// any two digits — covers "+20 100 882 1490", "011-0088-8834", "(+20) 100…".
const SEP = String.raw`[\s\-().\u00a0\u202f]?`;

// wa.me deep links are consumed wholesale FIRST (URL digits must never be
// re-bitten by the phone pass — see owner-privacy.ts for the same trick).
const WA_LINK_RE = /https?:\/\/wa\.me\/\+?[0-9][0-9\s\-().]*/gi;

// Egyptian mobile, separator-tolerant, bounded so it never bites into
// identifiers (unit codes) or longer digit runs (JS constants, prices).
const PHONE_RE = new RegExp(
  String.raw`(?<![0-9A-Za-z])` +
    String.raw`(?:\+${SEP}2${SEP}0${SEP}|0${SEP}0${SEP}2${SEP}0${SEP}|0${SEP}2${SEP}0${SEP}|0${SEP}|2${SEP}0${SEP})?` +
    `1${SEP}[0125]${SEP}` +
    Array.from({ length: 8 }, () => String.raw`\d`).join(SEP) +
    String.raw`(?![0-9A-Za-z])`,
  'g',
);

function isConcierge(digits) {
  return digits.slice(-10) === CONCIERGE_LAST10;
}

// Known non-phone digit runs that match the Egyptian mobile SHAPE but are
// functional identifiers — scrubbing them would break integrations:
//   · 1127958606 — the master Google Sheet id (gid), referenced across
//     workflows, scripts, docs and the Apps Script engine.
const ID_ALLOWLIST = new Set(['1127958606']);

function isAllowedId(digits) {
  return ID_ALLOWLIST.has(digits) || ID_ALLOWLIST.has(digits.slice(-10));
}

/** Scrub one free-text string: doubled prefixes → wa.me → Egyptian mobiles. */
function scrubText(s) {
  let out = s.replace(/\+20[\s]*\+20/g, '+20'); // "+20+20 109 …" → "+20 109 …"
  out = out.replace(WA_LINK_RE, `https://wa.me/${CONCIERGE_BARE}`);
  out = out.replace(PHONE_RE, (match, offset, str) => {
    const digits = match.replace(/\D/g, '');
    if (isConcierge(digits)) return match; // idempotent: concierge stays
    if (isAllowedId(digits)) return match; // functional ids (sheet gid) stay
    if (str.slice(Math.max(0, offset - 6), offset).includes('photo-')) {
      return match; // unsplash photo id inside an image URL — not a phone
    }
    return CONCIERGE;
  });
  return scrubLabeledContacts(out);
}

// ── v3: labeled-context malformed contacts ────────────────────────────────
// Real sheets carry mistyped owner contacts the strict 10-digit PHONE_RE
// refuses BY DESIGN (to protect prices, ids, UUIDs): an 11-digit run with an
// extra leading 1 ("contact: 11155953366"), a 9-digit run with a dropped
// digit ("رقم المالك: +20 10 2924495"), doubled prefixes. When a digit run
// sits DIRECTLY under an explicit contact label it is contact material BY
// INTENT — malformed or not — and becomes the concierge number. The label
// must be the last token before the digits (so "contact price: 1100000000"
// is safe: the nearest label-candidate there is "price", not a contact word).
const LABEL_BEFORE_RE = new RegExp(
  String.raw`(?<![A-Za-z])(?:` +
    String.raw`رقم\s*(?:المالك|الهاتف|التليفون)|اتصل|موبايل|هاتف|واتساب|تواصل|` +
    String.raw`contact|phone|mobile|whatsapp|tel` +
    String.raw`)(?![A-Za-z])[\s>:=#_()'"\-\u200e\u200f\u202a-\u202e]*$`,
  'i',
);
const LABEL_WINDOW = 28; // preceding chars inspected for the label
const LABELED_DIGITS_RE = /\+?\d[\d\s\-().\u200e\u200f\u202a-\u202e]{7,16}\d/g;

/** Malformed-but-labeled contact → concierge. Idempotent, bounded 9–13 digits. */
function scrubLabeledContacts(s) {
  return s.replace(LABELED_DIGITS_RE, (match, offset) => {
    const before = s.slice(Math.max(0, offset - LABEL_WINDOW), offset);
    if (!LABEL_BEFORE_RE.test(before)) return match;
    const digits = match.replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 13) return match; // real phones ± typos only
    if (isConcierge(digits) || isAllowedId(digits)) return match;
    if (before.includes('photo-')) return match; // unsplash id under an unlucky label
    return CONCIERGE;
  });
}

/** Verification twin of scrubLabeledContacts — returns labeled leftovers. */
function labeledLeftovers(s) {
  const left = [];
  for (const m of s.matchAll(LABELED_DIGITS_RE)) {
    const before = s.slice(Math.max(0, (m.index || 0) - LABEL_WINDOW), m.index || 0);
    if (!LABEL_BEFORE_RE.test(before)) continue;
    const digits = m[0].replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 13) continue;
    if (isConcierge(digits) || isAllowedId(digits)) continue;
    if (before.includes('photo-')) continue;
    left.push(m[0]);
  }
  return [...new Set(left)];
}

// ── JSON walk (key-aware price guard) ─────────────────────────────────────
const PRICE_KEY_RE =
  /price|rent|fee|budget|valuation|amount|area|sqm|meter|size|score|rating|lat|lng|zoom|year|count|total/i;
const PHONE_KEY_RE = /phone|mobile|whatsapp|contact|tel|موبايل|هاتف|تواصل/i;
const NUMERIC_ONLY = /^[\s\d\-().,+]+$/;

function walk(node, key) {
  if (typeof node === 'string') {
    // Numeric-shaped values in price-ish columns are prices, not phones.
    if (PRICE_KEY_RE.test(key || '') && !PHONE_KEY_RE.test(key) && NUMERIC_ONLY.test(node)) {
      return node;
    }
    return scrubText(node);
  }
  if (typeof node === 'number') {
    // A raw number in a phone column can be a phone — stringify & scrub.
    if (PHONE_KEY_RE.test(key || '')) {
      const digits = String(node).replace(/\D/g, '');
      if (digits.length >= 9 && digits.length <= 13 && !isConcierge(digits) && !isAllowedId(digits)) {
        return CONCIERGE; // malformed-but-labeled (key IS the label): 9–13 digits
      }
      return scrubText(String(node));
    }
    return node;
  }
  if (Array.isArray(node)) return node.map((v) => walk(v, key));
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = walk(v, k);
    return out;
  }
  return node;
}

// ── CSV (column-aware) ────────────────────────────────────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const s = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function csvLine(cells) {
  return cells
    .map((c) => (/[",\n\r]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c))
    .join(',');
}

const CSV_SCRUB_COL_RE = /phone|whatsapp|contact|mobile|هاتف|تواصل/i;
const CSV_TEXT_COL_RE = /message|notes|note|description|summary/i;
const CSV_SAFE_COL_RE = /record|^id$|unit\s*code|code|ref|price|rent|area|sqm|bed|bath/i;

function scrubCsv(text, label) {
  const rows = parseCsv(text);
  if (!rows.length) return { text, scrubbed: 0 };
  const header = rows[0].map((h) => h.trim());
  const phoneCols = new Set();
  const textCols = new Set();
  header.forEach((h, i) => {
    if (CSV_SAFE_COL_RE.test(h) && !CSV_SCRUB_COL_RE.test(h)) return;
    if (CSV_SCRUB_COL_RE.test(h)) phoneCols.add(i);
    else if (CSV_TEXT_COL_RE.test(h)) textCols.add(i);
  });
  let scrubbed = 0;
  const out = [rows[0]];
  for (let r = 1; r < rows.length; r++) {
    const cells = [...rows[r]];
    for (const i of phoneCols) {
      if (i >= cells.length) continue;
      const v = scrubText(cells[i]);
      if (v !== cells[i]) scrubbed++;
      cells[i] = v;
    }
    for (const i of textCols) {
      if (i >= cells.length) continue;
      const v = scrubText(cells[i]);
      if (v !== cells[i]) scrubbed++;
      cells[i] = v;
    }
    out.push(cells);
  }
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  return { text: out.map(csvLine).join(eol), scrubbed, label };
}

// ── Targets ───────────────────────────────────────────────────────────────
const JSON_TARGETS = [
  'apps/sierra-estates-realty/data/consolidated-master-inventory.json',
  'apps/sierra-estates-realty/data/online-sheet-units.json',
  'apps/sierra-estates-realty/data/real-listings.json',
  'apps/sierra-estates-realty/lib/inventory/snapshot.json', // v1 path bug: lives in lib/, not data/
  'apps/sierra-estates-realty/data/whatsapp-ingested-units.json',
  'packages/whatsapp-shared/inventory_extracted_units.json',
  'packages/whatsapp-shared/pending_owner_outreach.json',
  'packages/whatsapp-shared/data/listings.json',
  'packages/whatsapp-agent/data/listings.json', // same real owner data, second copy
];

const TEXT_TARGETS = [
  'apps/sierra-estates-realty/data/sample_chat_export.txt',
  'apps/sierra-estates-realty/data/houyez-properties.js',
  'apps/sierra-estates-realty/data/houyez-properties.ts',
  'apps/sierra-estates-realty/public/sierra-blu-manager.html',
  'apps/sierra-estates-realty/public/unit-normalizer.html',
  'apps/sierra-estates-realty/app/admin/intelligence/AgentIntelligence.tsx',
  // Docs carrying real owner numbers in prose/report tables:
  'docs/INVENTORY_WHATSAPP_REPORT.md',
  'docs/archive/reports/INVENTORY_WHATSAPP_REPORT.md',
  'docs/CURRENT_STATE_REPORT.md',
  'docs/DATA_GAP_REPORT.md',
  'docs/DATA_QUALITY_REPORT.md',
  // PF draft feed: 500+ real owner phones in <contact_phone> fields:
  'docs/drafts/propertyfinder/propertyfinder-full-feed.xml',
  // Operational scripts with real owner numbers in seed/demo data:
  'scripts/add-whatsapp-units-to-inventory.mjs',
  'scripts/openclaw-task-runner.ts',
  'scripts/GoogleAppsScript_SierraEstates_Engine.gs',
  'scripts/GoogleAppsScript_SierraEstates_Unified_Engine.gs',
  // Admin tools using a real owner number as the placeholder example:
  'sierra-blu-manager.html',
  'workflows/sierra-admin.html',
];

const CSV_DIRS = ['apps/sierra-estates-realty/public/downloads'];

// ── Verification ──────────────────────────────────────────────────────────
// Uses the SAME bounded separator-tolerant pattern as the scrub, so the
// guarantee is exact: no Egyptian mobile in any spaced/dashed form remains.
// Known-benign digit sequences are excluded BY DESIGN (they are not phones):
//   · WhatsApp group JIDs ("120363…@g.us") — digit-bounded, never matched
//   · UUIDs, task ids ("outreach-17902100…"), record ids (CSV id columns)
//   · Unsplash photo ids, CSS rgba values, hex colors
//   · non-Egyptian contacts (e.g. "+971 …" UAE broker numbers scraped from
//     public portals) — every public API surface already strips contact
//     fields wholesale (see /api/inventory PII strip + owner-privacy.ts)
function phoneLeftoversRaw(raw) {
  const matches = [...raw.matchAll(PHONE_RE)];
  return [
    ...labeledLeftovers(raw),
    ...new Set(
      matches
        .map((m) => m[0])
        .filter((m, i) => {
          const digits = m.replace(/\D/g, '');
          if (isConcierge(digits) || isAllowedId(digits)) return false;
          const off = matches[i].index || 0;
          if (raw.slice(Math.max(0, off - 6), off).includes('photo-')) return false;
          return true;
        }),
    ),
  ];
}

/** JSON-aware verify: only STRING values can carry phones — numeric fields
 *  (prices like 1100000000) are data, not contacts, and stay out of scope. */
function jsonPhoneLeftovers(raw) {
  let left = [];
  const visit = (node) => {
    if (typeof node === 'string') {
      for (const m of node.match(PHONE_RE) || []) {
        const digits = m.replace(/\D/g, '');
        if (!isConcierge(digits) && !isAllowedId(digits)) left.push(m);
      }
      left.push(...labeledLeftovers(node));
    } else if (Array.isArray(node)) node.forEach(visit);
    else if (node && typeof node === 'object') Object.values(node).forEach(visit);
  };
  try {
    visit(JSON.parse(raw));
  } catch {
    return phoneLeftoversRaw(raw); // not valid JSON — fall back to raw scan
  }
  return [...new Set(left)];
}

function csvPhoneLeftovers(raw) {
  const rows = parseCsv(raw.replace(/^\uFEFF/, ''));
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  const cols = new Set();
  header.forEach((h, i) => {
    if (CSV_SAFE_COL_RE.test(h) && !CSV_SCRUB_COL_RE.test(h)) return;
    if (CSV_SCRUB_COL_RE.test(h) || CSV_TEXT_COL_RE.test(h)) cols.add(i);
  });
  const left = [];
  for (let r = 1; r < rows.length; r++) {
    for (const i of cols) {
      const v = rows[r][i] || '';
      for (const m of v.match(PHONE_RE) || []) {
        const digits = m.replace(/\D/g, '');
        if (!isConcierge(digits) && !isAllowedId(digits)) left.push(`${header[i]}:${m}`);
      }
      for (const m of labeledLeftovers(v)) left.push(`${header[i]}:${m}`);
    }
  }
  return [...new Set(left)];
}

// ── Run ───────────────────────────────────────────────────────────────────
let totalScrubbed = 0;
const failures = [];

for (const rel of JSON_TARGETS) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) {
    console.warn(`  ⚠  skip (missing): ${rel}`);
    continue;
  }
  const raw = fs.readFileSync(p, 'utf8');
  const obj = JSON.parse(raw);
  const clean = walk(obj, '');
  const out = JSON.stringify(clean, null, 2) + '\n';
  const before = (raw.match(PHONE_RE) || []).filter((m) => !isConcierge(m.replace(/\D/g, ''))).length;
  fs.writeFileSync(p, out, 'utf8');
  totalScrubbed += before;
  console.log(`  ✓ ${rel} — ${before} mobile(s) replaced`);
}

for (const rel of TEXT_TARGETS) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) {
    console.warn(`  ⚠  skip (missing): ${rel}`);
    continue;
  }
  const raw = fs.readFileSync(p, 'utf8');
  const clean = scrubText(raw);
  const before = (raw.match(PHONE_RE) || []).filter((m) => !isConcierge(m.replace(/\D/g, ''))).length;
  fs.writeFileSync(p, clean, 'utf8');
  totalScrubbed += before;
  console.log(`  ✓ ${rel} — ${before} mobile(s) replaced`);
}

for (const dir of CSV_DIRS) {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) {
    if (!f.toLowerCase().endsWith('.csv')) continue;
    const p = path.join(d, f);
    const raw = fs.readFileSync(p, 'utf8');
    const { text } = scrubCsv(raw, f);
    const before = (raw.match(PHONE_RE) || []).filter((m) => !isConcierge(m.replace(/\D/g, ''))).length;
    fs.writeFileSync(p, text, 'utf8');
    totalScrubbed += before;
    console.log(`  ✓ ${dir}/${f} — ${before} mobile(s) replaced`);
  }
}

// XLSX workbooks are scrubbed separately (zip/sharedStrings) — see
// scripts/ops note: python3 scripts/scrub_xlsx_phones.py (one-off).

console.log(`\nScrub complete: ${totalScrubbed} replacement(s).`);

// Verification pass — zero tolerance on Egyptian mobiles.
console.log('\nVerifying (bounded separator-tolerant scan of every target):');
let bad = 0;
const verifyJsonText = [...JSON_TARGETS, ...TEXT_TARGETS];
for (const rel of verifyJsonText) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) continue;
  const raw = fs.readFileSync(p, 'utf8');
  const isJson = rel.endsWith('.json');
  const left = isJson ? jsonPhoneLeftovers(raw) : phoneLeftoversRaw(raw);
  if (left.length) {
    bad++;
    failures.push(rel);
    console.log(`  ✗ ${rel} — ${left.length} leftover(s): ${left.slice(0, 5).join(', ')}`);
  } else {
    console.log(`  ✓ ${rel} — clean`);
  }
}
for (const dir of CSV_DIRS) {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) {
    if (!f.toLowerCase().endsWith('.csv')) continue;
    const p = path.join(d, f);
    const raw = fs.readFileSync(p, 'utf8');
    const left = csvPhoneLeftovers(raw);
    if (left.length) {
      bad++;
      failures.push(`${dir}/${f}`);
      console.log(`  ✗ ${dir}/${f} — ${left.length} leftover(s): ${left.slice(0, 5).join(', ')}`);
    } else {
      console.log(`  ✓ ${dir}/${f} — clean (phone/message columns)`);
    }
  }
}

if (bad) {
  console.error(`\nFAILED: ${bad} file(s) still carry non-concierge Egyptian mobiles.`);
  process.exit(1);
}
console.log('\nALL CLEAN — no non-concierge Egyptian mobiles remain in targeted files.');
console.log('Reminder: the repo should also be set to PRIVATE (GitHub → Settings → Danger Zone).');
