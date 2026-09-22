#!/usr/bin/env node
/**
 * Arc 3 production auditor.
 *
 * This is a read-only consolidation gate for the Arc survey criteria:
 * backend authority, secret hygiene, deployment configuration, agent fleet
 * wiring, and retired-runtime boundaries. It never prints secret values.
 *
 * Exit codes:
 *   0 - no blocking findings
 *   1 - blocking findings exist
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const findings = [];

const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const read = (relativePath) => {
  const filePath = path.join(root, relativePath);
  return exists(relativePath) ? fs.readFileSync(filePath, 'utf8') : '';
};
const configured = (name) => typeof process.env[name] === 'string' && process.env[name].trim() !== '';

function add(severity, area, message) {
  findings.push({ severity, area, message });
}

const requiredFiles = [
  'supabase/schema.sql',
  'scripts/check-backend-policy.mjs',
  'scripts/check-public-env-safety.mjs',
  'scripts/check-legacy-runtime-boundary.mjs',
  '.github/workflows/agent-fleet.yml',
];

for (const file of requiredFiles) {
  if (!exists(file)) add('BLOCKER', 'repository', `Missing required production control: ${file}`);
}

const publicEnv = read('apps/sierra-estates-realty/.env.local.example');
if (/SUPABASE_SERVICE_ROLE_KEY|PROPERTY_FINDER_API_SECRET|TELEGRAM_BOT_TOKEN/i.test(publicEnv)) {
  add('BLOCKER', 'secret-hygiene', 'A server credential is documented in the client environment template.');
}

const legacyWorkflow = read('infra/n8n-workflows/02-whatsapp-bot-handler.json');
if (legacyWorkflow && /firebase|firestore|realtimedatabase/i.test(legacyWorkflow)) {
  add('WARN', 'runtime-boundary', 'The inactive n8n WhatsApp workflow still references Firebase and must remain retired or be migrated before activation.');
}

const openClawSkill = read('.agents/skills/openclaw-architect/SKILL.md');
if (
  openClawSkill &&
  /airtableApiKey|AIRTABLE_API_KEY|airtableBaseId/i.test(openClawSkill) &&
  !/legacy compatibility only/i.test(openClawSkill)
) {
  add('WARN', 'backend-authority', 'OpenClaw documentation still advertises Airtable configuration although Supabase is authoritative.');
}

const requiredProductionEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  'SUPABASE_SERVICE_ROLE_KEY',
  'SESSION_SECRET',
  'SBR_SECRET_KEY',
  'CRON_SECRET',
];
for (const name of requiredProductionEnv) {
  if (Array.isArray(name)) {
    if (!name.some(configured)) {
      add('BLOCKER', 'production-env', `Missing runtime variable: ${name.join(' or ')}`);
    }
  } else if (!configured(name)) {
    add('BLOCKER', 'production-env', `Missing runtime variable: ${name}`);
  }
}

const featureEnvGroups = [
  ['AI provider', ['GOOGLE_AI_API_KEY', 'GOOGLE_GENAI_API_KEY', 'GEMINI_API_KEY']],
  ['Property Finder', ['PROPERTY_FINDER_API_KEY']],
  ['Telegram', ['TELEGRAM_BOT_TOKEN']],
];
for (const [label, names] of featureEnvGroups) {
  if (!names.some(configured)) add('WARN', 'feature-env', `${label} credentials are not configured in this process.`);
}

const blockers = findings.filter((finding) => finding.severity === 'BLOCKER');
const warnings = findings.filter((finding) => finding.severity === 'WARN');

console.log('Arc 3 production auditor');
console.log(`Root: ${root}`);
console.log(`Result: ${blockers.length ? 'BLOCKED' : 'PASS WITH FOLLOW-UP'}`);
console.log(`Blockers: ${blockers.length}`);
console.log(`Warnings: ${warnings.length}`);

for (const finding of findings) {
  console.log(`[${finding.severity}] ${finding.area}: ${finding.message}`);
}

if (!findings.length) console.log('No repository or runtime findings detected.');
process.exitCode = blockers.length ? 1 : 0;
