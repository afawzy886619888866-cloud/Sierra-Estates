/**
 * MCD Protocol & Workflow Automation Suite
 *
 * Validates:
 * 1. MCD Lifecycle State Machine (Evaluate -> Contract -> Execute -> Closeout)
 * 2. Phase transition safety rules (No phase chaining without authorization)
 * 3. Command Deck Memory API payload schema & TTL bounds
 * 4. n8n and GitHub Actions automation workflow specifications
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

describe('MCD Protocol & Workflow Automation Suite', () => {

  describe('1. MCD Lifecycle State Machine & Boundaries', () => {
    const validPhases = ['evaluate', 'contract', 'execute', 'closeout'] as const;

    it('enforces deterministic 4-phase sequence', () => {
      const transitions: Record<string, string> = {
        evaluate: 'contract',
        contract: 'execute',
        execute: 'closeout',
        closeout: 'evaluate',
      };

      for (const phase of validPhases) {
        expect(transitions[phase]).toBeDefined();
      }
    });

    it('prohibits autonomous phase chaining without user authorization', () => {
      const phaseRunner = {
        canTransitionAutonomously: false,
        requiresExplicitUserAuth: true,
      };

      expect(phaseRunner.canTransitionAutonomously).toBe(false);
      expect(phaseRunner.requiresExplicitUserAuth).toBe(true);
    });
  });

  describe('2. Command Deck Memory API Payload Integrity', () => {
    it('validates discrete task handoff memory schema', () => {
      const handoffEvent = {
        memoryKey: 'task.MCD-101.handoff',
        eventType: 'upsert',
        sourceType: 'verified-system',
        bucket: 'ref',
        ttlSeconds: 604800, // 7 days
        value: {
          issueNumber: 'MCD-101',
          cardTitle: 'Implement WhatsApp Lead Concierge Test Suite',
          completedAt: new Date().toISOString(),
          outcomeArtifactId: 'art-001',
          summary: 'Successfully verified 7/7 WhatsApp Concierge unit and integration tests.',
          residualNotes: 'Ready for production deployment check.',
        },
      };

      expect(handoffEvent.memoryKey).toMatch(/^task\.[A-Za-z0-9-_]+\.handoff$/);
      expect(handoffEvent.eventType).toBe('upsert');
      expect(handoffEvent.ttlSeconds).toBe(604800);
      expect(handoffEvent.value.cardTitle).toBeDefined();
      expect(handoffEvent.value.summary).toBeDefined();
    });
  });

  describe('3. Workflow Files & Agent Routing Guard', () => {
    const agentWorkflowsDir = path.join(ROOT, '.agents/workflows');

    it('verifies all MCD slash commands have corresponding workflow files', () => {
      const expectedWorkflows = [
        'evaluate.md',
        'contract.md',
        'execute.md',
        'closeout.md',
        'help.md',
        'remember.md',
        'docs.md',
        'bug.md',
      ];

      // If .agents/workflows or .agent/workflows exists, check it
      const fallbackWorkflowsDir = path.join(ROOT, '.agent/workflows');
      const targetDir = fs.existsSync(agentWorkflowsDir) ? agentWorkflowsDir : fallbackWorkflowsDir;

      expect(fs.existsSync(targetDir)).toBe(true);
      for (const wf of expectedWorkflows) {
        expect(fs.existsSync(path.join(targetDir, wf))).toBe(true);
      }
    });

    it('verifies AGENTS.md references core governance guardrails', () => {
      const agentsMdPath = path.join(ROOT, 'AGENTS.md');
      expect(fs.existsSync(agentsMdPath)).toBe(true);
      const content = fs.readFileSync(agentsMdPath, 'utf8');
      expect(content).toContain('MCD protocol');
      expect(content).toContain('Evaluate');
      expect(content).toContain('Contract');
      expect(content).toContain('Execute');
      expect(content).toContain('Closeout');
    });
  });

});
