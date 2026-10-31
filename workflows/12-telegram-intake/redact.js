'use strict';
/**
 * redact.js — Intake privacy gate for the Telegram listing pipeline.
 * ─────────────────────────────────────────────────────────────────────────────
 * Doctrine (lib/server/owner-privacy.ts + scripts/sanitize-data-json.mjs v3):
 *   · Landlord names and direct mobile numbers NEVER reach the General
 *     broadcast, the sanitized sheet description, or any team-facing output.
 *   · The ONLY client-facing number is the Sierra Estates concierge
 *     +201092048333 — and even that is not interpolated into broadcasts
 *     (the concierge reference is the SE-RENT/SE-SALE code itself).
 *   · Landlord contact material is EXTRACTED here and stored ONLY in the
 *     Master Sheet's internal columns (Internal Private Notes), with the
 *     "Landlord Contact (Scrubbed)" column carrying a masked form.
 *
 * The matching machinery mirrors sanitize-data-json.mjs v3 exactly
 * (separator-tolerant Egyptian mobiles + labeled-context malformed digits)
 * so an intake text that would fail repo verification here fails the same
 * way there — one doctrine, two enforcement points.
 */

const CONCIERGE = '+201092048333';
const CONCIERGE_LAST10 = '1092048333';

// ≤1 separator char between any two digits — covers "+20 100 882 1490",
// "011-0088-8834", "(+20) 100 882 1490", NBSP/narrow-NBSP groupings.
const SEP = String.raw`[\s\-().\u00a0\u202f]?`;

const WA_LINK_RE = /https?:\/\/wa\.me\/\+?[0-9][0-9\s\-().]*/gi;

const PHONE_RE = new RegExp(
  String.raw`(?<![0-9A-Za-z])` +
    String.raw`(?:\+${SEP}2${SEP}0${SEP}|0${SEP}0${SEP}2${SEP}0${SEP}|0${SEP}2${SEP}0${SEP}|0${SEP}|2${SEP}0${SEP})?` +
    `1${SEP}[0125]${SEP}` +
    Array.from({ length: 8 }, () => String.raw`\d`).join(SEP) +
    String.raw`(?![0-9A-Za-z])`,
  'g',
);

// v3 labeled-context: a digit run sitting directly under an explicit contact
// label (رقم المالك / contact / phone / tel …) is contact material BY INTENT,
// malformed or not (9–13 digits).
const LABEL_BEFORE_RE = new RegExp(
  String.raw`(?<![A-Za-z])(?:` +
    String.raw`رقم\s*(?:المالك|الهاتف|التليفون)|اتصل|موبايل|هاتف|واتساب|تواصل|` +
    String.raw`contact|phone|mobile|whatsapp|tel` +
    String.raw`)(?![A-Za-z])[\s>:=#_()'"\-\u200e\u200f\u202a-\u202e]*$`,
  'i',
);
const LABEL_WINDOW = 28;
const LABELED_DIGITS_RE = /\+?\d[\d\s\-().\u200e\u200f\u202a-\u202e]{7,16}\d/g;

// Landlord-name labels: the value that follows is private identity material.
const LANDLORD_NAME_RE = new RegExp(
  String.raw`(?:اسم\s*(?:المالك|صاحب(?:\s*الوحدة)?)|(?:رقم\s*)?المالك\s*(?:هو|:)?|` +
    String.raw`landlord|owner|الصاحب)\s*[:=\-]?\s*` +
    String.raw`([^\n,،؛\d+]{2,40})`,
  'i',
);

const NAME_SCRUB_TOKEN = '[hidden]';
const PHONE_SCRUB_TOKEN = '[contact hidden — concierge only]';

function isConcierge(digits) {
  return digits.slice(-10) === CONCIERGE_LAST10;
}

/** Western-digit normalization incl. Arabic-Indic digits (٠-٩ → 0-9). */
function toWesternDigits(s) {
  return String(s || '').replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (d) =>
    String(d.charCodeAt(0) & 0xf),
  );
}

/** All Egyptian mobiles in the text, normalized to bare 10-digit local form
 *  (e.g. "1008821490"). The concierge number is excluded — it is not
 *  landlord material. Returns a deduped array. */
function extractOwnerPhones(raw) {
  const text = toWesternDigits(raw);
  const found = [];
  const push = (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) return;
    if (isConcierge(digits)) return;
    const local = digits.slice(-10); // 1[0125]xxxxxxxx
    if (!/^1[0125]/.test(local)) return;
    if (!found.includes(local)) found.push(local);
  };
  for (const m of text.match(PHONE_RE) || []) push(m);
  for (const m of text.matchAll(LABELED_DIGITS_RE)) {
    const before = text.slice(Math.max(0, (m.index || 0) - LABEL_WINDOW), m.index || 0);
    if (LABEL_BEFORE_RE.test(before)) push(m[0]);
  }
  return found;
}

/** First landlord name following an explicit owner label, trimmed; null if
 *  the intake text carries none. Sender/agent names are NOT matched (they
 *  are team identity, not owner PII). */
function extractLandlordName(raw) {
  const m = toWesternDigits(raw).match(LANDLORD_NAME_RE);
  if (!m) return null;
  const name = String(m[1] || '')
    .replace(/\s+/g, ' ')
    // Stop at a ' - ' separator or a follow-up label (رقم المالك / phone …)
    .split(/\s+-\s+|\s*(?:رقم|هاتف|موبايل|واتساب|phone|contact|tel)\b/i)[0]
    .trim();
  if (!name || name.length < 2) return null;
  // Guard: never treat template/service words as a name.
  if (/^(?:sierra|estates|advisory|concierge|owner|landlord|name|اسم|المالك)$/i.test(name)) return null;
  return name.slice(0, 40);
}

/** Masked display form for the internal sheet column: 100***1490. */
function maskPhone(local10) {
  const d = String(local10).replace(/\D/g, '').slice(-10);
  if (d.length !== 10) return '—';
  return `${d.slice(0, 3)}***${d.slice(-4)}`;
}

/** Team-safe description: every owner phone → hidden token, every
 *  landlord-name mention → hidden token, wa.me links → concierge link.
 *  Idempotent (already-redacted text passes through). */
function scrubForTeam(raw) {
  let out = toWesternDigits(String(raw || ''));
  out = out.replace(/\+20[\s]*\+20/g, '+20');
  out = out.replace(WA_LINK_RE, `https://wa.me/201092048333`);
  out = out.replace(PHONE_RE, (match) => {
    const digits = match.replace(/\D/g, '');
    if (isConcierge(digits)) return match; // idempotent
    return PHONE_SCRUB_TOKEN;
  });
  out = out.replace(LABELED_DIGITS_RE, (match, offset, str) => {
    const before = str.slice(Math.max(0, offset - LABEL_WINDOW), offset);
    if (!LABEL_BEFORE_RE.test(before)) return match;
    const digits = match.replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 13) return match;
    if (isConcierge(digits)) return match;
    return PHONE_SCRUB_TOKEN;
  });
  out = out.replace(LANDLORD_NAME_RE, `${NAME_SCRUB_TOKEN}`);
  return out.trim();
}

/** Hard runtime guard for anything about to be sent to the General group:
 *  returns every non-concierge Egyptian mobile still present (should always
 *  be empty — broadcast bodies are built from structured fields only). */
function broadcastLeftovers(text) {
  const raw = toWesternDigits(String(text || ''));
  const left = [];
  for (const m of raw.match(PHONE_RE) || []) {
    const digits = m.replace(/\D/g, '');
    if (!isConcierge(digits)) left.push(m);
  }
  for (const m of raw.matchAll(LABELED_DIGITS_RE)) {
    const before = raw.slice(Math.max(0, (m.index || 0) - LABEL_WINDOW), m.index || 0);
    if (!LABEL_BEFORE_RE.test(before)) continue;
    const digits = m.replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 13) continue;
    if (!isConcierge(digits)) left.push(m[0]);
  }
  return [...new Set(left)];
}

module.exports = {
  CONCIERGE,
  CONCIERGE_LAST10,
  extractOwnerPhones,
  extractLandlordName,
  maskPhone,
  scrubForTeam,
  broadcastLeftovers,
  toWesternDigits,
};
