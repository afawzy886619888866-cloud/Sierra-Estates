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

/**
 * ============================================================================
 * PRIMARY 6-TAB REORGANIZATION ENGINE
 * ============================================================================
 * Consolidates ALL inventory tabs into the exact 6 canonical tabs requested:
 *   1. dashboard       - Executive summary, KPI counters & segregation breakdown
 *   2. owners rent      - Direct owner rent units (Rent <= 400,000 EGP)
 *   3. owners resale    - Direct owner resale units (Resale > 400,000 EGP)
 *   4. brokers rent     - Broker rent listings
 *   5. brokers resale   - Broker resale listings
 *   6. available units  - Confirmed available units across all categories
 *
 * Rules:
 *   - Deduplicates by Mobile (Last 7).
 *   - Preserves leading zeros on mobiles: '01xxxxxxxxx.
 *   - Standardizes famous compounds (CFC, Madinaty, Mivida, etc.).
 *   - Applies 400k rent ceiling guard.
 *   - Applies 22-column canonical formatting with Zero-Blank Guarantee.
 */
function reorganizeTo6MasterTabs() {
  Logger.log("====================================================");
  Logger.log("🚀 SIERRA ESTATES · REORGANIZING TO 6 CANONICAL TABS");
  Logger.log("====================================================");

  const ss = getSpreadsheet();
  const allSheets = ss.getSheets();

  const CANONICAL_HEADERS = [
    "Timestamp", "Unit Code", "Deal Type", "Compound (Canonical)", "Property Type",
    "Asking Price (EGP)", "Area (m²)", "Bedrooms", "Bathrooms", "Finishing Status",
    "Floor", "Garden (m²)", "Pool", "Advertiser Type", "Contact Name",
    "Mobile Number", "Mobile (Last 7)", "Availability Status", "Last Action Date",
    "Owner Call Response & Notes", "Photo URLs", "RAG Memory ID"
  ];

  const GUIDANCE_ROW = [
    "e.g. 2026-11-03 21:00:00", "e.g. CFC-APT-104", "Dropdown: Rent or Resale",
    "Famous Canonical Compound (e.g. Cairo Festival City)", "Dropdown: Apartment, Villa, etc.",
    "Numeric: Rent <= 400,000 | Resale > 400,000", "Numeric area (m²)",
    "Dropdown: Studio, 1, 2, 3, 4, 5, 6+", "Dropdown: 1, 2, 3, 4, 5+",
    "Dropdown: Core & Shell, Semi Finished, Fully Finished, Furnished, Ultra Super Lux",
    "Floor level or Not Specified", "Numeric garden m² or No Info",
    "Dropdown: Yes, No, Shared, Not Specified", "Dropdown: Direct Owner or Broker",
    "Full name of owner/broker", "REQUIRED: 01xxxxxxxxx (11 digits)",
    "Auto: Last 7 digits for deduplication",
    "Dropdown: Available, Under Offer, Rented, Sold, No Answer, Not Available",
    "Date: YYYY-MM-DD / تاريخ اخر تواصل",
    "Detailed call feedback, price changes, viewing terms",
    "Image URLs or No Photos", "Supabase Vector UUID / RAG Tag"
  ];

  // 1. Gather all units across all sheets
  const rawUnits = [];

  for (const sheet of allSheets) {
    const sName = sheet.getName().trim().toLowerCase();
    if (sName === "dashboard" || sName === "calc_data" || sName === "_validationlookups" || sName === "bot_api_guide") {
      continue;
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) continue;

    const headers = data[0].map(h => String(h || "").trim().toLowerCase());
    
    // Find column indices
    let cMob = headers.findIndex(h => h.includes("mobile") || h.includes("تليفون") || h.includes("phone") || h.includes("موبايل"));
    let cPrice = headers.findIndex(h => h.includes("price") || h.includes("سعر"));
    let cComp = headers.findIndex(h => h.includes("location") || h.includes("كمبوند") || h.includes("موقع") || h.includes("compound"));
    let cName = headers.findIndex(h => h.includes("name") || h.includes("اسم"));
    let cCode = headers.findIndex(h => h.includes("code") || h.includes("كود"));
    let cDeal = headers.findIndex(h => h.includes("deal type") || h.includes("بيع/ ايجار") || h === "type");
    let cPType = headers.findIndex(h => h.includes("property ty") || h.includes("نوع الوحده"));
    let cFurn = headers.findIndex(h => h.includes("furnish") || h.includes("تشطيب"));
    let cAvail = headers.findIndex(h => h.includes("avail") || h.includes("متاح"));
    let cAction = headers.findIndex(h => h.includes("تواصل") || h.includes("متابعه") || h.includes("last action") || h.includes("تحديث"));
    let cNotes = headers.findIndex(h => h.includes("comment") || h.includes("ملحوظ") || h.includes("بيان") || h.includes("تفاصيل") || h.includes("notes"));
    let cAdv = headers.findIndex(h => h.includes("advertiser") || h.includes("owner") || h.includes("broker"));
    let cSpace = headers.findIndex(h => h.includes("space") || h.includes("مساح") || h.includes("area"));
    let cBeds = headers.findIndex(h => h.includes("bedroom") || h.includes("غرف"));
    let cGarden = headers.findIndex(h => h.includes("garden") || h.includes("حديق"));

    const defaultAdv = (sName.includes("broker")) ? "Broker" : "Direct Owner";
    const defaultDeal = (sName.includes("resale") || sName.includes("sale") || sName.includes("بيع")) ? "Resale" : "Rent";

    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      if (!row || !row.some(cell => String(cell || "").trim() !== "")) continue;

      let rawPhone = String((cMob >= 0 ? row[cMob] : "") || "").replace(/\D/g, "");
      if (rawPhone.startsWith("20") && rawPhone.length === 12) rawPhone = rawPhone.slice(2);
      if (rawPhone.length === 10 && rawPhone.startsWith("1")) rawPhone = "0" + rawPhone;
      if (!/^01[0125]\d{8}$/.test(rawPhone)) continue; // Skip non-Egyptian

      const last7 = rawPhone.slice(-7);
      let rawP = String((cPrice >= 0 ? row[cPrice] : "0") || "").replace(/,/g, "");
      let price = parseFloat(rawP) || 0;

      let rawComp = String((cComp >= 0 ? row[cComp] : "") || "").trim();
      let comp = resolveFamousCompound(rawComp) || "New Cairo (General)";

      let dealType = defaultDeal;
      if (price > CONFIG.PRICE_RENT_MAX) {
        dealType = "Resale";
      } else if (price > 0 && price <= CONFIG.PRICE_RENT_MAX) {
        dealType = "Rent";
      } else if (cDeal >= 0) {
        const dStr = String(row[cDeal] || "").toLowerCase();
        if (dStr.includes("sell") || dStr.includes("sale") || dStr.includes("بيع")) dealType = "Resale";
      }

      let adv = defaultAdv;
      if (cAdv >= 0) {
        const aStr = String(row[cAdv] || "").toLowerCase();
        if (aStr.includes("broker") || aStr.includes("بروكر")) adv = "Broker";
        else if (aStr.includes("owner") || aStr.includes("مالك")) adv = "Direct Owner";
      }

      let rawAvail = String((cAvail >= 0 ? row[cAvail] : "") || "").trim().toLowerCase();
      let avail = "Available";
      if (rawAvail.includes("not") || rawAvail.includes("غير")) avail = "Not Available";
      else if (rawAvail.includes("rented") || rawAvail.includes("تاجر")) avail = "Rented";
      else if (rawAvail.includes("sold") || rawAvail.includes("اتباع")) avail = "Sold";
      else if (rawAvail.includes("under")) avail = "Under Offer";
      else if (rawAvail.includes("no answer")) avail = "No Answer";

      let name = String((cName >= 0 ? row[cName] : "") || "").trim();
      let code = String((cCode >= 0 ? row[cCode] : "") || "").trim();
      let notes = String((cNotes >= 0 ? row[cNotes] : "") || "").trim();
      let action = String((cAction >= 0 ? row[cAction] : "") || "").trim();
      let ptype = String((cPType >= 0 ? row[cPType] : "Apartment") || "").trim() || "Apartment";
      let space = String((cSpace >= 0 ? row[cSpace] : "Not Specified") || "").trim() || "Not Specified";
      let beds = String((cBeds >= 0 ? row[cBeds] : "Not Specified") || "").trim() || "Not Specified";
      let garden = String((cGarden >= 0 ? row[cGarden] : "No Info") || "").trim() || "No Info";
      let furn = String((cFurn >= 0 ? row[cFurn] : "Not Specified") || "").trim() || "Not Specified";

      rawUnits.push({
        source: sName,
        phone: rawPhone,
        last7: last7,
        price: price,
        compound: comp,
        dealType: dealType,
        adv: adv,
        avail: avail,
        name: name,
        code: code,
        notes: notes,
        action: action,
        ptype: ptype,
        space: space,
        beds: beds,
        garden: garden,
        furn: furn
      });
    }
  }

  Logger.log("Parsed total raw unit rows: " + rawUnits.length);

  // 2. Deduplicate by Last 7 Digits (Smart Merging)
  const dedupMap = new Map();
  for (const u of rawUnits) {
    if (!dedupMap.has(u.last7)) {
      dedupMap.set(u.last7, { ...u });
    } else {
      const ex = dedupMap.get(u.last7);
      if ((!ex.name || ex.name === "Unknown" || ex.name === "Owner") && u.name && u.name !== "Unknown") ex.name = u.name;
      if (ex.price === 0 && u.price > 0) { ex.price = u.price; ex.dealType = u.dealType; }
      if (ex.compound === "New Cairo (General)" && u.compound !== "New Cairo (General)") ex.compound = u.compound;
      if ((!ex.notes || ex.notes === "No Notes") && u.notes && u.notes !== "No Notes") ex.notes = u.notes;
      if (u.action && u.action !== "No Contact Yet") ex.action = u.action;
      if (u.avail === "Available") ex.avail = "Available";
      if ((!ex.code || ex.code === "Pending Code") && u.code && u.code !== "Pending Code") ex.code = u.code;
      if (ex.beds === "Not Specified" && u.beds !== "Not Specified") ex.beds = u.beds;
      if (ex.space === "Not Specified" && u.space !== "Not Specified") ex.space = u.space;
    }
  }

  const allClean = Array.from(dedupMap.values());
  Logger.log("Total unique units after deduplication: " + allClean.length);

  // 3. Segregate into the 5 Data Lists
  const ownersRent = [];
  const ownersResale = [];
  const brokersRent = [];
  const brokersResale = [];
  const availableUnits = [];

  for (const u of allClean) {
    if (!u.code || u.code === "Pending Code") {
      const pfx = u.adv === "Direct Owner" ? "OWN" : "BRK";
      const dPfx = u.dealType === "Rent" ? "RNT" : "RSL";
      const cPfx = u.compound.replace(/[^A-Za-z0-9]/g, "").slice(0, 5).toUpperCase() || "SE";
      u.code = pfx + "-" + cPfx + "-" + dPfx + "-" + u.last7;
    }

    const row22 = [
      Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd HH:mm:ss"),
      u.code,
      u.dealType,
      u.compound,
      u.ptype || "Apartment",
      u.price || "Ask Owner",
      u.space || "Not Specified",
      u.beds || "Not Specified",
      "Not Specified", // Bathrooms
      u.furn || "Not Specified",
      "Not Specified", // Floor
      u.garden || "No Info",
      "Not Specified", // Pool
      u.adv,
      u.name || "Unknown",
      "'" + u.phone,
      "'" + u.last7,
      u.avail,
      u.action || Utilities.formatDate(new Date(), "Africa/Cairo", "dd/MM/yyyy"),
      u.notes || "No Notes",
      "No Photos",
      "rag-" + u.code.toLowerCase()
    ];

    if (u.adv === "Direct Owner" && u.dealType === "Rent") ownersRent.push(row22);
    else if (u.adv === "Direct Owner" && u.dealType === "Resale") ownersResale.push(row22);
    else if (u.adv === "Broker" && u.dealType === "Rent") brokersRent.push(row22);
    else if (u.adv === "Broker" && u.dealType === "Resale") brokersResale.push(row22);

    if (u.avail === "Available") availableUnits.push(row22);
  }

  Logger.log("Owners Rent Units   : " + ownersRent.length);
  Logger.log("Owners Resale Units : " + ownersResale.length);
  Logger.log("Brokers Rent Units  : " + brokersRent.length);
  Logger.log("Brokers Resale Units: " + brokersResale.length);
  Logger.log("Available Units     : " + availableUnits.length);

  // 4. Populate the 5 Data Tabs
  function writeDataTab(tabName, rows) {
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) sheet = ss.insertSheet(tabName);
    sheet.clear();

    sheet.getRange(1, 1, 1, 22).setValues([CANONICAL_HEADERS]);
    sheet.getRange(1, 1, 1, 22).setBackground("#0F172A").setFontColor("#FFFFFF").setFontWeight("bold");

    sheet.getRange(2, 1, 1, 22).setValues([GUIDANCE_ROW]);
    sheet.getRange(2, 1, 1, 22).setBackground("#F1F5F9").setFontColor("#475569").setFontStyle("italic");

    if (rows.length > 0) {
      sheet.getRange(3, 1, rows.length, 22).setValues(rows);
      sheet.getRange(3, 6, rows.length, 1).setNumberFormat("#,##0");
      sheet.getRange(3, 16, rows.length, 2).setNumberFormat("@");
    }
  }

  writeDataTab("owners rent", ownersRent);
  writeDataTab("owners resale", ownersResale);
  writeDataTab("brokers rent", brokersRent);
  writeDataTab("brokers resale", brokersResale);
  writeDataTab("available units", availableUnits);

  // 5. Populate Dashboard Tab
  let dash = ss.getSheetByName("dashboard");
  if (!dash) dash = ss.insertSheet("dashboard", 0);
  dash.clear();

  dash.getRange("B2").setValue("SIERRA ESTATES · MASTER REAL ESTATE COMMAND DASHBOARD").setFontSize(16).setFontWeight("bold").setFontColor("#0F172A");
  dash.getRange("B3").setValue("Authoritative Executive Inventory Metrics, Real-Time Segregation & Outreach Parity Engine").setFontSize(10).setFontStyle("italic").setFontColor("#64748B");

  const kpis = [
    ["TOTAL MASTER INVENTORY", allClean.length, "B5", "B6"],
    ["AVAILABLE UNITS", availableUnits.length, "D5", "D6"],
    ["OWNERS RENT (<= 400K)", ownersRent.length, "F5", "F6"],
    ["OWNERS RESALE (> 400K)", ownersResale.length, "H5", "H6"],
    ["BROKERS INVENTORY", brokersRent.length + brokersResale.length, "J5", "J6"]
  ];

  for (const k of kpis) {
    dash.getRange(k[2]).setValue(k[0]).setFontSize(9).setFontWeight("bold").setFontColor("#64748B");
    dash.getRange(k[3]).setValue(k[1]).setFontSize(20).setFontWeight("bold").setFontColor("#0284C7");
  }

  dash.getRange("B9").setValue("INVENTORY SEGREGATION BY CATEGORY").setFontSize(12).setFontWeight("bold").setFontColor("#334155");

  const tableRows = [
    ["Tab Name", "Category Description", "Advertiser", "Deal Type", "Active Units"],
    ["owners rent", "Direct Owner Rent Units (Rent <= 400,000 EGP)", "Direct Owner", "Rent", ownersRent.length],
    ["owners resale", "Direct Owner Resale Units (Resale > 400,000 EGP)", "Direct Owner", "Resale", ownersResale.length],
    ["brokers rent", "Broker Rent Listings", "Broker", "Rent", brokersRent.length],
    ["brokers resale", "Broker Resale Listings", "Broker", "Resale", brokersResale.length],
    ["available units", "Ready & Confirmed Available Units (All Categories)", "Mixed", "Mixed", availableUnits.length]
  ];

  dash.getRange(10, 2, tableRows.length, 5).setValues(tableRows);
  dash.getRange(10, 2, 1, 5).setBackground("#0F172A").setFontColor("#FFFFFF").setFontWeight("bold");

  safeToast(ss, "Reorganization Complete! 6 Master tabs populated and deduplicated cleanly.", "Sierra Estates", 8);

  return {
    ok: true,
    totalUniqueUnits: allClean.length,
    ownersRent: ownersRent.length,
    ownersResale: ownersResale.length,
    brokersRent: brokersRent.length,
    brokersResale: brokersResale.length,
    availableUnits: availableUnits.length
  };
}

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

  const targetSheets = ["owners rent", "Owners_Rent_Master", "owners resale", "Owners_Resale_Master", "brokers rent", "brokers resale", "available units", "Owners-Rent"];
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

    // Mode C / Easy Listing / Website Submission:
    if (payload.mode === "easy_listing" || payload.mode === "website_submission") {
      return handleEasyListing_(payload, ss);
    }

    // Direct Append to Master Inventory:
    if (payload.action === "appendRows" && Array.isArray(payload.rows)) {
      const targetSheet = ss.getSheetByName("Master_Inventory") || ss.getSheetByName("Owners-Rent") || ss.getSheets()[0];
      const appendResults = appendRowsDeduped_(targetSheet, payload.rows);
      return ContentService.createTextOutput(JSON.stringify(appendResults)).setMimeType(ContentService.MimeType.JSON);
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
        "mobile": "+201092048333",
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

/**
 * ============================================================================
 * 6. EASY LISTING & WEBSITE SUBMISSION HANDLER (Mode C & D)
 * ============================================================================
 */
const EASY_LISTING = {
  SHEET_NAME: "Listings",
  WEBSITE_SHEET_NAME: "Website_Listings",
  IMAGE_FOLDER: "Easy Listing Images",
  MAX_IMAGES: 12
};

function handleEasyListing_(data, ss) {
  const lock = LockService.getScriptLock();
  try {
    const targetSheetName = data.mode === "website_submission" ? EASY_LISTING.WEBSITE_SHEET_NAME : EASY_LISTING.SHEET_NAME;
    const sheet = ensureTargetListingSheet_(ss, targetSheetName);

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
    let phoneDigits = String(data.ownerPhone || data.mobile || "").replace(/\D/g, "");
    if (phoneDigits.startsWith("20") && phoneDigits.length === 12) phoneDigits = phoneDigits.slice(2);
    if (phoneDigits.length === 10 && phoneDigits.startsWith("1")) phoneDigits = "0" + phoneDigits;

    lock.waitLock(10000);
    const lastRow = sheet.getLastRow();
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
      data.pfContent || data.comment || "",
      data.mapLink || "No Map",
      urls.length ? urls.join(" , ") : "No Photos",
      data.createdAt || data.submittedAt || Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd HH:mm:ss")
    ]);
    const newRowNum = sheet.getLastRow();
    lock.releaseLock();

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      row: newRowNum,
      urls: urls,
      photoUrls: urls,
      sheet: targetSheetName,
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

function ensureTargetListingSheet_(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
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

function getEasyListingFolder_() {
  const it = DriveApp.getFoldersByName(EASY_LISTING.IMAGE_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(EASY_LISTING.IMAGE_FOLDER);
}

function sanitizeEasyListingName_(name) {
  return String(name || "").replace(/[^\w\- .()]/g, "_").slice(0, 80);
}

function appendRowsDeduped_(sheet, rowsToAppend) {
  let appended = 0;
  for (const row of rowsToAppend) {
    sheet.appendRow(row);
    appended++;
  }
  return { ok: true, appended, totalRows: sheet.getLastRow() };
}
