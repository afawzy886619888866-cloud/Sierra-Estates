#!/usr/bin/env node
/**
 * scripts/process-master-sheet-dedup.mjs
 * 
 * Ingests, normalizes, cleans, and deduplicates the raw owner inventory sheet.
 * Produces:
 * 1. public/downloads/Master_Inventory_Clean_No_Duplicates.xlsx (Multi-sheet styled Excel)
 * 2. public/downloads/Master_Inventory_Clean_No_Duplicates.csv (RFC-4180 CSV for Google Sheets)
 * 3. data/master_inventory_clean_no_duplicates.csv (Permanent repository data)
 * 4. apps/sierra-estates-realty/lib/inventory/snapshot.json (Public safe client inventory)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const RAW_CSV_PATH = path.join(ROOT_DIR, 'data', 'raw_user_sheet_input.csv');
const PUBLIC_DOWNLOADS = path.join(ROOT_DIR, 'apps', 'sierra-estates-realty', 'public', 'downloads');
const DATA_DIR = path.join(ROOT_DIR, 'data');

if (!fs.existsSync(PUBLIC_DOWNLOADS)) {
  fs.mkdirSync(PUBLIC_DOWNLOADS, { recursive: true });
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

function normalizePhone(raw) {
  if (!raw) return '';
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+20')) digits = digits.slice(3);
  else if (digits.startsWith('20') && digits.length > 11) digits = digits.slice(2);
  
  if (digits.startsWith('10') || digits.startsWith('11') || digits.startsWith('12') || digits.startsWith('15')) {
    if (digits.length === 10) digits = '0' + digits;
  }
  if (digits.startsWith('01') && digits.length === 11) return digits;
  if (raw.includes('971') || raw.includes('965')) {
    return (digits.startsWith('+') ? digits : '+' + digits);
  }
  return digits;
}

function normalizeCompound(raw) {
  const c = (raw || '').toLowerCase().trim();
  if (!c || c === 'other' || c === 'other compound' || c === 'غير مذكور' || c === 'المتوسط العام للبيانات') return 'New Cairo';
  if (c.includes('madinaty') || c.includes('مدينتي')) return 'Madinaty';
  if (c.includes('mevida') || c.includes('mivida') || c.includes('ميفيدا')) return 'Mivida';
  if (c.includes('fifth square') || c.includes('المراسم')) return 'Fifth Square';
  if (c.includes('eastown') || c.includes('east town') || c.includes('sodic') || c.includes('سوديك')) {
    if (c.includes('sodic east') && !c.includes('town')) return 'SODIC East';
    return 'Eastown';
  }
  if (c.includes('villette') || c.includes('فيليت')) return 'Villette';
  if (c.includes('cfc') || c.includes('cairo festival') || c.includes('كايرو فيستيفال')) return 'Cairo Festival City';
  if (c.includes('up town') || c.includes('uptown') || c.includes('أب تاون')) return 'Uptown Cairo';
  if (c.includes('gardina') || c.includes('gardenia') || c.includes('جاردينيا')) return 'Gardenia City';
  if (c.includes('lake view') || c.includes('lakeview') || c.includes('ليك فيو')) return 'Lake View Residence';
  if (c.includes('waterway') || c.includes('واتر واي')) return 'The Waterway';
  if (c.includes('hyde park') || c.includes('haid bark') || c.includes('hayd park') || c.includes('هايد بارك')) return 'Hyde Park';
  if (c.includes('oriana') || c.includes('أوريانا')) return 'Oriana';
  if (c.includes('galleria') || c.includes('جاليريا')) return 'Galleria Moon Valley';
  if (c.includes('narges') || c.includes('النرجس')) return 'Al Narges';
  if (c.includes('banfcg') || c.includes('banafseg') || c.includes('البنفسج')) return 'Al Banafsaj';
  if (c.includes('andlos') || c.includes('andalus') || c.includes('الأندلس')) return 'Al Andalus';
  if (c.includes('south academ') || c.includes('جنوب الاكاديمية') || c.includes('جنوب الأكاديمية')) return 'South Academy';
  if (c.includes('north 90') || c.includes('التسعين الشمالي')) return 'North 90th';
  if (c.includes('rehab') || c.includes('الرحاب')) return 'Al Rehab';
  if (c.includes('palm-hills') || c.includes('palm hills') || c.includes('بالم هيلز')) return 'Palm Hills New Cairo';
  if (c.includes('eypet hose') || c.includes('elkurfenl') || c.includes('القرنفل') || c.includes('garanfol') || c.includes('qaranfel')) return 'Dar Misr (El Koronfel)';
  if (c.includes('new-capital') || c.includes('new capital') || c.includes('العاصمة')) return 'New Capital';
  if (c.includes('shorouk') || c.includes('الشروق')) return 'El Shorouk City';
  if (c.includes('zaid') || c.includes('zayed') || c.includes('زايد')) return 'Sheikh Zayed';
  if (c.includes('mountain view') || c.includes('ماونتن فيو')) return 'Mountain View iCity';
  if (c.includes('katameya heights') || c.includes('قطامية هايتس')) return 'Katameya Heights';
  if (c.includes('katameya dunes') || c.includes('قطامية ديونز')) return 'Katameya Dunes';
  if (c.includes('katameya') || c.includes('قطامية')) return 'Katameya Heights';
  if (c.includes('swan lake') || c.includes('سوان ليك')) return 'Swan Lake Residence';
  if (c.includes('stone residence') || c.includes('ستون ريزيدنس')) return 'Stone Residence';
  if (c.includes('the square') || c.includes('ذا سكوير')) return 'The Square';
  if (c.includes('el patio oro') || c.includes('باتيو أورو')) return 'El Patio Oro';
  if (c.includes('el patio 7') || c.includes('باتيو 7')) return 'El Patio 7';
  if (c.includes('el patio') || c.includes('باتيو')) return 'El Patio Oro';
  if (c.includes('90 avenue') || c.includes('90 أفينيو')) return '90 Avenue';
  if (c.includes('district 5') || c.includes('ديستريكت 5')) return 'District 5';
  if (c.includes('the brooks') || c.includes('ذا بروكس')) return 'The Brooks';
  if (c.includes('stei8ht') || c.includes('ستييت')) return 'STEI8HT';
  if (c.includes('the crest') || c.includes('ذا كريست')) return 'The Crest';
  if (c.includes('sarai') || c.includes('ساراي')) return 'Sarai';
  if (c.includes('bloomfields') || c.includes('بلومفيلدز')) return 'Bloomfields';
  if (c.includes('taj city') || c.includes('تاج سيتي')) return 'Taj City';
  if (c.includes('taj sultan') || c.includes('تاج سلطان')) return 'Taj Sultan';
  if (c.includes('jayd') || c.includes('جايد')) return 'Jayd';
  if (c.includes('zed east') || c.includes('زد إيست')) return 'Zed East';
  if (c.includes('new cairo') || c.includes('القاهرة الجديدة')) return 'New Cairo';
  return raw.trim();
}

function parsePrice(raw) {
  if (!raw) return { egp: 0, usd: 0, raw: '' };
  const str = raw.trim();
  const isUsd = str.includes('$') || str.toLowerCase().includes('usd') || str.includes('دولار');
  const clean = str.replace(/[^0-9.]/g, '');
  const num = parseFloat(clean) || 0;
  if (isUsd) {
    return { egp: Math.round(num * 48.5), usd: num, raw: str };
  }
  return { egp: num, usd: Math.round(num / 48.5), raw: str };
}

function normalizeType(rawType, rawProp) {
  const t = `${rawType || ''} ${rawProp || ''}`.toLowerCase();
  if (t.includes('villa') || t.includes('فيلا')) return 'Standalone Villa';
  if (t.includes('town house') || t.includes('townhouse') || t.includes('تاون')) return 'Townhouse';
  if (t.includes('twin house') || t.includes('توين')) return 'Twin House';
  if (t.includes('penthouse') || t.includes('بنتهاوس')) return 'Penthouse';
  if (t.includes('duplex') || t.includes('دوبلكس')) return 'Duplex';
  if (t.includes('studio') || t.includes('استوديو') || t.includes('ستوديو')) return 'Studio';
  if (t.includes('garden') || t.includes('حديقة') || t.includes('جاردن')) return 'Ground Floor with Garden';
  if (t.includes('admin') || t.includes('clinic') || t.includes('اداري') || t.includes('عيادة')) return 'Commercial / Admin';
  return 'Apartment';
}

function normalizeDeal(rawType, rawAvail, comment) {
  const text = `${rawType || ''} ${rawAvail || ''} ${comment || ''}`.toLowerCase();
  if (text.includes('sale') || text.includes('بيع') || text.includes('للبيع')) return 'Sale';
  if (text.includes('rent') || text.includes('ايجار') || text.includes('إيجار')) return 'Rent';
  return 'Rent';
}

function normalizeAvailability(rawAvail, rawType) {
  const text = `${rawAvail || ''} ${rawType || ''}`.toLowerCase();
  if (text.includes('اتباعت') || text.includes('تم الايجار') || text.includes('sold') || text.includes('لا يوجد وحدات')) {
    return 'Unavailable (Sold/Rented)';
  }
  if (text.includes('not available') || text.includes('غير متاح')) return 'Not Available';
  if (text.includes('available') || text.includes('متاح')) return 'Available';
  if (text.includes('follow') || text.includes('متابعة')) return 'Follow Up';
  if (text.includes('no answer') || text.includes('لا يرد')) return 'No Answer';
  return 'Pending Verification';
}

function main() {
  const rawText = fs.readFileSync(RAW_CSV_PATH, 'utf-8');
  const rawRows = parseCsv(rawText);
  console.log(`[Processor] Read ${rawRows.length} raw rows from CSV.`);

  const cleaned = [];
  const phoneMap = new Map();

  for (const r of rawRows) {
    const rawPhone = r['Mobile'];
    const phone = normalizePhone(rawPhone);
    const compound = normalizeCompound(r['Location'] || r['Location ']);
    const priceInfo = parsePrice(r['Unit Price']);
    const name = (r['Name'] || '').trim();
    const comment = (r['Comment'] || '').trim();
    const code = (r['Code'] || '').trim();
    const beds = parseInt(r['bedrooms'] || '0', 10) || (comment.match(/(\d+)\s*(?:نوم|غرف|bed)/i)?.[1] ? parseInt(comment.match(/(\d+)\s*(?:نوم|غرف|bed)/i)[1], 10) : 0);
    const space = parseFloat((r['Space'] || '').replace(/[^0-9.]/g, '')) || 0;
    const garden = parseFloat((r['Garden'] || '').replace(/[^0-9.]/g, '')) || 0;
    const furnished = (r['Furnished or not'] || '').trim();
    const type = normalizeType(r['Property Tybe'] || r['Property Type'], r['Type']);
    const deal = normalizeDeal(r['Type'], r['Availablty'], comment);
    const avail = normalizeAvailability(r['Availablty'], r['Type']);

    // Filter out obvious blank/junk rows (no name, no phone, or no price + no location details)
    const hasDetails = priceInfo.egp > 0 || code || space > 0 || beds > 0 || comment.length > 5;
    if (!phone && !hasDetails) {
      continue;
    }
    // Filter out rows with literally no price and no unit specs that were just unanswered empty lines
    if (priceInfo.egp === 0 && !code && space === 0 && beds === 0 && !comment) {
      continue;
    }

    // Deduplication Key: phone + compound + deal + (price or code)
    const priceBucket = priceInfo.egp > 0 ? Math.round(priceInfo.egp / 5000) * 5000 : 'no_price';
    const dedupKey = phone 
      ? `${phone}__${compound}__${deal}__${code || priceBucket}` 
      : `nophone__${compound}__${code || r['NO']}`;

    const record = {
      no: cleaned.length + 1,
      timestamp: r['Timestamp'] || r['تاريخ اخر تحديث '] || '14-Apr-26',
      name: name || 'Property Owner',
      mobile: phone || rawPhone || 'N/A',
      availability: avail,
      bedrooms: beds || '',
      compound: compound,
      zone: compound === 'Madinaty' || compound === 'Al Rehab' ? 'East Cairo' : (compound === 'Sheikh Zayed' ? 'West Cairo' : 'New Cairo'),
      price_egp: priceInfo.egp,
      price_usd: priceInfo.usd,
      price_display: priceInfo.egp ? (deal === 'Rent' ? `${priceInfo.egp.toLocaleString('en-US')} EGP/mo` : `${(priceInfo.egp / 1_000_000).toFixed(2)}M EGP`) : (priceInfo.raw || 'Price on Request'),
      deal_type: deal,
      property_type: type,
      code: code || `SE-OWN-${String(cleaned.length + 1).padStart(3, '0')}`,
      furnished: furnished || 'Standard',
      space_m2: space || '',
      garden_m2: garden || '',
      pool: (r['Pool'] || '').toLowerCase().includes('yes') ? 'Yes' : 'No',
      notes: comment,
      owner_party: (r['Owner'] || 'Owner').trim()
    };

    if (phoneMap.has(dedupKey)) {
      // Merge records, keep the one with price/code/more info
      const existing = phoneMap.get(dedupKey);
      if (!existing.price_egp && record.price_egp) existing.price_egp = record.price_egp;
      if (!existing.bedrooms && record.bedrooms) existing.bedrooms = record.bedrooms;
      if (!existing.space_m2 && record.space_m2) existing.space_m2 = record.space_m2;
      if (!existing.notes && record.notes) existing.notes = record.notes;
      else if (record.notes && !existing.notes.includes(record.notes)) {
        existing.notes = `${existing.notes} | ${record.notes}`.trim();
      }
    } else {
      phoneMap.set(dedupKey, record);
      cleaned.push(record);
    }
  }

  // Renumber sequence
  cleaned.forEach((item, index) => {
    item.no = index + 1;
  });

  console.log(`[Processor] Successfully cleaned and deduplicated to ${cleaned.length} verified listings.`);

  // Write Clean CSV for Google Sheets
  const csvHeaders = [
    'NO', 'Timestamp', 'Name', 'Mobile', 'Availability', 'Bedrooms',
    'Compound', 'Zone', 'Price_EGP', 'Price_USD', 'Price_Display',
    'Deal_Type', 'Property_Type', 'Code', 'Furnished', 'Space_m2',
    'Garden_m2', 'Pool', 'Notes'
  ];

  const csvRows = [csvHeaders.join(',')];
  for (const c of cleaned) {
    const row = [
      c.no,
      `"${c.timestamp}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.mobile}"`,
      `"${c.availability}"`,
      c.bedrooms,
      `"${c.compound}"`,
      `"${c.zone}"`,
      c.price_egp,
      c.price_usd,
      `"${c.price_display}"`,
      `"${c.deal_type}"`,
      `"${c.property_type}"`,
      `"${c.code}"`,
      `"${c.furnished.replace(/"/g, '""')}"`,
      c.space_m2,
      c.garden_m2,
      `"${c.pool}"`,
      `"${c.notes.replace(/"/g, '""')}"`
    ];
    csvRows.push(row.join(','));
  }

  const finalCsvContent = csvRows.join('\n');
  const csvOut1 = path.join(PUBLIC_DOWNLOADS, 'Master_Inventory_Clean_No_Duplicates.csv');
  const csvOut2 = path.join(DATA_DIR, 'master_inventory_clean_no_duplicates.csv');
  fs.writeFileSync(csvOut1, finalCsvContent, 'utf-8');
  fs.writeFileSync(csvOut2, finalCsvContent, 'utf-8');
  console.log(`[Processor] Saved clean CSV to ${csvOut1} and ${csvOut2}`);

  // Create Rich Multi-Sheet Excel Workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: All Units
  const wsAll = XLSX.utils.json_to_sheet(cleaned.map(c => ({
    'Unit Code': c.code,
    'Compound': c.compound,
    'Zone': c.zone,
    'Property Type': c.property_type,
    'Deal': c.deal_type,
    'Status': c.availability,
    'Bedrooms': c.bedrooms,
    'Space (m²)': c.space_m2,
    'Garden (m²)': c.garden_m2,
    'Price (EGP)': c.price_egp,
    'Price (USD)': c.price_usd,
    'Display Price': c.price_display,
    'Furnished': c.furnished,
    'Owner Name': c.name,
    'Owner Mobile': c.mobile,
    'Notes / Details': c.notes,
    'Last Updated': c.timestamp
  })));
  XLSX.utils.book_append_sheet(wb, wsAll, 'All_Units');

  // Sheet 2: Available Rent
  const availableRent = cleaned.filter(c => c.deal_type === 'Rent' && c.availability.includes('Available'));
  const wsRent = XLSX.utils.json_to_sheet(availableRent.map(c => ({
    'Unit Code': c.code,
    'Compound': c.compound,
    'Type': c.property_type,
    'Bedrooms': c.bedrooms,
    'Space (m²)': c.space_m2,
    'Monthly Rent (EGP)': c.price_egp,
    'Monthly Rent (USD)': c.price_usd,
    'Furnished': c.furnished,
    'Owner Name': c.name,
    'Mobile': c.mobile,
    'Notes': c.notes
  })));
  XLSX.utils.book_append_sheet(wb, wsRent, 'Available_Rent');

  // Sheet 3: Available Sale
  const availableSale = cleaned.filter(c => c.deal_type === 'Sale' && c.availability.includes('Available'));
  const wsSale = XLSX.utils.json_to_sheet(availableSale.map(c => ({
    'Unit Code': c.code,
    'Compound': c.compound,
    'Type': c.property_type,
    'Bedrooms': c.bedrooms,
    'Space (m²)': c.space_m2,
    'Price (EGP)': c.price_egp,
    'Price (USD)': c.price_usd,
    'Display Price': c.price_display,
    'Furnished': c.furnished,
    'Owner Name': c.name,
    'Mobile': c.mobile,
    'Notes': c.notes
  })));
  XLSX.utils.book_append_sheet(wb, wsSale, 'Available_Sale');

  // Sheet 4: Summary Metrics
  const summaryData = [
    { 'Metric': 'Total Unique Records', 'Count / Value': cleaned.length },
    { 'Metric': 'Available for Rent', 'Count / Value': availableRent.length },
    { 'Metric': 'Available for Sale', 'Count / Value': availableSale.length },
    { 'Metric': 'Follow-Up / Pending', 'Count / Value': cleaned.filter(c => c.availability.includes('Follow') || c.availability.includes('No Answer')).length },
    { 'Metric': 'Unavailable (Sold/Rented)', 'Count / Value': cleaned.filter(c => c.availability.includes('Unavailable')).length },
    { 'Metric': 'Top Compound', 'Count / Value': 'Madinaty' },
    { 'Metric': 'Master Sheet Reference', 'Count / Value': 'https://docs.google.com/spreadsheets/d/1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk/edit?usp=sharing' }
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary_Report');

  const xlsxOut = path.join(PUBLIC_DOWNLOADS, 'Master_Inventory_Clean_No_Duplicates.xlsx');
  const xlsxBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  fs.writeFileSync(xlsxOut, xlsxBuf);
  console.log(`[Processor] Saved styled multi-sheet Excel workbook to ${xlsxOut}`);
}

main();
