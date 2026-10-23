import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), 'apps/sierra-estates-realty/.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gaxfqcietzoonlmatiot.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!key) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const COMPOUNDS_21 = [
  "Uptown Cairo", "Mivida", "Marassi", "Hyde Park", "Palm Hills New Cairo", 
  "Mountain View iCity", "Villette", "ZED East", "Taj City", "Sarai", 
  "District 5", "Eastown", "The Brooks", "Stone Residence", "Swan Lake Residences",
  "Cairo Gate", "Al Burouj", "O West", "Badya", "Silversands", "Hacienda Bay"
];

async function bootstrapMemory() {
  console.log("⚡ Initiating Sierra Estates Vector Knowledge Core (Supabase)...");
  
  const payload = {
    version: "1.0",
    lastSyncedAt: new Date().toISOString(),
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

  const { error } = await supabase
    .from('intelligence')
    .upsert({
      id: 'global_memory_core',
      rejection_stats: payload,
      last_trend_update: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (error) {
    console.error("❌ Failed to seed memory core into Supabase:", error.message);
    process.exit(1);
  }

  console.log("✅ Knowledge Core successfully seeded into Supabase (public.intelligence).");
}

bootstrapMemory().catch(console.error);
