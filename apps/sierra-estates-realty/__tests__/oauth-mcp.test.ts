import crypto from 'crypto';
import { OAuthStore } from '../lib/mcp/oauth-store';
import { GET as getAuthMetadata } from '../app/api/well-known/oauth-authorization-server/route';
import { GET as getResourceMetadata } from '../app/api/well-known/oauth-protected-resource/route';
import { POST as registerClientRoute } from '../app/api/mcp/oauth/register/route';
import { GET as authorizeRoute } from '../app/api/mcp/oauth/authorize/route';
import { POST as tokenRoute } from '../app/api/mcp/oauth/token/route';

describe('OAuth 2.1 Remote MCP Authorization Engine', () => {
  describe('1. OAuthStore & PKCE Verification', () => {
    it('registers a dynamic client with generated clientId and secret', () => {
      const client = OAuthStore.registerClient({
        client_name: 'Test Claude Connector',
        redirect_uris: ['https://claude.ai/api/auth/callback'],
      });

      expect(client.client_id).toMatch(/^client_/);
      expect(client.client_secret).toBeDefined();
      expect(client.client_name).toBe('Test Claude Connector');
      expect(OAuthStore.getClient(client.client_id)).toBeDefined();
    });

    it('creates and verifies PKCE S256 challenge correctly', () => {
      const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const challenge = crypto
        .createHash('sha256')
        .update(verifier)
        .digest('base64url');

      expect(OAuthStore.verifyPKCE(verifier, challenge, 'S256')).toBe(true);
      expect(OAuthStore.verifyPKCE('wrong-verifier', challenge, 'S256')).toBe(false);
    });

    it('issues and verifies access tokens', () => {
      const token = OAuthStore.issueToken('test-client', 'mcp:read mcp:tools');
      expect(token.access_token).toMatch(/^mcp_at_/);
      expect(token.refresh_token).toMatch(/^mcp_rt_/);

      const verification = OAuthStore.verifyAccessToken(token.access_token);
      expect(verification.valid).toBe(true);
      expect(verification.token?.client_id).toBe('test-client');

      // Test revocation
      OAuthStore.revokeToken(token.access_token);
      const revokedCheck = OAuthStore.verifyAccessToken(token.access_token);
      expect(revokedCheck.valid).toBe(false);
      expect(revokedCheck.error).toContain('revoked');
    });
  });

  describe('2. Metadata Endpoints (RFC 8414 & RFC 9728)', () => {
    it('returns RFC 8414 OAuth authorization server metadata', async () => {
      const req = new Request('https://sierra-estates.net/.well-known/oauth-authorization-server');
      const res = await getAuthMetadata(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.issuer).toBeDefined();
      expect(data.authorization_endpoint).toContain('/api/mcp/oauth/authorize');
      expect(data.token_endpoint).toContain('/api/mcp/oauth/token');
      expect(data.registration_endpoint).toContain('/api/mcp/oauth/register');
      expect(data.code_challenge_methods_supported).toContain('S256');
    });

    it('returns RFC 9728 protected resource metadata', async () => {
      const req = new Request('https://sierra-estates.net/.well-known/oauth-protected-resource');
      const res = await getResourceMetadata(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.resource).toContain('/api/mcp');
      expect(data.authorization_servers).toBeDefined();
      expect(data.bearer_methods_supported).toContain('header');
    });
  });

  describe('3. OAuth Authorization & Token Flow', () => {
    it('handles DCR registration route', async () => {
      const req = new Request('https://sierra-estates.net/api/mcp/oauth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: 'Dynamic Claude Client',
          redirect_uris: ['https://claude.ai/api/auth/callback'],
        }),
      });

      const res = await registerClientRoute(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.client_id).toBeDefined();
      expect(data.client_name).toBe('Dynamic Claude Client');
    });

    it('handles authorize endpoint redirect with code', async () => {
      const verifier = 'secret_verifier_string_1234567890';
      const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

      const req = new Request(
        `https://sierra-estates.net/api/mcp/oauth/authorize?response_type=code&client_id=sierra-mcp-connector&redirect_uri=https://claude.ai/api/auth/callback&code_challenge=${challenge}&code_challenge_method=S256&state=xyz123`,
      );

      const res = await authorizeRoute(req);
      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('code=');
      expect(location).toContain('state=xyz123');
    });

    it('exchanges code for access token via token route', async () => {
      const verifier = 'my_secure_code_verifier_long_enough';
      const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

      const authCode = OAuthStore.createAuthCode({
        clientId: 'sierra-mcp-connector',
        redirectUri: 'https://claude.ai/api/auth/callback',
        codeChallenge: challenge,
        codeChallengeMethod: 'S256',
        scope: 'mcp:read mcp:tools',
      });

      const req = new Request('https://sierra-estates.net/api/mcp/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: authCode.code,
          redirect_uri: 'https://claude.ai/api/auth/callback',
          client_id: 'sierra-mcp-connector',
          code_verifier: verifier,
        }),
      });

      const res = await tokenRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.access_token).toMatch(/^mcp_at_/);
      expect(data.token_type).toBe('Bearer');
      expect(data.expires_in).toBeGreaterThan(0);
    });
  });
});
