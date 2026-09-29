/**
 * Tests: Easy Listing — smart coding & routing (POST /api/easy-listing).
 *
 *   · Parser honesty contract: fields the pasted text omits come back null
 *     with a parse warning — the module NEVER substitutes defaults (unlike
 *     the older /api/listings/easy-parse heuristics that defaulted beds 3 /
 *     baths 2 / area 180 / price 10M). Missing AREA is a hard 400 because the
 *     internal code format requires it.
 *   · Internal code format: [REGION]-[COMPOUND]-[UNIT_TYPE]-[FLOOR]-[AREA]M
 *     (e.g. NC-MIV-APT-F2-175M — the spec's own worked example, ميفيلد is
 *     a Mivida spelling variant the spec itself uses).
 *   · Routing matrix: AGENT|OWNER → MAIN_INVENTORY + ads; BROKER →
 *     MAP_SHEET + WhatsApp photo request, NO ads.
 *   · API route: listings insert staged 'Pending Review' (never a publish),
 *     broker path writes map_sheet_entries + enqueues the photo request and
 *     flips it to 'requested', sandbox degradation keeps parsing alive
 *     without Supabase credentials, production write failure → 502.
 */
const mockInsertRecord = jest.fn();
const mockUpdateRecord = jest.fn();
const mockEnqueueWhatsAppJob = jest.fn();

jest.mock('@sierra-estates/db', () => ({
    insertRecord: (...a: unknown[]) => mockInsertRecord(...a),
    updateRecord: (...a: unknown[]) => mockUpdateRecord(...a),
}));

jest.mock('@/lib/server/whatsapp-queue', () => ({
    enqueueWhatsAppJob: (...a: unknown[]) => mockEnqueueWhatsAppJob(...a),
}));

// The route logger is noisy in sandbox-degradation tests.
jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
    parseEasyListing,
    toPayload,
    normalizeEgyptianPhone,
    normalizeRole,
    EasyListingValidationError,
} from '../lib/server/easy-listing';
import { POST as easyListingPOST } from '../app/api/easy-listing/route';

const AGENT_EXAMPLE = {
    role: 'موظف',
    name: 'أحمد فوزي',
    phone: '01012345678',
    details: 'شقة 175 متر دور ثاني كمبوند ميفيلد التجمع الخامس بـ 8 مليون 3 غرف 2 حمام',
};

function post(body: unknown): Promise<Response> {
    return easyListingPOST(
        new Request('https://sierra-estates.net/api/easy-listing', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
        }),
    );
}

beforeEach(() => {
    jest.clearAllMocks();
    mockInsertRecord.mockReset();
    mockUpdateRecord.mockReset();
    mockEnqueueWhatsAppJob.mockReset();
});

/* ─────────────────────── role normalization ─────────────────────── */

describe('normalizeRole', () => {
    it('maps the Arabic staff/owner/broker words', () => {
        expect(normalizeRole('موظف')).toBe('AGENT');
        expect(normalizeRole('موظفة')).toBe('AGENT');
        expect(normalizeRole('مالك')).toBe('OWNER');
        expect(normalizeRole('مالكة')).toBe('OWNER');
        expect(normalizeRole('وسيط')).toBe('BROKER');
        expect(normalizeRole('وسيطة')).toBe('BROKER');
    });

    it('passes the English enums straight through', () => {
        expect(normalizeRole('AGENT')).toBe('AGENT');
        expect(normalizeRole('owner')).toBe('OWNER');
        expect(normalizeRole('Broker')).toBe('BROKER');
    });

    it('rejects anything else', () => {
        expect(normalizeRole('شيف')).toBeNull();
        expect(normalizeRole('admin')).toBeNull();
        expect(normalizeRole('')).toBeNull();
    });
});

/* ─────────────────────── phone normalization ─────────────────────── */

describe('normalizeEgyptianPhone', () => {
    it('normalizes local / international / 0020 forms to +2010…', () => {
        expect(normalizeEgyptianPhone('01012345678')).toBe('+201012345678');
        expect(normalizeEgyptianPhone('+20 100 123 4567')).toBe('+201001234567');
        expect(normalizeEgyptianPhone('00201012345678')).toBe('+201012345678');
        expect(normalizeEgyptianPhone('010-1234-5678')).toBe('+201012345678');
    });

    it('rejects invalid numbers instead of silently corrupting the lead', () => {
        expect(normalizeEgyptianPhone('02123456789')).toBeNull(); // landline
        expect(normalizeEgyptianPhone('0101234567')).toBeNull(); // too short
        expect(normalizeEgyptianPhone('0691234567')).toBeNull(); // not a mobile
        expect(normalizeEgyptianPhone('abc')).toBeNull();
    });
});

/* ─────────────────────── parser + internal code ─────────────────────── */

describe('parseEasyListing', () => {
    it("reproduces the spec's worked example exactly (NC-MIV-APT-F2-175M)", () => {
        const r = parseEasyListing(AGENT_EXAMPLE);
        expect(r.internal_code).toBe('NC-MIV-APT-F2-175M');
        expect(r.role).toBe('AGENT');
        expect(r.routing_destination).toBe('MAIN_INVENTORY');
        expect(r.property_details).toEqual({
            region: 'New Cairo',
            compound: 'Mivida',
            unit_type: 'Apartment',
            area_m2: 175,
            bedrooms: 3,
            bathrooms: 2,
            price_egp: 8_000_000,
            deal_type: 'sale',
        });
        expect(r.floor_label).toBe('Floor 2');
        expect(r.automation_flags).toEqual({
            auto_publish_ads: true,
            trigger_photo_request_bot: false,
        });
        expect(r.ads).not.toBeNull();
        expect(r.ads!.facebook).toContain('NC-MIV-APT-F2-175M');
        expect(r.ads!.facebook).toContain('8,000,000 EGP');
        expect(r.ads!.facebook).toContain('أحمد فوزي');
        expect(r.ads!.property_finder).toContain('Ref: NC-MIV-APT-F2-175M');
    });

    it('parses Eastern Arabic numerals (١٧٥ متر / ٧.٥ مليون)', () => {
        const r = parseEasyListing({
            role: 'موظف',
            name: 'هبة',
            phone: '01111111111',
            details: 'شقة ١٧٥ متر الدور الثالث ميفيدا ٣ غرف ٢ حمام ٧.٥ مليون',
        });
        expect(r.internal_code).toBe('NC-MIV-APT-F3-175M');
        expect(r.property_details.area_m2).toBe(175);
        expect(r.property_details.price_egp).toBe(7_500_000);
        expect(r.property_details.bedrooms).toBe(3);
        expect(r.property_details.bathrooms).toBe(2);
    });

    it('routes OWNER to MAIN_INVENTORY with ads', () => {
        const r = parseEasyListing({
            role: 'مالك',
            name: 'كريمة',
            phone: '01234567890',
            details: 'فيلا 400 متر روف مدينتي للبيع 22 مليون',
        });
        expect(r.routing_destination).toBe('MAIN_INVENTORY');
        expect(r.automation_flags.auto_publish_ads).toBe(true);
        expect(r.ads).not.toBeNull();
    });

    it('routes BROKER to MAP_SHEET, no ads, photo-request flag on', () => {
        const r = parseEasyListing({
            role: 'وسيط',
            name: 'محمود',
            phone: '01555555555',
            details: 'تاون هاوس 250 متر ميفيدا 5 مليون',
        });
        expect(r.routing_destination).toBe('MAP_SHEET');
        expect(r.automation_flags).toEqual({
            auto_publish_ads: false,
            trigger_photo_request_bot: true,
        });
        expect(r.ads).toBeNull();
    });

    it('maps floors: ground / roof / penthouse / mezzanine / word floors', () => {
        const mk = (details: string) =>
            parseEasyListing({ role: 'AGENT', name: 'Test', phone: '01000000000', details }).internal_code;
        expect(mk('شقة 100 متر الدور الارضي الرحاب')).toContain('-F0-');
        expect(mk('شقة 100 متر روف الرحاب')).toContain('-RUF-'); // roof is also a unit type
        expect(mk('شقة 100 متر بنتهاوس ميفيدا')).toContain('-PEN-');
        expect(mk('شقة 100 متر دور اول ميفيدا')).toContain('-F1-');
        expect(mk('شقة 100 متر الدور الخامس ميفيدا')).toContain('-F5-');
        expect(mk('شقة 100 متر الدور 7 ميفيدا')).toContain('-F7-');
    });

    it('uses FX + warning when the floor is missing (never invents one)', () => {
        const r = parseEasyListing({
            role: 'AGENT',
            name: 'Test',
            phone: '01000000000',
            details: 'شقة 150 متر ميفيدا 6 مليون',
        });
        expect(r.internal_code).toBe('NC-MIV-APT-FX-150M');
        expect(r.parse_warnings).toContain('floor_not_detected');
        expect(r.floor_label).toBeNull();
    });

    it('derives the region from the compound when no region is named', () => {
        const r = parseEasyListing({
            role: 'AGENT',
            name: 'Test',
            phone: '01000000000',
            details: 'شقة 200 متر هايد بارك 9 مليون',
        });
        expect(r.internal_code.startsWith('NC-HDP-')).toBe(true);
        expect(r.property_details.region).toBe('New Cairo');
    });

    it('supports New Capital / Zayed / October regions', () => {
        const mk = (details: string) =>
            parseEasyListing({ role: 'AGENT', name: 'Tester', phone: '01000000000', details }).internal_code;
        expect(mk('شقة 120 متر العاصمة الادارية 4 مليون')).toContain('NCA-');
        expect(mk('شقة 120 متر الشيخ زايد 4 مليون')).toContain('ZYD-');
        expect(mk('شقة 120 متر 6 اكتوبر 4 مليون')).toContain('OCT-');
    });

    it('detects rent', () => {
        const r = parseEasyListing({
            role: 'OWNER',
            name: 'Owner',
            phone: '01000000000',
            details: 'شقة 150 متر للايجار ميفيدا 25 الف شهريا',
        });
        expect(r.property_details.deal_type).toBe('rent');
        expect(r.property_details.price_egp).toBe(25_000);
    });

    it('keeps unknown fields null with warnings — no fabricated defaults', () => {
        const r = parseEasyListing({
            role: 'AGENT',
            name: 'Tester',
            phone: '01000000000',
            details: 'شقة 150 متر ميفيدا',
        });
        expect(r.property_details.price_egp).toBeNull();
        expect(r.property_details.bedrooms).toBeNull();
        expect(r.property_details.bathrooms).toBeNull();
        expect(r.parse_warnings).toEqual(
            expect.arrayContaining([
                'price_not_detected',
                'bedrooms_not_detected',
                'bathrooms_not_detected',
                'floor_not_detected',
                'deal_type_assumed_sale',
            ]),
        );
        // Ads must say "on request", never an invented price.
        expect(r.ads!.facebook).toContain('السعر عند الطلب');
        expect(r.ads!.property_finder).toContain('on request');
    });

    it('falls back to a deterministic latin compound code for unknown compounds', () => {
        const r = parseEasyListing({
            role: 'AGENT',
            name: 'Tester',
            phone: '01000000000',
            details: 'apartment 150 sqm in Sedra New Cairo 5 million',
        });
        expect(r.internal_code.startsWith('NC-SED-APT-')).toBe(true);
        expect(r.parse_warnings).toContain('floor_not_detected');
        // The fallback code comes from a REAL word in the text, never an invention.
        expect(r.property_details.compound).toBe('sedra');
    });

    it('rejects a missing area — the code format requires it', () => {
        expect(() =>
            parseEasyListing({ role: 'AGENT', name: 'Tester', phone: '01000000000', details: 'شقة جميلة جدا في ميفيدا' }),
        ).toThrow(EasyListingValidationError);
    });

    it('rejects invalid role / name / phone', () => {
        expect(() =>
            parseEasyListing({ ...AGENT_EXAMPLE, role: 'شيف' }),
        ).toThrow(EasyListingValidationError);
        expect(() =>
            parseEasyListing({ ...AGENT_EXAMPLE, name: '' }),
        ).toThrow(EasyListingValidationError);
        expect(() =>
            parseEasyListing({ ...AGENT_EXAMPLE, phone: '123' }),
        ).toThrow(EasyListingValidationError);
    });

  it('handles غرفتين / حمامين dual forms without digits', () => {
        const r = parseEasyListing({
            role: 'AGENT',
            name: 'Tester',
            phone: '01000000000',
            details: 'شقة غرفتين حمامين 120 متر الرحاب',
        });
        expect(r.property_details.bedrooms).toBe(2);
        expect(r.property_details.bathrooms).toBe(2);
    });

    it('does not read the م of مليون as a meter unit (price first, area after)', () => {
        const r = parseEasyListing({
            role: 'AGENT',
            name: 'Tester',
            phone: '01000000000',
            details: 'فيلا للبيع 15 مليون مساحة 400 متر',
        });
        // Without the lookahead guard, the bare-م branch would grab "15 م(ليون)"
        // as the area. The real area must win.
        expect(r.property_details.area_m2).toBe(400);
        expect(r.property_details.price_egp).toBe(15_000_000);
        expect(r.internal_code).toContain('-400M');
        expect(r.internal_code).not.toContain('-15M');
    });

    it('emits the exact payload contract the system promises consumers', () => {
        const p = toPayload(parseEasyListing(AGENT_EXAMPLE));
        expect(Object.keys(p).sort()).toEqual(
            [
                'automation_flags',
                'internal_code',
                'property_details',
                'routing_destination',
                'uploader_name',
                'uploader_phone',
                'uploader_role',
            ].sort(),
        );
        expect(Object.keys(p.property_details).sort()).toEqual(
            [
                'area_m2',
                'bathrooms',
                'bedrooms',
                'compound',
                'price_egp',
                'region',
                'unit_type',
            ].sort(),
        );
        expect(Object.keys(p.automation_flags).sort()).toEqual(
            ['auto_publish_ads', 'trigger_photo_request_bot'].sort(),
        );
        expect(p.internal_code).toBe('NC-MIV-APT-F2-175M');
    });
});

/* ─────────────────────── API route ─────────────────────── */

describe('POST /api/easy-listing', () => {
    it('stages AGENT submissions into listings as Pending Review (never a publish)', async () => {
        mockInsertRecord.mockResolvedValueOnce({ id: 'listing-1' });

        const res = await post(AGENT_EXAMPLE);
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.internal_code).toBe('NC-MIV-APT-F2-175M');
        expect(body.routing_destination).toBe('MAIN_INVENTORY');
        expect(body.persisted).toEqual({
            table: 'listings',
            id: 'listing-1',
            status: 'Pending Review',
        });
        expect(body.ads.facebook).toContain('8,000,000 EGP');

        expect(mockInsertRecord).toHaveBeenCalledTimes(1);
        const [table, doc] = mockInsertRecord.mock.calls[0];
        expect(table).toBe('listings');
        expect(doc.status).toBe('Pending Review');
        expect(doc.dealType).toBe('sale');
        expect(doc.price).toBe(8_000_000);
        expect(doc.areaSqm).toBe(175);
        expect(doc.agentName).toBe('أحمد فوزي');
        expect(doc.syncSource).toBe('easy-listing');
        expect(doc.rawData.easy_listing.uploader_phone).toBe('+201012345678');
        // The code lands in the listings.code column.
        expect(doc.code).toBe('NC-MIV-APT-F2-175M');
        // Agent rows must not carry owner columns.
        expect(doc.ownerName).toBeUndefined();
        expect(mockEnqueueWhatsAppJob).not.toHaveBeenCalled();
    });

    it('stages OWNER submissions with owner name + phone columns', async () => {
        mockInsertRecord.mockResolvedValueOnce({ id: 'listing-2' });
        const res = await post({
            role: 'مالك',
            name: 'كريمة',
            phone: '01234567890',
            details: 'فيلا 400 متر مدينتي 22 مليون',
        });
        const body = await res.json();
        expect(body.ok).toBe(true);
        const [, doc] = mockInsertRecord.mock.calls[0];
        expect(doc.ownerName).toBe('كريمة');
        expect(doc.ownerPhone).toBe('+201234567890');
    });

    it('routes BROKER submissions to map_sheet_entries + queues the photo request', async () => {
        mockInsertRecord.mockResolvedValueOnce({ id: 'mse-1' });
        mockEnqueueWhatsAppJob.mockResolvedValueOnce('job-1');

        const res = await post({
            role: 'وسيط',
            name: 'محمود',
            phone: '01555555555',
            details: 'تاون هاوس 250 متر ميفيدا 5 مليون',
        });
        expect(res.status).toBe(200);
        const body = await res.json();

        expect(body.routing_destination).toBe('MAP_SHEET');
        expect(body.ads).toBeNull(); // broker: no ads
        expect(body.persisted).toEqual({
            table: 'map_sheet_entries',
            id: 'mse-1',
            photo_request: 'queued',
        });
        expect(body.payload.automation_flags).toEqual({
            auto_publish_ads: false,
            trigger_photo_request_bot: true,
        });

        // Row first (source of truth), then the WhatsApp job, then the flip.
        const [table, doc] = mockInsertRecord.mock.calls[0];
        expect(table).toBe('map_sheet_entries');
        expect(doc.internalCode).toBe('NC-MIV-TWN-FX-250M');
        expect(doc.uploaderRole).toBe('BROKER');
        expect(doc.photoRequestStatus).toBe('not_requested');

        expect(mockEnqueueWhatsAppJob).toHaveBeenCalledTimes(1);
        const job = mockEnqueueWhatsAppJob.mock.calls[0][0] as Record<string, unknown>;
        expect(job.toPhone).toBe('+201555555555');
        expect(job.purpose).toBe('general-outreach');
        expect(job.body).toContain('NC-MIV-TWN-FX-250M');
        expect(job.body).toContain('صور');
        expect((job.metadata as Record<string, unknown>).kind).toBe('easy-listing-photo-request');

        expect(mockUpdateRecord).toHaveBeenCalledWith('map_sheet_entries', 'mse-1', {
            photoRequestStatus: 'requested',
            photoRequestQueuedAt: expect.any(String),
        });
    });

    it('keeps the map-sheet row when the WhatsApp enqueue fails (non-fatal)', async () => {
        mockInsertRecord.mockResolvedValueOnce({ id: 'mse-2' });
        mockEnqueueWhatsAppJob.mockRejectedValueOnce(new Error('queue down'));

        const res = await post({
            role: 'BROKER',
            name: 'وسيط تاني',
            phone: '01098765432',
            details: 'شقة 90 متر استوديو الرحاب 2 مليون',
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.persisted).toEqual({
            table: 'map_sheet_entries',
            id: 'mse-2',
            photo_request: 'failed',
        });
        expect(mockUpdateRecord).not.toHaveBeenCalled();
    });

    it('rejects invalid bodies with 400', async () => {
        const noRole = await post({ name: 'X', phone: '01000000000', details: 'شقة 100 متر ميفيدا' });
        expect(noRole.status).toBe(400);

        const noArea = await post({
            role: 'موظف',
            name: 'أحمد',
            phone: '01012345678',
            details: 'شقة جميلة في ميفيدا',
        });
        expect(noArea.status).toBe(400);
        const errBody = await noArea.json();
        expect(errBody.error).toContain('area');

        const badJson = await easyListingPOST(
            new Request('https://sierra-estates.net/api/easy-listing', {
                method: 'POST',
                body: 'not json',
            }),
        );
        expect(badJson.status).toBe(400);
    });

    it('degrades to parse-only (persisted null) in sandbox when the DB write fails', async () => {
        mockInsertRecord.mockRejectedValueOnce(new Error('supabase not configured'));

        const res = await post(AGENT_EXAMPLE);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.internal_code).toBe('NC-MIV-APT-F2-175M');
        expect(body.persisted).toBeNull();
    });

    it('surfaces a 502 in production when the listings write fails', async () => {
        const prevEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
            mockInsertRecord.mockRejectedValueOnce(new Error('supabase down'));
            const res = await post(AGENT_EXAMPLE);
            expect(res.status).toBe(502);
        } finally {
            process.env.NODE_ENV = prevEnv;
        }
    });
});
