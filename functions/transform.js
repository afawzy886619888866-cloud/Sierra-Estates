/**
 * Pure transforms for the data-processing pipeline.
 *
 * Kept free of side effects (no Firestore handles, no server timestamps) so the
 * normalization rules can be unit-tested in isolation from firebase-admin.
 */

/**
 * Parse a price that may arrive as a number, a plain numeric string, or a
 * formatted string carrying a currency symbol and/or thousands separators
 * (e.g. `"EGP 2,500,000"`).
 *
 * The previous implementation used a bare `parseFloat`, which truncated any
 * formatted value at the first separator — `"2,000,000"` became `2`. We strip
 * everything except digits and the decimal point before parsing so formatted
 * scraper payloads are preserved. Anything unparseable falls back to `0`.
 *
 * @param {unknown} value Raw price from a scraper payload.
 * @returns {number} A finite, non-negative-friendly number (0 when unparseable).
 */
function parsePrice(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value !== 'string') {
    return 0;
  }
  // Drop currency symbols, thousands separators, and whitespace; keep digits
  // and the decimal point only.
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Normalize a raw scraped document into the canonical shape the frontend reads.
 * Missing fields fall back to safe defaults so downstream consumers never see
 * `undefined`.
 *
 * @param {Record<string, unknown>} [rawData] Raw document from `rawScrapeData`.
 * @returns {{title: string, price: number, location: string, source: string, isAvailable: boolean}}
 */
function normalizeProperty(rawData = {}) {
  return {
    title: rawData.title || 'Untitled Property',
    price: parsePrice(rawData.price),
    location: rawData.location || 'Unknown',
    source: rawData.source || 'Scraper Bot',
    isAvailable: true,
  };
}

module.exports = { normalizeProperty, parsePrice };
