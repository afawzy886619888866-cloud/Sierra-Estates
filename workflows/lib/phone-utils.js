'use strict';

/**
 * phone-utils.js — Canonical Egyptian & International Phone Normalizer
 *
 * Handles Google Sheet corruptions, Excel numeric formatting, and user input:
 * - Strips leading + or 00
 * - Converts Arabic-Indic numerals [٠-٩] to Western [0-9]
 * - Strips duplicate country code: 202010... -> 2010...
 * - Strips duplicate 2 prefix: 22010... -> 2010...
 * - Strips double-zero concatenation: 20010... -> 2010...
 * - Normalizes local 11-digit mobile: 010... -> 2010...
 * - Normalizes Excel 10-digit mobile: 10... -> 2010...
 * - Preserves valid GCC/international numbers
 * - Formats valid WhatsApp chatIds (...@c.us, ...@g.us)
 */

function toWesternDigits(str) {
  return String(str || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

/**
 * Egyptian mobile → 201XXXXXXXXX; valid international preserved; null when unusable.
 * @param {string|number} raw
 * @returns {string|null}
 */
function normalizePhone(raw) {
  if (!raw) return null;
  let d = toWesternDigits(raw).trim();
  if (d.includes('@')) d = d.split('@')[0];
  d = d.replace(/[^\d]/g, '');
  if (!d) return null;

  while (d.startsWith('00')) d = d.slice(2);

  // Check common duplicate prefixes on Egyptian mobile numbers (operators: 010, 011, 012, 015)
  // 14 digits: 20201[0125]xxxxxxxx
  if (/^20201[0125]\d{8}$/.test(d)) return d.slice(2);
  // 13 digits: 2201[0125]xxxxxxxx (duplicate 2 before 201)
  if (/^2201[0125]\d{8}$/.test(d)) return d.slice(1);
  // 13 digits: 2001[0125]xxxxxxxx (20 prepended to 010 without stripping 0)
  if (/^2001[0125]\d{8}$/.test(d)) return '20' + d.slice(3);

  // 12 digits: 201[0125]xxxxxxxx (standard canonical Egyptian mobile)
  if (/^201[0125]\d{8}$/.test(d)) return d;

  // 11 digits: 01[0125]xxxxxxxx (Egyptian local mobile)
  if (/^01[0125]\d{8}$/.test(d)) return '20' + d.slice(1);

  // 10 digits: 1[0125]xxxxxxxx (Excel stripped leading 0)
  if (/^1[0125]\d{8}$/.test(d)) return '20' + d;

  // Valid international numbers (7-15 digits starting with non-zero)
  if (/^[1-9]\d{6,14}$/.test(d)) return d;

  return null;
}

/**
 * Converts a raw phone into an OpenWA chatId, e.g. "201012345678@c.us"
 * Preserves group chatIds ending with "@g.us".
 * @param {string|number} phone
 * @returns {string}
 */
function normalizeChatId(phone) {
  if (!phone) return '';
  const s = String(phone).trim();
  if (s.endsWith('@g.us')) return s;
  const clean = normalizePhone(s);
  return clean ? `${clean}@c.us` : '';
}

/**
 * Converts a phone (e.g. +2010..., 2010..., 010...) into local Egyptian format (01xxxxxxxxx)
 * without leading +20 or 20.
 * @param {string|number} raw
 * @returns {string}
 */
function toLocalPhone(raw) {
  if (!raw) return '';
  let d = toWesternDigits(raw).trim();
  d = d.replace(/[^\d]/g, '');
  if (d.startsWith('0020')) d = d.slice(4);
  else if (d.startsWith('20')) d = d.slice(2);
  if (/^1[0125]\d{8}$/.test(d)) return '0' + d;
  if (/^01[0125]\d{8}$/.test(d)) return d;
  return d;
}

module.exports = {
  toWesternDigits,
  normalizePhone,
  normalizeChatId,
  toLocalPhone
};
