/**
 * Tests for POST /api/inventory/request-photos
 *
 * Public client photo request action from interactive map / Excel HUD drawer.
 * Dispatches WhatsApp requests to owners/brokers while keeping PII server-side.
 */

jest.mock('@/lib/server/whatsapp-queue', () => ({
  enqueueWhatsAppJob: jest.fn().mockResolvedValue('job-photo-123'),
}));

jest.mock('@/lib/server/rate-limit', () => ({
  publicEndpointLimiter: jest.fn().mockResolvedValue(null),
}));

const mockSupabaseQuery = {
  select: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  or: jest.fn().mockResolvedValue({
    data: [
      {
        id: 'list-1',
        code: 'SBR-VILLA-01',
        compound: 'Mivida',
        owner_name: 'Eng. Ahmed',
        owner_phone: '+201001234567',
        status: 'active',
      },
    ],
    error: null,
  }),
};

jest.mock('@sierra-estates/db', () => ({
  getSupabase: jest.fn(() => ({
    from: jest.fn(() => mockSupabaseQuery),
  })),
  listRecords: jest.fn().mockResolvedValue([]),
}));

import { POST } from '../app/api/inventory/request-photos/route';
import { NextRequest } from 'next/server';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';

const enqueueMock = enqueueWhatsAppJob as jest.Mock;

const createReq = (body: unknown) =>
  new NextRequest('http://localhost:3000/api/inventory/request-photos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/inventory/request-photos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid payload with 400', async () => {
    const res = await POST(createReq({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid payload');
  });

  it('successfully dispatches photo request for a valid unit and hides owner PII', async () => {
    const res = await POST(
      createReq({
        unitCode: 'SBR-VILLA-01',
        compound: 'Mivida',
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.unitCode).toBe('SBR-VILLA-01');
    expect(json.hasContactOnRecord).toBe(true);
    // Security check: phone must NOT be leaked to client
    expect(json.owner_phone).toBeUndefined();
    expect(json.phone).toBeUndefined();

    // Verify WhatsApp queue call
    expect(enqueueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'general-outreach',
        toPhone: '+201001234567',
        metadata: expect.objectContaining({
          kind: 'client-map-photo-request',
          unitCode: 'SBR-VILLA-01',
        }),
      })
    );
  });

  it('enforces 24-hour cooldown for identical unit code', async () => {
    // SBR-VILLA-01 was requested in previous test
    const res = await POST(
      createReq({
        unitCode: 'SBR-VILLA-01',
        compound: 'Mivida',
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.alreadyRequested).toBe(true);
    expect(enqueueMock).not.toHaveBeenCalled();
  });
});
