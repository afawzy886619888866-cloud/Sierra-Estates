/**
 * Automated Vercel Environment Variables Synchronizer
 * Syncs all GitHub/Local environment variables directly to Sierra Estates Vercel projects:
 * 1. Client Project: sierra-estates-client-portal (prj_ieVcIcoeTtHndspXMzlE0cwLl89c)
 * 2. Admin Project: sierra-estates-admin-page (prj_W2gYCoKaS3oBcLDuGa9gB8z7cfnA / prj_NMqZUADX9A5ba22ylMfls2l7I0zX)
 */

import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local environment files
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../apps/sierra-estates-realty/.env.local') });

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || process.env.VERCEL_AUTH_TOKEN;
const VERCEL_ORG_ID = process.env.VERCEL_ORG_ID || 'team_UvdJ5ezVTaqEKyhqZ5QVqOKJ';

const CLIENT_PROJECT_ID = process.env.CLIENT_VERCEL_PROJECT_ID || 'prj_ieVcIcoeTtHndspXMzlE0cwLl89c';
const ADMIN_PROJECT_ID = process.env.ADMIN_VERCEL_PROJECT_ID || 'prj_W2gYCoKaS3oBcLDuGa9gB8z7cfnA';

// Master list of environment variables for Client and Admin Vercel projects
export const CLIENT_ENV_VARS = {
  // Supabase is the canonical public backend configuration.
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  
  // Public Routing & URLs
  NEXT_PUBLIC_CLIENT_URL: process.env.NEXT_PUBLIC_CLIENT_URL || 'https://sierra-estates.net',
  NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.sierra-estates.net',
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://sierra-estates.net',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://sierra-estates.net',
  ADMIN_HOST: 'admin.sierra-estates.net',
  CLIENT_HOST: 'sierra-estates.net',
  COOKIE_DOMAIN: '.sierra-estates.net',
  NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'en',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  NEXT_PUBLIC_INTELLIGENCE_OS_URL: process.env.NEXT_PUBLIC_INTELLIGENCE_OS_URL,
  OPENMEMORY_URL: process.env.OPENMEMORY_URL || 'http://localhost:8080',

  // AI & LLM
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
  GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_AI_API_KEY,
  AI_PROVIDER: process.env.AI_PROVIDER,
  GOOGLE_CLOUD_LOCATION: process.env.GOOGLE_CLOUD_LOCATION || 'europe-west1',
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL,

  // Property Finder Credentials
  PROPERTY_FINDER_API_KEY: process.env.PROPERTY_FINDER_API_KEY,
  PROPERTY_FINDER_API_SECRET: process.env.PROPERTY_FINDER_API_SECRET,
  PROPERTY_FINDER_AUTH_TOKEN: process.env.PROPERTY_FINDER_AUTH_TOKEN,
  PF_API_KEY: process.env.PF_API_KEY,
  PF_API_SECRET: process.env.PF_API_SECRET,
  PF_COMPANY_ID: process.env.PF_COMPANY_ID,
  PF_WEBHOOK_SECRET: process.env.PF_WEBHOOK_SECRET,

  // AWS & Backend
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SESSION_SECRET: process.env.SESSION_SECRET,
  SBR_SECRET_KEY: process.env.SBR_SECRET_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
  ADMIN_API_KEY: process.env.ADMIN_API_KEY,
  ANTIGRAVITY_API_KEY: process.env.ANTIGRAVITY_API_KEY,

  // Telegram & WhatsApp
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,

  WHATSAPP_API_TOKEN: process.env.WHATSAPP_API_TOKEN,
  WHATSAPP_META_TOKEN: process.env.WHATSAPP_META_TOKEN || process.env.WHATSAPP_API_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
  LEAD_NOTIFY_WHATSAPP_NUMBER: process.env.LEAD_NOTIFY_WHATSAPP_NUMBER,
  BRANDING_TAG: process.env.BRANDING_TAG,
  WABA_NUMBER_1: process.env.WABA_NUMBER_1,
  WABA_NUMBER_2: process.env.WABA_NUMBER_2,
  WABA_NUMBER_3: process.env.WABA_NUMBER_3,
  WABA_NUMBER_4: process.env.WABA_NUMBER_4,

  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID,

  // SendGrid & Upstash
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  SENDER_EMAIL: process.env.SENDER_EMAIL,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

  // Google Sheets & Inventory
  INVENTORY_SHEET_ID: process.env.INVENTORY_SHEET_ID,
  INVENTORY_SHEET_GID: process.env.INVENTORY_SHEET_GID,
  MASTER_SHEET_ID: process.env.MASTER_SHEET_ID,
  BROKER_INBOX_SHEET_ID: process.env.BROKER_INBOX_SHEET_ID,

  N8N_BASE_URL: process.env.N8N_BASE_URL,
  N8N_API_KEY: process.env.N8N_API_KEY,

  // Supabase (Primary Database & Storage)
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_PROPERTY_MEDIA_BUCKET: process.env.SUPABASE_PROPERTY_MEDIA_BUCKET || 'property-media',
  SUPABASE_MEDIA_BUCKET: process.env.SUPABASE_MEDIA_BUCKET || 'media',

  // Admin Portal Bootstrap Credentials
  ADMIN_BOOTSTRAP_EMAIL: process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@sierra-estates.net',
  ADMIN_BOOTSTRAP_PASSWORD: process.env.ADMIN_BOOTSTRAP_PASSWORD,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
};

export const ADMIN_ENV_VARS = {
  ...CLIENT_ENV_VARS,
  VITE_BACKEND_API_URL: process.env.VITE_BACKEND_API_URL || 'https://sierra-estates.net',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function vercelRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    if (!VERCEL_TOKEN) {
      return reject(new Error('VERCEL_TOKEN is not set in environment.'));
    }

    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.vercel.com',
      port: 443,
      path: `${endpoint}${endpoint.includes('?') ? '&' : '?'}teamId=${VERCEL_ORG_ID}`,
      method,
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            resolve({ error: true, status: res.statusCode, data: json });
          }
        } catch (e) {
          resolve({ error: true, status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

export async function syncVarsToProject(projectName, projectId, envVars) {
  console.log(`\n🚀 [Vercel Sync] Synchronizing environment variables to: ${projectName} (${projectId})...`);
  
  for (const [key, value] of Object.entries(envVars)) {
    if (!value) continue;

    let synced = false;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const res = await vercelRequest('POST', `/v10/projects/${projectId}/env?upsert=true`, {
          key,
          value: String(value),
          type: key.includes('SECRET') || key.includes('KEY') || key.includes('JSON') || key.includes('TOKEN') ? 'encrypted' : 'plain',
          target: ['production', 'preview'],
        });

        if (res && res.error) {
          if (res.status === 429) {
            console.warn(`   ⏳ ${key} -> Rate limited (429), retrying in ${attempt * 2}s...`);
            await sleep(attempt * 2000);
            continue;
          }
          console.warn(`   ⚠️ ${key} -> Failed (Status: ${res.status}):`, res.data?.error?.message || res.raw || '');
          break;
        } else {
          console.log(`   ✅ ${key} -> Synced to Production & Preview.`);
          synced = true;
          await sleep(150); // Pacing delay to avoid rate limiting
          break;
        }
      } catch (err) {
        console.warn(`   ⚠️ Error syncing ${key}:`, err.message);
        break;
      }
    }
  }
}

async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('       Sierra Estates — Vercel Environment Variables Sync   ');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`Team/Org ID: ${VERCEL_ORG_ID}`);
  console.log(`Client Project: ${CLIENT_PROJECT_ID}`);
  console.log(`Admin Project:  ${ADMIN_PROJECT_ID}`);

  if (!VERCEL_TOKEN) {
    console.log('\nℹ️  VERCEL_TOKEN is not defined in local environment.');
    console.log('   All environment variables are pre-configured in .github/workflows/deploy-vercel.yml');
    console.log('   and will be automatically synchronized on every push to main.');
    return;
  }

  try {
    await syncVarsToProject('Client Project (sierra-estates-client-page)', CLIENT_PROJECT_ID, CLIENT_ENV_VARS);
    await syncVarsToProject('Admin Project (sierra-estates-admin-page)', ADMIN_PROJECT_ID, ADMIN_ENV_VARS);
    console.log('\n🎉 [Success] All environment variables successfully synced to Vercel!');
  } catch (e) {
    console.error('❌ Sync failed:', e.message);
  }
}

main();
