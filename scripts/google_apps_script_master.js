/**
 * Google Apps Script for Sierra Estates Master Online Sheet (LIVE master tab gid 1127958606)
 *
 * v2 (2026-10-17) — merge-safe edition:
 *   • importNewMasterRows() is now IDEMPOTENT: it reads the sheet's existing
 *     Mobile column first and skips any CSV row whose phone (exact or
 *     last-9-digits) is already in the sheet. Re-running it can never
 *     duplicate rows.
 *   • New web action `appendRows` — POST {secret, action:'appendRows',
 *     rows: [[19 cells], ...]} — applies the same phone-dedupe guard, so
 *     remote callers (runners / automation) can push rows safely.
 *   • New web action `importNewMasterRows` — POST {secret,
 *     action:'importNewMasterRows'} — runs the idempotent CSV import
 *     remotely (fetches data/Online_Sheet_New_Rows_Only.csv from GitHub).
 *   • doGet/doPost write-back contracts are UNCHANGED (outreach.js
 *     depends on them: rows=[{phone,date}], action:unitReceived).
 *
 * Instructions:
 * 1. Open the LIVE Google Sheet (the one with the Owners-Rent tab, gid 1127958606)
 * 2. Click "Extensions" > "Apps Script"
 * 3. Replace all existing text with this file
 * 4. Run `setupMasterInventory()` once to format the table, freeze header, and enable filters
 * 5. Click "Deploy" > "New deployment" > Select type: "Web app"
 *    - Description: "Sierra Master Write-Back & Status API v2"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 6. Copy the new Web App URL and provide it to Antigravity / paste into .env (WF_SHEET_WRITE_URL)
 */

const EXPECTED_SECRET = PropertiesService.getScriptProperties().getProperty('SIERRA_SHEET_WRITE_SECRET');
if (!EXPECTED_SECRET) throw new Error('SIERRA_SHEET_WRITE_SECRET is not configured');
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

function getOrCreateMasterSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // Look for target tab GID 1127958606 or MASTER_TAB_NAME or active sheet
  let sheet = ss.getSheets().find(s => s.getSheetId() === 1127958606)
           || ss.getSheetByName(MASTER_TAB_NAME)
           || ss.getActiveSheet();
  return sheet;
}

/**
 * Read the sheet's Mobile column and build a set of phone identities:
 * full digits + last-9 (mirrors the doPost matching logic).
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
 * Dedupe-guarded bulk append. Accepts an array of row arrays (19 cells each,
 * matching HEADERS order). Skips rows whose Mobile phone (exact or last-9)
 * already exists in the sheet or appears earlier in the same batch.
 * Returns {ok, appended, skipped, totalRows}.
 */
function appendRowsDeduped(sheet, rowsToAppend) {
  const identities = readExistingPhoneIdentities(sheet);
  const seenInBatch = new Set();
  const keep = [];
  let skipped = 0;
  for (const row of rowsToAppend) {
    const cells = (row || []).map(function (c) { return c === null || c === undefined ? "" : String(c); });
    // pad/trim to header width
    while (cells.length < HEADERS.length) cells.push("");
    cells.length = HEADERS.length;
    const raw = String(cells[4] || "").replace(/\D/g, ""); // Mobile = column 5
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
  // append in chunks of 500 to stay well under Apps Script quota per call
  const CHUNK = 500;
  for (let i = 0; i < keep.length; i += CHUNK) {
    const chunk = keep.slice(i, i + CHUNK);
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, chunk.length, HEADERS.length).setValues(chunk);
    // Mobile column as plain text so leading zeros survive
    sheet.getRange(startRow, 5, chunk.length, 1).setNumberFormat("@");
  }
  return { ok: true, appended: keep.length, skipped: skipped, totalRows: sheet.getLastRow() - 1 };
}

/**
 * 1-Click Import of the new verified master rows directly from GitHub into the
 * sheet — IDEMPOTENT (v2): rows whose phone already exists in the sheet are
 * skipped, so this can be re-run any number of times without duplication.
 */
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
 * One-click table styling & structure setup
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

  // Style Header
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange
    .setBackground("#0F172A")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setFontSize(11)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 38);

  // Auto-resize or set clean column widths
  const widths = [140, 55, 110, 140, 130, 110, 80, 140, 110, 120, 80, 110, 160, 80, 70, 70, 70, 250, 120];
  for (let i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }

  // Ensure Mobile column is treated as Plain Text
  const mobileCol = HEADERS.indexOf("Mobile") + 1;
  if (mobileCol > 0) {
    sheet.getRange(2, mobileCol, Math.max(1, sheet.getMaxRows() - 1), 1).setNumberFormat("@");
  }

  // Enable Filter
  const currentFilter = sheet.getFilter();
  if (!currentFilter && sheet.getLastRow() > 0) {
    sheet.getRange(1, 1, Math.max(2, sheet.getLastRow()), HEADERS.length).createFilter();
  }

  // Add Data Validation Dropdowns for Availablty
  const availCol = HEADERS.indexOf("Availablty") + 1;
  if (availCol > 0) {
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["Available", "No answer", "Follow up", "تم استلام الوحدة", "Sold", "Rented", "Not Available"], true)
      .setAllowInvalid(true)
      .build();
    sheet.getRange(2, availCol, Math.max(1, sheet.getMaxRows() - 1), 1).setDataValidation(rule);
  }

  return { ok: true, message: "Master Inventory sheet styled and configured successfully." };
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
    version: 2,
    sheetName: sheet.getName(),
    tabGid: sheet.getSheetId(),
    totalRows: Math.max(0, lastRow - 1),
    column: DATE_COL_NAME,
    actions: ["rows:[{phone,date}]", "unitReceived|updateStatus", "appendRows", "importNewMasterRows"],
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST: Write-back date & Inbound unit status updates
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    if (payload.secret !== EXPECTED_SECRET) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "unauthorized" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = getOrCreateMasterSheet();

    // ── v2 merge actions (dedupe-guarded bulk append) ──────────────────────
    if (payload.action === "appendRows") {
      const rows = Array.isArray(payload.rows) ? payload.rows : [];
      const result = appendRowsDeduped(sheet, rows);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (payload.action === "importNewMasterRows") {
      const result = importNewMasterRows();
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
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

    // Read all mobiles
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

    // 1. Inbound Status Update (Owner replied with unit details)
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
