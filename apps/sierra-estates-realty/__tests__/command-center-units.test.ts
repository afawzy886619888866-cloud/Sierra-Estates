/**
 * Tests: Unified Admin Command Center — shared vocabulary units.
 *
 *   · lib/crm-stages.ts — the canonical 10-stage pipeline (order, membership,
 *     late stages, stage positions) the /admin/pipeline board renders.
 *   · lib/server/inventory-buckets.ts — the verified / stale / sold mapping
 *     between the command-center vocabulary and the production listing model
 *     (publish gate, stale flag, guarded status).
 */
import {
  CRM_PIPELINE_STAGES,
  CRM_STAGE_META,
  LATE_STAGES,
  isCrmPipelineStage,
  stagePosition,
} from '@/lib/crm-stages';
import {
  bucketFor,
  isInventoryBucket,
  isVerifiedShowcaseRow,
} from '@/lib/server/inventory-buckets';

describe('lib/crm-stages — the canonical 10-stage pipeline', () => {
  test('exposes exactly ten stages in board order', () => {
    expect(CRM_PIPELINE_STAGES).toHaveLength(10);
    expect(CRM_PIPELINE_STAGES).toEqual([
      'inbound',
      'qualify',
      'engage',
      'proposal',
      'viewing',
      'negotiate',
      'reserve',
      'contract',
      'handover',
      'closed-won',
    ]);
  });

  test('every stage has presentation metadata in the same order', () => {
    expect(CRM_STAGE_META).toHaveLength(10);
    expect(CRM_STAGE_META.map((m) => m.id)).toEqual([...CRM_PIPELINE_STAGES]);
  });

  test('identifies members and rejects foreign values', () => {
    expect(isCrmPipelineStage('negotiate')).toBe(true);
    expect(isCrmPipelineStage('closed-won')).toBe(true);
    // The deals kanban vocabulary must never leak into the lead pipeline.
    expect(isCrmPipelineStage('offer_made')).toBe(false);
    expect(isCrmPipelineStage('')).toBe(false);
    expect(isCrmPipelineStage(null)).toBe(false);
  });

  test('computes 1-based board positions', () => {
    expect(stagePosition('inbound')).toBe(1);
    expect(stagePosition('closed-won')).toBe(10);
    expect(stagePosition('unknown-stage')).toBe(0);
  });

  test('late stages are the committed-revenue tail of the funnel', () => {
    expect(LATE_STAGES).toEqual(['negotiate', 'reserve', 'contract', 'handover', 'closed-won']);
  });
});

describe('lib/server/inventory-buckets — command-center status mapping', () => {
  test('PUBLISHABLE + live status + not stale maps to verified', () => {
    expect(
      bucketFor({ status: 'active', publishStatus: 'PUBLISHABLE', stale: false }),
    ).toBe('verified');
    expect(
      bucketFor({ status: 'available', publishStatus: 'PUBLISHABLE' }),
    ).toBe('verified');
  });

  test('stale flag or STALE publish status maps to stale', () => {
    expect(bucketFor({ status: 'active', publishStatus: 'PUBLISHABLE', stale: true })).toBe('stale');
    expect(bucketFor({ status: 'active', publishStatus: 'STALE', stale: false })).toBe('stale');
  });

  test('sold is terminal regardless of publish state', () => {
    expect(bucketFor({ status: 'sold', publishStatus: 'PUBLISHABLE', stale: false })).toBe('sold');
  });

  test('everything else is pending verification', () => {
    expect(bucketFor({ status: 'pending', publishStatus: 'REVIEW_REQUIRED' })).toBe('pending');
    expect(bucketFor({ status: 'draft', publishStatus: null })).toBe('pending');
    expect(bucketFor({})).toBe('pending');
  });

  test('bucket guard accepts only the five known buckets', () => {
    expect(isInventoryBucket('verified')).toBe(true);
    expect(isInventoryBucket('all')).toBe(true);
    expect(isInventoryBucket('live')).toBe(false);
    expect(isInventoryBucket(undefined)).toBe(false);
  });

  test('public showcase gate requires verified AND freshness >= 90', () => {
    const fresh = { status: 'active', publishStatus: 'PUBLISHABLE', stale: false, freshnessScore: 95 };
    const barely = { status: 'active', publishStatus: 'PUBLISHABLE', stale: false, freshnessScore: 90 };
    const tired = { status: 'active', publishStatus: 'PUBLISHABLE', stale: false, freshnessScore: 89 };
    const stale = { status: 'active', publishStatus: 'PUBLISHABLE', stale: true, freshnessScore: 99 };
    expect(isVerifiedShowcaseRow(fresh)).toBe(true);
    expect(isVerifiedShowcaseRow(barely)).toBe(true);
    expect(isVerifiedShowcaseRow(tired)).toBe(false);
    expect(isVerifiedShowcaseRow(stale)).toBe(false);
    expect(isVerifiedShowcaseRow({ ...fresh, freshnessScore: undefined })).toBe(false);
  });
});
