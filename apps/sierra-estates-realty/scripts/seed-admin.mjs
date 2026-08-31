#!/usr/bin/env node
/**
 * SIERRA ESTATES — ADMIN SEEDING SCRIPT
 *
 * Provisions the `users/{uid}` document that grants access to the staff admin
 * portal. `/api/auth` no longer self-provisions unknown accounts (the old
 * "first authenticated user becomes admin" bootstrap was a takeover risk), so
 * this script is the ONLY way to mint the first admin.
 *
 * Usage:
 *   node scripts/seed-admin.mjs <email-or-uid> [--role admin] [--name "Full Name"]
 *   pnpm --filter sierra-estates-client-page seed:admin -- ops@sierra-estates.net
 *
 * Credentials (env only — never pass a key on the command line):
 *   FIREBASE_SERVICE_ACCOUNT_JSON        service account JSON (preferred)
 *   FIREBASE_SERVICE_ACCOUNT_SIERRA_BLU  same, CI secret name
 *   FIREBASE_SERVICE_ACCOUNT             legacy alias
 *   GOOGLE_APPLICATION_CREDENTIALS       path to a service account JSON file
 *
 * The script is idempotent: re-running it on an existing user updates the role
 * and leaves `createdAt` untouched.
 */

import fs from 'node:fs';
import admin from 'firebase-admin';

const ADMIN_PORTAL_ROLES = ['owner', 'agent', 'manager', 'admin', 'superadmin'];

function usage(message) {
  if (message) console.error(`❌ ${message}\n`);
  console.error('Usage: node scripts/seed-admin.mjs <email-or-uid> [--role admin] [--name "Full Name"]');
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { target: '', role: 'admin', name: '' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--role') opts.role = String(argv[++i] ?? '').trim().toLowerCase();
    else if (arg === '--name') opts.name = String(argv[++i] ?? '').trim();
    else if (arg.startsWith('--role=')) opts.role = arg.slice(7).trim().toLowerCase();
    else if (arg.startsWith('--name=')) opts.name = arg.slice(7).trim();
    else if (arg.startsWith('--')) usage(`Unknown flag: ${arg}`);
    else if (!opts.target) opts.target = arg.trim();
    else usage(`Unexpected argument: ${arg}`);
  }
  if (!opts.target) usage('Missing target email or uid.');
  if (!ADMIN_PORTAL_ROLES.includes(opts.role)) {
    usage(`Invalid role "${opts.role}". Expected one of: ${ADMIN_PORTAL_ROLES.join(', ')}`);
  }
  return opts;
}

/** Load the service account strictly from the environment. */
function loadServiceAccount() {
  const inline =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_SIERRA_BLU ||
    process.env.FIREBASE_SERVICE_ACCOUNT;

  if (inline) {
    try {
      return JSON.parse(inline);
    } catch (err) {
      console.error('❌ Service account env var is set but is not valid JSON:', err.message);
      process.exit(1);
    }
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    if (!fs.existsSync(credPath)) {
      console.error(`❌ GOOGLE_APPLICATION_CREDENTIALS points at a missing file: ${credPath}`);
      process.exit(1);
    }
    try {
      return JSON.parse(fs.readFileSync(credPath, 'utf8'));
    } catch (err) {
      console.error(`❌ Could not parse ${credPath}:`, err.message);
      process.exit(1);
    }
  }

  console.error('❌ No Firebase service account credentials found.');
  console.error('   Set one of: FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_SIERRA_BLU,');
  console.error('   FIREBASE_SERVICE_ACCOUNT, or GOOGLE_APPLICATION_CREDENTIALS. This script refuses');
  console.error('   to run on ambient/default credentials — admin grants must be explicit.');
  process.exit(1);
}

function initializeFirebase() {
  const serviceAccount = loadServiceAccount();
  const projectId =
    serviceAccount.project_id ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    ...(projectId ? { projectId } : {}),
  });
  console.log(`✅ Firebase Admin initialized (project: ${projectId || 'unknown'})`);
  return projectId;
}

/** Resolve an email to a Firebase Auth uid; a raw uid is looked up as-is. */
async function resolveUser(target) {
  const auth = admin.auth();
  if (target.includes('@')) {
    try {
      return await auth.getUserByEmail(target.toLowerCase());
    } catch (err) {
      console.error(`❌ No Firebase Auth user with email "${target}" (${err.code || err.message}).`);
      console.error('   The person must sign in / be created in Firebase Authentication first.');
      process.exit(1);
    }
  }
  try {
    return await auth.getUser(target);
  } catch (err) {
    console.error(`❌ No Firebase Auth user with uid "${target}" (${err.code || err.message}).`);
    process.exit(1);
  }
}

async function main() {
  const { target, role, name } = parseArgs(process.argv.slice(2));

  console.log('🔐 Sierra Estates — Admin Seeding');
  console.log('═══════════════════════════════════════════');

  initializeFirebase();

  const userRecord = await resolveUser(target);
  const db = admin.firestore();
  const docRef = db.collection('users').doc(userRecord.uid);
  const existing = await docRef.get();
  const previous = existing.exists ? existing.data() : undefined;
  const now = new Date().toISOString();

  const payload = {
    uid: userRecord.uid,
    email: (userRecord.email || previous?.email || '').toLowerCase(),
    name: name || previous?.name || userRecord.displayName || (userRecord.email || '').split('@')[0] || 'Sierra Staff',
    role,
    status: previous?.status || 'active',
    createdAt: previous?.createdAt || now,
    metadata: {
      source: 'invite',
      approvedBy: process.env.SEED_ADMIN_ACTOR || 'seed-admin-script',
    },
  };

  await docRef.set(payload, { merge: true });

  console.log('═══════════════════════════════════════════');
  console.log(existing.exists ? '♻️  Updated existing users/ document' : '🆕 Created new users/ document');
  console.log(`   path      : users/${userRecord.uid}`);
  console.log(`   email     : ${payload.email}`);
  console.log(`   name      : ${payload.name}`);
  console.log(`   role      : ${previous?.role ? `${previous.role} → ${role}` : role}`);
  console.log(`   status    : ${payload.status}`);
  console.log(`   createdAt : ${payload.createdAt}`);
  console.log('\n✅ Done. This account can now sign in to the admin portal.');
}

main().catch((err) => {
  console.error('\n❌ SEEDING FAILED:', err?.message || err);
  process.exit(1);
});
