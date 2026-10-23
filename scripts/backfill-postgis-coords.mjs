import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'gaxfqcietzoonlmatiot';

async function runQuery(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Query failed (${res.status}): ${txt}`);
  }
  return await res.json();
}

// Load gazetteer mapping
const gazetteerModule = await import('../apps/sierra-estates-realty/lib/inventory/gazetteer.ts');
const { resolveLocation } = gazetteerModule;

async function main() {
  console.log('Fetching distinct compounds from public.listings...');
  const distinctCompounds = await runQuery('SELECT DISTINCT compound FROM public.listings WHERE compound IS NOT NULL;');
  console.log(`Found ${distinctCompounds.length} distinct compounds.`);

  let updatedCount = 0;
  // Batch update queries
  const updates = [];
  for (const row of distinctCompounds) {
    const rawCompound = row.compound;
    if (!rawCompound) continue;
    const resolved = resolveLocation(rawCompound);
    const escaped = rawCompound.replace(/'/g, "''");
    updates.push(`
      UPDATE public.listings
      SET latitude = ${resolved.lat},
          longitude = ${resolved.lng},
          location_coords = ST_SetSRID(ST_MakePoint(${resolved.lng}, ${resolved.lat}), 4326)
      WHERE compound = '${escaped}';
    `);
  }

  console.log(`Executing ${updates.length} compound coordinate updates in chunks...`);
  const chunkSize = 25;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize).join('\n');
    await runQuery(chunk);
    updatedCount += Math.min(chunkSize, updates.length - i);
    process.stdout.write(`Updated ${updatedCount}/${updates.length} compounds...\r`);
  }
  console.log(`\nCompleted coordinate backfill for all ${updates.length} compounds!`);

  // Verify
  const stats = await runQuery(`
    SELECT count(*) as total,
           count(location_coords) as with_coords,
           count(latitude) as with_lat
    FROM public.listings;
  `);
  console.log('Final database stats:', stats);

  // Test proximity search near New Capital (30.01, 31.74)
  const proximityResults = await runQuery(`
    SELECT id, title, compound, latitude, longitude,
           ROUND(ST_Distance(
             location_coords,
             ST_SetSRID(ST_MakePoint(31.74, 30.01), 4326)::geography
           )::numeric / 1000, 2) as distance_km
    FROM get_listings_near_capital(30.01, 31.74, 35000)
    LIMIT 5;
  `);
  console.log('\nProximity Search Test (Top 5 within 35km of New Capital):');
  console.table(proximityResults);
}

main().catch(console.error);
