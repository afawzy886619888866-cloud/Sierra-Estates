/**
 * /api/admin/applicants — Recruitment & Applicant Management for the
 * Unified Admin Command Center (/admin/applicants).
 *
 * GET (staff) — reads the `applicants` security_invoker VIEW (migration 037),
 *               which aliases public.career_applications: one source of truth
 *               for recruitment, exposed under the command center's name.
 *               Staff access flows through the base table's RLS
 *               ("career_applications_staff_access"); the public intake form
 *               keeps INSERTing into career_applications directly.
 *
 *   ?status=new|pending_review|reviewed|hired|rejected
 *   ?q=free-text over name / email / phone / position
 *   ?limit=50 (1..200, newest first)
 */
import { NextRequest, NextResponse } from 'next/server';
import { listRecords } from '@sierra-estates/db';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const APPLICANT_STATUSES = new Set([
  'new',
  'pending_review',
  'reviewed',
  'hired',
  'rejected',
]);

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const params = new URL(req.url).searchParams;
    const status = params.get('status') ?? '';
    const q = (params.get('q') ?? '').trim().toLowerCase();
    const limit = Math.min(
      Math.max(parseInt(params.get('limit') ?? '100', 10) || 100, 1),
      200,
    );

    const where: { column: string; value: unknown }[] = [];
    if (APPLICANT_STATUSES.has(status)) where.push({ column: 'status', value: status });

    // The view carries the base table's columns; the records layer returns
    // them camelCased, identical to reading career_applications directly.
    const rows = (await listRecords('applicants', {
      select:
        'id,name,phone,email,position,experience,hasVehicle,biggestAchievements,' +
        'expectedSalary,realEstateKnowledge,availability,cvUrl,message,source,status,createdAt,updatedAt',
      where,
      limit,
      orderBy: { column: 'createdAt', ascending: false },
    })) as Record<string, unknown>[];

    const filtered = q
      ? rows.filter((row) =>
          [row.name, row.email, row.phone, row.position, row.experience]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q)),
        )
      : rows;

    const counts: Record<string, number> = {
      new: 0,
      pending_review: 0,
      reviewed: 0,
      hired: 0,
      rejected: 0,
    };
    for (const row of rows) {
      const s = String(row.status ?? 'new');
      counts[s] = (counts[s] ?? 0) + 1;
    }

    return NextResponse.json({ rows: filtered, counts, total: rows.length });
  } catch (error) {
    logger.error('[ADMIN_APPLICANTS_API_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to load applicants.' },
      { status: 500 },
    );
  }
}
