/**
 * The public listing endpoint waits for the durable workflow's result so it
 * can preserve the form's success and duplicate-code conflict responses.
 */
import {
  LISTING_STATUS_PENDING_REVIEW,
  isPubliclyVisibleListingStatus,
} from '@/lib/models/schema';

const mockInsert = jest.fn(async (..._args: unknown[]) => ({ id: 'generated-doc-id' }));
const mockListRecords = jest.fn(async (..._args: unknown[]) => [] as Record<string, unknown>[]);

jest.mock('workflow/api', () => ({
  start: jest.fn(async (workflow: (arg: unknown) => Promise<unknown>, args: [unknown]) => ({
    returnValue: workflow(args[0]),
  })),
}));

jest.mock('workflow', () => ({
  FatalError: class FatalError extends Error {},
}));

jest.mock('@sierra-estates/db', () => ({
  insertRecord: (...args: unknown[]) => mockInsert(...args),
  listRecords: (...args: unknown[]) => mockListRecords(...args),
  updateRecord: jest.fn(async () => undefined),
}));

jest.mock('@/app/api/inventory/route', () => ({
  bustInventoryCache: jest.fn(),
}));

jest.mock('@/lib/server/rate-limit', () => ({
  applyRateLimit: async () => null,
  publicEndpointLimiter: {},
}));

// ---------------------------------------------------------------------------
// Side-effect mocks — these modules are invoked after the single DB write and
// must be stubbed so (a) server-only imports don't blow up in Jest, and (b)
// the mockInsert call-count assertions remain unambiguous.
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

import { start } from 'workflow/api';
import { listingSubmissionWorkflow } from '@/lib/workflow/listing-submission-workflow';
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

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert.mock.calls[0][0]).toBe('listings');
    const written = mockInsert.mock.calls[0][1] as Record<string, unknown>;

    expect(written.status).toBe('active');
    expect(written.publishStatus).toBe('PUBLISHABLE');
    expect(written.publishToClient).toBe(true);
    expect(written.verified).toBe(true);
  });

  it('starts the durable workflow and returns the client success payload', async () => {
    const res = await POST(submit(validSubmission));
    const body = await res.json();

    expect(start).toHaveBeenCalledWith(
      listingSubmissionWorkflow,
      [expect.objectContaining({ compound: 'Mivida', requestOrigin: 'http://localhost' })],
    );
    expect(body).toMatchObject({
      success: true,
      code: expect.any(String),
      id: 'generated-doc-id',
      isMerged: false,
      targetTab: 'owners resale',
      listing: { id: 'generated-doc-id', mobile: '+201092048333' },
    });
  });

  it('returns the established 409 conflict payload when a listing code exists', async () => {
    mockListRecords.mockResolvedValueOnce([
      {
        id: 'existing-unit',
        code: 'SE-CONFLICT',
        compound: 'Mivida',
        price: 5_000_000,
        areaSqm: 120,
        bedrooms: 2,
        bathrooms: 2,
        propertyType: 'Apartment',
        dealType: 'Resale',
        images: [],
      },
    ]);

    const res = await POST(submit({ ...validSubmission, code: 'SE-CONFLICT' }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body).toMatchObject({
      success: false,
      conflict: true,
      code: 'SE-CONFLICT',
      existing: { id: 'existing-unit', code: 'SE-CONFLICT' },
      incoming: { code: 'SE-CONFLICT', compound: 'Mivida' },
    });
  });

  it('sets aiScore for client feed ranking and enables publishToClient', async () => {
    await POST(submit(validSubmission));
    const written = mockInsert.mock.calls[0][1] as Record<string, unknown>;

    expect(written.publishToClient).toBe(true);
    expect(written.aiScore).toBeGreaterThan(0);
  });

  it('writes the submission exactly once — the dual-write collection is gone', async () => {
    await POST(submit(validSubmission));

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const written = mockInsert.mock.calls[0][1] as Record<string, unknown>;
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
    expect(mockInsert).not.toHaveBeenCalled();
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
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('never attaches stock photos or an invented zone to a media-less submission', async () => {
    const res = await POST(submit(validSubmission));
    expect(res.status).toBe(201);
    const written = mockInsert.mock.calls[0][1] as Record<string, unknown>;
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
