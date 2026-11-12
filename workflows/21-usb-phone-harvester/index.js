#!/usr/bin/env node
'use strict';

/**
 * Sierra Estates — Workflow 21: USB Phone WhatsApp Group Harvester
 * ────────────────────────────────────────────────────────────────
 * Contract:
 *  1. Ignore/Filter out buyer & tenant requests completely ("سيبك من الطلبات").
 *  2. Register all real incoming units into the system (Supabase public.listings)
 *     FIRST THING ("والوحدات الي تجيلك تسجلها ع السيستم اول حاجة").
 *  3. Code each unit systematically with institutional code SE-WA-XXXXXX ("وكودها").
 *  4. Put unit photos on Google Drive under the exact same Unit Code folder ("وحط صورها علي الدريف بنفس كود الوحدة").
 *  5. Organize all units on the Sheet chronologically by Posted Date ("ونظم الوحدات دي علي الشيت").
 *  6. Run automatically twice a week (every 3-4 days: Sunday & Wednesday 10:00 AM)
 *     AND any time the phone is connected via USB cable.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const { loadWorkflowEnv } = require('../lib/google-sheets');

loadWorkflowEnv(path.join(__dirname, '..'));

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const IMPORT_DIR = path.join(ROOT_DIR, 'data', 'whatsapp-phone-import');
const STATE_DIR = path.join(ROOT_DIR, 'workflows', '.state');
const GOOGLE_DRIVE_BASE = 'G:\\My Drive\\Sierra_Estates_Units_Media';

if (!fs.existsSync(IMPORT_DIR)) fs.mkdirSync(IMPORT_DIR, { recursive: true });
if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });

async function pullFromPhoneViaPowershell() {
  const scriptPath = path.join(ROOT_DIR, 'scripts', 'pull-usb-phone.ps1');
  try {
    const out = execSync(`pwsh -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`, {
      encoding: 'utf8',
      timeout: 60000
    });
    return out.trim();
  } catch (err) {
    return `NOTICE: ${err.message}`;
  }
}

async function run() {
  console.log('================================================================');
  console.log(' Sierra Estates — System Registry & Google Drive Harvester');
  console.log(` Timestamp: ${new Date().toISOString()}`);
  console.log('================================================================\n');

  // 1. Check for Phone via USB Cable
  console.log('[1/5] Detecting USB Phone & Pulling Fresh WhatsApp Exports...');
  const phoneRes = await pullFromPhoneViaPowershell();
  console.log(`      ${phoneRes.split('\n')[0] || 'USB Check Complete'}`);

  // 2. Load Parser & Exporter Modules
  const { parseWhatsAppExport, parseGroupedListings } = await import('./parse-engine.mjs');
  const { exportUnitsToExcel } = await import('./export-sheets.mjs');

  // 3. Scan Staged Chat Files
  console.log('\n[2/5] Parsing & Grouping WhatsApp chats (Filtering out buyer requests)...');
  function findTxtFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      try {
        if (fs.statSync(full).isDirectory()) {
          results = results.concat(findTxtFiles(full));
        } else if (item.endsWith('.txt') && !item.includes('license') && !item.includes('readme')) {
          results.push(full);
        }
      } catch (_) {}
    }
    return results;
  }

  const chatFiles = findTxtFiles(IMPORT_DIR);
  console.log(`      Found ${chatFiles.length} WhatsApp chat export(s).`);

  const rawUnits = [];
  let ignoredRequestsCount = 0;

  for (const f of chatFiles) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const groupName = path.basename(path.dirname(f)) || 'WhatsApp Group';
      const messages = parseWhatsAppExport(content);
      const units = parseGroupedListings(messages, groupName);

      for (const u of units) {
        if (u.isRequest) {
          ignoredRequestsCount++;
          continue; // "سيبك من الطلبات" - STRICTLY EXCLUDE BUYER REQUESTS
        }
        rawUnits.push(u);
      }
      console.log(`      Parsed ${path.relative(ROOT_DIR, f)} -> ${units.length} entries`);
    } catch (err) {
      console.error(`      Error reading ${f}:`, err.message);
    }
  }

  console.log(`      ✓ Filtered out & ignored ${ignoredRequestsCount} buyer/client requests.`);
  console.log(`      ✓ Retained ${rawUnits.length} real property listings.`);

  // 4. Deduplicate per real-estate-excel-processor rules
  console.log(`\n[3/5] Deduplicating listings and sorting by Posted Date...`);
  const seenBrokerKeys = new Set();
  const seenOwnerKeys = new Set();
  const dedupedUnits = [];

  for (const u of rawUnits) {
    if (u.advertiser === 'Direct Owner') {
      const ownerKey = u.phoneLast7 || u.senderName;
      if (!seenOwnerKeys.has(ownerKey)) {
        seenOwnerKeys.add(ownerKey);
        dedupedUnits.push(u);
      }
    } else {
      const brokerKey = `${u.phoneLast7 || u.senderName}|${Math.round((u.priceEgp || 0) / 1000) * 1000}`;
      if (!seenBrokerKeys.has(brokerKey)) {
        seenBrokerKeys.add(brokerKey);
        dedupedUnits.push(u);
      }
    }
  }

  // Sort chronologically by posted date (newest first)
  dedupedUnits.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
  console.log(`      ✓ Final unique real units: ${dedupedUnits.length}`);

  // 5. FIRST ACTION: Register all units into the System (Supabase public.listings)
  // "والوحدات الي تجيلك تسجلها ع السيستم اول حاجة"
  console.log('\n[4/5] [STEP 1] Registering all incoming units into System (Supabase listings)...');
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let sb = null;
  let registeredInDbCount = 0;

  if (supabaseUrl && serviceKey) {
    sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const CHUNK_SIZE = 50;
    for (let i = 0; i < dedupedUnits.length; i += CHUNK_SIZE) {
      const chunk = dedupedUnits.slice(i, i + CHUNK_SIZE).map((u) => ({
        code: u.unitCode,
        title: `${u.propertyType} in ${u.compound}`,
        compound: u.compound,
        location_area: u.zone,
        price: u.priceEgp || 0,
        bedrooms: u.bedrooms || 3,
        bathrooms: u.bathrooms || 2,
        area_sqm: u.areaSqm || 0,
        property_type: u.propertyType,
        deal_type: (u.dealType || 'sale').toLowerCase(),
        owner_name: u.senderName || null,
        owner_phone: u.phoneNormalized || null,
        description: u.rawText || `${u.propertyType} in ${u.compound}`,
        source_channel: 'whatsapp_usb_import',
        dupe_check_hash: u.dupeHash,
        status: 'active',
        availability: 'available',
        raw_data: {
          posted_date: u.postedDate,
          posted_day: u.postedDay,
          source_group: u.sourceGroup,
          advertiser_type: u.advertiser,
          ingested_at: new Date().toISOString()
        }
      }));

      const hashes = chunk.map((c) => c.dupe_check_hash);
      const { data: existing } = await sb.from('listings').select('id, dupe_check_hash').in('dupe_check_hash', hashes);
      const existingMap = new Map((existing || []).map((r) => [r.dupe_check_hash, r.id]));

      const toInsert = chunk.filter((c) => !existingMap.has(c.dupe_check_hash));
      if (toInsert.length > 0) {
        const { error } = await sb.from('listings').insert(toInsert);
        if (!error) registeredInDbCount += toInsert.length;
        else console.error(`      DB Insert warning:`, error.message);
      }
      registeredInDbCount += (chunk.length - toInsert.length);
    }
    console.log(`      ✓ Confirmed in System (Supabase listings): ${registeredInDbCount} units.`);
  }

  // 6. SECOND ACTION: Organize Photos on Google Drive under Unit Code
  // "وحط صورها علي الدريف بنفس كود الوحدة"
  console.log('\n[5/5] [STEP 2] Organizing Unit Photos on Google Drive under Unit Code...');
  let driveFoldersCreated = 0;
  let photosCopiedToDrive = 0;
  let photosUploadedToSupabase = 0;

  // Search directories for image files
  const searchDirs = [
    IMPORT_DIR,
    path.join(ROOT_DIR, 'data', 'whatsapp-media'),
    ...chatFiles.map((f) => path.dirname(f))
  ];

  const hasDrive = fs.existsSync('G:\\My Drive');
  if (hasDrive && !fs.existsSync(GOOGLE_DRIVE_BASE)) {
    fs.mkdirSync(GOOGLE_DRIVE_BASE, { recursive: true });
  }

  for (const u of dedupedUnits) {
    if (!u.attachedPhotos || u.attachedPhotos.length === 0) continue;

    const unitPhotosOnDisk = [];
    for (const pName of u.attachedPhotos) {
      for (const dir of searchDirs) {
        const candidate = path.join(dir, pName);
        if (fs.existsSync(candidate)) {
          unitPhotosOnDisk.push({ filename: pName, fullPath: candidate });
          break;
        }
      }
    }

    if (unitPhotosOnDisk.length > 0) {
      const unitDriveFolder = path.join(GOOGLE_DRIVE_BASE, u.unitCode);
      u.driveFolder = unitDriveFolder;

      if (hasDrive) {
        try {
          if (!fs.existsSync(unitDriveFolder)) {
            fs.mkdirSync(unitDriveFolder, { recursive: true });
            driveFoldersCreated++;
          }

          let pIdx = 1;
          for (const photo of unitPhotosOnDisk) {
            const ext = path.extname(photo.fullPath) || '.jpg';
            const driveTarget = path.join(unitDriveFolder, `${u.unitCode}_${String(pIdx).padStart(2, '0')}${ext}`);
            if (!fs.existsSync(driveTarget)) {
              fs.copyFileSync(photo.fullPath, driveTarget);
              photosCopiedToDrive++;
            }
            pIdx++;
          }
        } catch (err) {
          console.error(`      Drive copy notice for ${u.unitCode}:`, err.message);
        }
      }

      // Also mirror to Supabase Storage if configured
      if (sb) {
        const uploadedUrls = [];
        for (const photo of unitPhotosOnDisk) {
          try {
            const buf = fs.readFileSync(photo.fullPath);
            const ext = path.extname(photo.fullPath).replace('.', '') || 'jpg';
            const storagePath = `whatsapp-units/${u.unitCode}/${photo.filename}`;
            const { error: uploadErr } = await sb.storage.from('property-media').upload(storagePath, buf, {
              contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
              upsert: true
            });
            if (!uploadErr) {
              const { data: pubUrl } = sb.storage.from('property-media').getPublicUrl(storagePath);
              if (pubUrl && pubUrl.publicUrl) {
                uploadedUrls.push(pubUrl.publicUrl);
                photosUploadedToSupabase++;
              }
            }
          } catch (_) {}
        }
        if (uploadedUrls.length > 0) {
          await sb.from('listings').update({
            images: uploadedUrls,
            photo_count: uploadedUrls.length
          }).eq('code', u.unitCode);
        }
      }
    }
  }

  console.log(`      ✓ Google Drive Folders Created: ${driveFoldersCreated}`);
  console.log(`      ✓ Photos Saved to Google Drive:  ${photosCopiedToDrive}`);
  if (photosUploadedToSupabase > 0) {
    console.log(`      ✓ Photos Mirrored to Supabase:  ${photosUploadedToSupabase}`);
  }

  // 7. THIRD ACTION: Organize and Export to Multi-Tab Master Excel & CSV
  // "ونظم الوحدات دي علي الشيت"
  console.log('\n[FINAL] Generating Date-Organized Master Spreadsheet...');
  const exportRes = exportUnitsToExcel(dedupedUnits, {
    outputDir: path.join(ROOT_DIR, 'data'),
    userDownloadsDir: 'C:\\Users\\Sierr\\Downloads',
    driveBaseDir: GOOGLE_DRIVE_BASE
  });

  console.log(`      ✓ Saved Primary Workbook: ${exportRes.primaryPath}`);
  console.log(`      ✓ Saved CSV Snapshot:     ${exportRes.csvPath}`);
  if (exportRes.mirrorPath) {
    console.log(`      ✓ Mirrored to Downloads:  ${exportRes.mirrorPath}`);
  }

  console.log('\n================================================================');
  console.log(' EXECUTION SUMMARY:');
  console.log(` Total Available Real Units (By Date): ${exportRes.availableCount}`);
  console.log(` Direct Owners Identified:              ${exportRes.ownersCount}`);
  console.log(` Units with Google Drive Photos:        ${exportRes.drivePhotosCount}`);
  console.log(` Units Confirmed in Supabase DB:        ${registeredInDbCount}`);
  console.log(` Google Drive Media Vault:              ${GOOGLE_DRIVE_BASE}`);
  console.log('================================================================\n');

  // Record telemetry state
  const telemetry = {
    workflow: 'usb-phone-harvester',
    last_run_at: new Date().toISOString(),
    status: 'ok',
    available_units: exportRes.availableCount,
    direct_owners: exportRes.ownersCount,
    drive_photos_count: exportRes.drivePhotosCount,
    db_registered_count: registeredInDbCount,
    excel_path: exportRes.primaryPath,
    drive_base: GOOGLE_DRIVE_BASE
  };
  fs.writeFileSync(path.join(STATE_DIR, 'usb-phone-harvester.json'), JSON.stringify(telemetry, null, 2), 'utf8');

  process.exit(0);
}

run().catch((err) => {
  console.error('Harvester failed:', err);
  process.exit(1);
});
