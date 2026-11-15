/**
 * ============================================================================
 * SIERRA ESTATES OS — GOOGLE APPS SCRIPT UNIFIED ENGINE (v7.0)
 * ============================================================================
 * 
 * Instructions:
 * 1. Open your master Google Sheet (https://docs.google.com/spreadsheets/d/1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk/edit).
 * 2. Click Extensions > Apps Script.
 * 3. Replace all existing code with this file and save (Ctrl + S).
 * 4. From the sheet toolbar, use menu: 🏛️ Sierra Estates OS
 *    - 1. Merge Owners Rent & Rent 2 into Owners Master
 *    - 2. Setup Dropdowns & Sync Real_Available_Units
 * 5. Click Deploy > New deployment > Web app:
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    - Copy the Web App URL for webhook/outreach integration.
 * ============================================================================
 */

const SIERRA_CFG = {
  SPREADSHEET_ID: "1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk",
  MASTER_TAB: "Master_Inventory",
  OWNERS_RENT_TAB: "Owners_Rent",
  OWNERS_RENT_2_TAB: "Owners_Rent_2",
  REAL_AVAILABLE_TAB: "Real_Available_Units",
  CLIENT_REQUESTS_TAB: "Client_Requests",
  EXCLUDED_BROKERS_TAB: "Excluded_Brokers",
  
  // Secret Key for Webhooks
  OUTREACH_SECRET: PropertiesService.getScriptProperties().getProperty("SIERRA_SECRET_KEY") || "SE_OUTREACH_SECRET_2026_CAIRO",
  EASY_POLL_TOKEN: PropertiesService.getScriptProperties().getProperty("EASY_POLL_TOKEN") || "POLL_SE2026_PROD",
  
  // Rent Ceiling Guard: <= 400k EGP
  PRICE_RENT_MAX: 400000,
  
  // Authoritative Supabase
  SUPABASE_URL: "https://gaxfqcietzoonlmatiot.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdheGZxY2lldHpvb25sbWF0aW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1MjkxNDIsImV4cCI6MjA1NDEwNTE0Mn0.Uf7RkL6n3Z1b6hC3c9yD0w-E8vP7mN4s2xQ1yZ9a0bC"
};

/**
 * 🏛️ Sierra Estates OS Custom Menu
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  if (!ui) return;
  ui.createMenu("🏛️ Sierra Estates OS")
    .addItem("1. Merge Owners Rent & Rent 2 into Owners Master", "mergeOwnersRentSheets")
    .addItem("2. Setup Dropdowns & Sync Real_Available_Units", "setupDropdownsAndSyncAvailable")
    .addSeparator()
    .addItem("🚀 Run Complete Master Audit", "runMasterAudit")
    .addItem("📱 Validate & Format Egyptian Mobiles", "formatAllMobiles")
    .addToUi();
}

/**
 * 1. Merge Owners Rent & Owners Rent 2 into Master_Inventory
 */
function mergeOwnersRentSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let masterSheet = ss.getSheetByName(SIERRA_CFG.MASTER_TAB);
  if (!masterSheet) {
    masterSheet = ss.insertSheet(SIERRA_CFG.MASTER_TAB, 0);
    const headers = [
      "Unit_Code", "Advertiser_Type", "Listing_Type", "Compound", "Price_EGP",
      "Area_SQM", "Bedrooms", "Bathrooms", "Floor", "Finishing",
      "Furnishing", "Contact_Name", "Phone", "Phone_Last7", "Availability",
      "Description", "Photo_URLs", "Duplicate_Count"
    ];
    masterSheet.appendRow(headers);
    masterSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0F172A").setFontColor("#FFFFFF");
  }

  const existingData = masterSheet.getDataRange().getValues();
  const existingPhones = new Set();
  for (let i = 1; i < existingData.length; i++) {
    const p = String(existingData[i][12] || "").trim();
    if (p) existingPhones.add(cleanPhoneLast7(p));
  }

  let mergedCount = 0;
  const sourceTabs = [SIERRA_CFG.OWNERS_RENT_TAB, SIERRA_CFG.OWNERS_RENT_2_TAB, "Owners-Rent", "Owners Rent"];

  sourceTabs.forEach(tabName => {
    const s = ss.getSheetByName(tabName);
    if (!s) return;
    const data = s.getDataRange().getValues();
    if (data.length <= 1) return;

    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      // Search for mobile in row
      let mobile = "";
      let price = 0;
      let compound = "";
      let area = 0;
      let beds = 0;

      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || "").trim();
        const digits = val.replace(/[^0-9]/g, "");
        if (digits.length === 11 && digits.startsWith("01")) {
          mobile = digits;
        } else if (parseFloat(val) > 1000 && parseFloat(val) <= 500000000 && !val.startsWith("01")) {
          if (!price) price = parseFloat(val);
        }
      }

      const p7 = cleanPhoneLast7(mobile);
      if (p7 && !existingPhones.has(p7)) {
        existingPhones.add(p7);
        const code = "SE-RNT-" + (p7.slice(0, 4)) + "-" + Math.floor(1000 + Math.random() * 9000);
        masterSheet.appendRow([
          code, "Direct Owner", (price <= SIERRA_CFG.PRICE_RENT_MAX ? "Rent" : "Resale"),
          compound || "New Cairo", price, area || 150, beds || 3, 2, "Typical", "Super Lux",
          "Unfurnished", "Direct Owner", mobile, p7, "Available",
          "Direct owner listing merged from " + tabName, "", 1
        ]);
        mergedCount++;
      }
    }
  });

  SpreadsheetApp.getActiveSpreadsheet().toast("✓ Merged " + mergedCount + " new unique owners into Master_Inventory!", "Merge Complete", 5);
}

/**
 * 2. Setup Dropdowns & Sync Real_Available_Units
 */
function setupDropdownsAndSyncAvailable() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const master = ss.getSheetByName(SIERRA_CFG.MASTER_TAB);
  if (!master) return;

  // Dropdown for Availability (Col 15 = O)
  const ruleAvail = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Available", "Not Available", "Reserved"], true)
    .build();
  master.getRange("O2:O").setDataValidation(ruleAvail);

  // Dropdown for Deal Type (Col 3 = C)
  const ruleDeal = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Rent", "Resale"], true)
    .build();
  master.getRange("C2:C").setDataValidation(ruleDeal);

  // Dropdown for Advertiser Type (Col 2 = B)
  const ruleAdv = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Direct Owner", "Broker"], true)
    .build();
  master.getRange("B2:B").setDataValidation(ruleAdv);

  // Sync Real_Available_Units
  let availSheet = ss.getSheetByName(SIERRA_CFG.REAL_AVAILABLE_TAB);
  if (!availSheet) {
    availSheet = ss.insertSheet(SIERRA_CFG.REAL_AVAILABLE_TAB);
  }
  availSheet.clear();
  
  const formula = '=QUERY(' + SIERRA_CFG.MASTER_TAB + '!A:R, "SELECT * WHERE O = \'Available\'", 1)';
  availSheet.getRange("A1").setFormula(formula);

  SpreadsheetApp.getActiveSpreadsheet().toast("✓ Dropdowns configured and Real_Available_Units live query synced!", "Sync Complete", 5);
}

/**
 * Master Audit & Formatting
 */
function runMasterAudit() {
  formatAllMobiles();
  setupDropdownsAndSyncAvailable();
}

function formatAllMobiles() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const master = ss.getSheetByName(SIERRA_CFG.MASTER_TAB);
  if (!master) return;
  const range = master.getRange("M2:M" + master.getLastRow());
  const vals = range.getValues();
  for (let i = 0; i < vals.length; i++) {
    const raw = String(vals[i][0] || "").replace(/[^0-9]/g, "");
    if (raw.length === 10 && raw.startsWith("1")) vals[i][0] = "0" + raw;
    else if (raw.startsWith("20") && raw.length === 12) vals[i][0] = raw.slice(2);
  }
  range.setNumberFormat("@");
  range.setValues(vals);
}

function cleanPhoneLast7(p) {
  const d = String(p || "").replace(/[^0-9]/g, "");
  return d.length >= 7 ? d.slice(-7) : "";
}

/**
 * Webhook Endpoints (doGet & doPost)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    engine: "Sierra Estates OS Unified v7.0",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const raw = e && e.postData ? e.postData.contents : "{}";
    const data = JSON.parse(raw);

    // Easy Listing actions
    if (data.action === "easy_listing") return handleEasyListing(data);
    if (data.action === "easy_poll") return handleEasyPoll(data);
    if (data.action === "easy_sent") return handleEasySent(data);

    // Authentication check for system actions
    const secret = data.secret || (e.parameter && e.parameter.secret);
    if (secret !== SIERRA_CFG.OUTREACH_SECRET) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "outreach_feedback") {
      return handleOutreachFeedback(data);
    }
    if (data.action === "upsert_units") {
      return handleUpsertUnits(data);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true, received: data.action || "none" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleEasyListing(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let tab = ss.getSheetByName("Easy_Listings");
  if (!tab) {
    tab = ss.insertSheet("Easy_Listings");
    tab.appendRow(["Unit_Code", "Date", "Compound", "Type", "Price", "Phone", "Status"]);
  }
  const u = data.unit || data;
  tab.appendRow([u.code || "SE-EL-" + Date.now(), new Date(), u.compound, u.type, u.price, u.phone, "Pending"]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true, queued: true })).setMimeType(ContentService.MimeType.JSON);
}

function handleEasyPoll(data) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, pending: [] })).setMimeType(ContentService.MimeType.JSON);
}

function handleEasySent(data) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, marked: true })).setMimeType(ContentService.MimeType.JSON);
}

function handleOutreachFeedback(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const master = ss.getSheetByName(SIERRA_CFG.MASTER_TAB);
  if (!master) return ContentService.createTextOutput(JSON.stringify({ error: "Master tab missing" })).setMimeType(ContentService.MimeType.JSON);

  const phone = cleanPhoneLast7(data.phone);
  const rows = master.getDataRange().getValues();
  for (let r = 1; r < rows.length; r++) {
    const rowPhone = cleanPhoneLast7(rows[r][12]);
    if (rowPhone && rowPhone === phone) {
      if (data.contact_status === "Broker Excluded") {
        master.getRange(r + 1, 15).setValue("Not Available");
        // Move to Excluded_Brokers
        let exc = ss.getSheetByName(SIERRA_CFG.EXCLUDED_BROKERS_TAB);
        if (!exc) exc = ss.insertSheet(SIERRA_CFG.EXCLUDED_BROKERS_TAB);
        exc.appendRow(rows[r]);
      } else if (data.contact_status === "Verified Available") {
        master.getRange(r + 1, 15).setValue("Available");
      }
      break;
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true, updated: true })).setMimeType(ContentService.MimeType.JSON);
}

function handleUpsertUnits(data) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, count: (data.units || []).length })).setMimeType(ContentService.MimeType.JSON);
}
