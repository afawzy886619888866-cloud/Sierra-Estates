const insertRecordMock = jest.fn();
const verifyRequestMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  insertRecord: (...args) => insertRecordMock(...args),
}));

jest.mock('@/lib/server/auth-guard', () => ({
  verifyRequest: (...args) => verifyRequestMock(...args),
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ error: 'Authentication required', code: 'UNAUTHORIZED' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
}));

import { POST } from '@/app/api/crm/leads/route';
import { NextRequest } from 'next/server';

function makeRequest(body) {
  return new NextRequest('http://localhost:3000/api/crm/leads', {
    method: 'POST',
    body: JSON.stringify(body),
  }) ;
}

describe('POST /api/crm/leads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyRequestMock.mockResolvedValue({ authenticated: true, uid: 'admin-user' });
    insertRecordMock.mockResolvedValue({ id: 'lead-1' });
    delete process.env.ZAPIER_CALENDAR_WEBHOOK_URL;
  });

  test('rejects unauthenticated requests with 401', async () => {
    verifyRequestMock.mockResolvedValue({ authenticated: false, method: 'none' });

    const res = await POST(
      makeRequest({ client_name: 'Jane', client_mobile: '+201000000000' }),
    );

    expect(res.status).toBe(401);
    expect(insertRecordMock).not.toHaveBeenCalled();
  });

  test('stores a lead and returns the computed score (success path)', async () => {
    const res = await POST(
      makeRequest({
        client_name: 'Jane Doe',
        client_mobile: '+201000000000',
        conversation_summary: 'Wants to invest soon',
        extracted_metrics: {
          intent: 'BUY',
          capital_budget: 15000000,
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

    // Writes into the same collection every other lead-intake route uses
    // (COLLECTIONS.stakeholders = 'leads'), not a separate 'Leads' collection
    // invisible to the admin Leads page.
    expect(insertRecordMock).toHaveBeenCalledTimes(1);
    expect(insertRecordMock.mock.calls[0][0]).toBe('leads');
    const written = insertRecordMock.mock.calls[0][1];
    // Field names are the record layer's camelCase; it writes the snake_case
    // columns (full_name, sierra_ai_score, ...). The Firestore version also
    // wrote `mobile` as a duplicate of `phone`; the table has one phone column.
    expect(written.fullName).toBe('Jane Doe');
    expect(written.phone).toBe('+201000000000');
    expect(written.source).toBe('other');
    expect(written.sierraAiScore).toBe(10);
    expect(written.pipelineStage).toBe('VIP_QUALIFIED_CORRIDOR');
    expect(written.assignedSpecialist).toBe('CLOSER_VIP_GOLDEN_SQUARE');
  });

  test('accepts a caller-supplied source for admin-page attribution', async () => {
    const res = await POST(
      makeRequest({
        client_name: 'Jane Doe',
        client_mobile: '+201000000000',
        source: 'instagram',
      }),
    );

    expect(res.status).toBe(200);
    const written = insertRecordMock.mock.calls[0][1];
    expect(written.source).toBe('instagram');
  });

  test('falls back to "other" for an unrecognized source', async () => {
    await POST(
      makeRequest({
        client_name: 'Jane Doe',
        client_mobile: '+201000000000',
        source: 'carrier-pigeon',
      }),
    );

    const written = insertRecordMock.mock.calls[0][1];
    expect(written.source).toBe('other');
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
    expect(insertRecordMock).not.toHaveBeenCalled();
  });

  test('returns 500 when the request body is malformed JSON', async () => {
    const badRequest = new NextRequest('http://localhost:3000/api/crm/leads', {
      method: 'POST',
      body: 'not-json',
    }) ;

    const res = await POST(badRequest);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });

  test('returns 500 when persistence fails', async () => {
    insertRecordMock.mockRejectedValue(new Error('database down'));

    const res = await POST(
      makeRequest({ client_name: 'Jane', client_mobile: '+201000000000' }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ success: false, error: 'database down' });
  });
});
