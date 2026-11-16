import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { JiraService, JiraLeadPayload } from '../whatsapp-bot/jira-service';

describe('Jira Integration Suite', () => {
  const AGENTS_ROOT = path.resolve(__dirname, '..');
  const REPO_ROOT = path.resolve(AGENTS_ROOT, '..', '..');

  describe('JiraService Class & Dry-run', () => {
    it('initializes with default options and handles missing credentials safely', () => {
      const service = new JiraService({
        host: '',
        email: '',
        apiToken: '',
        projectKey: 'TEST',
      });

      expect(service.isConfigured()).toBe(false);
    });

    it('creates dry-run mock ticket when unconfigured', async () => {
      const service = new JiraService({
        host: '',
        email: '',
        apiToken: '',
        projectKey: 'SE',
      });

      const payload: JiraLeadPayload = {
        phone: '+201012345678',
        name: 'Tarek Zaki',
        intent: 'viewing_request',
        propertyCode: 'SE-301',
        budget: '22,000,000 EGP',
        urgency: 'high',
        message: 'Looking for a villa in Mivida',
      };

      const result = await service.createLeadTicket(payload);

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.key).toMatch(/^SE-MOCK-\d+/);
      expect(result.url).toContain(result.key!);
    });

    it('deduplicates tickets for the same phone and intent within time window', async () => {
      const service = new JiraService({
        dedupWindowMs: 60000,
        projectKey: 'SE',
      });

      const payload: JiraLeadPayload = {
        phone: '+201099998888',
        intent: 'closing',
        urgency: 'critical',
      };

      const first = await service.createLeadTicket(payload);
      const second = await service.createLeadTicket(payload);

      expect(first.key).toBe(second.key);
    });

    it('constructs valid Atlassian Document Format (ADF) description structure', () => {
      const service = new JiraService();
      const payload: JiraLeadPayload = {
        phone: '+201011112222',
        name: 'Salma',
        intent: 'property_search',
        propertyCode: 'SE-999',
        budget: '10M EGP',
        message: 'Need 3 bedrooms',
        conversationSummary: 'Client looking for New Cairo apartments',
      };

      const adf = service.buildAdfDescription(payload) as any;

      expect(adf.type).toBe('doc');
      expect(adf.version).toBe(1);
      expect(adf.content).toBeInstanceOf(Array);
      expect(adf.content.length).toBeGreaterThan(2);

      // Check header paragraph
      const headerPara = adf.content[0];
      expect(headerPara.type).toBe('paragraph');
      expect(headerPara.content[0].text).toContain('Sierra Estates WhatsApp Lead Intake');

      // Check bullet list containing phone and name
      const bulletList = adf.content.find((c: any) => c.type === 'bulletList');
      expect(bulletList).toBeDefined();
    });
  });

  describe('Integration Files & Wiring Verification', () => {
    it('verifies JiraService is imported in WhatsAppBotRouter', () => {
      const routerPath = path.join(AGENTS_ROOT, 'whatsapp-bot', 'router.ts');
      expect(fs.existsSync(routerPath)).toBe(true);

      const routerCode = fs.readFileSync(routerPath, 'utf-8');
      expect(routerCode).toContain("import { defaultJiraService } from './jira-service'");
      expect(routerCode).toContain('defaultJiraService.createLeadTicket');
    });

    it('verifies n8n 04-jira-lead-sync workflow file exists', () => {
      const n8nPath = path.join(REPO_ROOT, 'infra', 'n8n-workflows', '04-jira-lead-sync.json');
      expect(fs.existsSync(n8nPath)).toBe(true);

      const n8nData = JSON.parse(fs.readFileSync(n8nPath, 'utf-8'));
      expect(n8nData.name).toContain('Jira Lead');
      expect(n8nData.tags.some((t: any) => t.name === 'sierra-estates')).toBe(true);
    });

    it('verifies Next.js /api/integrations/jira route exists', () => {
      const routePath = path.join(
        REPO_ROOT,
        'apps',
        'sierra-estates-realty',
        'app',
        'api',
        'integrations',
        'jira',
        'route.ts'
      );
      expect(fs.existsSync(routePath)).toBe(true);

      const routeCode = fs.readFileSync(routePath, 'utf-8');
      expect(routeCode).toContain('export async function POST');
      expect(routeCode).toContain('jiraLeadSchema');
    });

    it('verifies GitHub Actions jira-sync workflow exists', () => {
      const workflowPath = path.join(REPO_ROOT, '.github', 'workflows', 'jira-sync.yml');
      expect(fs.existsSync(workflowPath)).toBe(true);

      const workflowCode = fs.readFileSync(workflowPath, 'utf-8');
      expect(workflowCode).toContain('name: Jira Sync');
      expect(workflowCode).toContain('JIRA_BASE_URL');
    });

    it('verifies JIRA_INTEGRATION_GUIDE.md is present in docs', () => {
      const docPath = path.join(REPO_ROOT, 'docs', 'integrations', 'JIRA_INTEGRATION_GUIDE.md');
      expect(fs.existsSync(docPath)).toBe(true);
    });
  });
});
