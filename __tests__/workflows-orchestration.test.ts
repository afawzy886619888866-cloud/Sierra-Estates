import { describe, it, expect } from 'vitest';
import { AgentOrchestrator } from '../packages/agents-core/src/orchestrator';
import { AgentWorkflows } from '../packages/agents-core/src/workflows';

describe('Multi-Agent Workflows & Orchestration Pipelines Test Suite', () => {
  describe('Sequential Stage Pipeline Execution', () => {
    it('should execute 4-stage API Workflow (Database -> Backend -> Security -> Docs)', async () => {
      const orchestrator = new AgentOrchestrator();
      const workflows = new AgentWorkflows(orchestrator);

      const result = await workflows.runApiWorkflow('Implement Secure Leads Ingestion API');
      expect(result.success).toBe(true);
      expect(result.results.length).toBe(4);
      expect(result.results[0].agentId).toBe('database-architect');
      expect(result.results[1].agentId).toBe('backend-specialist');
      expect(result.results[2].agentId).toBe('security-auditor');
      expect(result.results[3].agentId).toBe('documentation-writer');
    });

    it('should execute 3-stage Debug Workflow (Archaeologist -> Debugger -> Tester)', async () => {
      const orchestrator = new AgentOrchestrator();
      const workflows = new AgentWorkflows(orchestrator);

      const result = await workflows.runDebugWorkflow('Fix Vercel 429 Deployment Collision');
      expect(result.success).toBe(true);
      expect(result.results.length).toBe(3);
      expect(result.results[0].agentId).toBe('code-archaeologist');
      expect(result.results[1].agentId).toBe('debugger');
      expect(result.results[2].agentId).toBe('test-engineer');
    });

    it('should execute Security Workflow (Penetration Tester -> Security Auditor)', async () => {
      const orchestrator = new AgentOrchestrator();
      const workflows = new AgentWorkflows(orchestrator);

      const result = await workflows.runSecurityWorkflow('Audit SBR Secret Key and CRON Auth Guard');
      expect(result.success).toBe(true);
      expect(result.results.length).toBe(2);
      expect(result.results[0].agentId).toBe('penetration-tester');
      expect(result.results[1].agentId).toBe('security-auditor');
    });

    it('should execute UI/UX Enhancement Workflow (Product Manager -> Frontend -> Performance)', async () => {
      const orchestrator = new AgentOrchestrator();
      const workflows = new AgentWorkflows(orchestrator);

      const result = await workflows.runUiUxWorkflow('Redesign Luxury Compound Hero Section');
      expect(result.success).toBe(true);
      expect(result.results.length).toBe(3);
      expect(result.results[0].agentId).toBe('product-manager');
      expect(result.results[1].agentId).toBe('frontend-specialist');
      expect(result.results[2].agentId).toBe('performance-optimizer');
    });
  });

  describe('Workflow Error Recovery & Step Continuations', () => {
    it('should gracefully continue pipeline when an optional agent step fails', async () => {
      const orchestrator = new AgentOrchestrator();
      const pipeline = {
        name: 'Fault Tolerant Pipeline',
        description: 'Tests resilience against missing agent step',
        steps: [
          { agentId: 'non-existent-agent', taskDescription: 'Attempt missing agent' },
          { agentId: 'backend-specialist', taskDescription: 'Execute core fallback logic' },
        ],
      };

      const result = await orchestrator.executePipeline(pipeline);
      expect(result.results.length).toBe(2);
      expect(result.results[0].success).toBe(false);
      expect(result.results[1].success).toBe(true);
    });
  });
});
