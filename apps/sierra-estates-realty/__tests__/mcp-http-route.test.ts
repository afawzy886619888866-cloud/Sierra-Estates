import { OAuthStore } from '../lib/mcp/oauth-store';
import { GET, POST, DELETE } from '../app/api/mcp/route';

describe('Streamable-HTTP MCP Transport Route (/api/mcp)', () => {
  let validToken: string;

  beforeAll(() => {
    // Issue a valid bearer token for tests
    const token = OAuthStore.issueToken('claude-test-connector', 'mcp:read mcp:tools');
    validToken = token.access_token;
  });

  describe('1. Authentication Gate', () => {
    it('rejects unauthenticated request with 401 and WWW-Authenticate header', async () => {
      const req = new Request('https://sierra-estates.net/api/mcp', {
        method: 'GET',
      });

      const res = await GET(req);
      expect(res.status).toBe(401);
      const wwwAuth = res.headers.get('www-authenticate');
      expect(wwwAuth).toBeDefined();
      expect(wwwAuth).toContain('resource_metadata=');
      expect(wwwAuth).toContain('.well-known/oauth-protected-resource');

      const data = await res.json();
      expect(data.error.code).toBe(-32001);
    });

    it('rejects request with invalid token with 401', async () => {
      const req = new Request('https://sierra-estates.net/api/mcp', {
        method: 'GET',
        headers: { Authorization: 'Bearer invalid_token_12345' },
      });

      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });

  describe('2. GET Transport & SSE Stream', () => {
    it('returns server capabilities and protocol version for standard GET', async () => {
      const req = new Request('https://sierra-estates.net/api/mcp', {
        method: 'GET',
        headers: { Authorization: `Bearer ${validToken}` },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.result.protocolVersion).toBe('2024-11-05');
      expect(data.result.serverInfo.name).toBe('sierra-estates-mcp');
    });

    it('initiates SSE text/event-stream when requested', async () => {
      const req = new Request('https://sierra-estates.net/api/mcp?transport=sse', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validToken}`,
          Accept: 'text/event-stream',
        },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');
    });
  });

  describe('3. POST JSON-RPC 2.0 Dispatch', () => {
    it('handles initialize handshake', async () => {
      const req = new Request('https://sierra-estates.net/api/mcp', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'claude-desktop', version: '1.0.0' },
          },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(1);
      expect(data.result.protocolVersion).toBe('2024-11-05');
      expect(data.result.capabilities.tools).toBeDefined();
    });

    it('acknowledges notifications/initialized notification with 204', async () => {
      const req = new Request('https://sierra-estates.net/api/mcp', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(204);
    });

    it('lists registered tools with schemas via tools/list', async () => {
      const req = new Request('https://sierra-estates.net/api/mcp', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(2);
      expect(Array.isArray(data.result.tools)).toBe(true);
      expect(data.result.tools.length).toBeGreaterThan(0);

      // Verify each tool has standard MCP schema attributes
      const firstTool = data.result.tools[0];
      expect(firstTool.name).toBeDefined();
      expect(firstTool.description).toBeDefined();
      expect(firstTool.inputSchema).toBeDefined();
    });

    it('executes tool call via tools/call and returns JSON-RPC content', async () => {
      const req = new Request('https://sierra-estates.net/api/mcp', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'send_whatsapp_message',
            arguments: {
              recipientPhone: '+201092048333',
              messageText: 'Hello from Sierra Estates Remote MCP',
            },
          },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(3);
      expect(data.result.content).toBeDefined();
      expect(Array.isArray(data.result.content)).toBe(true);
      expect(data.result.content[0].type).toBe('text');
    });

    it('returns standard JSON-RPC error -32601 for unknown methods', async () => {
      const req = new Request('https://sierra-estates.net/api/mcp', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 4,
          method: 'unknown/nonexistent_method',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(4);
      expect(data.error.code).toBe(-32601);
      expect(data.error.message).toContain('Method');
    });
  });

  describe('4. DELETE Session Cleanup', () => {
    it('returns 204 on authorized DELETE request', async () => {
      const req = new Request('https://sierra-estates.net/api/mcp', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${validToken}` },
      });

      const res = await DELETE(req);
      expect(res.status).toBe(204);
    });
  });
});
