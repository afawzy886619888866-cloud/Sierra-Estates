import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentOrchestrator } from '../packages/agents-core/src/orchestrator';
import { AgentWorkflows } from '../packages/agents-core/src/workflows';

describe('Multi-Agent Workflows & Orchestration Pipelines Test Suite', () => {
  let mockCompletion: ReturnType<typeof vi.fn>;
  let orchestrator: AgentOrchestrator;
  let workflows: AgentWorkflows;

  beforeEach(() => {
    mockCompletion = vi.fn(async (agentName: string) => `Mock result from ${agentName}`);
    orchestrator = new AgentOrchestrator({ runCompletion: mockCompletion as any });
    workflows = new AgentWorkflows(orchestrator);
  });

  describe('Sequential Stage Pipeline Execution', () => {
    it('should execute 4-stage API Workflow (Database -> Backend -> Security -> Docs)', async () => {
      const results = await workflows.runApiWorkflow('Implement Secure Leads Ingestion API');
      expect(results).toHaveLength(4);
      expect(results[0].agentName).toBe('database-architect');
      expect(results[0].status).toBe('success');
      expect(results[1].agentName).toBe('backend-specialist');
      expect(results[2].agentName).toBe('security-auditor');
      expect(results[3].agentName).toBe('documentation-writer');
    });

    it('should execute 3-stage Debug Workflow (Archaeologist -> Debugger -> Tester)', async () => {
      const results = await workflows.runDebugWorkflow('Fix Vercel 429 Deployment Collision');
      expect(results).toHaveLength(3);
      expect(results[0].agentName).toBe('code-archaeologist');
      expect(results[1].agentName).toBe('debugger');
      expect(results[2].agentName).toBe('test-engineer');
    });

    it('should execute Security Workflow (Penetration Tester -> Security Auditor)', async () => {
      const results = await workflows.runSecurityWorkflow('Audit SBR Secret Key and CRON Auth Guard');
      expect(results).toHaveLength(2);
      expect(results[0].agentName).toBe('penetration-tester');
      expect(results[1].agentName).toBe('security-auditor');
    });

    it('should execute UI/UX Enhancement Workflow (Product Manager -> Frontend -> Performance)', async () => {
      const results = await workflows.runUiUxWorkflow('Redesign Luxury Compound Hero Section');
      expect(results).toHaveLength(3);
      expect(results[0].agentName).toBe('product-manager');
      expect(results[1].agentName).toBe('frontend-specialist');
      expect(results[2].agentName).toBe('performance-optimizer');
    });
  });

  describe('Workflow Error Recovery & Step Continuations', () => {
    it('should gracefully continue pipeline when an optional agent step fails', async () => {
      const steps = [
        { agentName: 'non-existent-agent-xyz', taskDescription: 'Attempt missing agent' },
        { agentName: 'backend-specialist', taskDescription: 'Execute core fallback logic' },
      ];

      const results = await orchestrator.orchestratePipeline('Fault Tolerant Pipeline', steps);
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('failed');
      expect(results[1].status).toBe('success');
    });
  });
});
