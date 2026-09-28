import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

function mapOfferingType(dealType) {
  const d = String(dealType || '').toLowerCase();
  if (d.includes('rent') || d.includes('ايجار')) return 'RR';
  return 'RS';
}

function mapPropertyType(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('villa') || t.includes('فيلا') || t.includes('standalone')) return 'VH';
  if (t.includes('townhouse') || t.includes('town')) return 'TH';
  if (t.includes('twinhouse') || t.includes('twin')) return 'TW';
  if (t.includes('penthouse') || t.includes('roof')) return 'PH';
  if (t.includes('duplex')) return 'DU';
  if (t.includes('chalet') || t.includes('شاليه')) return 'CH';
  if (t.includes('commercial') || t.includes('retail') || t.includes('shop')) return 'RE';
  if (t.includes('office') || t.includes('مكتب')) return 'OF';
  return 'AP';
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function main() {
  const photosWorkbookPath = path.join(ROOT, 'Sierra_Estates_Units_With_Photos.xlsx');
  if (!fs.existsSync(photosWorkbookPath)) {
    throw new Error(`Workbook not found: ${photosWorkbookPath}`);
  }

  const wb = XLSX.readFile(photosWorkbookPath);
  const allPhotoUnits = [];

  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
    for (const r of rows) {
      allPhotoUnits.push({ ...r, _category: sheetName });
    }
  }

  console.log(`Loaded ${allPhotoUnits.length} units with photos across all 4 categories.`);

  const outputDir = path.join(ROOT, 'apps', 'sierra-estates-realty', 'public', 'feeds');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // 1. Build XML Feed for Units with Photos
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<list last_update="${new Date().toISOString()}">\n`;

  for (const u of allPhotoUnits) {
    // Use Unit_Code as stable reference — prevents PF treating re-runs as new ads.
    const ref = u['Reference Code'] || u['Unit_Code'] || `SE-${String(u['Unit_Code'] || '').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8) || Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const offeringType = mapOfferingType(u['Deal Type']);
    const propType = mapPropertyType(u['Property Type']);
    const price = Number(u['Price (EGP)']) || 0;
    const size = Number(u['Area (sqm)']) || 0;
    const beds = Number(u['Bedrooms']) || 0;
    const baths = Number(u['Bathrooms']) || 0;
    const city = 'Cairo';
    const community = u['Zone / Area'] || 'New Cairo';
    const subCommunity = u['Compound'] || '';
    const titleEn = `${u['Property Type']} in ${subCommunity || community} (${u._category})`;
    const descEn = u['Description'] || `${u['Property Type']} available for ${u['Deal Type']} in ${subCommunity}, ${community}. Contact Sierra Estates for private viewing.`;

    const photoUrls = String(u['Photo URLs'] || '').split(/[\n,;]+/).map(s => s.trim()).filter(s => s.startsWith('http'));

    xml += `  <property last_update="${new Date().toISOString().replace('T', ' ').slice(0, 19)}">\n`;
    xml += `    <reference_number>${escapeXml(ref)}</reference_number>\n`;
    xml += `    <offering_type>${offeringType}</offering_type>\n`;
    xml += `    <property_type>${propType}</property_type>\n`;
    xml += `    <price_on_application>${price > 0 ? '0' : '1'}</price_on_application>\n`;
    xml += `    <price>${price}</price>\n`;
    if (offeringType === 'RR') xml += `    <rental_period>M</rental_period>\n`;
    xml += `    <currency>EGP</currency>\n`;
    xml += `    <city>${escapeXml(city)}</city>\n`;
    xml += `    <community>${escapeXml(community)}</community>\n`;
    if (subCommunity) xml += `    <sub_community>${escapeXml(subCommunity)}</sub_community>\n`;
    xml += `    <title_en><![CDATA[${titleEn}]]></title_en>\n`;
    xml += `    <description_en><![CDATA[${descEn}]]></description_en>\n`;
    if (size > 0) xml += `    <size>${size}</size>\n`;
    if (beds > 0) xml += `    <bedroom>${beds}</bedroom>\n`;
    if (baths > 0) xml += `    <bathroom>${baths}</bathroom>\n`;
    xml += `    <agent>\n`;
    xml += `      <name>Sierra Estates Team</name>\n`;
    xml += `      <email>info@sierra-estates.net</email>\n`;
    xml += `      <phone>+201000000000</phone>\n`;
    xml += `    </agent>\n`;

    if (photoUrls.length > 0) {
      xml += `    <photo>\n`;
      for (const pUrl of photoUrls) {
        xml += `      <url>${escapeXml(pUrl)}</url>\n`;
      }
      xml += `    </photo>\n`;
    }
    xml += `  </property>\n`;
  }
  xml += `</list>\n`;

  const xmlPath = path.join(outputDir, 'propertyfinder-photos-only.xml');
  fs.writeFileSync(xmlPath, xml, 'utf8');
  console.log(`[✓] Generated Property Finder XML Feed (${allPhotoUnits.length} ads) → ${xmlPath}`);

  // 2. Build Portal CSV for manual upload in Property Finder
  const csvHeaders = [
    'Reference',
    'Category',
    'Offering Type',
    'Property Type',
    'Compound',
    'Community / Zone',
    'Price (EGP)',
    'Rental Period',
    'Bedrooms',
    'Bathrooms',
    'Area (sqm)',
    'Photo URL 1',
    'Photo URL 2',
    'Title (EN)',
    'Description (EN)',
  ];

  const csvRows = [csvHeaders.join(',')];
  const cleanStr = (s) => `"${String(s || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

  for (const u of allPhotoUnits) {
    // Use Unit_Code as stable reference — prevents PF treating re-runs as new ads.
    const ref = u['Reference Code'] || u['Unit_Code'] || `SE-${String(u['Unit_Code'] || '').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8) || Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const photoUrls = String(u['Photo URLs'] || '').split(/[\n,;]+/).map(s => s.trim()).filter(s => s.startsWith('http'));

    csvRows.push([
      cleanStr(ref),
      cleanStr(u._category),
      cleanStr(mapOfferingType(u['Deal Type'])),
      cleanStr(mapPropertyType(u['Property Type'])),
      cleanStr(u['Compound'] || ''),
      cleanStr(u['Zone / Area'] || 'New Cairo'),
      u['Price (EGP)'] || 0,
      mapOfferingType(u['Deal Type']) === 'RR' ? 'Monthly' : '',
      u['Bedrooms'] || 0,
      u['Bathrooms'] || 0,
      u['Area (sqm)'] || 0,
      cleanStr(photoUrls[0] || ''),
      cleanStr(photoUrls[1] || ''),
      cleanStr(`${u['Property Type']} in ${u['Compound'] || 'New Cairo'}`),
      cleanStr(u['Description'] || ''),
    ].join(','));
  }

  const csvPath = path.join(outputDir, 'propertyfinder-photos-only.csv');
  fs.writeFileSync(csvPath, '\uFEFF' + csvRows.join('\n'), 'utf8');
  console.log(`[✓] Generated Property Finder Portal CSV (${allPhotoUnits.length} ads) → ${csvPath}`);
}

main().catch(console.error);
