import { AgentOrchestrator, TaskResult } from './orchestrator';

export class AgentWorkflows {
  private orchestrator: AgentOrchestrator;

  constructor(orchestrator: AgentOrchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * API Design & Implementation Workflow
   */
  async runApiWorkflow(taskDescription: string): Promise<TaskResult[]> {
    return this.orchestrator.orchestratePipeline(
      'API Workflow',
      [
        {
          agentName: 'database-architect',
          taskDescription: `Analyze requirements and design schema/models for: ${taskDescription}`,
        },
        {
          agentName: 'backend-specialist',
          taskDescription: `Implement endpoints and business logic based on the schema design for: ${taskDescription}`,
        },
        {
          agentName: 'security-auditor',
          taskDescription: `Audit the implemented endpoints for SQL injection, auth issues, and vulnerability checks.`,
        },
        {
          agentName: 'documentation-writer',
          taskDescription: `Generate API reference docs and update status.`,
        },
      ],
      taskDescription
    );
  }

  /**
   * Debugging and Bugfixing Workflow
   */
  async runDebugWorkflow(taskDescription: string): Promise<TaskResult[]> {
    return this.orchestrator.orchestratePipeline(
      'Debug Workflow',
      [
        {
          agentName: 'code-archaeologist',
          taskDescription: `Trace logs, search codebase, and isolate root cause for: ${taskDescription}`,
        },
        {
          agentName: 'debugger',
          taskDescription: `Develop fix, address syntax/logic issues, and refactor code.`,
        },
        {
          agentName: 'test-engineer',
          taskDescription: `Verify changes by running/generating test cases.`,
        },
      ],
      taskDescription
    );
  }

  /**
   * Plan & Architecture Workflow
   */
  async runPlanWorkflow(taskDescription: string): Promise<TaskResult[]> {
    return this.orchestrator.orchestratePipeline(
      'Plan Workflow',
      [
        {
          agentName: 'project-planner',
          taskDescription: `Decompose task into atomic list of subtasks, estimate constraints: ${taskDescription}`,
        },
        {
          agentName: 'orchestrator',
          agentName_fallback: 'orchestrator', // coordinate
          taskDescription: `Review project architecture, dependencies, and verify alignment.`,
        } as any,
      ],
      taskDescription
    );
  }

  /**
   * Security Audit Workflow
   */
  async runSecurityWorkflow(taskDescription: string): Promise<TaskResult[]> {
    return this.orchestrator.orchestratePipeline(
      'Security Workflow',
      [
        {
          agentName: 'penetration-tester',
          taskDescription: `Identify attack vectors and check dependencies for CVEs: ${taskDescription}`,
        },
        {
          agentName: 'security-auditor',
          taskDescription: `Review code changes against OWASP standards.`,
        },
      ],
      taskDescription
    );
  }

  /**
   * Quality Audit & Compliance Check
   */
  async runAuditWorkflow(taskDescription: string): Promise<TaskResult[]> {
    return this.orchestrator.orchestratePipeline(
      'Audit Workflow',
      [
        {
          agentName: 'quality-inspector',
          taskDescription: `Verify compliance of code changes, lint issues, and guidelines: ${taskDescription}`,
        },
        {
          agentName: 'qa-automation-engineer',
          taskDescription: `Run full test suite (lint, unit, build checks).`,
        },
      ],
      taskDescription
    );
  }

  /**
   * UI/UX Enhancement Workflow
   */
  async runUiUxWorkflow(taskDescription: string): Promise<TaskResult[]> {
    return this.orchestrator.orchestratePipeline(
      'UI/UX Enhancement Workflow',
      [
        {
          agentName: 'product-manager',
          taskDescription: `Analyze user flow and define interactions/visual specs for: ${taskDescription}`,
        },
        {
          agentName: 'frontend-specialist',
          taskDescription: `Implement responsive design, animations, and typography enhancements.`,
        },
        {
          agentName: 'performance-optimizer',
          taskDescription: `Optimize bundles, images, and rendering performance.`,
        },
      ],
      taskDescription
    );
  }
}
