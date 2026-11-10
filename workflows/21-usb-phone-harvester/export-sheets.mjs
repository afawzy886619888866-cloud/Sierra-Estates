/**
 * Sierra Estates — WhatsApp Units Excel & Google Sheets Exporter
 * ─────────────────────────────────────────────────────────────
 * Formats REAL available units (buyer requests strictly filtered out),
 * coded with SE-WA-XXXXXX, stamped with Posted_Date, and linked to
 * Google Drive media folders.
 */

import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

export function exportUnitsToExcel(availableUnits, options = {}) {
  const {
    outputDir = 'data',
    userDownloadsDir = 'C:\\Users\\Sierr\\Downloads',
    driveBaseDir = 'G:\\My Drive\\Sierra_Estates_Units_Media'
  } = options;

  // Filter out any lingering requests strictly
  const realUnits = availableUnits.filter((u) => !u.isRequest);
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

  const wb = XLSX.utils.book_new();

  // Tab 1: All Available Real Units (Ordered by Posted_Date)
  const wsAvailable = XLSX.utils.json_to_sheet(realUnits.map(mapUnitToRow));
  XLSX.utils.book_append_sheet(wb, wsAvailable, 'Available_Units_By_Date');

  // Tab 2: Direct Owners Units (Ordered by Posted_Date)
  const wsOwners = XLSX.utils.json_to_sheet(directOwners.map(mapUnitToRow));
  XLSX.utils.book_append_sheet(wb, wsOwners, 'Direct_Owners_By_Date');

  // Tab 3: Units with Google Drive Photos
  const wsDrive = XLSX.utils.json_to_sheet(unitsWithDrivePhotos.map(mapUnitToRow));
  XLSX.utils.book_append_sheet(wb, wsDrive, 'Units_With_Drive_Photos');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const primaryPath = path.join(outputDir, 'Sierra_Estates_WhatsApp_Inventory_By_Date.xlsx');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  fs.writeFileSync(primaryPath, buf);

  // Also write CSV snapshot
  const csvPath = path.join(outputDir, 'Sierra_Estates_WhatsApp_Inventory_By_Date.csv');
  const csvContent = XLSX.utils.sheet_to_csv(wsAvailable);
  fs.writeFileSync(csvPath, csvContent, 'utf8');

  // Mirror to user's Downloads folder
  let mirrorPath = null;
  try {
    if (fs.existsSync(userDownloadsDir)) {
      mirrorPath = path.join(userDownloadsDir, 'Sierra_Estates_WhatsApp_Inventory_By_Date.xlsx');
      fs.writeFileSync(mirrorPath, buf);
    }
  } catch (_) {}

  return {
    primaryPath,
    csvPath,
    mirrorPath,
    availableCount: realUnits.length,
    ownersCount: directOwners.length,
    drivePhotosCount: unitsWithDrivePhotos.length
  };
}
