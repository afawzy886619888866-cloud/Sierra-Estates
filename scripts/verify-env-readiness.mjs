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

import fs from 'node:fs';
import path from 'node:path';

// Automatically load local .env files if present (for local developer verification)
for (const envFile of ['.env', '.env.local', 'apps/sierra-estates-realty/.env.local']) {
  const full = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(full)) {
    const lines = fs.readFileSync(full, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key] && val) {
          process.env[key] = val;
        }
      }
    }
  }
}

const env = process.env;
const has = (k) => typeof env[k] === 'string' && env[k].trim() !== '';

// Hard-required for any functional production deployment (security & auth).
const REQUIRED = [
  'SESSION_SECRET',
  'SBR_SECRET_KEY',
  'CRON_SECRET',
];

// Database providers: Either Supabase (Primary) OR Firebase
const hasSupabase = (has('NEXT_PUBLIC_SUPABASE_URL') || has('SUPABASE_URL')) &&
                    (has('NEXT_PUBLIC_SUPABASE_ANON_KEY') || has('SUPABASE_ANON_KEY') || has('SUPABASE_SERVICE_ROLE_KEY'));

const hasFirebase = has('NEXT_PUBLIC_FIREBASE_API_KEY') && has('NEXT_PUBLIC_FIREBASE_PROJECT_ID');

// Exactly one of these credential shapes must be fully present (Firebase Admin) if using Firebase.
const ONE_OF_FIREBASE = [
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

// Database validation
if (!hasSupabase && !hasFirebase) {
  errors.push('No primary database configured. Set NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY (Supabase) or Firebase credentials.');
} else if (hasSupabase) {
  // Supabase is primary — service role key is recommended for server writes
  if (!has('SUPABASE_SERVICE_ROLE_KEY') && !has('SUPABASE_SERVICE_KEY')) {
    warnings.push('SUPABASE_SERVICE_ROLE_KEY not set — using anon key for server operations (set for full CRM access)');
  }
} else {
  // Firebase validation
  const satisfied = ONE_OF_FIREBASE.find((g) => g.all.every(has));
  if (!satisfied) {
    const shapes = ONE_OF_FIREBASE.map((g) => `[${g.all.join(' + ')}]`).join('  OR  ');
    errors.push(`No complete Firebase Admin credential set. Provide one of: ${shapes}`);
  }
}

for (const f of FEATURES) {
  if (!f.anyOf.some(has)) {
    const msg = `${f.name} not configured (any of: ${f.anyOf.join(', ')})`;
    (env.STRICT_FEATURES ? errors : warnings).push(msg);
  }
}

console.log('\n🔐 Sierra Estates — production ENV readiness\n');
console.log(`   required present : ${REQUIRED.filter(has).length}/${REQUIRED.length}`);
const dbStatus = hasSupabase
  ? `Supabase (${has('SUPABASE_SERVICE_ROLE_KEY') ? 'Service Role' : 'Anon Key'})`
  : (ONE_OF_FIREBASE.find((g) => g.all.every(has))?.name || 'NOT SATISFIED');
console.log(`   Database Backend : ${dbStatus}`);
for (const w of warnings) console.log(`   ⚠️  ${w}`);
for (const e of errors) console.log(`   ❌ ${e}`);

if (errors.length) {
  console.error(`\n❌ ENV readiness FAILED — ${errors.length} blocking issue(s). Do not deploy.\n`);
  process.exit(1);
}
console.log('\n✅ ENV readiness PASSED — required production variables are present.\n');
