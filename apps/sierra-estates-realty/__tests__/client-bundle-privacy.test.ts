import fs from 'fs';
import path from 'path';

const FORBIDDEN_JSONS = [
  'consolidated-master-inventory.json',
  'online-sheet-units.json',
  'snapshot.json',
  'real-listings.json',
  'master-inventory-9k.json',
];

// Matches actual import/require statements (not comments)
const IMPORT_RE = /(?:import\s+\w[\w,\s{}*]*?\s+from|require\s*\()\s*['"][^'"]*\.json['"]/g;

function getClientFiles(dir: string): string[] {
  let results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const skip = ['node_modules', '.next', '.git', 'coverage', 'dist', '__tests__', 'scripts'];
    if (skip.includes(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getClientFiles(fullPath));
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes("'use client'") || content.includes('"use client"')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

describe('Client Bundle Privacy — Owner Phone & Inventory Leak Prevention', () => {
  it('must not import phone-bearing inventory JSONs in any "use client" file', () => {
    const rootAppDir = path.resolve(__dirname, '..');
    const clientFiles = getClientFiles(rootAppDir);

    expect(clientFiles.length).toBeGreaterThan(0);

    const violations: { file: string; match: string }[] = [];

    for (const file of clientFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const importMatches = content.match(IMPORT_RE) || [];
      for (const imp of importMatches) {
        for (const forbidden of FORBIDDEN_JSONS) {
          if (imp.includes(forbidden)) {
            violations.push({ file: path.relative(rootAppDir, file), match: imp.trim() });
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
