import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimeRoots = [
  'apps/sierra-estates-realty/app/api',
  'apps/sierra-estates-realty/lib/services',
  'packages/db/lib',
];
const extensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx']);
const skipped = new Set(['node_modules', '.next', 'dist', 'build', 'coverage']);
const forbidden = [
  /\b(?:from|require\()\s*['"][^'"]*firebase(?:-admin)?[^'"]*['"]/,
  /\b(?:NEXT_PUBLIC_)?FIREBASE_[A-Z0-9_]+/,
];
const compatibilityFiles = new Set([
  path.normalize('packages/db/lib/index.ts'),
]);

function collect(directory, files = []) {
  if (!statSync(directory, { throwIfNoEntry: false })) return files;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (skipped.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(file, files);
    else if (extensions.has(path.extname(entry.name))) files.push(file);
  }
  return files;
}

const violations = [];
for (const relativeRoot of runtimeRoots) {
  for (const file of collect(path.join(root, relativeRoot))) {
    if (compatibilityFiles.has(path.relative(root, file))) continue;
    const content = readFileSync(file, 'utf8');
    if (forbidden.some((pattern) => pattern.test(content))) {
      violations.push(path.relative(root, file));
    }
  }
}

if (violations.length > 0) {
  console.error('Legacy runtime boundary check failed. Active Supabase paths must not import Firebase or read Firebase credentials:');
  for (const file of violations) console.error(`- ${file}`);
  process.exit(1);
}

console.log('Legacy runtime boundary check passed for active Supabase paths.');
