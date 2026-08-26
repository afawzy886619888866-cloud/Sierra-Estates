import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const forbiddenNames = [
  'NEXT_PUBLIC_' + 'GEMINI_API_KEY',
  'NEXT_PUBLIC_' + 'TELEGRAM_BOT_TOKEN',
];
const configFiles = [
  '.env.example',
  'apps/sierra-estates-realty/.env.local.example',
  '.github/workflows/deploy-vercel.yml',
  'scripts/sync-vercel-env.js',
  'scripts/deployment/push_all_vercel_envs.js',
  'turbo.json',
];
const sourceRoots = [
  'apps/sierra-estates-realty',
  'scripts',
];
const sourceExtensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx']);
const skippedDirectories = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', 'graphify-out']);
const thisFile = path.resolve(fileURLToPath(import.meta.url));
const files = new Set(configFiles.map((file) => path.join(root, file)));

function collectSourceFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (skippedDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(absolutePath);
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      files.add(absolutePath);
    }
  }
}

for (const sourceRoot of sourceRoots) collectSourceFiles(path.join(root, sourceRoot));

const violations = [];
for (const file of files) {
  if (path.resolve(file) === thisFile || !statSync(file).isFile()) continue;
  const content = readFileSync(file, 'utf8');
  for (const forbiddenName of forbiddenNames) {
    if (content.includes(forbiddenName)) {
      violations.push(`${path.relative(root, file)} contains ${forbiddenName}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Public environment safety check failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('No server credentials are configured as browser-visible environment variables.');
