/**
 * Tests: 08-units-sync price parsing (no-fabrication era, 2026-10-25).
 *
 * The live owner sheet (324 rows, gid 1127958606) carries THREE price
 * dialects: explicit-currency ('8,340,000 EGP'), unlabeled numbers
 * ('8,500,000' sale scale, '28,000' rent scale) and explicit USD
 * ('1,400$', '700$'). The previous `digits()` parser mangled everything:
 * '8.34M' became 834 EGP, every unlabeled price was stamped EGP, and
 * 198 empty prices silently became price=0 + currency='EGP'.
 *
 * What is pinned here:
 *   · parseUnitPrice() handles decimal-million, separators, currency
 *     labels (Latin + Arabic) — verified against real sheet rows;
 *   · currency is NEVER assumed — unlabeled prices get price_currency
 *     null (the sheet is demonstrably mixed-currency);
 *   · ambiguous/unparseable values (empty, bare decimals, ranges, text,
 *     negatives) are QUARANTINED with an explicit reason, never guessed;
 *   · the raw source price is preserved verbatim (raw_data._price_parse.raw
 *     + the untouched sheet row inside raw_data);
 *   · canonical identity is untouched: dupe_check_hash still derives from
 *     Code, insert still lands REVIEW_REQUIRED, provenance still never
 *     stamped, sync_source/source_channel unchanged.
 */
import { describe, it, expect } from 'vitest';
import { rowToListing, parseUnitPrice, unitHash } from '../workflows/08-units-sync/sync';

const SHEET_ROW = {
    Timestamp: '10/4/2026 10:00:00',
    NO: '41',
    Name: 'Ahmed Owner',
    Mobile: '+201012345678',
    Availablty: 'Available',
    bedrooms: '3',
    Location: 'Mountain View iCity',
    'Unit Price': '8,340,000 EGP',
    Type: 'sale',
    'Property Tybe': 'Apartment',
    Code: 'MT-B14-3U-8.34M',
    Garden: '0',
    Space: '180',
    Pool: '',
};

describe('08-units-sync — parseUnitPrice supported formats', () => {
    it('parses decimal-million ("8.34M" → 8,340,000) without inventing a currency', () => {
        const r = parseUnitPrice('8.34M');
        expect(r.status).toBe('parsed');
        expect(r.price).toBe(8_340_000);
        expect(r.currency).toBeNull();
    });

    it('parses decimal-million with an explicit EGP label', () => {
        const r = parseUnitPrice('8.34M EGP');
        expect(r.status).toBe('parsed');
        expect(r.price).toBe(8_340_000);
        expect(r.currency).toBe('EGP');
    });

    it('parses thousands separators ("8,340,000 EGP")', () => {
        const r = parseUnitPrice('8,340,000 EGP');
        expect(r.status).toBe('parsed');
        expect(r.price).toBe(8_340_000);
        expect(r.currency).toBe('EGP');
    });

    it('parses unlabeled comma numbers with currency UNKNOWN (never assumed EGP)', () => {
        const sale = parseUnitPrice('8,500,000');
        expect(sale.status).toBe('parsed');
        expect(sale.price).toBe(8_500_000);
        expect(sale.currency).toBeNull();

        const rent = parseUnitPrice('28,000');
        expect(rent.status).toBe('parsed');
        expect(rent.price).toBe(28_000);
        expect(rent.currency).toBeNull();
    });

    it('parses explicit USD rows from the live sheet ("1,400$", "700$", "USD 1,400")', () => {
        expect(parseUnitPrice('1,400$')).toEqual(
            expect.objectContaining({ status: 'parsed', price: 1400, currency: 'USD' }),
        );
        expect(parseUnitPrice('700$')).toEqual(
            expect.objectContaining({ status: 'parsed', price: 700, currency: 'USD' }),
        );
        expect(parseUnitPrice('USD 1,400')).toEqual(
            expect.objectContaining({ status: 'parsed', price: 1400, currency: 'USD' }),
        );
    });

    it('parses K-suffix and Arabic millions/thousands', () => {
        expect(parseUnitPrice('8.5K')).toEqual(
            expect.objectContaining({ status: 'parsed', price: 8500, currency: null }),
        );
        expect(parseUnitPrice('45K EGP')).toEqual(
            expect.objectContaining({ status: 'parsed', price: 45_000, currency: 'EGP' }),
        );
        expect(parseUnitPrice('8.34 مليون')).toEqual(
            expect.objectContaining({ status: 'parsed', price: 8_340_000, currency: null }),
        );
        expect(parseUnitPrice('٨٫٣٤ مليون جنيه')).toEqual(
            expect.objectContaining({ status: 'parsed', price: 8_340_000, currency: 'EGP' }),
        );
    });

    it('parses dot-grouped separators ("1.250.000") as 1,250,000', () => {
        expect(parseUnitPrice('1.250.000')).toEqual(
            expect.objectContaining({ status: 'parsed', price: 1_250_000 }),
        );
    });
});

describe('08-units-sync — quarantine of ambiguous / malformed prices', () => {
    it('quarantines empty prices (198 of 324 live rows) with reason "empty"', () => {
        const r = parseUnitPrice('');
        expect(r.status).toBe('quarantined');
        expect(r.price).toBe(0);
        expect(r.reason).toBe('empty');
    });

    it('quarantines missing-currency text values ("POA", "negotiable", "Price on request")', () => {
        for (const bad of ['POA', 'negotiable', 'Price on request', 'حسب الطلب']) {
            const r = parseUnitPrice(bad);
            expect(r.status).toBe('quarantined');
            expect(r.reason).toBe('no_digits');
            expect(r.price).toBe(0);
        }
    });

    it('quarantines bare decimals without a multiplier ("8.34") — scale is ambiguous', () => {
        const r = parseUnitPrice('8.34');
        expect(r.status).toBe('quarantined');
        expect(r.reason).toBe('bare_decimal_ambiguous');
        expect(r.price).toBe(0);
    });

    it('quarantines ranges and multi-value prices ("8-9M")', () => {
        const r = parseUnitPrice('8-9M');
        expect(r.status).toBe('quarantined');
        expect(r.reason).toBe('multiple_values');
    });

    it('quarantines non-positive prices ("-5000", "0")', () => {
        expect(parseUnitPrice('-5000').reason).toBe('non_positive');
        expect(parseUnitPrice('0').reason).toBe('non_positive');
    });
});

describe('08-units-sync — rowToListing price wiring', () => {
    it('sets price + currency from the parse and preserves the raw source price', () => {
        const listing = rowToListing({ ...SHEET_ROW, 'Unit Price': '8.34M EGP' });
        expect(listing.price).toBe(8_340_000);
        expect(listing.price_currency).toBe('EGP');
        // Raw source price preserved verbatim twice: in the sheet row and in
        // the parse envelope for the human review queue.
        expect(listing.raw_data['Unit Price']).toBe('8.34M EGP');
        expect(listing.raw_data._price_parse).toEqual(
            expect.objectContaining({ status: 'parsed', price: 8_340_000, currency: 'EGP', raw: '8.34M EGP' }),
        );
    });

    it('quarantined rows keep price 0, currency null, and carry the reason for review', () => {
        const listing = rowToListing({ ...SHEET_ROW, 'Unit Price': '8.34' });
        expect(listing.price).toBe(0);
        expect(listing.price_currency).toBeNull();
        expect(listing.raw_data._price_parse.status).toBe('quarantined');
        expect(listing.raw_data._price_parse.reason).toBe('bare_decimal_ambiguous');
        expect(listing.raw_data._price_parse.raw).toBe('8.34');
        // Quarantined price still never promotes or publishes anything.
        expect(listing.publish_status).toBe('REVIEW_REQUIRED');
    });

    it('unlabeled prices land with price_currency null — not EGP (mixed-currency sheet)', () => {
        const listing = rowToListing({ ...SHEET_ROW, 'Unit Price': '8,500,000' });
        expect(listing.price).toBe(8_500_000);
        expect(listing.price_currency).toBeNull();
    });

    it('USD rows land with price_currency USD', () => {
        const listing = rowToListing({ ...SHEET_ROW, 'Unit Price': '1,400$', Type: 'rent' });
        expect(listing.price).toBe(1400);
        expect(listing.price_currency).toBe('USD');
        expect(listing.deal_type).toBe('rent');
    });

    it('keeps canonical identity: hash from Code, REVIEW_REQUIRED, no provenance stamps', () => {
        const listing = rowToListing({ ...SHEET_ROW, 'Unit Price': 'garbage price' });
        expect(listing.dupe_check_hash).toBe(unitHash('MT-B14-3U-8.34M'));
        expect(listing.dupe_check_hash).toHaveLength(64);
        expect(listing.code).toBe('MT-B14-3U-8.34M');
        expect(listing.sync_source).toBe('sheets-units');
        expect(listing.source_channel).toBe('sheets');
        expect(listing.publish_status).toBe('REVIEW_REQUIRED');
        expect(listing).not.toHaveProperty('verified_at');
        expect(listing).not.toHaveProperty('verified_by');
        expect(listing).not.toHaveProperty('source_verified_at');
    });
});

describe('08-units-sync — multi-value fabrication regressions (2026-10-27)', () => {
    it('quarantines word-separated ranges ("8M or 9M") — previously fabricated as 89,000,000', () => {
        const r = parseUnitPrice('8M or 9M');
        expect(r.status).toBe('quarantined');
        expect(r.reason).toBe('multiple_values');
        expect(r.price).toBe(0);
        expect(r.raw).toBe('8M or 9M');
    });

    it('quarantines slash-separated values ("8/9") — previously fabricated as 89', () => {
        expect(parseUnitPrice('8/9')).toEqual(
            expect.objectContaining({ status: 'quarantined', reason: 'multiple_values', price: 0 }),
        );
    });

    it('quarantines Arabic "or" ranges ("8 أو 9 مليون")', () => {
        expect(parseUnitPrice('8 أو 9 مليون')).toEqual(
            expect.objectContaining({ status: 'quarantined', reason: 'multiple_values' }),
        );
    });

    it('quarantines pipe / tilde / en-dash / "to" separated values', () => {
        for (const bad of ['8M | 9M', '8~9', '8–9M', '2 to 3 million']) {
            expect(parseUnitPrice(bad).reason).toBe('multiple_values');
        }
    });

    it('quarantines "POA or 5M" (marker with digits on one side is still ambiguous)', () => {
        expect(parseUnitPrice('POA or 5M').reason).toBe('multiple_values');
    });

    it('classifies "-5,000 EGP" as non_positive (was mislabeled bare_decimal_ambiguous)', () => {
        const r = parseUnitPrice('-5,000 EGP');
        expect(r.status).toBe('quarantined');
        expect(r.reason).toBe('non_positive');
        expect(r.currency).toBe('EGP');
        expect(r.price).toBe(0);
    });

    it('legitimate sheet dialects never trip the multi-value markers (no over-quarantining)', () => {
        // Regression guard: the marker detection must not break any REAL
        // dialect the live 324-row sheet carries.
        expect(parseUnitPrice('8,340,000 EGP')).toEqual(
            expect.objectContaining({ status: 'parsed', price: 8_340_000, currency: 'EGP' }),
        );
        expect(parseUnitPrice('8.34M')).toEqual(
            expect.objectContaining({ status: 'parsed', price: 8_340_000, currency: null }),
        );
        expect(parseUnitPrice('1,400$')).toEqual(
            expect.objectContaining({ status: 'parsed', price: 1400, currency: 'USD' }),
        );
        expect(parseUnitPrice('1.250.000')).toEqual(
            expect.objectContaining({ status: 'parsed', price: 1_250_000 }),
        );
        expect(parseUnitPrice('٨٫٣٤ مليون جنيه')).toEqual(
            expect.objectContaining({ status: 'parsed', price: 8_340_000, currency: 'EGP' }),
        );
        expect(parseUnitPrice('28,000')).toEqual(
            expect.objectContaining({ status: 'parsed', price: 28_000, currency: null }),
        );
        expect(parseUnitPrice('8.5K')).toEqual(
            expect.objectContaining({ status: 'parsed', price: 8_500 }),
        );
        // Space-grouped thousands are NOT a multi-value list.
        expect(parseUnitPrice('8 500 000')).toEqual(
            expect.objectContaining({ status: 'parsed', price: 8_500_000 }),
        );
        // Decimal-comma million is NOT a multi-value list.
        expect(parseUnitPrice('8,5M')).toEqual(
            expect.objectContaining({ status: 'parsed', price: 8_500_000 }),
        );
    });
});
