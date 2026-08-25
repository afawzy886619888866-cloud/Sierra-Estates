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
  });

  describe('Sierra Estates Bot (Python Service)', () => {
    const botDir = path.join(AGENTS_ROOT, 'sierra-estates-bot');

    it('should contain python bot implementations and system prompts', () => {
      expect(fs.existsSync(path.join(botDir, 'sierra_estates_bot_implementation.py'))).toBe(true);
      expect(fs.existsSync(path.join(botDir, 'sierra_blue_bot_implementation.py'))).toBe(true);
      expect(fs.existsSync(path.join(botDir, 'system_prompt_and_deployment.py'))).toBe(true);
      expect(fs.existsSync(path.join(botDir, 'requirements.txt'))).toBe(true);
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
