const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const envPath = path.join(repoRoot, 'apps/sierra-estates-realty/.env.local');

if (!fs.existsSync(envPath)) {
  console.log(`⚠️ No .env.local found at ${envPath}`);
  process.exit(0);
}

const envFile = fs.readFileSync(envPath, 'utf8');
const lines = envFile.split('\n');

const varsToAdd = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
  'NEXT_PUBLIC_FIREBASE_DATABASE_URL',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'SBR_SECRET_KEY',
  'CRON_SECRET',
  'ADMIN_API_KEY',
  'ANTIGRAVITY_API_KEY',
  'WHATSAPP_API_TOKEN',
  'WHATSAPP_META_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_VERIFY_TOKEN',
  'LEAD_NOTIFY_WHATSAPP_NUMBER',
  'BRANDING_TAG',
  'WABA_NUMBER_1',
  'WABA_NUMBER_2',
  'WABA_NUMBER_3',
  'WABA_NUMBER_4',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_MESSAGING_SERVICE_SID',
  'TELEGRAM_BOT_TOKEN',
  'NEXT_PUBLIC_TELEGRAM_BOT_USERNAME',
  'TELEGRAM_CHAT_ID',
  'TELEGRAM_WEBHOOK_SECRET',
  'PROPERTY_FINDER_API_KEY',
  'PROPERTY_FINDER_API_SECRET',
  'PROPERTY_FINDER_AUTH_TOKEN',
  'PF_API_KEY',
  'PF_API_SECRET',
  'PF_COMPANY_ID',
  'PF_WEBHOOK_SECRET',
  'GOOGLE_AI_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_GENAI_API_KEY',
  'AI_PROVIDER',
  'GOOGLE_CLOUD_LOCATION',
  'DEEPSEEK_API_KEY',
  'DEEPSEEK_API_URL',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'BROKER_INBOX_SHEET_ID',
  'INVENTORY_SHEET_ID',
  'INVENTORY_SHEET_GID',
  'MASTER_SHEET_ID',
  'SENDGRID_API_KEY',
  'SENDER_EMAIL',
  'NEXT_PUBLIC_DEFAULT_LOCALE',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_CLIENT_URL',
  'NEXT_PUBLIC_ADMIN_URL',
  'ALLOWED_ORIGINS',
  'NEXT_PUBLIC_INTELLIGENCE_OS_URL',
  'OPENMEMORY_URL',
  'N8N_BASE_URL',
  'N8N_API_KEY'
];

varsToAdd.forEach(key => {
  const line = lines.find(l => l.startsWith(`${key}=`));
  if (line) {
    let val = line.substring(`${key}=`.length).trim().replace(/\r/g, '');
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    
    if (!val || val === '{...}' || val === '...') {
      console.log(`⚠️ Skipping ${key} (empty or placeholder)`);
      return;
    }

    let environments = 'production,preview';
    
    try {
      console.log(`Setting ${key}...`);
      execSync(`npx vercel env add ${key} ${environments}`, {
        cwd: path.join(repoRoot, 'apps/sierra-estates-realty'),
        input: val,
        stdio: ['pipe', 'inherit', 'inherit']
      });
      console.log(`✅ Done setting ${key}`);
    } catch(e) {
      console.error(`❌ Failed to set ${key}`, e.message);
    }
  }
});

console.log('Finished pushing environment variables!');

