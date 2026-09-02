 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { describe, it, expect } from 'vitest';
import { WorkflowRunner } from '../workflow-runner.js';

import { AgentCoordinator } from '../coordinator.js';


describe('AI Orchestrator', () => {
  it('registers and retrieves available agents via coordinator', () => {
    const coordinator = new AgentCoordinator();
    const agents = coordinator.listAgents();
    expect(agents.length).toBeGreaterThan(0);

    const openclaw = coordinator.getAgent('openclaw');
    expect(openclaw).toBeDefined();
    expect(_optionalChain([openclaw, 'optionalAccess', _ => _.name])).toContain('OpenClaw');
  });

  it('executes a multi-agent workflow sequentially', async () => {
    const runner = new WorkflowRunner();
    const workflow = {
      id: 'wf-test-1',
      name: 'Lead Qualification & Scribe Workflow',
      triggerEvent: 'whatsapp.message.received',
      status: 'pending',
      context: { leadPhone: '+201000000000', leadName: 'Test Buyer' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: [
        {
          id: 'step-1',
          name: 'Parse Inbound Inquiry',
          assignedAgent: 'scribe',
          inputs: {},
          status: 'pending',
          retryCount: 0,
        },
        {
          id: 'step-2',
          name: 'Score Lead Intent',
          assignedAgent: 'concierge',
          inputs: {},
          status: 'pending',
          retryCount: 0,
        },
      ],
    };

    const result = await runner.executeWorkflow(workflow);
    expect(result.status).toBe('completed');
    expect(result.metrics.stepsCompleted).toBe(2);
    expect(result.metrics.stepsTotal).toBe(2);
    expect(result.results['step-1']).toBeDefined();
    expect(result.results['step-2']).toBeDefined();
  });
});
