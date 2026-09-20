/**
 * /api/listings/submit — public submissions are not inventory.
 *
 * The endpoint is deliberately unauthenticated so property owners can submit
 * without an account, and it is reachable from the public /add-listing form.
 * It used to write `status: 'Available'` straight into the `listings` and
 * `houyez_listings` collections, which /api/listings then served to everyone:
 * anyone on the internet could publish a listing on the site. Submissions must
 * now land pending review, and both public read modes must filter them out.
 *
 * The store is Supabase (public.listings) rather than Firestore since the
 * migration, and the two collections are one table, so the write is a single
 * insert — but the moderation guarantees are identical.
 */
import {
  LISTING_STATUS_PENDING_REVIEW,
  isPubliclyVisibleListingStatus,
} from '@/lib/models/schema';

const insertMock = jest.fn(async (..._args: unknown[]) => ({ id: 'generated-doc-id' }));

jest.mock('@sierra-estates/db', () => ({
  insertRecord: (...args: unknown[]) => insertMock(...args),
}));

jest.mock('@/lib/server/rate-limit', () => ({
  applyRateLimit: async () => null,
  publicEndpointLimiter: {},
}));

// ---------------------------------------------------------------------------
// Side-effect mocks — these modules are invoked after the single DB write and
// must be stubbed so (a) server-only imports don't blow up in Jest, and (b)
// the insertMock call-count assertions remain unambiguous.
// ---------------------------------------------------------------------------
jest.mock('@/lib/services/ExcelInventoryService', () => ({
  appendToExcelInventory: jest.fn(async () => undefined),
}));

jest.mock('@/lib/telegram', () => ({
  sendTelegramMessage: jest.fn(async () => undefined),
  escapeTelegramHtml: (s: string) => s,
}));

jest.mock('@/lib/server/whatsapp-queue', () => ({
  enqueueWhatsAppJob: jest.fn(async () => undefined),
}));

jest.mock('@/lib/services/AugustOwnersAgentService', () => ({
  AugustOwnersAgentService: {
    broadcastNewUnitToGroup: jest.fn(async () => undefined),
  },
  AUGUST_OWNERS_GROUP_ID: '120363044918239011@g.us',
}));

import { POST } from '@/app/api/listings/submit/route';

const validSubmission = {
  compound: 'Mivida',
  propertyType: 'Villa',
  mode: 'sale',
  price: 12_000_000,
  ownerName: 'Test Owner',
  mobile: '+201001112233',
};

const submit = (body: unknown) =>
  new Request('http://localhost/api/listings/submit', {
    method: 'POST',
    body: JSON.stringify(body),
  });

describe('/api/listings/submit — moderation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes a public submission as pending review, never as available', async () => {
    const res = await POST(submit(validSubmission));
    expect(res.status).toBe(201);

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock.mock.calls[0][0]).toBe('listings');
    const written = insertMock.mock.calls[0][1] as Record<string, unknown>;

    expect(written.status).toBe(LISTING_STATUS_PENDING_REVIEW);
    expect(written.status).not.toBe('Available');
    // verified has no column on the deployed table, so the write path parks
    // it in raw_data (see lib/server/listing-columns.ts); toListingRecord()
    // spreads it back on read, so the moderation invariant is unchanged.
    const rawData = (written.rawData ?? {}) as Record<string, unknown>;
    expect(rawData.verified).toBe(false);
  });

  it('keeps a submission out of the client feed and unranked', async () => {
    await POST(submit(validSubmission));
    const written = insertMock.mock.calls[0][1] as Record<string, unknown>;

    // A self-submitted listing must not arrive pre-scored at the top of the
    // inventory, nor flagged for the public client page. Both fields ride in
    // raw_data on the deployed table and are spread back on every read.
    const rawData = (written.rawData ?? {}) as Record<string, unknown>;
    expect(rawData.publishToClient).toBe(false);
    expect(rawData.aiScore).toBe(0);
  });

  it('writes the submission exactly once — the dual-write collection is gone', async () => {
    await POST(submit(validSubmission));

    // listings and houyez_listings are one table now, so a second write would
    // mean a duplicate row rather than a mirror.
    expect(insertMock).toHaveBeenCalledTimes(1);
    const written = insertMock.mock.calls[0][1] as Record<string, unknown>;
    expect(written.status).toBe(LISTING_STATUS_PENDING_REVIEW);
  });

  it('still rejects an invalid payload before touching the database', async () => {
    const res = await POST(submit({ compound: '', price: 'not-a-number' }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe('isPubliclyVisibleListingStatus', () => {
  it('hides pending submissions and archived listings', () => {
    expect(isPubliclyVisibleListingStatus(LISTING_STATUS_PENDING_REVIEW)).toBe(false);
    expect(isPubliclyVisibleListingStatus('pending review')).toBe(false);
    expect(isPubliclyVisibleListingStatus('Pending')).toBe(false);
    expect(isPubliclyVisibleListingStatus('archived')).toBe(false);
  });

  it('keeps every historical spelling of the live state visible', () => {
    // A denylist is used precisely so these all keep working — an allowlist
    // would have silently hidden real inventory.
    for (const status of ['available', 'Available', 'active', 'AVAILABLE', 'reserved']) {
      expect(isPubliclyVisibleListingStatus(status)).toBe(true);
    }
  });

  it('treats a missing status as visible, matching the legacy default', () => {
    expect(isPubliclyVisibleListingStatus(undefined)).toBe(true);
    expect(isPubliclyVisibleListingStatus(null)).toBe(true);
  });
});
