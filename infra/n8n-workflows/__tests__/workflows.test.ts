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
  it('should have exactly 3 workflow files', () => {
    expect(workflowFiles).toHaveLength(3);
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

  it('workflows use only valid Firestore collections', () => {
    const validCollections = ['listings', 'owners', 'clients', 'requests', 'agents', 'leads', 'inquiries'];
    for (const wf of workflowFiles) {
      const firebaseNodes = wf.data.nodes.filter((n: any) =>
        n.type === 'n8n-nodes-base.firebaseRealtimeDatabase'
      );
      for (const node of firebaseNodes) {
        if (node.parameters.collection) {
          expect(validCollections).toContain(node.parameters.collection);
        }
      }
    }
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

  it('writes to clients collection', () => {
    const firebaseNodes = data.nodes.filter((n: any) =>
      n.type === 'n8n-nodes-base.firebaseRealtimeDatabase'
    );
    const collectionNames = firebaseNodes.map((n: any) => n.parameters.collection);
    expect(collectionNames).toContain('clients');
  });

  it('writes to leads collection', () => {
    const firebaseNodes = data.nodes.filter((n: any) =>
      n.type === 'n8n-nodes-base.firebaseRealtimeDatabase'
    );
    const collectionNames = firebaseNodes.map((n: any) => n.parameters.collection);
    expect(collectionNames).toContain('leads');
  });

  it('writes to requests collection', () => {
    const firebaseNodes = data.nodes.filter((n: any) =>
      n.type === 'n8n-nodes-base.firebaseRealtimeDatabase'
    );
    const collectionNames = firebaseNodes.map((n: any) => n.parameters.collection);
    expect(collectionNames).toContain('requests');
  });

  it('creates request with bot_handling status', () => {
    const createRequestNode = data.nodes.find((n: any) => n.name === 'Create Request Ticket');
    expect(createRequestNode).toBeDefined();
    expect(createRequestNode.parameters.data).toContain('bot_handling');
  });

  it('has lead_source = property_finder', () => {
    const createClientNode = data.nodes.find((n: any) => n.name === 'Create Client');
    expect(createClientNode.parameters.data).toContain('property_finder');
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

  it('uses Gemini 2.0 Flash model', () => {
    const geminiNode = data.nodes.find((n: any) => n.name === 'Gemini AI Reply');
    expect(geminiNode).toBeDefined();
    expect(geminiNode.parameters.model).toBe('gemini-2.0-flash');
  });

  it('has escalation logic (status = ready_for_agent)', () => {
    const escalateNode = data.nodes.find((n: any) => n.name === 'Escalate to Agent');
    expect(escalateNode).toBeDefined();
    expect(escalateNode.parameters.data).toContain('ready_for_agent');
  });

  it('has lead_source = whatsapp_bot', () => {
    const createClientNode = data.nodes.find((n: any) => n.name === 'Create New Client');
    expect(createClientNode.parameters.data).toContain('whatsapp_bot');
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

  it('uses Gemini 2.0 Flash for scoring', () => {
    const geminiNode = data.nodes.find((n: any) => n.name === 'Gemini AI Score');
    expect(geminiNode).toBeDefined();
    expect(geminiNode.parameters.model).toBe('gemini-2.0-flash');
  });

  it('updates ai_score field in listings collection', () => {
    const updateNode = data.nodes.find((n: any) => n.name === 'Update Listing Score');
    expect(updateNode).toBeDefined();
    expect(updateNode.parameters.collection).toBe('listings');
    expect(updateNode.parameters.data).toContain('ai_score');
  });
});
