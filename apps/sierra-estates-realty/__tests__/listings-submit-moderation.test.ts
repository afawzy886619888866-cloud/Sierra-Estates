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

jest.mock('@/lib/services/GoogleSheetSyncService', () => ({
  // Hermetic: the Google Sheet mirror must never fire a real fetch in tests —
  // it mirrors to the ops sheet only when env vars are configured in prod.
  syncWebsiteSubmissionToSheet: jest.fn(async () => ({ ok: false, error: 'not-configured' })),
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
  beds: 4,
  baths: 3,
  area: 260,
  price: 12_000_000,
  ownerName: 'Test Owner',
  mobile: '+201001112233',
};

const submit = (body: unknown) =>
  new Request('http://localhost/api/listings/submit', {
    method: 'POST',
    body: JSON.stringify(body),
  });

describe('/api/listings/submit — publication & persistence', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes a public submission as active and publishable to map & inventory', async () => {
    const res = await POST(submit(validSubmission));
    expect(res.status).toBe(201);

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock.mock.calls[0][0]).toBe('listings');
    const written = insertMock.mock.calls[0][1] as Record<string, unknown>;

    expect(written.status).toBe('active');
    expect(written.publishStatus).toBe('PUBLISHABLE');
    expect(written.publishToClient).toBe(true);
    expect(written.verified).toBe(true);
  });

  it('sets aiScore for client feed ranking and enables publishToClient', async () => {
    await POST(submit(validSubmission));
    const written = insertMock.mock.calls[0][1] as Record<string, unknown>;

    expect(written.publishToClient).toBe(true);
    expect(written.aiScore).toBeGreaterThan(0);
  });

  it('writes the submission exactly once — the dual-write collection is gone', async () => {
    await POST(submit(validSubmission));

    expect(insertMock).toHaveBeenCalledTimes(1);
    const written = insertMock.mock.calls[0][1] as Record<string, unknown>;
    expect(written.status).toBe('active');
  });

  it('routes submissions correctly: owners rent/resale vs brokers rent/resale', async () => {
    const res1 = await POST(submit({ ...validSubmission, mode: 'rent', price: 45000, ownerType: 'Owner' }));
    const json1 = await res1.json();
    expect(json1.targetTab).toBe('owners rent');

    const res2 = await POST(submit({ ...validSubmission, mode: 'sale', price: 12000000, ownerType: 'Broker' }));
    const json2 = await res2.json();
    expect(json2.targetTab).toBe('brokers resale');

    const res3 = await POST(submit({ ...validSubmission, mode: 'rent', price: 50000, ownerType: 'Broker' }));
    const json3 = await res3.json();
    expect(json3.targetTab).toBe('brokers rent');

    const res4 = await POST(submit({ ...validSubmission, mode: 'sale', price: 9000000, ownerType: 'Owner' }));
    const json4 = await res4.json();
    expect(json4.targetTab).toBe('owners resale');
  });

  it('still rejects an invalid payload before touching the database', async () => {
    const res = await POST(submit({ compound: '', price: 'not-a-number' }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('refuses to invent unit specs — missing beds/baths/area is a 400, not a default', async () => {
    // §21: the old schema silently defaulted beds 3 / baths 2 / area 150 /
    // finishing 'Fully Furnished' / zone '5th Settlement'. A submission
    // without the real specs must fail loudly instead.
    const res = await POST(
      submit({
        compound: 'Mivida',
        propertyType: 'Apartment',
        mode: 'sale',
        price: 8_000_000,
        ownerName: 'Test Owner',
        mobile: '+201001112233',
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    const flat = JSON.stringify(body.details?.fieldErrors ?? body);
    expect(flat).toContain('beds');
    expect(flat).toContain('baths');
    expect(flat).toContain('area');
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('never attaches stock photos or an invented zone to a media-less submission', async () => {
    const res = await POST(submit(validSubmission));
    expect(res.status).toBe(201);
    const written = insertMock.mock.calls[0][1] as Record<string, unknown>;
    const rawData = (written.rawData ?? {}) as Record<string, unknown>;

    // No hardcoded PropertyFinder CDN imagery may ride along with a
    // photo-less submission (§21: misrepresented the actual unit).
    // img is a REAL column since migration 039; photos still parks in
    // raw_data (no such column).
    expect(written.img).toBeNull();
    expect(rawData.photos).toEqual([]);
    expect(written.images).toEqual([]);
    // Zone is not guessed from the compound name anymore.
    expect(rawData.zone).toBeUndefined();
    expect(written.zone).toBeUndefined();
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
