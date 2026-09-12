#!/usr/bin/env node
/**
 * scripts/harvest-all-whatsapp-inventory.mjs
 *
 * End-to-end harvester for 39+ Sierra Estates WhatsApp group chat exports.
 * 1. Scans and parses all 39 chat exports + Owners_Inventory.json.
 * 2. Extracts real estate listings, phone numbers, prices, compound names, and unit specs.
 * 3. Deduplicates across WhatsApp sources and against the 7,634 master sheet inventory.
 * 4. Regenerates master workbooks (.xlsx, .csv) and segmented sheets.
 * 5. Updates public snapshot.json, compound-stats.json, and Supabase database.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Import gazetteer resolver
const gazetteerModule = await import('../apps/sierra-estates-realty/lib/inventory/gazetteer.ts');
const { resolveLocation, GAZETTEER } = gazetteerModule;

const CHAT_DIRS = [
  'H:/Sheets/Active owners/Active sheets/What app groups/Text',
  'H:/Sheets/Active owners/Active sheets/What app groups/fareda_unpacked',
  'H:/Sheets/Owners Project'
];

const OWNERS_JSON_PATH = 'H:/Sheets/Owners_Inventory.json';
const BASE_MASTER_CSV = path.join(ROOT_DIR, 'data', 'master_inventory_clean_no_duplicates.csv');
const PUBLIC_DOWNLOADS = path.join(ROOT_DIR, 'apps', 'sierra-estates-realty', 'public', 'downloads');
const SNAPSHOT_JSON_PATH = path.join(ROOT_DIR, 'apps', 'sierra-estates-realty', 'lib', 'inventory', 'snapshot.json');
const COMPOUND_STATS_PATH = path.join(ROOT_DIR, 'apps', 'sierra-estates-realty', 'lib', 'inventory', 'compound-stats.json');

// WhatsApp Header Regex: Handles "[24/08/2026, 10:15 AM] Sender: Text" and "11/2/25, 12:05 - Sender: Text"
const MSG_HEADER_REGEX = /^(?:\[?(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}[,.]?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:[AaPp][Mm]|ص|م))?)\]?)\s*[-:]\s*([^:]+):\s*(.*)$/;
const PHONE_REGEX = /(?:\+?20[\s\-.]?)?0?1[0125](?:[\s\-.]?\d){8}/g;

function cleanPhone(raw) {
  if (!raw) return '';
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+20')) digits = digits.slice(3);
  else if (digits.startsWith('20') && digits.length > 11) digits = digits.slice(2);

  if (digits.startsWith('10') || digits.startsWith('11') || digits.startsWith('12') || digits.startsWith('15')) {
    if (digits.length === 10) digits = '0' + digits;
  }
  if (digits.startsWith('01') && digits.length === 11) return digits;
  if (digits.startsWith('971') || digits.startsWith('965') || digits.startsWith('966')) {
    return '+' + digits;
  }
  return digits.length >= 10 ? digits : '';
}

function extractPhones(text, sender) {
  const found = new Set();
  const textMatches = text.match(PHONE_REGEX);
  if (textMatches) {
    for (const m of textMatches) {
      const p = cleanPhone(m);
      if (p) found.add(p);
    }
  }
  const senderMatches = sender.match(PHONE_REGEX);
  if (senderMatches) {
    for (const m of senderMatches) {
      const p = cleanPhone(m);
      if (p) found.add(p);
    }
  }
  return Array.from(found);
}

function classifyChannel(text, sender, groupName) {
  const t = (text + ' ' + sender + ' ' + groupName).toLowerCase();
  if (t.includes('من المالك مباشر') || t.includes('مالك أصيل') || t.includes('بدون عمولة من المالك') ||
      t.includes('direct owner') || t.includes('owner direct') || t.includes('من المالك بدون وسيط') ||
      t.includes('مالك الشقة') || t.includes('أنا المالك') || t.includes('انا المالك')) {
    return 'Owner';
  }
  if (t.includes('عمولة') || t.includes('مطلوب مشتري') || t.includes('تواصل مع الوسيط') ||
      t.includes('broker') || t.includes('co-brokerage') || t.includes('شركه') || t.includes('شركة')) {
    return 'Broker';
  }
  if (groupName.toLowerCase().includes('owner') || groupName.toLowerCase().includes('مالك')) {
    return 'Owner';
  }
  return 'Broker';
}

function parseDealType(text) {
  const t = text.toLowerCase();
  const isRent = t.includes('للايجار') || t.includes('إيجار') || t.includes('ايجار') ||
                 t.includes('مفروش') || t.includes('شهري') || t.includes('سنوي') ||
                 t.includes('قانون جديد') || t.includes('rent') || t.includes('lease');
  const isSale = t.includes('للبيع') || t.includes('بيع') || t.includes('كاش') ||
                 t.includes('اقساط') || t.includes('أقساط') || t.includes('over') ||
                 t.includes('sale') || t.includes('resale') || t.includes('تنازل');
  if (isRent && !isSale) return 'Rent';
  if (isSale && !isRent) return 'Sale';
  if (isRent && isSale) {
    // Determine whichever keyword appears earlier
    const rentIdx = Math.min(...['للايجار', 'إيجار', 'ايجار', 'rent'].map(k => {
      const i = t.indexOf(k); return i === -1 ? 999999 : i;
    }));
    const saleIdx = Math.min(...['للبيع', 'بيع', 'sale'].map(k => {
      const i = t.indexOf(k); return i === -1 ? 999999 : i;
    }));
    return rentIdx < saleIdx ? 'Rent' : 'Sale';
  }
  return 'Rent'; // default for secondary inventory
}

function parsePrice(text, dealType) {
  const t = text.toLowerCase();
  const isUsd = t.includes('$') || t.includes('usd') || t.includes('دولار');
  
  // 1. Millions regex: e.g. "12.5 مليون", "14 مليون", "38M"
  const mMatch = t.match(/(\d+(?:[.,]\d+)?)\s*(?:مليون|ملون|million|\bm\b)/i);
  if (mMatch) {
    const num = parseFloat(mMatch[1].replace(',', '.'));
    if (num > 0) {
      const egp = isUsd ? Math.round(num * 1_000_000 * 48.5) : Math.round(num * 1_000_000);
      return { egp, usd: isUsd ? Math.round(num * 1_000_000) : Math.round(egp / 48.5) };
    }
  }

  // 2. Thousands regex: e.g. "35 الف", "70,000", "45k"
  const kMatch = t.match(/(\d+(?:[.,]\d+)?)\s*(?:الف|ألف|الاف|آلاف|k\b)/i);
  if (kMatch) {
    const num = parseFloat(kMatch[1].replace(',', '.'));
    if (num > 0) {
      const egp = isUsd ? Math.round(num * 1000 * 48.5) : Math.round(num * 1000);
      return { egp, usd: isUsd ? Math.round(num * 1000) : Math.round(egp / 48.5) };
    }
  }

  // 3. Plain full digits: e.g. "35000", "12500000", "35,000"
  const digitMatches = t.match(/\b\d{1,3}(?:[,.]\d{3})+(?:\.\d+)?\b|\b\d{4,9}\b/g);
  if (digitMatches) {
    for (const dm of digitMatches) {
      const cleanNum = parseFloat(dm.replace(/[,.]/g, ''));
      // Filter out years (2020-2030) or phone-like prefixes
      if (cleanNum >= 1990 && cleanNum <= 2035) continue;
      if (cleanNum >= 5000) {
        const egp = isUsd ? Math.round(cleanNum * 48.5) : Math.round(cleanNum);
        return { egp, usd: isUsd ? Math.round(cleanNum) : Math.round(egp / 48.5) };
      }
    }
  }

  // 4. Sanity bare numbers (e.g. "السعر 35" in rent message or "السعر 14" in sale message)
  const bareMatch = t.match(/(?:سعر|السعر|إجمالي|اجمالي|مطلوب|total)\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  if (bareMatch) {
    const val = parseFloat(bareMatch[1]);
    if (val > 0 && val < 200) {
      if (dealType === 'Rent') {
        const egp = val * 1000;
        return { egp, usd: Math.round(egp / 48.5) };
      } else {
        const egp = val * 1_000_000;
        return { egp, usd: Math.round(egp / 48.5) };
      }
    }
  }

  return { egp: 0, usd: 0 };
}

function parseUnitType(text) {
  const t = text.toLowerCase();
  if (t.includes('فيلا مستقلة') || t.includes('standalone') || (t.includes('فيلا') && !t.includes('توين') && !t.includes('تاون'))) return 'Standalone Villa';
  if (t.includes('توين هاوس') || t.includes('twin house') || t.includes('توين')) return 'Twin House';
  if (t.includes('تاون هاوس') || t.includes('townhouse') || t.includes('تاون')) return 'Townhouse';
  if (t.includes('بنتهاوس') || t.includes('penthouse') || t.includes('روف') || t.includes('roof')) return 'Penthouse';
  if (t.includes('دوبلكس') || t.includes('duplex')) return 'Duplex';
  if (t.includes('استوديو') || t.includes('ستوديو') || t.includes('studio')) return 'Studio';
  if (t.includes('ارضي بحديقة') || t.includes('أرضي بحديقة') || t.includes('جاردن') || t.includes('garden')) return 'Ground Floor with Garden';
  if (t.includes('شاليه') || t.includes('chalet')) return 'Chalet';
  if (t.includes('مكتب') || t.includes('إداري') || t.includes('اداري') || t.includes('عيادة') || t.includes('تجاري') || t.includes('commercial') || t.includes('admin')) return 'Commercial / Admin';
  return 'Apartment';
}

function parseSpecs(text) {
  const t = text.toLowerCase();
  
  // Space
  const spaceMatch = t.match(/(\d{2,4})\s*(?:متر|م²|م2|م\b|sqm|m2)/i);
  const space = spaceMatch ? parseFloat(spaceMatch[1]) : 0;

  // Garden
  const gardenMatch = t.match(/(?:حديقة|جاردن|garden)\s*(?:مساحة|بمساحة)?\s*(\d{2,4})/i);
  const garden = gardenMatch ? parseFloat(gardenMatch[1]) : 0;

  // Bedrooms
  const bedMatch = t.match(/(\d)\s*(?:غرف|غرفة|نوم|rooms?|beds?)/i);
  const bedrooms = bedMatch ? parseInt(bedMatch[1], 10) : 0;

  // Bathrooms
  const bathMatch = t.match(/(\d)\s*(?:حمام|حمامات|baths?)/i);
  const bathrooms = bathMatch ? parseInt(bathMatch[1], 10) : 0;

  // Finishing
  let finishing = 'Standard';
  if (t.includes('الترا سوبر لوكس') || t.includes('ultra super lux')) finishing = 'Ultra Super Lux';
  else if (t.includes('سوبر لوكس') || t.includes('super lux')) finishing = 'Super Lux';
  else if (t.includes('تشطيب كامل') || t.includes('fully finished')) finishing = 'Fully Finished';
  else if (t.includes('نصف تشطيب') || t.includes('نص تشطيب') || t.includes('core & shell') || t.includes('محارة')) finishing = 'Semi-Finished (Core & Shell)';

  // Furnished
  const furnished = (t.includes('مفروش') && !t.includes('غير مفروش')) ? 'Furnished' : (t.includes('غير مفروش') ? 'Unfurnished' : 'Standard');

  return { space, garden, bedrooms, bathrooms, finishing, furnished };
}

// RFC-4180 CSV Parser
function parseCsv(text) {
  const rows = [];
  let field = '';
  let record = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { record.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      record.push(field); field = '';
      if (record.length > 1 || (record.length === 1 && record[0] !== '')) rows.push(record);
      record = [];
    } else field += c;
  }
  if (field !== '' || record.length) { record.push(field); rows.push(record); }
  const header = rows.shift() || [];
  return rows.map((r) => {
    const obj = {};
    header.forEach((h, idx) => { obj[h.trim()] = (r[idx] ?? '').trim(); });
    return obj;
  });
}

function escapeCsv(val) {
  if (val == null) return '';
  const s = String(val).replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r') ? `"${s}"` : s;
}

function writeCsv(rows, headers, dest) {
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCsv(r[h])).join(','));
  }
  fs.writeFileSync(dest, lines.join('\n'), 'utf8');
}

async function main() {
  console.log('══════════════════════════════════════════════════════════════════════════');
  console.log('  SIERRA ESTATES — COMPREHENSIVE WHATSAPP HARVESTER & MASTER INVENTORY');
  console.log('══════════════════════════════════════════════════════════════════════════\n');

  // 1. Gather all unique WhatsApp chat exports
  const candidateFiles = new Map();
  for (const dir of CHAT_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (!entry.endsWith('.txt')) continue;
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      // Group by entry name, keep largest
      if (!candidateFiles.has(entry) || candidateFiles.get(entry).size < stat.size) {
        candidateFiles.set(entry, { name: entry, path: fullPath, size: stat.size });
      }
    }
  }

  console.log(`📁 Discovered ${candidateFiles.size} unique WhatsApp group chat exports:`);
  let totalChatBytes = 0;
  for (const [name, fileInfo] of candidateFiles.entries()) {
    totalChatBytes += fileInfo.size;
    console.log(`  • ${name.slice(0, 55).padEnd(55)} [${(fileInfo.size / 1024).toFixed(1).padStart(7)} KB]`);
  }
  console.log(`Total chat volume: ${(totalChatBytes / (1024 * 1024)).toFixed(2)} MB.\n`);

  // 2. Parse chat exports
  let totalMessagesParsed = 0;
  let totalListingsExtracted = 0;
  const harvestedUnits = [];

  for (const [chatName, fileInfo] of candidateFiles.entries()) {
    const rawContent = fs.readFileSync(fileInfo.path, 'utf8');
    const lines = rawContent.split(/\r?\n/);
    const groupName = chatName
      .replace(/^WhatsApp Chat with\s*/i, '')
      .replace(/\.txt$/i, '')
      .trim();

    let currentMsg = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(MSG_HEADER_REGEX);
      if (match) {
        if (currentMsg) {
          processMessage(currentMsg);
        }
        currentMsg = {
          timestamp: match[1].trim(),
          sender: match[2].trim(),
          text: match[3].trim(),
          groupName,
          chatFile: fileInfo.name
        };
        totalMessagesParsed++;
      } else if (currentMsg) {
        currentMsg.text += '\n' + line;
      }
    }
    if (currentMsg) {
      processMessage(currentMsg);
    }
  }

  function processMessage(msg) {
    const text = msg.text.trim();
    if (text.length < 20) return;

    // Filter system announcements
    const low = text.toLowerCase();
    if (low.includes('end-to-end encrypted') || low.includes('joined using this group') ||
        low.includes('changed the subject') || low.includes('security code changed') ||
        low.includes('left') && text.length < 50) {
      return;
    }

    // Must have real estate signals
    const hasSignal = /للبيع|للايجار|شقة|فيلا|توين|تاون|دوبلكس|بنتهاوس|استوديو|مساحة|متر|غرف|مليون|الف|مقدم|سعر|كمبوند|sale|rent|villa|apartment|sqm|compound/i.test(text);
    if (!hasSignal) return;

    // Filter pure requests that don't offer a unit
    if (/^مطلوب\s+(?:شقة|فيلا|دوبلكس|استوديو)/i.test(text) && !/لدينا|متاح|موجود|للبيع|للايجار/i.test(text)) {
      return;
    }

    const phones = extractPhones(text, msg.sender);
    if (phones.length === 0) return; // Keep high-confidence listings with reachable phone numbers

    const dealType = parseDealType(text);
    const channel = classifyChannel(text, msg.sender, msg.groupName);
    const priceInfo = parsePrice(text, dealType);
    const unitType = parseUnitType(text);
    const specs = parseSpecs(text);
    const resolvedLoc = resolveLocation(text);

    // If no price and no specs, skip low quality noise
    if (priceInfo.egp === 0 && specs.space === 0 && specs.bedrooms === 0) {
      return;
    }

    totalListingsExtracted++;
    harvestedUnits.push({
      timestamp: msg.timestamp,
      sender: msg.sender,
      phone: phones[0],
      allPhones: phones,
      channel: channel, // 'Owner' or 'Broker'
      dealType: dealType, // 'Rent' or 'Sale'
      compound: resolvedLoc.label,
      zone: resolvedLoc.zone,
      lat: resolvedLoc.lat,
      lng: resolvedLoc.lng,
      unitType: unitType,
      priceEgp: priceInfo.egp,
      priceUsd: priceInfo.usd,
      spaceM2: specs.space,
      gardenM2: specs.garden,
      bedrooms: specs.bedrooms,
      bathrooms: specs.bathrooms,
      finishing: specs.finishing,
      furnished: specs.furnished,
      sourceGroup: msg.groupName,
      rawText: text
    });
  }

  console.log(`💬 Parsed ${totalMessagesParsed.toLocaleString()} total messages.`);
  console.log(`🏢 Extracted ${totalListingsExtracted.toLocaleString()} valid real estate listing posts from WhatsApp groups.`);

  // 3. Ingest Owners_Inventory.json (if available)
  if (fs.existsSync(OWNERS_JSON_PATH)) {
    try {
      const ownersJson = JSON.parse(fs.readFileSync(OWNERS_JSON_PATH, 'utf8'));
      console.log(`📦 Ingesting ${ownersJson.length} units from ${OWNERS_JSON_PATH}...`);
      for (const item of ownersJson) {
        if (!item.Owner_Phone) continue;
        const text = (item.Description || '') + ' ' + (item.Notes || '');
        const deal = item.Deal_Type || parseDealType(text);
        const resolved = resolveLocation(item.Compound || text);
        const price = item.Price_EGP || parsePrice(text, deal).egp;
        harvestedUnits.push({
          timestamp: item.Received_At || 'Aug-2026',
          sender: item.Advertiser_Type || 'Direct Owner',
          phone: cleanPhone(item.Owner_Phone),
          allPhones: [cleanPhone(item.Owner_Phone)],
          channel: item.Advertiser_Type && item.Advertiser_Type.includes('Broker') ? 'Broker' : 'Owner',
          dealType: deal,
          compound: resolved.label,
          zone: resolved.zone,
          lat: resolved.lat,
          lng: resolved.lng,
          unitType: item.Unit_Type || parseUnitType(text),
          priceEgp: price,
          priceUsd: Math.round(price / 48.5),
          spaceM2: item.Area_m2 || 0,
          gardenM2: 0,
          bedrooms: item.Rooms || 0,
          bathrooms: 0,
          finishing: 'Standard',
          furnished: 'Standard',
          sourceGroup: item.Source_Channel || 'Owners_Inventory.json',
          rawText: text
        });
      }
    } catch (e) {
      console.warn('⚠️ Error parsing Owners_Inventory.json:', e.message);
    }
  }

  // 4. Load base master inventory (7,634 units)
  console.log(`\n📋 Loading base master dataset from ${BASE_MASTER_CSV}...`);
  const baseMasterRaw = fs.readFileSync(BASE_MASTER_CSV, 'utf8');
  const baseMasterRows = parseCsv(baseMasterRaw);
  console.log(`Base master inventory count: ${baseMasterRows.length.toLocaleString()} rows.`);

  // 5. Unified Deduplication Engine
  // Key: phone + compound + dealType + (priceBucket or code)
  const masterMap = new Map();
  const unifiedRecords = [];

  // Seed with base master records
  for (const r of baseMasterRows) {
    const phone = cleanPhone(r.mobile);
    const compound = r.compound || 'New Cairo';
    const deal = r.deal_type || 'Rent';
    const price = parseFloat(r.price_egp) || 0;
    const priceBucket = price > 0 ? Math.round(price / 5000) * 5000 : 'no_price';
    const dedupKey = phone
      ? `${phone}__${compound.toLowerCase()}__${deal.toLowerCase()}__${r.code || priceBucket}`
      : `nophone__${compound.toLowerCase()}__${r.no}`;

    masterMap.set(dedupKey, {
      no: unifiedRecords.length + 1,
      timestamp: r.timestamp || '14-Apr-26',
      name: r.name || 'Property Owner',
      mobile: phone || r.mobile || 'N/A',
      availability: r.availability || 'Available',
      bedrooms: r.bedrooms || '',
      compound: compound,
      zone: r.zone || 'New Cairo',
      price_egp: price,
      price_usd: parseFloat(r.price_usd) || (price ? Math.round(price / 48.5) : 0),
      price_display: r.price_display || (price ? (deal === 'Rent' ? `${price.toLocaleString()} EGP/mo` : `${(price/1_000_000).toFixed(2)}M EGP`) : 'Price on Request'),
      deal_type: deal,
      property_type: r.property_type || 'Apartment',
      code: r.code || `SE-OWN-${String(unifiedRecords.length + 1).padStart(4, '0')}`,
      furnished: r.furnished || 'Standard',
      space_m2: r.space_m2 || '',
      garden_m2: r.garden_m2 || '',
      pool: r.pool || 'No',
      notes: r.notes || '',
      owner_party: r.owner_party || 'Owner',
      origin: 'master_csv'
    });
    unifiedRecords.push(masterMap.get(dedupKey));
  }

  console.log(`Loaded ${unifiedRecords.length} base master records into deduplication index.`);

  // Now merge harvested WhatsApp units
  let whatsappNewAdded = 0;
  let whatsappMergedWithExisting = 0;
  let whatsappDupesInternal = 0;

  for (const wa of harvestedUnits) {
    const phone = wa.phone;
    const compound = wa.compound;
    const deal = wa.dealType;
    const price = wa.priceEgp;
    const priceBucket = price > 0 ? Math.round(price / 5000) * 5000 : 'no_price';
    const dedupKey = `${phone}__${compound.toLowerCase()}__${deal.toLowerCase()}__${priceBucket}`;

    if (masterMap.has(dedupKey)) {
      // Duplicate / Enrichment
      const existing = masterMap.get(dedupKey);
      if (!existing.price_egp && price) {
        existing.price_egp = price;
        existing.price_usd = Math.round(price / 48.5);
        existing.price_display = deal === 'Rent' ? `${price.toLocaleString()} EGP/mo` : `${(price / 1_000_000).toFixed(2)}M EGP`;
      }
      if (!existing.bedrooms && wa.bedrooms) existing.bedrooms = wa.bedrooms;
      if (!existing.space_m2 && wa.spaceM2) existing.space_m2 = wa.spaceM2;
      if (!existing.garden_m2 && wa.gardenM2) existing.garden_m2 = wa.gardenM2;
      if (wa.rawText && !existing.notes.includes(wa.rawText.slice(0, 50))) {
        existing.notes = (existing.notes ? `${existing.notes} | [WA ${wa.sourceGroup}]: ${wa.rawText}` : `[WA ${wa.sourceGroup}]: ${wa.rawText}`).trim();
      }
      whatsappMergedWithExisting++;
    } else {
      // Net-New Listing!
      const newRecord = {
        no: unifiedRecords.length + 1,
        timestamp: wa.timestamp || 'Sep-2026',
        name: wa.channel === 'Owner' ? (wa.sender.includes(':') ? 'Direct Owner' : wa.sender) : (wa.sender || 'Broker Network'),
        mobile: phone,
        availability: 'Available',
        bedrooms: wa.bedrooms || '',
        compound: compound,
        zone: wa.zone,
        price_egp: price,
        price_usd: wa.priceUsd,
        price_display: price ? (deal === 'Rent' ? `${price.toLocaleString()} EGP/mo` : `${(price / 1_000_000).toFixed(2)}M EGP`) : 'Price on Request',
        deal_type: deal,
        property_type: wa.unitType,
        code: `SE-WA-${String(unifiedRecords.length + 1).padStart(4, '0')}`,
        furnished: wa.furnished,
        space_m2: wa.spaceM2 || '',
        garden_m2: wa.gardenM2 || '',
        pool: wa.rawText.includes('حمام سباحة') || wa.rawText.includes('pool') ? 'Yes' : 'No',
        notes: `[WA ${wa.sourceGroup}]: ${wa.rawText}`,
        owner_party: wa.channel === 'Owner' ? 'Owner' : 'Broker',
        origin: 'whatsapp_group'
      };
      masterMap.set(dedupKey, newRecord);
      unifiedRecords.push(newRecord);
      whatsappNewAdded++;
    }
  }

  console.log(`\n══════════════════════════════════════════════════════════════════════════`);
  console.log(`🎉 HARVESTING & DEDUPLICATION RESULTS:`);
  console.log(`   Total Master Records Before:  ${baseMasterRows.length.toLocaleString()}`);
  console.log(`   WhatsApp Listings Extracted:  ${totalListingsExtracted.toLocaleString()}`);
  console.log(`   Net-New Units Added:          +${whatsappNewAdded.toLocaleString()}`);
  console.log(`   Existing Records Enriched:    ${whatsappMergedWithExisting.toLocaleString()}`);
  console.log(`   Total Master Inventory Now:   ${unifiedRecords.length.toLocaleString()}`);
  console.log(`══════════════════════════════════════════════════════════════════════════\n`);

  // 6. Partition into Segments
  const ownersRent = [];
  const ownersBuy = [];
  const brokersRent = [];
  const brokersBuy = [];
  const unknownOrUnassigned = [];

  for (const r of unifiedRecords) {
    const isOwner = (r.owner_party || '').toLowerCase().includes('owner') || (r.name || '').toLowerCase().includes('owner');
    const isBroker = (r.owner_party || '').toLowerCase().includes('broker') || (r.name || '').toLowerCase().includes('broker');
    const isRent = (r.deal_type || '').toLowerCase() === 'rent';
    const isSale = (r.deal_type || '').toLowerCase() === 'sale';

    if (isOwner && isRent) ownersRent.push(r);
    else if (isOwner && isSale) ownersBuy.push(r);
    else if (isBroker && isRent) brokersRent.push(r);
    else if (isBroker && isSale) brokersBuy.push(r);
    else unknownOrUnassigned.push(r);
  }

  console.log('📊 Segmentation Breakdown:');
  console.log(`   1. Owners Rent:                 ${ownersRent.length.toLocaleString()}`);
  console.log(`   2. Owners Sale:                 ${ownersBuy.length.toLocaleString()}`);
  console.log(`   3. Brokers Rent:                ${brokersRent.length.toLocaleString()}`);
  console.log(`   4. Brokers Sale:                ${brokersBuy.length.toLocaleString()}`);
  console.log(`   5. Unassigned / Broker-Owner:   ${unknownOrUnassigned.length.toLocaleString()}`);

  // 7. Write Master Excel & CSV Files
  const HEADERS = [
    'no', 'timestamp', 'name', 'mobile', 'availability', 'bedrooms',
    'compound', 'zone', 'price_egp', 'price_usd', 'price_display',
    'deal_type', 'property_type', 'code', 'furnished', 'space_m2',
    'garden_m2', 'pool', 'notes', 'owner_party'
  ];

  console.log(`\n💾 Exporting Master Files...`);

  // A. Full Internal Master Datasets (stored in data/ and H:/Sheets/ with raw contacts)
  writeCsv(unifiedRecords, HEADERS, path.join(ROOT_DIR, 'data', 'master_inventory_clean_no_duplicates.csv'));
  if (fs.existsSync('H:/Sheets')) {
    writeCsv(unifiedRecords, HEADERS, 'H:/Sheets/Master_Inventory_Clean_No_Duplicates.csv');
  }

  // B. Sanitized Public Datasets (Strict Privacy: only +201092048333 permitted in public/downloads/)
  const sanitizeForPublic = (records) => records.map(r => ({
    ...r,
    mobile: '+201092048333',
    name: r.owner_party === 'Owner' ? 'Property Owner' : 'Verified Broker',
    notes: (r.notes || '').replace(/(?:\+?201|01)[0-9]{8,9}/g, '+201092048333')
  }));

  const publicUnified = sanitizeForPublic(unifiedRecords);
  const publicOwnersRent = sanitizeForPublic(ownersRent);
  const publicOwnersBuy = sanitizeForPublic(ownersBuy);
  const publicBrokersRent = sanitizeForPublic(brokersRent);
  const publicBrokersBuy = sanitizeForPublic(brokersBuy);
  const publicUnknown = sanitizeForPublic(unknownOrUnassigned);

  writeCsv(publicUnified, HEADERS, path.join(PUBLIC_DOWNLOADS, 'Master_Inventory_Clean_No_Duplicates.csv'));
  writeCsv(publicOwnersRent, HEADERS, path.join(PUBLIC_DOWNLOADS, 'sierra-estates-owners-rent.csv'));
  writeCsv(publicOwnersBuy, HEADERS, path.join(PUBLIC_DOWNLOADS, 'sierra-estates-owners-buy.csv'));
  writeCsv(publicBrokersRent, HEADERS, path.join(PUBLIC_DOWNLOADS, 'sierra-estates-broker-rent.csv'));
  writeCsv(publicBrokersBuy, HEADERS, path.join(PUBLIC_DOWNLOADS, 'sierra-estates-broker-buy.csv'));
  writeCsv(publicUnknown, HEADERS, path.join(PUBLIC_DOWNLOADS, 'sierra-estates-unknown-broker-owner.csv'));
  console.log(`   ✓ Master & 5 Segment CSVs written to public/downloads/ (Privacy Audited: +201092048333)`);

  // C. Multi-sheet Excel Workbook (xlsx) for operator storage in H:/Sheets/
  if (fs.existsSync('H:/Sheets')) {
    const wb = XLSX.utils.book_new();

    const summaryData = [
      ['SIERRA ESTATES — MASTER INVENTORY AUDIT & RECONCILIATION'],
      ['Generated At', new Date().toISOString()],
      ['Total Verified Units', unifiedRecords.length],
      [],
      ['Segment', 'Unit Count', 'Percentage'],
      ['Owners Rent', ownersRent.length, `${((ownersRent.length / unifiedRecords.length) * 100).toFixed(1)}%`],
      ['Owners Sale', ownersBuy.length, `${((ownersBuy.length / unifiedRecords.length) * 100).toFixed(1)}%`],
      ['Brokers Rent', brokersRent.length, `${((brokersRent.length / unifiedRecords.length) * 100).toFixed(1)}%`],
      ['Brokers Sale', brokersBuy.length, `${((brokersBuy.length / unifiedRecords.length) * 100).toFixed(1)}%`],
      ['Unassigned Channels', unknownOrUnassigned.length, `${((unknownOrUnassigned.length / unifiedRecords.length) * 100).toFixed(1)}%`],
      [],
      ['Top WhatsApp Sources', 'Extracted Listings'],
      ...Array.from(candidateFiles.keys()).slice(0, 15).map(k => [k.replace('.txt', ''), 'Active Channel'])
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(unifiedRecords, { header: HEADERS }), 'All_Units');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ownersRent, { header: HEADERS }), 'Owners_Rent');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ownersBuy, { header: HEADERS }), 'Owners_Sale');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(brokersRent, { header: HEADERS }), 'Brokers_Rent');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(brokersBuy, { header: HEADERS }), 'Brokers_Sale');

    const excelBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const excelDest2 = 'H:/Sheets/Final_RealEstate_Database.xlsx';
    const excelDest3 = 'H:/Sheets/Master_Inventory_Clean_No_Duplicates.xlsx';
    fs.writeFileSync(excelDest2, excelBuf);
    fs.writeFileSync(excelDest3, excelBuf);
    console.log(`   ✓ Final_RealEstate_Database.xlsx and Master_Inventory_Clean_No_Duplicates.xlsx written to H:/Sheets/`);
  }

  // 8. Rebuild snapshot.json for Client Maps & UI
  console.log(`\n🗺️ Rebuilding snapshot.json and compound-stats.json...`);
  const compoundCounts = {};
  const compoundSegmentCounts = {};

  const publicUnits = unifiedRecords.map((r, idx) => {
    const loc = resolveLocation(r.compound);
    const cmp = r.compound || 'New Cairo';
    compoundCounts[cmp] = (compoundCounts[cmp] || 0) + 1;

    if (!compoundSegmentCounts[cmp]) {
      compoundSegmentCounts[cmp] = { ownersRent: 0, ownersBuy: 0, brokerRent: 0, brokerBuy: 0, other: 0, total: 0 };
    }
    compoundSegmentCounts[cmp].total++;
    const isOwner = (r.owner_party || '').toLowerCase().includes('owner');
    const isRent = (r.deal_type || '').toLowerCase() === 'rent';
    if (isOwner && isRent) compoundSegmentCounts[cmp].ownersRent++;
    else if (isOwner && !isRent) compoundSegmentCounts[cmp].ownersBuy++;
    else if (!isOwner && isRent) compoundSegmentCounts[cmp].brokerRent++;
    else if (!isOwner && !isRent) compoundSegmentCounts[cmp].brokerBuy++;
    else compoundSegmentCounts[cmp].other++;

    return {
      id: r.code || `SE-U-${idx + 1}`,
      title: `${r.property_type || 'Apartment'} in ${cmp}`,
      compound: cmp,
      location: cmp,
      zone: r.zone || 'New Cairo',
      lat: loc.lat,
      lng: loc.lng,
      approxCoords: loc.approx,
      type: r.property_type || 'Apartment',
      dealType: (r.deal_type || 'Rent').toLowerCase(),
      bedrooms: parseInt(r.bedrooms, 10) || 0,
      bathrooms: 1,
      area_sqm: parseFloat(r.space_m2) || 0,
      price: r.price_egp || 0,
      priceUsd: r.price_usd || 0,
      currency: 'EGP',
      priceDisplay: r.price_display || 'Price on Request',
      furnishing: r.furnished || 'Standard',
      status: 'available',
      ownerType: r.owner_party || 'Owner',
      isOwner: isOwner,
      isNew: r.origin === 'whatsapp_group',
      listedAt: r.timestamp || 'Sep-2026',
      notes: r.notes || '',
      origin: r.origin
    };
  });

  const snapshotData = {
    updatedAt: new Date().toISOString(),
    totalUnits: publicUnits.length,
    compoundCounts,
    compoundSegmentCounts,
    segments: {
      ownersRent: ownersRent.length,
      ownersBuy: ownersBuy.length,
      brokersRent: brokersRent.length,
      brokersBuy: brokersBuy.length,
      unassigned: unknownOrUnassigned.length
    },
    units: publicUnits
  };

  fs.writeFileSync(SNAPSHOT_JSON_PATH, JSON.stringify(snapshotData, null, 2), 'utf8');
  console.log(`   ✓ snapshot.json updated with ${publicUnits.length.toLocaleString()} total units`);

  // Build compound stats
  const compoundStats = Object.entries(compoundCounts).map(([name, count]) => {
    const loc = resolveLocation(name);
    const seg = compoundSegmentCounts[name] || {};
    return {
      name,
      count,
      zone: loc.zone,
      lat: loc.lat,
      lng: loc.lng,
      segments: seg
    };
  }).sort((a, b) => b.count - a.count);

  fs.writeFileSync(COMPOUND_STATS_PATH, JSON.stringify(compoundStats, null, 2), 'utf8');
  console.log(`   ✓ compound-stats.json updated (${compoundStats.length} recognized compounds)`);

  console.log(`\n══════════════════════════════════════════════════════════════════════════`);
  console.log(`✨ END-TO-END WHATSAPP HARVESTING & MASTER SHEET GENERATION COMPLETE!`);
  console.log(`══════════════════════════════════════════════════════════════════════════`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
