/**
 * §21 no-fabrication — wave-4 route contracts.
 *
 * Pins the honest behavior of the routes whose fallbacks used to invent
 * legal records or operational parameters:
 *  - /api/closer/contract        (invented an entire SPA deal)
 *  - /api/contracts/[id]/sign    (invented a sample contract + fake audit claim)
 *  - /api/openclaw/scan-whatsapp-groups (assumed a scan target group)
 *  - /api/inventory/scan-and-merge     (assumed a dev's local Windows path)
 */

const getRecordMock = jest.fn();
const sharedMemoryWriteMock = jest.fn();
const runOpenClawDailyScanMock = jest.fn();
const verifyAdminRequestMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  getRecord: (...args: unknown[]) => getRecordMock(...args),
  listRecords: jest.fn(async () => []),
  upsertRecord: jest.fn(async () => ({})),
}));

jest.mock('@/lib/server/auth-guard', () => ({
  verifyAdminRequest: (...args: unknown[]) => verifyAdminRequestMock(...args),
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}));

jest.mock('@sierra-estates/memory-engine', () => ({
  sharedMemory: {
    write: (...args: unknown[]) => sharedMemoryWriteMock(...args),
    read: jest.fn(async () => null),
    delete: jest.fn(async () => true),
  },
  eccMemory: {
    recordEpisode: jest.fn(),
    upsertEntity: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../../scripts/openclaw-daily-scanner', () => ({
  runOpenClawDailyScan: (...args: unknown[]) => runOpenClawDailyScanMock(...args),
}));

import { POST as closerContractPOST, GET as closerContractGET } from '@/app/api/closer/contract/route';
import {
  GET as signGET,
  POST as signPOST,
} from '@/app/api/contracts/[id]/sign/route';
import {
  POST as scanGroupsPOST,
} from '@/app/api/openclaw/scan-whatsapp-groups/route';
import {
  POST as scanAndMergePOST,
} from '@/app/api/inventory/scan-and-merge/route';
import type { NextRequest } from 'next/server';
import type { DigitalContractData } from '@/lib/services/digital-contracts';

const req = (path: string, body?: unknown, method?: string) =>
  new Request(`http://localhost${path}`, {
    method: method ?? (body !== undefined ? 'POST' : 'GET'),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }) as unknown as NextRequest;

/* ─── /api/closer/contract ──────────────────────────────────────────────── */

describe('/api/closer/contract — SPA terms must be explicit', () => {
  it('refuses an empty body instead of inventing a full deal', async () => {
    const res = await closerContractPOST(req('/api/closer/contract', {}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.missing).toContain('seller.name');
    expect(body.missing).toContain('buyer.name');
    expect(body.missing).toContain('compoundName');
    expect(body.missing).toContain('unitNumber');
    expect(body.missing).toContain('unitType');
    expect(body.missing).toContain('buaSqm');
    expect(body.missing).toContain('totalPriceEGP');
    expect(body.missing).toContain('downPaymentEGP');
    expect(body.missing).toContain('quarterlyInstallmentEGP');
    expect(body.missing).toContain('installmentTenureYears');
    expect(body.missing).toContain('deliveryDateStr');
    expect(body.error.toLowerCase()).toContain('refus');
  });

  it('refuses a partial body — one missing price field blocks the SPA', async () => {
    const res = await closerContractPOST(
      req('/api/closer/contract', {
        seller: { name: 'Owner One', nationalIdOrPassport: 'ID-1', phone: '+201000000001' },
        buyer: { name: 'Buyer Two', nationalIdOrPassport: 'ID-2', phone: '+201000000002' },
        compoundName: 'Taj City',
        unitNumber: 'A-101',
        unitType: 'Apartment',
        buaSqm: 150,
        // totalPriceEGP intentionally omitted
        downPaymentEGP: 1000000,
        quarterlyInstallmentEGP: 250000,
        installmentTenureYears: 7,
        deliveryDateStr: 'Q4 2027',
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).missing).toContain('totalPriceEGP');
  });

  it('generates the SPA when every term arrives explicitly', async () => {
    const res = await closerContractPOST(
      req('/api/closer/contract', {
        seller: { name: 'Owner One', nationalIdOrPassport: 'ID-1', phone: '+201000000001' },
        buyer: { name: 'Buyer Two', nationalIdOrPassport: 'ID-2', phone: '+201000000002' },
        compoundName: 'Taj City',
        unitNumber: 'A-101',
        unitType: 'Apartment',
        buaSqm: 150,
        totalPriceEGP: 8000000,
        downPaymentEGP: 1000000,
        quarterlyInstallmentEGP: 250000,
        installmentTenureYears: 7,
        deliveryDateStr: 'Q4 2027',
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.spa.contractReference).toContain('SE-SPA-');
    expect(body.spa.articlesEn.length).toBeGreaterThan(0);
  });
});

/* ─── /api/contracts/[id]/sign ──────────────────────────────────────────── */

const fullContract = (): DigitalContractData => ({
  id: 'con-test-001',
  contractNumber: 'SBR-RES-2026-TEST',
  contractType: 'unit_reservation',
  status: 'pending_signatures',
  createdAt: new Date().toISOString(),
  unit: {
    unitCode: 'TJ-A-101',
    compoundName: 'Taj City',
    propertyType: 'Apartment',
    areaSqm: 150,
    bedrooms: 2,
    bathrooms: 2,
    finishing: 'Ultra Super Lux',
    dealType: 'sale',
    agreedPrice: 8000000,
    reservationDeposit: 500000,
  },
  buyer: {
    name: 'Buyer Two',
    nationalIdOrPassport: 'ID-2',
    phone: '+201000000002',
  },
  sellerOrOwner: {
    name: 'Owner One',
    nationalIdOrPassport: 'ID-1',
    phone: '+201000000001',
  },
});

describe('/api/contracts/[id]/sign — no invented contracts, real audit trail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sharedMemoryWriteMock.mockResolvedValue(undefined);
  });

  it('GET returns 404 for an unknown contract — never a fabricated sample', async () => {
    getRecordMock.mockResolvedValue(null);
    const res = await signGET(req('/api/contracts/con-404/sign'), {
      params: Promise.resolve({ id: 'con-404' }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('not found');
  });

  it('GET renders an existing contract as bilingual HTML', async () => {
    getRecordMock.mockResolvedValue(fullContract());
    const res = await signGET(req('/api/contracts/con-test-001/sign'), {
      params: Promise.resolve({ id: 'con-test-001' }),
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Taj City');
    expect(html).not.toContain('Madinaty B14');
  });

  it('POST refuses to sign on behalf of an unnamed "Client"', async () => {
    const res = await signPOST(req('/api/contracts/con-test-001/sign', {}), {
      params: Promise.resolve({ id: 'con-test-001' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.missing).toContain('signerName');
    expect(body.missing).toContain('role');
  });

  it('POST records the signature event BEFORE claiming success', async () => {
    const res = await signPOST(
      req('/api/contracts/con-test-001/sign', { signerName: 'Buyer Two', role: 'buyer' }),
      { params: Promise.resolve({ id: 'con-test-001' }) }
    );
    expect(res.status).toBe(200);
    expect(sharedMemoryWriteMock).toHaveBeenCalledTimes(1);
    const [key, value] = sharedMemoryWriteMock.mock.calls[0];
    expect(key).toContain('contract_sign:con-test-001');
    expect(value.signerName).toBe('Buyer Two');
    expect(value.role).toBe('buyer');
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.signedBy).toBe('Buyer Two');
  });

  it('POST reports failure when the audit trail cannot be written', async () => {
    sharedMemoryWriteMock.mockRejectedValue(new Error('bus down'));
    const res = await signPOST(
      req('/api/contracts/con-test-001/sign', { signerName: 'Buyer Two', role: 'buyer' }),
      { params: Promise.resolve({ id: 'con-test-001' }) }
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.toLowerCase()).toContain('audit');
  });
});

/* ─── /api/openclaw/scan-whatsapp-groups ────────────────────────────────── */

describe('/api/openclaw/scan-whatsapp-groups — scan target is the caller\'s call', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    runOpenClawDailyScanMock.mockResolvedValue({ filesScanned: 0 });
  });

  it('refuses to scan without an explicit targetGroup', async () => {
    const res = await scanGroupsPOST(req('/api/openclaw/scan-whatsapp-groups', {}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.missing).toContain('targetGroup');
  });

  it('scans the explicitly requested group', async () => {
    const res = await scanGroupsPOST(
      req('/api/openclaw/scan-whatsapp-groups', { targetGroup: 'Owners August 2026' })
    );
    expect(res.status).toBe(200);
    expect(runOpenClawDailyScanMock).toHaveBeenCalledWith('Owners August 2026');
  });
});

/* ─── /api/inventory/scan-and-merge ─────────────────────────────────────── */

describe('/api/inventory/scan-and-merge — scan directory is explicit', () => {
  it('refuses to default to a developer\'s local machine path', async () => {
    const res = await scanAndMergePOST(req('/api/inventory/scan-and-merge', {}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain('targetDir');
  });
});

/* ─── /api/closer/contract GET — AdminPortal Contract button wiring ─────── */

const FULL_DEAL = {
  id: 'deal-001',
  lead_id: 'lead-001',
  listing_id: 'listing-001',
  deal_value: 8000000,
  metadata: {
    seller: {
      name: 'Recorded Owner',
      nationalIdOrPassport: 'ID-OWNER-1',
      nationality: 'Egyptian',
      address: 'Cairo',
      phone: '+201000000001',
    },
  },
};
const FULL_LEAD = {
  full_name: 'Recorded Buyer',
  phone: '+201000000002',
  metadata: { nationalId: 'ID-BUYER-1' },
};
const FULL_LISTING = {
  compound: 'Taj City',
  ref_id: 'TJ-A-101',
  property_type: 'Apartment',
  area_sqm: 150,
  price: 8500000,
  down_payment: 1000000,
  installment_years: 7,
  delivery_year: 2027,
};

function mockDealTables(deal: unknown, lead: unknown, listing: unknown) {
  getRecordMock.mockImplementation(async (table: string, id: string) => {
    if (table === 'deals' && id === (deal as { id?: string })?.id) return deal;
    if (table === 'leads' && id === (deal as { lead_id?: string })?.lead_id) return lead;
    if (table === 'listings' && id === (deal as { listing_id?: string })?.listing_id) return listing;
    return null;
  });
}

describe('/api/closer/contract GET — SPA from the real deal record', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyAdminRequestMock.mockResolvedValue({ authenticated: true, uid: 'u1', role: 'admin' });
  });

  it('rejects an unauthenticated caller — deals carry buyer PII', async () => {
    verifyAdminRequestMock.mockResolvedValue({ authenticated: false });
    const res = await closerContractGET(req('/api/closer/contract?id=deal-001'));
    expect(res.status).toBe(401);
  });

  it('requires an explicit deal id', async () => {
    const res = await closerContractGET(req('/api/closer/contract'));
    expect(res.status).toBe(400);
    expect((await res.json()).missing).toContain('id');
  });

  it('returns 404 for an unknown deal — never a fabricated sample', async () => {
    mockDealTables(null, null, null);
    const res = await closerContractGET(req('/api/closer/contract?id=nope&format=json'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('not found');
  });

  it('lists missing terms instead of inventing them (partial record)', async () => {
    mockDealTables(
      { id: 'deal-p', lead_id: 'lead-p', listing_id: 'listing-p', deal_value: 0 },
      { full_name: 'Recorded Buyer' }, // no phone, no national id
      { compound: 'Taj City' },        // nothing else
    );
    const res = await closerContractGET(req('/api/closer/contract?id=deal-p&format=json'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.missing).toContain('buyer.phone');
    expect(body.missing).toContain('buyer.nationalIdOrPassport');
    expect(body.missing).toContain('unitNumber');
    expect(body.missing).toContain('buaSqm');
    expect(body.missing).toContain('totalPriceEGP');
    expect(body.error.toLowerCase()).toContain('refus');
  });

  it('renders an HTML readiness page (not a contract) for the browser flow', async () => {
    mockDealTables(
      { id: 'deal-p', lead_id: 'lead-p', listing_id: 'listing-p', deal_value: 0 },
      { full_name: 'Recorded Buyer' },
      { compound: 'Taj City' },
    );
    const res = await closerContractGET(req('/api/closer/contract?id=deal-p'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('Contract not generatable yet');
    expect(html).toContain('Taj City');
    expect(html).not.toContain('SE-SPA-'); // no contract reference was minted
  });

  it('generates the SPA from a fully recorded deal — real compound, derived quarterly', async () => {
    mockDealTables(FULL_DEAL, FULL_LEAD, FULL_LISTING);
    const res = await closerContractGET(req('/api/closer/contract?id=deal-001&format=json'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.spa.contractReference).toContain('SE-SPA-');
    expect(body.spa.property.compoundName).toBe('Taj City');
    expect(body.spa.property.unitNumber).toBe('TJ-A-101');
    expect(body.spa.buyer.name).toBe('Recorded Buyer');
    expect(body.spa.buyer.nationalIdOrPassport).toBe('ID-BUYER-1');
    expect(body.spa.seller.name).toBe('Recorded Owner');
    // total 8,000,000 − down 1,000,000 over 7×4 quarters = 250,000
    expect(body.spa.property.quarterlyInstallmentEGP).toBe(250000);
    expect(body.spa.property.deliveryDateStr).toBe('2027');
    // the recorded deal_value (8M) wins over the listing price (8.5M)
    expect(body.spa.property.totalPriceEGP).toBe(8000000);
  });

  it('renders the bilingual contract HTML sheet for the browser flow', async () => {
    mockDealTables(FULL_DEAL, FULL_LEAD, FULL_LISTING);
    const res = await closerContractGET(req('/api/closer/contract?id=deal-001'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('Sales &amp; Purchase Agreement');
    expect(html).toContain('Taj City');
    expect(html).toContain('Recorded Buyer');
    expect(html).toContain('dir="rtl"'); // Arabic articles present
  });
});
