/**
 * Route-level regression (G2 wiring, 2026-10-19): /api/ingest/whatsapp.
 *
 * Pins the canonical-inventory contract added under the autonomous mandate:
 *   1. A parsed listing with the complete §21 field set enters canonical
 *      `listings` (fingerprint id, dupeCheckHash, draft status for scrapes)
 *      AND the legacy broker_listings staging row — both, in that order.
 *   2. An incomplete parsed listing skips canonical inventory honestly
 *      (§21): staging still records the raw evidence.
 *   3. A canonical DB failure fails the request (500 → provider retry) with
 *      NO staging row — canonical inventory can never be silently missing.
 *   4. The (sender|message) dedupe short-circuit is preserved.
 */
import { __resetInventoryServiceSingleton } from '../lib/services/inventory/ingest-bridge';
import { GravityMemory } from '@sierra-estates/gravity-memory';
import type { RecordData } from '@sierra-estates/db';

jest.mock('@sierra-estates/db', () => {
  const tables: Record<string, Map<string, any>> = {};
  const failures: Record<string, Error> = {};
  const table = (name: string) => {
    if (!tables[name]) tables[name] = new Map();
    return tables[name];
  };

  const getRecord = jest.fn(async (t: string, id: string) => {
    if (failures.get) throw failures.get;
    return table(t).get(id) ?? null;
  });
  const upsertRecord = jest.fn(async (t: string, values: any) => {
    if (failures.upsert) throw failures.upsert;
    const hash = values.dupeCheckHash ?? null;
    if (hash) {
      for (const [existingId, row] of table(t).entries()) {
        if (existingId !== values.id && row.dupeCheckHash === hash) {
          throw new Error(
            `[supabase:upsert ${t}] duplicate key value violates unique constraint "uq_listings_dupe_check_hash"`,
          );
        }
      }
    }
    table(t).set(values.id, values);
    return values;
  });
  const updateRecord = jest.fn(async (t: string, id: string, values: any) => {
    if (failures.update) throw failures.update;
    const row = table(t).get(id);
    if (!row) return null;
    Object.assign(row, values);
    return row;
  });
  const listRecords = jest.fn(async (t: string, opts: any = {}) => {
    if (failures.list) throw failures.list;
    let rows = [...table(t).values()];
    for (const w of opts.where ?? []) {
      rows = rows.filter((r) => String(r[w.column]) === String(w.value));
    }
    return rows.slice(0, opts.limit ?? rows.length);
  });
  const insertRecord = jest.fn(async (t: string, values: any) => {
    if (failures.insert) throw failures.insert;
    const id = values.id ?? `row-${table(t).size + 1}`;
    table(t).set(id, { ...values, id });
    return { ...values, id };
  });

  const __reset = () => {
    for (const k of Object.keys(tables)) delete tables[k];
    for (const k of Object.keys(failures)) delete failures[k];
  };
  const __fail = (op: string, err: Error) => {
    (failures as any)[op] = err;
  };
  const __dump = (t: string) => [...table(t).values()];

  return { getRecord, upsertRecord, updateRecord, listRecords, insertRecord, assertCanonicalBackendForWrites: jest.fn(), __reset, __fail, __dump };
});

const parseMessage = jest.fn();
jest.mock('@/lib/services/WhatsAppParserService', () => ({
  WhatsAppParserService: { parseMessage: (...a: unknown[]) => parseMessage(...(a as [string])) },
}));

jest.mock('@/lib/services/AugustOwnersAgentService', () => ({
  AugustOwnersAgentService: { isAugustOwnersGroup: jest.fn().mockReturnValue(false) },
}));

jest.mock('@/lib/services/WhatsAppConversationalService', () => ({
  WhatsAppConversationalService: { processDirectMessage: jest.fn() },
}));

jest.mock('@/lib/services/sheets-sync', () => ({
  GoogleSheetsSync: { appendRow: jest.fn().mockResolvedValue({}) },
}));

jest.mock('@/lib/services/orchestrator', () => ({
  OrchestratorService: { runPipeline: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@/lib/server/google-ai', () => ({
  GoogleAIService: { generateContent: jest.fn() },
}));

import { POST } from '../app/api/ingest/whatsapp/route';
import { NextRequest } from 'next/server';

const mocked = jest.requireMock('@sierra-estates/db') as {
  insertRecord: jest.Mock;
  listRecords: jest.Mock;
  __reset: () => void;
  __fail: (op: string, err: Error) => void;
  __dump: (t: string) => RecordData[];
};

const SECRET = 'sbr-test-secret';

function post(body: unknown): NextRequest {
  return new NextRequest('https://sierra-estates.net/api/ingest/whatsapp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-sbr-secret-key': SECRET },
    body: JSON.stringify(body),
  });
}

const COMPLETE_MESSAGE =
  'شقة للبيع في ميفيدا 210 متر 3 غرف نوم سعر 8,500,000 جنيه تشطيب كامل';

const COMPLETE_PARSED = {
  isListing: true,
  compound: 'Mivida',
  type: 'apartment',
  bedrooms: 3,
  area: 210,
  price: 8_500_000,
  currency: 'EGP',
  finishing: 'fully_finished',
};

describe('/api/ingest/whatsapp — canonical inventory wiring (G2, 2026-10-19)', () => {
  beforeEach(() => {
    mocked.__reset();
    GravityMemory.reset();
    __resetInventoryServiceSingleton();
    parseMessage.mockReset().mockResolvedValue(COMPLETE_PARSED);
    process.env.SBR_SECRET_KEY = SECRET;
  });

  it('1. complete listing → canonical row + staging row, in that order', async () => {
    const res = await POST(post({ message: COMPLETE_MESSAGE, sender: '+201000000001', groupName: 'NC Brokers' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.canonical).toMatchObject({ action: 'created' });
    expect(body.canonical.fingerprint).toMatch(/^[a-f0-9]{24}$/);

    const canonicalRows = mocked.__dump('listings');
    expect(canonicalRows).toHaveLength(1);
    expect(canonicalRows[0].dupeCheckHash).toBe(body.canonical.fingerprint);
    expect(canonicalRows[0].status).toBe('draft'); // scrapes enter as draft
    expect(canonicalRows[0].syncSource).toBe('whatsapp_scrape');

    const stagingRows = mocked.__dump('broker_listings');
    expect(stagingRows).toHaveLength(1);
    expect(stagingRows[0].extractedData?.compound).toBe('Mivida');
  });

  it('2. §21-incomplete listing (no area) → staging only, canonical honestly null', async () => {
    parseMessage.mockResolvedValue({ ...COMPLETE_PARSED, area: undefined });

    const res = await POST(post({ message: COMPLETE_MESSAGE, sender: '+201000000002', groupName: 'NC Brokers' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.canonical).toBeNull();
    expect(mocked.__dump('listings')).toHaveLength(0);   // nothing fabricated
    expect(mocked.__dump('broker_listings')).toHaveLength(1); // evidence kept
  });

  it('3. canonical DB failure → 500 and NO staging row (retry-safe ordering)', async () => {
    mocked.__fail('upsert', new Error('[supabase:upsert listings] Connection error: fetch failed'));

    const res = await POST(post({ message: COMPLETE_MESSAGE, sender: '+201000000003', groupName: 'NC Brokers' }));

    expect(res.status).toBe(500);
    expect(mocked.__dump('broker_listings')).toHaveLength(0); // staging never ran
  });

  it('4. (sender|message) repeat short-circuits with deduped:true (existing contract)', async () => {
    // First message seeds the staging dedupe hash.
    await POST(post({ message: COMPLETE_MESSAGE, sender: '+201000000004', groupName: 'NC Brokers' }));
    const second = await POST(post({ message: COMPLETE_MESSAGE, sender: '+201000000004', groupName: 'NC Brokers' }));
    const body = await second.json();

    expect(second.status).toBe(200);
    expect(body.deduped).toBe(true);
    // exactly one canonical row + one staging row after the retry
    expect(mocked.__dump('listings')).toHaveLength(1);
    expect(mocked.__dump('broker_listings')).toHaveLength(1);
  });

  it('5. re-ingest of the same unit from another sender MERGES canonically (no duplicate row)', async () => {
    await POST(post({ message: COMPLETE_MESSAGE, sender: '+201000000005', groupName: 'NC Brokers' }));
    await POST(post({ message: COMPLETE_MESSAGE, sender: '+201000000006', groupName: 'Other Group' }));

    const canonicalRows = mocked.__dump('listings');
    expect(canonicalRows).toHaveLength(1);
    expect(canonicalRows[0].sources).toHaveProperty('whatsapp_scrape');
    // two staging rows — different senders are distinct evidence
    expect(mocked.__dump('broker_listings')).toHaveLength(2);
  });
});
