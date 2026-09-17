/**
 * SIERRA ESTATES — INVENTORY SNAPSHOT HYGIENE
 * 
 * To keep the git repository weight low and Vercel upload limits healthy,
 * 48MB+ snapshot.json files are no longer tracked in version control.
 * 
 * Instead, they live in Supabase Storage (`inventory-snapshots` bucket).
 * This script runs during the Vercel Build Step (`pnpm prebuild` or similar)
 * to securely pull down the latest canonical snapshot into the build context
 * so Next.js static generation can succeed.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars if running locally (Vercel provides them automatically)
if (fs.existsSync(path.resolve('.env.local'))) {
  const dotenv = await import('dotenv');
  dotenv.config({ path: '.env.local' });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials for snapshot sync.');
  console.error('Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BUCKET_NAME = 'inventory-snapshots';
const FILE_NAME = 'snapshot.json';
const TARGET_DIR = path.resolve('apps', 'sierra-estates-realty', 'lib', 'inventory');
const TARGET_PATH = path.join(TARGET_DIR, FILE_NAME);

async function syncSnapshot() {
  console.log(`[Snapshot Sync] Checking for latest ${FILE_NAME} in Supabase Storage...`);
  
  try {
    // Ensure target directory exists
    if (!fs.existsSync(TARGET_DIR)) {
      fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    const { data, error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .download(FILE_NAME);

    if (error) {
      if (error.message.includes('not found')) {
        console.warn(`⚠️ Warning: ${FILE_NAME} not found in bucket '${BUCKET_NAME}'.`);
        console.warn(`Static generation may fail if the app expects this file.`);
        // Don't fail the build outright if it's the first time and the bucket is empty,
        // but generate an empty valid JSON to prevent build crashes.
        if (!fs.existsSync(TARGET_PATH)) {
          fs.writeFileSync(TARGET_PATH, JSON.stringify({ units: [], lastUpdated: new Date().toISOString() }));
          console.log(`[Snapshot Sync] Created empty stub at ${TARGET_PATH}`);
        }
        return;
      }
      throw error;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(TARGET_PATH, buffer);
    
    console.log(`✅ Successfully downloaded ${FILE_NAME} (${(buffer.length / 1024 / 1024).toFixed(2)} MB) to ${TARGET_PATH}`);

  } catch (err) {
    console.error('❌ Failed to download snapshot from Supabase Storage:');
    console.error(err);
    process.exit(1);
  }
}

syncSnapshot();
