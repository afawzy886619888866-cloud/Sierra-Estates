/**
 * Phase 9 (POST-VIEWING FEEDBACK) — contracts & behaviour.
 *
 * Covers:
 *   · the shared vocabulary/schemas (sales report, client survey, review);
 *   · survey token minting shape;
 *   · viewing lifecycle transition legality;
 *   · the public token-gated survey route (validation, 404, 409, happy path);
 *   · the admin transition route (illegal move rejected, completion mints the
 *     token and queues the WhatsApp survey message);
 *   · repo-level contracts (no hardcoded demo viewings in the admin view).
 */
const listRecordsMock = jest.fn();
const getRecordMock = jest.fn();
const updateRecordMock = jest.fn();
const insertRecordMock = jest.fn();
const enqueueWhatsAppJobMock = jest.fn();

jest.mock('@sierra-estates/db', () => ({
  listRecords: (...args: unknown[]) => listRecordsMock(...args),
  getRecord: (...args: unknown[]) => getRecordMock(...args),
  updateRecord: (...args: unknown[]) => updateRecordMock(...args),
  insertRecord: (...args: unknown[]) => insertRecordMock(...args),
}));

jest.mock('@/lib/server/whatsapp-queue', () => ({
  enqueueWhatsAppJob: (...args: unknown[]) => enqueueWhatsAppJobMock(...args),
}));

jest.mock('@/lib/server/rate-limit', () => ({
  applyRateLimit: jest.fn().mockResolvedValue(null),
  publicEndpointLimiter: {},
}));

jest.mock('@/lib/server/auth-guard', () => ({
  verifyAdminRequest: jest.fn().mockResolvedValue({ authenticated: true, uid: 'admin-1' }),
  unauthorizedResponse: () => new Response(JSON.stringify({ error: 'auth' }), { status: 401 }),
}));

import {
  salesReportSchema,
  clientSurveySchema,
  managerReviewSchema,
  mintSurveyToken,
  isViewingTransitionAllowed,
  VIEWING_TRANSITIONS,
  NEXT_ACTION_STAGE_EFFECT,
} from '@/lib/server/viewing-feedback-shared';
import { POST as submitSurvey, GET as surveyContext } from '@/app/api/viewing-feedback/route';
import { PATCH as patchViewing } from '@/app/api/admin/viewings/[id]/route';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

const makeReq = (url: string, init: RequestInit = {}) => new NextRequest(url, init);
const HEX48 = 'a'.repeat(48);

describe('Phase 9 shared vocabulary', () => {
  test('sales report schema accepts a full report and rejects unknown enums', () => {
    const ok = salesReportSchema.safeParse({
      unitAccuracy: 'minor_diff',
      clientReaction: 'very_positive',
      priceReaction: 'too_high',
      objections: [{ category: 'price', note: '5% above budget ceiling' }],
      interestLevel: 'warm',
      nextAction: 'renegotiate_price',
      notes: 'Client liked the layout.',
    });
    expect(ok.success).toBe(true);

    const bad = salesReportSchema.safeParse({
      unitAccuracy: 'perfect', // not in the vocabulary
      clientReaction: 'positive',
      priceReaction: 'accepted',
      interestLevel: 'hot',
      nextAction: 'offer',
    });
    expect(bad.success).toBe(false);
  });

  test('client survey schema enforces the 48-hex token and 1-5 rating', () => {
    expect(clientSurveySchema.safeParse({ token: HEX48, clientRating: 4, wouldRecommend: true }).success).toBe(true);
    expect(clientSurveySchema.safeParse({ token: 'short', clientRating: 4 }).success).toBe(false);
    expect(clientSurveySchema.safeParse({ token: HEX48, clientRating: 0 }).success).toBe(false);
    expect(clientSurveySchema.safeParse({ token: HEX48, clientRating: 6 }).success).toBe(false);
  });

  test('manager review only accepts approved / needs_changes', () => {
    expect(managerReviewSchema.safeParse({ reviewStatus: 'approved' }).success).toBe(true);
    expect(managerReviewSchema.safeParse({ reviewStatus: 'needs_changes' }).success).toBe(true);
    expect(managerReviewSchema.safeParse({ reviewStatus: 'pending_review' }).success).toBe(false);
  });

  test('mintSurveyToken produces 48 lowercase hex chars from 24 bytes', () => {
    const token = mintSurveyToken(crypto.randomBytes(24));
    expect(token).toMatch(/^[0-9a-f]{48}$/);
    expect(() => mintSurveyToken(crypto.randomBytes(16))).toThrow(/24 bytes/);
  });

  test('viewing lifecycle: legal transitions allowed, terminals locked', () => {
    expect(isViewingTransitionAllowed('pending_approval', 'scheduled')).toBe(true);
    expect(isViewingTransitionAllowed('scheduled', 'completed')).toBe(true);
    expect(isViewingTransitionAllowed('scheduled', 'no_show')).toBe(true);
    expect(isViewingTransitionAllowed('pending_approval', 'completed')).toBe(false); // must be scheduled first
    expect(isViewingTransitionAllowed('completed', 'scheduled')).toBe(false);
    expect(VIEWING_TRANSITIONS.completed).toEqual([]);
    expect(VIEWING_TRANSITIONS.cancelled).toEqual([]);
    expect(VIEWING_TRANSITIONS.no_show).toEqual([]);
  });

  test('next-action CRM wiring: offer/renegotiate move to negotiate, follow_up stays put', () => {
    expect(NEXT_ACTION_STAGE_EFFECT.offer?.pipelineStage).toBe('negotiate');
    expect(NEXT_ACTION_STAGE_EFFECT.renegotiate_price?.pipelineStage).toBe('negotiate');
    expect(NEXT_ACTION_STAGE_EFFECT.second_viewing?.pipelineStage).toBe('viewing');
    expect(NEXT_ACTION_STAGE_EFFECT.follow_up).toBeUndefined();
    expect(NEXT_ACTION_STAGE_EFFECT.nurture).toBeUndefined();
    expect(NEXT_ACTION_STAGE_EFFECT.archive).toBeUndefined();
  });
});

describe('GET /api/viewing-feedback (public survey context)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('malformed token is rejected before any DB access', async () => {
    const res = await surveyContext(makeReq(`http://localhost/api/viewing-feedback?token=nope`));
    expect(res.status).toBe(400);
    expect(listRecordsMock).not.toHaveBeenCalled();
  });

  test('unknown token 404s', async () => {
    listRecordsMock.mockResolvedValueOnce([]);
    const res = await surveyContext(makeReq(`http://localhost/api/viewing-feedback?token=${HEX48}`));
    expect(res.status).toBe(404);
  });

  test('returns first name only — no phone/email PII', async () => {
    listRecordsMock.mockResolvedValueOnce([
      {
        id: 'v-1',
        status: 'completed',
        propertyCode: 'SE-100',
        preferredDate: '2026-10-01',
        visitorName: 'Ahmed Al-Rashid',
        visitorPhone: '+201000000000',
        visitorEmail: 'ahmed@example.com',
      },
    ]);
    const res = await surveyContext(makeReq(`http://localhost/api/viewing-feedback?token=${HEX48}`));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.visitorFirstName).toBe('Ahmed');
    expect(JSON.stringify(body)).not.toContain('201000000000');
    expect(JSON.stringify(body)).not.toContain('ahmed@example.com');
  });
});

describe('POST /api/viewing-feedback (public survey submit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('invalid token is a 400 before any DB access', async () => {
    const res = await submitSurvey(
      makeReq('http://localhost/api/viewing-feedback', {
        method: 'POST',
        body: JSON.stringify({ token: 'zzz', clientRating: 5 }),
      })
    );
    expect(res.status).toBe(400);
    expect(listRecordsMock).not.toHaveBeenCalled();
  });

  test('unknown token 404s', async () => {
    listRecordsMock.mockResolvedValueOnce([]); // viewings lookup
    const res = await submitSurvey(
      makeReq('http://localhost/api/viewing-feedback', {
        method: 'POST',
        body: JSON.stringify({ token: HEX48, clientRating: 5 }),
      })
    );
    expect(res.status).toBe(404);
  });

  test('non-completed viewing is a 409', async () => {
    listRecordsMock.mockResolvedValueOnce([{ id: 'v-1', status: 'scheduled' }]);
    const res = await submitSurvey(
      makeReq('http://localhost/api/viewing-feedback', {
        method: 'POST',
        body: JSON.stringify({ token: HEX48, clientRating: 5 }),
      })
    );
    expect(res.status).toBe(409);
  });

  test('already-submitted survey is a 409 (one submission per token)', async () => {
    listRecordsMock
      .mockResolvedValueOnce([{ id: 'v-1', status: 'completed' }]) // viewings
      .mockResolvedValueOnce([{ id: 'f-1', viewingId: 'v-1', surveySubmittedAt: '2026-10-02T10:00:00Z' }]); // feedback
    const res = await submitSurvey(
      makeReq('http://localhost/api/viewing-feedback', {
        method: 'POST',
        body: JSON.stringify({ token: HEX48, clientRating: 3, clientComment: 'Great', wouldRecommend: true }),
      })
    );
    expect(res.status).toBe(409);
    expect(updateRecordMock).not.toHaveBeenCalled();
    expect(insertRecordMock).not.toHaveBeenCalled();
  });

  test('happy path updates the existing feedback row with survey fields', async () => {
    listRecordsMock
      .mockResolvedValueOnce([{ id: 'v-1', status: 'completed', leadId: 'lead-9' }])
      .mockResolvedValueOnce([{ id: 'f-1', viewingId: 'v-1', submittedAt: '2026-10-01T10:00:00Z' }]);
    updateRecordMock.mockResolvedValueOnce({ id: 'f-1' });

    const res = await submitSurvey(
      makeReq('http://localhost/api/viewing-feedback', {
        method: 'POST',
        body: JSON.stringify({ token: HEX48, clientRating: 5, clientComment: 'Loved it', wouldRecommend: true }),
      })
    );
    expect(res.status).toBe(200);
    expect(updateRecordMock).toHaveBeenCalledWith('viewing_feedback', 'f-1', expect.objectContaining({ clientRating: 5 }));
    expect(updateRecordMock).toHaveBeenCalledWith(
      'viewing_feedback',
      'f-1',
      expect.objectContaining({ surveySubmittedAt: expect.any(String) })
    );
    expect(insertRecordMock).not.toHaveBeenCalled();
  });

  test('happy path inserts the feedback row when the agent has not reported yet', async () => {
    listRecordsMock
      .mockResolvedValueOnce([{ id: 'v-2', status: 'completed', leadId: 'lead-2' }])
      .mockResolvedValueOnce([]); // no feedback row yet
    insertRecordMock.mockResolvedValueOnce({ id: 'f-2' });

    const res = await submitSurvey(
      makeReq('http://localhost/api/viewing-feedback', {
        method: 'POST',
        body: JSON.stringify({ token: HEX48, clientRating: 2 }),
      })
    );
    expect(res.status).toBe(200);
    expect(insertRecordMock).toHaveBeenCalledWith(
      'viewing_feedback',
      expect.objectContaining({ viewingId: 'v-2', clientRating: 2, leadId: 'lead-2' })
    );
  });
});

describe('PATCH /api/admin/viewings/[id] (lifecycle)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // audit_logs / WhatsApp queue writes resolve by default (they are
    // fire-and-forget side effects of the route, never its result).
    insertRecordMock.mockResolvedValue({ id: 'audit-1' });
    enqueueWhatsAppJobMock.mockResolvedValue('wa-queue-1');
  });

  const call = (body: unknown, viewing: Record<string, unknown>) => {
    getRecordMock.mockResolvedValueOnce(viewing);
    updateRecordMock.mockResolvedValueOnce({ ...viewing, ...body });
    return patchViewing(makeReq('http://localhost/api/admin/viewings/v-1', { method: 'PATCH', body: JSON.stringify(body) }), {
      params: Promise.resolve({ id: 'v-1' }),
    });
  };

  test('illegal transition (pending → completed) rejected 422', async () => {
    const res = await call({ status: 'completed' }, { id: 'v-1', status: 'pending_approval' });
    expect(res.status).toBe(422);
    expect(updateRecordMock).not.toHaveBeenCalled();
  });

  test('scheduling without a slot rejected 400', async () => {
    const res = await call({ status: 'scheduled' }, { id: 'v-1', status: 'pending_approval' });
    expect(res.status).toBe(400);
  });

  test('completing a viewing mints the survey token + queues WhatsApp + audits', async () => {
    const res = await call(
      { status: 'completed' },
      { id: 'v-1', status: 'scheduled', visitorPhone: '+201000000000', visitorName: 'Ahmed', propertyCode: 'SE-100', leadId: 'lead-9' }
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.surveyQueued).toBe(true);
    expect(body.surveyLink).toMatch(/\/viewing-feedback\?token=[0-9a-f]{48}$/);

    const updateArgs = updateRecordMock.mock.calls[0];
    expect(updateArgs[0]).toBe('viewings');
    expect(String(updateArgs[2].surveyToken)).toMatch(/^[0-9a-f]{48}$/);

    expect(enqueueWhatsAppJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'viewing-followup',
        toPhone: '+201000000000',
        leadId: 'lead-9',
      })
    );
    // audit_logs entry with the actor
    const audit = insertRecordMock.mock.calls.find((c) => c[0] === 'audit_logs');
    expect(audit).toBeTruthy();
    expect(audit![1]).toMatchObject({ action: 'viewing.status_transition', actorUid: 'admin-1', target: 'viewings:v-1' });
  });

  test('cancel from pending_approval is legal', async () => {
    const res = await call({ status: 'cancelled' }, { id: 'v-1', status: 'pending_approval' });
    expect(res.status).toBe(200);
    expect(updateRecordMock).toHaveBeenCalledWith('viewings', 'v-1', expect.objectContaining({ status: 'cancelled' }));
  });
});

describe('Phase 9 honesty contracts (repo-level)', () => {
  const fs = require('fs');
  const path = require('path');

  test('ViewingsView ships no hardcoded demo viewing rows', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../app/admin/views/ViewingsView.tsx'),
      'utf8'
    );
    // No seeded arrays of fake viewings — all rows come from the API fetch.
    expect(src).toMatch(/fetch\('\/api\/admin\/viewings'\)/);
    expect(src).not.toMatch(/(SEED|DEMO|MOCK)_(VIEWINGS|FEEDBACK)/);
  });

  test('migration 015 and its app mirror are byte-identical', () => {
    const root = fs.readFileSync(
      path.resolve(__dirname, '../../../supabase/migrations/20261001_015_viewing_feedback.sql')
    );
    const mirror = fs.readFileSync(path.resolve(__dirname, '../supabase/migrations/20261001_015_viewing_feedback.sql'));
    expect(root.equals(mirror)).toBe(true);
  });

  test('feedback table is staff-only under RLS (no anon policy)', () => {
    const sql = fs.readFileSync(
      path.resolve(__dirname, '../../../supabase/migrations/20261001_015_viewing_feedback.sql'),
      'utf8'
    );
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/viewing_feedback_staff_access/);
    expect(sql).not.toMatch(/TO (anon|public)/);
  });
});
