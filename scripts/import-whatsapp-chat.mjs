#!/usr/bin/env node
'use strict';

/**
 * Sierra Estates — WhatsApp Group Chat & Media Importer
 * ──────────────────────────────────────────────────────────────
 * Parses exported WhatsApp chat logs (.txt) or complete export archives (.zip)
 * from owner/broker groups (e.g. "augast owners", "owners", "(Inventory) Brokers United"),
 * groups multi-message photo attachments and follow-up price specifications from the same sender,
 * verifies Property Finder media dimensions (>= 800x600 px), and syncs directly to
 * Supabase `public.listings` and Supabase Storage (`property-media`).
 *
 * Usage:
 *   node scripts/import-whatsapp-chat.mjs --all-staged [--sync-db]
 *   node scripts/import-whatsapp-chat.mjs --file "path/to/_chat.txt" [--sync-db]
 *   node scripts/import-whatsapp-chat.mjs --dir "data/whatsapp-phone-import" [--sync-db]
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const require = createRequire(import.meta.url);
const { generateInstitutionalCopy } = require('../workflows/lib/listing-copywriter.js');

dotenv.config({ path: 'workflows/.env' });
dotenv.config({ path: '.env' });

export const GAZETTEER = [
  { keys: ['ميفيدا', 'mivida', 'mevida'], label: 'Mivida', zone: '5th Settlement', lat: 30.007, lng: 31.589 },
  { keys: ['ماونتن فيو هايد بارك', 'ماونتن فيو هيد بارك', 'mv hp', 'mountain view hyde park'], label: 'Mountain View Hyde Park', zone: '5th Settlement', lat: 30.008, lng: 31.645 },
  { keys: ['هايد بارك', 'هايدبارك', 'hyde park', 'hydepark'], label: 'Hyde Park', zone: '5th Settlement', lat: 30.015, lng: 31.635 },
  { keys: ['فيفث سكوير', 'المراسم', 'fifth square', 'marasem', '5th square'], label: 'Fifth Square', zone: '5th Settlement', lat: 30.025, lng: 31.578 },
  { keys: ['بالم هيلز', 'palm hills', 'palm hills new cairo', 'pk1', 'pk2'], label: 'Palm Hills New Cairo', zone: '5th Settlement', lat: 30.012, lng: 31.615 },
  { keys: ['مدينتي', 'madinaty'], label: 'Madinaty', zone: 'Madinaty', lat: 30.101, lng: 31.664 },
  { keys: ['الرحاب', 'rehab', 'al rehab'], label: 'Al Rehab', zone: 'Al Rehab', lat: 30.058, lng: 31.514 },
  { keys: ['بيت الوطن', 'بيت وطن', 'beit el watan', 'beit watan'], label: 'Beit El Watan', zone: 'Beit El Watan', lat: 30.045, lng: 31.585 },
  { keys: ['ايست تاون', 'ايستاون', 'eastown'], label: 'Eastown Sodic', zone: '5th Settlement', lat: 30.018, lng: 31.505 },
  { keys: ['فيليت', 'villette'], label: 'Villette Sodic', zone: '5th Settlement', lat: 30.010, lng: 31.555 },
  { keys: ['سراي', 'sarai'], label: 'Sarai', zone: 'Suez Road', lat: 30.085, lng: 31.695 },
  { keys: ['البروج', 'al burouj', 'burouj'], label: 'Al Burouj', zone: 'Suez Road', lat: 30.155, lng: 31.725 },
  { keys: ['سوان ليك', 'swan lake', 'swanlake'], label: 'Swan Lake', zone: '1st Settlement', lat: 30.052, lng: 31.475 },
  { keys: ['اوريانا', 'oriana'], label: 'Oriana', zone: 'Cairo Festival City', lat: 30.028, lng: 31.408 },
  { keys: ['كايرو فيستيفال', 'cfc', 'cairo festival city'], label: 'Cairo Festival City', zone: '5th Settlement', lat: 30.030, lng: 31.405 },
  { keys: ['ووتر واي', 'waterway', 'the waterway'], label: 'The Waterway', zone: 'Northern 90', lat: 30.042, lng: 31.508 },
  { keys: ['ازار', 'azzar'], label: 'Azzar', zone: 'Golden Square', lat: 30.035, lng: 31.565 },
  { keys: ['النرجس', 'narges'], label: 'Al Narges', zone: '5th Settlement', lat: 30.005, lng: 31.475 },
  { keys: ['الياسمين', 'yasmeen'], label: 'Al Yasmeen', zone: '1st Settlement', lat: 30.045, lng: 31.465 },
  { keys: ['البنفسج', 'banafsaj'], label: 'Al Banafsaj', zone: '1st Settlement', lat: 30.055, lng: 31.485 },
  { keys: ['the address', 'ذا ادرس', 'الادرس'], label: 'The Address', zone: '5th Settlement', lat: 30.022, lng: 31.488 },
  { keys: ['lake view', 'lake view residence', 'ليك فيو'], label: 'Lake View Residence', zone: 'Golden Square', lat: 30.019, lng: 31.535 }
];

const PHONE_REGEX = /(?:\+?20[\s\-.]?)?0?1[0125](?:[\s\-.]?\d){8}/g;

export function normalizePhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('20') && digits.length === 12) return digits;
  if (digits.startsWith('01') && digits.length === 11) return '2' + digits;
  if (digits.startsWith('1') && digits.length === 10) return '20' + digits;
  return digits;
}

export function toWesternDigits(str) {
  if (!str) return '';
  return String(str).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

export function parseWhatsAppExport(text) {
  if (!text) return [];
  // Strip RTL / LTR / non-breaking zero-width marks
  const cleaned = text.replace(/[\u200E\u200F\u202A-\u202E\uFEFF]/g, '');

  // Line pattern supporting:
  // [10/24/26, 1:45:12 PM] Sender: Message
  // 5/15/25, 5:58 PM - Sender: Message (including \u202F narrow space before PM)
  // 07/04/2025, 10:20:27 PM - Sender: Message
  // 14/08/2024, 17:51 - Sender: Message
  const linePattern = /^(?:\[?(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:[\s\u202F\u00A0]*[APap][Mm])?)\]?[\s\-:]+)([^:]+?):\s*(.*)$/;

  const rawLines = cleaned.split(/\r?\n/);
  const messages = [];
  let currentMsg = null;

  for (const line of rawLines) {
    const match = line.match(linePattern);
    if (match) {
      if (currentMsg) messages.push(currentMsg);
      currentMsg = {
        timestamp: match[1].replace(/[\u202F\u00A0]/g, ' ').trim(),
        sender: match[2].trim(),
        text: match[3],
      };
    } else if (currentMsg) {
      currentMsg.text += '\n' + line;
    }
  }
  if (currentMsg) messages.push(currentMsg);

  return messages;
}

export function extractUnitDetails(msg, groupName = 'WhatsApp Group') {
  let text = msg.text || '';
  if (text.length < 20) return null;

  text = toWesternDigits(text);

  const keywords = [
    'للبيع', 'للايجار', 'للإيجار', 'ايجار', 'إيجار', 'بيع', 'شقة', 'فيلا', 'توين هاوس',
    'تاون هاوس', 'دوبلكس', 'بنتهاوس', 'مساحة', 'مساحه', 'مطلوب', 'متاح', 'كمبوند', 'كود',
    'sqm', 'rent', 'sale', 'apartment', 'villa', 'penthouse', 'duplex', 'townhouse',
    'twinhouse', 'compound', 'furnished', 'unfurnished', 'bedroom', 'bedrooms', 'bathroom'
  ];
  let kwCount = 0;
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw)) kwCount++;
  }
  if (kwCount < 2) return null;

  let detectedCompound = null;
  for (const g of GAZETTEER) {
    if (g.keys.some((k) => lower.includes(k))) {
      detectedCompound = g;
      break;
    }
  }

  let phone = null;
  const phones = text.match(PHONE_REGEX);
  if (phones && phones.length > 0) {
    phone = normalizePhone(phones[0]);
  } else if (PHONE_REGEX.test(msg.sender)) {
    phone = normalizePhone(msg.sender);
  }

  let price = 0;
  const priceMatch = text.match(/(?:مطلوب|سعر|السعر|اجمالي|إجمالي|بـ|ب|price|total|rent|الايجار|الإيجار)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(مليون|الف|ألف|k|m|egp|جنيه)?/i)
    || text.match(/(\d+(?:[.,]\d+)?)\s*(مليون|الف|ألف|k|m|egp|جنيه)/i)
    || text.match(/(\d+)\s*k\b/i);
  if (priceMatch) {
    let num = parseFloat(priceMatch[1].replace(/,/g, '')) || 0;
    const unit = (priceMatch[2] || '').toLowerCase();
    if (unit.includes('مليون') || unit === 'm') num *= 1_000_000;
    else if (unit.includes('الف') || unit.includes('ألف') || unit === 'k' || priceMatch[0].toLowerCase().includes('k')) num *= 1_000;
    else if (num > 0 && num < 100) num *= 1_000_000;
    price = Math.round(num);
  }

  let area = null;
  const areaMatch = text.match(/(?:مساحة|مساحه|area)?\s*[:=]?\s*(\d+)\s*(?:متر|م|sqm|m2)/i);
  if (areaMatch) {
    area = parseInt(areaMatch[1], 10);
  }

  let bedrooms = 3;
  const bedMatch = text.match(/(\d+)\s*(?:غرف|غرفة|bedrooms|bedroom|beds|bed)/i);
  if (bedMatch) bedrooms = parseInt(bedMatch[1], 10);

  let bathrooms = 2;
  const bathMatch = text.match(/(\d+)\s*(?:حمام|حمامات|bathrooms|bathroom|baths|bath)/i);
  if (bathMatch) bathrooms = parseInt(bathMatch[1], 10);

  const photoMatches1 = [...text.matchAll(/<(?:attached|ملف مرفق):\s*([^>]+)>/gi)].map((m) => m[1].trim());
  const photoMatches2 = [...text.matchAll(/([\w-]+\.(?:jpg|jpeg|png|webp))\s*\((?:file attached|ملف مرفق)\)/gi)].map((m) => m[1].trim());
  const attachedPhotos = Array.from(new Set([...photoMatches1, ...photoMatches2])).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));

  const isRent = lower.includes('ايجار') || lower.includes('إيجار') || lower.includes('للايجار') || lower.includes('للإيجار') || lower.includes('rent');
  const dealType = isRent ? 'Rent' : 'Sale';

  let propType = 'Apartment';
  if (text.includes('فيلا مستقلة') || text.includes('فيلا ستاند الون') || text.includes('ستاند الون') || text.includes('فيلا')) propType = 'Standalone Villa';
  else if (text.includes('توين هاوس') || text.includes('توين')) propType = 'Twin House';
  else if (text.includes('تاون هاوس') || text.includes('تاون')) propType = 'Townhouse';
  else if (text.includes('بنتهاوس') || text.includes('روف')) propType = 'Penthouse';
  else if (text.includes('دوبلكس')) propType = 'Duplex';

  const hashKey = `${detectedCompound?.label || 'New Cairo'}|${area || ''}|${price || ''}|${phone || msg.sender || ''}`;
  const dupeHash = crypto.createHash('sha256').update(hashKey).digest('hex').slice(0, 16);

  return {
    compound: detectedCompound?.label || 'New Cairo',
    zone: detectedCompound?.zone || 'New Cairo',
    lat: detectedCompound?.lat || 30.03,
    lng: detectedCompound?.lng || 31.47,
    price,
    areaSqm: area,
    bedrooms,
    bathrooms,
    propertyType: propType,
    dealType,
    ownerPhone: phone,
    ownerName: msg.sender,
    rawText: text,
    attachedPhotos,
    sourceGroup: groupName,
    timestamp: msg.timestamp,
    dupeHash,
  };
}

/**
 * Groups consecutive media attachments and short followup messages from the same sender
 */
export function parseGroupedListings(messages, groupName = 'WhatsApp') {
  const units = [];
  const ATTACH_REGEX = /([\w-]+\.(?:jpg|jpeg|png|webp))\s*\((?:file attached|ملف مرفق)\)/i;

  const EN_AR_KEYWORDS = [
    'للبيع', 'للايجار', 'للإيجار', 'ايجار', 'إيجار', 'بيع', 'شقة', 'فيلا', 'توين هاوس',
    'تاون هاوس', 'دوبلكس', 'بنتهاوس', 'مساحة', 'مساحه', 'مطلوب', 'متاح', 'كمبوند', 'كود',
    'sqm', 'rent', 'sale', 'apartment', 'villa', 'penthouse', 'duplex', 'townhouse',
    'twinhouse', 'compound', 'furnished', 'unfurnished', 'bedroom', 'bedrooms', 'bathroom'
  ];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    let text = toWesternDigits(m.text || '');
    if (text.length < 20) continue;

    const lower = text.toLowerCase();
    let kwCount = 0;
    for (const kw of EN_AR_KEYWORDS) {
      if (lower.includes(kw)) kwCount++;
    }
    if (kwCount < 2) continue;

    const attachedPhotos = [];
    let combinedText = text;
    let j = i + 1;

    // Scan up to 40 consecutive messages from the same sender for attachments / followups
    while (j < messages.length && j <= i + 40) {
      const nextMsg = messages[j];
      if (nextMsg.sender !== m.sender) break;

      const nextText = nextMsg.text.trim();
      const attachMatch = nextText.match(ATTACH_REGEX);
      if (attachMatch) {
        attachedPhotos.push(attachMatch[1]);
        j++;
        continue;
      }

      // Short followup text (e.g. "55k" or "مطلوب 50 الف" or area/specs)
      if (nextText.length < 80 && !nextText.includes('http')) {
        const hasPrice = /(?:\d+(?:[.,]\d+)?)\s*(?:مليون|الف|ألف|k|m|egp|جنيه|\$)/i.test(nextText);
        const hasArea = /\d+\s*(?:متر|م|sqm|m2)/i.test(nextText);
        const hasSpecs = /(?:غرف|غرفة|حمام|bath|bed)/i.test(nextText);
        if (hasPrice || hasArea || hasSpecs) {
          combinedText += '\n' + nextText;
          j++;
          continue;
        }
      }

      // If nextMsg looks like a separate new listing, break
      let nextKwCount = 0;
      for (const kw of EN_AR_KEYWORDS) {
        if (nextText.toLowerCase().includes(kw)) nextKwCount++;
      }
      if (nextKwCount >= 2 && nextText.length > 50) {
        break;
      }

      break;
    }

    const syntheticMsg = {
      timestamp: m.timestamp,
      sender: m.sender,
      text: combinedText,
    };

    const parsed = extractUnitDetails(syntheticMsg, groupName);
    if (parsed) {
      parsed.attachedPhotos = Array.from(new Set([...(parsed.attachedPhotos || []), ...attachedPhotos]));
      units.push(parsed);
    }

    i = j - 1;
  }

  return units;
}

export function parseImageDimensions(buf) {
  if (!buf || buf.length < 24) return null;
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    const width = ((buf[16] << 24) | (buf[17] << 16) | (buf[18] << 8) | buf[19]) >>> 0;
    const height = ((buf[20] << 24) | (buf[21] << 16) | (buf[22] << 8) | buf[23]) >>> 0;
    return { width, height };
  }
  // JPEG SOF0..SOF2
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length - 8) {
      if (buf[offset] !== 0xff) break;
      const marker = buf[offset + 1];
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        const height = ((buf[offset + 5] << 8) | buf[offset + 6]) >>> 0;
        const width = ((buf[offset + 7] << 8) | buf[offset + 8]) >>> 0;
        return { width, height };
      }
      const len = ((buf[offset + 2] << 8) | buf[offset + 3]) >>> 0;
      offset += 2 + len;
    }
  }
  return null;
}

export async function processChatFile(chatFilePath, options = {}, sb = null) {
  const { phoneMediaDir, syncDb = false } = options;
  const content = fs.readFileSync(chatFilePath, 'utf8');
  const groupName = path.basename(path.dirname(chatFilePath)) || 'WhatsApp Group';

  const messages = parseWhatsAppExport(content);
  const units = parseGroupedListings(messages, groupName);

  const mediaSearchDir = path.dirname(chatFilePath);
  const searchDirs = [mediaSearchDir, phoneMediaDir, 'data/whatsapp-phone-import'].filter(Boolean);

  let insertedCount = 0;
  let photosUploaded = 0;

  for (const u of units) {
    const localPhotos = [];
    for (const pName of u.attachedPhotos) {
      for (const dir of searchDirs) {
        const candidate = path.join(dir, pName);
        if (fs.existsSync(candidate)) {
          const buf = fs.readFileSync(candidate);
          const dims = parseImageDimensions(buf);
          localPhotos.push({
            filename: pName,
            path: candidate,
            bytes: buf.length,
            width: dims?.width || null,
            height: dims?.height || null,
            qualifying: (dims?.width || 0) >= 800 && (dims?.height || 0) >= 600,
          });
          break;
        }
      }
    }
    u.localPhotos = localPhotos;
    const qualifyingPhotos = localPhotos.filter((p) => p.qualifying);
    u.pfEligible = qualifyingPhotos.length >= 6 && u.price > 0 && u.compound !== 'New Cairo';
  }

  // Filter for high-quality actionable units: must have named compound + price > 0, OR attached photos
  const highQualityUnits = units.filter((u) => (u.price > 0 && u.compound !== 'New Cairo') || (u.localPhotos && u.localPhotos.length > 0));

  if (syncDb && sb && highQualityUnits.length > 0) {
    const payloads = [];
    for (const u of highQualityUnits) {
      const uploadedUrls = [];
      const qualifyingPhotos = (u.localPhotos || []).filter((p) => p.qualifying);

      for (const p of qualifyingPhotos) {
        try {
          const buf = fs.readFileSync(p.path);
          const ext = path.extname(p.path).replace('.', '') || 'jpg';
          const storagePath = `whatsapp-units/${u.dupeHash}/${p.filename}`;
          const { error: uploadErr } = await sb.storage.from('property-media').upload(storagePath, buf, {
            contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
            upsert: true,
          });
          if (!uploadErr) {
            const { data: pubUrl } = sb.storage.from('property-media').getPublicUrl(storagePath);
            if (pubUrl && pubUrl.publicUrl) {
              uploadedUrls.push(pubUrl.publicUrl);
              photosUploaded++;
            }
          }
        } catch (_) {}
      }

      const listingCode = `WA-${u.dupeHash.slice(0, 8).toUpperCase()}`;
      const copy = generateInstitutionalCopy({
        code: listingCode,
        compound: u.compound,
        propertyType: u.propertyType,
        dealType: u.dealType,
        price: u.price,
        areaSqm: u.areaSqm,
        bedrooms: u.bedrooms,
        bathrooms: u.bathrooms,
        description: u.rawText,
      });

      payloads.push({
        code: listingCode,
        title: copy.titleEn || `${u.propertyType} in ${u.compound}`,
        title_ar: copy.titleAr || null,
        compound: u.compound,
        location_area: u.zone,
        price: u.price || 0,
        bedrooms: u.bedrooms || 3,
        bathrooms: u.bathrooms || 2,
        area_sqm: u.areaSqm || 0,
        property_type: u.propertyType,
        deal_type: (u.dealType || 'sale').toLowerCase(),
        owner_name: u.ownerName || null,
        owner_phone: u.ownerPhone || null,
        description: copy.descriptionEn || u.rawText || `${u.propertyType} in ${u.compound}`,
        description_ar: copy.descriptionAr || null,
        images: uploadedUrls.length ? uploadedUrls : null,
        photo_count: uploadedUrls.length,
        status: 'active',
        publish_status: 'PUBLISHABLE',
        availability: 'available',
        source_channel: 'whatsapp_cable_import',
        dupe_check_hash: u.dupeHash,
        latitude: u.lat || 30.03,
        longitude: u.lng || 31.47,
        raw_data: {
          title_ar: copy.titleAr,
          description_ar: copy.descriptionAr,
          raw_message: u.rawText,
          source_group: groupName,
          ingested_at: new Date().toISOString(),
        },
      });
    }

    // Deduplicate payloads by dupe_check_hash in-memory first
    const seenHashes = new Set();
    const dedupedPayloads = [];
    for (const p of payloads) {
      if (!seenHashes.has(p.dupe_check_hash)) {
        seenHashes.add(p.dupe_check_hash);
        dedupedPayloads.push(p);
      }
    }

    // Batch process in chunks of 50 for optimal network performance
    const CHUNK_SIZE = 50;
    for (let c = 0; c < dedupedPayloads.length; c += CHUNK_SIZE) {
      const chunk = dedupedPayloads.slice(c, c + CHUNK_SIZE);
      const chunkHashes = chunk.map((p) => p.dupe_check_hash);
      const { data: existingRows } = await sb.from('listings').select('id, dupe_check_hash').in('dupe_check_hash', chunkHashes);
      const existingMap = new Map((existingRows || []).map((r) => [r.dupe_check_hash, r.id]));

      const toInsert = [];
      const updatePromises = [];
      for (const item of chunk) {
        const existingId = existingMap.get(item.dupe_check_hash);
        if (existingId) {
          if (item.images && item.images.length > 0) {
            updatePromises.push(sb.from('listings').update(item).eq('id', existingId));
          }
          insertedCount++;
        } else {
          toInsert.push(item);
        }
      }

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }

      if (toInsert.length > 0) {
        const { error: insErr } = await sb.from('listings').insert(toInsert);
        if (!insErr) insertedCount += toInsert.length;
        else console.error(`[import] Batch insert error:`, insErr.message);
      }
    }
  }

  return {
    filePath: chatFilePath,
    groupName,
    totalMessages: messages.length,
    unitsCount: units.length,
    unitsWithPhotosCount: units.filter((u) => u.localPhotos && u.localPhotos.length > 0).length,
    pfEligibleCount: units.filter((u) => u.pfEligible).length,
    insertedCount,
    photosUploaded,
    units,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a, i) => args[i - 1] === '--file');
  const dirArg = args.find((a, i) => args[i - 1] === '--dir') || (args.includes('--all-staged') ? 'data/whatsapp-phone-import' : null);
  const phoneMediaDir = args.find((a, i) => args[i - 1] === '--phone-media-dir') || 'data/whatsapp-phone-import';
  const syncDb = args.includes('--sync-db');

  let targetFiles = [];

  if (fileArg) {
    if (fileArg.endsWith('.zip')) {
      const extractDir = path.join(path.dirname(fileArg), path.basename(fileArg, '.zip') + '_extracted');
      if (!fs.existsSync(extractDir)) {
        fs.mkdirSync(extractDir, { recursive: true });
        execSync(`pwsh -NoProfile -Command "Expand-Archive -LiteralPath '${fileArg.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force"`);
      }
      const found = fs.readdirSync(extractDir).filter((f) => f.endsWith('.txt')).map((f) => path.join(extractDir, f));
      targetFiles.push(...found);
    } else {
      targetFiles.push(fileArg);
    }
  } else if (dirArg && fs.existsSync(dirArg)) {
    function findTxtFiles(dir) {
      let results = [];
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) {
          results = results.concat(findTxtFiles(full));
        } else if (item.endsWith('.txt') && !item.includes('license') && !item.includes('readme')) {
          results.push(full);
        }
      }
      return results;
    }
    targetFiles = findTxtFiles(dirArg);
  } else {
    targetFiles = ['data/whatsapp-phone-import/WhatsApp Chat with +20 11 13777964/WhatsApp Chat with +20 11 13777964.txt'];
  }

  console.log(`\n================================================================`);
  console.log(` Sierra Estates — WhatsApp Group Chat & Media Ingestion Engine `);
  console.log(` Mode: ${syncDb ? 'LIVE SYNC (Supabase DB + Media Storage)' : 'DRY RUN AUDIT (Pass --sync-db to commit)'}`);
  console.log(` Files to process: ${targetFiles.length}`);
  console.log(`================================================================\n`);

  let sb = null;
  if (syncDb) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      console.error('Supabase credentials missing in env');
      process.exit(1);
    }
    sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }

  let grandTotalUnits = 0;
  let grandTotalUnitsWithPhotos = 0;
  let grandTotalPfEligible = 0;
  let grandTotalInserted = 0;
  let grandTotalPhotosUploaded = 0;
  const allExtractedUnits = [];

  for (const f of targetFiles) {
    try {
      console.log(`Processing: ${path.relative(process.cwd(), f)}...`);
      const res = await processChatFile(f, { phoneMediaDir, syncDb }, sb);
      console.log(`  -> Messages: ${res.totalMessages} | Units: ${res.unitsCount} | With Photos: ${res.unitsWithPhotosCount} | PF Ready (6+ photos >=800x600): ${res.pfEligibleCount}`);
      grandTotalUnits += res.unitsCount;
      grandTotalUnitsWithPhotos += res.unitsWithPhotosCount;
      grandTotalPfEligible += res.pfEligibleCount;
      grandTotalInserted += res.insertedCount;
      grandTotalPhotosUploaded += res.photosUploaded;
      allExtractedUnits.push(...res.units);
    } catch (err) {
      console.error(`  Error processing ${f}:`, err.message);
    }
  }

  console.log(`\n================================================================`);
  console.log(` INGESTION SUMMARY:`);
  console.log(` Total Property Units Extracted:     ${grandTotalUnits}`);
  console.log(` Units with Attached Photos on Disk:  ${grandTotalUnitsWithPhotos}`);
  console.log(` Units Passing PF 6-Photo Gate:      ${grandTotalPfEligible}`);
  if (syncDb) {
    console.log(` Units Upserted to public.listings:  ${grandTotalInserted}`);
    console.log(` Photos Uploaded to property-media:  ${grandTotalPhotosUploaded}`);
  }
  console.log(`================================================================\n`);

  // Write visual approval update artifact
  const eligibleUnits = allExtractedUnits.filter((u) => u.pfEligible || (u.localPhotos && u.localPhotos.length >= 6));
  console.log(`Top Ready Units for Property Finder Ads (${eligibleUnits.length} units):`);
  for (const [idx, u] of eligibleUnits.slice(0, 5).entries()) {
    console.log(`  ${idx + 1}. [${u.dealType}] ${u.propertyType} in ${u.compound} - ${u.price?.toLocaleString()} EGP (${u.localPhotos?.length} photos, ${u.localPhotos?.filter(p=>p.qualifying).length} qualifying)`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('import-whatsapp-chat.mjs')) {
  main().then(() => {
    process.exit(0);
  }).catch((e) => {
    console.error(`Import failed: ${e.message}`);
    process.exit(1);
  });
}
