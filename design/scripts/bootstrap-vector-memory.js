import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

// Ensure you have FIREBASE_SERVICE_ACCOUNT_KEY in your .env
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
} catch (e) {
  console.error("Missing or invalid FIREBASE_SERVICE_ACCOUNT_KEY in .env");
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const COMPOUNDS_21 = [
  "Uptown Cairo", "Mivida", "Marassi", "Hyde Park", "Palm Hills New Cairo", 
  "Mountain View iCity", "Villette", "ZED East", "Taj City", "Sarai", 
  "District 5", "Eastown", "The Brooks", "Stone Residence", "Swan Lake Residences",
  "Cairo Gate", "Al Burouj", "O West", "Badya", "Silversands", "Hacienda Bay"
];

async function bootstrapMemory() {
  console.log("⚡ Initiating Sierra Estates Vector Knowledge Core...");
  const memoryRef = db.collection('intelligence').doc('global_memory_core');
  
  const payload = {
    version: "1.0",
    lastSyncedAt: new Date(),
    compounds: COMPOUNDS_21,
    syncRules: {
      propertyFinder: {
        frequency: "hourly",
        strictMode: true,
        overwriteLocal: false
      }
    },
    systemDirectives: "You are the central intelligence hub for Sierra Estates."
  };

  await memoryRef.set(payload, { merge: true });
  console.log("✅ Knowledge Core successfully seeded into Firestore.");
  process.exit(0);
}

bootstrapMemory().catch(console.error);
