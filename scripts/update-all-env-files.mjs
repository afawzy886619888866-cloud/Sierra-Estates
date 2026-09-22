#!/usr/bin/env node
/**
 * Sierra Estates — Universal Environment Synchronizer
 * Synchronizes authoritative credentials across all workspace .env files:
 *  - .env.local (root)
 *  - apps/sierra-estates-realty/.env.local
 *  - apps/agents/sierra-estates-bot/.env
 *  - apps/agents/vertex-omni-agent/.env
 *  - apps/api/.env
 *  - infra/openwa/.env
 *  - workflows/.env
 *  - .env.vercel.local
 *  - .vercel/.env.production.local
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const rootEnvLocal = path.join(ROOT, '.env.local');
if (!fs.existsSync(rootEnvLocal)) {
  console.error('❌ Root .env.local not found!');
  process.exit(1);
}

const master = dotenv.parse(fs.readFileSync(rootEnvLocal, 'utf-8'));
console.log(`✅ Loaded ${Object.keys(master).length} master keys from root .env.local`);

function upsertEnvFile(targetRelPath, specificKeys = null, customMappings = {}) {
  const targetPath = path.join(ROOT, targetRelPath);
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let existing = {};
  let originalContent = '';
  if (fs.existsSync(targetPath)) {
    originalContent = fs.readFileSync(targetPath, 'utf-8');
    existing = dotenv.parse(originalContent);
  }

  // Determine which keys to apply
  const keysToUpdate = specificKeys || Object.keys(master);
  let updatedCount = 0;

  for (const key of keysToUpdate) {
    const masterVal = master[key];
    if (masterVal !== undefined && masterVal !== '') {
      existing[key] = masterVal;
      updatedCount++;
    }
  }

  // Apply custom mappings if any
  for (const [targetKey, sourceKey] of Object.entries(customMappings)) {
    const val = typeof sourceKey === 'function' ? sourceKey(master) : master[sourceKey];
    if (val !== undefined && val !== '') {
      existing[targetKey] = val;
      updatedCount++;
    }
  }

  // Rebuild file preserving comments where possible or cleanly writing key-values
  const lines = [];
  lines.push(`# Sierra Estates — Auto-synchronized on ${new Date().toISOString()}`);
  lines.push(`# Authoritative Stack: Supabase + Vercel + AWS EC2\n`);

  for (const [k, v] of Object.entries(existing)) {
    // If value contains spaces, quotes, or newlines, format appropriately
    const formattedVal = (String(v).includes(' ') || String(v).includes('\n') || String(v).includes('"') || String(v).includes('#'))
      ? JSON.stringify(String(v))
      : String(v);
    lines.push(`${k}=${formattedVal}`);
  }

  fs.writeFileSync(targetPath, lines.join('\n') + '\n', 'utf-8');
  console.log(`✅ Synced ${targetRelPath} (${Object.keys(existing).length} keys total, ${updatedCount} master updates)`);
}

// 1. apps/sierra-estates-realty/.env.local (full sync with master)
upsertEnvFile('apps/sierra-estates-realty/.env.local');

// 2. apps/agents/sierra-estates-bot/.env
upsertEnvFile('apps/agents/sierra-estates-bot/.env', [
  'GOOGLE_AI_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_GENAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_URL',
  'WHATSAPP_API_TOKEN',
  'WHATSAPP_META_TOKEN',
  'WHATSAPP_VERIFY_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_API_KEY',
  'WHATSAPP_API_URL',
  'LEAD_NOTIFY_WHATSAPP_NUMBER',
  'NEXT_PUBLIC_WHATSAPP_NUMBER',
  'WABA_NUMBER_1',
  'WABA_NUMBER_2',
  'WABA_NUMBER_3',
  'WABA_NUMBER_4',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'SENDGRID_API_KEY',
  'SENDGRID_FROM_EMAIL',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'ADMIN_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
]);

// 3. apps/agents/vertex-omni-agent/.env
upsertEnvFile('apps/agents/vertex-omni-agent/.env', [
  'GOOGLE_AI_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_GENAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_URL',
  'PROPERTY_FINDER_API_KEY',
  'PROPERTY_FINDER_API_SECRET',
  'PROPERTY_FINDER_AUTH_TOKEN',
  'PROPERTY_FINDER_API_BASE',
  'ADMIN_API_KEY',
  'CRON_SECRET',
  'GOOGLE_CLOUD_LOCATION',
  'AWS_REGION',
]);

// 4. apps/api/.env (Python FastAPI)
upsertEnvFile('apps/api/.env', [
  'GOOGLE_AI_API_KEY',
  'GEMINI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_URL',
  'DEEPSEEK_API_KEY',
  'PROPERTY_FINDER_API_KEY',
  'PROPERTY_FINDER_API_SECRET',
  'PROPERTY_FINDER_API_GATEWAY',
  'ALLOWED_ORIGINS',
  'LOG_LEVEL',
]);

// 5. infra/openwa/.env (EC2 OpenWA & n8n)
upsertEnvFile('infra/openwa/.env', null, {
  SUPABASE_URL: 'NEXT_PUBLIC_SUPABASE_URL',
  SUPABASE_SERVICE_ROLE_KEY: 'SUPABASE_SERVICE_ROLE_KEY',
  SUPABASE_ANON_KEY: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  SBR_SECRET_KEY: 'SBR_SECRET_KEY',
  GEMINI_API_KEY: 'GEMINI_API_KEY',
  N8N_API_KEY: 'N8N_API_KEY',
  WEBHOOK_URL: () => 'http://18.232.148.172:5678',
  N8N_EDITOR_BASE_URL: () => 'http://18.232.148.172:5678',
  PROPERTY_FINDER_WEBHOOK_SECRET: 'PF_WEBHOOK_SECRET',
});

// 6. workflows/.env
upsertEnvFile('workflows/.env', [
  'WHATSAPP_API_URL',
  'WHATSAPP_API_TOKEN',
  'TELEGRAM_BOT_TOKEN',
  'GEMINI_API_KEY',
  'GOOGLE_AI_API_KEY',
  'AWS_REGION',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]);

// 7. .env.vercel.local & .vercel/.env.production.local
upsertEnvFile('.env.vercel.local', [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_PROPERTY_MEDIA_BUCKET',
  'SUPABASE_MEDIA_BUCKET',
  'VERCEL_TOKEN',
  'VERCEL_ORG_ID',
  'CLIENT_VERCEL_PROJECT_ID',
  'ADMIN_VERCEL_PROJECT_ID',
]);

upsertEnvFile('.vercel/.env.production.local', [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_PROPERTY_MEDIA_BUCKET',
  'SUPABASE_MEDIA_BUCKET',
  'VERCEL_TOKEN',
  'VERCEL_ORG_ID',
  'CLIENT_VERCEL_PROJECT_ID',
  'ADMIN_VERCEL_PROJECT_ID',
]);

console.log('\n🎉 ALL .ENV FILES SYNCHRONIZED SUCCESSFULLY ACROSS ALL PLATFORMS!');
