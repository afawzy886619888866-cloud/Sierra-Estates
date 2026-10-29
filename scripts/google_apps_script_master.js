/**
 * Google Apps Script for Sierra Estates Master Online Sheet (LIVE master tab gid 1127958606)
 *
 * v3 (2026-10-29) — Smart Dropdowns, Schema Organizer & Normalization Edition:
 *   • Data Validation Dropdowns for "Location " (Compounds) with known compounds + "Other / To Be Added" + "Ask Owner"
 *   • Data Validation Dropdowns for "bedrooms" (Rooms: Studio, 1-6+, Ask Owner / Unknown)
 *   • Data Validation Dropdowns for "Availablty" (Available, No answer, Follow up, تم استلام الوحدة, Sold, Rented, Not available, Ask Owner)
 *   • Data Validation Dropdowns for "Type" (rent, sale, commercial rent, commercial sale, Ask Owner)
 *   • Data Validation Dropdowns for "Property Tybe" (Apartment, Standalone Villa, Twin House, Townhouse, Duplex, Penthouse, Studio, Chalet, Commercial, Clinic)
 *   • Data Validation Dropdowns for "Furnished or not" (Furnished, Unfurnished, Semi-Furnished, Ultra Super Lux, Core & Shell, Ask Owner)
 *   • Automatic Data Normalization (`normalizeExistingSheetData`): Standardizes compound spellings (Mevida -> Mivida, rehab -> Al Rehab, etc.)
 *     and repairs misplaced bedroom/price entries.
 *   • Interactive Google Sheets Menu (`onOpen`): "⚡ Sierra Estates Automation" right in Google Sheets UI.
 *   • Preserves 100% backward compatibility for webhook writes (doGet/doPost).
 *
 * Setup Instructions:
 * 1. Open the Google Sheet: https://docs.google.com/spreadsheets/d/1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk/edit?gid=1127958606
 * 2. Click "Extensions" > "Apps Script"
 * 3. Replace all existing text with this file and click Save (💾).
 * 4. Run `setupMasterInventory()` once to format table, apply styling, set frozen rows, and apply all dropdowns.
 * 5. Click "Deploy" > "New deployment" > Select type: "Web app"
 *    - Description: "Sierra Master Write-Back & Status API v3"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (IMPORTANT: select "Anyone" so server webhooks can write back without 403 errors).
 * 6. Copy the new Web App URL and paste into workflows/.env as WF_SHEET_WRITE_URL.
 */

const EXPECTED_SECRET = PropertiesService.getScriptProperties().getProperty('SIERRA_SHEET_WRITE_SECRET') || "sierra_secret_token";
const MASTER_TAB_NAME = "Master_Inventory";
const DATE_COL_NAME = "تاريخ اخر تواصل";

const HEADERS = [
  "Timestamp",
  "NO",
  "تاريخ اخر تحديث ",
  "Name",
  "Mobile",
  "Availablty",
  "bedrooms",
  "Location ",
  "Unit Price",
  "Furnished or not",
  "Type",
  "Property Tybe",
  "Code",
  "Owner",
  "Garden",
  "Space",
  "Pool",
  "Comment",
  "تاريخ اخر تواصل"
];

// Known Canonical Compounds in New Cairo & East Cairo
const KNOWN_COMPOUNDS = [
  "Madinaty",
  "Mivida",
  "Al Rehab",
  "Eastown",
  "Hyde Park",
  "Lake View Residence",
  "Fifth Square",
  "Villette",
  "Uptown Cairo",
  "Mountain View iCity",
  "Mountain View Executive",
  "Cairo Festival City (CFC)",
  "SODIC East",
  "Katameya Dunes",
  "Katameya Heights",
  "Swan Lake",
  "Palm Hills New Cairo",
  "Zed East",
  "Waterway",
  "Galleria Moon Valley",
  "Oriana 2",
  "El Shorouk City",
  "New Capital",
  "90 Avenue",
  "Midtown",
  "Sarai",
  "Taj City",
  "The Address East",
  "New Cairo (General)",
  "Other / To Be Added",
  "Ask Owner / Under Review"
];

const ROOM_OPTIONS = [
  "Studio",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6+",
  "Commercial / Retail",
  "Ask Owner / Unknown"
];

const AVAILABILITY_OPTIONS = [
  "Available",
  "No answer",
  "Follow up",
  "تم استلام الوحدة",
  "Sold",
  "Rented",
  "Not available",
  "Ask Owner"
];

const DEAL_TYPE_OPTIONS = [
  "rent",
  "sale",
  "commercial rent",
  "commercial sale",
  "Ask Owner"
];

const PROPERTY_TYPE_OPTIONS = [
  "Apartment",
  "Standalone Villa",
  "Twin House",
  "Townhouse",
  "Duplex",
  "Penthouse",
  "Studio",
  "Chalet",
  "Commercial / Office",
  "Clinic",
  "Floor With Garden"
];

const FURNISH_OPTIONS = [
  "Furnished",
  "Unfurnished",
  "Semi-Furnished",
  "Ultra Super Lux",
  "Core & Shell",
  "Ask Owner"
];

function getOrCreateMasterSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheets().find(s => s.getSheetId() === 1127958606)
           || ss.getSheetByName(MASTER_TAB_NAME)
           || ss.getActiveSheet();
  return sheet;
}

/**
 * Custom UI menu added inside Google Sheets on load
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("⚡ Sierra Estates Automation")
    .addItem("⚡ 1. Organize & Style Entire Sheet", "setupMasterInventory")
    .addItem("📋 2. Apply Dropdowns (Compounds & Rooms)", "applyAllDropdowns")
    .addItem("🧹 3. Clean & Standardize Existing Data", "normalizeExistingSheetData")
    .addSeparator()
    .addItem("🔄 4. Synchronize New Inventory from System", "importNewMasterRows")
    .addToUi();
}

/**
 * Apply all data validation dropdowns across the active master sheet
 */
function applyAllDropdowns() {
  const sheet = getOrCreateMasterSheet();
  const maxRows = Math.max(10, sheet.getMaxRows() - 1);

  // 1. Compounds Dropdown (Location )
  const locCol = HEADERS.indexOf("Location ") + 1;
  if (locCol > 0) {
    const locRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(KNOWN_COMPOUNDS, true)
      .setAllowInvalid(true)
      .setHelpText("اختر الكمبوند أو اكتب اسماً جديداً لإضافته")
      .build();
    sheet.getRange(2, locCol, maxRows, 1).setDataValidation(locRule);
  }

  // 2. Bedrooms / Rooms Dropdown (bedrooms)
  const bedCol = HEADERS.indexOf("bedrooms") + 1;
  if (bedCol > 0) {
    const bedRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(ROOM_OPTIONS, true)
      .setAllowInvalid(true)
      .setHelpText("اختر عدد الغرف أو اختر 'Ask Owner / Unknown'")
      .build();
    sheet.getRange(2, bedCol, maxRows, 1).setDataValidation(bedRule);
  }

  // 3. Availability Dropdown (Availablty)
  const availCol = HEADERS.indexOf("Availablty") + 1;
  if (availCol > 0) {
    const availRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(AVAILABILITY_OPTIONS, true)
      .setAllowInvalid(true)
      .build();
    sheet.getRange(2, availCol, maxRows, 1).setDataValidation(availRule);
  }

  // 4. Deal Type Dropdown (Type)
  const typeCol = HEADERS.indexOf("Type") + 1;
  if (typeCol > 0) {
    const typeRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(DEAL_TYPE_OPTIONS, true)
      .setAllowInvalid(true)
      .build();
    sheet.getRange(2, typeCol, maxRows, 1).setDataValidation(typeRule);
  }

  // 5. Property Type Dropdown (Property Tybe)
  const propTypeCol = HEADERS.indexOf("Property Tybe") + 1;
  if (propTypeCol > 0) {
    const propTypeRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(PROPERTY_TYPE_OPTIONS, true)
      .setAllowInvalid(true)
      .build();
    sheet.getRange(2, propTypeCol, maxRows, 1).setDataValidation(propTypeRule);
  }

  // 6. Furnished Dropdown (Furnished or not)
  const furnCol = HEADERS.indexOf("Furnished or not") + 1;
  if (furnCol > 0) {
    const furnRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(FURNISH_OPTIONS, true)
      .setAllowInvalid(true)
      .build();
    sheet.getRange(2, furnCol, maxRows, 1).setDataValidation(furnRule);
  }

  Logger.log("All dropdown validations applied successfully.");
  return { ok: true, message: "Dropdown validations applied for Compounds, Bedrooms, Availability, Deal Type, and Property Type." };
}

/**
 * One-click table styling, structure setup, and validation attachment
 */
function setupMasterInventory() {
  const sheet = getOrCreateMasterSheet();
  
  // Set headers if empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  } else {
    // verify header row
    const curHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    if (curHeaders[0] !== HEADERS[0]) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    }
  }

  // Freeze row 1
  sheet.setFrozenRows(1);

  // Style Header (Navy Obsidian + White text)
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange
    .setBackground("#0F172A")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setFontSize(11)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 40);

  // Set clean, readable column widths
  // [Timestamp, NO, LastUpdate, Name, Mobile, Avail, Beds, Location, Price, Furnished, Type, PropType, Code, Owner, Garden, Space, Pool, Comment, LastContact]
  const widths = [140, 55, 110, 140, 130, 115, 85, 160, 110, 120, 90, 120, 160, 80, 70, 75, 70, 260, 120];
  for (let i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }

  // Ensure Mobile column is treated as Plain Text so leading zeros never drop
  const mobileCol = HEADERS.indexOf("Mobile") + 1;
  if (mobileCol > 0) {
    sheet.getRange(2, mobileCol, Math.max(1, sheet.getMaxRows() - 1), 1).setNumberFormat("@");
  }

  // Enable Filter
  const currentFilter = sheet.getFilter();
  if (!currentFilter && sheet.getLastRow() > 0) {
    sheet.getRange(1, 1, Math.max(2, sheet.getLastRow()), HEADERS.length).createFilter();
  }

  // Apply all smart dropdown menus
  applyAllDropdowns();

  return { ok: true, message: "Master Inventory sheet styled, organized, and dropdowns applied successfully." };
}

/**
 * Normalizes existing rows: standardizes compound spellings, fixes misplaced values.
 */
function normalizeExistingSheetData() {
  const sheet = getOrCreateMasterSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: true, message: "No data rows" };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const locColIdx = headers.indexOf("Location ") + 1;
  const bedColIdx = headers.indexOf("bedrooms") + 1;
  const priceColIdx = headers.indexOf("Unit Price") + 1;
  const commentColIdx = headers.indexOf("Comment") + 1;

  const dataRange = sheet.getRange(2, 1, lastRow - 1, headers.length);
  const values = dataRange.getValues();

  let cleanedLocCount = 0;
  let cleanedBedCount = 0;

  for (let i = 0; i < values.length; i++) {
    const row = values[i];

    // 1. Clean & Standardize Compound Names
    if (locColIdx > 0) {
      const loc = String(row[locColIdx - 1] || "").trim();
      const locLower = loc.toLowerCase();
      let updatedLoc = loc;

      if (locLower === "mevida" || locLower === "mivida") updatedLoc = "Mivida";
      else if (locLower === "rehab" || locLower === "al rehab" || locLower === "الرحاب") updatedLoc = "Al Rehab";
      else if (locLower === "madinaty" || locLower === "مدينتي") updatedLoc = "Madinaty";
      else if (locLower === "east town" || locLower === "eastown") updatedLoc = "Eastown";
      else if (locLower === "fifth square" || locLower === "fifth sq") updatedLoc = "Fifth Square";
      else if (locLower === "up town cairo" || locLower === "uptown cairo" || locLower === "uptown") updatedLoc = "Uptown Cairo";
      else if (locLower === "cfc" || locLower === "cairo festival city") updatedLoc = "Cairo Festival City (CFC)";
      else if (locLower === "hyde park" || locLower === "hydepark") updatedLoc = "Hyde Park";
      else if (locLower === "villette") updatedLoc = "Villette";
      else if (locLower === "5th settlement" || locLower === "fifth settlement") updatedLoc = "New Cairo";
      else if (locLower === "n/a" || locLower === "other") updatedLoc = "Other / To Be Added";

      if (updatedLoc !== loc) {
        row[locColIdx - 1] = updatedLoc;
        cleanedLocCount++;
      }
    }

    // 2. Clean Bedrooms & Fix Misplaced Prices
    if (bedColIdx > 0) {
      let bedVal = String(row[bedColIdx - 1] || "").trim();
      const bedNum = Number(bedVal.replace(/[^\d]/g, ""));

      // If a large number like 80000 was pasted into bedrooms, move it to Price if Price is empty
      if (bedNum >= 5000) {
        if (priceColIdx > 0 && !row[priceColIdx - 1]) {
          row[priceColIdx - 1] = bedVal;
        }
        row[bedColIdx - 1] = "Ask Owner / Unknown";
        cleanedBedCount++;
      } else if (!bedVal && commentColIdx > 0) {
        // Try to infer bedrooms from comment
        const comment = String(row[commentColIdx - 1] || "");
        const match = comment.match(/(\d+)\s*(غرف|غرفه|غرفة|نوم|bed|bhk)/i);
        if (match && match[1]) {
          row[bedColIdx - 1] = match[1];
          cleanedBedCount++;
        }
      }
    }
  }

  dataRange.setValues(values);
  return {
    ok: true,
    message: `Normalized ${cleanedLocCount} compound names and cleaned ${cleanedBedCount} bedroom values.`,
    cleanedLocCount,
    cleanedBedCount
  };
}

/**
 * Read the sheet's Mobile column and build a set of phone identities
 */
function readExistingPhoneIdentities(sheet) {
  const lastRow = sheet.getLastRow();
  const identities = new Set();
  if (lastRow < 2) return identities;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const mobColIdx = headers.indexOf("Mobile") + 1;
  if (mobColIdx === 0) return identities;
  const mobValues = sheet.getRange(2, mobColIdx, lastRow - 1, 1).getValues();
  for (let i = 0; i < mobValues.length; i++) {
    const raw = String(mobValues[i][0] || "").replace(/\D/g, "");
    if (raw.length >= 9) {
      identities.add(raw);
      identities.add(raw.slice(-9));
    }
  }
  return identities;
}

/**
 * Dedupe-guarded bulk append.
 */
function appendRowsDeduped(sheet, rowsToAppend) {
  const identities = readExistingPhoneIdentities(sheet);
  const seenInBatch = new Set();
  const keep = [];
  let skipped = 0;
  for (const row of rowsToAppend) {
    const cells = (row || []).map(function (c) { return c === null || c === undefined ? "" : String(c); });
    while (cells.length < HEADERS.length) cells.push("");
    cells.length = HEADERS.length;
    const raw = String(cells[4] || "").replace(/\D/g, "");
    let isDupe = false;
    if (raw.length >= 9) {
      if (identities.has(raw) || identities.has(raw.slice(-9)) ||
          seenInBatch.has(raw) || seenInBatch.has(raw.slice(-9))) {
        isDupe = true;
      } else {
        seenInBatch.add(raw);
        seenInBatch.add(raw.slice(-9));
      }
    }
    if (isDupe) { skipped++; continue; }
    keep.push(cells);
  }
  if (!keep.length) {
    return { ok: true, appended: 0, skipped: skipped, totalRows: sheet.getLastRow() - 1 };
  }
  const CHUNK = 500;
  for (let i = 0; i < keep.length; i += CHUNK) {
    const chunk = keep.slice(i, i + CHUNK);
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, chunk.length, HEADERS.length).setValues(chunk);
    sheet.getRange(startRow, 5, chunk.length, 1).setNumberFormat("@");
  }
  return { ok: true, appended: keep.length, skipped: skipped, totalRows: sheet.getLastRow() - 1 };
}

function importNewMasterRows() {
  const sheet = getOrCreateMasterSheet();
  const csvUrl = "https://raw.githubusercontent.com/afawzy886619888866-cloud/Sierra-Estates/main/data/Online_Sheet_New_Rows_Only.csv";
  const response = UrlFetchApp.fetch(csvUrl);
  const csvData = Utilities.parseCsv(response.getContentText("UTF-8"));

  const rowsToAppend = csvData.slice(1).filter(function (r) {
    return r.length > 1 && String(r.join("")).trim().length > 0;
  });
  if (!rowsToAppend.length) {
    Logger.log("No rows to append.");
    return { ok: false, message: "No rows found in CSV." };
  }

  const result = appendRowsDeduped(sheet, rowsToAppend);
  Logger.log("Import done: appended " + result.appended + ", skipped (already present) " + result.skipped + ", total rows now " + result.totalRows);
  return result;
}

/**
 * Handle GET: Status & Diagnostics
 */
function doGet(e) {
  const sheet = getOrCreateMasterSheet();
  const lastRow = sheet.getLastRow();
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    service: "sierra-sheet-writeback",
    version: 3,
    sheetName: sheet.getName(),
    tabGid: sheet.getSheetId(),
    totalRows: Math.max(0, lastRow - 1),
    column: DATE_COL_NAME,
    actions: ["rows:[{phone,date}]", "unitReceived|updateStatus", "appendRows", "importNewMasterRows", "setupMasterInventory", "normalizeData"],
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST: Write-back date, Inbound unit status, and remote maintenance
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    if (EXPECTED_SECRET && payload.secret !== EXPECTED_SECRET) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "unauthorized" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = getOrCreateMasterSheet();

    // Maintenance triggers
    if (payload.action === "setupMasterInventory" || payload.action === "organizeSheet") {
      const res = setupMasterInventory();
      return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
    }
    if (payload.action === "normalizeData" || payload.action === "cleanData") {
      const res = normalizeExistingSheetData();
      return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
    }

    if (payload.action === "appendRows") {
      const rows = Array.isArray(payload.rows) ? payload.rows : [];
      const result = appendRowsDeduped(sheet, rows);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    if (payload.action === "importNewMasterRows") {
      const result = importNewMasterRows();
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return ContentService.createTextOutput(JSON.stringify({ ok: true, updated: 0, message: "No data rows" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const mobColIdx = headers.indexOf("Mobile") + 1;
    const dateColIdx = headers.indexOf(DATE_COL_NAME) + 1;
    const availColIdx = headers.indexOf("Availablty") + 1;
    const commentColIdx = headers.indexOf("Comment") + 1;

    if (mobColIdx === 0) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "Mobile column not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const mobValues = sheet.getRange(2, mobColIdx, lastRow - 1, 1).getValues();
    const phoneToRow = new Map();
    for (let i = 0; i < mobValues.length; i++) {
      const raw = String(mobValues[i][0] || "").replace(/\D/g, "");
      if (raw.length >= 7) {
        phoneToRow.set(raw, i + 2);
        phoneToRow.set(raw.slice(-9), i + 2);
        phoneToRow.set(raw.slice(-7), i + 2);
      }
    }

    let updatedCount = 0;

    // 1. Inbound Status Update
    if (payload.action === "unitReceived" || payload.action === "updateStatus") {
      const phone = String(payload.phone || "").replace(/\D/g, "");
      const rowNum = phoneToRow.get(phone) || phoneToRow.get(phone.slice(-9)) || phoneToRow.get(phone.slice(-7));
      if (rowNum && availColIdx > 0) {
        sheet.getRange(rowNum, availColIdx).setValue("تم استلام الوحدة");
        if (commentColIdx > 0 && payload.comment) {
          const prev = String(sheet.getRange(rowNum, commentColIdx).getValue() || "");
          sheet.getRange(rowNum, commentColIdx).setValue(`${prev} | [${new Date().toLocaleDateString("en-GB")}] ${payload.comment}`.trim());
        }
        updatedCount++;
      }
      return ContentService.createTextOutput(JSON.stringify({ ok: true, updated: updatedCount, row: rowNum }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Batch Outreach Date Write-back
    const rows = payload.rows || [];
    for (const item of rows) {
      const p = String(item.phone || "").replace(/\D/g, "");
      const dt = item.date || new Date().toLocaleDateString("en-GB");
      const rowNum = phoneToRow.get(p) || phoneToRow.get(p.slice(-9)) || phoneToRow.get(p.slice(-7));
      if (rowNum && dateColIdx > 0) {
        sheet.getRange(rowNum, dateColIdx).setValue(dt);
        updatedCount++;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      updated: updatedCount,
      totalReceived: rows.length
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
