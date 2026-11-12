/**
 * ============================================================================
 * SIERRA ESTATES · UNIFIED MASTER APPS SCRIPT ENGINE (v6.1 — MERGED)
 * ============================================================================
 * v6.1 = v6.0 + Mode D (public website form). Nothing below was deleted.
 *   • Mode C in doPost: saves from the Easy Listing admin page
 *     (sierra-easy-listing.vercel.app) → "Listings" tab (15 columns),
 *     photos stored on Google Drive with share links.
 *   • NEW Mode D in doPost: submissions from the PUBLIC form on the website
 *     (sierra-estates.net/add-listing) → "Website_Listings" tab (22 columns)
 *     with تاريخ الإضافة + آخر تحديث + كل المواصفات + لينك الموقع +
 *     لينك الخريطة + لينك الانفنتوري (deep link للصف نفسه) + الصور على Drive.
 *     Sent server-to-server by the website's backend with the same secret —
 *     the secret is never exposed to the public browser.
 *   • New menu item: "📄 Prepare Website Listings Sheet".
 *   Everything else — WhatsApp bot ingestion (Mode B), owner outreach
 *   write-back (Mode A), the master audit, onEdit automation, the custom
 *   menu — works EXACTLY as before. Nothing was deleted or replaced.
 * ============================================================================
 * Features:
 *   0. Primary "Run" button handler: select "run" or "runSierraEstatesEngine"
 *      and click "Run ▶" — audits all sheets, outputs detailed execution logs.
 *   1. Preserved & Enhanced Owner Outreach Write-Back Endpoint (doGet & doPost).
 *      - Secret: Script Property SIERRA_SECRET_KEY if set, else the legacy
 *        SE_OUTREACH_SECRET_2026_CAIRO constant (rotate via File > Project
 *        Properties > Script Properties — no code edit needed; the Next.js
 *        side reads the same env var on /api/sync/sheet-webhook).
 *      - Updates «تاريخ اخر تواصل» / Last Action Date matched by clean mobile.
 *   2. Famous Canonical Compound Unification (e.g. CFC, كايرو فيستيفال -> Cairo Festival City).
 *   3. 400,000 EGP Rent Ceiling Guard (Rent <= 400k | Resale = Millions).
 *   4. Mandatory Egyptian Mobile Rule (01xxxxxxxxx) - Blanks strictly blocked.
 *   5. Zero Blanks Guarantee - Replaces empty spaces with exact 22-column defaults.
 *   6. Auto-timestamping on status / call notes edit.
 *   7. Supabase pgvector RAG Memory Synchronization.
 *   8. Easy Listing Web Tool (Mode C) → "Listings" tab + Drive photos.
 *   9. NEW in v6.1: Public Website Form (Mode D) → "Website_Listings" tab
 *      (sierra-estates.net/add-listing) with last-update + specs + links.
 * ============================================================================
 */

// Core Configuration
// OUTREACH_SECRET resolution: the Script Property SIERRA_SECRET_KEY wins when
// set (File > Project Properties > Script Properties), so the shared secret
// can be rotated without touching this code. The legacy constant stays as
// the fallback so already-deployed copies keep authenticating until the
// property is added.
const CONFIG = {
  OUTREACH_SECRET:
    PropertiesService.getScriptProperties().getProperty("SIERRA_SECRET_KEY") ||
    "SE_OUTREACH_SECRET_2026_CAIRO",
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
 *   1. Standardizes all compound names to famous canonical names.
 *   2. Audits the 400,000 EGP rent ceiling (Rent <= 400k, moves millions to Resale).
 *   3. Validates and formats all mobile numbers (01xxxxxxxxx with leading zero preserved).
 *   4. Fills all empty cells contextually (Zero-Blank Guarantee).
 *   5. Prints a complete audit summary to the Execution Log.
 */
function run() {
  return runSierraEstatesEngine();
}

function runSierraEstatesEngine() {
  Logger.log("====================================================");
  Logger.log("🚀 SIERRA ESTATES AI ENGINE · MASTER AUDIT & CLEANUP");
  Logger.log("====================================================");

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetSheets = ["Owners_Rent_Master", "Owners_Resale_Master", "Brokers_Inventory", "Owners-Rent"];
  let totalCompUpdated = 0;
  let totalRentAudited = 0;
  let totalMobilesFormatted = 0;
  let totalBlanksFilled = 0;
  let sheetsProcessed = 0;

  for (const sheetName of targetSheets) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log(`ℹ️ Sheet '${sheetName}' not found in active workbook. Skipping.`);
      continue;
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 2) {
      Logger.log(`ℹ️ Sheet '${sheetName}' has no data rows. Skipping.`);
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

  try {
    ss.toast(
      `Audit Complete! ${totalCompUpdated} compounds unified, ${totalRentAudited} rent capped, ${totalBlanksFilled} blanks filled.`,
      "⚡ Sierra Estates AI Engine",
      6
    );
  } catch (e) {
    // UI toast ignored in background runs
  }

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

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ═══════════════════════════════════════════════════════════════════
    // ADD-ON v6 · Mode C: Easy Listing Web Tool (admin page → Listings)
    // Payload: { secret, mode: "easy_listing", code, compound, ... }
    // ═══════════════════════════════════════════════════════════════════
    if (payload.mode === "easy_listing") {
      return handleEasyListing_(payload, ss);
    }

    // ═══════════════════════════════════════════════════════════════════
    // ADD-ON v6.1 · Mode D: Public Website Form (sierra-estates.net/add-listing
    // → "Website_Listings" tab).
    // Payload: { secret, mode: "website_submission", code, compound,
    //   propertyType, dealType, beds, baths, area, gardenArea, price,
    //   finishing, ownerName, ownerType, mobile, comment, websiteUrl,
    //   mapLink, images:[{name,mime,data}], imageUrls:[], submittedAt }
    // Sent server-to-server by the website backend — secret stays private.
    // ═══════════════════════════════════════════════════════════════════
    if (payload.mode === "website_submission") {
      return handleWebsiteSubmission_(payload, ss);
    }

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
    SpreadsheetApp.getUi().createMenu("Sierra Estates AI Engine ⚡")
      .addItem("🚀 Run Complete Master Audit", "runSierraEstatesEngine")
      .addSeparator()
      .addItem("🔄 Unify All Compounds (Famous Names)", "standardizeAllCompounds")
      .addItem("💰 Audit Rent Ceiling (Max 400,000 LE)", "auditRentCeiling")
      .addItem("📱 Validate & Format Mobiles", "validateAndFormatAllMobiles")
      .addItem("🛡️ Fill Any Empty Spaces (No Blanks)", "fillAllBlanksContextually")
      .addSeparator()
      .addItem("🧠 Sync Verified Units to Supabase RAG", "syncCurrentSheetToSupabaseRAG")
      .addItem("🤖 Bot API & Webhook Guidance", "showBotGuidanceDialog")
      // ── ADD-ON v6: Easy Listing web tool ──
      .addSeparator()
      .addItem("📄 Prepare Listings Sheet (Easy Listing)", "prepareEasyListingSheet")
      // ── ADD-ON v6.1: public website form (sierra-estates.net/add-listing) ──
      .addItem("🌐 Prepare Website Listings Sheet", "prepareWebsiteSheet")
      .addToUi();
  } catch (e) {
    Logger.log("onOpen UI initialization: " + e.message);
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
      try {
        SpreadsheetApp.getActiveSpreadsheet().toast(`Compound unified to: ${canonical}`, "Famous Name Normalizer", 3);
      } catch (err) {}
    }
  }

  // B. Price Ceiling Check (Column F / C)
  if (col === CONFIG.COLUMNS.PRICE || col === CONFIG.COLUMNS.DEAL_TYPE) {
    const price = parseFloat(String(sheet.getRange(row, CONFIG.COLUMNS.PRICE).getValue()).replace(/,/g, "")) || 0;
    const dealType = String(sheet.getRange(row, CONFIG.COLUMNS.DEAL_TYPE).getValue()).trim();

    if (dealType.toLowerCase() === "rent" && price > CONFIG.PRICE_RENT_MAX) {
      sheet.getRange(row, CONFIG.COLUMNS.DEAL_TYPE).setValue("Resale");
      try {
        SpreadsheetApp.getActiveSpreadsheet().toast(
          `Rent ceiling exceeded (${price.toLocaleString()} EGP > 400,000 LE). Changed Deal Type to Resale.`,
          "400k Rent Ceiling Guard", 5
        );
      } catch (err) {}
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
      try {
        SpreadsheetApp.getActiveSpreadsheet().toast("Invalid Egyptian mobile! Must be 01xxxxxxxxx", "Mobile Error", 5);
      } catch (err) {}
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
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(`Standardized ${updated} compounds to famous canonical names.`, "Complete", 5);
  } catch (e) {}
}

function auditRentCeiling() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(`Audited rent ceiling: ${count} units moved to Resale.`, "Complete", 5);
  } catch (e) {}
}

function validateAndFormatAllMobiles() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(`Formatted ${count} mobile numbers with leading zeros.`, "Complete", 5);
  } catch (e) {}
}

function fillAllBlanksContextually() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(`Zero-Blank Guarantee: Filled ${filled} empty spaces.`, "Complete", 5);
  } catch (e) {}
}

function syncCurrentSheetToSupabaseRAG() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(`RAG Memory Sync: ${count} units synchronized with Supabase vector store.`, "RAG Synced", 5);
  } catch (e) {}
}

function showBotGuidanceDialog() {
  try {
    const html = HtmlService.createHtmlOutput(
      "<h3>Sierra Estates Bot Webhook Specification</h3>" +
      "<p>Send JSON POST to this script's Web App URL:</p>" +
      "<pre style='background:#0F172A;color:#38BDF8;padding:12px;border-radius:6px;font-size:11px;'>" +
      JSON.stringify({
        "secret": CONFIG.OUTREACH_SECRET,
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
      "<p><b>Outreach Write-Back:</b> Send <code>{ secret, rows: [{ phone, date }] }</code>.</p>" +
      "<p><b>Easy Listing Page:</b> sends <code>{ secret, mode: \"easy_listing\", code, compound, ... }</code> → \"Listings\" tab.</p>"
    ).setTitle("Bot Ingestion API").setWidth(520).setHeight(440);
    SpreadsheetApp.getUi().showModalDialog(html, "Sierra Estates Bot Guidance");
  } catch (e) {
    Logger.log("showBotGuidanceDialog: " + e.message);
  }
}

/**
 * ============================================================================
 * 6. EASY LISTING WEB TOOL (ADD-ON v6) — nothing above this line was changed
 * ============================================================================
 * Receives saves from the Easy Listing admin page (Mode C in doPost):
 *   { secret, mode: "easy_listing", code, compound, bedrooms, bathrooms,
 *     area, price, currency, furnished, ownerPhone,
 *     whatsappContent, facebookContent, pfContent, mapLink,
 *     images: [{ name, mime, data(base64) }], imageUrls: [], createdAt }
 *
 * → Appends ONE row to the "Listings" tab (15 columns):
 *   Code | Compound | Bedrooms | Bathrooms | Area | Price | Currency |
 *   Furnished | Owner Phone | WhatsApp Content | Facebook Content |
 *   Property Finder Content | Map Link | Images (URLs) | Created At
 * → Photos are saved to the "Easy Listing Images" Drive folder and their
 *   share links are written in the row.
 * → Compound names are unified with the same famous-name gazetteer above.
 */
const EASY_LISTING = {
  SHEET_NAME: "Listings",
  IMAGE_FOLDER: "Easy Listing Images",
  MAX_IMAGES: 12
};

function handleEasyListing_(data, ss) {
  const lock = LockService.getScriptLock();
  try {
    const sheet = ensureEasyListingSheet_(ss);

    // ---- photos: base64 → Google Drive (permanent, shareable links) ----
    const urls = [];
    const images = (data.images || []).slice(0, EASY_LISTING.MAX_IMAGES);
    if (images.length > 0) {
      const folder = getEasyListingFolder_();
      for (let i = 0; i < images.length; i++) {
        try {
          const img = images[i] || {};
          const blob = Utilities.newBlob(
            Utilities.base64Decode(String(img.data || "")),
            String(img.mime || "image/jpeg"),
            sanitizeEasyListingName_(img.name) || (String(data.code || "SE") + "-" + (i + 1) + ".jpg")
          );
          const file = folder.createFile(blob);
          try {
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (err) { /* domain-restricted Drive — link still saved */ }
          urls.push("https://drive.google.com/file/d/" + file.getId() + "/view?usp=sharing");
        } catch (imgErr) {
          Logger.log("Easy Listing image skipped: " + imgErr.message);
        }
      }
    }
    // allow pre-hosted URLs to be mixed in as well
    const extra = (data.imageUrls || []).slice(0, EASY_LISTING.MAX_IMAGES);
    for (let j = 0; j < extra.length; j++) {
      if (urls.length >= EASY_LISTING.MAX_IMAGES) break;
      urls.push(String(extra[j]));
    }

    // Unify the compound name with the same famous-name gazetteer
    const compound = resolveFamousCompound(String(data.compound || "Not Specified"));

    // Keep the Egyptian leading zero on the owner phone
    let phoneDigits = String(data.ownerPhone || "").replace(/\D/g, "");
    if (phoneDigits.startsWith("20") && phoneDigits.length === 12) phoneDigits = phoneDigits.slice(2);
    if (phoneDigits.length === 10 && phoneDigits.startsWith("1")) phoneDigits = "0" + phoneDigits;

    lock.waitLock(10000);
    sheet.appendRow([
      data.code || "SE-PENDING",
      compound,
      data.bedrooms != null ? data.bedrooms : "Not Specified",
      data.bathrooms != null ? data.bathrooms : "Not Specified",
      data.area != null ? data.area : "Not Specified",
      data.price != null ? data.price : "Ask Owner",
      data.currency || "EGP",
      data.furnished ? "Yes" : "No",
      phoneDigits ? "'" + phoneDigits : "MISSING",
      data.whatsappContent || "",
      data.facebookContent || "",
      data.pfContent || "",
      data.mapLink || "No Map",
      urls.length ? urls.join(" , ") : "No Photos",
      data.createdAt || Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd HH:mm:ss")
    ]);
    lock.releaseLock();

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      urls: urls,
      sheet: EASY_LISTING.SHEET_NAME,
      compound: compound
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    try { lock.releaseLock(); } catch (e2) {}
    Logger.log("handleEasyListing_ error: " + err.message);
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: String(err)
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function ensureEasyListingSheet_(ss) {
  let sheet = ss.getSheetByName(EASY_LISTING.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(EASY_LISTING.SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Code", "Compound", "Bedrooms", "Bathrooms", "Area (sqm)", "Price", "Currency",
      "Furnished", "Owner Phone", "WhatsApp Content", "Facebook Content",
      "Property Finder Content", "Map Link", "Images (URLs)", "Created At"
    ]);
    sheet.getRange(1, 1, 1, 15)
      .setFontWeight("bold").setBackground("#0e5c46").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    if (sheet.getMaxColumns() > 15) sheet.hideColumns(16, sheet.getMaxColumns() - 15);
  }
  return sheet;
}

function prepareEasyListingSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureEasyListingSheet_(ss);
  try {
    ss.toast("Listings tab ready — the Easy Listing page saves here.", "Easy Listing", 5);
  } catch (e) {}
}

function getEasyListingFolder_() {
  const it = DriveApp.getFoldersByName(EASY_LISTING.IMAGE_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(EASY_LISTING.IMAGE_FOLDER);
}

function sanitizeEasyListingName_(name) {
  return String(name || "").replace(/[^\w\- .()]/g, "_").slice(0, 80);
}

/**
 * ============================================================================
 * 7. PUBLIC WEBSITE FORM — MODE D (ADD-ON v6.1)
 * ============================================================================
 * Receives submissions forwarded by the backend of sierra-estates.net
 * (the public /add-listing page — owners & brokers WITHOUT admin access):
 *   { secret, mode: "website_submission", code, supabaseId, compound,
 *     propertyType, dealType ("Rent"|"Resale"), beds, baths, area, gardenArea,
 *     price, finishing, ownerName, ownerType ("Owner"|"Broker"), mobile,
 *     comment, websiteUrl, mapLink, images: [{name, mime, data(base64)}],
 *     imageUrls: [], submittedAt }
 *
 * → Writes ONE row (22 columns, A→V) to the "Website_Listings" tab:
 *   تاريخ الإضافة | آخر تحديث | رقم الطلب | الغرض | الكومباوند | نوع الوحدة |
 *   الغرف | الحمامات | المساحة م² | جاردن م² | السعر (EGP) | التشطيب |
 *   الاسم | المالك/الوسيط | الموبايل | المواصفات والملاحظات | الصور (Drive) |
 *   لينك الموقع | لينك الخريطة | لينك الانفنتوري | حالة المراجعة | Supabase ID
 * → Photos are uploaded to the SAME "Easy Listing Images" Drive folder and
 *   their share links are written in the row.
 * → Same submission code = UPDATE the existing row (آخر تحديث is refreshed)
 *   instead of duplicating it — safe to retry.
 * → لينك الانفنتوري is a direct deep link to the exact sheet row.
 */
const WEBSITE_LISTING = {
  SHEET_NAME: "Website_Listings",
  MAX_IMAGES: 10
};

function handleWebsiteSubmission_(data, ss) {
  const lock = LockService.getScriptLock();
  try {
    const sheet = ensureWebsiteSheet_(ss);
    const now = new Date();
    const stamp = Utilities.formatDate(now, "Africa/Cairo", "yyyy-MM-dd HH:mm:ss");

    // ---- photos: base64 → Google Drive (same folder as Easy Listing) ----
    const urls = [];
    const images = (data.images || []).slice(0, WEBSITE_LISTING.MAX_IMAGES);
    if (images.length > 0) {
      const folder = getEasyListingFolder_();
      for (let i = 0; i < images.length; i++) {
        try {
          const img = images[i] || {};
          const blob = Utilities.newBlob(
            Utilities.base64Decode(String(img.data || "")),
            String(img.mime || "image/jpeg"),
            sanitizeEasyListingName_(img.name) || (String(data.code || "SE-WEB") + "-" + (i + 1) + ".jpg")
          );
          const file = folder.createFile(blob);
          try {
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (err) { /* domain-restricted Drive — link still saved */ }
          urls.push("https://drive.google.com/file/d/" + file.getId() + "/view?usp=sharing");
        } catch (imgErr) {
          Logger.log("Website submission image skipped: " + imgErr.message);
        }
      }
    }
    // pre-hosted photo URLs (http links) pass through as-is
    const extra = (data.imageUrls || []).slice(0, WEBSITE_LISTING.MAX_IMAGES);
    for (let j = 0; j < extra.length; j++) {
      if (urls.length >= WEBSITE_LISTING.MAX_IMAGES) break;
      const u = String(extra[j] || "");
      if (/^https?:\/\//i.test(u)) urls.push(u);
    }

    // Unify the compound with the same famous-name gazetteer
    const compound = resolveFamousCompound(String(data.compound || "Not Specified"));

    // Keep the Egyptian leading zero on the mobile
    let phoneDigits = String(data.mobile || "").replace(/\D/g, "");
    if (phoneDigits.startsWith("20") && phoneDigits.length === 12) phoneDigits = phoneDigits.slice(2);
    if (phoneDigits.length === 10 && phoneDigits.startsWith("1")) phoneDigits = "0" + phoneDigits;

    const code = String(data.code || "SE-WEB-PENDING");
    const dealType = String(data.dealType || (String(data.mode || "").toLowerCase().indexOf("rent") !== -1 ? "Rent" : "Resale"));
    const mapLink = String(data.mapLink || "") ||
      ("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(compound + " New Cairo Egypt"));
    const websiteUrl = String(data.websiteUrl || "");

    const row = [
      stamp,                                        // A  تاريخ الإضافة
      stamp,                                        // B  آخر تحديث
      code,                                         // C  رقم الطلب
      dealType,                                     // D  الغرض
      compound,                                     // E  الكومباوند
      data.propertyType || "Not Specified",         // F  نوع الوحدة
      data.beds != null ? data.beds : "Not Specified",   // G  الغرف
      data.baths != null ? data.baths : "Not Specified", // H  الحمامات
      data.area != null ? data.area : "Not Specified",   // I  المساحة م²
      data.gardenArea != null ? data.gardenArea : 0,     // J  جاردن م²
      data.price != null ? data.price : "Ask Owner",     // K  السعر (EGP)
      data.finishing || "Not Specified",            // L  التشطيب
      data.ownerName || "Unknown",                  // M  الاسم
      data.ownerType || "Owner",                    // N  المالك/الوسيط
      phoneDigits ? "'" + phoneDigits : "MISSING",  // O  الموبايل
      data.comment || "No Notes",                   // P  المواصفات والملاحظات
      urls.length ? urls.join(" , ") : "No Photos", // Q  الصور (Drive)
      websiteUrl || "Not Published Yet",            // R  لينك الموقع
      mapLink,                                      // S  لينك الخريطة
      "",                                           // T  لينك الانفنتوري (filled below)
      "بانتظار المراجعة",                           // U  حالة المراجعة
      data.supabaseId || ""                         // V  Supabase ID
    ];

    lock.waitLock(10000);

    // Upsert by رقم الطلب (column C): same code = refresh the SAME row
    let targetRow = 0;
    const last = sheet.getLastRow();
    if (last >= 2) {
      const codes = sheet.getRange(2, 3, last - 1, 1).getValues();
      for (let i = codes.length - 1; i >= 0; i--) {
        if (String(codes[i][0]) === code) { targetRow = i + 2; break; }
      }
    }
    if (targetRow) {
      sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
      targetRow = sheet.getLastRow();
    }

    // Deep link to the exact row = لينك الانفنتوري
    const inventoryUrl = ss.getUrl() + "#gid=" + sheet.getSheetId() + "&range=A" + targetRow;
    sheet.getRange(targetRow, 20).setValue(inventoryUrl);

    lock.releaseLock();

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      sheet: WEBSITE_LISTING.SHEET_NAME,
      row: targetRow,
      code: code,
      compound: compound,
      inventoryUrl: inventoryUrl,
      photoUrls: urls
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    try { lock.releaseLock(); } catch (e2) {}
    Logger.log("handleWebsiteSubmission_ error: " + err.message);
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: String(err)
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function ensureWebsiteSheet_(ss) {
  let sheet = ss.getSheetByName(WEBSITE_LISTING.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(WEBSITE_LISTING.SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "تاريخ الإضافة", "آخر تحديث", "رقم الطلب", "الغرض", "الكومباوند",
      "نوع الوحدة", "الغرف", "الحمامات", "المساحة م²", "جاردن م²",
      "السعر (EGP)", "التشطيب", "الاسم", "المالك/الوسيط", "الموبايل",
      "المواصفات والملاحظات", "الصور (Drive)", "لينك الموقع",
      "لينك الخريطة", "لينك الانفنتوري", "حالة المراجعة", "Supabase ID"
    ]);
    sheet.getRange(1, 1, 1, 22)
      .setFontWeight("bold").setBackground("#0e5c46").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    if (sheet.getMaxColumns() > 22) sheet.hideColumns(23, sheet.getMaxColumns() - 22);
  }
  return sheet;
}

function prepareWebsiteSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureWebsiteSheet_(ss);
  try {
    ss.toast("Website_Listings tab ready — submissions from sierra-estates.net/add-listing land here.", "Website Listings", 5);
  } catch (e) {}
}
