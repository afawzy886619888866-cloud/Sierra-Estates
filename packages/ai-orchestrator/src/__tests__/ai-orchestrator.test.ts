import { describe, it, expect } from 'vitest';
import { WorkflowRunner } from '../workflow-runner.js';
import { WorkflowInstance } from '../types.js';
import { AgentCoordinator } from '../coordinator.js';


describe('AI Orchestrator', () => {
  it('registers and retrieves available agents via coordinator', () => {
    const coordinator = new AgentCoordinator();
    const agents = coordinator.listAgents();
    expect(agents.length).toBeGreaterThan(0);

    const openclaw = coordinator.getAgent('openclaw');
    expect(openclaw).toBeDefined();
    expect(openclaw?.name).toContain('OpenClaw');
  });

  it('registers deepseek_reasoner in coordinator fleet', () => {
    const coordinator = new AgentCoordinator();
    const deepseek = coordinator.getAgent('deepseek_reasoner');
    expect(deepseek).toBeDefined();
    expect(deepseek?.name).toContain('DeepSeek Reasoning');
    expect(deepseek?.capabilities).toContain('chain_of_thought_reasoning');
    expect(deepseek?.capabilities).toContain('ecc_memory_integration');
  });

  it('executes a multi-agent workflow sequentially', async () => {
    const runner = new WorkflowRunner();
    const workflow: WorkflowInstance = {
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

  it('executes orchestrateDeepSeekReasoningCycle with multi-step reasoning and evaluation', async () => {
    const { AIOrchestrator } = await import('../orchestrator.js');
    const orchestrator = new AIOrchestrator();

    const result = await orchestrator.orchestrateDeepSeekReasoningCycle(
      'Verify unit pricing against historical price reductions and benchmark criteria',
      { propertyCode: 'SE-TEST-001', expectedThreshold: 8.0 }
    );

    expect(result.status).toBe('completed');
    expect(result.metrics.stepsTotal).toBe(3);
    expect(result.metrics.stepsCompleted).toBe(3);
    expect(result.results['step-1-deepseek-reason']).toBeDefined();
    expect(result.results['step-1-deepseek-reason'].data.confidence).toBeGreaterThan(0.9);
    expect(result.results['step-3-invariant-evaluation'].data.overallScore).toBe(1);
    expect(result.results['step-3-invariant-evaluation'].data.passedCount).toBe(10);
  });
});
