import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRegistry, registry } from '../registry';
import { AgentOrchestrator } from '../orchestrator';
import { AgentWorkflows } from '../workflows';
import * as path from 'path';

describe('packages/agents-core', () => {
  describe('AgentRegistry', () => {
    it('should initialize and load default agent profiles from markdown files', () => {
      const agents = registry.listAgents();
      expect(agents.length).toBeGreaterThan(0);

      const agentNames = agents.map((a) => a.name);
      expect(agentNames).toContain('backend-specialist');
      expect(agentNames).toContain('frontend-specialist');
      expect(agentNames).toContain('orchestrator');
      expect(agentNames).toContain('security-auditor');
    });

    it('should retrieve a known agent profile by name', () => {
      const agent = registry.getAgent('backend-specialist');
      expect(agent).not.toBeNull();
      expect(agent?.name).toBe('backend-specialist');
      expect(agent?.systemPrompt).toBeDefined();
      expect(agent?.systemPrompt.length).toBeGreaterThan(0);
    });

    it('should return null for non-existent agent name', () => {
      const agent = registry.getAgent('unknown-agent-xyz-123');
      expect(agent).toBeNull();
    });

    it('should correctly parse markdown profile frontmatter and system prompt', () => {
      const customRegistry = new AgentRegistry(path.resolve(__dirname, '..'));
      const devops = customRegistry.getAgent('devops-engineer');
      if (devops) {
        expect(devops.name).toBe('devops-engineer');
        expect(devops.domain).toBeDefined();
      }
    });
  });

  describe('AgentOrchestrator', () => {
    let mockCompletion: ReturnType<typeof vi.fn>;
    let orchestrator: AgentOrchestrator;

    beforeEach(() => {
      mockCompletion = vi.fn(async (agentName: string, stage: string) => {
        return `[MockOutput by ${agentName}]: Completed stage ${stage}`;
      });

      orchestrator = new AgentOrchestrator({
        runCompletion: mockCompletion as any,
      });
    });

    it('should fail gracefully if agent does not exist', async () => {
      const result = await orchestrator.runAgentTask(
        'non-existent-agent-999',
        'Do some arbitrary work'
      );
      expect(result.status).toBe('failed');
      expect(result.error).toContain('not found in registry');
      expect(mockCompletion).not.toHaveBeenCalled();
    });

    it('should successfully execute a task for a registered agent using custom completion', async () => {
      const result = await orchestrator.runAgentTask(
        'backend-specialist',
        'Create a REST API for listings'
      );

      expect(result.status).toBe('success');
      expect(result.agentName).toBe('backend-specialist');
      expect(result.output).toContain('[MockOutput by backend-specialist]');
      expect(mockCompletion).toHaveBeenCalledTimes(1);
    });

    it('should orchestrate a multi-step pipeline sequentially', async () => {
      const steps = [
        { agentName: 'project-planner', taskDescription: 'Plan architecture' },
        { agentName: 'backend-specialist', taskDescription: 'Implement models' },
        { agentName: 'security-auditor', taskDescription: 'Perform security review' },
      ];

      const results = await orchestrator.orchestratePipeline('Test Monorepo Pipeline', steps);

      expect(results).toHaveLength(3);
      expect(results[0].agentName).toBe('project-planner');
      expect(results[0].status).toBe('success');
      expect(results[1].agentName).toBe('backend-specialist');
      expect(results[1].status).toBe('success');
      expect(results[2].agentName).toBe('security-auditor');
      expect(results[2].status).toBe('success');
      expect(mockCompletion).toHaveBeenCalledTimes(3);
    });

    it('should continue pipeline when a step fails', async () => {
      const steps = [
        { agentName: 'non-existent-agent', taskDescription: 'Fail step' },
        { agentName: 'backend-specialist', taskDescription: 'Valid step' },
      ];

      const results = await orchestrator.orchestratePipeline('Failing Pipeline', steps);
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('failed');
      expect(results[1].status).toBe('success');
    });
  });

  describe('AgentWorkflows', () => {
    let mockCompletion: ReturnType<typeof vi.fn>;
    let orchestrator: AgentOrchestrator;
    let workflows: AgentWorkflows;

    beforeEach(() => {
      mockCompletion = vi.fn(async (agentName: string) => `Response from ${agentName}`);
      orchestrator = new AgentOrchestrator({ runCompletion: mockCompletion as any });
      workflows = new AgentWorkflows(orchestrator);
    });

    it('runApiWorkflow executes the 4 API pipeline stages', async () => {
      const results = await workflows.runApiWorkflow('Listing CRUD endpoints');
      expect(results).toHaveLength(4);
      const agents = results.map((r) => r.agentName);
      expect(agents).toEqual([
        'database-architect',
        'backend-specialist',
        'security-auditor',
        'documentation-writer',
      ]);
    });

    it('runDebugWorkflow executes the 3 debugging stages', async () => {
      const results = await workflows.runDebugWorkflow('Fix CORS issue in API');
      expect(results).toHaveLength(3);
      const agents = results.map((r) => r.agentName);
      expect(agents).toEqual([
        'code-archaeologist',
        'debugger',
        'test-engineer',
      ]);
    });

    it('runPlanWorkflow executes planning and orchestrator review', async () => {
      const results = await workflows.runPlanWorkflow('New CRM Feature');
      expect(results).toHaveLength(2);
      expect(results[0].agentName).toBe('project-planner');
      expect(results[1].agentName).toBe('orchestrator');
    });

    it('runSecurityWorkflow executes penetration-tester and security-auditor', async () => {
      const results = await workflows.runSecurityWorkflow('Audit auth tokens');
      expect(results).toHaveLength(2);
      expect(results[0].agentName).toBe('penetration-tester');
      expect(results[1].agentName).toBe('security-auditor');
    });

    it('runAuditWorkflow executes quality-inspector and qa-automation-engineer', async () => {
      const results = await workflows.runAuditWorkflow('Check code style');
      expect(results).toHaveLength(2);
      expect(results[0].agentName).toBe('quality-inspector');
      expect(results[1].agentName).toBe('qa-automation-engineer');
    });

    it('runUiUxWorkflow executes product-manager, frontend-specialist and performance-optimizer', async () => {
      const results = await workflows.runUiUxWorkflow('Redesign Property card');
      expect(results).toHaveLength(3);
      expect(results[0].agentName).toBe('product-manager');
      expect(results[1].agentName).toBe('frontend-specialist');
      expect(results[2].agentName).toBe('performance-optimizer');
    });
  });
});
