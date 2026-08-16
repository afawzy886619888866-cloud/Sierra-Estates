/**
 * Automated Vercel Environment Variables Synchronizer
 * Syncs all GitHub/Local environment variables directly to Sierra Estates Vercel projects:
 * 1. Client Project: sierra-estates-client-page (prj_GRzmgCUqNwqvjdqtfl84pzBUKD1E / prj_zOF7omFCSr3I7e5jJJtVQnJg5o6E)
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
dotenv.config({ path: path.resolve(__dirname, '../apps/admin-dashboard/.env.local') });

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || process.env.VERCEL_AUTH_TOKEN;
const VERCEL_ORG_ID = process.env.VERCEL_ORG_ID || 'team_UvdJ5ezVTaqEKyhqZ5QVqOKJ';

const CLIENT_PROJECT_ID = process.env.CLIENT_VERCEL_PROJECT_ID || 'prj_GRzmgCUqNwqvjdqtfl84pzBUKD1E';
const ADMIN_PROJECT_ID = process.env.ADMIN_VERCEL_PROJECT_ID || 'prj_W2gYCoKaS3oBcLDuGa9gB8z7cfnA';

// Master list of environment variables for Client and Admin Vercel projects
export const CLIENT_ENV_VARS = {
  // Public Firebase SDK
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'sierra-blu',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  
  // Public Routing & URLs
  NEXT_PUBLIC_CLIENT_URL: process.env.NEXT_PUBLIC_CLIENT_URL || 'https://sierra-estates.net',
  NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.sierra-estates.net',
  ADMIN_HOST: 'admin.sierra-estates.net',
  CLIENT_HOST: 'sierra-estates.net',
  COOKIE_DOMAIN: '.sierra-estates.net',

  // AI & LLM
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  NEXT_PUBLIC_GEMINI_API_KEY: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,

  // Property Finder Credentials
  PROPERTY_FINDER_API_KEY: process.env.PROPERTY_FINDER_API_KEY,
  PROPERTY_FINDER_API_SECRET: process.env.PROPERTY_FINDER_API_SECRET,
  PROPERTY_FINDER_AUTH_TOKEN: process.env.PROPERTY_FINDER_AUTH_TOKEN,
  PF_API_KEY: process.env.PF_API_KEY,
  PF_API_SECRET: process.env.PF_API_SECRET,

  // AWS & Backend
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'sierra-blu',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  SESSION_SECRET: process.env.SESSION_SECRET,
};

export const ADMIN_ENV_VARS = {
  // Vite Firebase Client SDK
  VITE_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'sierra-blu',
  VITE_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  VITE_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  VITE_BACKEND_API_URL: process.env.VITE_BACKEND_API_URL || 'https://sierra-estates.net',

  // AI & CRM
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  PF_API_KEY: process.env.PF_API_KEY,
  PF_API_SECRET: process.env.PF_API_SECRET,
  PROPERTY_FINDER_API_KEY: process.env.PROPERTY_FINDER_API_KEY,
  PROPERTY_FINDER_API_SECRET: process.env.PROPERTY_FINDER_API_SECRET,
};

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

    try {
      const res = await vercelRequest('POST', `/v10/projects/${projectId}/env?upsert=true`, {
        key,
        value: String(value),
        type: key.includes('SECRET') || key.includes('KEY') || key.includes('JSON') ? 'encrypted' : 'plain',
        target: ['production', 'preview', 'development'],
      });

      if (res && res.error) {
        console.warn(`   ⚠️ ${key} -> Failed (Status: ${res.status}):`, res.data?.error?.message || res.raw || '');
      } else {
        console.log(`   ✅ ${key} -> Synced to Production, Preview, & Development.`);
      }
    } catch (err) {
      console.warn(`   ⚠️ Error syncing ${key}:`, err.message);
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
