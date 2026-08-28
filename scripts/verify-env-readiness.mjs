#!/usr/bin/env node
/**
 * Sierra Estates — Production ENV readiness gate.
 *
 * Fails (exit 1) BEFORE a deploy/build when required production environment
 * variables are missing, so a build can no longer "succeed" while lead writes,
 * admin auth, cron, and Firestore-backed features silently run in limited mode.
 * Closes REPO_AUDIT_REPORT.md P0 ("pre-deploy environment validator").
 *
 * Runtime-only: reads process.env (Vercel/CI inject vars there). Feature creds
 * are reported as warnings, not hard failures, so per-feature rollout is not
 * blocked. Canonical variable list lives in .env.example.
 *
 * Usage:
 *   node scripts/verify-env-readiness.mjs            # gate current process.env
 *   STRICT_FEATURES=1 node scripts/verify-env-readiness.mjs   # warnings -> failures
 */

const env = process.env;
const has = (k) => typeof env[k] === 'string' && env[k].trim() !== '';

// Hard-required for any functional production deployment.
const REQUIRED = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'SESSION_SECRET',
  'SBR_SECRET_KEY',
  'CRON_SECRET',
];

// Exactly one of these credential shapes must be fully present (Firebase Admin).
const ONE_OF = [
  { name: 'Firebase Admin (service-account JSON)', all: ['FIREBASE_SERVICE_ACCOUNT_JSON'] },
  { name: 'Firebase Admin (split credentials)', all: ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'] },
];

// Feature integrations — warn (or fail under STRICT_FEATURES) if absent.
const FEATURES = [
  { name: 'AI provider (Gemini/Google AI)', anyOf: ['GEMINI_API_KEY', 'GOOGLE_AI_API_KEY'] },
  { name: 'Property Finder CRM', anyOf: ['PROPERTY_FINDER_API_KEY'] },
  { name: 'Telegram alerts', anyOf: ['TELEGRAM_BOT_TOKEN'] },
];

const errors = [];
const warnings = [];

for (const key of REQUIRED) {
  if (!has(key)) errors.push(`Missing required env: ${key}`);
}

const satisfied = ONE_OF.find((g) => g.all.every(has));
if (!satisfied) {
  const shapes = ONE_OF.map((g) => `[${g.all.join(' + ')}]`).join('  OR  ');
  errors.push(`No complete Firebase Admin credential set. Provide one of: ${shapes}`);
}

for (const f of FEATURES) {
  if (!f.anyOf.some(has)) {
    const msg = `${f.name} not configured (any of: ${f.anyOf.join(', ')})`;
    (env.STRICT_FEATURES ? errors : warnings).push(msg);
  }
}

console.log('\n🔐 Sierra Estates — production ENV readiness\n');
console.log(`   required present : ${REQUIRED.filter(has).length}/${REQUIRED.length}`);
console.log(`   Firebase Admin   : ${satisfied ? satisfied.name : 'NOT SATISFIED'}`);
for (const w of warnings) console.log(`   ⚠️  ${w}`);
for (const e of errors) console.log(`   ❌ ${e}`);

if (errors.length) {
  console.error(`\n❌ ENV readiness FAILED — ${errors.length} blocking issue(s). Do not deploy.\n`);
  process.exit(1);
}
console.log('\n✅ ENV readiness PASSED — required production variables are present.\n');
