/**
 * Sierra Estates — WhatsApp Units Excel & Google Sheets Exporter
 * ─────────────────────────────────────────────────────────────
 * Formats REAL available units (buyer requests strictly filtered out),
 * coded with SE-WA-XXXXXX, stamped with Posted_Date, and linked to
 * Google Drive media folders.
 * Writes zero-dependency RFC-4180 CSV snapshots unconditionally and
 * generates multi-tab .xlsx workbooks when `xlsx` is installed.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Convert row objects with uniform keys into RFC-4180 CSV with UTF-8 BOM. */
export function rowsToCsv(rows, headers = null) {
  const cols = headers || (rows.length ? Object.keys(rows[0]) : [
    'Unit_Code', 'Posted_Date', 'Posted_Day', 'Deal_Type', 'Compound', 'Zone',
    'Property_Type', 'Price_EGP', 'Area_SQM', 'Bedrooms', 'Bathrooms',
    'Advertiser_Type', 'Contact_Name', 'Contact_Phone', 'Phone_Last7',
    'Photos_Count', 'Drive_Media_Folder', 'Source_Group', 'System_Status', 'Original_Message',
  ]);
  const esc = (val) => {
    const s = val === undefined || val === null ? '' : String(val);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.map(esc).join(',')];
  for (const r of rows) {
    lines.push(cols.map((c) => esc(r[c])).join(','));
  }
  return '\uFEFF' + lines.join('\n') + '\n';
}

export async function exportUnitsToExcel(availableUnits, options = {}) {
  const {
    outputDir = 'data',
    userDownloadsDir = process.platform === 'win32' ? 'C:\\Users\\Sierr\\Downloads' : null,
    driveBaseDir = 'G:\\My Drive\\Sierra_Estates_Units_Media'
  } = options;

  // Filter out any lingering requests strictly
  const realUnits = (availableUnits || []).filter((u) => !u.isRequest);
  const directOwners = realUnits.filter((u) => u.advertiser === 'Direct Owner');
  const unitsWithDrivePhotos = realUnits.filter((u) => u.driveFolder && u.photosCount > 0);

  // Sort chronologically by Posted Date (newest posted first)
  const sortByPostedDate = (a, b) => (b.timestampMs || 0) - (a.timestampMs || 0);

  realUnits.sort(sortByPostedDate);
  directOwners.sort(sortByPostedDate);
  unitsWithDrivePhotos.sort(sortByPostedDate);

  function mapUnitToRow(u) {
    return {
      'Unit_Code': u.unitCode || '',
      'Posted_Date': u.postedDate || '',
      'Posted_Day': u.postedDay || '',
      'Deal_Type': u.dealType || 'Sale',
      'Compound': u.compound || 'New Cairo',
      'Zone': u.zone || '5th Settlement',
      'Property_Type': u.propertyType || 'Apartment',
      'Price_EGP': u.priceEgp || 0,
      'Area_SQM': u.areaSqm || '',
      'Bedrooms': u.bedrooms || '',
      'Bathrooms': u.bathrooms || '',
      'Advertiser_Type': u.advertiser || 'Broker',
      'Contact_Name': u.senderName || '',
      'Contact_Phone': u.phoneNormalized ? `'${u.phoneNormalized}` : '',
      'Phone_Last7': u.phoneLast7 ? `'${u.phoneLast7}` : '',
      'Photos_Count': u.photosCount || 0,
      'Drive_Media_Folder': u.driveFolder || (u.photosCount > 0 ? path.join(driveBaseDir, u.unitCode) : ''),
      'Source_Group': u.sourceGroup || '',
      'System_Status': 'Registered in Supabase Listings',
      'Original_Message': (u.rawText || '').slice(0, 300).replace(/\r?\n/g, ' ')
    };
  }

  const mappedAvailable = realUnits.map(mapUnitToRow);
  const mappedOwners = directOwners.map(mapUnitToRow);
  const mappedDrive = unitsWithDrivePhotos.map(mapUnitToRow);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Always write zero-dependency CSV snapshots first
  const csvPath = path.join(outputDir, 'Sierra_Estates_WhatsApp_Inventory_By_Date.csv');
  const ownersCsvPath = path.join(outputDir, 'Sierra_Estates_Direct_Owners_By_Date.csv');
  const driveCsvPath = path.join(outputDir, 'Sierra_Estates_Units_With_Drive_Photos.csv');
  fs.writeFileSync(csvPath, rowsToCsv(mappedAvailable), 'utf8');
  fs.writeFileSync(ownersCsvPath, rowsToCsv(mappedOwners), 'utf8');
  fs.writeFileSync(driveCsvPath, rowsToCsv(mappedDrive), 'utf8');

  let primaryPath = csvPath;
  let mirrorPath = null;
  let xlsxWritten = false;

  const xlsxMod = await import('xlsx').catch(() => null);
  const XLSX = xlsxMod?.default || (xlsxMod?.utils ? xlsxMod : null);
  if (XLSX && XLSX.utils) {
    const wb = XLSX.utils.book_new();
    const wsAvailable = XLSX.utils.json_to_sheet(mappedAvailable);
    XLSX.utils.book_append_sheet(wb, wsAvailable, 'Available_Units_By_Date');
    const wsOwners = XLSX.utils.json_to_sheet(mappedOwners);
    XLSX.utils.book_append_sheet(wb, wsOwners, 'Direct_Owners_By_Date');
    const wsDrive = XLSX.utils.json_to_sheet(mappedDrive);
    XLSX.utils.book_append_sheet(wb, wsDrive, 'Units_With_Drive_Photos');

    const xlsxPath = path.join(outputDir, 'Sierra_Estates_WhatsApp_Inventory_By_Date.xlsx');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    fs.writeFileSync(xlsxPath, buf);
    primaryPath = xlsxPath;
    xlsxWritten = true;

    // Mirror to user's Downloads folder on Windows when present
    if (process.platform === 'win32' && userDownloadsDir) {
      try {
        if (fs.existsSync(userDownloadsDir)) {
          mirrorPath = path.join(userDownloadsDir, 'Sierra_Estates_WhatsApp_Inventory_By_Date.xlsx');
          fs.writeFileSync(mirrorPath, buf);
        }
      } catch (_) {}
    }
  }

  return {
    primaryPath,
    csvPath,
    ownersCsvPath,
    driveCsvPath,
    mirrorPath,
    xlsxWritten,
    availableCount: realUnits.length,
    ownersCount: directOwners.length,
    drivePhotosCount: unitsWithDrivePhotos.length
  };
}
