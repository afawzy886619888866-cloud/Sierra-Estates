'use strict';

/**
 * Workflow 03: Permanent WebP Media Mirroring (Phase 3)
 * Downloads WhatsApp/intake image buffers, converts to WebP (1920px max, 80% quality),
 * uploads to Supabase Storage bucket `unit-photos/{unit_id}/{index}.webp`, and
 * saves permanent CDN URLs in `properties.images` / `listings.images` + `photo_count`.
 */

const path = require('path');
const { loadWorkflowEnv } = require('../lib/google-sheets');

loadWorkflowEnv(path.join(__dirname, '..'));

const BUCKET = process.env.UNIT_PHOTOS_BUCKET || 'unit-photos';
const MAX_WIDTH = 1920;
const WEBP_QUALITY = 80;

function loadSharpSafe() {
  try {
    return require('sharp');
  } catch {
    try {
      return require(require.resolve('sharp', {
        paths: [path.resolve(__dirname, '../../apps/sierra-estates-realty')],
      }));
    } catch {
      return null;
    }
  }
}

async function resolveBuffer(item, fetchImpl = fetch) {
  if (Buffer.isBuffer(item)) return item;
  if (typeof item === 'string') {
    if (item.startsWith('data:')) {
      const idx = item.indexOf(',');
      if (idx > 0) return Buffer.from(item.slice(idx + 1), 'base64');
    }
    if (/^https?:\/\//i.test(item)) {
      const res = await fetchImpl(item, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} downloading media`);
      return Buffer.from(await res.arrayBuffer());
    }
  }
  if (item && Buffer.isBuffer(item.buffer)) return item.buffer;
  throw new Error('Unsupported media input');
}

async function convertToWebp(buffer, sharpImpl = loadSharpSafe()) {
  if (typeof sharpImpl === 'function') {
    return sharpImpl(buffer)
      .resize({ width: MAX_WIDTH, height: MAX_WIDTH, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  }
  return buffer;
}

function getSupabaseClient() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Convert and upload unit images synchronously to `unit-photos/{unit_id}/{index}.webp`
 * and persist `images` + `photo_count`.
 */
async function harvestUnitMedia({
  unitId,
  mediaItems = [],
  dryRun = !/^(0|false|no)$/i.test(process.env.WF_DRY_RUN || '0') || process.argv.includes('--dry-run'),
  supabaseClient = null,
  sharpImpl = loadSharpSafe(),
  fetchImpl = fetch,
}) {
  if (!unitId) throw new Error('unitId is required');
  const client = supabaseClient || (dryRun ? null : getSupabaseClient());
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabase.local').replace(/\/$/, '');

  const uploadedUrls = [];
  const storagePaths = [];

  for (let i = 0; i < mediaItems.length; i++) {
    const objectPath = `${unitId}/${i}.webp`;
    const storagePath = `${BUCKET}/${objectPath}`;
    const cdnUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${objectPath}`;

    if (dryRun) {
      storagePaths.push(storagePath);
      uploadedUrls.push(cdnUrl);
      continue;
    }

    const rawBuf = await resolveBuffer(mediaItems[i], fetchImpl);
    const webpBuf = await convertToWebp(rawBuf, sharpImpl);

    if (client && client.storage) {
      const uploadRes = await client.storage
        .from(BUCKET)
        .upload(objectPath, webpBuf, { contentType: 'image/webp', upsert: true });
      if (uploadRes && uploadRes.error) {
        throw new Error(`Storage upload failed (${objectPath}): ${uploadRes.error.message}`);
      }
      const pub = client.storage.from(BUCKET).getPublicUrl(objectPath);
      uploadedUrls.push(pub?.data?.publicUrl || cdnUrl);
    } else {
      uploadedUrls.push(cdnUrl);
    }
    storagePaths.push(storagePath);
  }

  if (!dryRun && client) {
    const nowIso = new Date().toISOString();
    // Update properties (best-effort if properties is a view) and canonical listings table
    try {
      await client
        .from('listings')
        .update({
          images: uploadedUrls,
          photo_count: uploadedUrls.length,
          updated_at: nowIso,
        })
        .eq('id', unitId);
    } catch (_) { /* best-effort */ }
    try {
      await client
        .from('properties')
        .update({
          images: uploadedUrls,
          photo_count: uploadedUrls.length,
          updated_at: nowIso,
        })
        .eq('id', unitId);
    } catch (_) { /* properties may be a view over listings */ }
  }

  return {
    ok: true,
    dryRun,
    bucket: BUCKET,
    unitId,
    maxWidth: MAX_WIDTH,
    quality: WEBP_QUALITY,
    storagePaths,
    images: uploadedUrls,
    photo_count: uploadedUrls.length,
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run') || !/^(0|false|no)$/i.test(process.env.WF_DRY_RUN || '0');
  const result = await harvestUnitMedia({
    unitId: process.env.MEDIA_HARVESTER_UNIT_ID || 'dry-run-unit',
    mediaItems: dryRun ? [Buffer.from('dry-run-image')] : [],
    dryRun,
  });
  console.log(`SUMMARY ${JSON.stringify({ ok: result.ok, dryRun: result.dryRun, photoCount: result.photo_count, paths: result.storagePaths })}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`03-media-harvester FAILED: ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  BUCKET,
  MAX_WIDTH,
  WEBP_QUALITY,
  convertToWebp,
  harvestUnitMedia,
};
