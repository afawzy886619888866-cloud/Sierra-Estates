import { NextResponse } from 'next/server';
import { runMatchingForLead } from '@/lib/services/matching-engine';
import { listRecords } from '@sierra-estates/db';
import { COLLECTIONS } from '@/lib/models/schema';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';

export async function POST(req) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('leadId');
    const bulk = searchParams.get('bulk') === 'true';

    if (bulk) {
      // Bulk matching for new leads that haven't been matched yet
      const leads = await listRecords(COLLECTIONS.stakeholders, {
        where: [{ column: 'status', op: 'in', value: ['new', 'contacted'] }],
        limit: 10,
      });
      const results = [];

      for (const lead of leads) {
        try {
          const matches = await runMatchingForLead(lead.id);
          results.push({ leadId: lead.id, matches: matches.length });
        } catch (e) {
          results.push({ leadId: lead.id, error: String(e) });
        }
      }

      return NextResponse.json({ success: true, processed: results });
    }

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required for single matching' }, { status: 400 });
    }

    const matches = await runMatchingForLead(leadId);
    return NextResponse.json({ success: true, matches });

  } catch (error) {
    logger.error('[MATCHING_API_ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
