/**
 * GitHub Secrets & Variables Provisioner
 * Comprehensive setup for all workflow dependencies: deploy-vercel.yml & external-workflows.yml
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
  PROPERTY_FINDER_API_BASE: 'https://api.propertyfinder.com.eg/v3',
  BROKER_INBOX_SHEET_ID: '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk',
  INVENTORY_SHEET_ID: '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk',
  INVENTORY_SHEET_GID: '0',
  MASTER_SHEET_ID: '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk',
  SENDGRID_FROM_EMAIL: 'a.fawzy8866@gmail.com',
  SENDER_EMAIL: 'a.fawzy8866@gmail.com',
  WHATSAPP_PHONE_NUMBER_ID: '106558292408990',
  LEAD_NOTIFY_WHATSAPP_NUMBER: '+201000000000',
  WABA_NUMBER_1: '+201000000001',
  WABA_NUMBER_2: '+201000000002',
  WABA_NUMBER_3: '+201000000003',
  WABA_NUMBER_4: '+201000000004',
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: 'sierra_estates_bot',
  NEXT_PUBLIC_INTELLIGENCE_OS_URL: 'https://admin.sierra-estates.net',
  TWILIO_MESSAGING_SERVICE_SID: 'MG1234567890abcdef1234567890abcdef',
  AI_PROVIDER: 'gemini',
  WHATSAPP_API_URL: 'https://y2ldihfwkuf742wj7i5pfa3ntu0nscsc.lambda-url.us-east-1.on.aws',
};

const SECRETS = {
  SESSION_SECRET: '94ef563c5579cca4cb743ec78b3b939fc2861b07b2c04bcffed53282cb73510c',
  SBR_SECRET_KEY: 'sierra-secure-2028',
  ADMIN_API_KEY: 'ba5eb17b8cd715e93d87d4d55b8fc021b4817c155c465a082cb24600b27bb25c',
  CRON_SECRET: 'sierra_blu_dev_secret_2026',
  ANTIGRAVITY_API_KEY: 'ag-dev-master-key',
  TELEGRAM_BOT_TOKEN: 'REDACTED_TELEGRAM_BOT_TOKEN',
  TELEGRAM_WEBHOOK_SECRET: '741350388e7097a49663bf0a13ffed1409d9e33c2bbd5074754cc30aac8df24b',
  TELEGRAM_CHAT_ID: '123456789',
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
  PF_WEBHOOK_SECRET: 'pf_webhook_secret_2026_sierra',
  WHATSAPP_API_TOKEN: 'REDACTED_WHATSAPP_API_TOKEN',
  WHATSAPP_META_TOKEN: 'REDACTED_WHATSAPP_API_TOKEN',
  WHATSAPP_VERIFY_TOKEN: 'sierra-verify-webhook-token',
  AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
  AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  TWILIO_ACCOUNT_SID: 'AC1234567890abcdef1234567890abcdef',
  TWILIO_AUTH_TOKEN: 'auth_token_sierra_2026',
  SENDGRID_API_KEY: 'SG.dev_sierra_estates_key_2026',
  UPSTASH_REDIS_REST_URL: 'https://sierra-redis-dev.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'upstash_dev_token_2026',
  N8N_API_KEY: 'n8n_api_key_sierra_2026',
  FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC69X...\\n-----END PRIVATE KEY-----',
  GOOGLE_SERVICE_ACCOUNT_KEY: '{"type":"service_account","project_id":"sierra-blu","private_key_id":"dev_sa_key_2026","client_email":"a.fawzy8866@gmail.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs"}',
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

  console.log('\n🎉 Comprehensive Variables and Secrets Provisioning Complete!');
}

setupGitHubConfig().catch(console.error);
