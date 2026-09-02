/**
 * /api/listings/submit — public submissions are not inventory.
 *
 * The endpoint is deliberately unauthenticated so property owners can submit
 * without an account, and it is reachable from the public /add-listing form.
 * It used to write `status: 'Available'` straight into the `listings` and
 * `houyez_listings` collections, which /api/listings then served to everyone:
 * anyone on the internet could publish a listing on the site. Submissions must
 * now land pending review, and both public read modes must filter them out.
 */
import {
  LISTING_STATUS_PENDING_REVIEW,
  isPubliclyVisibleListingStatus,
} from '@/lib/models/schema';

const addMock = jest.fn(async (..._args: unknown[]) => ({ id: 'generated-doc-id' }));
const setMock = jest.fn(async (..._args: unknown[]) => undefined);

jest.mock('@/lib/firebase-admin', () => ({
  getAdminDb: async () => ({
    collection: () => ({
      add: (...args: unknown[]) => addMock(...args),
      doc: () => ({ set: (...args: unknown[]) => setMock(...args) }),
    }),
  }),
}));

jest.mock('@/lib/server/rate-limit', () => ({
  applyRateLimit: async () => null,
  publicEndpointLimiter: {},
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

    expect(addMock).toHaveBeenCalledTimes(1);
    const written = addMock.mock.calls[0][0] as Record<string, unknown>;

    expect(written.status).toBe(LISTING_STATUS_PENDING_REVIEW);
    expect(written.status).not.toBe('Available');
    expect(written.verified).toBe(false);
  });

  it('keeps a submission out of the client feed and unranked', async () => {
    await POST(submit(validSubmission));
    const written = addMock.mock.calls[0][0] as Record<string, unknown>;

    // A self-submitted listing must not arrive pre-scored at the top of the
    // inventory, nor flagged for the public client page.
    expect(written.publishToClient).toBe(false);
    expect(written.aiScore).toBe(0);
  });

  it('mirrors the same pending document into the second collection', async () => {
    await POST(submit(validSubmission));

    expect(setMock).toHaveBeenCalledTimes(1);
    const mirrored = setMock.mock.calls[0][0] as Record<string, unknown>;
    expect(mirrored.status).toBe(LISTING_STATUS_PENDING_REVIEW);
  });

  it('still rejects an invalid payload before touching Firestore', async () => {
    const res = await POST(submit({ compound: '', price: 'not-a-number' }));
    expect(res.status).toBe(400);
    expect(addMock).not.toHaveBeenCalled();
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
