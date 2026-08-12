import { NextRequest, NextResponse } from 'next/server';
import { pfClient } from '@/lib/property-finder-client';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';

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
        const result = await pfClient.createListing(body);
        return NextResponse.json(result, { status: 201 });
      }
      case 'publish': {
        if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
        await pfClient.publishListing(body.id);
        return NextResponse.json({ success: true, message: `Listing ${body.id} publish requested` });
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
