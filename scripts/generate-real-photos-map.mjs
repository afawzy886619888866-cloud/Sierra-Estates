#!/usr/bin/env node
/**
 * scripts/generate-real-photos-map.mjs
 *
 * Extracts all 900+ real, verified PropertyFinder CDN listing photos from Supabase
 * and groups them by compound and property type into a structured photo bank:
 * apps/sierra-estates-realty/lib/inventory/compound-real-photos.json
 *
 * This eliminates repeated photos across the website by providing 30-80 distinct
 * real architectural photos per compound.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const envFile of ['.env.local', '.env', 'workflows/.env']) {
  const p = path.join(ROOT, envFile);
  if (fs.existsSync(p)) dotenv.config({ path: p });
}

const OUT_PATH = path.join(ROOT, 'apps', 'sierra-estates-realty', 'lib', 'inventory', 'compound-real-photos.json');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gaxfqcietzoonlmatiot.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function main() {
  console.log('Fetching real photos from Supabase listings...');
  const { data, error } = await supabase
    .from('listings')
    .select('compound, property_type, images')
    .not('images', 'is', null)
    .limit(5000);

  if (error) throw error;

  const byCompound = {};
  const byType = {};
  const allRealPhotos = new Set();

  data.forEach((d) => {
    if (!Array.isArray(d.images)) return;
    const cmp = (d.compound || 'New Cairo').trim();
    const type = (d.property_type || 'apartment').trim().toLowerCase();

    const realImgs = d.images.filter(
      (img) => typeof img === 'string' && img.startsWith('https://static.shared.propertyfinder.eg')
    );

    realImgs.forEach((img) => {
      allRealPhotos.add(img);

      if (!byCompound[cmp]) byCompound[cmp] = [];
      if (!byCompound[cmp].includes(img)) byCompound[cmp].push(img);

      if (!byType[type]) byType[type] = [];
      if (!byType[type].includes(img)) byType[type].push(img);
    });
  });

  const output = {
    generatedAt: new Date().toISOString(),
    totalPhotos: allRealPhotos.size,
    compounds: byCompound,
    types: byType,
    allPhotos: Array.from(allRealPhotos),
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log(`✅ Saved ${allRealPhotos.size} real photos across ${Object.keys(byCompound).length} compounds to: ${OUT_PATH}`);
}

main().catch(console.error);
