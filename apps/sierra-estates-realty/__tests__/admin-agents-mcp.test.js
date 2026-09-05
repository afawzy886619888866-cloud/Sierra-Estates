import { GET } from '../app/api/admin/agents/route';
import { PATCH, DELETE } from '../app/api/admin/agents/[id]/route';

// Mock auth-guard to permit admin in tests
jest.mock('../lib/server/auth-guard', () => ({
  verifyAdminRequest: jest.fn().mockResolvedValue({ authenticated: true, user: { role: 'admin' } }),
}));

// Mock @sierra-estates/db
jest.mock('@sierra-estates/db', () => ({
  listRecords: jest.fn().mockResolvedValue([
    { id: 'custom-agent-1', name: 'Custom Agent 1', description: 'Test', emoji: '🤖', color: '#6366f1', status: 'Idle', load: 0, tasks: 0 },
  ]),
  getRecord: jest.fn().mockResolvedValue({ status: 'active', lastPulse: '2026-09-04T00:00:00Z' }),
  insertRecord: jest.fn().mockResolvedValue({ id: 'new-agent' }),
  updateRecord: jest.fn().mockResolvedValue({}),
  deleteRecord: jest.fn().mockResolvedValue({}),
}));

describe('Admin Agents MCP Wiring Suite', () => {
  it('wires remote-mcp-gateway into the admin agents registry', async () => {
    const req = new Request('https://sierra-estates.net/api/admin/agents');
    const res = await GET(req );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const mcpAgent = data.agents.find((a) => a.id === 'remote-mcp-gateway');
    expect(mcpAgent).toBeDefined();
    expect(mcpAgent.name).toBe('Claude & Remote MCP Gateway');
    expect(mcpAgent.status).toBe('Online');
    expect(mcpAgent.tasks).toBeGreaterThanOrEqual(10);
  });

  it('protects remote-mcp-gateway from admin modification', async () => {
    const req = new Request('https://sierra-estates.net/api/admin/agents/remote-mcp-gateway', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Tampered Gateway' }),
    });
    const res = await PATCH(req , { params: Promise.resolve({ id: 'remote-mcp-gateway' }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Cannot modify managed system agent');
  });

  it('protects remote-mcp-gateway from admin deletion', async () => {
    const req = new Request('https://sierra-estates.net/api/admin/agents/remote-mcp-gateway', {
      method: 'DELETE',
    });
    const res = await DELETE(req , { params: Promise.resolve({ id: 'remote-mcp-gateway' }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Cannot delete managed system agent');
  });
});
