#!/usr/bin/env node
/**
 * Sierra Estates — Firestore Bulk Upload via firebase-admin + ADC
 * Uses Application Default Credentials (gcloud auth application-default login)
 * No service account key file required.
 */

'use strict';

const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

// ── Init firebase-admin with service account key ───────────────────────
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

if (getApps().length === 0) {
  const saKey = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'firebase-sa-key.json'), 'utf8')
  );
  initializeApp({
    credential: cert(saKey),
    projectId: 'sierra-blu',
  });
  console.log('🔑 Initialized firebase-admin with Service Account key');
}

const db = getFirestore();

// ── Load listings ─────────────────────────────────────────────────────
const listings = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'apps/sierra-estates-realty/data/real-listings-clean.json'), 'utf8')
);
console.log(`\n📦 Loaded ${listings.length} real listings for upload`);

// ── Batch write helper ────────────────────────────────────────────────
async function uploadToCollection(collectionName, items) {
  console.log(`\n──────────────────────────────────────────────`);
  console.log(`  Uploading to: ${collectionName}`);
  console.log(`──────────────────────────────────────────────`);

  let ok = 0, fail = 0;
  const BATCH_SIZE = 400; // Firestore batch limit is 500

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const item of chunk) {
      const docId = (item.code || item.id || `listing-${i}`)
        .toString()
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      const ref = db.collection(collectionName).doc(docId);
      batch.set(ref, {
        ...item,
        syncedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    try {
      await batch.commit();
      ok += chunk.length;
      process.stdout.write(`\r  ✅ ${ok} written, ❌ ${fail} failed  [${Math.min(i + BATCH_SIZE, items.length)}/${items.length}]`);
    } catch (err) {
      fail += chunk.length;
      console.error(`\n  ❌ Batch failed: ${err.message}`);
    }
  }

  console.log(`\n  Done: ${ok}/${items.length} written to ${collectionName}`);
  return { ok, fail };
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   SIERRA ESTATES — FIRESTORE BULK UPLOAD   ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`  Project: sierra-blu`);
  console.log(`  Total listings: ${listings.length}`);

  const r1 = await uploadToCollection('houyez_listings', listings);
  const r2 = await uploadToCollection('listings', listings);

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   UPLOAD COMPLETE                           ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`  houyez_listings: ${r1.ok} written, ${r1.fail} failed`);
  console.log(`  listings:        ${r2.ok} written, ${r2.fail} failed`);

  if (r1.ok + r2.ok > 0) {
    console.log(`\n  🎉 Real data is now LIVE in Firestore (sierra-blu)`);
  } else {
    console.log(`\n  ❌ Upload failed — check errors above`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
