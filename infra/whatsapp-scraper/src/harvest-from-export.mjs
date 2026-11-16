/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Sierra Estates — WhatsApp Chat Export Harvester
 *  ─────────────────────────────────────────────────────────────────────────
 *  Parses WhatsApp exported chat .txt files and extracts owner listings.
 *  Run: node src/harvest-from-export.mjs <path-to-chat-export.txt> [group-name]
 *
 *  HOW TO EXPORT FROM WHATSAPP (on phone):
 *  1. Open the group → ⋮ Menu → More → Export chat → Without media
 *  2. Save the .txt file and put it in H:\Sheets\exports\
 *  3. Run: node src/harvest-from-export.mjs "H:\Sheets\exports\chat.txt" "Owners August 2026"
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = process.env.OUTPUT_DIR || 'H:\\Sheets';
const INVENTORY_FILE = path.join(OUTPUT_DIR, 'Owners_Inventory.json');
const REPORT_FILE = path.join(OUTPUT_DIR, 'harvest_report.json');

// Live-harvester JSON — contains photo metadata keyed by Owner_Phone
const LIVE_OWNERS_JSON = path.join(OUTPUT_DIR, 'Owners_Inventory.json');
// Media directory where the harvester saves downloaded photos
const MEDIA_DIR = path.join(OUTPUT_DIR, 'Owners_Media');
// Public CDN base — photos served via Next.js public folder or a CDN prefix
const PHOTO_CDN_BASE = process.env.PHOTO_CDN_BASE || 'https://sierra-estates.net/media/owners';

// ─── Config ────────────────────────────────────────────────────────────────
const PRICE_RULES = {
  rent: { min: 7_000, max: 300_000 },
  resale: { min: 1_000_000, max: 999_000_000 },
};

const COMPOUNDS_MAP = {
  'Madinaty':       [/مدينت[يى]/i, /madinat/i],
  'Al Rehab':       [/الرحاب/i, /rehab/i],
  'Mivida':         [/ميفيدا/i, /mivida/i],
  'Hyde Park':      [/هايد\s*بارك/i, /hyde\s*park/i],
  'Mountain View':  [/ماونتن\s*فيو/i, /mountain\s*view/i],
  'Villette':       [/فيليت/i, /villette/i],
  'Palm Hills':     [/بالم\s*هيلز/i, /palm\s*hills/i],
  'Eastown':        [/ايست\s*تاون/i, /eastown/i],
  'Swan Lake':      [/سوان\s*ليك/i, /swan\s*lake/i],
  'Katameya Dunes': [/ديونز/i, /dunes/i],
  'Beit El Watan':  [/بيت\s*الوطن/i, /beit\s*el\s*watan/i],
  'El Shorouk':     [/الشروق/i, /shorouk/i],
  'Cairo Festival': [/فستيفال/i, /\bcfc\b/i],
  'Fifth Square':   [/فيفت\s*سكوير/i, /fifth\s*square/i],
  'Sodic':          [/سوديك/i, /sodic/i],
  'New Cairo':      [/التجمع/i, /new\s*cairo/i],
  'Sheikh Zayed':   [/الشيخ\s*زايد/i, /zayed/i],
  'North Coast':    [/الساحل\s*الشمالي/i, /north\s*coast/i],
  'August':         [/أوجست|اوجست/i, /august/i],
  'Cairo Plaza':    [/كايرو\s*بلازا/i, /cairo\s*plaza/i],
  'Taj City':       [/تاج\s*سيتي/i, /taj\s*city/i],
  'Sarai':          [/سراي/i, /\bsarai\b/i],
  'Midtown':        [/ميدتاون/i, /midtown/i],
  'Andalusia':      [/الاندلس/i, /andalusia/i],
};

const UNIT_TYPES = {
  'Apartment':  [/شقة|شقه|apartment|apt/i],
  'Villa':      [/فيلا|villa/i],
  'Duplex':     [/دوبلكس|duplex/i],
  'Penthouse':  [/بنتهاوس|penthouse/i],
  'Studio':     [/استوديو|studio/i],
  'Chalet':     [/شاليه|chalet/i],
  'Twin House': [/تون\s*هاوس|twin/i],
  'Town House': [/تاون\s*هاوس|townhouse/i],
  'Office':     [/مكتب|office/i],
};

// ─── Parsers ────────────────────────────────────────────────────────────────

function normalizePhone(v) {
  if (!v) return null;
  const d = String(v).replace(/\D/g, '');
  if (!d) return null;
  let p = d;
  if (p.startsWith('20') && p.length >= 12) p = p.slice(2);
  if (p.length === 10 && p.startsWith('1')) p = '0' + p;
  return p.length === 11 && p.startsWith('01') ? p : (d.length >= 8 ? d : null);
}

function extractCompound(text) {
  for (const [name, regexes] of Object.entries(COMPOUNDS_MAP)) {
    if (regexes.some(r => r.test(text))) return name;
  }
  return null;
}

function extractUnitType(text) {
  for (const [type, regexes] of Object.entries(UNIT_TYPES)) {
    if (regexes.some(r => r.test(text))) return type;
  }
  return 'Apartment';
}

function extractPrice(text) {
  // Match patterns like: 15,000 / 1,500,000 / 1.5M / 15k
  const patterns = [
    /(\d[\d,\.]+)\s*(?:مليون|million|M)\b/i,
    /(\d[\d,\.]+)\s*(?:الف|ألف|k)\b/i,
    /(?:سعر|price|rent|إيجار|بيع|sale)[:\s]*(\d[\d,\.]+)/i,
    /(\d{4,})/,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      let val = parseFloat(m[1].replace(/,/g, ''));
      const lower = text.toLowerCase();
      if (/مليون|million|\bm\b/i.test(m[0])) val *= 1_000_000;
      if (/الف|ألف|\bk\b/i.test(m[0])) val *= 1_000;
      if (val >= 100) return Math.round(val);
    }
  }
  return null;
}

function extractArea(text) {
  const m = text.match(/(\d+)\s*(?:م²|m²|sqm|متر|meter)/i);
  return m ? parseInt(m[1]) : null;
}

function extractBedrooms(text) {
  const m = text.match(/(\d+)\s*(?:غرف|غرفة|bed|bedroom|br)/i);
  return m ? parseInt(m[1]) : null;
}

function extractPhone(text) {
  const m = text.match(/(?:01[0-9]{9}|\+?20\d{10}|\b\d{10,13}\b)/);
  return m ? normalizePhone(m[0]) : null;
}

function detectDealType(text) {
  const lower = text;
  if (/\b(rent|إيجار|ايجار|للإيجار|للايجار)\b/i.test(lower)) return 'rent';
  if (/\b(sale|بيع|للبيع|resale|re-sale)\b/i.test(lower)) return 'resale';
  return 'rent'; // default for owners group
}

function calibratePrice(price, dealType) {
  if (!price) return { price: null, status: 'missing_price' };
  if (dealType === 'rent') {
    if (price < PRICE_RULES.rent.min || price > PRICE_RULES.rent.max) {
      return { price, status: 'price_out_of_range', flagged: true };
    }
  } else {
    if (price < PRICE_RULES.resale.min) {
      return { price, status: 'price_out_of_range', flagged: true };
    }
  }
  return { price, status: 'ok' };
}

// ─── WhatsApp Export Parser ──────────────────────────────────────────────────

function parseExportFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Detect format: [DD/MM/YYYY, HH:MM:SS] Name: msg  OR  DD/MM/YYYY, HH:MM - Name: msg
  const MSG_REGEX_1 = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]\s*([^:]+):\s*(.+)/;
  const MSG_REGEX_2 = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)\s*-\s*([^:]+):\s*(.+)/;

  const messages = [];
  let current = null;

  for (const line of lines) {
    const m1 = line.match(MSG_REGEX_1);
    const m2 = line.match(MSG_REGEX_2);
    const m = m1 || m2;

    if (m) {
      if (current) messages.push(current);
      current = {
        date: m[1],
        time: m[2],
        sender: m[3].trim(),
        text: m[4].trim(),
      };
    } else if (current && line.trim()) {
      current.text += '\n' + line.trim();
    }
  }
  if (current) messages.push(current);
  return messages;
}

// ─── Unit Extractor ──────────────────────────────────────────────────────────

function extractUnit(msg, groupName, idx) {
  const text = msg.text;

  // Skip system messages
  if (/messages? and calls? are end-to-end encrypted/i.test(text)) return null;
  if (/joined using this group/i.test(text)) return null;
  if (/changed the (group|subject)/i.test(text)) return null;
  if (text.length < 20) return null;

  const dealType = detectDealType(text);
  const compound = extractCompound(text);
  const unitType = extractUnitType(text);
  const rawPrice = extractPrice(text);
  const area = extractArea(text);
  const bedrooms = extractBedrooms(text);
  const phone = extractPhone(text) || extractPhone(msg.sender);
  const { price, status, flagged } = calibratePrice(rawPrice, dealType);

  // Only include if has at least price or compound
  if (!price && !compound) return null;

  return {
    id: `export_${idx}_${Date.now()}`,
    source: 'whatsapp_export',
    group: groupName,
    date: msg.date,
    time: msg.time,
    sender: msg.sender,
    rawText: text,
    compound: compound || 'Unknown',
    unitType,
    dealType,
    price,
    priceStatus: status,
    priceFlagged: flagged || false,
    area,
    bedrooms,
    phone,
    // Photo fields — populated later by crossLinkPhotos()
    hasPhotos: false,
    photoUrls: [],
    photoCode: null,
    status: flagged ? 'Needs Revision' : 'Active',
    pfStatus: 'pending',
    createdAt: new Date().toISOString(),
  };
}

// ─── Photo Index Builder ─────────────────────────────────────────────────────

/**
 * Load Owners_Inventory.json (written by owners-harvester.js) and build a
 * Map of normalizedPhone → array of photo records.
 *
 * Each record in Owners_Inventory.json looks like:
 *   { Owner_Phone, Photo_Code, Photo_Path, Has_Photos, Unit_Code, ... }
 *
 * We resolve each Photo_Path to a public URL using two strategies:
 *   1. If the file exists under MEDIA_DIR, we construct the CDN URL.
 *   2. Otherwise we fall back to just the Photo_Code for manual resolution.
 */
function buildPhotoIndex() {
  /** @type {Map<string, Array<{photoCode: string, photoPath: string, publicUrl: string}>>} */
  const index = new Map();

  if (!fs.existsSync(LIVE_OWNERS_JSON)) {
    return index; // harvester hasn't run yet — no photos to cross-link
  }

  let records;
  try {
    records = JSON.parse(fs.readFileSync(LIVE_OWNERS_JSON, 'utf-8'));
  } catch {
    return index;
  }

  for (const r of records) {
    if (!r.Owner_Phone || r.Has_Photos !== 'YES' || !r.Photo_Path) continue;

    const phone = normalizePhone(r.Owner_Phone);
    if (!phone) continue;

    // Build the public URL from the filename only (avoids exposing local paths)
    const fileName = path.basename(r.Photo_Path);
    const publicUrl = `${PHOTO_CDN_BASE}/${encodeURIComponent(fileName)}`;

    const entry = {
      photoCode: r.Photo_Code || r.Unit_Code || '',
      photoPath: r.Photo_Path,
      publicUrl,
    };

    if (!index.has(phone)) index.set(phone, []);
    index.get(phone).push(entry);
  }

  return index;
}

// ─── Inventory Manager ───────────────────────────────────────────────────────

function loadInventory() {
  if (fs.existsSync(INVENTORY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf-8'));
    } catch { return []; }
  }
  return [];
}

function saveInventory(units) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(INVENTORY_FILE, JSON.stringify(units, null, 2), 'utf-8');
}

function dedup(existing, incoming) {
  const key = u => `${u.sender}|${u.price}|${u.dealType}|${u.compound}`;
  const existingKeys = new Set(existing.map(key));
  return incoming.filter(u => !existingKeys.has(key(u)));
}

// ─── Property Finder XML Generator ──────────────────────────────────────────

function generatePFXML(units) {
  const pfUnits = units.filter(u => u.status === 'Active' && u.price);

  const listings = pfUnits.map(u => {
    const offeringType = u.dealType === 'rent' ? 'RR' : 'RS';
    const photoBlock = (u.photoUrls || []).filter(url => url.startsWith('http')).length > 0
      ? `      <photo>\n${(u.photoUrls).filter(url => url.startsWith('http')).map(url => `        <url>${url}</url>`).join('\n')}\n      </photo>`
      : '';

    return `
    <property>
      <reference_number>${u.id}</reference_number>
      <offering_type>${offeringType}</offering_type>
      <property_type>${u.unitType || 'AP'}</property_type>
      <price>${u.price}</price>
      <currency>EGP</currency>
      ${u.dealType === 'rent' ? '<rental_period>M</rental_period>' : ''}
      <size>${u.area || ''}</size>
      <bedroom>${u.bedrooms || ''}</bedroom>
      <city>Cairo</city>
      <community>${u.compound}</community>
      <title_en><![CDATA[${u.unitType || 'Apartment'} for ${u.dealType === 'rent' ? 'rent' : 'sale'} in ${u.compound}]]></title_en>
      <description_en><![CDATA[${u.rawText?.slice(0, 500) || ''}]]></description_en>
      <agent>
        <name>Sierra Estates Team</name>
        <email>info@sierra-estates.net</email>
        <phone>+201000000000</phone>
      </agent>
${photoBlock}
    </property>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<list last_update="${new Date().toISOString()}">
  <source>
    <name>Sierra Estates</name>
    <website>https://sierra-estates.net</website>
  </source>
  ${listings}
</list>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const [,, exportFilePath, groupName = 'Owners Group'] = process.argv;

  if (!exportFilePath) {
    console.error(`
Usage: node src/harvest-from-export.mjs <path-to-chat.txt> [group-name]

HOW TO EXPORT FROM WHATSAPP (on your phone):
  1. Open the WhatsApp group
  2. Tap ⋮ (menu) → More → Export chat → Without media
  3. Share/save the .txt file to H:\\Sheets\\exports\\
  4. Run: node src/harvest-from-export.mjs "H:\\Sheets\\exports\\chat.txt" "Owners August 2026"
    `);
    process.exit(1);
  }

  if (!fs.existsSync(exportFilePath)) {
    console.error(`❌ File not found: ${exportFilePath}`);
    process.exit(1);
  }

  console.log(`\n📂 Parsing: ${exportFilePath}`);
  console.log(`📋 Group: ${groupName}\n`);

  const messages = parseExportFile(exportFilePath);
  console.log(`✅ Total messages found: ${messages.length}`);

  // Build phone → photo index from the live harvester's Owners_Inventory.json
  const photoIndex = buildPhotoIndex();
  const photoIndexSize = photoIndex.size;
  console.log(`📸 Photo index loaded: ${photoIndexSize} phones with photos from Owners_Inventory.json`);

  const extracted = [];
  let skipped = 0;
  for (let i = 0; i < messages.length; i++) {
    const unit = extractUnit(messages[i], groupName, i);
    if (unit) extracted.push(unit);
    else skipped++;
  }

  // Cross-link photos: match each extracted unit's phone to the photo index
  let photosLinked = 0;
  for (const unit of extracted) {
    const phone = unit.phone;
    if (phone && photoIndex.has(phone)) {
      const photos = photoIndex.get(phone);
      unit.photoUrls = photos.map(p => p.publicUrl);
      unit.photoCode = photos[0]?.photoCode || null;
      unit.hasPhotos = true;
      photosLinked++;
    }
  }
  console.log(`🔗 Photo cross-link: ${photosLinked} of ${extracted.length} units matched with photos`);

  console.log(`🏠 Units extracted: ${extracted.length}`);
  console.log(`⏭️  Messages skipped: ${skipped}`);

  // Categorize
  const active = extracted.filter(u => !u.priceFlagged);
  const flagged = extracted.filter(u => u.priceFlagged);
  const rent = active.filter(u => u.dealType === 'rent');
  const resale = active.filter(u => u.dealType === 'resale');

  console.log(`\n── Breakdown ──────────────────────────────`);
  console.log(`  ✅ Active: ${active.length} (Rent: ${rent.length}, Resale: ${resale.length})`);
  console.log(`  ⚠️  Flagged (price out of range): ${flagged.length}`);

  // Merge with existing inventory
  const existing = loadInventory();
  const newUnits = dedup(existing, extracted);
  const merged = [...existing, ...newUnits];
  saveInventory(merged);

  console.log(`\n📦 Inventory:`);
  console.log(`  Existing: ${existing.length} units`);
  console.log(`  New added: ${newUnits.length} units`);
  console.log(`  Total: ${merged.length} units`);
  console.log(`  Saved to: ${INVENTORY_FILE}`);

  // Generate PF XML feed
  const pfXml = generatePFXML(merged);
  const pfFeedPath = path.join(OUTPUT_DIR, 'propertyfinder-feed.xml');
  fs.writeFileSync(pfFeedPath, pfXml, 'utf-8');
  console.log(`\n🏢 Property Finder XML feed: ${pfFeedPath}`);
  console.log(`   Units in feed: ${merged.filter(u => u.status === 'Active' && u.price).length}`);

  // Copy to public dir for web serving
  const publicFeedPath = path.resolve(__dirname, '../../../apps/sierra-estates-realty/public/feeds/propertyfinder-feed.xml');
  try {
    fs.mkdirSync(path.dirname(publicFeedPath), { recursive: true });
    fs.copyFileSync(pfFeedPath, publicFeedPath);
    console.log(`   Copied to public/feeds/ ✅`);
  } catch (e) {
    console.log(`   ⚠️ Could not copy to public dir: ${e.message}`);
  }

  // Generate report
  const report = {
    runAt: new Date().toISOString(),
    exportFile: exportFilePath,
    group: groupName,
    totalMessages: messages.length,
    extracted: extracted.length,
    skipped,
    active: active.length,
    flagged: flagged.length,
    rent: rent.length,
    resale: resale.length,
    newAddedToInventory: newUnits.length,
    totalInventory: merged.length,
    pfFeedUnits: merged.filter(u => u.status === 'Active' && u.price).length,
    photoIndexPhones: photoIndexSize,
    unitsWithPhotos: photosLinked,
    flaggedUnits: flagged.map(u => ({
      id: u.id,
      sender: u.sender,
      date: u.date,
      dealType: u.dealType,
      price: u.price,
      priceStatus: u.priceStatus,
      compound: u.compound,
      hasPhotos: u.hasPhotos,
    })),
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n📊 Report saved: ${REPORT_FILE}`);

  // Print top units
  console.log(`\n── Top 10 Extracted Units ─────────────────`);
  active.slice(0, 10).forEach((u, i) => {
    console.log(`  ${i+1}. [${u.dealType.toUpperCase()}] ${u.compound} ${u.unitType} | ${u.price?.toLocaleString()} EGP | ${u.bedrooms || '?'} BR | ${u.phone || 'no phone'} | ${u.date}`);
  });

  console.log(`\n✅ Done! Next steps:`);
  console.log(`   1. Review flagged units: ${INVENTORY_FILE}`);
  console.log(`   2. ${photosLinked} units have photos linked — verify CDN URLs in the PF feed XML`);
  console.log(`   3. Upload PF feed XML to Property Finder portal: ${pfFeedPath}`);
  console.log(`   4. Run again for the next group export file`);
  if (photoIndexSize === 0) {
    console.log(`\n   ⚠️  No photos found in Owners_Inventory.json.`);
    console.log(`      Run the live harvester (node src/owners-harvester.js) first to download group photos.`);
  }
}

main().catch(console.error);
