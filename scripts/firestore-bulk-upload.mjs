#!/usr/bin/env node
/**
 * Sierra Estates — Firestore Bulk Upload via REST API
 * Uploads real-listings-clean.json to houyez_listings and listings collections
 * Uses Firebase REST API with API key (no service account required)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Firebase config
const PROJECT_ID = 'sierra-blu';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Get OAuth2 bearer token from gcloud CLI
let ACCESS_TOKEN;
try {
  ACCESS_TOKEN = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  console.log('🔑 Authenticated via gcloud OAuth2 token');
} catch {
  console.error('❌ gcloud auth failed. Run: gcloud auth login');
  process.exit(1);
}

// Load clean listings
const listings = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'apps/sierra-estates-realty/data/real-listings-clean.json'), 'utf8')
);

console.log(`\n📦 Loaded ${listings.length} real listings for upload`);

/** Convert a plain JS object to Firestore REST document fields format */
function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) {
      fields[key] = { nullValue: 'NULL_VALUE' };
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (typeof val === 'number') {
      if (Number.isInteger(val)) {
        fields[key] = { integerValue: String(val) };
      } else {
        fields[key] = { doubleValue: val };
      }
    } else if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map(v => typeof v === 'string' ? { stringValue: v } : { stringValue: String(v) })
        }
      };
    } else if (typeof val === 'object') {
      fields[key] = { mapValue: { fields: toFirestoreFields(val) } };
    }
  }
  return fields;
}

/** POST a single document to a Firestore collection */
async function addDocument(collectionId, data, docId) {
  const url = docId
    ? `${FIRESTORE_BASE}/${collectionId}/${docId}`
    : `${FIRESTORE_BASE}/${collectionId}`;

  const method = docId ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err.slice(0, 200)}`);
  }
  return await res.json();
}

/** Sleep helper */
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Upload all listings to a given collection */
async function uploadToCollection(collectionId, allListings) {
  console.log(`\n──────────────────────────────────────────────`);
  console.log(`  Uploading to: ${collectionId}`);
  console.log(`──────────────────────────────────────────────`);

  let ok = 0, fail = 0;

  for (let i = 0; i < allListings.length; i++) {
    const listing = allListings[i];
    const docId = listing.code ? listing.code.replace(/[^a-zA-Z0-9_-]/g, '_') : `listing-${i}`;

    try {
      await addDocument(collectionId, listing, docId);
      ok++;
      if ((i + 1) % 20 === 0 || i === allListings.length - 1) {
        process.stdout.write(`\r  ✅ ${ok} uploaded, ❌ ${fail} failed  [${i + 1}/${allListings.length}]`);
      }
      // Throttle: 10 writes/sec
      await sleep(100);
    } catch (err) {
      fail++;
      if (fail <= 5) console.error(`\n  ⚠️  [${docId}] ${err.message}`);
    }
  }

  console.log(`\n  Done: ${ok}/${allListings.length} written to ${collectionId}`);
  return { ok, fail };
}

async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   SIERRA ESTATES — FIRESTORE BULK UPLOAD   ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`  Project: ${PROJECT_ID}`);
  console.log(`  Total listings: ${listings.length}`);

  // Upload to both collections
  const r1 = await uploadToCollection('houyez_listings', listings);
  const r2 = await uploadToCollection('listings', listings);

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   UPLOAD COMPLETE                           ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`  houyez_listings: ${r1.ok} written, ${r1.fail} failed`);
  console.log(`  listings:        ${r2.ok} written, ${r2.fail} failed`);
  console.log(`\n  🎉 Real data is now LIVE in Firestore (sierra-blu)\n`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
