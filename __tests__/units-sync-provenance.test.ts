/**
 * Tests: 08-units-sync Phase 6 no-fabrication rule (migration 026 era).
 *
 * The workflow is spawned as a child process by the runner, so the pure
 * helpers are exported for exactly this suite. What is pinned here:
 *
 *   · sheet sync NEVER stamps provenance (verified_at / verified_by /
 *     source_verified_at) — human verification is the only source;
 *   · sheet availability NEVER decides publishability — inserts land as
 *     REVIEW_REQUIRED, updates never touch publish_status (PostgREST PATCH
 *     only mutates provided keys, so the base object must simply not carry
 *     them);
 *   · the availability mapping itself is unchanged (status lifecycle only).
 */
import { describe, it, expect } from 'vitest';
import { rowToListing, mapStatus, detectDealType, unitHash } from '../workflows/08-units-sync/sync';

const SHEET_ROW = {
    Timestamp: '10/4/2026 10:00:00',
    NO: '41',
    'تاريخ اخر تحديث': '',
    Name: 'Ahmed Owner',
    Mobile: '+201012345678',
    Availablty: 'Available',
    bedrooms: '3',
    Location: 'Mountain View iCity',
    'Unit Price': '8,340,000 EGP',
    Type: 'sale',
    'Property Tybe': 'Apartment',
    Code: 'MT-B14-3U-8.34M',
    Owner: '',
    Garden: '0',
    Space: '180',
    Pool: '',
    Comment: '',
};

describe('08-units-sync — Phase 6 provenance rules', () => {
    it('never stamps provenance: verified_at / verified_by / source_verified_at are absent', () => {
        const listing = rowToListing(SHEET_ROW);
        expect(listing).not.toHaveProperty('verified_at');
        expect(listing).not.toHaveProperty('verified_by');
        expect(listing).not.toHaveProperty('source_verified_at');
    });

    it('never carries publish_status — ingest does not decide publishability', () => {
        const listing = rowToListing(SHEET_ROW);
        expect(listing).not.toHaveProperty('publish_status');
    });

    it('maps sheet availability to the status lifecycle only (unchanged behavior)', () => {
        expect(mapStatus('Available')).toBe('available');
        expect(mapStatus('Not available')).toBe('off-market');
        expect(mapStatus('Sold')).toBe('sold');
        expect(mapStatus('No answer')).toBe('pending');
        expect(mapStatus('Follow up')).toBe('pending');
        expect(mapStatus('')).toBe('pending');
    });

    it('maps deal types in English and Arabic', () => {
        expect(detectDealType('rent')).toBe('rent');
        expect(detectDealType('ايجار')).toBe('rent');
        expect(detectDealType('sale')).toBe('sale');
        expect(detectDealType('بيع')).toBe('sale');
        expect(detectDealType('swap')).toBeNull();
    });

    it('keeps the deterministic unit hash and audit-trail fields', () => {
        const listing = rowToListing(SHEET_ROW);
        expect(listing.sync_source).toBe('sheets-units');
        expect(listing.source_channel).toBe('sheets');
        expect(listing.dupe_check_hash).toBe(unitHash('MT-B14-3U-8.34M'));
        expect(listing.dupe_check_hash).toHaveLength(64);
        expect(listing.availability).toBe('Available');
        expect(listing.status).toBe('available');
    });

    it('does not stamp provenance even for unavailable rows', () => {
        const listing = rowToListing({ ...SHEET_ROW, Availablty: 'Not available' });
        expect(listing).not.toHaveProperty('verified_at');
        expect(listing).not.toHaveProperty('publish_status');
        expect(listing.status).toBe('off-market');
    });
});
