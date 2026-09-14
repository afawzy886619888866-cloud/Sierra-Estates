/**
 * GitHub Actions environment provisioner.
 *
 * Values are read from the operator's environment. This script intentionally
 * contains no project credentials, tokens, service keys, or bootstrap passwords.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../apps/sierra-estates-realty/.env.local') });

const REPO = process.env.GITHUB_REPOSITORY || 'sierrablue8866-droid/SE-Vercel-deploy-main';

const VARIABLES = [
  'MAINTAINER_EMAIL',
  'CLIENT_VERCEL_PROJECT_ID',
  'ADMIN_VERCEL_PROJECT_ID',
  'VERCEL_ORG_ID',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_DEFAULT_LOCALE',
  'ALLOWED_ORIGINS',
  'GOOGLE_CLOUD_LOCATION',
  'AWS_REGION',
  'BRANDING_TAG',
  'DEEPSEEK_API_URL',
  'PF_COMPANY_ID',
  'OPENMEMORY_URL',
  'N8N_BASE_URL',
  'PROPERTY_FINDER_API_BASE',
  'BROKER_INBOX_SHEET_ID',
  'INVENTORY_SHEET_ID',
  'INVENTORY_SHEET_GID',
  'MASTER_SHEET_ID',
  'SENDGRID_FROM_EMAIL',
  'SENDER_EMAIL',
  'WHATSAPP_PHONE_NUMBER_ID',
  'LEAD_NOTIFY_WHATSAPP_NUMBER',
  'NEXT_PUBLIC_TELEGRAM_BOT_USERNAME',
  'NEXT_PUBLIC_INTELLIGENCE_OS_URL',
  'TWILIO_MESSAGING_SERVICE_SID',
  'AI_PROVIDER',
];

const SECRETS = [
  'VERCEL_TOKEN',
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_BOOTSTRAP_PASSWORD',
  'SESSION_SECRET',
  'SBR_SECRET_KEY',
  'CRON_SECRET',
  'ADMIN_API_KEY',
  'ANTIGRAVITY_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_WEBHOOK_SECRET',
  'TELEGRAM_CHAT_ID',
  'GOOGLE_AI_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_GENAI_API_KEY',
  'DEEPSEEK_API_KEY',
  'PROPERTY_FINDER_API_KEY',
  'PROPERTY_FINDER_API_SECRET',
  'PROPERTY_FINDER_AUTH_TOKEN',
  'PF_API_KEY',
  'PF_API_SECRET',
  'PF_WEBHOOK_SECRET',
  'WHATSAPP_API_TOKEN',
  'WHATSAPP_META_TOKEN',
  'WHATSAPP_VERIFY_TOKEN',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'SENDGRID_API_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'N8N_API_KEY',
];

function setGitHubValue(kind, key) {
  const value = process.env[key];
  if (!value) {
    console.log(`Skipping ${kind} ${key}: not present in the operator environment.`);
    return;
  }

  execFileSync('gh', [kind, 'set', key, '--repo', REPO], {
    input: `${value}\n`,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  console.log(`Configured ${kind} ${key}.`);
}

for (const key of VARIABLES) setGitHubValue('variable', key);
for (const key of SECRETS) setGitHubValue('secret', key);
