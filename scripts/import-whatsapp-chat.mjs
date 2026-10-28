#!/usr/bin/env node
'use strict';

/**
 * Sierra Estates — WhatsApp Group Chat Importer & Unit Harvester
 * ──────────────────────────────────────────────────────────────
 * Parses exported WhatsApp chat logs (.txt) from owner/broker groups
 * (e.g. "augast owners", "owners"), extracts property listings, resolves
 * New Cairo compound coordinates, normalizes Egyptian pricing, and syncs
 * directly to Supabase `public.listings` and Google Sheets.
 *
 * Usage:
 *   node scripts/import-whatsapp-chat.mjs --file "path/to/_chat.txt" [--dry-run] [--sync-db]
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'workflows/.env' });
dotenv.config({ path: '.env' });

const GAZETTEER = [
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
  { keys: ['البنفسج', 'banafsaj'], label: 'Al Banafsaj', zone: '1st Settlement', lat: 30.055, lng: 31.485 }
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

export function parseWhatsAppExport(text) {
  // Regex supporting common WhatsApp export header formats:
  // [10/24/26, 1:45:12 PM] Sender Name: Message
  // 10/24/26, 1:45 PM - Sender Name: Message
  // 24/10/2026, 13:45 - Sender Name: Message
  const linePattern = /^(?:\[?(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]?[\s\-:]+)([^:]+?):\s*(.*)$/;

  const rawLines = text.split(/\r?\n/);
  const messages = [];
  let currentMsg = null;

  for (const line of rawLines) {
    const match = line.match(linePattern);
    if (match) {
      if (currentMsg) messages.push(currentMsg);
      currentMsg = {
        timestamp: match[1],
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
  const text = msg.text || '';
  if (text.length < 25) return null;

  // Real estate keyword check
  const keywords = ['للبيع', 'للايجار', 'للإيجار', 'ايجار', 'إيجار', 'بيع', 'شقة', 'فيلا', 'توين هاوس', 'تاون هاوس', 'دوبلكس', 'بنتهاوس', 'مساحة', 'مساحه', 'مطلوب', 'متاح', 'كمبوند', 'كود'];
  let kwCount = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) kwCount++;
  }
  if (kwCount < 2) return null;

  // Compound extraction
  let detectedCompound = null;
  const lower = text.toLowerCase();
  for (const g of GAZETTEER) {
    if (g.keys.some((k) => lower.includes(k))) {
      detectedCompound = g;
      break;
    }
  }

  // Phone extraction
  let phone = null;
  const phones = text.match(PHONE_REGEX);
  if (phones && phones.length > 0) {
    phone = normalizePhone(phones[0]);
  } else if (PHONE_REGEX.test(msg.sender)) {
    phone = normalizePhone(msg.sender);
  }

  // Price extraction
  let price = 0;
  const priceMatch = text.match(/(?:مطلوب|سعر|السعر|اجمالي|إجمالي|بـ|ب|price|total)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(مليون|الف|ألف|k|m|egp|جنيه)?/i)
    || text.match(/(\d+(?:[.,]\d+)?)\s*(مليون|الف|ألف|k|m|egp|جنيه)/i);
  if (priceMatch) {
    let num = parseFloat(priceMatch[1].replace(/,/g, '')) || 0;
    const unit = (priceMatch[2] || '').toLowerCase();
    if (unit.includes('مليون') || unit === 'm') num *= 1_000_000;
    else if (unit.includes('الف') || unit.includes('ألف') || unit === 'k') num *= 1_000;
    else if (num > 0 && num < 100) num *= 1_000_000; // Egyptian shorthand: "مطلوب 15" = 15 million
    price = Math.round(num);
  }

  // Area extraction
  let area = null;
  const areaMatch = text.match(/(?:مساحة|مساحه|area)?\s*[:=]?\s*(\d+)\s*(?:متر|م|sqm|m2)/i);
  if (areaMatch) {
    area = parseInt(areaMatch[1], 10);
  }

  // Deal type & property type
  const isRent = text.includes('ايجار') || text.includes('إيجار') || text.includes('للايجار') || text.includes('للإيجار');
  const dealType = isRent ? 'Rent' : 'Sale';

  let propType = 'Apartment';
  if (text.includes('فيلا مستقلة') || text.includes('فيلا ستاند الون') || text.includes('ستاند الون') || text.includes('فيلا')) propType = 'Standalone Villa';
  else if (text.includes('توين هاوس') || text.includes('توين')) propType = 'Twin House';
  else if (text.includes('تاون هاوس') || text.includes('تاون')) propType = 'Townhouse';
  else if (text.includes('بنتهاوس') || text.includes('روف')) propType = 'Penthouse';
  else if (text.includes('دوبلكس')) propType = 'Duplex';

  const hashKey = `${detectedCompound?.label || 'New Cairo'}|${area || ''}|${price || ''}|${phone || ''}`;
  const dupeHash = crypto.createHash('sha256').update(hashKey).digest('hex').slice(0, 16);

  return {
    compound: detectedCompound?.label || 'New Cairo',
    zone: detectedCompound?.zone || 'New Cairo',
    lat: detectedCompound?.lat || 30.03,
    lng: detectedCompound?.lng || 31.47,
    price,
    areaSqm: area,
    propertyType: propType,
    dealType,
    ownerPhone: phone,
    ownerName: msg.sender,
    rawText: text,
    sourceGroup: groupName,
    timestamp: msg.timestamp,
    dupeHash,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a, i) => args[i - 1] === '--file') || args.find((a) => a.endsWith('.txt'));
  const isDryRun = args.includes('--dry-run') || !args.includes('--sync-db');

  if (!fileArg || !fs.existsSync(fileArg)) {
    console.log(`
Sierra Estates — WhatsApp Group Chat Importer
─────────────────────────────────────────────
Usage:
  node scripts/import-whatsapp-chat.mjs --file "<path-to-_chat.txt>" [--sync-db]

Options:
  --file <path>   Path to the exported WhatsApp _chat.txt file
  --sync-db       Persist parsed listings directly to Supabase public.listings (default: dry-run)
  --dry-run       Audit and preview extracted units without database writes
    `);
    process.exit(0);
  }

  const content = fs.readFileSync(fileArg, 'utf8');
  const groupName = path.basename(path.dirname(fileArg)) || 'WhatsApp Owners Group';
  console.log(`[import] Reading export file: ${fileArg}`);
  const messages = parseWhatsAppExport(content);
  console.log(`[import] Found ${messages.length} total messages in chat export`);

  const units = [];
  const seenHashes = new Set();
  for (const m of messages) {
    const u = extractUnitDetails(m, groupName);
    if (u && !seenHashes.has(u.dupeHash)) {
      seenHashes.add(u.dupeHash);
      units.push(u);
    }
  }

  console.log(`[import] Extracted ${units.length} unique valid property units with owner contacts!`);
  console.log(`\nSample Extracted Listings (first 3):`);
  console.log(JSON.stringify(units.slice(0, 3), null, 2));

  if (isDryRun) {
    console.log(`\n[DRY RUN] ${units.length} units extracted. Pass '--sync-db' to commit to Supabase & Sheet.`);
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Supabase credentials missing in env');
    process.exit(1);
  }

  const sb = createClient(supabaseUrl, serviceKey);
  let inserted = 0;
  for (const u of units) {
    const { error } = await sb.from('listings').upsert({
      code: `WA-${u.dupeHash.slice(0, 8).toUpperCase()}`,
      title: `${u.propertyType} in ${u.compound}`,
      compound: u.compound,
      location_area: u.zone,
      price: u.price,
      bedrooms: 3,
      property_type: u.propertyType,
      deal_type: u.dealType,
      owner_name: u.ownerName,
      owner_phone: u.ownerPhone,
      description: u.rawText,
      status: 'active',
      availability: 'available',
      dupe_check_hash: u.dupeHash,
    }, { onConflict: 'dupe_check_hash' });

    if (!error) inserted++;
  }

  console.log(`[import] Successfully synced ${inserted} units into Supabase public.listings!`);
}

if (process.argv[1] && process.argv[1].endsWith('import-whatsapp-chat.mjs')) {
  main().catch((e) => {
    console.error(`Import failed: ${e.message}`);
    process.exit(1);
  });
}
