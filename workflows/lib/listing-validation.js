'use strict';

/**
 * listing-validation.js — Strict Data Validation & Normalization Rules.
 * ─────────────────────────────────────────────────────────────────────────────
 * Mission 3 (2026-11-01): the single enforcement point for the Sierra Estates
 * BMM/SE data standard. Enforced by code here (every Sheets/Supabase write in
 * the workflows runtime) AND mirrored by Apps Script in the Master Sheet
 * (scripts/GoogleAppsScript_SierraEstates_MasterInventory_v7.gs).
 *
 * RULES (owner order, 2026-11-01):
 *   1. NO PHONE = REJECT.       Never accept or insert any unit without a
 *                               valid owner/source Egyptian mobile.
 *   2. NO BLANK CELLS.          Any missing non-mandatory field is explicitly
 *                               "NULL" — never an empty cell.
 *   3. DEAL TYPE ↔ PRICE GATE.  Rent maximum 400,000 EGP/month. A rent unit
 *                               priced >= 1,000,000 EGP auto-classifies as
 *                               "Resale" (and flags the anomaly).
 *   4. CANONICAL COMPOUND.      Arabic/English/slang aliases map to one
 *                               famous canonical name (dropdown-validated).
 *   5. SMART CODING (BMM/SE).   [Compound_Initials][Agent_Initials]-[ID],
 *                               e.g. OMV-K204; the SE-RENT/SE-SALE-XXXX
 *                               family continues for the intake lane.
 *   6. DROPDOWN COLUMNS.        Deal_Type, Compound, Unit_Type, Furnishing,
 *                               Finishing, Contact_Status, Listing_Status.
 */

const { normalizePhone } = require('./phone-utils');
const { resolveCanonicalCompound, canonicalCompoundList } = require('./compound-canonical');

// ── dropdown vocabularies (sheet + DB parity) ──────────────────────────────
const DROPDOWNS = {
  Deal_Type: ['Rent', 'Resale', 'Sale', 'Primary'],
  Unit_Type: [
    'Apartment', 'Villa', 'Townhouse', 'Twinhouse', 'Penthouse', 'Duplex',
    'Studio', 'Chalet', 'Office', 'Retail', 'Land',
  ],
  Furnishing: [
    'Furnished', 'Semi-Furnished', 'Unfurnished', 'Fully Furnished',
    'Kitchen Appliances & ACs',
  ],
  Finishing: [
    'Without Finishing', 'Semi-Finished', 'Core & Shell', 'Lux', 'Super Lux',
    'Ultra Super Lux', 'Fully Finished',
  ],
  Contact_Status: [
    'Not Contacted Yet', 'Contacted - No Answer', 'Contacted - Answered',
    'Verified Available', 'Not Available', 'Sold', 'Rented',
  ],
  Listing_Status: [
    'Pending Verification', 'Available', 'Unavailable', 'Sold', 'Rented',
    'Archived', 'DQE Flag — price variance',
  ],
};

const RENT_PRICE_CEILING_EGP = 400000;
const RENT_RESALE_THRESHOLD_EGP = 1000000;
const NULL_CELL = 'NULL';

/** Closest dropdown member for a free-form value (case/space-insensitive). */
function coerceDropdown(listName, raw) {
  const list = DROPDOWNS[listName];
  if (!list) return raw;
  const val = String(raw ?? '').trim();
  if (!val) return null;
  const norm = (s) => String(s).toLowerCase().replace(/[\s_-]+/g, '');
  const hit = list.find((m) => norm(m) === norm(val));
  if (hit) return hit;
  // Partial containment ("semi furn" → "Semi-Furnished").
  const partial = list.find((m) => norm(m).includes(norm(val)) || norm(val).includes(norm(m)));
  return partial || null;
}

/** Rule 1 — phone gate: valid Egyptian mobile or REJECT. */
function validateOwnerPhone(raw) {
  const phone = normalizePhone(raw);
  if (!phone || !/^201[0125]\d{8}$/.test(phone)) {
    return { ok: false, reason: 'NO_VALID_PHONE', message: 'Never accept a unit without a valid owner/source mobile (01xxxxxxxxx).' };
  }
  return { ok: true, phone };
}

/** Rule 3 — deal type vs price sanity gate.
 * Returns { dealType, autoClassified, anomaly } — never throws. */
function enforceDealTypePriceGate(dealType, priceEgp) {
  const price = Number(priceEgp);
  const dt = coerceDropdown('Deal_Type', dealType) || 'Sale';
  if (!Number.isFinite(price) || price <= 0) {
    return { dealType: dt, autoClassified: false, anomaly: null };
  }
  const lower = dt.toLowerCase();
  if (lower === 'rent' && price >= RENT_RESALE_THRESHOLD_EGP) {
    return {
      dealType: 'Resale',
      autoClassified: true,
      anomaly: `Rent price ${price.toLocaleString('en-US')} EGP >= ${RENT_RESALE_THRESHOLD_EGP.toLocaleString('en-US')} — auto-classified as Resale.`,
    };
  }
  if (lower === 'rent' && price > RENT_PRICE_CEILING_EGP && price < RENT_RESALE_THRESHOLD_EGP) {
    return {
      dealType: dt,
      autoClassified: false,
      anomaly: `Rent price ${price.toLocaleString('en-US')} EGP exceeds the ${RENT_PRICE_CEILING_EGP.toLocaleString('en-US')} EGP/month ceiling — flagged for review.`,
    };
  }
  return { dealType: dt, autoClassified: false, anomaly: null };
}

/** Rule 5 — Smart Coding (BMM/SE standard):
 * [Compound_Initials][Agent_Initials]-[ID], e.g. OMV-K204 (O = owner-direct
 * Mivida, K = agent initial, 204 = sequential). Falls back to the
 * SE-RENT/SE-SALE family when compound/agent initials are unavailable. */
function smartUnitCode({ compound, agentName, sequence, dealType }) {
  const canonical = resolveCanonicalCompound(compound);
  const initials = (s) => String(s || '')
    .replace(/[^A-Za-z\u0600-\u06FF ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
  const compoundIn = initials(canonical);
  const agentIn = initials(agentName);
  const seq = Number.isFinite(Number(sequence)) ? String(Number(sequence)) : String(Date.now()).slice(-4);
  if (compoundIn && agentIn) {
    return `${compoundIn}-${agentIn}${seq}`; // OMV-K204 style
  }
  const prefix = String(dealType).toLowerCase() === 'rent' ? 'SE-RENT' : 'SE-SALE';
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

/** Rule 2 — no blank cells: every non-mandatory missing field becomes the
 * literal string "NULL" so the sheet never carries an empty cell. */
function fillNulls(record) {
  const out = { ...record };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (v === undefined || v === null || String(v).trim() === '') out[k] = NULL_CELL;
  }
  return out;
}

/**
 * The full intake gate — returns a REJECT or a normalized, validation-passing
 * record shaped for the Master_Inventory tab. NEVER mutates the input.
 *
 * @param {object} raw  { unitCode?, dateAdded?, dealType, compound, unitType,
 *                        areaSqm, bedrooms, bathrooms, floor, furnishing,
 *                        finishing, priceEgp, ownerName, ownerPhone,
 *                        contactStatus?, listingStatus?, sourcedByAgent?,
 *                        verifiedByEmployee?, mediaLinks?, notes?, sequence? }
 * @returns {{ ok:false, reason, message } |
 *           { ok:true, record, warnings[] }}
 */
function validateListing(raw) {
  const warnings = [];
  const input = raw || {};

  // Rule 1 — phone gate (hard reject).
  const phone = validateOwnerPhone(input.ownerPhone);
  if (!phone.ok) return phone;

  // Rule 3 — deal type vs price.
  const gate = enforceDealTypePriceGate(input.dealType, input.priceEgp);
  if (gate.anomaly) warnings.push(gate.anomaly);

  // Rule 4 — canonical compound.
  const canonicalCompound = resolveCanonicalCompound(input.compound);
  if (canonicalCompound !== String(input.compound || '').trim()) {
    warnings.push(`Compound "${input.compound}" normalized to "${canonicalCompound}".`);
  }

  // Rule 6 — dropdown coercion.
  const unitType = coerceDropdown('Unit_Type', input.unitType) || 'Apartment';
  const furnishing = coerceDropdown('Furnishing', input.furnishing) || NULL_CELL;
  const finishing = coerceDropdown('Finishing', input.finishing) || NULL_CELL;
  let contactStatus = coerceDropdown('Contact_Status', input.contactStatus) || 'Not Contacted Yet';
  let listingStatus = coerceDropdown('Listing_Status', input.listingStatus) || 'Pending Verification';

  // Default New Unit State (Mission 3 spec).
  if (!input.contactStatus) contactStatus = 'Not Contacted Yet';
  if (!input.listingStatus) listingStatus = 'Pending Verification';

  // Rule 5 — smart code (only when the caller did not supply one).
  const unitCode = String(input.unitCode || '').trim() || smartUnitCode({
    compound: canonicalCompound,
    agentName: input.sourcedByAgent,
    sequence: input.sequence,
    dealType: gate.dealType,
  });

  const record = {
    Unit_Code: unitCode,
    Date_Added: input.dateAdded || new Date().toISOString(),
    Last_Action_Timestamp: new Date().toISOString(),
    Deal_Type: gate.dealType,
    Canonical_Compound: canonicalCompound,
    Unit_Type: unitType,
    Area_SQM: Number(input.areaSqm) > 0 ? Number(input.areaSqm) : NULL_CELL,
    Bedrooms: Number.isFinite(Number(input.bedrooms)) ? Number(input.bedrooms) : NULL_CELL,
    Bathrooms: Number.isFinite(Number(input.bathrooms)) ? Number(input.bathrooms) : NULL_CELL,
    Floor: input.floor ?? NULL_CELL,
    Furnishing: furnishing,
    Finishing: finishing,
    Price_EGP: Number(input.priceEgp) > 0 ? Number(input.priceEgp) : NULL_CELL,
    AI_Fair_Price_Benchmark: Number(input.aiFairPrice) > 0 ? Number(input.aiFairPrice) : NULL_CELL,
    Is_Featured_Gem: input.isFeaturedGem ? 'TRUE' : 'FALSE',
    Owner_Name_Internal: String(input.ownerName || '').trim() || NULL_CELL,
    Owner_Mobile_Internal: phone.phone, // canonical 201XXXXXXXXX — internal only
    Contact_Status: contactStatus,
    Listing_Status: listingStatus,
    Sourced_By_Agent: String(input.sourcedByAgent || '').trim() || NULL_CELL,
    Verified_By_Employee: String(input.verifiedByEmployee || '').trim() || NULL_CELL,
    Media_Links: String(input.mediaLinks || '').trim() || NULL_CELL,
    Notes: String(input.notes || '').trim() || NULL_CELL,
  };

  return { ok: true, record, warnings };
}

/** Does this record belong in Real_Available_Units (Tab 2)? */
function isRealAvailable(record) {
  return record.Listing_Status === 'Available' && record.Contact_Status === 'Verified Available';
}

module.exports = {
  DROPDOWNS,
  NULL_CELL,
  RENT_PRICE_CEILING_EGP,
  RENT_RESALE_THRESHOLD_EGP,
  validateOwnerPhone,
  enforceDealTypePriceGate,
  resolveCanonicalCompound,
  smartUnitCode,
  fillNulls,
  coerceDropdown,
  validateListing,
  isRealAvailable,
  canonicalCompoundList,
};
