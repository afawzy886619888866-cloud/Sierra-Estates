#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const target = path.join(__dirname, 'write-memory.ts');

const result = spawnSync('npx', ['tsx', target, ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
});

process.exit(result.status ?? 0);
