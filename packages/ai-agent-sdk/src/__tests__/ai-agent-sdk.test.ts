import { describe, it, expect } from 'vitest';
import { AgentExecutionRequestSchema } from '../types.js';
import { InsightsAgent } from '../insights-agent.js';


describe('AI Agent SDK', () => {
  it('validates AgentExecutionRequest schema correctly', () => {
    const valid = {
      agentId: 'test-agent',
      prompt: 'Summarize market trends',
      memoryTags: ['market', 'cairo'],
    };

    const parsed = AgentExecutionRequestSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.timeoutMs).toBe(30000);
    }
  });

  it('runs InsightsAgent execution and produces structured market insight', async () => {
    const agent = new InsightsAgent();
    const result = await agent.run({
      agentId: 'agent-insights-lead',
      prompt: 'Analyze Mivida market',
      context: { compound: 'Mivida', inventoryCount: 150 },
      memoryTags: ['resale', 'compound-analysis'],
    });

    expect(result.success).toBe(true);
    expect(result.data.headline).toContain('Mivida');
    expect(result.data.sentiment).toBe('bullish');
    expect(result.data.confidence).toBeGreaterThan(0.9);
  });
});
