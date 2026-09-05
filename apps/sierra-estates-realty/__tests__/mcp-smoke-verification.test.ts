import crypto from 'crypto';
import { GET as getAuthMetadata } from '../app/.well-known/oauth-authorization-server/route';
import { GET as getResourceMetadata } from '../app/.well-known/oauth-protected-resource/route';
import { POST as registerRoute } from '../app/api/mcp/oauth/register/route';
import { GET as authorizeRoute } from '../app/api/mcp/oauth/authorize/route';
import { POST as tokenRoute } from '../app/api/mcp/oauth/token/route';
import { POST as mcpPostRoute } from '../app/api/mcp/route';

describe('MCP End-to-End Smoke Verification (M10.4)', () => {
  it('completes the entire end-to-end cutover smoke sequence', async () => {
    // 1. Probe Authorization Server Metadata (RFC 8414)
    const authMetaReq = new Request('https://sierra-estates.net/.well-known/oauth-authorization-server');
    const authMetaRes = await getAuthMetadata(authMetaReq);
    expect(authMetaRes.status).toBe(200);
    const authMeta = await authMetaRes.json();
    expect(authMeta.token_endpoint).toContain('/api/mcp/oauth/token');
    expect(authMeta.authorization_endpoint).toContain('/api/mcp/oauth/authorize');

    // 2. Probe Protected Resource Metadata (RFC 9728)
    const resMetaReq = new Request('https://sierra-estates.net/.well-known/oauth-protected-resource');
    const resMetaRes = await getResourceMetadata(resMetaReq);
    expect(resMetaRes.status).toBe(200);
    const resMeta = await resMetaRes.json();
    expect(Array.isArray(resMeta.authorization_servers)).toBe(true);

    // 3. Dynamic Client Registration (RFC 7591)
    const dcrReq = new Request('https://sierra-estates.net/api/mcp/oauth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Claude Custom Cutover Connector',
        redirect_uris: ['https://claude.ai/api/auth/callback'],
        scope: 'mcp:read mcp:tools',
      }),
    });
    const dcrRes = await registerRoute(dcrReq);
    expect(dcrRes.status).toBe(201);
    const dcrData = await dcrRes.json();
    expect(dcrData.client_id).toBeDefined();
    const clientId = dcrData.client_id;

    // 4. PKCE Authorization Flow & Token Issuance
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

    const authUrl = `https://sierra-estates.net/api/mcp/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=https://claude.ai/api/auth/callback&code_challenge=${challenge}&code_challenge_method=S256&state=cutover-smoke`;
    const authorizeRes = await authorizeRoute(new Request(authUrl));
    expect(authorizeRes.status).toBe(302);
    const location = authorizeRes.headers.get('location') || '';
    const redirectUrl = new URL(location);
    const authCode = redirectUrl.searchParams.get('code');
    expect(authCode).toBeDefined();

    const tokenReq = new Request('https://sierra-estates.net/api/mcp/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: clientId,
        redirect_uri: 'https://claude.ai/api/auth/callback',
        code_verifier: verifier,
      }),
    });
    const tokenRes = await tokenRoute(tokenReq);
    expect(tokenRes.status).toBe(200);
    const tokenData = await tokenRes.json();
    expect(tokenData.access_token).toBeDefined();
    const accessToken = tokenData.access_token;

    // 5. MCP Handshake (initialize)
    const initReq = new Request('https://sierra-estates.net/api/mcp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'claude-cutover-connector', version: '1.0.0' },
        },
      }),
    });
    const initRes = await mcpPostRoute(initReq);
    expect(initRes.status).toBe(200);
    const initData = await initRes.json();
    expect(initData.result.protocolVersion).toBe('2024-11-05');

    // 6. MCP Tool Discovery (tools/list)
    const listReq = new Request('https://sierra-estates.net/api/mcp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      }),
    });
    const listRes = await mcpPostRoute(listReq);
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.result.tools.length).toBeGreaterThanOrEqual(10);

    // 7. Execute Read-Only Tool (get_pipeline_summary)
    const callReq = new Request('https://sierra-estates.net/api/mcp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'get_pipeline_summary',
          arguments: { pipelineId: 'smoke_deal_001' },
        },
      }),
    });
    const callRes = await mcpPostRoute(callReq);
    expect(callRes.status).toBe(200);
    const callData = await callRes.json();
    expect(callData.result.content[0].type).toBe('text');

    // 8. Scope Protection Barrier Verification
    const spendReq = new Request('https://sierra-estates.net/api/mcp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`, // read-only token
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'create_payment_intent',
          arguments: { amount: 50000, currency: 'EGP', leadId: 'lead_smoke' },
        },
      }),
    });
    const spendRes = await mcpPostRoute(spendReq);
    expect(spendRes.status).toBe(403);
    const spendData = await spendRes.json();
    expect(spendData.error.code).toBe(-32003);
  });
});
