/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GoogleAppsScript_SierraEstates_MasterInventory_v7.gs
 * Mission 3 (2026-11-01) — Master_Inventory + Real_Available_Units engine.
 * ═══════════════════════════════════════════════════════════════════════════
 * Companion to workflows/14-sheets-supabase-sync/sync.js (the Node side of
 * the two-way sync). This script enforces the SAME rules inside the sheet:
 *
 *   TABS
 *     Master_Inventory       23-col historical & operational ledger (A:W)
 *     Real_Available_Units   live view — ONLY Listing_Status = 'Available'
 *                            AND Contact_Status = 'Verified Available'
 *
 *   RULES (owner order 2026-11-01)
 *     1. NO PHONE = REJECT      — a row without a valid 01xxxxxxxxx mobile
 *                                 is refused and highlighted red.
 *     2. NO BLANK CELLS         — missing non-mandatory fields become "NULL".
 *     3. DEAL TYPE ↔ PRICE      — Rent > 400,000 EGP/month flags; a rent
 *                                 price >= 1,000,000 EGP auto-classifies to
 *                                 "Resale".
 *     4. CANONICAL COMPOUND     — Arabic/English/slang → famous canonical
 *                                 name (COMPOUND_GAZETTEER below).
 *     5. SMART CODING (BMM/SE)  — [Compound_Initials][Agent_Initials]-[ID].
 *     6. DROPDOWNS              — Deal_Type, Compound, Unit_Type,
 *                                 Furnishing, Finishing, Contact_Status,
 *                                 Listing_Status (applyDropdowns()).
 *
 *   INSTALL
 *     Extensions → Apps Script → paste → run installTriggers() once.
 *     Menu "🛰️ Sierra Sync" appears with the manual actions.
 */

var MASTER_TAB = 'Master_Inventory';
var REAL_TAB = 'Real_Available_Units';

var HEADERS = [
  'Unit_Code', 'Date_Added', 'Last_Action_Timestamp', 'Deal_Type',
  'Canonical_Compound', 'Unit_Type', 'Area_SQM', 'Bedrooms', 'Bathrooms',
  'Floor', 'Furnishing', 'Finishing', 'Price_EGP', 'AI_Fair_Price_Benchmark',
  'Is_Featured_Gem', 'Owner_Name_Internal', 'Owner_Mobile_Internal',
  'Contact_Status', 'Listing_Status', 'Sourced_By_Agent',
  'Verified_By_Employee', 'Media_Links', 'Notes'
];

var COL = {};
HEADERS.forEach(function (h, i) { COL[h] = i + 1; });

var DROPDOWNS = {
  Deal_Type: ['Rent', 'Resale', 'Sale', 'Primary'],
  Unit_Type: ['Apartment', 'Villa', 'Townhouse', 'Twinhouse', 'Penthouse', 'Duplex', 'Studio', 'Chalet', 'Office', 'Retail', 'Land'],
  Furnishing: ['Furnished', 'Semi-Furnished', 'Unfurnished', 'Fully Furnished', 'Kitchen Appliances & ACs'],
  Finishing: ['Without Finishing', 'Semi-Finished', 'Core & Shell', 'Lux', 'Super Lux', 'Ultra Super Lux', 'Fully Finished'],
  Contact_Status: ['Not Contacted Yet', 'Contacted - No Answer', 'Contacted - Answered', 'Verified Available', 'Not Available', 'Sold', 'Rented'],
  Listing_Status: ['Pending Verification', 'Available', 'Unavailable', 'Sold', 'Rented', 'Archived', 'DQE Flag — price variance']
};

var RENT_CEILING = 400000;
var RESALE_THRESHOLD = 1000000;

// Canonical compound gazetteer (mirror of workflows/lib/compound-canonical.js).
var COMPOUND_GAZETTEER = {
  'cfc': 'Cairo Festival City', 'cairo festival city': 'Cairo Festival City',
  'cairo festival': 'Cairo Festival City', 'كايرو فيستيفال': 'Cairo Festival City',
  'كايرو فيستيفال سيتي': 'Cairo Festival City',
  'madinaty': 'Madinaty', 'مدينتي': 'Madinaty',
  'rehab': 'Al Rehab', 'al rehab': 'Al Rehab', 'الرحاب': 'Al Rehab',
  'mivida': 'Mivida', 'mevida': 'Mivida', 'mvd': 'Mivida', 'ميفيدا': 'Mivida',
  'eastown': 'Eastown', 'east town': 'Eastown', 'ايست تاون': 'Eastown',
  'hyde park': 'Hyde Park', 'هايد بارك': 'Hyde Park', 'haid bark': 'Hyde Park',
  'fifth square': 'Fifth Square', 'فيفث سكوير': 'Fifth Square', 'المراسم': 'Fifth Square',
  'lake view': 'Lake View Residence', 'ليك فيو': 'Lake View Residence',
  'villette': 'Villette', 'فيليت': 'Villette',
  'uptown cairo': 'Uptown Cairo', 'اب تاون': 'Uptown Cairo', 'أب تاون': 'Uptown Cairo',
  'mountain view': 'Mountain View iCity', 'ماونتن فيو': 'Mountain View iCity',
  'ماونتن فيو اي سيتي': 'Mountain View iCity',
  'sodic': 'SODIC East', 'سوديك': 'SODIC East',
  'katameya dunes': 'Katameya Dunes', 'قطامية ديونز': 'Katameya Dunes',
  'palm hills': 'Palm Hills New Cairo', 'بالم هيلز': 'Palm Hills New Cairo',
  '90 avenue': '90 Avenue', 'تسعين افينيو': '90 Avenue',
  'new cairo': 'New Cairo (General)', 'القاهرة الجديدة': 'New Cairo (General)',
  'التجمع الخامس': 'New Cairo (General)', '5th settlement': 'New Cairo (General)'
};

// ── setup ───────────────────────────────────────────────────────────────────

function installTriggers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onEditMaster').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('maintainRealAvailable').timeBased().everyMinutes(10).create();
  SpreadsheetApp.getUi().alert('Triggers installed: onEdit + 10-minute Real_Available_Units maintenance.');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🛰️ Sierra Sync')
    .addItem('Apply dropdowns', 'applyDropdowns')
    .addItem('Standardize compounds', 'standardizeCompounds')
    .addItem('Enforce no-blank-cells (NULL fill)', 'enforceNoBlankCells')
    .addItem('Rebuild Real_Available_Units', 'maintainRealAvailable')
    .addSeparator()
    .addItem('🔒 /reset_outreach_status', 'resetOutreachStatus')
    .addToUi();
}

// ── rule helpers ────────────────────────────────────────────────────────────

function resolveCanonical(raw) {
  if (!raw || raw === '' || raw === '0' || String(raw).toLowerCase() === 'null') return 'New Cairo (General)';
  var low = String(raw).toLowerCase().trim();
  if (COMPOUND_GAZETTEER[low]) return COMPOUND_GAZETTEER[low];
  var aliases = Object.keys(COMPOUND_GAZETTEER).sort(function (a, b) { return b.length - a.length; });
  for (var i = 0; i < aliases.length; i++) {
    if (low.indexOf(aliases[i]) !== -1) return COMPOUND_GAZETTEER[aliases[i]];
  }
  return String(raw).replace(/\b\w/g, function (l) { return l.toUpperCase(); });
}

function validEgyptianMobile(raw) {
  var d = String(raw || '').replace(/\D/g, '');
  if (d.indexOf('20') === 0 && d.length === 12) d = d.substring(2);
  if (d.indexOf('0020') === 0 && d.length === 14) d = d.substring(4);
  if (d.length === 10 && d.charAt(0) === '1') d = '0' + d;
  return /^01[0125][0-9]{8}$/.test(d) ? d : null;
}

// ── onEdit enforcement ──────────────────────────────────────────────────────

function onEditMaster(e) {
  try {
    var sheet = e.range.getSheet();
    if (sheet.getName() !== MASTER_TAB) return;
    var row = e.range.getRow();
    if (row < 2) return; // header

    // Rule 4 — canonical compound on edit.
    if (e.range.getColumn() === COL.Canonical_Compound) {
      var canonical = resolveCanonical(e.value);
      if (canonical !== e.value) e.range.setValue(canonical);
    }

    // Rule 3 — deal type ↔ price gate (fires on either cell).
    if (e.range.getColumn() === COL.Price_EGP || e.range.getColumn() === COL.Deal_Type) {
      enforcePriceLogic(sheet, row);
    }

    // Rule 1 — phone gate: a row whose mobile cell was just emptied/corrupted
    // is highlighted red and refused (never silently accepted).
    if (e.range.getColumn() === COL.Owner_Mobile_Internal) {
      var phone = validEgyptianMobile(e.value);
      if (!phone) {
        e.range.setBackground('#FEE2E2');
        SpreadsheetApp.getActiveSpreadsheet().toast(
          '⚠️ NO PHONE = REJECT: a unit is never accepted without a valid 01xxxxxxxxx mobile.', 'Phone Gate', 5);
      } else {
        e.range.setValue("'" + phone).setBackground('#FFFFFF');
      }
    }

    // Any operational edit refreshes the action timestamp.
    if ([COL.Contact_Status, COL.Listing_Status, COL.Price_EGP].indexOf(e.range.getColumn()) !== -1) {
      sheet.getRange(row, COL.Last_Action_Timestamp).setValue(new Date().toISOString());
    }
  } catch (err) {
    console.error('onEditMaster: ' + err);
  }
}

function enforcePriceLogic(sheet, row) {
  var price = parseFloat(String(sheet.getRange(row, COL.Price_EGP).getValue()).replace(/,/g, '')) || 0;
  var dealType = String(sheet.getRange(row, COL.Deal_Type).getValue()).trim();
  if (price > RESALE_THRESHOLD && dealType.toLowerCase() === 'rent') {
    sheet.getRange(row, COL.Deal_Type).setValue('Resale');
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Rule enforced: ' + price.toLocaleString() + ' EGP rent ≥ 1,000,000 → re-classified as Resale.', 'Price Gate', 6);
  } else if (price > RENT_CEILING && price <= RESALE_THRESHOLD && dealType.toLowerCase() === 'rent') {
    sheet.getRange(row, COL.Deal_Type).setBackground('#FEF3C7'); // amber review tint
  }
}

// ── dropdowns (Rule 6) ──────────────────────────────────────────────────────

function applyDropdowns() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MASTER_TAB) || ss.insertSheet(MASTER_TAB);
  ensureHeaders_(sheet);
  var lastRow = Math.max(sheet.getLastRow(), 1000);
  var rules = [
    ['Deal_Type', DROPDOWNS.Deal_Type],
    ['Unit_Type', DROPDOWNS.Unit_Type],
    ['Furnishing', DROPDOWNS.Furnishing],
    ['Finishing', DROPDOWNS.Finishing],
    ['Contact_Status', DROPDOWNS.Contact_Status],
    ['Listing_Status', DROPDOWNS.Listing_Status],
  ];
  rules.forEach(function (r) {
    var range = sheet.getRange(2, COL[r[0]], lastRow, 1);
    range.setDataValidation(SpreadsheetApp.newDataValidation()
      .requireValueInList(r[1], true).setAllowInvalid(false)
      .setHelpText('Pick from the list — free text is rejected (Sierra BMM/SE standard).')
      .build());
  });
  // Compound dropdown = canonical list.
  var compounds = [];
  var seen = {};
  for (var alias in COMPOUND_GAZETTEER) {
    var canonical = COMPOUND_GAZETTEER[alias];
    if (!seen[canonical]) { seen[canonical] = true; compounds.push(canonical); }
  }
  compounds.sort();
  sheet.getRange(2, COL.Canonical_Compound, lastRow, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(compounds, true).setAllowInvalid(false).build());
  SpreadsheetApp.getActiveSpreadsheet().toast('Dropdowns applied to 7 columns.', 'Rule 6', 4);
}

// ── no blank cells (Rule 2) ─────────────────────────────────────────────────

function enforceNoBlankCells() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MASTER_TAB);
  if (!sheet) return;
  ensureHeaders_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  var filled = 0;
  for (var r = 0; r < values.length; r++) {
    for (var c = 0; c < HEADERS.length; c++) {
      if (values[r][c] === '' || values[r][c] === null || values[r][c] === undefined) {
        values[r][c] = 'NULL';
        filled++;
      }
    }
  }
  sheet.getRange(2, 1, lastRow - 1, HEADERS.length).setValues(values);
  SpreadsheetApp.getActiveSpreadsheet().toast('Blank cells → "NULL": ' + filled + ' filled.', 'Rule 2', 4);
}

// ── compound standardization (Rule 4, batch) ────────────────────────────────

function standardizeCompounds() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MASTER_TAB);
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var range = sheet.getRange(2, COL.Canonical_Compound, lastRow - 1, 1);
  var values = range.getValues();
  var updated = 0;
  for (var i = 0; i < values.length; i++) {
    var raw = String(values[i][0] || '').trim();
    if (raw && raw !== 'NULL') {
      var canonical = resolveCanonical(raw);
      if (canonical !== raw) { values[i][0] = canonical; updated++; }
    }
  }
  range.setValues(values);
  SpreadsheetApp.getActiveSpreadsheet().toast('Compounds standardized: ' + updated + ' updated.', 'Rule 4', 4);
}

// ── Real_Available_Units maintenance (Tab 2) ────────────────────────────────

function maintainRealAvailable() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var master = ss.getSheetByName(MASTER_TAB);
  if (!master) return;
  var real = ss.getSheetByName(REAL_TAB) || ss.insertSheet(REAL_TAB);
  if (real.getLastRow() === 0 || String(real.getRange(1, 1).getValue()) !== 'Unit_Code') {
    real.getRange(1, 1, 1, HEADERS.length + 1).setValues([
      HEADERS.slice(0, 3).concat(['Verified_Available_Date'], HEADERS.slice(3))
    ]);
  }
  var lastRow = master.getLastRow();
  if (lastRow < 2) { real.getRange(2, 1, Math.max(real.getMaxRows() - 1, 1), HEADERS.length + 1).clearContent(); return; }
  var values = master.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();

  var out = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var listingStatus = String(row[COL.Listing_Status - 1] || '').trim();
    var contactStatus = String(row[COL.Contact_Status - 1] || '').trim();
    if (listingStatus === 'Available' && contactStatus === 'Verified Available') {
      var stamped = new Date().toISOString();
      out.push(row.slice(0, 3).concat([stamped], row.slice(3)));
      // stamp the master row too (Mission 3: Verified_Available_Date)
      master.getRange(i + 2, COL.Last_Action_Timestamp).setValue(stamped);
    }
  }

  real.getRange(2, 1, Math.max(real.getMaxRows() - 1, 1), HEADERS.length + 1).clearContent();
  if (out.length) {
    real.getRange(2, 1, out.length, HEADERS.length + 1).setValues(out);
    // Tab 2 is team-facing: mask the internal mobile.
    for (var m = 0; m < out.length; m++) {
      var masked = maskMobile_(out[m][COL.Owner_Mobile_Internal - 1]);
      real.getRange(m + 2, COL.Owner_Mobile_Internal).setValue(masked);
    }
  }
  console.log('maintainRealAvailable: ' + out.length + ' live rows');
}

function maskMobile(raw) {
  var d = String(raw || '').replace(/\D/g, '').slice(-10);
  return d.length === 10 ? d.substring(0, 3) + '***' + d.substring(6) : 'NULL';
}
var maskMobile_ = maskMobile;

// ── /reset_outreach_status (bulk reset trigger) ─────────────────────────────

/**
 * Sets every unverified/stale unit back to Contact_Status = 'Not Contacted
 * Yet' for fresh owner follow-up campaigns. Confirmed 'Sold' / 'Rented'
 * units are KEPT archived (never resurrected). Also rebuilds Tab 2.
 */
function resetOutreachStatus() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MASTER_TAB);
  if (!sheet) { SpreadsheetApp.getUi().alert('Master_Inventory tab not found.'); return; }
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert(
    '🔒 /reset_outreach_status',
    'Reset ALL unverified/stale units to "Not Contacted Yet"?\n\nConfirmed Sold/Rented rows are kept archived. This cannot be undone per-row.',
    ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  var keep = { 'Verified Available': 1, 'Sold': 1, 'Rented': 1, 'Not Available': 1 };
  var keepListing = { 'Sold': 1, 'Rented': 1 };
  var resetCount = 0;
  var now = new Date().toISOString();
  for (var i = 0; i < values.length; i++) {
    var contact = String(values[i][COL.Contact_Status - 1] || '').trim();
    var listing = String(values[i][COL.Listing_Status - 1] || '').trim();
    if (!keep[contact] && !keepListing[listing]) {
      values[i][COL.Contact_Status - 1] = 'Not Contacted Yet';
      values[i][COL.Last_Action_Timestamp - 1] = now;
      resetCount++;
    }
  }
  sheet.getRange(2, 1, lastRow - 1, HEADERS.length).setValues(values);
  maintainRealAvailable();
  ui.alert('Reset complete: ' + resetCount + ' units → "Not Contacted Yet". Sold/Rented kept archived.');
}

// ── shared ──────────────────────────────────────────────────────────────────

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0 || String(sheet.getRange(1, 1).getValue()) !== 'Unit_Code') {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}
