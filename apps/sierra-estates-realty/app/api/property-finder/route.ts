import { NextRequest, NextResponse } from 'next/server';
import { pfClient } from '@/lib/property-finder-client';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { PFIntegrationService } from '@/lib/services/PFIntegrationService';
import { PublishGateError } from '@/lib/services/publish-gate';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'search-listings': {
        const params = Object.fromEntries(searchParams.entries());
        delete params.action;
        const result = await pfClient.searchListings(params);
        return NextResponse.json(result);
      }
      case 'search-locations': {
        const q = searchParams.get('q') || '';
        const locations = await pfClient.searchLocations(q);
        return NextResponse.json(locations);
      }
      case 'fetch-leads': {
        const params = Object.fromEntries(searchParams.entries());
        delete params.action;
        const leads = await pfClient.fetchLeads(params);
        return NextResponse.json(leads);
      }
      case 'users': {
        const params = Object.fromEntries(searchParams.entries());
        delete params.action;
        const users = await pfClient.getUsers(params);
        return NextResponse.json(users);
      }
      case 'credit-balance': {
        const balance = await pfClient.getCreditBalance();
        return NextResponse.json(balance);
      }
      case 'webhooks': {
        const hooks = await pfClient.listWebhooks();
        return NextResponse.json(hooks);
      }
      default:
        return NextResponse.json({ error: 'Unknown action. Use: search-listings, search-locations, fetch-leads, users, credit-balance, webhooks' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[PF API GET]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const body = await request.json();
    const action = new URL(request.url).searchParams.get('action');

    switch (action) {
      case 'create-listing': {
        // P0-6 GATE BYPASS CLOSED: the old handler passed the raw body
        // straight to pfClient.createListing() — a full bypass of the
        // 8-condition PublishGate (any admin payload became a remote
        // listing). The ONLY publication path is
        // PFIntegrationService.publishListing(), which enforces the gate,
        // provider validation, dry-run and idempotency for EVERY caller.
        const unitId = typeof body.unitId === 'string' ? body.unitId : '';
        if (!unitId) {
          return NextResponse.json(
            {
              error:
                'unitId is required. Listing creation is gated: pass unitId (and optionally dryRun) — the publish gate evaluates the canonical unit record; raw provider payloads are not accepted.',
            },
            { status: 400 },
          );
        }
        const result = await PFIntegrationService.publishListing(unitId, {
          dryRun: body.dryRun === true,
        });
        return NextResponse.json(result, { status: 201 });
      }
      case 'publish': {
        // Same rule: publishing an existing unit goes through the gated
        // service (idempotent — an already-published unit returns
        // alreadyPublished instead of a second remote listing).
        const unitId = typeof body.unitId === 'string' ? body.unitId : '';
        const remoteId = typeof body.id === 'string' || typeof body.id === 'number' ? String(body.id) : '';
        if (!unitId && !remoteId) {
          return NextResponse.json(
            {
              error:
                'unitId (gated publication) or id (re-publish of a remote listing id previously accepted for this account) is required.',
            },
            { status: 400 },
          );
        }
        if (unitId) {
          const result = await PFIntegrationService.publishListing(unitId);
          return NextResponse.json({ success: true, gated: true, result });
        }
        // Re-publishing a remote id the provider already accepted: no unit
        // record is created or mutated by this call.
        await pfClient.publishListing(body.id);
        return NextResponse.json({ success: true, message: `Listing ${remoteId} publish requested` });
      }
      case 'unpublish': {
        if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
        await pfClient.unpublishListing(body.id);
        return NextResponse.json({ success: true, message: `Listing ${body.id} unpublished` });
      }
      case 'subscribe-webhook': {
        if (!body.eventId || !body.url) return NextResponse.json({ error: 'eventId and url required' }, { status: 400 });
        const result = await pfClient.subscribeWebhook(body.eventId, body.url, body.secret);
        return NextResponse.json(result, { status: 201 });
      }
      default:
        return NextResponse.json({ error: 'Unknown action. Use: create-listing, publish, unpublish, subscribe-webhook' }, { status: 400 });
    }
  } catch (error: any) {
    // A gate rejection is a 422 with the check-by-check evidence — the
    // caller learns exactly which condition failed instead of a raw 500.
    if (error instanceof PublishGateError) {
      return NextResponse.json(
        {
          error: error.message,
          gate: { eligible: error.gate.eligible, failures: error.gate.failures, checks: error.gate.checks },
        },
        { status: 422 },
      );
    }
    console.error('[PF API POST]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required as query param' }, { status: 400 });

    const body = await request.json();
    const result = await pfClient.updateListing(parseInt(id), body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[PF API PUT]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required as query param' }, { status: 400 });

    await pfClient.deleteListing(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PF API DELETE]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
