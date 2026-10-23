import { NextResponse } from 'next/server';
import { OAuthStore } from '@/lib/mcp/oauth-store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.redirect_uris && !Array.isArray(body.redirect_uris)) {
      return NextResponse.json(
        { error: 'invalid_client_metadata', error_description: 'redirect_uris must be an array' },
        { status: 400 },
      );
    }

    const client = OAuthStore.registerClient({
      client_name: body.client_name,
      redirect_uris: body.redirect_uris,
      grant_types: body.grant_types,
      response_types: body.response_types,
      scope: body.scope,
      token_endpoint_auth_method: body.token_endpoint_auth_method || 'none',
    });

    return NextResponse.json(
      {
        client_id: client.client_id,
        client_secret: client.client_secret,
        client_name: client.client_name,
        redirect_uris: client.redirect_uris,
        grant_types: client.grant_types,
        response_types: client.response_types,
        scope: client.scope,
        token_endpoint_auth_method: client.token_endpoint_auth_method,
        client_id_issued_at: Math.floor(client.created_at / 1000),
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'server_error', error_description: error.message || 'Failed to process registration' },
      { status: 500 },
    );
  }
}
