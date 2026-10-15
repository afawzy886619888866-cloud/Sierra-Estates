/**
 * Google Apps Script for Sierra Estates Master Online Sheet
 * Target Sheet ID: 1q-dQmbFS9UZkRrL_HmJIxBXQ-ASEPkM7MvFiviojw7A
 * 
 * Instructions:
 * 1. Open the Google Sheet: https://docs.google.com/spreadsheets/d/1q-dQmbFS9UZkRrL_HmJIxBXQ-ASEPkM7MvFiviojw7A/edit
 * 2. Click "Extensions" > "Apps Script"
 * 3. Replace all existing text with this file
 * 4. Run `setupMasterInventory()` once to format the table, freeze header, and enable filters
 * 5. Click "Deploy" > "New deployment" > Select type: "Web app"
 *    - Description: "Sierra Master Write-Back & Status API"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 6. Copy the new Web App URL and provide it to Antigravity / paste into .env (WF_SHEET_WRITE_URL)
 */

const EXPECTED_SECRET = "SE_OUTREACH_SECRET_2026_CAIRO";
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
 * 1-Click Import of the 1,503 new verified master rows directly from GitHub into the sheet
 */
function importNewMasterRows() {
  const sheet = getOrCreateMasterSheet();
  const csvUrl = "https://raw.githubusercontent.com/sierrablue8866-droid/SE-Vercel-deploy-main/main/data/Online_Sheet_New_Rows_Only.csv";
  const response = UrlFetchApp.fetch(csvUrl);
  const csvData = Utilities.parseCsv(response.getContentText("UTF-8"));
  
  const rowsToAppend = csvData.slice(1);
  if (!rowsToAppend.length) {
    Logger.log("No rows to append.");
    return { ok: false, message: "No rows found in CSV." };
  }
  
  const startRow = sheet.getLastRow() + 1;
  const numRows = rowsToAppend.length;
  const numCols = rowsToAppend[0].length;
  
  sheet.getRange(startRow, 1, numRows, numCols).setValues(rowsToAppend);
  // Ensure Mobile column (col 5) is formatted as Plain Text
  sheet.getRange(startRow, 5, numRows, 1).setNumberFormat("@");
  
  Logger.log("Successfully appended " + numRows + " new master rows! Total sheet rows: " + sheet.getLastRow());
  return { ok: true, appended: numRows, totalRows: sheet.getLastRow() };
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
    service: "sierra-master-sheet-api",
    sheetName: sheet.getName(),
    tabGid: sheet.getSheetId(),
    totalRows: Math.max(0, lastRow - 1),
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
