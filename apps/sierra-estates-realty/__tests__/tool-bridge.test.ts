import {
  TOOL_DEFINITIONS,
  getToolJsonSchema,
  validateAndAuthorizeTool,
} from '../lib/mcp/tool-bridge';
import { OAuthStore } from '../lib/mcp/oauth-store';
import { POST } from '../app/api/mcp/route';

describe('MCP Tool Bridge & Schema Authorization Suite (M10.3)', () => {
  let readOnlyToken: string;
  let elevatedWriteToken: string;
  let elevatedSpendToken: string;

  beforeAll(() => {
    readOnlyToken = OAuthStore.issueToken('client-ro', 'mcp:read').access_token;
    elevatedWriteToken = OAuthStore.issueToken('client-write', 'mcp:read mcp:tools mcp:write').access_token;
    elevatedSpendToken = OAuthStore.issueToken('client-spend', 'mcp:read mcp:tools mcp:spend').access_token;
  });

  describe('1. Valid JSON Schema Advertising', () => {
    it('advertises valid JSON Schemas for all bridged tools', () => {
      expect(TOOL_DEFINITIONS.size).toBeGreaterThanOrEqual(10);

      TOOL_DEFINITIONS.forEach((tool, toolName) => {
        const schema = getToolJsonSchema(toolName) as Record<string, unknown>;
        expect(schema).toBeDefined();
        expect(schema.type).toBe('object');
        expect(schema.properties).toBeDefined();
      });
    });
  });

  describe('2. Input Rejection on Schema Violations', () => {
    it('rejects invalid inputs before reaching handler', () => {
      // Missing required template and short phone
      const check = validateAndAuthorizeTool(
        'send_message',
        { leadPhone: '123' },
        'mcp:write',
      );

      expect(check.valid).toBe(false);
      expect(check.error).toContain('template');
      expect(check.error).toContain('at least 6 digits');
    });

    it('rejects non-positive payment amounts', () => {
      const check = validateAndAuthorizeTool(
        'create_payment_intent',
        { amount: -500, currency: 'EGP', leadId: 'lead_123' },
        'mcp:spend',
      );

      expect(check.valid).toBe(false);
      expect(check.error).toContain('positive');
    });

    it('rejects invalid currency code length', () => {
      const check = validateAndAuthorizeTool(
        'create_payment_intent',
        { amount: 15000, currency: 'EGPP', leadId: 'lead_123' },
        'mcp:spend',
      );

      expect(check.valid).toBe(false);
      expect(check.error).toContain('currency');
    });
  });

  describe('3. Scope Enforcement (Refuses Write/Spend for Read-Only Tokens)', () => {
    it('refuses Stripe charge for read-only token via HTTP route', async () => {
      const req = new Request('https://sierra-estates.net/api/mcp', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${readOnlyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 101,
          method: 'tools/call',
          params: {
            name: 'create_payment_intent',
            arguments: { amount: 50000, currency: 'EGP', leadId: 'lead_test' },
          },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe(-32003);
      expect(data.error.message).toContain('mcp:spend');
    });

    it('refuses WhatsApp send for read-only token via HTTP route', async () => {
      const req = new Request('https://sierra-estates.net/api/mcp', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${readOnlyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 102,
          method: 'tools/call',
          params: {
            name: 'send_message',
            arguments: { leadPhone: '+201092048333', template: 'welcome' },
          },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe(-32003);
      expect(data.error.message).toContain('mcp:write');
    });

    it('refuses DocuSign envelope initiation for read-only token', async () => {
      const req = new Request('https://sierra-estates.net/api/mcp', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${readOnlyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 103,
          method: 'tools/call',
          params: {
            name: 'initiate_envelope',
            arguments: {
              documentUrl: 'https://sierra-estates.net/contracts/1.pdf',
              recipients: [{ name: 'Buyer', email: 'buyer@example.com' }],
              callbackUrl: 'https://sierra-estates.net/api/callback',
            },
          },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe(-32003);
      expect(data.error.message).toContain('mcp:write');
    });

    it('permits read-only queries with read-only token', async () => {
      const req = new Request('https://sierra-estates.net/api/mcp', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${readOnlyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 104,
          method: 'tools/call',
          params: {
            name: 'get_pipeline_summary',
            arguments: { pipelineId: 'deal_123' },
          },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.result.content).toBeDefined();
    });

    it('permits Stripe charge with elevated spend token', async () => {
      const req = new Request('https://sierra-estates.net/api/mcp', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${elevatedSpendToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 105,
          method: 'tools/call',
          params: {
            name: 'create_payment_intent',
            arguments: { amount: 150000, currency: 'EGP', leadId: 'lead_vip_001' },
          },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.result.isError).toBe(false);
      expect(data.result.content[0].text).toContain('intentId');
    });

    it('permits WhatsApp send with elevated write token', async () => {
      const req = new Request('https://sierra-estates.net/api/mcp', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${elevatedWriteToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 106,
          method: 'tools/call',
          params: {
            name: 'send_message',
            arguments: { leadPhone: '+201092048333', template: 'deal_closing_ar' },
          },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.result.isError).toBe(false);
      expect(data.result.content[0].text).toContain('messageId');
    });
  });
});
