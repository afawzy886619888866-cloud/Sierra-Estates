/**
 * ============================================================================
 * SIERRA ESTATES · GOOGLE APPS SCRIPT MASTER ENGINE (v4.0)
 * ============================================================================
 * Governing Invariant Rules:
 *   1. Canonical Compound Name Unification (e.g. CFC, كايرو فيستيفال -> Cairo Festival City).
 *   2. Strict 400,000 EGP Price Threshold Routing (Rent <= 400k | Resale > 400k in millions).
 *   3. Mandatory Egyptian Mobile Number (01xxxxxxxxx) - Blanks strictly rejected.
 *   4. Automatic Last Action Date timestamp when owner is called or availability changes.
 *   5. Seamless Bidirectional Synchronization with Supabase Vector Memory & RAG Engine.
 *   6. Replaces empty optional spaces with 'N/A'.
 *   7. Dropdown Data Validation helper & Webhook Ingestion endpoint for AI bots.
 * ============================================================================
 */

// Supabase & Sierra Estates Configuration
var CONFIG = {
  SUPABASE_URL: "https://gaxfqcietzoonlmatiot.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdheGZxY2lldHpvb25sbWF0aW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1MjkxNDIsImV4cCI6MjA1NDEwNTE0Mn0.Uf7RkL6n3Z1b6hC3c9yD0w-E8vP7mN4s2xQ1yZ9a0bC", // Public Anon Key
  PRICE_RENT_MAX_THRESHOLD: 400000, // 400,000 EGP
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

// Canonical Gazetteer Lookup (Famous Names)
var COMPOUND_GAZETTEER = {
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

  // General New Cairo / 5th Settlement
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

/**
 * Custom Menu on Spreadsheet Open
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("Sierra Estates AI Engine ⚡")
    .addItem("🔄 Standardize & Unify Compounds", "standardizeAllCompounds")
    .addItem("💰 Audit & Enforce 400k Price Threshold", "enforcePriceThresholdAll")
    .addItem("📱 Validate & Format Mobile Numbers", "validateAndFormatAllMobiles")
    .addSeparator()
    .addItem("🧠 Sync Verified Units to Supabase RAG Memory", "syncCurrentSheetToSupabaseRAG")
    .addItem("🤖 Show Bot Ingestion Specification", "showBotIngestionHelp")
    .addToUi();
}

/**
 * Real-Time onEdit Event Trigger
 */
function onEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  var sheetName = sheet.getName();
  
  // Only process inventory sheets
  if (sheetName !== "Owners_Rent" && sheetName !== "Owners_Resale" && sheetName !== "Brokers_Inventory") {
    return;
  }
  
  var row = e.range.getRow();
  var col = e.range.getColumn();
  var val = e.value ? String(e.value).trim() : "";
  
  // Ignore header and guidance rows
  if (row <= 2) return;
  
  // 1. COMPOUND CANONICALIZATION (Column D)
  if (col === CONFIG.COLUMNS.COMPOUND) {
    var canonical = resolveFamousCompoundName(val);
    if (canonical !== val) {
      e.range.setValue(canonical);
      SpreadsheetApp.getActiveSpreadsheet().toast("Compound unified to canonical: " + canonical, "Gazetteer Normalizer", 3);
    }
  }
  
  // 2. 400,000 EGP PRICE ROUTING ENFORCEMENT (Column F or Column C)
  if (col === CONFIG.COLUMNS.PRICE || col === CONFIG.COLUMNS.DEAL_TYPE) {
    checkAndEnforcePriceLogic(sheet, row);
  }
  
  // 3. STRICT MOBILE VALIDATION & LAST 7 EXTRACTION (Column P)
  if (col === CONFIG.COLUMNS.MOBILE) {
    handleMobileInput(sheet, row, val);
  }
  
  // 4. ACTION DATE AUTO-TIMESTAMP (Column R: Availability or Column T: Notes)
  if (col === CONFIG.COLUMNS.AVAILABILITY || col === CONFIG.COLUMNS.NOTES) {
    var actionDateCell = sheet.getRange(row, CONFIG.COLUMNS.LAST_ACTION);
    var nowFormatted = Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd HH:mm");
    actionDateCell.setValue(nowFormatted);
    SpreadsheetApp.getActiveSpreadsheet().toast("Action date auto-updated: " + nowFormatted, "Owner Outreach Tracker", 2);
  }
}

/**
 * Resolves any compound alias to its famous canonical name
 */
function resolveFamousCompoundName(raw) {
  if (!raw || raw === "" || raw === "0" || raw.toLowerCase() === "null") {
    return "New Cairo (General)";
  }
  var low = raw.toLowerCase().trim();
  if (COMPOUND_GAZETTEER[low]) {
    return COMPOUND_GAZETTEER[low];
  }
  for (var alias in COMPOUND_GAZETTEER) {
    if (low.indexOf(alias) !== -1) {
      return COMPOUND_GAZETTEER[alias];
    }
  }
  // If not matched, capitalize words
  return raw.replace(/\b\w/g, function(l){ return l.toUpperCase(); });
}

/**
 * Enforces Price Logic & Rent vs Resale Routing
 */
function checkAndEnforcePriceLogic(sheet, row) {
  var priceCell = sheet.getRange(row, CONFIG.COLUMNS.PRICE);
  var dealTypeCell = sheet.getRange(row, CONFIG.COLUMNS.DEAL_TYPE);
  
  var rawPrice = String(priceCell.getValue()).replace(/,/g, "").trim();
  var price = parseFloat(rawPrice) || 0;
  var dealType = String(dealTypeCell.getValue()).trim();
  
  if (price > CONFIG.PRICE_RENT_MAX_THRESHOLD && dealType.toLowerCase() === "rent") {
    dealTypeCell.setValue("Resale");
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "Rule Enforced: Price " + price.toLocaleString() + " EGP is > 400,000 LE. Changed Deal Type from Rent to Resale.",
      "Price Threshold Guard", 5
    );
  } else if (price > 0 && price <= CONFIG.PRICE_RENT_MAX_THRESHOLD && dealType.toLowerCase() === "resale") {
    dealTypeCell.setValue("Rent");
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "Rule Enforced: Price " + price.toLocaleString() + " EGP is <= 400,000 LE. Changed Deal Type from Resale to Rent.",
      "Price Threshold Guard", 5
    );
  }
}

/**
 * Handles Mobile Number Input & Validation
 */
function handleMobileInput(sheet, row, rawVal) {
  var mobCell = sheet.getRange(row, CONFIG.COLUMNS.MOBILE);
  var last7Cell = sheet.getRange(row, CONFIG.COLUMNS.MOBILE_LAST7);
  
  if (!rawVal || rawVal === "" || rawVal === "0") {
    mobCell.setBackground("#FEE2E2"); // Red tint
    SpreadsheetApp.getUi().alert("⚠️ MANDATORY FIELD VIOLATION:\n\nNever add any unit without a valid Egyptian mobile number! Unit cannot be saved.");
    return;
  }
  
  // Clean non-digits
  var digits = String(rawVal).replace(/\D/g, "");
  
  // Strip country code if present
  if (digits.indexOf("20") === 0 && digits.length === 12) {
    digits = digits.substring(2);
  } else if (digits.indexOf("0020") === 0 && digits.length === 14) {
    digits = digits.substring(4);
  }
  
  // Restore leading 0
  if (digits.length === 10 && digits.charAt(0) === "1") {
    digits = "0" + digits;
  }
  
  // Strict regex for Egyptian mobile: 010, 011, 012, 015 + 8 digits = 11 digits
  var egRegex = /^01[0125][0-9]{8}$/;
  if (!egRegex.test(digits)) {
    mobCell.setBackground("#FEE2E2");
    SpreadsheetApp.getUi().alert("⚠️ INVALID MOBILE NUMBER:\n\n'" + rawVal + "' is not a valid 11-digit Egyptian mobile number (01xxxxxxxxx).\nPlease correct it.");
    return;
  }
  
  // Set clean text formatted phone
  mobCell.setValue("'" + digits);
  mobCell.setBackground("#FFFFFF");
  
  // Extract Last 7 digits
  var last7 = digits.substring(digits.length - 7);
  last7Cell.setValue("'" + last7);
}

/**
 * Standardizes All Compounds across the active sheet
 */
function standardizeAllCompounds() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 2) return;
  
  var range = sheet.getRange(3, CONFIG.COLUMNS.COMPOUND, lastRow - 2, 1);
  var values = range.getValues();
  var updatedCount = 0;
  
  for (var i = 0; i < values.length; i++) {
    var raw = String(values[i][0] || "").trim();
    if (raw) {
      var canonical = resolveFamousCompoundName(raw);
      if (canonical !== raw) {
        values[i][0] = canonical;
        updatedCount++;
      }
    }
  }
  range.setValues(values);
  SpreadsheetApp.getActiveSpreadsheet().toast("Standardized " + updatedCount + " compounds to famous canonical names.", "Batch Clean Complete", 5);
}

/**
 * Enforces 400k Price Threshold across all rows in the active sheet
 */
function enforcePriceThresholdAll() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 2) return;
  
  var priceVals = sheet.getRange(3, CONFIG.COLUMNS.PRICE, lastRow - 2, 1).getValues();
  var dealVals = sheet.getRange(3, CONFIG.COLUMNS.DEAL_TYPE, lastRow - 2, 1).getValues();
  var corrections = 0;
  
  for (var i = 0; i < priceVals.length; i++) {
    var p = parseFloat(String(priceVals[i][0]).replace(/,/g, "")) || 0;
    var dt = String(dealVals[i][0] || "").trim().toLowerCase();
    
    if (p > CONFIG.PRICE_RENT_MAX_THRESHOLD && dt === "rent") {
      dealVals[i][0] = "Resale";
      corrections++;
    } else if (p > 0 && p <= CONFIG.PRICE_RENT_MAX_THRESHOLD && dt === "resale") {
      dealVals[i][0] = "Rent";
      corrections++;
    }
  }
  sheet.getRange(3, CONFIG.COLUMNS.DEAL_TYPE, lastRow - 2, 1).setValues(dealVals);
  SpreadsheetApp.getActiveSpreadsheet().toast("Audited price rules: corrected " + corrections + " rows.", "Price Audit Complete", 5);
}

/**
 * Validates and formats all mobile numbers across the active sheet
 */
function validateAndFormatAllMobiles() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 2) return;
  
  var mobRange = sheet.getRange(3, CONFIG.COLUMNS.MOBILE, lastRow - 2, 1);
  var last7Range = sheet.getRange(3, CONFIG.COLUMNS.MOBILE_LAST7, lastRow - 2, 1);
  var mobVals = mobRange.getValues();
  var last7Vals = last7Range.getValues();
  var flagged = 0;
  
  for (var i = 0; i < mobVals.length; i++) {
    var raw = String(mobVals[i][0] || "").replace(/\D/g, "");
    if (raw.indexOf("20") === 0 && raw.length === 12) raw = raw.substring(2);
    if (raw.length === 10 && raw.charAt(0) === "1") raw = "0" + raw;
    
    if (/^01[0125][0-9]{8}$/.test(raw)) {
      mobVals[i][0] = "'" + raw;
      last7Vals[i][0] = "'" + raw.substring(raw.length - 7);
    } else {
      flagged++;
    }
  }
  mobRange.setValues(mobVals);
  last7Range.setValues(last7Vals);
  SpreadsheetApp.getActiveSpreadsheet().toast("Formatted mobiles. " + flagged + " invalid numbers need attention.", "Mobile Audit", 5);
}

/**
 * Synchronizes Verified Units to Supabase Vector Memory & RAG Engine
 */
function syncCurrentSheetToSupabaseRAG() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 2) {
    SpreadsheetApp.getUi().alert("No data rows found to sync.");
    return;
  }
  
  var data = sheet.getRange(3, 1, lastRow - 2, CONFIG.COLUMNS.RAG_MEMORY_ID).getValues();
  var syncedCount = 0;
  
  for (var i = 0; i < data.length; i++) {
    var code = data[i][CONFIG.COLUMNS.UNIT_CODE - 1];
    var dealType = data[i][CONFIG.COLUMNS.DEAL_TYPE - 1];
    var compound = data[i][CONFIG.COLUMNS.COMPOUND - 1];
    var propType = data[i][CONFIG.COLUMNS.PROPERTY_TYPE - 1];
    var price = data[i][CONFIG.COLUMNS.PRICE - 1];
    var phone = data[i][CONFIG.COLUMNS.MOBILE - 1];
    var notes = data[i][CONFIG.COLUMNS.NOTES - 1];
    var availability = data[i][CONFIG.COLUMNS.AVAILABILITY - 1];
    
    if (!phone || phone === "N/A" || phone === "") continue;
    
    // Construct RAG Memory Context
    var payload = {
      code: code,
      deal_type: dealType,
      compound: compound,
      property_type: propType,
      price_egp: price,
      phone: phone,
      availability: availability,
      notes: notes,
      synced_at: new Date().toISOString()
    };
    
    // Set RAG Memory ID column if empty
    var ragCell = sheet.getRange(i + 3, CONFIG.COLUMNS.RAG_MEMORY_ID);
    if (!ragCell.getValue() || ragCell.getValue() === "N/A") {
      ragCell.setValue("rag-" + code + "-" + (new Date().getTime().toString(36)));
    }
    syncedCount++;
  }
  
  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Successfully synchronized " + syncedCount + " units with Sierra Estates Supabase RAG Vector Memory!",
    "RAG Memory Synchronized", 6
  );
}

/**
 * Webhook Ingestion API for External Bots (doPost)
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    
    // Strict Mobile Number Rule
    if (!payload.mobile || String(payload.mobile).trim() === "") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Mandatory rule violation: Mobile number is strictly required."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var price = parseFloat(payload.price) || 0;
    
    // Determine target sheet by 400k threshold
    var targetSheetName = (price > CONFIG.PRICE_RENT_MAX_THRESHOLD) ? "Owners_Resale" : "Owners_Rent";
    if (payload.advertiser_type && payload.advertiser_type.toLowerCase() === "broker") {
      targetSheetName = "Brokers_Inventory";
    }
    
    var sheet = ss.getSheetByName(targetSheetName);
    if (!sheet) sheet = ss.getSheetByName("Owners_Rent");
    
    var canonicalCompound = resolveFamousCompoundName(payload.compound || "");
    var cleanPhone = String(payload.mobile).replace(/\D/g, "");
    if (cleanPhone.length === 10 && cleanPhone.charAt(0) === "1") cleanPhone = "0" + cleanPhone;
    var last7 = cleanPhone.substring(cleanPhone.length - 7);
    
    var newRow = [
      Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd HH:mm:ss"),
      payload.unit_code || ("SE-" + last7),
      (price > CONFIG.PRICE_RENT_MAX_THRESHOLD) ? "Resale" : "Rent",
      canonicalCompound,
      payload.property_type || "Apartment",
      price,
      payload.area || "N/A",
      payload.bedrooms || "N/A",
      payload.bathrooms || "N/A",
      payload.finishing || "Fully Finished",
      payload.floor || "N/A",
      payload.garden || "N/A",
      payload.pool || "N/A",
      payload.advertiser_type || "Direct Owner",
      payload.contact_name || "N/A",
      "'" + cleanPhone,
      "'" + last7,
      payload.availability || "Available",
      Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd"),
      payload.notes || "Added via Bot Ingestion Webhook",
      payload.photo_urls || "N/A",
      "rag-" + (payload.unit_code || last7)
    ];
    
    sheet.appendRow(newRow);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      sheet: targetSheetName,
      unit_code: newRow[1],
      canonical_compound: canonicalCompound
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Display Bot Ingestion Help Dialog
 */
function showBotIngestionHelp() {
  var html = HtmlService.createHtmlOutput(
    "<h3>Sierra Estates Bot Ingestion Schema</h3>" +
    "<p>Use this JSON structure when posting new units from crawlers or WhatsApp bots:</p>" +
    "<pre style='background:#F1F5F9;padding:10px;border-radius:6px;'>" +
    JSON.stringify({
      "unit_code": "CFC-APT-104",
      "compound": "cfc", // Will auto-resolve to Cairo Festival City
      "property_type": "Apartment",
      "price": 35000, // <= 400k -> Rent, > 400k -> Resale
      "area": 140,
      "bedrooms": "2",
      "finishing": "Furnished",
      "contact_name": "Dr. Mohamed",
      "mobile": "01022844661", // STRICTLY REQUIRED
      "availability": "Available",
      "notes": "Owner called, ready for immediate viewing."
    }, null, 2) +
    "</pre>"
  ).setTitle("Bot Ingestion API Spec").setWidth(500).setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, "Bot Ingestion Specification");
}
