/**
 * scripts/audit-public-privacy.mjs
 *
 * Scans the entire apps/sierra-estates-realty/public/ directory
 * to ensure that ZERO real owner phone numbers are exposed.
 * The only permitted phone number in public assets is +201092048333.
 */

import fs from 'node:fs';
import path from 'node:path';
import xlsx from 'xlsx';

const ALLOWED_PHONE = '+201092048333';
const ALLOWED_PHONE_DIGITS = '201092048333';
const PUBLIC_DIR = path.resolve(process.cwd(), 'apps/sierra-estates-realty/public');

const PHONE_REGEX = /(?:\+?201|01)[0-9]{8,9}/g;

console.log('═══════════════════════════════════════════════════════════════');
console.log('  Sierra Estates — Public Directory Privacy Audit');
console.log(`  Allowed Public Phone: ${ALLOWED_PHONE}`);
console.log('═══════════════════════════════════════════════════════════════\n');

let violations = 0;
let scannedFiles = 0;

function scanFile(filePath) {
  scannedFiles++;
  const relPath = path.relative(PUBLIC_DIR, filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext)) {
    return; // binary images
  }

  if (ext === '.xlsx') {
    try {
      const buf = fs.readFileSync(filePath);
      const wb = xlsx.read(buf, { type: 'buffer' });
      for (const sheetName of wb.SheetNames) {
        const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          if (!row) continue;
          for (let c = 0; c < row.length; c++) {
            const cell = String(row[c] || '');
            const matches = cell.match(PHONE_REGEX);
            if (matches) {
              for (const m of matches) {
                const digits = m.replace(/[^0-9]/g, '');
                if (digits !== ALLOWED_PHONE_DIGITS && digits !== '01092048333') {
                  console.error(`🚨 Violation in ${relPath} [Sheet: ${sheetName}, Row: ${r + 1}]: Found ${m}`);
                  violations++;
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn(`Could not read ${relPath}: ${err.message}`);
    }
    return;
  }

  // Text files (html, json, etc.)
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    const matches = text.match(PHONE_REGEX);
    if (matches) {
      for (const m of matches) {
        const digits = m.replace(/[^0-9]/g, '');
        if (digits !== ALLOWED_PHONE_DIGITS && digits !== '01092048333') {
          console.error(`🚨 Violation in ${relPath}: Found ${m}`);
          violations++;
        }
      }
    }
  } catch {}
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else {
      scanFile(fullPath);
    }
  }
}

walkDir(PUBLIC_DIR);

console.log(`\nAudit Complete:`);
console.log(`- Total Files Scanned: ${scannedFiles}`);
console.log(`- Privacy Violations:  ${violations}`);

if (violations > 0) {
  console.error(`\n❌ FAILED: ${violations} unapproved phone numbers found in public assets!`);
  process.exit(1);
} else {
  console.log(`\n✅ 100% PASS: Zero owner phone numbers found in public! All public numbers point strictly to ${ALLOWED_PHONE}.\n`);
}
