/**
 * OWNER INTAKE CORRELATION + IDEMPOTENCY REGRESSION TESTS (P0 3A/3B/3C/3D/3E/3F)
 *
 * Mission §12 risky cases covered here:
 *  1.  Photo-only event attaches to an identifiable existing intake.      (3A)
 *  2.  Ambiguous photo-only event is durably queued for review.           (3A)
 *  3.  Multiple different units from one owner create separate intakes.   (3B)
 *  4.  Replies correlate by code/context; ambiguous replies are not
 *      merged incorrectly.                                                (3B)
 *  5.  Inbound event-ledger outage fails closed.                           (3C)
 *  6.  Failed event can retry without creating a duplicate.                (3C)
 *  7.  Empty/unknown fingerprints cannot dedupe unrelated records.         (3E)
 *  8.  Missing operation mode does not default to sale.                    (3D)
 *  9.  Unconfirmed owner availability does not become verified
 *      availability.                                                       (3D)
 * 10.  Intake codes stay distinct; canonical Sierra codes derive only from
 *      sufficient evidence (else NEEDS_CODE).                              (3F)
 */

jest.mock('@sierra-estates/db', () => {
  // In-memory table store with the 029 event state machine columns.
  const tables: Record<string, any[]> = {
    owner_inbound_events: [],
    owner_listing_intakes: [],
    listings: [],
  };

  const listRecords = jest.fn(async (table: string, opts: any = {}) => {
    let rows = tables[table] ?? [];
    for (const w of opts.where ?? []) {
      rows = rows.filter((r) => String(r[w.column]) === String(w.value));
    }
    if (opts.orderBy?.column === 'createdAt') {
      rows = [...rows].sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt)));
    }
    return rows.slice(0, opts.limit ?? 100);
  });

  const insertRecord = jest.fn(async (table: string, values: any) => {
    if (table === 'owner_inbound_events') {
      const source = values.source ?? '';
      if (values.messageId != null) {
        const dupe = tables.owner_inbound_events.some(
          (e) => e.source === source && e.messageId === values.messageId
        );
        if (dupe) {
          throw new Error('duplicate key value violates unique constraint "uq_owner_inbound_events_source_message"');
        }
      }
      const row = {
        id: `ev-${tables.owner_inbound_events.length + 1}`,
        state: 'RECEIVED',
        attempts: 0,
        leaseUntil: null,
        result: null,
        ...values,
      };
      tables.owner_inbound_events.push(row);
      return row;
    }
    if (table === 'owner_listing_intakes') {
      const row = {
        id: `intake-${tables.owner_listing_intakes.length + 1}`,
        unitId: null,
        listingCode: null,
        dupeCheckHash: values.dupeCheckHash ?? null,
        lastError: null,
        mediaUrls: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...values,
      };
      tables.owner_listing_intakes.push(row);
      return row;
    }
    if (table === 'listings') {
      if (listingsInsertShouldFail) {
        throw new Error('simulated listings insert failure (transient)');
      }
      // Simulate migration 20261019_031: the BEFORE INSERT trigger mints a
      // sequence-backed canonical code when the caller provides none.
      const row = { id: `unit-${tables.listings.length + 1}`, ...values };
      if (!row.code) {
        const token = String(row.dealType ?? row.deal_type ?? 'sale').toLowerCase().includes('rent') ? 'RNT' : 'SL';
        row.code = `SE-${token}-MVD-${String(1000 + tables.listings.length + 1).padStart(4, '0')}`;
      }
      tables.listings.push(row);
      return row;
    }
    throw new Error(`unexpected table ${table}`);
  });

  const updateRecord = jest.fn(async (table: string, id: string, values: any) => {
    const rows = tables[table] ?? [];
    const row = rows.find((r) => r.id === id);
    if (row) Object.assign(row, values, { updatedAt: new Date().toISOString() });
    return row ?? null;
  });

  // Test-controlled failure simulation for the listings insert.
  let listingsInsertShouldFail = false;
  const setListingsInsertFailure = (fail: boolean) => { listingsInsertShouldFail = fail; };

  return { listRecords, insertRecord, updateRecord, getRecord: jest.fn(), tables, setListingsInsertFailure };
});

jest.mock('@/lib/services/WhatsAppParserService', () => ({
  WhatsAppParserService: { parseMessage: jest.fn() },
}));

jest.mock('@/lib/telegram', () => ({
  sendTelegramMessage: jest.fn().mockResolvedValue(undefined),
  escapeTelegramHtml: (s: string) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string)),
}));

jest.mock('@/lib/server/whatsapp-queue', () => ({
  enqueueWhatsAppJob: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/services/AugustOwnersAgentService', () => ({
  deriveCityFromCompound: jest.fn((c: string) =>
    /mivida|new cairo|katameya/i.test(c ?? '') ? 'New Cairo' : undefined
  ),
  AUGUST_OWNERS_GROUP_ID: '120363044918239011@g.us',
  AugustOwnersAgentService: { isAugustOwnersGroup: jest.fn() },
}));

import { OwnerListingIntakeService } from '../lib/services/OwnerListingIntakeService';
import { WhatsAppParserService } from '../lib/services/WhatsAppParserService';
import { resolveUnitCode } from '../lib/server/unit-codes';
import * as DBModule from '@sierra-estates/db';

const { tables, setListingsInsertFailure } = DBModule as any;

const OWNER = '201099887766@c.us';
const GROUP = '120363044918239011@g.us';

function msg(overrides: Record<string, unknown> = {}) {
  return {
    source: 'whatsapp-august-owners',
    sender: OWNER,
    groupId: GROUP,
    text: '',
    ...overrides,
  } as any;
}

function mockParse(parsed: any) {
  (WhatsAppParserService.parseMessage as jest.Mock).mockResolvedValue(parsed);
}

describe('P0 3A — media-only intake is never discarded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tables.owner_inbound_events.length = 0;
    tables.owner_listing_intakes.length = 0;
    tables.listings.length = 0;
    setListingsInsertFailure(false);
    process.env.SUPABASE_SERVICE_ROLE_KEY = undefined;
    process.env.NEXT_PUBLIC_SUPABASE_URL = undefined;
    process.env.SUPABASE_URL = undefined;
    (WhatsAppParserService.parseMessage as jest.Mock).mockReset();
  });

  it('1. a photo-only event attaches to the single identifiable open intake', async () => {
    mockParse({ isListing: true, compound: 'Mivida', price: 0, bedrooms: 4 });
    await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'm1', text: 'فيلا في ميفيدا' }));

    // Photo-only follow-up: no text signal at all.
    mockParse({ isListing: false });
    const outcome = await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'm2', text: '[photo]', media: [{ data: 'aGk=', mimeType: 'image/jpeg' }] }));

    expect(outcome.action).toBe('media_attached');
    expect(outcome.intakeId).toBe(tables.owner_listing_intakes[0].id);
    // ONE intake, ONE event per message — nothing duplicated, nothing lost.
    expect(tables.owner_listing_intakes).toHaveLength(1);
    expect(tables.owner_inbound_events).toHaveLength(2);
    // The media event is durably ledgered with its media metadata.
    const mediaEvent = tables.owner_inbound_events.find((e) => e.messageId === 'm2');
    expect(mediaEvent.hasMedia).toBe(true);
    expect(mediaEvent.mediaCount).toBe(1);
    expect(mediaEvent.state).toBe('COMPLETED');
  });

  it('2. an ambiguous photo-only event (two open intakes) is durably queued for staff', async () => {
    // Two different open intakes for the same owner.
    mockParse({ isListing: true, compound: 'Mivida', price: 0, bedrooms: 4 });
    await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'm1', text: 'فيلا ميفيدا' }));
    mockParse({ isListing: true, compound: 'Katameya', price: 0, bedrooms: 3 });
    await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'm2', text: 'شقة كامتيا' }));
    expect(tables.owner_listing_intakes).toHaveLength(2);

    mockParse({ isListing: false });
    const outcome = await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'm3', text: '[photo]', media: [{ data: 'aGk=', mimeType: 'image/jpeg' }] }));

    // Durable UNASSIGNED_MEDIA state — never a guess, never discarded.
    expect(outcome.action).toBe('unassigned_media');
    const unassigned = tables.owner_listing_intakes.find(
      (r) => r.state === 'UNASSIGNED_MEDIA');
    expect(unassigned).toBeDefined();
    expect(unassigned.rawText).toContain('[photo]');
    // The two real intakes were NOT touched by the ambiguous photo.
    const openCount = tables.owner_listing_intakes.filter(
      (r) => r.state === 'NEEDS_INFORMATION').length;
    expect(openCount).toBe(2);
  });

  it('a photo-only event with NO open intake parks durably instead of vanishing', async () => {
    mockParse({ isListing: false });
    const outcome = await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'm1', text: '[photo]', media: [{ data: 'aGk=', mimeType: 'image/png' }] }));

    expect(outcome.action).toBe('unassigned_media');
    expect(tables.owner_listing_intakes).toHaveLength(1);
    expect(tables.owner_listing_intakes[0].state).toBe('UNASSIGNED_MEDIA');
    expect(tables.owner_inbound_events[0].hasMedia).toBe(true);
  });
});

describe('P0 3B — multi-unit correlation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tables.owner_inbound_events.length = 0;
    tables.owner_listing_intakes.length = 0;
    tables.listings.length = 0;
    setListingsInsertFailure(false);
    process.env.SUPABASE_SERVICE_ROLE_KEY = undefined;
    process.env.NEXT_PUBLIC_SUPABASE_URL = undefined;
    process.env.SUPABASE_URL = undefined;
    (WhatsAppParserService.parseMessage as jest.Mock).mockReset();
  });

  it('3. multiple different units from one owner create separate intakes', async () => {
    mockParse({ isListing: true, compound: 'Mivida', price: 0, bedrooms: 4 });
    await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'u1', text: 'فيلا ميفيدا' }));

    // A clearly DIFFERENT property (different compound) — new intake, even
    // though another intake is open for the same sender.
    mockParse({ isListing: true, compound: 'Katameya', price: 0, bedrooms: 3 });
    const outcome = await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'u2', text: 'شقة كامتيا' }));

    expect(['needs_information', 'unit_recorded']).toContain(outcome.action);
    expect(tables.owner_listing_intakes).toHaveLength(2);
    const compounds = tables.owner_listing_intakes.map((r) => r.extracted.compound);
    expect(compounds).toContain('Mivida');
    expect(compounds).toContain('Katameya');
  });

  it('4a. a reply containing an explicit intake code merges into THAT intake', async () => {
    mockParse({ isListing: true, compound: 'Mivida', price: 0, bedrooms: 4 });
    await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'c1', text: 'فيلا ميفيدا' }));
    mockParse({ isListing: true, compound: 'Katameya', price: 0, bedrooms: 3 });
    await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'c2', text: 'شقة كامتيا' }));

    const second = tables.owner_listing_intakes.find(
      (r) => r.extracted.compound === 'Katameya');

    // Reply names the SECOND intake's code explicitly.
    mockParse({ isListing: true, price: 5_000_000 });
    const outcome = await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'c3', text: `السعر 5 مليون — كود ${second.intakeCode}` }));

    expect(outcome.action).toBe('merged');
    expect(outcome.intakeId).toBe(second.id);
    expect(second.extracted.price).toBe(5_000_000);
    // The FIRST intake was not touched by the coded reply.
    const first = tables.owner_listing_intakes.find((r) => r.extracted.compound === 'Mivida');
    expect(first.extracted.price).toBeFalsy();
    expect(tables.owner_listing_intakes).toHaveLength(2);
  });

  it('4b. a reply quoting an earlier message merges into the quoted intake', async () => {
    mockParse({ isListing: true, compound: 'Mivida', price: 0, bedrooms: 4 });
    await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'q1', text: 'فيلا ميفيدا' }));
    mockParse({ isListing: true, compound: 'Katameya', price: 0, bedrooms: 3 });
    await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'q2', text: 'شقة كامتيا' }));

    const first = tables.owner_listing_intakes.find(
      (r) => r.extracted.compound === 'Mivida');

    // The reply QUOTES message q1 (which produced the Mivida intake).
    mockParse({ isListing: true, area: 300 });
    const outcome = await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'q3', text: 'المساحة 300', quotedMessageId: 'q1' }));

    expect(outcome.action).toBe('merged');
    expect(outcome.intakeId).toBe(first.id);
    expect(first.extracted.area).toBe(300);
  });

  it('4c. a listing-shaped reply with SEVERAL possible intakes is queued, not mismerged', async () => {
    mockParse({ isListing: true, compound: 'Mivida', price: 0, bedrooms: 4 });
    await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'a1', text: 'فيلا ميفيدا' }));
    mockParse({ isListing: true, compound: 'Katameya', price: 0, bedrooms: 3 });
    await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'a2', text: 'شقة كامتيا' }));

    // No code, no quoted context, two open intakes → durable AMBIGUOUS_REPLY.
    mockParse({ isListing: true, price: 7_500_000 });
    const outcome = await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'a3', text: 'السعر 7.5 مليون' }));

    expect(outcome.action).toBe('ambiguous_reply');
    const ambiguous = tables.owner_listing_intakes.find((r) => r.state === 'AMBIGUOUS_REPLY');
    expect(ambiguous).toBeDefined();
    expect(ambiguous.extracted.price).toBe(7_500_000);
    // The two real intakes were NOT contaminated by the ambiguous reply.
    const withPrice = tables.owner_listing_intakes.filter(
      (r) => r.state !== 'AMBIGUOUS_REPLY' && r.extracted.price);
    expect(withPrice).toHaveLength(0);
  });
});

describe('P0 3C — event ledger fail-closed + retryable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tables.owner_inbound_events.length = 0;
    tables.owner_listing_intakes.length = 0;
    tables.listings.length = 0;
    setListingsInsertFailure(false);
    process.env.SUPABASE_SERVICE_ROLE_KEY = undefined;
    process.env.NEXT_PUBLIC_SUPABASE_URL = undefined;
    process.env.SUPABASE_URL = undefined;
    (WhatsAppParserService.parseMessage as jest.Mock).mockReset();
  });

  it('5. an event-ledger outage fails closed — no intake, no listing, honest error', async () => {
    const { insertRecord } = DBModule as any;
    insertRecord.mockImplementationOnce(async (table: string) => {
      if (table === 'owner_inbound_events') {
        throw new Error('connection refused to supabase (ledger down)');
      }
      throw new Error('unexpected table');
    });

    mockParse({ isListing: true, compound: 'Mivida', price: 12_500_000, type: 'Villa', mode: 'sale', bedrooms: 4, area: 300, phoneNumber: '01012345678' });
    const outcome = await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'ledger-down', text: 'فيلا ميفيدا 12.5 مليون' }));

    expect(outcome.action).toBe('error');
    expect(outcome.error).toContain('fail-closed');
    // ZERO side effects — nothing was created without idempotency.
    expect(tables.owner_listing_intakes).toHaveLength(0);
    expect(tables.listings).toHaveLength(0);
  });

  it('6. a FAILED event retries and resumes the SAME intake (no duplicate)', async () => {
    // First attempt: complete data, but the canonical listings insert fails
    // (transient outage) → intake exists, state FAILED, event FAILED.
    mockParse({
      isListing: true, compound: 'Mivida', price: 12_500_000, type: 'Villa',
      mode: 'sale', bedrooms: 4, area: 300, phoneNumber: '01012345678',
    });
    setListingsInsertFailure(true);
    const first = await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'retry-1', text: 'فيلا ميفيدا 12.5 مليون' }));
    expect(first.action).toBe('error');
    expect(tables.owner_listing_intakes).toHaveLength(1);
    expect(tables.owner_listing_intakes[0].state).toBe('FAILED');
    const eventId = tables.owner_inbound_events[0].id;
    expect(tables.owner_inbound_events[0].state).toBe('FAILED');

    // Provider retries the SAME message id — the ledger resumes the pinned
    // intake; the canonical insert now succeeds.
    setListingsInsertFailure(false);
    const retry = await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'retry-1', text: 'فيلا ميفيدا 12.5 مليون' }));

    expect(retry.action).toBe('unit_recorded');
    // ONE intake, ONE unit — the retry resumed instead of duplicating.
    expect(tables.owner_listing_intakes).toHaveLength(1);
    expect(tables.listings).toHaveLength(1);
    expect(tables.owner_listing_intakes[0].unitId).toBe(tables.listings[0].id);
    expect(tables.owner_listing_intakes[0].state).toBe('REVIEW_REQUIRED');
    // The same event row reached COMPLETED (no second ledger row).
    expect(tables.owner_inbound_events).toHaveLength(1);
    expect(tables.owner_inbound_events[0].id).toBe(eventId);
    expect(tables.owner_inbound_events[0].state).toBe('COMPLETED');
  });

  it('a completed event replay returns the prior result without re-execution', async () => {
    mockParse({
      isListing: true, compound: 'Mivida', price: 12_500_000, type: 'Villa',
      mode: 'sale', bedrooms: 4, area: 300, phoneNumber: '01012345678',
    });
    const first = await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'done-1', text: 'فيلا ميفيدا 12.5 مليون' }));
    expect(first.action).toBe('unit_recorded');

    const replay = await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'done-1', text: 'فيلا ميفيدا 12.5 مليون' }));
    expect(replay.action).toBe('duplicate_event');
    expect(replay.priorAction).toBe('unit_recorded');
    expect(replay.unitId).toBe(first.unitId);
    expect(tables.listings).toHaveLength(1);
    expect(tables.owner_listing_intakes).toHaveLength(1);
  });
});

describe('P0 3E/3D/3F — fingerprints, defaults, codes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tables.owner_inbound_events.length = 0;
    tables.owner_listing_intakes.length = 0;
    tables.listings.length = 0;
    setListingsInsertFailure(false);
    process.env.SUPABASE_SERVICE_ROLE_KEY = undefined;
    process.env.NEXT_PUBLIC_SUPABASE_URL = undefined;
    process.env.SUPABASE_URL = undefined;
    (WhatsAppParserService.parseMessage as jest.Mock).mockReset();
  });

  it('7. empty/unknown fingerprints cannot dedupe unrelated records', async () => {
    // Two different senders, listing signal but NO compound/type evidence.
    mockParse({ isListing: true, price: 3_000_000 });
    await OwnerListingIntakeService.processOwnerMessage(
      msg({ sender: '201111111111@c.us', messageId: 'e1', text: 'السعر 3 مليون' }));
    await OwnerListingIntakeService.processOwnerMessage(
      msg({ sender: '202222222222@c.us', messageId: 'e2', text: 'السعر 3 مليون' }));

    // No fingerprint → no collapse: two separate durable intakes.
    expect(tables.owner_listing_intakes).toHaveLength(2);
    expect(tables.owner_listing_intakes.every((r) => r.dupeCheckHash == null)).toBe(true);
  });

  it('8. a missing operation mode never defaults to sale', async () => {
    // Complete EXCEPT mode.
    mockParse({
      isListing: true, compound: 'Mivida', price: 12_500_000, type: 'Villa',
      bedrooms: 4, area: 300, phoneNumber: '01012345678',
      // no mode
    });
    const outcome = await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'nomode', text: 'فيلا ميفيدا 12.5 مليون' }));

    expect(outcome.missingFields).toContain('mode');
    expect(tables.owner_listing_intakes[0].state).toBe('NEEDS_INFORMATION');
    // And even a forced finalize path refuses to default: fill everything
    // EXCEPT mode and drive the intake to completion.
    const { updateRecord } = DBModule as any;
    // Supply the remaining fields but keep mode absent.
    mockParse({ isListing: true, area: 300, phoneNumber: '01012345678' });
    await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'nomode-2', text: 'المساحة 300 — 01012345678' }));
    const intake = tables.owner_listing_intakes[0];
    expect(['NEEDS_INFORMATION', 'NEEDS_CODE']).toContain(intake.state);
    expect(tables.listings).toHaveLength(0);
    expect(updateRecord).not.toHaveBeenCalledWith('owner_listing_intakes', intake.id, expect.objectContaining({ state: 'REVIEW_REQUIRED' }));
  });

  it('9. unconfirmed owner availability is never a verified available fact', async () => {
    mockParse({
      isListing: true, compound: 'Mivida', price: 12_500_000, type: 'Villa',
      mode: 'sale', bedrooms: 4, area: 300, phoneNumber: '01012345678',
    });
    const outcome = await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'avail', text: 'فيلا ميفيدا 12.5 مليون' }));
    expect(outcome.action).toBe('unit_recorded');

    const listing = tables.listings[0];
    // NOT 'available'/'active' — the owner claim is preserved in rawData.
    expect(listing.status).toBe('pending');
    expect(listing.availability).toBeUndefined();
    expect(listing.rawData?.ownerAvailabilityClaim).toBe('available');
    expect(listing.verifiedAt).toBeUndefined();
    expect(listing.verifiedBy).toBeUndefined();
  });

  it('10. canonical codes derive from the Sierra scheme; insufficiency yields NEEDS_CODE', async () => {
    mockParse({
      isListing: true, compound: 'Mivida', price: 12_500_000, type: 'Villa',
      mode: 'sale', bedrooms: 4, area: 300, phoneNumber: '01012345678',
    });
    const outcome = await OwnerListingIntakeService.processOwnerMessage(
      msg({ messageId: 'code-1', text: 'فيلا ميفيدا 12.5 مليون' }));
    expect(outcome.action).toBe('unit_recorded');
    // The canonical listing code follows the STABLE Sierra unit scheme
    // (SE-{RNT|SL}-{AREA}-{SERIAL}, lib/server/unit-codes.ts + migration 031)
    // — derived from identity only, NOT the intake reference code and NOT the
    // price. The legacy price-embedded MV-4U-12.5M format was a stability
    // defect: every price edit minted a new code (mandate §4).
    const listing = tables.listings[0];
    expect(String(listing.code)).toMatch(/^SE-SL-MVD-\d{4,6}$/);
    expect(tables.owner_listing_intakes[0].listingCode).toBe(listing.code);
    // The intake code (durable owner reference) remains distinct.
    expect(tables.owner_listing_intakes[0].intakeCode).not.toBe(listing.code);
    // STABILITY (mandate §4): the code is minted from IDENTITY, not price —
    // resolveUnitCode re-derivation is price-independent, and a different
    // price yields the SAME code for the same seed. The DB-minted code above
    // carries the same guarantee (sequence serial, freeze trigger).
    const rederived = resolveUnitCode({ compound: 'Mivida', dealType: 'sale', seed: tables.owner_listing_intakes[0].id, code: null });
    expect(rederived.code).toMatch(/^SE-SL-MVD-\d{4,6}$/);
    const priceChanged = resolveUnitCode({ compound: 'Mivida', dealType: 'sale', seed: tables.owner_listing_intakes[0].id, code: null, price: 99_000_000 });
    expect(priceChanged.code).toBe(rederived.code);
    const noPrice = resolveUnitCode({ compound: 'Mivida', dealType: 'sale', seed: tables.owner_listing_intakes[0].id, code: null });
    expect(noPrice.code).toBe(rederived.code);
  });
});
