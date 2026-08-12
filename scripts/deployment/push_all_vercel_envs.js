const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const envPath = path.join(__dirname, 'apps/sierra-estates-realty/.env.local');
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
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'SBR_SECRET_KEY',
  'CRON_SECRET',
  'ADMIN_API_KEY',
  'WHATSAPP_API_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_VERIFY_TOKEN',
  'LEAD_NOTIFY_WHATSAPP_NUMBER',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'TELEGRAM_WEBHOOK_SECRET',
  'PROPERTY_FINDER_API_KEY',
  'PROPERTY_FINDER_API_SECRET',
  'PROPERTY_FINDER_CLIENT_ID',
  'PROPERTY_FINDER_CLIENT_SECRET',
  'PROPERTY_FINDER_API_GATEWAY',
  'PF_API_BASE_URL',
  'PF_JWT_TOKEN',
  'PF_COMPANY_ID',
  'PF_WEBHOOK_SECRET',
  'GOOGLE_AI_API_KEY',
  'ANTHROPIC_API_KEY',
  'NEXT_PUBLIC_GEMINI_API_KEY',
  'GOOGLE_SERVICE_ACCOUNT_KEY',
  'SLACK_WEBHOOK_URL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'AIRTABLE_API_KEY',
  'BROKER_INBOX_SHEET_ID',
  'ZAPIER_CALENDAR_WEBHOOK_URL',
  'NEXT_PUBLIC_ADMIN_API_URL',
  'NEXT_PUBLIC_RECAPTCHA_SITE_KEY',
  'LOG_LEVEL',
  'SENDGRID_API_KEY',
  'SENDER_EMAIL',
  'NEXT_PUBLIC_DEFAULT_LOCALE',
  'NEXT_PUBLIC_APP_URL',
  'ALLOWED_ORIGINS',
  'NEXT_PUBLIC_INTELLIGENCE_OS_URL'
];

varsToAdd.forEach(key => {
  const line = lines.find(l => l.startsWith(`${key}=`));
  if (line) {
    let val = line.substring(`${key}=`.length).trim().replace(/\r/g, '');
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    
    if (!val || val === '{...}') {
      console.log(`⚠️ Skipping ${key} (empty or placeholder)`);
      return;
    }

    // Determine the environment based on the variable
    // For sensitive stuff like Service Account, only production/preview
    let environments = 'production,preview,development';
    if (key === 'FIREBASE_SERVICE_ACCOUNT_JSON' || key === 'SBR_SECRET_KEY' || key === 'CRON_SECRET' || key === 'GOOGLE_SERVICE_ACCOUNT_KEY') {
      environments = 'production,preview';
    }
    
    try {
      console.log(`Setting ${key}...`);
      // We pass the value to stdin. Vercel CLI takes value from stdin when it is piped.
      execSync(`npx vercel env add ${key} ${environments}`, {
        cwd: path.join(__dirname, 'apps/sierra-estates-realty'),
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
