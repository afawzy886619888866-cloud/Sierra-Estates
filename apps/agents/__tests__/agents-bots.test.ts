import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('apps/agents (Bots & Agent Implementations)', () => {
  const AGENTS_ROOT = path.resolve(__dirname, '..');

  describe('Stage-9 Closer Agent', () => {
    // The Stage-9 closer used to be forked here (apps/agents/stage-9-closer),
    // never wired into the pnpm workspace graph and never called from
    // production. The live implementation is packages/agents/src/closer-agent-enhanced.ts,
    // imported by lib/intelligence.ts and by the WhatsApp bot router's
    // 'closer' route. The fork was deleted rather than kept in sync by hand.
    const closerAgentEnhancedPath = path.resolve(
      AGENTS_ROOT,
      '..',
      '..',
      'packages',
      'agents',
      'src',
      'closer-agent-enhanced.ts'
    );

    it('has exactly one CloserAgentEnhanced implementation, and it is live', () => {
      expect(fs.existsSync(path.join(AGENTS_ROOT, 'stage-9-closer'))).toBe(false);
      expect(fs.existsSync(closerAgentEnhancedPath)).toBe(true);

      const code = fs.readFileSync(closerAgentEnhancedPath, 'utf-8');
      expect(code).toContain('export class CloserAgentEnhanced');
      expect(code).toContain('export const closerAgent');
    });
  });

  describe('Vertex Omni Agent (Titan)', () => {
    const vertexDir = path.join(AGENTS_ROOT, 'vertex-omni-agent');

    it('should contain agent_core.py, api.py, and requirements.txt', () => {
      expect(fs.existsSync(path.join(vertexDir, 'agent_core.py'))).toBe(true);
      expect(fs.existsSync(path.join(vertexDir, 'api.py'))).toBe(true);
      expect(fs.existsSync(path.join(vertexDir, 'requirements.txt'))).toBe(true);
    });

    it('should configure Titan agent persona and operational modes', () => {
      const coreCode = fs.readFileSync(path.join(vertexDir, 'agent_core.py'), 'utf-8');
      expect(coreCode).toContain('Titan');
      expect(coreCode).toContain('ADMIN/BOSS MODE');
      expect(coreCode).toContain('SCRAPER MODE');
      expect(coreCode).toContain('CONCIERGE MODE');
    });

    it('should define vertex tools directory', () => {
      const toolsDir = path.join(vertexDir, 'tools');
      expect(fs.existsSync(toolsDir)).toBe(true);
    });

    it('has an executor implementing every declared tool, and agent_core dispatches to it', () => {
      // registry.py used to declare save_listing / send_whatsapp_message /
      // query_crm_listings to the model with nothing that ever executed a
      // call — api.py only ever read response.text. executor.py is the
      // implementation; agent_core.py's run_agent_turn is the dispatch loop
      // that calls it and feeds results back for a final reply.
      const registryCode = fs.readFileSync(path.join(vertexDir, 'tools', 'registry.py'), 'utf-8');
      const executorCode = fs.readFileSync(path.join(vertexDir, 'tools', 'executor.py'), 'utf-8');
      const coreCode = fs.readFileSync(path.join(vertexDir, 'agent_core.py'), 'utf-8');

      const declaredNames = [...registryCode.matchAll(/name="(\w+)"/g)].map((m) => m[1]);
      expect(declaredNames.length).toBeGreaterThan(0);
      for (const name of declaredNames) {
        expect(executorCode).toContain(`def ${name}(`);
        expect(executorCode).toContain(`"${name}": ${name}`);
      }

      expect(coreCode).toContain('def run_agent_turn');
      expect(coreCode).toContain('execute_tool_call');
    });
  });

  describe('Sierra Estates Bot (Python Service)', () => {
    const botDir = path.join(AGENTS_ROOT, 'sierra-estates-bot');

    it('has one canonical bot implementation, not a duplicate pair', () => {
      // sierra_blue_bot_implementation.py was a byte-identical duplicate of
      // sierra_estates_bot_implementation.py — merged away rather than kept
      // in sync by hand. Same for the API integration pair: the surviving
      // file uses the corrected graph.facebook.com endpoint and the v12+
      // HubSpot SDK that only one of the two copies had.
      expect(fs.existsSync(path.join(botDir, 'sierra_estates_bot_implementation.py'))).toBe(true);
      expect(fs.existsSync(path.join(botDir, 'sierra_blue_bot_implementation.py'))).toBe(false);
      expect(fs.existsSync(path.join(botDir, 'sierra_estates_api_integration.py'))).toBe(true);
      expect(fs.existsSync(path.join(botDir, 'sierra_blue_api_integration.py'))).toBe(false);
      expect(fs.existsSync(path.join(botDir, 'system_prompt_and_deployment.py'))).toBe(true);
      expect(fs.existsSync(path.join(botDir, 'requirements.txt'))).toBe(true);

      const apiIntegrationCode = fs.readFileSync(
        path.join(botDir, 'sierra_estates_api_integration.py'),
        'utf-8'
      );
      expect(apiIntegrationCode).toContain('graph.facebook.com');
      expect(apiIntegrationCode).not.toContain('graph.instagram.com');
    });

    it('should contain luxury real estate prompt definitions', () => {
      const promptFile = fs.readFileSync(path.join(botDir, 'system_prompt_and_deployment.py'), 'utf-8');
      expect(promptFile).toContain('Sierra');
      expect(promptFile).toContain('Real Estate');
    });
  });

  describe('WhatsApp Bot & Hermes Dispatcher', () => {
    const waBotDir = path.join(AGENTS_ROOT, 'whatsapp-bot');

    it('should contain entrypoint index.ts and router.ts', () => {
      expect(fs.existsSync(path.join(waBotDir, 'index.ts'))).toBe(true);
      expect(fs.existsSync(path.join(waBotDir, 'router.ts'))).toBe(true);
      expect(fs.existsSync(path.join(waBotDir, 'chat-hermes.ts'))).toBe(true);
    });

    it('should contain whitelist config', () => {
      const whitelistPath = path.join(waBotDir, 'whitelist.json');
      expect(fs.existsSync(whitelistPath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(whitelistPath, 'utf-8'));
      expect(typeof content.enabled).toBe('boolean');
      expect(Array.isArray(content.numbers)).toBe(true);
    });
  });
});
