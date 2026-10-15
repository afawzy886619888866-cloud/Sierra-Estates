/**
 * OWNER INTAKE IDEMPOTENCY REGRESSION TESTS (Phase 6 mission contract)
 *
 * Pins the fail-closed / honest-persistence behaviors added in the 2026-10
 * production-recovery pass:
 *
 *   6.1  an event WITHOUT a provider message id is REJECTED to manual review —
 *        no intake, no listing, no external reply (the old `no_ledger` bypass
 *        continued without deduplication).
 *   6.2  a FAILED claim update never reports the event as claimed — no side
 *        effects follow a failed RECEIVED→PROCESSING transition.
 *   6.3  a failed COMPLETION write surfaces an `uncertain: true` outcome
 *        instead of a silently-upgraded success; the ledger stays retryable.
 *   6.4  a database outage during duplicate/correlation lookups FAILS CLOSED —
 *        an unreachable database is never interpreted as "no duplicate".
 */

jest.mock('@sierra-estates/db', () => {
  // In-memory table store so the intake lifecycle is testable end-to-end.
  const tables: Record<string, any[]> = {
    owner_inbound_events: [],
    owner_listing_intakes: [],
    listings: [],
  };
  // Failure injection: key -> { message, skip } — the first `skip` calls pass
  // through, the next one throws. Lets tests target a SPECIFIC write (e.g.
  // fail the completion but not the claim).
  const failNext: Record<string, { message: string; skip: number } | undefined> = {};

  const maybeFail = (key: string) => {
    const st = failNext[key];
    if (!st) return;
    if (st.skip > 0) { st.skip -= 1; return; }
    delete failNext[key];
    throw new Error(st.message);
  };

  const listRecords = jest.fn(async (table: string, opts: any = {}) => {
    maybeFail(`listRecords:${table}`);
    let rows = tables[table] ?? [];
    for (const w of opts.where ?? []) {
      rows = rows.filter((r) => String(r[w.column]) === String(w.value));
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
      const row = { id: `ev-${tables.owner_inbound_events.length + 1}`, attempts: 0, ...values };
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...values,
      };
      tables.owner_listing_intakes.push(row);
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
    maybeFail(`updateRecord:${table}`);
    const rows = tables[table] ?? [];
    const row = rows.find((r) => r.id === id);
    if (row) Object.assign(row, values, { updatedAt: new Date().toISOString() });
    return row ?? null;
  });

  return { listRecords, insertRecord, updateRecord, getRecord: jest.fn(), tables, failNext };
});

jest.mock('@/lib/services/WhatsAppParserService', () => ({
  WhatsAppParserService: { parseMessage: jest.fn() },
}));

jest.mock('@/lib/telegram', () => ({
  sendTelegramMessage: jest.fn().mockResolvedValue(undefined),
  escapeTelegramHtml: (s: string) => String(s ?? ''),
}));

jest.mock('@/lib/server/whatsapp-queue', () => ({
  enqueueWhatsAppJob: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/services/AugustOwnersAgentService', () => ({
  deriveCityFromCompound: jest.fn(() => undefined),
  AugustOwnersAgentService: { isAugustOwnersGroup: jest.fn() },
}));

import { OwnerListingIntakeService } from '../lib/services/OwnerListingIntakeService';
import { WhatsAppParserService } from '../lib/services/WhatsAppParserService';
import * as DBModule from '@sierra-estates/db';

const { tables, failNext } = DBModule as any;

const COMPLETE_PARSED = {
  isListing: true,
  compound: 'Mivida',
  price: 12_500_000,
  bedrooms: 4,
  bathrooms: 4,
  area: 300,
  type: 'Villa',
  mode: 'sale',
};

const msg = (overrides: Record<string, unknown> = {}) => ({
  source: 'whatsapp-august-owners',
  sender: '201099887766@c.us',
  groupId: '120363044918239011@g.us',
  messageId: 'mid-1',
  text: 'فيلا ميفيدا للبيع 12.5 مليون',
  ...overrides,
});

describe('OwnerListingIntakeService — idempotency & fail-closed contract (Phase 6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tables.owner_inbound_events.length = 0;
    tables.owner_listing_intakes.length = 0;
    tables.listings.length = 0;
    Object.keys(failNext).forEach((k) => delete failNext[k]);
    process.env.SUPABASE_SERVICE_ROLE_KEY = undefined;
    (WhatsAppParserService.parseMessage as jest.Mock).mockReset();
    (WhatsAppParserService.parseMessage as jest.Mock).mockResolvedValue({ ...COMPLETE_PARSED });
  });

  it('6.1: an event without a provider message id is rejected — no intake, no listing, no reply', async () => {
    const outcome = await OwnerListingIntakeService.processOwnerMessage(msg({ messageId: undefined }));

    expect(outcome.action).toBe('error');
    expect(outcome.error).toMatch(/missing provider message id/i);
    expect(outcome.error).toMatch(/manual review/i);
    // Nothing was created and nothing was enqueued to the owner.
    expect(tables.owner_listing_intakes).toHaveLength(0);
    expect(tables.listings).toHaveLength(0);
    // No event row either: without an id there is no ledger identity.
    expect(tables.owner_inbound_events).toHaveLength(0);
  });

  it('6.2: a FAILED claim update produces a fail-closed error — the event is not processed', async () => {
    failNext['updateRecord:owner_inbound_events'] = { message: 'simulated claim write outage', skip: 0 };
    const outcome = await OwnerListingIntakeService.processOwnerMessage(msg({ messageId: 'mid-claim-fail' }));

    expect(outcome.action).toBe('error');
    expect(outcome.error).toMatch(/fail-closed/i);
    // The insert happened but processing must NOT have followed.
    expect(tables.owner_inbound_events).toHaveLength(1);
    expect(tables.owner_inbound_events[0].state).toBe('RECEIVED');
    expect(tables.owner_listing_intakes).toHaveLength(0);
    expect(tables.listings).toHaveLength(0);
  });

  it('6.3: a failed completion write marks the outcome uncertain (never a silent success)', async () => {
    // skip:1 — the FIRST update (RECEIVED→PROCESSING claim) succeeds; the
    // SECOND update (COMPLETED write) fails, after the unit side effect.
    failNext['updateRecord:owner_inbound_events'] = { message: 'simulated completion write outage', skip: 1 };
    const outcome = await OwnerListingIntakeService.processOwnerMessage(msg({ messageId: 'mid-complete-fail' }));

    // The work happened (unit recorded) but the ledger write failed → uncertain.
    expect(outcome.uncertain).toBe(true);
    expect(['unit_recorded', 'needs_information', 'merged']).toContain(outcome.action);
    // Ledger row still shows PROCESSING (lease-pending), not COMPLETED.
    const row = tables.owner_inbound_events.find((e) => e.messageId === 'mid-complete-fail');
    expect(row?.state).toBe('PROCESSING');
  });

  it('6.4a: a duplicate-check lookup outage fails CLOSED — no duplicate intake is created', async () => {
    failNext['listRecords:owner_listing_intakes'] = { message: 'simulated dedupe outage', skip: 0 };
    const outcome = await OwnerListingIntakeService.processOwnerMessage(msg({ messageId: 'mid-dedupe-fail' }));

    expect(outcome.action).toBe('error');
    // The event is FAILED (retryable), not COMPLETED with a fabricated duplicate verdict.
    const row = tables.owner_inbound_events.find((e) => e.messageId === 'mid-dedupe-fail');
    expect(row?.state).toBe('FAILED');
    expect(tables.owner_listing_intakes).toHaveLength(0);
    expect(tables.listings).toHaveLength(0);
  });

  it('6.4b: an open-intake lookup outage fails CLOSED instead of starting a duplicate intake', async () => {
    // First: a valid intake exists (missing fields so it stays open).
    (WhatsAppParserService.parseMessage as jest.Mock).mockResolvedValue({
      isListing: true,
      compound: 'Mivida',
      price: 0,
      bedrooms: 4,
    });
    const first = await OwnerListingIntakeService.processOwnerMessage(msg({ messageId: 'mid-open-1' }));
    expect(first.action).toBe('needs_information');
    expect(tables.owner_listing_intakes).toHaveLength(1);

    // Second: same owner sends a follow-up; the open-intake lookup breaks.
    (WhatsAppParserService.parseMessage as jest.Mock).mockResolvedValue({ ...COMPLETE_PARSED });
    failNext['listRecords:owner_listing_intakes'] = { message: 'simulated correlation outage', skip: 0 };
    const second = await OwnerListingIntakeService.processOwnerMessage(msg({ messageId: 'mid-open-2' }));

    expect(second.action).toBe('error');
    // A DB outage must not look like "no open intake" → still exactly ONE intake.
    expect(tables.owner_listing_intakes).toHaveLength(1);
    const row = tables.owner_inbound_events.find((e) => e.messageId === 'mid-open-2');
    expect(row?.state).toBe('FAILED');
  });

  it('6.2/3C: replay of a FAILED event resumes the pinned intake instead of creating a second one', async () => {
    // Step 1 — create an open intake, then force its event to FAILED state
    // (simulating a prior partial failure that pinned the intake).
    (WhatsAppParserService.parseMessage as jest.Mock).mockResolvedValue({
      isListing: true,
      compound: 'Mivida',
      price: 0,
      bedrooms: 4,
    });
    const first = await OwnerListingIntakeService.processOwnerMessage(msg({ messageId: 'mid-resume' }));
    expect(first.action).toBe('needs_information');
    expect(tables.owner_listing_intakes).toHaveLength(1);
    const intakeId = tables.owner_listing_intakes[0].id;
    const evRow = tables.owner_inbound_events.find((e) => e.messageId === 'mid-resume');
    expect(evRow).toBeDefined();
    evRow.state = 'FAILED';
    evRow.intakeId = intakeId; // pinned by the failEvent contract

    // Step 2 — provider replays the same message id with the complete facts.
    (WhatsAppParserService.parseMessage as jest.Mock).mockResolvedValue({ ...COMPLETE_PARSED });
    const replay = await OwnerListingIntakeService.processOwnerMessage(msg({ messageId: 'mid-resume' }));

    // The SAME intake is resumed — never a second one.
    expect(tables.owner_listing_intakes).toHaveLength(1);
    expect(['merged', 'unit_recorded', 'needs_information']).toContain(replay.action);
    expect(replay.intakeId ?? intakeId).toBe(intakeId);
  });
});
