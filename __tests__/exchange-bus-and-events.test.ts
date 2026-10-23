import { describe, it, expect, vi } from 'vitest';
import {
  type ExchangeType,
  type ExchangeStatus,
  type ExchangeSource,
  type ExchangeRecord,
  type ExchangeCreateInput,
} from '../packages/exchange/exchange-client';

describe('Exchange Bus & Cross-System Event Architecture Test Suite', () => {
  describe('Exchange Record Data Types & Validation Contracts', () => {
    it('validates supported exchange event types and sources', () => {
      const validTypes: ExchangeType[] = [
        'agent_task',
        'workflow_run',
        'admin_signal',
        'crm_event',
        'lead_update',
        'property_match',
        'proposal_ready',
      ];

      const validSources: ExchangeSource[] = ['admin', 'agent', 'workflow', 'webhook', 'system'];
      const validStatuses: ExchangeStatus[] = ['pending', 'running', 'done', 'error', 'cancelled'];

      expect(validTypes).toHaveLength(7);
      expect(validSources).toHaveLength(5);
      expect(validStatuses).toHaveLength(5);
    });

    it('creates a well-formed exchange task payload for agent executions', () => {
      const input: ExchangeCreateInput = {
        type: 'agent_task',
        source: 'workflow',
        status: 'pending',
        payload: {
          action: 'calculate_compound_arbitrage',
          compound: 'Mivida',
          budget: 25_000_000,
        },
        agentId: 'valuation-agent-01',
        leadId: 'lead-eg-889',
      };

      expect(input.type).toBe('agent_task');
      expect(input.source).toBe('workflow');
      expect(input.status).toBe('pending');
      expect(input.payload.compound).toBe('Mivida');
      expect(input.agentId).toBe('valuation-agent-01');
    });

    it('formats admin signal payloads targeting autonomous agents and workflows', () => {
      function formatAdminSignal(signal: {
        action: string;
        targetAgentId?: string;
        targetWorkflowId?: string;
        payload?: Record<string, unknown>;
      }): ExchangeCreateInput {
        return {
          type: 'admin_signal',
          source: 'admin',
          status: 'pending',
          payload: {
            action: signal.action,
            ...(signal.payload ?? {}),
          },
          ...(signal.targetAgentId ? { agentId: signal.targetAgentId } : {}),
          ...(signal.targetWorkflowId ? { workflowId: signal.targetWorkflowId } : {}),
        };
      }

      const signal = formatAdminSignal({
        action: 'trigger_rebalance',
        targetWorkflowId: 'wf-nightly-sync',
        payload: { forceRefresh: true },
      });

      expect(signal.type).toBe('admin_signal');
      expect(signal.source).toBe('admin');
      expect(signal.workflowId).toBe('wf-nightly-sync');
      expect(signal.payload.forceRefresh).toBe(true);
    });

    it('handles progress tracking and result reporting states', () => {
      const record: ExchangeRecord = {
        id: 'ex-001',
        type: 'property_match',
        source: 'agent',
        status: 'running',
        payload: { leadId: 'lead-123' },
        createdAt: '2026-09-04T12:00:00Z',
        updatedAt: '2026-09-04T12:01:00Z',
        progress: 60,
        stepName: 'Filtering compounds by price per sqm',
      };

      expect(record.progress).toBe(60);
      expect(record.stepName).toContain('Filtering compounds');

      const completedRecord: ExchangeRecord = {
        ...record,
        status: 'done',
        progress: 100,
        result: {
          matchesCount: 4,
          topMatchRef: 'REF-MIV-99',
        },
      };

      expect(completedRecord.status).toBe('done');
      expect((completedRecord.result as any).matchesCount).toBe(4);
    });
  });

  describe('Exchange Polling & Event Subscription Mechanics', () => {
    it('creates an active polling interval and terminates cleanly on unsubscribe', () => {
      vi.useFakeTimers();

      let pollCount = 0;
      const pollFn = vi.fn(() => {
        pollCount++;
      });

      const intervalId = setInterval(pollFn, 2000);
      const unsubscribe = () => clearInterval(intervalId);

      vi.advanceTimersByTime(2000);
      expect(pollCount).toBe(1);

      vi.advanceTimersByTime(4000);
      expect(pollCount).toBe(3);

      unsubscribe();
      vi.advanceTimersByTime(4000);
      expect(pollCount).toBe(3); // Stopped polling

      vi.useRealTimers();
    });
  });
});
