 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
import { syncBatch, getPendingDedupeItems, resolveDedupeItem } from '@/lib/services/sync-engine';
import { PFIntegrationService } from '@/lib/services/PFIntegrationService';
import { pfClient } from '@/lib/property-finder-client';
import { verifyRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { logger } from '@/lib/logger';

/**
 * SYNC MANAGEMENT API
 * Handles PF ↔ Firestore sync operations and dedup queue management.
 */

async function isAdmin(uid) {
  try {
    const userDoc = await adminDb.collection('users').doc(uid).get();
    return userDoc.exists && _optionalChain([userDoc, 'access', _ => _.data, 'call', _2 => _2(), 'optionalAccess', _3 => _3.role]) === 'admin';
  } catch (error) {
    logger.error('[SYNC_AUTH_ERROR] Role check failed:', error);
    return false;
  }
}

// GET — Retrieve pending dedup queue items
export async function GET(request) {
  // Security Check
  const auth = await verifyRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();
  
  if (auth.method === 'firebase') {
    const admin = await isAdmin(auth.uid);
    if (!admin) return unauthorizedResponse('Admin privileges required');
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'pending-reviews':
        const pending = await getPendingDedupeItems();
        return NextResponse.json({ items: pending, count: pending.length });

      default:
        return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('[SYNC_ERROR] Sync API GET:', error);
    return NextResponse.json({ error: 'Sync query failed' }, { status: 500 });
  }
}

// POST — Trigger a sync batch or resolve dedup items
export async function POST(request) {
  // Security Check
  const auth = await verifyRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  if (auth.method === 'firebase') {
    const admin = await isAdmin(auth.uid);
    if (!admin) return unauthorizedResponse('Admin privileges required');
  }

  try {
    const body = await request.json();
    const action = new URL(request.url).searchParams.get('action');

    switch (action) {
      case 'run-sync': {
        const filters = body.filters || {};
        const pfResult = await pfClient.searchListings(filters);
        const listings = pfResult.data || [];
        const syncResult = await syncBatch(listings );
        
        // Also sync leads + listings automatically as part of full run
        const leadsResult = await PFIntegrationService.syncIncomingLeads();
        const pfListingsResult = await PFIntegrationService.syncIncomingListings();

        return NextResponse.json({
          listings: syncResult,
          leads: leadsResult,
          pfListings: pfListingsResult,
        });
      }

      case 'sync-leads': {
        const leadsResult = await PFIntegrationService.syncIncomingLeads();
        return NextResponse.json(leadsResult);
      }

      case 'sync-listings': {
        const listingsResult = await PFIntegrationService.syncIncomingListings();
        return NextResponse.json(listingsResult);
      }

      case 'resolve': {
        const { queueId, resolution, resolvedBy, firestoreDocId } = body;
        if (!queueId || !resolution || !resolvedBy) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        await resolveDedupeItem(queueId, resolution, resolvedBy, firestoreDocId);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Unsupported sync action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('[SYNC_ERROR] Sync API POST:', error);
    return NextResponse.json({ error: 'Sync operation failed' }, { status: 500 });
  }
}
