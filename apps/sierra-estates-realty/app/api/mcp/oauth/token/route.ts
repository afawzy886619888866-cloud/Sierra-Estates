import { NextResponse } from 'next/server';
import { OAuthStore } from '@/lib/mcp/oauth-store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let payload: Record<string, string> = {};

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        if (typeof value === 'string') {
          payload[key] = value;
        }
      });
    } else {
      payload = await request.json();
    }

    const grantType = payload.grant_type;
    const clientId = payload.client_id || 'sierra-mcp-connector';

    if (grantType === 'authorization_code') {
      const { code, redirect_uri, code_verifier } = payload;

      if (!code) {
        return NextResponse.json(
          { error: 'invalid_request', error_description: 'code is required' },
          { status: 400 },
        );
      }

      const authCode = OAuthStore.consumeAuthCode(code);
      if (!authCode) {
        return NextResponse.json(
          { error: 'invalid_grant', error_description: 'Invalid, expired, or previously used authorization code' },
          { status: 400 },
        );
      }

      // Validate redirect_uri matches the authorization request per RFC 6749 §4.1.3
      if (redirect_uri && authCode.redirect_uri && redirect_uri !== authCode.redirect_uri) {
        return NextResponse.json(
          { error: 'invalid_grant', error_description: 'redirect_uri mismatch' },
          { status: 400 },
        );
      }

      // Verify PKCE verifier
      if (authCode.code_challenge) {
        if (!code_verifier) {
          return NextResponse.json(
            { error: 'invalid_request', error_description: 'code_verifier required for PKCE flow' },
            { status: 400 },
          );
        }

        const isValid = OAuthStore.verifyPKCE(
          code_verifier,
          authCode.code_challenge,
          authCode.code_challenge_method,
        );

        if (!isValid) {
          return NextResponse.json(
            { error: 'invalid_grant', error_description: 'PKCE verification failed' },
            { status: 400 },
          );
        }
      }

      // Issue access token
      const token = OAuthStore.issueToken(clientId, authCode.scope);

      return NextResponse.json({
        access_token: token.access_token,
        token_type: 'Bearer',
        expires_in: Math.floor((token.expires_at - Date.now()) / 1000),
        refresh_token: token.refresh_token,
        scope: token.scope,
      });
    }

    if (grantType === 'refresh_token') {
      const token = OAuthStore.issueToken(clientId, 'mcp:read mcp:tools');
      return NextResponse.json({
        access_token: token.access_token,
        token_type: 'Bearer',
        expires_in: Math.floor((token.expires_at - Date.now()) / 1000),
        refresh_token: token.refresh_token,
        scope: token.scope,
      });
    }

    return NextResponse.json(
      { error: 'unsupported_grant_type', error_description: `Grant type '${grantType}' not supported` },
      { status: 400 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'server_error', error_description: error.message || 'Token endpoint error' },
      { status: 500 },
    );
  }
}
