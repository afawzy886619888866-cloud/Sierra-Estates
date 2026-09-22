/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Sierra Estates — n8n Workflow Validation Tests
 *  File: SE/infra/n8n-workflows/__tests__/workflows.test.ts
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKFLOWS_DIR = join(__dirname, '..');

const workflowFiles = readdirSync(WORKFLOWS_DIR)
  .filter(f => f.endsWith('.json'))
  .map(f => ({
    name: f,
    path: join(WORKFLOWS_DIR, f),
    data: JSON.parse(readFileSync(join(WORKFLOWS_DIR, f), 'utf-8')),
  }));

describe('n8n Workflow Files', () => {
  it('should have valid workflow files', () => {
    expect(workflowFiles.length).toBeGreaterThanOrEqual(3);
  });

  it('all files have valid n8n structure', () => {
    for (const wf of workflowFiles) {
      expect(wf.data).toHaveProperty('name');
      expect(wf.data).toHaveProperty('nodes');
      expect(wf.data).toHaveProperty('connections');
      expect(wf.data.nodes).toBeInstanceOf(Array);
      expect(wf.data.nodes.length).toBeGreaterThan(0);
    }
  });

  it('all nodes have required fields (id, name, type, position)', () => {
    for (const wf of workflowFiles) {
      for (const node of wf.data.nodes) {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('name');
        expect(node).toHaveProperty('type');
        expect(node).toHaveProperty('position');
        expect(node.position).toBeInstanceOf(Array);
        expect(node.position).toHaveLength(2);
      }
    }
  });

  it('all workflows are tagged with sierra-estates', () => {
    for (const wf of workflowFiles) {
      const tags = wf.data.tags || [];
      const tagNames = tags.map((t: any) => t.name);
      expect(tagNames).toContain('sierra-estates');
    }
  });

  it('all workflows are inactive by default (safe import)', () => {
    for (const wf of workflowFiles) {
      expect(wf.data.active).toBe(false);
    }
  });

  it('does not contain active legacy Firebase persistence', () => {
    for (const wf of workflowFiles) {
      if (wf.data.active) {
        expect(JSON.stringify(wf.data)).not.toContain('firebaseRealtimeDatabase');
      }
    }
  });
});

describe('legacy workflow retirement', () => {
  for (const name of [
    '01-property-finder-leads.json',
    '02-whatsapp-bot-handler.json',
    '03-ai-score-scheduler.json',
  ]) {
    it(`${name} is explicitly retired`, () => {
      const workflow = workflowFiles.find((wf) => wf.name === name);
      expect(workflow?.data.meta?.productionStatus).toBe('retired');
      expect(workflow?.data.meta?.replacement).toBe('04-supabase-webhook-intake.json');
    });
  }
});

describe('04-supabase-webhook-intake.json', () => {
  const wf = workflowFiles.find(w => w.name === '04-supabase-webhook-intake.json')!;
  const data = wf.data;

  it('is an inactive, authenticated Supabase-first workflow', () => {
    expect(data.active).toBe(false);
    expect(data.meta.productionStatus).toBe('candidate');
    expect(data.meta.backend).toBe('supabase');
    const webhook = data.nodes.find((n: any) => n.type === 'n8n-nodes-base.webhook');
    expect(webhook?.parameters.authentication).toBe('headerAuth');
    expect(data.nodes.some((n: any) => n.type === 'n8n-nodes-base.httpRequest')).toBe(true);
  });

  it('validates the required lead fields before persistence', () => {
    const validator = data.nodes.find((n: any) => n.name === 'Validate Intake');
    expect(validator?.parameters.jsCode || validator?.parameters.functionCode).toContain('name');
    expect(validator?.parameters.jsCode || validator?.parameters.functionCode).toContain('phone');
    expect(validator?.parameters.jsCode || validator?.parameters.functionCode).toContain('messageId');
  });

  it('uses the external message id for duplicate delivery protection', () => {
    const validator = data.nodes.find((n: any) => n.name === 'Validate Intake');
    const persist = data.nodes.find((n: any) => n.name === 'Persist Lead in Supabase');
    expect(validator?.parameters.jsCode).toContain('external_message_id');
    expect(persist?.parameters.url).toContain('on_conflict=external_message_id');
    expect(JSON.stringify(persist?.parameters.headerParameters)).toContain('ignore-duplicates');
  });
});

describe('01-property-finder-leads.json', () => {
  const wf = workflowFiles.find(w => w.name === '01-property-finder-leads.json')!;
  const data = wf.data;

  it('has correct name', () => {
    expect(data.name).toContain('Property Finder');
  });

  it('has webhook trigger with correct path', () => {
    const webhook = data.nodes.find((n: any) => n.type === 'n8n-nodes-base.webhook');
    expect(webhook).toBeDefined();
    expect(webhook.parameters.path).toBe('property-finder-leads');
  });

  it('is not eligible for activation', () => {
    expect(data.meta.productionStatus).toBe('retired');
    expect(data.active).toBe(false);
  });
});

describe('02-whatsapp-bot-handler.json', () => {
  const wf = workflowFiles.find(w => w.name === '02-whatsapp-bot-handler.json')!;
  const data = wf.data;

  it('has correct name', () => {
    expect(data.name).toContain('WhatsApp');
  });

  it('has webhook with whatsapp-incoming path', () => {
    const webhook = data.nodes.find((n: any) => n.type === 'n8n-nodes-base.webhook');
    expect(webhook).toBeDefined();
    expect(webhook.parameters.path).toBe('whatsapp-incoming');
  });

  it('is not eligible for activation', () => {
    expect(data.meta.productionStatus).toBe('retired');
    expect(data.active).toBe(false);
  });
});

describe('03-ai-score-scheduler.json', () => {
  const wf = workflowFiles.find(w => w.name === '03-ai-score-scheduler.json')!;
  const data = wf.data;

  it('has correct name', () => {
    expect(data.name).toContain('AI Listing Score');
  });

  it('uses schedule trigger (cron)', () => {
    const trigger = data.nodes.find((n: any) =>
      n.type === 'n8n-nodes-base.scheduleTrigger'
    );
    expect(trigger).toBeDefined();
  });

  it('runs every 4 hours', () => {
    const trigger = data.nodes.find((n: any) =>
      n.type === 'n8n-nodes-base.scheduleTrigger'
    );
    expect(trigger.parameters.rule.interval[0].field).toBe('hours');
    expect(trigger.parameters.rule.interval[0].hoursInterval).toBe(4);
  });

  it('is not eligible for activation', () => {
    expect(data.meta.productionStatus).toBe('retired');
    expect(data.active).toBe(false);
  });
});
