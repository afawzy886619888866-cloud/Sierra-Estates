 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
import { verifyRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { AirtableIntegrationService } from '@/lib/services/AirtableIntegrationService';
import { logger } from '@/lib/logger';

/**
 * AIRTABLE SYNC API
 *
 * POST /api/sync/airtable                          — pull listings from Airtable into Firestore.
 * POST /api/sync/airtable {"direction":"export"}   — push Firestore listings + leads INTO Airtable
 *                                                    (upserts: listings merge on Code, leads on
 *                                                    Firestore ID — safe to re-run).
 * GET  /api/sync/airtable                          — report whether Airtable is configured (no secrets).
 *
 * Auth mirrors /api/sync: Firebase admins, or service/cron callers presenting
 * the X-SBR-SECRET-KEY header (verifyRequest's "secret" method).
 */

async function isAdmin(uid) {
  try {
    const userDoc = await adminDb.collection('users').doc(uid).get();
    return userDoc.exists && _optionalChain([userDoc, 'access', _ => _.data, 'call', _2 => _2(), 'optionalAccess', _3 => _3.role]) === 'admin';
  } catch (error) {
    logger.error('[AIRTABLE_SYNC_AUTH_ERROR] Role check failed:', error);
    return false;
  }
}

export async function GET(request) {
  const auth = await verifyRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.method === 'firebase' && !(await isAdmin(auth.uid))) {
    return unauthorizedResponse('Admin privileges required');
  }

  const cfg = AirtableIntegrationService.getConfig();
  return NextResponse.json({
    configured: cfg !== null,
    tables: _nullishCoalesce(_optionalChain([cfg, 'optionalAccess', _4 => _4.tables]), () => ( [])),
  });
}

export async function POST(request) {
  const auth = await verifyRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.method === 'firebase' && !(await isAdmin(auth.uid))) {
    return unauthorizedResponse('Admin privileges required');
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result =
      _optionalChain([body, 'optionalAccess', _5 => _5.direction]) === 'export'
        ? await AirtableIntegrationService.exportToAirtable()
        : await AirtableIntegrationService.syncFromEnv();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Missing configuration is a client-actionable 400, not a server fault.
    const status = message.includes('not configured') ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
