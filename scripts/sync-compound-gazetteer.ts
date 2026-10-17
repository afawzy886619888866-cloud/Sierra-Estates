/**
 * Sierra Estates 3.0 — Map-Pin Gazetteer Sync
 *
 * Pushes the GPS-verified compound coordinate gazetteer (the single source of
 * truth: apps/sierra-estates-realty/components/Maps/compounds-data.ts) into
 * public.compounds so every map pin resolves from the database too.
 *
 * Usage:
 *   pnpm gazetteer:sync                # verified entries, preserve curated rows
 *   pnpm gazetteer:sync -- --dry-run   # show what would happen, zero writes
 *   pnpm gazetteer:sync -- --overwrite # replace existing coordinates too
 *   pnpm gazetteer:sync -- --include-unverified  # also the 2 district centroids
 *
 * Contract (§21 anti-fabrication):
 *  - Only name / zone / lat / lng are written. ai_score, price_m, rent,
 *    growth and every other curated column are never touched — the script
 *    does not invent analytics.
 *  - Rows that already carry coordinates are PRESERVED unless --overwrite
 *    (operator-curated pins win over the static list by default).
 *  - Requires SUPABASE_SERVICE_ROLE_KEY; without it the script exits 1 with
 *    the exact Vercel instruction (honest failure, never a silent no-op).
 *  - Zones are coarse-but-true district labels sourced from the CompoundsMap
 *    masterplan metadata and the gazetteer notes; unknown → 'Greater Cairo'.
 */
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { NEW_CAIRO_COMPOUNDS } from '../apps/sierra-estates-realty/components/Maps/compounds-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../apps/sierra-estates-realty/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gaxfqcietzoonlmatiot.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const OVERWRITE = args.includes('--overwrite');
const INCLUDE_UNVERIFIED = args.includes('--include-unverified');

/**
 * Coarse-but-true zone labels. Sources: CompoundsMap.tsx MASTERPLAN_HOTSPOTS
 * zone metadata, compounds-data.ts notes, and the coordinates themselves.
 * Anything without a sourced zone gets 'New Cairo' or 'Greater Cairo' —
 * district-level truth, never a made-up micro-zone.
 */
const ZONE_MAP: Record<string, string> = {
  'mivida': 'Golden Square / South 90th',
  'hyde park': 'Golden Square',
  'mountain view icity': '5th Settlement',
  'madinaty': 'Suez Road / Shorouk',
  'cairo plaza': 'El-Mataria',
  'al rehab': 'Suez Road',
  'uptown cairo': 'Mokattam / Uptown',
  'cairo festival city': '5th Settlement',
  'eastown': 'South 90th',
  'villette': 'Golden Square',
  'palm hills new cairo': 'Golden Square',
  'fifth square': 'North 90th',
  'taj city': 'Suez Road / Ring Road',
  'katameya heights': 'Katameya',
  'sarai': 'Suez Road / Mostakbal',
  'badya': '6th of October',
  'zed east': 'Mostakbal City',
  'bloomfields': 'Mostakbal City',
  '90 avenue': 'North 90th',
  'north 90th': 'North 90th',
  'general new cairo area (unspecified sector)': 'New Cairo (unspecified)',
  'el narges & choueifat area': 'New Cairo (Narges / Choueifat)',
};

function zoneFor(nameEn: string, lat: number, lng: number): string {
  const key = nameEn.trim().toLowerCase();
  if (ZONE_MAP[key]) return ZONE_MAP[key];
  // New Cairo / Greater Cairo bbox (coarse district truth from coordinates).
  const inNewCairo = lat > 29.9 && lat < 30.12 && lng > 31.4 && lng < 31.7;
  return inNewCairo ? 'New Cairo' : 'Greater Cairo';
}

interface GazRow {
  name: string;
  zone: string;
  lat: number;
  lng: number;
  verified: boolean;
}

function gazetteerRows(): GazRow[] {
  return NEW_CAIRO_COMPOUNDS
    .filter((c) => (INCLUDE_UNVERIFIED ? true : c.isGpsVerified))
    .map((c) => ({
      name: c.nameEn,
      zone: (c as { zone?: string }).zone?.trim() || zoneFor(c.nameEn, c.lat, c.lng),
      lat: c.lat,
      lng: c.lng,
      verified: c.isGpsVerified,
    }));
}

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  SIERRA ESTATES — MAP-PIN GAZETTEER SYNC (public.compounds)');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`- Supabase URL: ${SUPABASE_URL}`);
  console.log(`- Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}${OVERWRITE ? ' + --overwrite' : ''}${INCLUDE_UNVERIFIED ? ' + --include-unverified' : ''}`);

  const rows = gazetteerRows();
  console.log(`- Gazetteer entries: ${rows.length} (${rows.filter((r) => r.verified).length} GPS-verified, ${rows.filter((r) => !r.verified).length} district centroids)\n`);

  if (!SUPABASE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set — cannot sync the gazetteer.');
    console.error('   Add it in Vercel (Project → Settings → Environment Variables) or export it locally, then re-run:');
    console.error('   pnpm gazetteer:sync');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Existing rows (id + name + coords) for dedupe and preserve semantics.
  const { data: existing, error: fetchErr } = await supabase
    .from('compounds')
    .select('id,name,lat,lng');
  if (fetchErr) {
    console.error(`❌ Could not read public.compounds: ${fetchErr.message}`);
    process.exit(1);
  }
  const existingRows = (existing ?? []) as Array<{ id: string; name: string; lat: number | null; lng: number | null }>;
  const byExact = new Map(existingRows.map((r) => [r.name.trim().toLowerCase(), r]));
  console.log(`- Existing compounds rows: ${existingRows.length} (${existingRows.filter((r) => r.lat !== null && r.lng !== null).length} already carry coordinates)\n`);

  let created = 0;
  let updated = 0;
  let preserved = 0;
  let failed = 0;

  for (const row of rows) {
    const exact = byExact.get(row.name.toLowerCase());
    const hasCoords = !!(exact && exact.lat !== null && exact.lng !== null);

    if (exact && hasCoords && !OVERWRITE) {
      preserved++;
      console.log(`  ↖ preserved  ${row.name} — DB pin already set (${exact.lat}, ${exact.lng})`);
      continue;
    }

    if (DRY_RUN) {
      if (exact) {
        console.log(`  ~ would update ${row.name} → (${row.lat}, ${row.lng}) [zone: ${row.zone}]${row.verified ? '' : ' [district centroid]'}`);
      } else {
        console.log(`  + would insert ${row.name} → (${row.lat}, ${row.lng}) [zone: ${row.zone}]${row.verified ? '' : ' [district centroid]'}`);
      }
      continue;
    }

    // Write only name/zone/lat/lng — never analytics columns.
    const payload = { name: row.name, zone: row.zone, lat: row.lat, lng: row.lng };
    const { error } = await supabase
      .from('compounds')
      .upsert(payload, { onConflict: 'name' });
    if (error) {
      failed++;
      console.error(`  ✗ failed      ${row.name}: ${error.message}`);
    } else if (exact) {
      updated++;
      console.log(`  ✓ updated     ${row.name} → (${row.lat}, ${row.lng})`);
    } else {
      created++;
      console.log(`  ✓ inserted    ${row.name} → (${row.lat}, ${row.lng})`);
    }
  }

  if (DRY_RUN) {
    console.log('\n🧪 Dry run complete — nothing was written. Re-run without --dry-run to apply.');
    return;
  }

  // Verification read-back: how many pins does the table have now?
  const { count: pinCount, error: afterErr } = await supabase
    .from('compounds')
    .select('*', { count: 'exact', head: true })
    .not('lat', 'is', null);
  console.log(`\n✅ Gazetteer sync complete: ${created} inserted, ${updated} updated, ${preserved} preserved, ${failed} failed.`);
  if (pinCount !== null && pinCount !== undefined) {
    console.log(`📍 public.compounds rows with coordinates: ${pinCount}`);
  } else if (afterErr) {
    console.warn(`⚠️ Verification count failed: ${afterErr.message}`);
  } else {
    console.log('📍 public.compounds rows with coordinates: 0');
  }
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error in gazetteer sync:', err);
  process.exit(1);
});
