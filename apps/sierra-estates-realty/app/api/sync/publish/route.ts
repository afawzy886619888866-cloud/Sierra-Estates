import { NextRequest, NextResponse } from 'next/server';
import { PFIntegrationService } from '@/lib/services/PFIntegrationService';
import { verifyRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { getRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const auth = await verifyRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  if (auth.method === 'supabase') {
    try {
      const profile = await getRecord<{ role?: string }>('profiles', auth.uid!);
      if (profile?.role !== 'admin') {
        return unauthorizedResponse('Admin privileges required');
      }
    } catch {
      return unauthorizedResponse('Auth check failed');
    }
  }

  try {
    const { unitId } = await request.json();
    if (!unitId) {
      return NextResponse.json({ error: 'unitId is required' }, { status: 400 });
    }

    const result = await PFIntegrationService.publishListing(unitId);

    return NextResponse.json({
      success: true,
      pfId: result.id,
      pfReference: result.reference || String(result.id),
    });
  } catch (error: any) {
    logger.error('[PUBLISH_TO_PF]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
