import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(path.join(root, 'firebase.json'), 'utf8'));
const expectedRules = {
  firestore: 'apps/sierra-estates-realty/firestore.rules',
  storage: 'apps/sierra-estates-realty/storage.rules',
};
const mirrors = {
  firestore: 'firestore.rules',
  storage: 'storage.rules',
};
const errors = [];

function readNormalized(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
}

for (const [service, expectedPath] of Object.entries(expectedRules)) {
  const actualPath = config[service]?.rules;
  if (actualPath !== expectedPath) {
    errors.push(`${service}.rules must point to ${expectedPath}; found ${actualPath ?? 'nothing'}`);
    continue;
  }

  const canonical = readNormalized(expectedPath);
  const mirror = readNormalized(mirrors[service]);
  if (canonical !== mirror) {
    errors.push(`${service} rules mirror differs from ${expectedPath}`);
  }
}

if (errors.length > 0) {
  console.error('Firebase rule configuration check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Firebase rule configuration is canonical and synchronized.');
