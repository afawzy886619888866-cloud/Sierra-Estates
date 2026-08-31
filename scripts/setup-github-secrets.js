/**
 * GitHub Secrets & Variables Provisioner
 * Sets all required repository variables and secrets using GitHub CLI (gh)
 */

import { execSync } from 'child_process';

const REPO = 'sierrablue8866-droid/SE-Vercel-deploy-main';

const VARIABLES = {
  MAINTAINER_EMAIL: 'a.fawzy8866@gmail.com',
  CLIENT_VERCEL_PROJECT_ID: 'prj_ieVcIcoeTtHndspXMzlE0cwLl89c',
  ADMIN_VERCEL_PROJECT_ID: 'prj_W2gYCoKaS3oBcLDuGa9gB8z7cfnA',
  VERCEL_PROJECT_ID_CLIENT: 'prj_ieVcIcoeTtHndspXMzlE0cwLl89c',
  VERCEL_PROJECT_ID_ADMIN: 'prj_W2gYCoKaS3oBcLDuGa9gB8z7cfnA',
  VERCEL_ORG_ID: 'team_UvdJ5ezVTaqEKyhqZ5QVqOKJ',
  FIREBASE_PROJECT_ID: 'sierra-blu',
  FIREBASE_CLIENT_EMAIL: 'a.fawzy8866@gmail.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'sierra-blu',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyBZLN2jTTKV34SneGPoWRz1zoRpX5uODjs',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'sierra-blu.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'sierra-blu.firebasestorage.app',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '941030513456',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:941030513456:web:56209a1495d69f217086f5',
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: 'G-ZP054BPJ8Q',
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: 'https://sierra-blu-default-rtdb.firebaseio.com',
  NEXT_PUBLIC_SITE_URL: 'https://sierra-estates.net',
  NEXT_PUBLIC_APP_URL: 'https://sierra-estates.net',
  NEXT_PUBLIC_DEFAULT_LOCALE: 'en',
  ALLOWED_ORIGINS: 'https://sierra-estates.net,https://admin.sierra-estates.net,http://localhost:3000,http://localhost:8000',
  GOOGLE_CLOUD_LOCATION: 'europe-west1',
  AWS_REGION: 'us-east-1',
  BRANDING_TAG: 'Sierra Estates Realty',
  DEEPSEEK_API_URL: 'https://api.deepseek.com',
  PF_COMPANY_ID: 'SB-EG-2024-001',
  OPENMEMORY_URL: 'http://localhost:8080',
  N8N_BASE_URL: 'http://localhost:5678',
};

const SECRETS = {
  SESSION_SECRET: '94ef563c5579cca4cb743ec78b3b939fc2861b07b2c04bcffed53282cb73510c',
  SBR_SECRET_KEY: 'sierra-secure-2028',
  ADMIN_API_KEY: 'ba5eb17b8cd715e93d87d4d55b8fc021b4817c155c465a082cb24600b27bb25c',
  CRON_SECRET: 'sierra_blu_dev_secret_2026',
  ANTIGRAVITY_API_KEY: 'ag-dev-master-key',
  TELEGRAM_BOT_TOKEN: 'REDACTED_TELEGRAM_BOT_TOKEN',
  TELEGRAM_WEBHOOK_SECRET: '741350388e7097a49663bf0a13ffed1409d9e33c2bbd5074754cc30aac8df24b',
  GOOGLE_AI_API_KEY: 'REDACTED_GEMINI_API_KEY',
  GEMINI_API_KEY: 'REDACTED_GEMINI_API_KEY',
  GOOGLE_GENAI_API_KEY: 'REDACTED_GEMINI_API_KEY',
  DEEPSEEK_API_KEY: 'REDACTED_SK_KEY',
  PF_API_KEY: 'REDACTED_PROPERTY_FINDER_JWT_TOKE',
  PF_API_SECRET: 'l9asZRM5xzKUbRCZVo6C6Pusj0kHyMzn',
  PROPERTY_FINDER_AUTH_TOKEN: 'REDACTED_PROPERTY_FINDER_JWT_TOKE',
  PF_JWT_TOKEN: 'REDACTED_PROPERTY_FINDER_JWT_TOKE',
  PROPERTY_FINDER_API_KEY: 'REDACTED_PROPERTY_FINDER_API_KEY',
  PROPERTY_FINDER_API_SECRET: 'REDACTED_PROPERTY_FINDER_API_SECR',
  WHATSAPP_API_TOKEN: 'REDACTED_WHATSAPP_API_TOKEN',
  WHATSAPP_META_TOKEN: 'REDACTED_WHATSAPP_API_TOKEN',
  WHATSAPP_VERIFY_TOKEN: 'sierra-verify-webhook-token',
};

async function setupGitHubConfig() {
  console.log('🚀 ══════════════════════════════════════════════════════════════');
  console.log(`   Configuring GitHub Actions Variables & Secrets for ${REPO}`);
  console.log('   Maintainer: Ahmed Fawzy (a.fawzy8866@gmail.com)');
  console.log('══════════════════════════════════════════════════════════════\n');

  console.log('📦 Setting Repository Variables...');
  for (const [key, value] of Object.entries(VARIABLES)) {
    try {
      execSync(`gh variable set ${key} -b "${value}" -R ${REPO}`, { stdio: 'pipe' });
      console.log(`  ✅ Variable: ${key}`);
    } catch (e) {
      console.warn(`  ⚠️ Failed variable ${key}:`, e.message);
    }
  }

  console.log('\n🔐 Setting Repository Secrets...');
  for (const [key, value] of Object.entries(SECRETS)) {
    try {
      execSync(`gh secret set ${key} -b "${value}" -R ${REPO}`, { stdio: 'pipe' });
      console.log(`  ✅ Secret: ${key}`);
    } catch (e) {
      console.warn(`  ⚠️ Failed secret ${key}:`, e.message);
    }
  }

  console.log('\n🎉 Variables and Secrets Provisioning Complete!');
}

setupGitHubConfig().catch(console.error);
