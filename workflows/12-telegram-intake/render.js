'use strict';
/**
 * render.js — Client-facing message templates for the intake pipeline.
 * ─────────────────────────────────────────────────────────────────────────────
 * The General-group broadcast follows the official Sierra-Estates template
 * verbatim (owner requirement, 2026-10-31). Two hard rules:
 *   1. Every interpolated VALUE is HTML-escaped (Telegram parse_mode=HTML)
 *      AND runs through scrubForTeam — agent-supplied text is untrusted.
 *   2. The broadcast body is built ONLY from structured, sanitized fields;
 *      raw intake text NEVER flows into it (structural privacy guarantee —
 *      a landlord number cannot leak if the raw text is never interpolated).
 * The concierge touchpoint is the reference CODE itself, never a phone
 * number: clients call the Sierra concierge line, which looks the code up
 * in the Master Sheet (where the real landlord contact lives, internally).
 */

const { escapeHtml } = require('./tg');
const { scrubForTeam } = require('./redact');

const PLACEHOLDER = 'Not specified';

function v(value) {
  const s = String(value ?? '').trim();
  if (!s) return PLACEHOLDER;
  return escapeHtml(scrubForTeam(s));
}

function priceLine(listing) {
  const p = listing.price || {};
  const amount = Number.isFinite(p.amount) ? Number(p.amount).toLocaleString('en-US') : null;
  if (!amount) return null;
  const cur = p.currency === 'USD' ? 'USD' : 'EGP';
  if (listing.listingType === 'sale') return `• Sale Price: ${amount} ${cur}`;
  const per = p.period === 'year' ? 'year' : p.period === 'day' ? 'day' : 'month';
  return `• Rental Price: ${amount} ${cur} / ${per}`;
}

function layoutLine(listing) {
  const beds = listing.bedrooms !== null && listing.bedrooms !== undefined ? listing.bedrooms : null;
  const baths = listing.bathrooms !== null && listing.bathrooms !== undefined ? listing.bathrooms : null;
  const master = listing.masterBedrooms ? ` (${listing.masterBedrooms} Master)` : '';
  return `• Interior Layout: ${beds ?? '—'} Beds${master} | ${baths ?? '—'} Baths | Reception | Kitchen`;
}

/**
 * The General-group broadcast. Exactly the official template; optional
 * fields render as "Not specified" instead of being dropped (the team
 * should see what is missing, not wonder).
 */
function renderBroadcast(listing, agentName) {
  const code = v(listing.code);
  const typeWord = listing.listingType === 'sale' ? 'for Sale' : 'for Rent';
  const propType = v((listing.propertyType || 'Unit'));
  const propTypeLabel = propType.charAt(0).toUpperCase() + propType.slice(1);
  const place = [listing.compound, listing.district].filter(Boolean).map(v).join(', ');
  const price = priceLine(listing);

  const lines = [
    `Reference: [${code}]`,
    `🏢 Exclusive Listing by Sierra-Estates`,
    `${propTypeLabel} ${typeWord} in ${place || PLACEHOLDER}`,
    ``,
    `✨ Property Overview:`,
    `• Total Area: ${listing.areaSqm ?? '—'} SQM`,
    `• Floor: ${v(listing.floor)}`,
    layoutLine(listing),
    `• Furnishing: ${v(listing.furnishing)}`,
    `• Finishing: ${v(listing.finishing)}`,
    `• View: ${v(listing.view)}`,
    ``,
    `📋 ${listing.listingType === 'sale' ? 'Sale Terms & Pricing:' : 'Lease Terms & Pricing:'}`,
    price || `• Price: ${PLACEHOLDER}`,
    `• Payment Terms: ${v(listing.paymentTerms)}`,
    `• ${listing.listingType === 'sale' ? 'Down' : 'Security Deposit'}: ${v(listing.deposit)}`,
    `• Availability: ${v(listing.availability)}`,
    ``,
    `📞 Internal Concierge Reference: ${code}`,
    `👤 Sourced by Agent: ${v(agentName)}`,
  ];
  return lines.join('\n');
}

/** Short album caption (sendMediaGroup captions are capped at 1024 chars). */
function renderAlbumCaption(listing) {
  const code = v(listing.code);
  return `Reference: [${code}] — 🏢 Sierra-Estates Exclusive • ${v(listing.compound)} • ${listing.areaSqm ?? '—'} SQM`;
}

/** Confirmation replied in the agent's own group (spec template, verbatim). */
function renderConfirmation(code, rowNumber, { broadcast = true, landlordCount = 0 } = {}) {
  const lines = [
    `✅ Unit Received & Logged!`,
    `• Code: <code>${escapeHtml(code)}</code>`,
    `• Added to Master Sheet: Row #${escapeHtml(String(rowNumber))}`,
    `• Status: ${broadcast
      ? 'Sanitized and broadcasted to General.'
      : 'Logged. Broadcast pending (General group will receive it once sheet sync completes).'}`,
  ];
  if (landlordCount > 0) {
    lines.push(`🔒 Landlord contact (${landlordCount} number${landlordCount > 1 ? 's' : ''}) stored internally only — never broadcast.`);
  }
  return lines.join('\n');
}

/** Bilingual ask-for-missing reply — actionable, never generic. */
function renderMissingFields(missing, gotPhotos) {
  const list = missing.map((m) => `• ${escapeHtml(m)}`).join('\n');
  return [
    `📋 Almost there — the unit is NOT logged yet. Please re-send the full listing including:`,
    list,
    gotPhotos ? `📷 Photos received and will be attached to the unit.` : `📷 Tip: attach 3–5 photos with the listing text.`,
    ``,
    `مطلوب إعادة إرسال بيانات الوحدة كاملة مع: ${escapeHtml(missing.map((m) => m.split('—')[1] || m.split('—')[0]).join('، '))}`,
  ].join('\n');
}

/** Sub-500ms acknowledgement (Mission 2): the agent sees this instantly;
 *  parsing, media download, AI extraction and sheet/DB writes continue in
 *  the background. The final ✅ renderConfirmation follows. */
function renderFastAck() {
  return [
    `⏳ Unit received — parsing & verifying...`,
    `تم استلام الوحدة — جاري الفحص والمعالجة...`,
  ].join('\n');
}

/** Confirmation for a re-list caught by the dedup index (same owner +
 *  compound + type + area, price within ±5 %): the existing row is refreshed
 *  in place, no duplicate is created. */
function renderRelistRefresh(code, driftPct, rowNumber) {
  const drift = Number.isFinite(driftPct) ? `${(driftPct * 100).toFixed(1)}%` : 'minor';
  return [
    `♻️ This looks like a re-list of <code>${escapeHtml(code)}</code> (price drift ${drift}).`,
    `The existing Master Sheet row was refreshed in place — price, timestamp and status updated${rowNumber ? ` (row #${escapeHtml(String(rowNumber))})` : ''}. No duplicate row created.`,
    `هذه الوحدة مسجلة مسبقاً — تم تحديث السعر والحالة في نفس الصف دون تكرار.`,
  ].join('\n');
}

/** DQE notice: same identity key but the price moved MORE than ±5 % — the
 *  unit is logged as a new row and flagged for human review. */
function renderDqeFlag(code, existingPrice, newPrice, driftPct) {
  const fmt = (n) => (Number.isFinite(n) ? Number(n).toLocaleString('en-US') : '—');
  return [
    `📊 Price variance detected for <code>${escapeHtml(code)}</code>.`,
    `• Previously seen: ${fmt(existingPrice)} EGP`,
    `• Now: ${fmt(newPrice)} EGP (${Number.isFinite(driftPct) ? `${(driftPct * 100).toFixed(1)}%` : '?'} change)`,
    `Logged as a new row and flagged for verification — if this is a genuine price change on the same unit, the team will merge the rows.`,
    `تم تسجيل الوحدة مع ملاحظة تغير السعر عن السابق — سيتم التحقق يدوياً.`,
  ].join('\n');
}

/** Honest reply when the sheet sync failed: the unit is safe locally. */
function renderSpooled(code) {
  return [
    `⚠️ Unit saved to the local queue as <code>${escapeHtml(code || '(pending code)')}</code>.`,
    `The Master Sheet did not accept the row yet — I will keep retrying every 10 minutes and broadcast to General only after the sheet accepts it.`,
    `لا تقلق — الوحدة محفوظة محلياً وسيتم تسجيلها وبثها تلقائياً فور اتصال الشيت.`,
  ].join('\n');
}

/** Specific unexpected-error reply (never "عذراً، حدث خطأ غير متوقع"). */
function renderError(incidentId, where) {
  return [
    `⚠️ I could not finish processing this listing (${escapeHtml(where)}).`,
    `Reference for the team: <code>${escapeHtml(incidentId)}</code>`,
    `The unit was NOT lost — please re-send the listing text. If it repeats, tell the admin to check the runner log for this reference.`,
  ].join('\n');
}

function renderHelp(configured) {
  return [
    `🏛️ <b>Sierra Estates — Intake Agent</b>`,
    ``,
    `Send a listing (Arabic or English) with 3–5 photos and I will:`,
    `• Parse it and assign a reference code (SE-RENT / SE-SALE)`,
    `• Log it to the Master Inventory sheet + site inventory`,
    `• Reply here with the code and sheet row`,
    `• Broadcast the sanitized unit to the General group (no owner name/number — ever)`,
    ``,
    `Commands: <code>/chatid</code> (this chat's ID — needed for setup) · <code>/ping</code> (health)`,
    configured ? `` : `⚠️ Sheet sync is NOT configured yet (GOOGLE_SERVICE_ACCOUNT_* / sheet id) — units will be queued locally.`,
  ].join('\n');
}

module.exports = {
  renderBroadcast,
  renderAlbumCaption,
  renderConfirmation,
  renderFastAck,
  renderRelistRefresh,
  renderDqeFlag,
  renderMissingFields,
  renderSpooled,
  renderError,
  renderHelp,
};
