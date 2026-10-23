/**
 * OWNER LISTING INTAKE REGRESSION TESTS (Phase 11, master execution command)
 *
 * Proves:
 *  1. Real OpenWA message envelopes are normalized (message id survives).
 *  2. Owner unit text is stored durably (intake row created BEFORE asking).
 *  3. Missing fields produce a durable pending intake (NEEDS_INFORMATION).
 *  4. Owner follow-up merges into the SAME intake/unit (no second unit).
 *  6. Duplicate/replayed events do not create duplicate units.
 *  8. New units remain REVIEW_REQUIRED (never published).
 */

jest.mock('@sierra-estates/db', () => {
  // In-memory table store so the intake lifecycle is testable end-to-end.
  const tables: Record<string, any[]> = {
    owner_inbound_events: [],
    owner_listing_intakes: [],
    listings: [],
  };
  const state = { openIntake: null as any };

  const listRecords = jest.fn(async (table: string, opts: any = {}) => {
    let rows = tables[table] ?? [];
    for (const w of opts.where ?? []) {
      rows = rows.filter((r) => String(r[w.column]) === String(w.value));
    }
    return rows.slice(0, opts.limit ?? 100);
  });

  const insertRecord = jest.fn(async (table: string, values: any) => {
    if (table === 'owner_inbound_events') {
      // Unique index (source, message_id) enforced here.
      const source = values.source ?? '';
      if (values.messageId != null) {
        const dupe = tables.owner_inbound_events.some(
          (e) => e.source === source && e.messageId === values.messageId
        );
        if (dupe) {
          throw new Error('duplicate key value violates unique constraint "uq_owner_inbound_events_source_message"');
        }
      }
      const row = { id: `ev-${tables.owner_inbound_events.length + 1}`, ...values };
      tables.owner_inbound_events.push(row);
      return row;
    }
    if (table === 'owner_listing_intakes') {
      const row = {
        id: `intake-${tables.owner_listing_intakes.length + 1}`,
        intakeCode: values.intakeCode,
        state: values.state,
        source: values.source,
        senderPhone: values.senderPhone,
        groupId: values.groupId ?? null,
        extracted: values.extracted ?? {},
        missingFields: values.missingFields ?? [],
        mediaUrls: values.mediaUrls ?? [],
        rawText: values.rawText ?? null,
        unitId: null,
        listingCode: null,
        dupeCheckHash: values.dupeCheckHash ?? null,
        lastError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      tables.owner_listing_intakes.push(row);
      state.openIntake = row;
      return row;
    }
    if (table === 'listings') {
      const row = { id: `unit-${tables.listings.length + 1}`, ...values };
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

  return { listRecords, insertRecord, updateRecord, getRecord: jest.fn(), tables, state };
});

jest.mock('@/lib/services/WhatsAppParserService', () => ({
  WhatsAppParserService: {
    parseMessage: jest.fn(),
  },
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
    /mivida|new cairo/i.test(c ?? '') ? 'New Cairo' : undefined
  ),
  AUGUST_OWNERS_GROUP_ID: '120363044918239011@g.us',
  AugustOwnersAgentService: { isAugustOwnersGroup: jest.fn() },
}));

import { OwnerListingIntakeService } from '../lib/services/OwnerListingIntakeService';
import { WhatsAppParserService } from '../lib/services/WhatsAppParserService';
import * as DBModule from '@sierra-estates/db';

const { tables, state } = DBModule as any;

const COMPLETE_PARSED = {
  isListing: true,
  compound: 'Mivida',
  price: 12_500_000,
  bedrooms: 4,
  bathrooms: 4,
  area: 300,
  type: 'Villa',
  mode: 'sale',
  phoneNumber: '01012345678',
};

describe('OwnerListingIntakeService — durable lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tables.owner_inbound_events.length = 0;
    tables.owner_listing_intakes.length = 0;
    tables.listings.length = 0;
    state.openIntake = null;
    process.env.SUPABASE_SERVICE_ROLE_KEY = undefined;
    (WhatsAppParserService.parseMessage as jest.Mock).mockReset();
  });

  it('3. missing fields produce a DURABLE pending intake BEFORE the owner is asked', async () => {
    (WhatsAppParserService.parseMessage as jest.Mock).mockResolvedValue({
      isListing: true,
      compound: 'Mivida',
      price: 0,
      bedrooms: 4,
    });

    const outcome = await OwnerListingIntakeService.processOwnerMessage({
      source: 'whatsapp-august-owners',
      sender: '201099887766@c.us',
      groupId: '120363044918239011@g.us',
      messageId: 'msg-1',
      text: 'فيلا في ميفيدا للبيع',
    });

    expect(outcome.action).toBe('needs_information');
    // THE fix: an intake row exists durably before any clarification prompt.
    expect(tables.owner_listing_intakes).toHaveLength(1);
    expect(tables.owner_listing_intakes[0].state).toBe('NEEDS_INFORMATION');
    expect(tables.owner_listing_intakes[0].missingFields).toContain('price');
    expect(outcome.missingFields).toContain('price');
    expect(outcome.replyMessage).toContain(tables.owner_listing_intakes[0].intakeCode);
  });

  it('4. the follow-up reply MERGES into the same intake (no second unit)', async () => {
    (WhatsAppParserService.parseMessage as jest.Mock)
      .mockResolvedValueOnce({ isListing: true, compound: 'Mivida', price: 0, bedrooms: 4 })
      .mockResolvedValueOnce({ isListing: true, price: 12_500_000, area: 300, type: 'Villa', mode: 'sale', phoneNumber: '01012345678' });

    await OwnerListingIntakeService.processOwnerMessage({
      source: 'whatsapp-august-owners',
      sender: '201099887766@c.us',
      messageId: 'msg-2',
      text: 'فيلا في ميفيدا',
    });
    await OwnerListingIntakeService.processOwnerMessage({
      source: 'whatsapp-august-owners',
      sender: '201099887766@c.us',
      messageId: 'msg-3',
      text: 'السعر 12.5 مليون مساحة 300 فيلا للبيع 01012345678',
    });

    // One intake, one canonical unit — the reply merged.
    expect(tables.owner_listing_intakes).toHaveLength(1);
    expect(tables.listings).toHaveLength(1);
    expect(tables.owner_listing_intakes[0].unitId).toBe(tables.listings[0].id);
    expect(tables.owner_listing_intakes[0].state).toBe('REVIEW_REQUIRED');
  });

  it('6. a replayed webhook event (same message id) is rejected at the ledger', async () => {
    (WhatsAppParserService.parseMessage as jest.Mock).mockResolvedValue(COMPLETE_PARSED);

    const first = await OwnerListingIntakeService.processOwnerMessage({
      source: 'whatsapp-august-owners',
      sender: '201099887766@c.us',
      messageId: 'msg-replay',
      text: 'فيلا ميفيدا 12.5 مليون',
    });
    expect(first.action).toBe('unit_recorded');
    expect(tables.listings).toHaveLength(1);

    const replay = await OwnerListingIntakeService.processOwnerMessage({
      source: 'whatsapp-august-owners',
      sender: '201099887766@c.us',
      messageId: 'msg-replay', // same provider message id
      text: 'فيلا ميفيدا 12.5 مليون',
    });
    expect(replay.action).toBe('duplicate_event');
    expect(tables.listings).toHaveLength(1); // no second unit
    expect(tables.owner_listing_intakes).toHaveLength(1);
  });

  it('8. a complete new unit is staged REVIEW_REQUIRED — never published', async () => {
    (WhatsAppParserService.parseMessage as jest.Mock).mockResolvedValue(COMPLETE_PARSED);

    const outcome = await OwnerListingIntakeService.processOwnerMessage({
      source: 'whatsapp-august-owners',
      sender: '201099887766@c.us',
      messageId: 'msg-complete',
      text: 'فيلا ميفيدا 12.5 مليون 300م 4 غرف',
    });

    expect(outcome.action).toBe('unit_recorded');
    const listing = tables.listings[0];
    expect(listing.publishStatus).toBe('REVIEW_REQUIRED');
    // P0 3D: an unverified owner submission is NOT a confirmed available
    // fact — the unit stages as 'pending' until human verification.
    expect(listing.status).toBe('pending');
    // Owner intake is NOT human verification.
    expect(listing.verifiedAt).toBeUndefined();
    expect(listing.verifiedBy).toBeUndefined();
  });

  it('2. the raw owner text is stored on the durable intake record', async () => {
    (WhatsAppParserService.parseMessage as jest.Mock).mockResolvedValue(COMPLETE_PARSED);
    const raw = 'فيلا ميفيدا 12.5 مليون 300م 4 غرف للبيع 01012345678';
    await OwnerListingIntakeService.processOwnerMessage({
      source: 'whatsapp-august-owners',
      sender: '201099887766@c.us',
      messageId: 'msg-raw',
      text: raw,
    });
    expect(tables.owner_listing_intakes[0].rawText).toBe(raw);
  });

  it('E. conversational (non-listing) messages create no intake', async () => {
    (WhatsAppParserService.parseMessage as jest.Mock).mockResolvedValue({ isListing: false });
    const outcome = await OwnerListingIntakeService.processOwnerMessage({
      source: 'whatsapp-august-owners',
      sender: '201099887766@c.us',
      messageId: 'msg-chat',
      text: 'صباح الخير',
    });
    expect(outcome.action).toBe('not_a_listing');
    expect(tables.owner_listing_intakes).toHaveLength(0);
    expect(tables.listings).toHaveLength(0);
  });
});
