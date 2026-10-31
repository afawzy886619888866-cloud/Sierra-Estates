/**
 * scripts/sanitize-data-json.mjs
 *
 * FIX 2: Sanitize committed JSON inventory files in apps/sierra-estates-realty/data/
 * Replaces all Egyptian owner mobile numbers with +201092048333 (the flagship concierge).
 * Does NOT rewrite git history — only modifies working-tree files.
 *
 * Target files:
 *   - consolidated-master-inventory.json
 *   - online-sheet-units.json
 *   - snapshot.json
 *   - real-listings.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(ROOT, 'apps/sierra-estates-realty/data');

const CONCIERGE = '+201092048333';
const CONCIERGE_BARE = '201092048333';

// Matches Egyptian mobiles in multiple formats, excluding the concierge itself
// e.g. 01012345678, +201012345678, 201012345678, 00201012345678
const EG_MOBILE_RE = /(?:\+?20|0{1,2}20?)?1[0125][0-9]{8}/g;

const TARGET_FILES = [
  'consolidated-master-inventory.json',
  'online-sheet-units.json',
  'snapshot.json',
  'real-listings.json',
];

// Phone-related field keys (case-insensitive match)
const PHONE_KEYS_RE = /phone|mobile|whatsapp|contact|tel|موبايل|هاتف|تواصل/i;
const WA_LINK_RE = /https?:\/\/wa\.me\/[0-9]+/gi;

function sanitizeValue(value) {
  if (typeof value !== 'string') return value;

  // Replace wa.me links
  value = value.replace(WA_LINK_RE, `https://wa.me/${CONCIERGE_BARE}`);

  // Replace Egyptian mobile patterns (but not if it's already our concierge)
  value = value.replace(EG_MOBILE_RE, (match) => {
    const stripped = match.replace(/[^0-9]/g, '');
    if (stripped === CONCIERGE_BARE || stripped === `20${CONCIERGE_BARE.slice(-10)}`) {
      return match; // Keep concierge number intact
    }
    return CONCIERGE;
  });

  return value;
}

function sanitizeObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj !== null && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (PHONE_KEYS_RE.test(k) && (typeof v === 'string' || typeof v === 'number')) {
        // Directly sanitize phone-keyed fields
        out[k] = sanitizeValue(String(v));
      } else {
        out[k] = sanitizeObject(v);
      }
    }
    return out;
  }
  return sanitizeValue(obj);
}

let totalReplaced = 0;

for (const filename of TARGET_FILES) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠  Skipping (not found): ${filename}`);
    continue;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const sanitized = sanitizeObject(parsed);
  const out = JSON.stringify(sanitized, null, 2);

  // Count replacements by diffing the strings
  const before = raw;
  const replaced = (before.match(EG_MOBILE_RE) || []).filter(m => {
    const stripped = m.replace(/[^0-9]/g, '');
    return stripped !== CONCIERGE_BARE && stripped !== `20${CONCIERGE_BARE.slice(-10)}`;
  }).length;

  fs.writeFileSync(filePath, out, 'utf8');
  totalReplaced += replaced;
  console.log(`  ✓ ${filename} — ${replaced} phone(s) sanitized`);
}

console.log(`\nSanitization complete. Total replacements: ${totalReplaced}`);
console.log(`⚠  IMPORTANT: Set GitHub repo to PRIVATE in GitHub → Settings → General → Danger Zone`);
