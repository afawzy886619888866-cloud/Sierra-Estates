#!/usr/bin/env tsx
/**
 * MCP End-to-End Production & Local Smoke Test
 * Validates OAuth 2.1 Metadata, DCR, PKCE, Streamable-HTTP MCP Handshake, Tool Listing, and Scope Barrier.
 */

import crypto from 'crypto';

const BASE_URL = process.env.MCP_TARGET_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://sierra-estates.net';

interface TestResult {
  step: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, step: string, message: string) {
  if (condition) {
    results.push({ step, passed: true });
    console.log(`\x1b[32m[PASS]\x1b[0m ${step}`);
  } else {
    results.push({ step, passed: false, details: message });
    console.error(`\x1b[31m[FAIL]\x1b[0m ${step}: ${message}`);
  }
}

async function runSmokeTest() {
  console.log(`\n======================================================`);
  console.log(`🚀 Starting MCP Smoke Test against: ${BASE_URL}`);
  console.log(`======================================================\n`);

  try {
    // 1. Probe Authorization Server Metadata (RFC 8414)
    console.log('1. Checking OAuth 2.1 Authorization Server Metadata...');
    const authMetaRes = await fetch(`${BASE_URL}/.well-known/oauth-authorization-server`);
    assert(authMetaRes.status === 200, 'OAuth Auth Server Metadata', `Status ${authMetaRes.status}`);
    const authMeta = await authMetaRes.json();
    assert(!!authMeta.token_endpoint, 'Token Endpoint Advertised', 'Missing token_endpoint in metadata');
    assert(!!authMeta.authorization_endpoint, 'Auth Endpoint Advertised', 'Missing authorization_endpoint');

    // 2. Probe Protected Resource Metadata (RFC 9728)
    console.log('\n2. Checking OAuth Protected Resource Metadata...');
    const resMetaRes = await fetch(`${BASE_URL}/.well-known/oauth-protected-resource`);
    assert(resMetaRes.status === 200, 'Protected Resource Metadata', `Status ${resMetaRes.status}`);
    const resMeta = await resMetaRes.json();
    assert(Array.isArray(resMeta.authorization_servers), 'Resource Auth Servers Array', 'Missing authorization_servers');

    // 3. Dynamic Client Registration (RFC 7591)
    console.log('\n3. Testing RFC 7591 Dynamic Client Registration...');
    const dcrRes = await fetch(`${BASE_URL}/api/mcp/oauth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Sierra Smoke Test Client',
        redirect_uris: ['https://claude.ai/api/auth/callback'],
        scope: 'mcp:read mcp:tools',
      }),
    });
    assert(dcrRes.status === 201, 'Dynamic Client Registration', `Status ${dcrRes.status}`);
    const dcrData = await dcrRes.json();
    assert(!!dcrData.client_id, 'Issued Client ID', 'Missing client_id');
    const clientId = dcrData.client_id;

    // 4. PKCE Authorization Flow & Token Issuance
    console.log('\n4. Testing PKCE Authorization Flow & Token Issuance...');
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

    const authUrl = new URL(`${BASE_URL}/api/mcp/oauth/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', 'https://claude.ai/api/auth/callback');
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', 'smoke-test-state');

    const authorizeRes = await fetch(authUrl.toString(), { redirect: 'manual' });
    assert(authorizeRes.status === 302, 'Authorize PKCE Redirect', `Expected 302, got ${authorizeRes.status}`);
    const location = authorizeRes.headers.get('location') || '';
    const redirectParams = new URL(location).searchParams;
    const authCode = redirectParams.get('code');
    assert(!!authCode, 'Authorization Code Granted', 'No code parameter in redirect location');

    // Exchange Code for Access Token
    const tokenRes = await fetch(`${BASE_URL}/api/mcp/oauth/token`, {
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
    assert(tokenRes.status === 200, 'Token Exchange', `Status ${tokenRes.status}`);
    const tokenData = await tokenRes.json();
    assert(!!tokenData.access_token, 'Bearer Token Issued', 'Missing access_token');
    const accessToken = tokenData.access_token;

    // 5. MCP Handshake (initialize)
    console.log('\n5. Executing MCP Initialize Handshake...');
    const initRes = await fetch(`${BASE_URL}/api/mcp`, {
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
          clientInfo: { name: 'sierra-smoke-tester', version: '1.0.0' },
        },
      }),
    });
    assert(initRes.status === 200, 'MCP Initialize Status', `Status ${initRes.status}`);
    const initData = await initRes.json();
    assert(initData.result?.protocolVersion === '2024-11-05', 'Protocol Negotiation', 'Protocol version mismatch');

    // 6. MCP Tool Discovery (tools/list)
    console.log('\n6. Discovering MCP Tools...');
    const toolsRes = await fetch(`${BASE_URL}/api/mcp`, {
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
    assert(toolsRes.status === 200, 'Tool Listing Status', `Status ${toolsRes.status}`);
    const toolsData = await toolsRes.json();
    const tools = toolsData.result?.tools || [];
    assert(tools.length >= 10, 'Tool Count Check', `Expected at least 10 tools, found ${tools.length}`);
    console.log(`   Discovered ${tools.length} active MCP tools: ${tools.map((t: any) => t.name).join(', ')}`);

    // 7. Execute Read-Only Tool (get_pipeline_summary)
    console.log('\n7. Calling Read-Only Tool (get_pipeline_summary)...');
    const callRes = await fetch(`${BASE_URL}/api/mcp`, {
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
    assert(callRes.status === 200, 'Read-Only Tool Call Status', `Status ${callRes.status}`);
    const callData = await callRes.json();
    assert(callData.result?.content?.[0]?.type === 'text', 'Tool Result Content Block', 'Missing text content');

    // 8. Scope Protection Barrier Verification
    console.log('\n8. Verifying Scope Protection Barrier...');
    const spendRes = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`, // only has mcp:read mcp:tools
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
    assert(spendRes.status === 403, 'Elevated Scope Enforcement (403 Forbidden)', `Expected 403, got ${spendRes.status}`);
    const spendData = await spendRes.json();
    assert(spendData.error?.code === -32003, 'JSON-RPC Scope Error Code (-32003)', `Expected -32003, got ${spendData.error?.code}`);

    console.log(`\n======================================================`);
    console.log(`🏁 Smoke Test Summary: ${results.filter((r) => r.passed).length}/${results.length} assertions passed.`);
    console.log(`======================================================\n`);

    if (results.some((r) => !r.passed)) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`\n❌ Fatal Smoke Test Exception:`, error);
    process.exit(1);
  }
}

runSmokeTest();
