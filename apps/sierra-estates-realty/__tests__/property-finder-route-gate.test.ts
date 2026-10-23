/**
 * P0-6 REGRESSION — Property Finder publication route bypass CLOSED.
 *
 * The old POST /api/property-finder?action=create-listing passed the raw
 * request body straight to pfClient.createListing() — a complete bypass of
 * the 8-condition PublishGate (any admin payload became a remote listing;
 * action=publish likewise). The route must now:
 *
 *   · reject raw-payload creation with 400 + explain the gated path;
 *   · route unit publication through PFIntegrationService.publishListing()
 *     (gate + provider validation + idempotency) for EVERY caller;
 *   · surface a gate rejection as 422 with the failing conditions.
 */

const verifyAdminRequest = jest.fn().mockResolvedValue({ authenticated: true, role: 'superadmin' });

jest.mock('@/lib/server/auth-guard', () => ({
  verifyAdminRequest: (...a: unknown[]) => verifyAdminRequest(...a),
  unauthorizedResponse: () => new Response('unauthorized', { status: 401 }),
}));

const pfCreateListing = jest.fn().mockResolvedValue({ id: 'remote-1' });
const pfPublishListing = jest.fn().mockResolvedValue({ id: 'remote-1' });

jest.mock('@/lib/property-finder-client', () => ({
  pfClient: {
    createListing: (...a: unknown[]) => pfCreateListing(...a),
    publishListing: (...a: unknown[]) => pfPublishListing(...a),
    unpublishListing: jest.fn(),
    subscribeWebhook: jest.fn(),
    searchListings: jest.fn(),
    searchLocations: jest.fn(),
    fetchLeads: jest.fn(),
    getUsers: jest.fn(),
    getCreditBalance: jest.fn(),
    listWebhooks: jest.fn(),
  },
}));

const gatedPublishListing = jest.fn();

jest.mock('@/lib/services/PFIntegrationService', () => ({
  PFIntegrationService: {
    publishListing: (...a: unknown[]) => gatedPublishListing(...a),
  },
}));

import { PublishGateError, PublishGate } from '../lib/services/publish-gate';
import { POST } from '../app/api/property-finder/route';

function request(body: unknown, action: string) {
  return new Request(`http://localhost/api/property-finder?action=${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

describe('P0-6: /api/property-finder publication gate bypass is closed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyAdminRequest.mockResolvedValue({ authenticated: true, role: 'superadmin' });
  });

  it('raw provider payloads are rejected — creation requires a gated unitId', async () => {
    const res = await POST(request({
      title: { en: 'Raw smuggled listing' },
      price: { type: 'sale', amounts: { sale: 1 } },
      location: { id: 1 },
    }, 'create-listing'));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('unitId');
    // No remote call happened — nothing left the building ungated.
    expect(pfCreateListing).not.toHaveBeenCalled();
    expect(gatedPublishListing).not.toHaveBeenCalled();
  });

  it('create-listing goes through the gated service, never the raw client', async () => {
    gatedPublishListing.mockResolvedValueOnce({ reference: 'PF-1', gate: { eligible: true } });

    const res = await POST(request({ unitId: 'unit-123' }, 'create-listing'));

    expect(res.status).toBe(201);
    expect(gatedPublishListing).toHaveBeenCalledWith('unit-123', { dryRun: false });
    expect(pfCreateListing).not.toHaveBeenCalled();
  });

  it('publish with a unitId is also routed through the gated service', async () => {
    gatedPublishListing.mockResolvedValueOnce({ alreadyPublished: true, gate: { eligible: true } });

    const res = await POST(request({ unitId: 'unit-456' }, 'publish'));

    expect(res.status).toBe(200);
    expect(gatedPublishListing).toHaveBeenCalledWith('unit-456');
    expect(pfPublishListing).not.toHaveBeenCalled();
  });

  it('a gate rejection surfaces as 422 with the failing conditions', async () => {
    const gate = PublishGate.evaluate({
      publishStatus: 'REVIEW_REQUIRED',
      status: 'pending',
      price: 0,
      images: [],
    } as any);
    gatedPublishListing.mockRejectedValueOnce(new PublishGateError(gate));

    const res = await POST(request({ unitId: 'unit-789' }, 'create-listing'));

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.gate.eligible).toBe(false);
    expect(json.gate.failures.length).toBeGreaterThan(0);
    // And still no raw remote call.
    expect(pfCreateListing).not.toHaveBeenCalled();
  });
});
