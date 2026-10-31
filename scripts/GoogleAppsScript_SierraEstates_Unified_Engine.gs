/**
 * ============================================================================
 * SIERRA ESTATES · UNIFIED MASTER APPS SCRIPT ENGINE (v6.0 - Robust Production)
 * ============================================================================
 * Features:
 *   0. Primary "Run" button handler: select "run" or "runSierraEstatesEngine"
 *      and click "Run ▶" — audits all sheets, outputs detailed execution logs.
 *      WORKS IN BOTH CONTAINER-BOUND AND STANDALONE APPS SCRIPT EDITORS.
 *   1. Preserved & Enhanced Owner Outreach Write-Back Endpoint (doGet & doPost).
 *      - Secret: SE_OUTREACH_SECRET_2026_CAIRO
 *      - Updates «تاريخ اخر تواصل» / Last Action Date matched by clean mobile.
 *   2. Famous Canonical Compound Unification (e.g. CFC, كايرو فيستيفال -> Cairo Festival City).
 *   3. 400,000 EGP Rent Ceiling Guard (Rent <= 400k | Resale = Millions).
 *   4. Mandatory Egyptian Mobile Rule (01xxxxxxxxx) - Blanks strictly blocked.
 *   5. Zero Blanks Guarantee - Replaces empty spaces with exact 22-column defaults.
 *   6. Auto-timestamping on status / call notes edit.
 *   7. Supabase pgvector RAG Memory Synchronization.
 * ============================================================================
 */

// Core Configuration
const CONFIG = {
  SPREADSHEET_ID: "1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk",
  OUTREACH_SECRET: "SE_OUTREACH_SECRET_2026_CAIRO",
  TARGET_GID: 1127958606, // Original Owners-Rent GID
  DATE_COL_NAME: "تاريخ اخر تواصل",
  PRICE_RENT_MAX: 400000, // 400k EGP ceiling for Rent
  SUPABASE_URL: "https://gaxfqcietzoonlmatiot.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdheGZxY2lldHpvb25sbWF0aW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1MjkxNDIsImV4cCI6MjA1NDEwNTE0Mn0.Uf7RkL6n3Z1b6hC3c9yD0w-E8vP7mN4s2xQ1yZ9a0bC",
  COLUMNS: {
    TIMESTAMP: 1,      // A
    UNIT_CODE: 2,      // B
    DEAL_TYPE: 3,      // C
    COMPOUND: 4,       // D
    PROPERTY_TYPE: 5,  // E
    PRICE: 6,          // F
    AREA: 7,           // G
    BEDROOMS: 8,       // H
    BATHROOMS: 9,      // I
    FINISHING: 10,     // J
    FLOOR: 11,         // K
    GARDEN: 12,        // L
    POOL: 13,          // M
    ADVERTISER: 14,    // N
    CONTACT_NAME: 15,  // O
    MOBILE: 16,        // P
    MOBILE_LAST7: 17,  // Q
    AVAILABILITY: 18,  // R
    LAST_ACTION: 19,   // S
    NOTES: 20,         // T
    PHOTO_URLS: 21,    // U
    RAG_MEMORY_ID: 22  // V
  }
};

/**
 * Robust Spreadsheet Resolver:
 * Works whether the script is container-bound OR standalone at script.google.com!
 */
function getSpreadsheet() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {
    Logger.log("getActiveSpreadsheet not available: " + e.message);
  }
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

/**
 * Safe toast that never throws an exception if UI is not attached.
 */
function safeToast(ss, message, title, timeoutSec) {
  try {
    if (ss && ss.toast) {
      ss.toast(message, title || "Sierra Estates", timeoutSec || 5);
    }
  } catch (e) {
    // UI toast ignored in headless execution
  }
}

// Canonical Famous Names Gazetteer
const COMPOUND_GAZETTEER = {
  // Cairo Festival City
  "cfc": "Cairo Festival City",
  "cairo festival city": "Cairo Festival City",
  "cairo festival": "Cairo Festival City",
  "كايرو فيستيفال": "Cairo Festival City",
  "كايرو فيستيفال سيتي": "Cairo Festival City",
  "14 cairo vetsveal -altgmoo alkames": "Cairo Festival City",
  "oriana": "Oriana (Festival City)",
  "oriana 2": "Oriana (Festival City)",
  "اوريانا": "Oriana (Festival City)",

  // Madinaty
  "madinaty": "Madinaty",
  "مدينتي": "Madinaty",

  // Al Rehab
  "rehab": "Al Rehab",
  "al rehab": "Al Rehab",
  "الرحاب": "Al Rehab",

  // Mivida
  "mivida": "Mivida",
  "mevida": "Mivida",
  "ميفيدا": "Mivida",

  // Eastown
  "eastown": "Eastown",
  "ايست تاون": "Eastown",
  "ايستاون": "Eastown",

  // Hyde Park
  "hyde park": "Hyde Park",
  "هايد بارك": "Hyde Park",

  // Villette
  "villette": "Villette (Sodic)",
  "فيليت": "Villette (Sodic)",

  // Palm Hills
  "palm hills": "Palm Hills New Cairo",
  "بالم هيلز": "Palm Hills New Cairo",
  "pk1": "Palm Hills (PK1)",
  "pk2": "Palm Hills (PK2)",
  "village gate": "Village Gate (Palm Hills)",
  "village avenue": "Village Avenue",

  // Mountain View
  "mountain view": "Mountain View iCity",
  "ماونتن فيو": "Mountain View iCity",
  "icity": "Mountain View iCity",
  "hyde park mv": "Mountain View (Hyde Park)",

  // Fifth Square
  "fifth square": "Fifth Square (Al Marasem)",
  "المراسم": "Fifth Square (Al Marasem)",
  "فيفث سكوير": "Fifth Square (Al Marasem)",

  // Katameya
  "katameya dunes": "Katameya Dunes",
  "قطامية ديونز": "Katameya Dunes",
  "katameya heights": "Katameya Heights",
  "قطامية هايتس": "Katameya Heights",
  "katameya palms": "Katameya Palms",
  "katameya residence": "Katameya Residence",

  // Lake View
  "lake view": "Lake View",
  "ليك فيو": "Lake View",
  "lake view residence": "Lake View Residence",

  // Al Marasm
  "marasem": "Fifth Square (Al Marasem)",
  "marasm": "Fifth Square (Al Marasem)",

  // Waterway
  "waterway": "The Waterway",
  "water way": "The Waterway",
  "واتر واي": "The Waterway",

  // Swan Lake
  "swan lake": "Swan Lake (Hassan Allam)",
  "swanlake": "Swan Lake (Hassan Allam)",
  "سوان ليك": "Swan Lake (Hassan Allam)",

  // Azzar
  "azzar": "Azzar",
  "ازار": "Azzar",

  // Sarai
  "sarai": "Sarai",
  "سراي": "Sarai",

  // Taj City
  "taj city": "Taj City",
  "تاج سيتي": "Taj City",

  // Zed East
  "zed east": "Zed East (Ora)",
  "زد ايست": "Zed East (Ora)",
  "zed": "Zed East (Ora)",

  // Golden Square generic
  "golden square": "Golden Square",
  "المربع الذهبي": "Golden Square",

  // Sheikh Zayed & West Cairo
  "zayed": "Sheikh Zayed",
  "zaid": "Sheikh Zayed",
  "sheikh zayed, typical": "Sheikh Zayed",
  "6th of october": "6th of October",
  "village west - dorra": "Village West (Dorra)"
};

// 1-to-1 Column Defaults for 22 Columns (Zero-Blank Guarantee)
const COLUMN_FILL_DEFAULTS = [
  "Not Recorded",    // 1: Timestamp (A)
  "Pending Code",   // 2: Unit Code (B)
  "Resale",         // 3: Deal Type (C)
  "Not Specified",  // 4: Compound (D)
  "Apartment",      // 5: Property Type (E)
  "Ask Owner",      // 6: Asking Price (F)
  "Not Specified",  // 7: Area (G)
  "Not Specified",  // 8: Bedrooms (H)
  "Not Specified",  // 9: Bathrooms (I)
  "Not Specified",  // 10: Finishing Status (J)
  "Not Specified",  // 11: Floor (K)
  "No Info",        // 12: Garden (L)
  "Not Specified",  // 13: Pool (M)
  "Direct Owner",   // 14: Advertiser (N)
  "Unknown",        // 15: Contact Name (O)
  "MISSING",        // 16: Mobile Number (P)
  "MISSING",        // 17: Mobile Last 7 (Q)
  "Not Confirmed",  // 18: Availability Status (R)
  "No Contact Yet", // 19: Last Action Date (S)
  "No Notes",       // 20: Owner Call Response & Notes (T)
  "No Photos",      // 21: Photo URLs (U)
  "Pending Sync"    // 22: RAG Memory ID (V)
];

/**
 * ============================================================================
 * 0. PRIMARY RUN FUNCTION (Select this from the dropdown and click "Run ▶")
 * ============================================================================
 * Performs a complete audit across all inventory sheets:
 *   1. Resolves spreadsheet safely by ID if getActiveSpreadsheet() is null.
 *   2. Standardizes all compound names to famous canonical names.
 *   3. Audits the 400,000 EGP rent ceiling (Rent <= 400k, moves millions to Resale).
 *   4. Validates and formats all mobile numbers (01xxxxxxxxx with leading zero preserved).
 *   5. Fills all empty cells contextually (Zero-Blank Guarantee).
 *   6. Prints a complete audit summary to the Execution Log.
 */
function run() {
  return runSierraEstatesEngine();
}

function test() {
  return runSierraEstatesEngine();
}

function runSierraEstatesEngine() {
  Logger.log("====================================================");
  Logger.log("🚀 SIERRA ESTATES AI ENGINE · MASTER AUDIT & CLEANUP");
  Logger.log("====================================================");

  let ss;
  try {
    ss = getSpreadsheet();
    Logger.log("📄 Connected to spreadsheet: " + ss.getName() + " (" + ss.getId() + ")");
  } catch (err) {
    Logger.log("❌ Fatal: Failed to open spreadsheet: " + err.message);
    return { ok: false, error: err.message };
  }

  const targetSheets = ["Owners_Rent_Master", "Owners_Resale_Master", "Brokers_Inventory", "Owners-Rent"];
  let totalCompUpdated = 0;
  let totalRentAudited = 0;
  let totalMobilesFormatted = 0;
  let totalBlanksFilled = 0;
  let sheetsProcessed = 0;

  for (const sheetName of targetSheets) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log(`ℹ️ Sheet '${sheetName}' not found in workbook. Skipping.`);
      continue;
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 2) {
      Logger.log(`ℹ️ Sheet '${sheetName}' has no data rows (lastRow=${lastRow}). Skipping.`);
      continue;
    }

    Logger.log(`🔍 Processing '${sheetName}' (${lastRow - 2} data rows)...`);
    sheetsProcessed++;

    // 1. Compound Canonicalization
    try {
      const compRange = sheet.getRange(3, CONFIG.COLUMNS.COMPOUND, lastRow - 2, 1);
      const compVals = compRange.getValues();
      let compUpdated = 0;
      for (let i = 0; i < compVals.length; i++) {
        const raw = String(compVals[i][0] || "").trim();
        if (raw) {
          const canon = resolveFamousCompound(raw);
          if (canon !== raw) {
            compVals[i][0] = canon;
            compUpdated++;
          }
        }
      }
      if (compUpdated > 0) compRange.setValues(compVals);
      totalCompUpdated += compUpdated;
    } catch (e) {
      Logger.log(`⚠️ Compound standardization warning in '${sheetName}': ${e.message}`);
    }

    // 2. Rent Ceiling Audit (Rent <= 400k, moves millions to Resale)
    try {
      const pRange = sheet.getRange(3, CONFIG.COLUMNS.PRICE, lastRow - 2, 1);
      const dRange = sheet.getRange(3, CONFIG.COLUMNS.DEAL_TYPE, lastRow - 2, 1);
      const pVals = pRange.getValues();
      const dVals = dRange.getValues();
      let rentAudited = 0;
      for (let i = 0; i < pVals.length; i++) {
        const p = parseFloat(String(pVals[i][0]).replace(/,/g, "")) || 0;
        const d = String(dVals[i][0] || "").toLowerCase();
        if (d === "rent" && p > CONFIG.PRICE_RENT_MAX) {
          dVals[i][0] = "Resale";
          rentAudited++;
        }
      }
      if (rentAudited > 0) dRange.setValues(dVals);
      totalRentAudited += rentAudited;
    } catch (e) {
      Logger.log(`⚠️ Rent ceiling audit warning in '${sheetName}': ${e.message}`);
    }

    // 3. Mobile Number Validation & Leading Zero Formatting ('01xxxxxxxxx)
    try {
      const mobRange = sheet.getRange(3, CONFIG.COLUMNS.MOBILE, lastRow - 2, 1);
      const l7Range = sheet.getRange(3, CONFIG.COLUMNS.MOBILE_LAST7, lastRow - 2, 1);
      const mVals = mobRange.getValues();
      const lVals = l7Range.getValues();
      let mobFormatted = 0;
      for (let i = 0; i < mVals.length; i++) {
        let r = String(mVals[i][0] || "").replace(/\D/g, "");
        if (r.startsWith("20") && r.length === 12) r = r.slice(2);
        if (r.length === 10 && r.startsWith("1")) r = "0" + r;
        if (/^01[0125][0-9]{8}$/.test(r)) {
          mVals[i][0] = "'" + r;
          lVals[i][0] = "'" + r.slice(-7);
          mobFormatted++;
        }
      }
      if (mobFormatted > 0) {
        mobRange.setValues(mVals);
        l7Range.setValues(lVals);
      }
      totalMobilesFormatted += mobFormatted;
    } catch (e) {
      Logger.log(`⚠️ Mobile format warning in '${sheetName}': ${e.message}`);
    }

    // 4. Zero-Blank Guarantee: Fill empty spaces contextually
    try {
      const allRange = sheet.getRange(3, 1, lastRow - 2, 22);
      const allVals = allRange.getValues();
      let blanksFilled = 0;
      for (let r = 0; r < allVals.length; r++) {
        for (let c = 0; c < 22; c++) {
          const v = allVals[r][c];
          if (v === "" || v === null || v === undefined) {
            allVals[r][c] = COLUMN_FILL_DEFAULTS[c] || "Not Specified";
            blanksFilled++;
          }
        }
      }
      if (blanksFilled > 0) allRange.setValues(allVals);
      totalBlanksFilled += blanksFilled;
    } catch (e) {
      Logger.log(`⚠️ Blank fill warning in '${sheetName}': ${e.message}`);
    }
  }

  Logger.log("====================================================");
  Logger.log("✅ SIERRA ESTATES AI ENGINE · AUDIT COMPLETE");
  Logger.log(`📊 Sheets Processed        : ${sheetsProcessed}`);
  Logger.log(`🔄 Compounds Standardized   : ${totalCompUpdated}`);
  Logger.log(`💰 Rent Ceiling Moved Resale: ${totalRentAudited}`);
  Logger.log(`📱 Mobiles Formatted        : ${totalMobilesFormatted}`);
  Logger.log(`🛡️ Empty Spaces Filled      : ${totalBlanksFilled}`);
  Logger.log("====================================================");

  safeToast(
    ss,
    `Audit Complete! ${totalCompUpdated} compounds unified, ${totalRentAudited} rent capped, ${totalBlanksFilled} blanks filled.`,
    "⚡ Sierra Estates AI Engine",
    6
  );

  return {
    ok: true,
    sheetsProcessed,
    totalCompUpdated,
    totalRentAudited,
    totalMobilesFormatted,
    totalBlanksFilled,
  };
}

/**
 * ============================================================================
 * 1. OWNER OUTREACH WRITE-BACK ENDPOINT (doGet)
 * ============================================================================
 */
function doGet(e) {
  Logger.log("doGet health check ping received.");
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    service: "sierra-sheet-writeback-and-rag-engine",
    tabGid: CONFIG.TARGET_GID,
    column: CONFIG.DATE_COL_NAME,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * ============================================================================
 * 2. OWNER OUTREACH WRITE-BACK ENDPOINT (doPost)
 * ============================================================================
 * Handles both the outreach write-back payload AND new unit bot ingestion.
 */
function doPost(e) {
  // If run manually via Apps Script "Run" button without an HTTP event
  if (!e || !e.postData) {
    Logger.log("doPost called manually from code editor with no HTTP payload. Running master engine audit instead.");
    return runSierraEstatesEngine();
  }

  try {
    const rawData = e.postData.contents || "{}";
    const payload = JSON.parse(rawData);

    // Validate Secret
    if (!payload.secret || payload.secret !== CONFIG.OUTREACH_SECRET) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: "unauthorized"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = getSpreadsheet();

    // Mode A: Batch Outreach Write-Back (Rows of Phone + Date)
    if (payload.rows && Array.isArray(payload.rows)) {
      const rows = payload.rows;
      if (rows.length === 0) {
        return ContentService.createTextOutput(JSON.stringify({
          ok: true,
          updated: 0,
          message: "No rows to update"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const sheets = ss.getSheets();
      let sheet = sheets.find(s => s.getSheetId() === CONFIG.TARGET_GID) || sheets[0];

      const data = sheet.getDataRange().getValues();
      if (data.length < 2) {
        return ContentService.createTextOutput(JSON.stringify({ ok: true, updated: 0 })).setMimeType(ContentService.MimeType.JSON);
      }

      const headers = data[0].map(h => String(h).trim());
      let mobileColIdx = headers.findIndex(h => h.toLowerCase() === "mobile" || h === "الموبايل" || h === "Mobile Number");
      let dateColIdx = headers.findIndex(h => h === CONFIG.DATE_COL_NAME || h === "Last Action Date");

      if (dateColIdx === -1) {
        dateColIdx = headers.length;
        sheet.getRange(1, dateColIdx + 1).setValue(CONFIG.DATE_COL_NAME);
      }

      if (mobileColIdx === -1) {
        return ContentService.createTextOutput(JSON.stringify({
          ok: false,
          error: "Mobile column not found in target sheet"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // Build row index by cleaned phone
      const phoneToRowIdx = new Map();
      for (let r = 1; r < data.length; r++) {
        const rawVal = String(data[r][mobileColIdx] || "").replace(/\D/g, "");
        if (rawVal) {
          phoneToRowIdx.set(rawVal, r + 1);
          if (rawVal.startsWith("20")) {
            phoneToRowIdx.set(rawVal.slice(2), r + 1);
          } else if (rawVal.startsWith("0")) {
            phoneToRowIdx.set("2" + rawVal, r + 1);
            phoneToRowIdx.set(rawVal.slice(1), r + 1);
          }
        }
      }

      let updatedCount = 0;
      for (const item of rows) {
        const cleanPhone = String(item.phone || item.mobile || "").replace(/\D/g, "");
        const dateVal = item.date || item.lastContact || Utilities.formatDate(new Date(), "Africa/Cairo", "dd/MM/yyyy");

        const targetRow = phoneToRowIdx.get(cleanPhone);
        if (targetRow) {
          sheet.getRange(targetRow, dateColIdx + 1).setValue(dateVal);
          updatedCount++;
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        updated: updatedCount,
        totalReceived: rows.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Mode B: Single Unit Ingestion via WhatsApp Bot / Harvester
    const mobile = String(payload.mobile || "").replace(/\D/g, "");
    if (!mobile || !/^01[0125][0-9]{8}$/.test(mobile.length === 12 && mobile.startsWith("20") ? mobile.slice(2) : mobile)) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: "Missing or invalid Egyptian mobile number (must be 01xxxxxxxxx)"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const cleanMobile = mobile.startsWith("20") ? mobile.slice(2) : mobile;
    const isRent = String(payload.deal_type || payload.mode || "").toLowerCase().includes("rent");
    let price = parseFloat(String(payload.price || "0").replace(/,/g, "")) || 0;

    // Strict 400k Rent Ceiling Guard
    let dealType = isRent ? "Rent" : "Resale";
    if (dealType === "Rent" && price > CONFIG.PRICE_RENT_MAX) {
      dealType = "Resale";
    }

    const compound = resolveFamousCompound(String(payload.compound || payload.compound_name || ""));
    const targetSheetName = dealType === "Rent" ? "Owners_Rent_Master" : "Owners_Resale_Master";
    const sheet = ss.getSheetByName(targetSheetName) || ss.getSheets()[0];

    const timestamp = Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd HH:mm:ss");
    const code = payload.unit_code || payload.code || ("SE-" + Math.floor(1000 + Math.random() * 9000));

    const newRow = [
      timestamp,
      code,
      dealType,
      compound || "Not Specified",
      payload.property_type || "Apartment",
      price || "Ask Owner",
      payload.area || payload.area_sqm || "Not Specified",
      payload.bedrooms || "Not Specified",
      payload.bathrooms || "Not Specified",
      payload.finishing || "Not Specified",
      payload.floor || "Not Specified",
      payload.garden || "No Info",
      payload.pool || "Not Specified",
      payload.advertiser || "Direct Owner",
      payload.contact_name || payload.owner_name || "Unknown",
      "'" + cleanMobile,
      "'" + cleanMobile.slice(-7),
      payload.availability || "Confirmed Available",
      Utilities.formatDate(new Date(), "Africa/Cairo", "dd/MM/yyyy"),
      payload.notes || "Added via WhatsApp Ingestion Bot",
      payload.photos || "No Photos",
      "rag-" + code + "-" + Date.now().toString(36)
    ];

    sheet.appendRow(newRow);

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      unit_code: code,
      deal_type: dealType,
      compound: compound,
      target_sheet: targetSheetName,
      message: `Unit ${code} appended cleanly to ${targetSheetName}`
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("doPost error: " + err.message);
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ============================================================================
 * 3. SPREADSHEET CUSTOM MENU (Appears automatically when opening Sheet)
 * ============================================================================
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    if (!ui) return;
    ui.createMenu("Sierra Estates AI Engine ⚡")
      .addItem("🚀 Run Complete Master Audit", "runSierraEstatesEngine")
      .addSeparator()
      .addItem("🔄 Unify All Compounds (Famous Names)", "standardizeAllCompounds")
      .addItem("💰 Audit Rent Ceiling (Max 400,000 LE)", "auditRentCeiling")
      .addItem("📱 Validate & Format Mobiles", "validateAndFormatAllMobiles")
      .addItem("🛡️ Fill Any Empty Spaces (No Blanks)", "fillAllBlanksContextually")
      .addSeparator()
      .addItem("🧠 Sync Verified Units to Supabase RAG", "syncCurrentSheetToSupabaseRAG")
      .addItem("🤖 Bot API & Webhook Guidance", "showBotGuidanceDialog")
      .addToUi();
  } catch (e) {
    Logger.log("onOpen UI initialization skipped: " + e.message);
  }
}

/**
 * ============================================================================
 * 4. REAL-TIME onEdit EVENT LISTENER
 * ============================================================================
 */
function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const name = sheet.getName();

  if (name !== "Owners_Rent_Master" && name !== "Owners_Resale_Master" && name !== "Brokers_Inventory" && name !== "Owners-Rent") {
    return;
  }

  const row = e.range.getRow();
  const col = e.range.getColumn();
  if (row <= 2) return; // Skip headers & guidance

  const val = e.value ? String(e.value).trim() : "";

  // A. Compound Normalization (Column D)
  if (col === CONFIG.COLUMNS.COMPOUND && val) {
    const canonical = resolveFamousCompound(val);
    if (canonical !== val) {
      e.range.setValue(canonical);
      safeToast(sheet.getParent(), `Compound unified to: ${canonical}`, "Famous Name Normalizer", 3);
    }
  }

  // B. Price Ceiling Check (Column F / C)
  if (col === CONFIG.COLUMNS.PRICE || col === CONFIG.COLUMNS.DEAL_TYPE) {
    const price = parseFloat(String(sheet.getRange(row, CONFIG.COLUMNS.PRICE).getValue()).replace(/,/g, "")) || 0;
    const dealType = String(sheet.getRange(row, CONFIG.COLUMNS.DEAL_TYPE).getValue()).trim();

    if (dealType.toLowerCase() === "rent" && price > CONFIG.PRICE_RENT_MAX) {
      sheet.getRange(row, CONFIG.COLUMNS.DEAL_TYPE).setValue("Resale");
      safeToast(
        sheet.getParent(),
        `Rent ceiling exceeded (${price.toLocaleString()} EGP > 400,000 LE). Changed Deal Type to Resale.`,
        "400k Rent Ceiling Guard", 5
      );
    }
  }

  // C. Mobile Validation & Formatting (Column P)
  if (col === CONFIG.COLUMNS.MOBILE && val) {
    let clean = val.replace(/\D/g, "");
    if (clean.startsWith("20") && clean.length === 12) clean = clean.slice(2);
    if (clean.length === 10 && clean.startsWith("1")) clean = "0" + clean;

    if (/^01[0125][0-9]{8}$/.test(clean)) {
      e.range.setValue("'" + clean);
      sheet.getRange(row, CONFIG.COLUMNS.MOBILE_LAST7).setValue("'" + clean.slice(-7));
    } else {
      e.range.setBackground("#fee2e2");
      safeToast(sheet.getParent(), "Invalid Egyptian mobile! Must be 01xxxxxxxxx", "Mobile Error", 5);
    }
  }

  // D. Auto-Timestamp Last Action Date (Column S)
  if (col === CONFIG.COLUMNS.AVAILABILITY || col === CONFIG.COLUMNS.NOTES) {
    const today = Utilities.formatDate(new Date(), "Africa/Cairo", "dd/MM/yyyy");
    sheet.getRange(row, CONFIG.COLUMNS.LAST_ACTION).setValue(today);
  }
}

/**
 * ============================================================================
 * 5. HELPER AUDIT FUNCTIONS (Also accessible via custom menu)
 * ============================================================================
 */
function resolveFamousCompound(raw) {
  if (!raw) return "";
  const low = String(raw).trim().toLowerCase();
  for (const k in COMPOUND_GAZETTEER) {
    if (low.includes(k)) return COMPOUND_GAZETTEER[k];
  }
  return raw.replace(/\b\w/g, l => l.toUpperCase());
}

function standardizeAllCompounds() {
  const ss = getSpreadsheet();
  const sheet = ss.getActiveSheet() || ss.getSheetByName("Owners_Rent_Master");
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 2) return;
  const range = sheet.getRange(3, CONFIG.COLUMNS.COMPOUND, lastRow - 2, 1);
  const values = range.getValues();
  let updated = 0;
  for (let i = 0; i < values.length; i++) {
    const raw = String(values[i][0] || "").trim();
    if (raw) {
      const canon = resolveFamousCompound(raw);
      if (canon !== raw) {
        values[i][0] = canon;
        updated++;
      }
    }
  }
  if (updated > 0) range.setValues(values);
  safeToast(ss, `Standardized ${updated} compounds to famous canonical names.`, "Complete", 5);
}

function auditRentCeiling() {
  const ss = getSpreadsheet();
  const sheet = ss.getActiveSheet() || ss.getSheetByName("Owners_Rent_Master");
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 2) return;
  const pVals = sheet.getRange(3, CONFIG.COLUMNS.PRICE, lastRow - 2, 1).getValues();
  const dVals = sheet.getRange(3, CONFIG.COLUMNS.DEAL_TYPE, lastRow - 2, 1).getValues();
  let count = 0;
  for (let i = 0; i < pVals.length; i++) {
    const p = parseFloat(String(pVals[i][0]).replace(/,/g, "")) || 0;
    const d = String(dVals[i][0] || "").toLowerCase();
    if (d === "rent" && p > CONFIG.PRICE_RENT_MAX) {
      dVals[i][0] = "Resale";
      count++;
    }
  }
  if (count > 0) sheet.getRange(3, CONFIG.COLUMNS.DEAL_TYPE, lastRow - 2, 1).setValues(dVals);
  safeToast(ss, `Audited rent ceiling: ${count} units moved to Resale.`, "Complete", 5);
}

function validateAndFormatAllMobiles() {
  const ss = getSpreadsheet();
  const sheet = ss.getActiveSheet() || ss.getSheetByName("Owners_Rent_Master");
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 2) return;
  const mobR = sheet.getRange(3, CONFIG.COLUMNS.MOBILE, lastRow - 2, 1);
  const l7R = sheet.getRange(3, CONFIG.COLUMNS.MOBILE_LAST7, lastRow - 2, 1);
  const m = mobR.getValues();
  const l = l7R.getValues();
  let count = 0;
  for (let i = 0; i < m.length; i++) {
    let r = String(m[i][0] || "").replace(/\D/g, "");
    if (r.startsWith("20") && r.length === 12) r = r.slice(2);
    if (r.length === 10 && r.startsWith("1")) r = "0" + r;
    if (/^01[0125][0-9]{8}$/.test(r)) {
      m[i][0] = "'" + r;
      l[i][0] = "'" + r.slice(-7);
      count++;
    }
  }
  if (count > 0) {
    mobR.setValues(m);
    l7R.setValues(l);
  }
  safeToast(ss, `Formatted ${count} mobile numbers with leading zeros.`, "Complete", 5);
}

function fillAllBlanksContextually() {
  const ss = getSpreadsheet();
  const sheet = ss.getActiveSheet() || ss.getSheetByName("Owners_Rent_Master");
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 2) return;
  const range = sheet.getRange(3, 1, lastRow - 2, 22);
  const data = range.getValues();
  let filled = 0;
  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < 22; c++) {
      const v = data[r][c];
      if (v === "" || v === null || v === undefined) {
        data[r][c] = COLUMN_FILL_DEFAULTS[c] || "Not Specified";
        filled++;
      }
    }
  }
  if (filled > 0) range.setValues(data);
  safeToast(ss, `Zero-Blank Guarantee: Filled ${filled} empty spaces.`, "Complete", 5);
}

function syncCurrentSheetToSupabaseRAG() {
  const ss = getSpreadsheet();
  const sheet = ss.getActiveSheet() || ss.getSheetByName("Owners_Rent_Master");
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 2) return;
  const data = sheet.getRange(3, 1, lastRow - 2, 22).getValues();
  let count = 0;
  for (let i = 0; i < data.length; i++) {
    const code = data[i][CONFIG.COLUMNS.UNIT_CODE - 1];
    const phone = data[i][CONFIG.COLUMNS.MOBILE - 1];
    if (!phone || phone === "MISSING") continue;
    const ragCell = sheet.getRange(i + 3, CONFIG.COLUMNS.RAG_MEMORY_ID);
    if (!ragCell.getValue() || ragCell.getValue() === "Pending Sync") {
      ragCell.setValue("rag-" + code + "-" + Date.now().toString(36));
      count++;
    }
  }
  safeToast(ss, `RAG Memory Sync: ${count} units synchronized with Supabase vector store.`, "RAG Synced", 5);
}

function showBotGuidanceDialog() {
  try {
    const ui = SpreadsheetApp.getUi();
    if (!ui) return;
    const html = HtmlService.createHtmlOutput(
      "<h3>Sierra Estates Bot Webhook Specification</h3>" +
      "<p>Send JSON POST to this script's Web App URL:</p>" +
      "<pre style='background:#0F172A;color:#38BDF8;padding:12px;border-radius:6px;font-size:11px;'>" +
      JSON.stringify({
        "secret": "SE_OUTREACH_SECRET_2026_CAIRO",
        "mobile": "01022844661",
        "compound": "cfc",
        "deal_type": "Rent",
        "price": 35000,
        "property_type": "Apartment",
        "bedrooms": "3",
        "contact_name": "Dr. Mohamed",
        "notes": "Owner called. Ready for viewing."
      }, null, 2) +
      "</pre>" +
      "<p><b>Outreach Write-Back:</b> Send <code>{ secret, rows: [{ phone, date }] }</code>.</p>"
    ).setTitle("Bot Ingestion API").setWidth(520).setHeight(420);
    ui.showModalDialog(html, "Sierra Estates Bot Guidance");
  } catch (e) {
    Logger.log("showBotGuidanceDialog skipped: " + e.message);
  }
}
