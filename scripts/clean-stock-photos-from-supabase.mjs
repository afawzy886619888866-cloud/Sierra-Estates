#!/usr/bin/env node
/**
 * scripts/clean-stock-photos-from-supabase.mjs
 *
 * Scans Supabase public.listings and strips all repeated generic stock Unsplash URLs
 * from the images array and raw_data blob.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(ROOT, '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gaxfqcietzoonlmatiot.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function main() {
  console.log('Scanning for listings with stock/unsplash photos in Supabase...');

  let page = 0;
  const PAGE_SIZE = 1000;
  let totalCleaned = 0;

  while (true) {
    const { data, error } = await supabase
      .from('listings')
      .select('id, ref_id, images, raw_data')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    const updates = [];
    for (const row of data) {
      let changed = false;
      let cleanImages = row.images;
      let cleanRaw = row.raw_data;

      if (Array.isArray(row.images)) {
        const filtered = row.images.filter(
          (u) => typeof u === 'string' && !u.includes('unsplash.com') && !u.includes('placeholder')
        );
        if (filtered.length !== row.images.length) {
          cleanImages = filtered;
          changed = true;
        }
      }

      if (cleanRaw && typeof cleanRaw === 'object' && cleanRaw.img && String(cleanRaw.img).includes('unsplash.com')) {
        cleanRaw = { ...cleanRaw, img: null };
        changed = true;
      }

      if (changed) {
        updates.push({
          id: row.id,
          images: cleanImages,
          raw_data: cleanRaw,
        });
      }
    }

    if (updates.length > 0) {
      for (const u of updates) {
        await supabase
          .from('listings')
          .update({ images: u.images, raw_data: u.raw_data })
          .eq('id', u.id);
      }
      totalCleaned += updates.length;
      console.log(`  Cleaned ${updates.length} listings in batch ${page + 1} (Total cleaned: ${totalCleaned})`);
    }

    if (data.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`✅ Successfully scrubbed repeated stock photos from ${totalCleaned} listings in Supabase.`);
}

main().catch(console.error);
