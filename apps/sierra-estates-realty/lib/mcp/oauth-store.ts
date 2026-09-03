import crypto from 'crypto';

export interface OAuthClient {
  client_id: string;
  client_secret?: string;
  client_name?: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  scope: string;
  token_endpoint_auth_method?: string;
  created_at: number;
}

export interface AuthCode {
  code: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: 'S256' | 'plain';
  scope: string;
  expires_at: number;
  user_id?: string;
}

export interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  token_type: 'Bearer';
  client_id: string;
  scope: string;
  expires_at: number;
  revoked: boolean;
  created_at: number;
}

// In-memory singletons for serverless edge/lambda lifecycle with deterministic memory
const clients = new Map<string, OAuthClient>();
const authCodes = new Map<string, AuthCode>();
const tokens = new Map<string, OAuthToken>();

// Pre-seed a default client if needed
const DEFAULT_CLIENT_ID = 'sierra-mcp-connector';
clients.set(DEFAULT_CLIENT_ID, {
  client_id: DEFAULT_CLIENT_ID,
  client_name: 'Claude MCP Connector',
  redirect_uris: [
    'https://claude.ai/api/auth/callback',
    'https://claude.ai/oauth/callback',
    'http://localhost:3000/callback',
  ],
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
  scope: 'mcp:read mcp:tools',
  created_at: Date.now(),
});

export class OAuthStore {
  /**
   * RFC 7591 Dynamic Client Registration
   */
  public static registerClient(data: Partial<OAuthClient>): OAuthClient {
    const clientId = `client_${crypto.randomBytes(16).toString('hex')}`;
    const clientSecret = crypto.randomBytes(32).toString('hex');
    
    const client: OAuthClient = {
      client_id: clientId,
      client_secret: clientSecret,
      client_name: data.client_name || 'Dynamic Registered Client',
      redirect_uris: data.redirect_uris && data.redirect_uris.length > 0 ? data.redirect_uris : ['https://claude.ai/api/auth/callback'],
      grant_types: data.grant_types || ['authorization_code', 'refresh_token'],
      response_types: data.response_types || ['code'],
      scope: data.scope || 'mcp:read mcp:tools',
      token_endpoint_auth_method: data.token_endpoint_auth_method || 'none',
      created_at: Date.now(),
    };

    clients.set(clientId, client);
    return client;
  }

  public static getClient(clientId: string): OAuthClient | undefined {
    return clients.get(clientId);
  }

  /**
   * Store an authorization code with PKCE challenge
   */
  public static createAuthCode(data: {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    codeChallengeMethod?: 'S256' | 'plain';
    scope?: string;
  }): AuthCode {
    const code = `code_${crypto.randomBytes(24).toString('hex')}`;
    const authCode: AuthCode = {
      code,
      client_id: data.clientId,
      redirect_uri: data.redirectUri,
      code_challenge: data.codeChallenge,
      code_challenge_method: data.codeChallengeMethod || 'S256',
      scope: data.scope || 'mcp:read mcp:tools',
      expires_at: Date.now() + 10 * 60 * 1000, // 10 minutes
    };

    authCodes.set(code, authCode);
    return authCode;
  }

  public static consumeAuthCode(code: string): AuthCode | undefined {
    const entry = authCodes.get(code);
    if (!entry) return undefined;
    authCodes.delete(code); // Single-use
    if (Date.now() > entry.expires_at) return undefined;
    return entry;
  }

  /**
   * Verify PKCE code_verifier against code_challenge
   */
  public static verifyPKCE(verifier: string, challenge: string, method: 'S256' | 'plain' = 'S256'): boolean {
    if (method === 'plain') {
      return verifier === challenge;
    }
    const computedChallenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    return computedChallenge === challenge;
  }

  /**
   * Issue access token & optional refresh token
   */
  public static issueToken(clientId: string, scope: string = 'mcp:read mcp:tools'): OAuthToken {
    const accessToken = `mcp_at_${crypto.randomBytes(32).toString('hex')}`;
    const refreshToken = `mcp_rt_${crypto.randomBytes(32).toString('hex')}`;
    const token: OAuthToken = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      client_id: clientId,
      scope,
      expires_at: Date.now() + 3600 * 1000, // 1 hour
      revoked: false,
      created_at: Date.now(),
    };

    tokens.set(accessToken, token);
    return token;
  }

  public static verifyAccessToken(tokenStr: string): { valid: boolean; token?: OAuthToken; error?: string } {
    const token = tokens.get(tokenStr);
    if (!token) {
      return { valid: false, error: 'Token not found' };
    }
    if (token.revoked) {
      return { valid: false, error: 'Token has been revoked' };
    }
    if (Date.now() > token.expires_at) {
      return { valid: false, error: 'Token expired' };
    }
    return { valid: true, token };
  }

  public static revokeToken(tokenStr: string): boolean {
    const token = tokens.get(tokenStr);
    if (token) {
      token.revoked = true;
      return true;
    }
    return false;
  }
}
