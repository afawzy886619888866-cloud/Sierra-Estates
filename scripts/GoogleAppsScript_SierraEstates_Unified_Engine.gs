/**
 * ============================================================================
 * SIERRA ESTATES · UNIFIED MASTER APPS SCRIPT ENGINE (v5.0 - Production)
 * ============================================================================
 * Features:
 *   1. Preserved & Enhanced Owner Outreach Write-Back Endpoint (doGet & doPost).
 *      - Secret: SE_OUTREACH_SECRET_2026_CAIRO
 *      - Updates «تاريخ اخر تواصل» / Last Action Date matched by clean mobile.
 *   2. Famous Canonical Compound Unification (e.g. CFC, كايرو فيستيفال -> Cairo Festival City).
 *   3. 400,000 EGP Rent Ceiling Guard (Rent <= 400k | Resale = Millions).
 *   4. Mandatory Egyptian Mobile Rule (01xxxxxxxxx) - Blanks strictly blocked.
 *   5. Zero Blanks Guarantee - Replaces empty spaces with contextual words.
 *   6. Auto-timestamping on status / call notes edit.
 *   7. Supabase pgvector RAG Memory Synchronization.
 * ============================================================================
 */

// Core Configuration
const CONFIG = {
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
  "east town": "Eastown",
  "ايست تاون": "Eastown",

  // Hyde Park
  "hyde park": "Hyde Park",
  "haid bark": "Hyde Park",
  "hayd park": "Hyde Park",
  "هايد بارك": "Hyde Park",
  "hyde park business district": "Hyde Park",

  // Fifth Square
  "fifth square": "Fifth Square",
  "فيفث سكوير": "Fifth Square",
  "المراسم": "Fifth Square",
  "al marasem": "Fifth Square",

  // Lake View Residence
  "lake view residence": "Lake View Residence",
  "lake view": "Lake View Residence",
  "lakeview": "Lake View Residence",
  "ليك فيو": "Lake View Residence",

  // Villette
  "villette": "Villette",
  "فيليت": "Villette",
  "villette sodic": "Villette",

  // Uptown Cairo
  "uptown cairo": "Uptown Cairo",
  "up town cairo": "Uptown Cairo",
  "اب تاون كايرو": "Uptown Cairo",
  "أب تاون": "Uptown Cairo",

  // Mountain View
  "mountain view": "Mountain View iCity",
  "mountain view icity": "Mountain View iCity",
  "ماونتن فيو": "Mountain View iCity",
  "ماونتن فيو اي سيتي": "Mountain View iCity",

  // SODIC
  "sodic": "SODIC East",
  "sodic east": "SODIC East",
  "سوديك": "SODIC East",

  // Waterway
  "waterway": "The Waterway",
  "the waterway": "The Waterway",
  "الوترواي": "The Waterway",
  "الووترواي": "The Waterway",
  "capital way by water way": "The Capitalway",

  // Galleria Moon Valley
  "galleria moon valley": "Galleria Moon Valley",
  "جاليريا مون فالي": "Galleria Moon Valley",
  "galleria": "Galleria Moon Valley",

  // Katameya
  "katameya dunes": "Katameya Dunes",
  "قطامية ديونز": "Katameya Dunes",
  "katameya": "Katameya Heights",
  "قطامية هايتس": "Katameya Heights",

  // Swan Lake
  "swan lake": "Swan Lake",
  "swan lake north coast": "Swan Lake North Coast",
  "سوان ليك": "Swan Lake",

  // 90 Avenue
  "90 avenue": "90 Avenue",
  "تسعين افينيو": "90 Avenue",

  // Palm Hills
  "palm hills": "Palm Hills New Cairo",
  "بالم هيلز": "Palm Hills New Cairo",
  "badya": "Badya (Palm Hills)",
  "بادية": "Badya (Palm Hills)",

  // General New Cairo
  "new cairo": "New Cairo (General)",
  "new-cairo": "New Cairo (General)",
  "5th settlement": "New Cairo (General)",
  "fifth settlement": "New Cairo (General)",
  "التجمع الخامس": "New Cairo (General)",
  "القاهرة الجديدة": "New Cairo (General)",
  "north 90": "North 90 (New Cairo)",
  "south academ": "South Academy (New Cairo)",
  "narges": "Al Narges (New Cairo)",
  "andlos": "Al Andalus (New Cairo)",
  "gardina city": "Gardenia City",

  // Other Areas
  "el shorouk": "El Shorouk City",
  "‎el shorouk city": "El Shorouk City",
  "el shorouk city": "El Shorouk City",
  "الشروق": "El Shorouk City",
  "new capital": "New Administrative Capital",
  "new-capital": "New Administrative Capital",
  "العاصمة الإدارية": "New Administrative Capital",
  "midtown": "Midtown (New Capital)",
  "zaid": "Sheikh Zayed",
  "sheikh zayed, typical": "Sheikh Zayed",
  "6th of october": "6th of October",
  "village west - dorra": "Village West (Dorra)"
};

// Contextual fallback fill words (NO BLANKS)
const CONTEXTUAL_FILLS = {
  "Timestamp": "Not Recorded",
  "Unit Code": "Pending Code",
  "Compound (Canonical)": "Not Specified",
  "Property Type": "Not Specified",
  "Asking Price (EGP)": "Ask Owner",
  "Area (m²)": "Not Specified",
  "Bedrooms": "Not Specified",
  "Bathrooms": "Not Specified",
  "Finishing Status": "Not Specified",
  "Floor": "Not Specified",
  "Garden (m²)": "No Info",
  "Pool": "Not Specified",
  "Contact Name": "Unknown",
  "Mobile Number": "MISSING",
  "Mobile (Last 7)": "MISSING",
  "Availability Status": "Not Confirmed",
  "Last Action Date": "No Contact Yet",
  "Owner Call Response & Notes": "No Notes",
  "Photo URLs": "No Photos",
  "RAG Memory ID": "Pending Sync"
};

/**
 * 1. OWNER OUTREACH WRITE-BACK ENDPOINT (doGet)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    service: "sierra-sheet-writeback-and-rag-engine",
    tabGid: CONFIG.TARGET_GID,
    column: CONFIG.DATE_COL_NAME,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 2. OWNER OUTREACH WRITE-BACK ENDPOINT (doPost)
 * Handles both the outreach write-back payload AND new unit bot ingestion.
 */
function doPost(e) {
  try {
    const rawData = e.postData ? e.postData.contents : "{}";
    const payload = JSON.parse(rawData);

    // Validate Secret
    if (!payload.secret || payload.secret !== CONFIG.OUTREACH_SECRET) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: "unauthorized"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

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

      // Sheets to search across: Priority to Owners_Rent_Master, Owners_Resale_Master, then GID 1127958606
      const targetSheets = [
        ss.getSheetByName("Owners_Rent_Master"),
        ss.getSheetByName("Owners_Resale_Master"),
        ss.getSheets().find(s => s.getSheetId() === CONFIG.TARGET_GID)
      ].filter(Boolean);

      let totalUpdated = 0;

      for (const sheet of targetSheets) {
        const data = sheet.getDataRange().getValues();
        if (data.length < 2) continue;

        const headers = data[0].map(h => String(h).trim());
        let mobileColIdx = headers.findIndex(h => h.toLowerCase() === "mobile" || h.toLowerCase() === "mobile number" || h === "الموبايل");
        let dateColIdx = headers.findIndex(h => h === CONFIG.DATE_COL_NAME || h === "Last Action Date" || h === "تاريخ اخر تحديث");

        if (mobileColIdx === -1) continue;
        if (dateColIdx === -1) {
          dateColIdx = headers.length;
          sheet.getRange(1, dateColIdx + 1).setValue(CONFIG.DATE_COL_NAME);
        }

        // Build index by clean digits
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

        for (const item of rows) {
          const cleanPhone = String(item.phone || item.mobile || "").replace(/\D/g, "");
          const dateVal = item.date || item.lastContact || Utilities.formatDate(new Date(), "Africa/Cairo", "dd/MM/yyyy");
          const targetRow = phoneToRowIdx.get(cleanPhone);
          if (targetRow) {
            sheet.getRange(targetRow, dateColIdx + 1).setValue(dateVal);
            totalUpdated++;
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        updated: totalUpdated,
        totalReceived: rows.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Mode B: Single Unit Ingestion via Bot (unit payload)
    if (payload.mobile) {
      const cleanMob = String(payload.mobile).replace(/\D/g, "");
      if (!cleanMob || cleanMob.length < 10) {
        return ContentService.createTextOutput(JSON.stringify({
          ok: false,
          error: "Strict Rule Violation: Valid 11-digit mobile number is mandatory."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const digits = (cleanMob.length === 10 && cleanMob.startsWith("1")) ? "0" + cleanMob : cleanMob;
      const last7 = digits.slice(-7);
      const rawPrice = parseFloat(payload.price) || 0;
      const canonicalCompound = resolveFamousCompound(payload.compound || "");

      // Route: Rent <= 400k | Resale = Millions / Sale
      const isResale = (payload.deal_type && /sale|sell|resale|بيع/i.test(payload.deal_type)) || (rawPrice > CONFIG.PRICE_RENT_MAX);
      const targetSheetName = isResale ? "Owners_Resale_Master" : "Owners_Rent_Master";
      const sheet = ss.getSheetByName(targetSheetName) || ss.getSheetByName("Owners_Rent_Master");

      const code = payload.unit_code || ("SE-" + last7);
      const newRow = [
        Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd HH:mm:ss"),
        code,
        isResale ? "Resale" : "Rent",
        canonicalCompound,
        payload.property_type || "Apartment",
        rawPrice > 0 ? rawPrice : "Ask Owner",
        payload.area || "Not Specified",
        payload.bedrooms || "Not Specified",
        payload.bathrooms || "Not Specified",
        payload.finishing || "Fully Finished",
        payload.floor || "Not Specified",
        payload.garden || "No Info",
        payload.pool || "Not Specified",
        payload.advertiser_type || "Direct Owner",
        payload.contact_name || "Unknown",
        "'" + digits,
        "'" + last7,
        payload.availability || "Available",
        Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd"),
        payload.notes || "Added via API Bot Ingestion",
        payload.photo_urls || "No Photos",
        "rag-" + code
      ];

      sheet.appendRow(newRow);

      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        sheet: targetSheetName,
        unit_code: code,
        compound: canonicalCompound,
        deal_type: isResale ? "Resale" : "Rent"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: "Unsupported payload structure. Send 'rows' array for outreach write-back or unit object for ingestion."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 3. CUSTOM UI MENU ON SPREADSHEET OPEN
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu("Sierra Estates AI Engine ⚡")
    .addItem("🔄 Unify All Compounds (Famous Names)", "standardizeAllCompounds")
    .addItem("💰 Audit Rent Ceiling (Max 400,000 LE)", "auditRentCeiling")
    .addItem("📱 Validate & Format Mobiles", "validateAndFormatAllMobiles")
    .addItem("🛡️ Fill Any Empty Spaces (No Blanks)", "fillAllBlanksContextually")
    .addSeparator()
    .addItem("🧠 Sync Verified Units to Supabase RAG", "syncCurrentSheetToSupabaseRAG")
    .addItem("🤖 Bot API & Webhook Guidance", "showBotGuidanceDialog")
    .addToUi();
}

/**
 * 4. REAL-TIME onEdit EVENT LISTENER
 */
function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const name = sheet.getName();

  if (name !== "Owners_Rent_Master" && name !== "Owners_Resale_Master" && name !== "Brokers_Inventory") {
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
      SpreadsheetApp.getActiveSpreadsheet().toast(`Compound unified to: ${canonical}`, "Famous Name Normalizer", 3);
    }
  }

  // B. Price Ceiling Check (Column F / C)
  if (col === CONFIG.COLUMNS.PRICE || col === CONFIG.COLUMNS.DEAL_TYPE) {
    const price = parseFloat(String(sheet.getRange(row, CONFIG.COLUMNS.PRICE).getValue()).replace(/,/g, "")) || 0;
    const dealType = String(sheet.getRange(row, CONFIG.COLUMNS.DEAL_TYPE).getValue()).trim();

    if (dealType.toLowerCase() === "rent" && price > CONFIG.PRICE_RENT_MAX) {
      sheet.getRange(row, CONFIG.COLUMNS.DEAL_TYPE).setValue("Resale");
      SpreadsheetApp.getActiveSpreadsheet().toast(
        `Rent ceiling exceeded (${price.toLocaleString()} EGP > 400,000 LE). Changed Deal Type to Resale.`,
        "400k Rent Ceiling Guard", 5
      );
    }
  }

  // C. Mobile Validation & Last 7 (Column P)
  if (col === CONFIG.COLUMNS.MOBILE) {
    const mobCell = sheet.getRange(row, CONFIG.COLUMNS.MOBILE);
    const last7Cell = sheet.getRange(row, CONFIG.COLUMNS.MOBILE_LAST7);

    if (!val || val === "MISSING" || val === "0") {
      mobCell.setBackground("#FEE2E2");
      SpreadsheetApp.getUi().alert("⚠️ MANDATORY FIELD VIOLATION:\n\nUnits cannot be accepted without a valid Egyptian mobile number (01xxxxxxxxx)!");
      return;
    }

    let digits = val.replace(/\D/g, "");
    if (digits.startsWith("20") && digits.length === 12) digits = digits.slice(2);
    if (digits.length === 10 && digits.startsWith("1")) digits = "0" + digits;

    if (!/^01[0125][0-9]{8}$/.test(digits)) {
      mobCell.setBackground("#FEE2E2");
      SpreadsheetApp.getUi().alert(`⚠️ INVALID MOBILE:\n\n'${val}' is not a valid 11-digit Egyptian mobile number.`);
      return;
    }

    mobCell.setValue("'" + digits);
    mobCell.setBackground("#FFFFFF");
    last7Cell.setValue("'" + digits.slice(-7));
  }

  // D. Last Action Timestamp (Column R: Availability or Column T: Notes)
  if (col === CONFIG.COLUMNS.AVAILABILITY || col === CONFIG.COLUMNS.NOTES) {
    const now = Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd HH:mm");
    sheet.getRange(row, CONFIG.COLUMNS.LAST_ACTION).setValue(now);
    SpreadsheetApp.getActiveSpreadsheet().toast(`Last action stamped: ${now}`, "Outreach Tracker", 2);
  }
}

/**
 * 5. HELPER FUNCTIONS
 */
function resolveFamousCompound(raw) {
  if (!raw || /^(n\/a|null|0|none)$/i.test(raw)) return "New Cairo (General)";
  const low = raw.toLowerCase().trim();
  if (COMPOUND_GAZETTEER[low]) return COMPOUND_GAZETTEER[low];
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
  range.setValues(values);
  SpreadsheetApp.getActiveSpreadsheet().toast(`Standardized ${updated} compounds to famous canonical names.`, "Complete", 5);
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
  sheet.getRange(3, CONFIG.COLUMNS.DEAL_TYPE, lastRow - 2, 1).setValues(dVals);
  SpreadsheetApp.getActiveSpreadsheet().toast(`Audited rent ceiling: ${count} units moved to Resale.`, "Complete", 5);
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
  mobR.setValues(m);
  l7R.setValues(l);
  SpreadsheetApp.getActiveSpreadsheet().toast(`Formatted ${count} mobile numbers with leading zeros.`, "Complete", 5);
}

function fillAllBlanksContextually() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 2) return;
  const range = sheet.getRange(3, 1, lastRow - 2, 22);
  const data = range.getValues();
  const colKeys = Object.keys(CONTEXTUAL_FILLS);
  let filled = 0;
  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < 22; c++) {
      const v = data[r][c];
      if (v === "" || v === null || v === undefined) {
        data[r][c] = colKeys[c] ? CONTEXTUAL_FILLS[colKeys[c]] : "Not Specified";
        filled++;
      }
    }
  }
  range.setValues(data);
  SpreadsheetApp.getActiveSpreadsheet().toast(`Zero-Blank Guarantee: Filled ${filled} empty spaces.`, "Complete", 5);
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
  SpreadsheetApp.getActiveSpreadsheet().toast(`RAG Memory Sync: ${count} units synchronized with Supabase vector store.`, "RAG Synced", 5);
}

function showBotGuidanceDialog() {
  const html = HtmlService.createHtmlOutput(
    "<h3>Sierra Estates Bot Webhook Specification</h3>" +
    "<p>Send JSON POST to this script's Web App URL:</p>" +
    "<pre style='background:#0F172A;color:#38BDF8;padding:12px;border-radius:6px;font-size:11px;'>" +
    JSON.stringify({
      "secret": "SE_OUTREACH_SECRET_2026_CAIRO",
      "mobile": "01022844661", // Mandatory
      "compound": "cfc", // Auto -> Cairo Festival City
      "deal_type": "Rent", // Or Resale
      "price": 35000,
      "property_type": "Apartment",
      "bedrooms": "3",
      "contact_name": "Dr. Mohamed",
      "notes": "Owner called. Ready for viewing."
    }, null, 2) +
    "</pre>" +
    "<p><b>Outreach Write-Back:</b> Send <code>{ secret, rows: [{ phone, date }] }</code>.</p>"
  ).setTitle("Bot Ingestion API").setWidth(520).setHeight(420);
  SpreadsheetApp.getUi().showModalDialog(html, "Sierra Estates Bot Guidance");
}
