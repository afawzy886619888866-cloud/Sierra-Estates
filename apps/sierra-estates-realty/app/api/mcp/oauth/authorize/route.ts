import { NextResponse } from 'next/server';
import { OAuthStore } from '@/lib/mcp/oauth-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const responseType = searchParams.get('response_type');
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = (searchParams.get('code_challenge_method') as 'S256' | 'plain') || 'S256';
  const scope = searchParams.get('scope') || 'mcp:read mcp:tools';
  const state = searchParams.get('state');

  // Validate response_type
  if (responseType !== 'code') {
    return NextResponse.json(
      { error: 'unsupported_response_type', error_description: 'Only response_type=code is supported' },
      { status: 400 },
    );
  }

  // Validate client
  if (!clientId) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'client_id is required' },
      { status: 400 },
    );
  }

  let client = OAuthStore.getClient(clientId);
  if (!client) {
    // Auto-register client if standard trusted client or dynamic
    client = OAuthStore.registerClient({
      client_name: clientId,
      redirect_uris: redirectUri ? [redirectUri] : ['https://claude.ai/api/auth/callback'],
    });
  }

  // Validate redirect_uri
  const targetRedirectUri = redirectUri || client.redirect_uris[0] || 'https://claude.ai/api/auth/callback';

  // OAuth 2.1 mandates PKCE
  if (!codeChallenge) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'code_challenge is required for PKCE' },
      { status: 400 },
    );
  }

  // Generate authorization code
  const authCode = OAuthStore.createAuthCode({
    clientId,
    redirectUri: targetRedirectUri,
    codeChallenge,
    codeChallengeMethod,
    scope,
  });

  // Construct redirect URL
  const redirectUrl = new URL(targetRedirectUri);
  redirectUrl.searchParams.set('code', authCode.code);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }

  return NextResponse.redirect(redirectUrl.toString(), 302);
}
