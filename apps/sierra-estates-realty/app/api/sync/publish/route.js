 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
import { PFIntegrationService } from '@/lib/services/PFIntegrationService';
import { verifyRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { logger } from '@/lib/logger';

export async function POST(request) {
  const auth = await verifyRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  if (auth.method === 'firebase') {
    try {
      const userDoc = await adminDb.collection('users').doc(auth.uid).get();
      if (!userDoc.exists || _optionalChain([userDoc, 'access', _ => _.data, 'call', _2 => _2(), 'optionalAccess', _3 => _3.role]) !== 'admin') {
        return unauthorizedResponse('Admin privileges required');
      }
    } catch (e) {
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
  } catch (error) {
    logger.error('[PUBLISH_TO_PF]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
