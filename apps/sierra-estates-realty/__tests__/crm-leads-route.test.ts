const collectionMock = jest.fn();
const docMock = jest.fn();
const setMock = jest.fn();
const verifyRequestMock = jest.fn();

jest.mock('@/lib/server/firebase-admin', () => ({
  adminDb: {
    collection: (...args: unknown[]) => collectionMock(...args),
  },
}));

jest.mock('@/lib/server/auth-guard', () => ({
  verifyRequest: (...args: unknown[]) => verifyRequestMock(...args),
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ error: 'Authentication required', code: 'UNAUTHORIZED' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
}));

import { POST } from '@/app/api/crm/leads/route';
import { NextRequest } from 'next/server';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/crm/leads', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe('POST /api/crm/leads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyRequestMock.mockResolvedValue({ authenticated: true, uid: 'admin-user' });
    setMock.mockResolvedValue(undefined);
    docMock.mockReturnValue({ set: setMock });
    collectionMock.mockReturnValue({ doc: docMock });
    delete process.env.ZAPIER_CALENDAR_WEBHOOK_URL;
  });

  test('rejects unauthenticated requests with 401', async () => {
    verifyRequestMock.mockResolvedValue({ authenticated: false, method: 'none' });

    const res = await POST(
      makeRequest({ client_name: 'Jane', client_mobile: '+201000000000' }),
    );

    expect(res.status).toBe(401);
    expect(collectionMock).not.toHaveBeenCalled();
  });

  test('stores a lead and returns the computed score (success path)', async () => {
    const res = await POST(
      makeRequest({
        client_name: 'Jane Doe',
        client_mobile: '+201000000000',
        conversation_summary: 'Wants to invest soon',
        extracted_metrics: {
          intent: 'BUY',
          capital_budget: 15_000_000,
          timeline_weeks: 2,
          compound_target: 'Mivida',
        },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.lead_id).toMatch(/^SBR-LEAD-/);
    // intent(3) + budget(4) + timeline<=4(3) = 10
    expect(body.metrics_score).toBe('10/10');
    expect(body.rep_owner).toBe('CLOSER_VIP_GOLDEN_SQUARE');

    expect(collectionMock).toHaveBeenCalledWith('Leads');
    expect(setMock).toHaveBeenCalledTimes(1);
    const written = setMock.mock.calls[0][0];
    expect(written.name).toBe('Jane Doe');
    expect(written.mobile).toBe('+201000000000');
    expect(written.sierra_ai_score).toBe(10);
    expect(written.pipeline_stage).toBe('VIP_QUALIFIED_CORRIDOR');
    expect(written.assigned_specialist).toBe('CLOSER_VIP_GOLDEN_SQUARE');
  });

  test('routes Mokattam/uptown targets to the Mokattam specialist', async () => {
    const res = await POST(
      makeRequest({
        client_name: 'Sam',
        client_mobile: '+201111111111',
        extracted_metrics: { compound_target: 'Uptown Cairo' },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.rep_owner).toBe('CLOSER_MOKATTAM_SPECIALIST');
  });

  test('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ client_name: 'Only Name' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: 'client_name and client_mobile are required',
    });
    expect(setMock).not.toHaveBeenCalled();
  });

  test('returns 500 when the request body is malformed JSON', async () => {
    const badRequest = new NextRequest('http://localhost:3000/api/crm/leads', {
      method: 'POST',
      body: 'not-json',
    }) as NextRequest;

    const res = await POST(badRequest);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });

  test('returns 500 when Firestore persistence fails', async () => {
    setMock.mockRejectedValue(new Error('firestore down'));

    const res = await POST(
      makeRequest({ client_name: 'Jane', client_mobile: '+201000000000' }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ success: false, error: 'firestore down' });
  });
});
