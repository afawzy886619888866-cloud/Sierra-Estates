import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('apps/agents (Bots & Agent Implementations)', () => {
  const AGENTS_ROOT = path.resolve(__dirname, '..');

  describe('Stage-9 Closer Agent', () => {
    const closerDir = path.join(AGENTS_ROOT, 'stage-9-closer');

    it('should have stage-9-closer directory structure and tsconfig', () => {
      expect(fs.existsSync(closerDir)).toBe(true);
      expect(fs.existsSync(path.join(closerDir, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(closerDir, 'tsconfig.json'))).toBe(true);
    });

    it('should contain CloserAgent and CloserAgentEnhanced implementations', () => {
      const closerAgentPath = path.join(closerDir, 'CloserAgent.ts');
      const enhancedPath = path.join(closerDir, 'CloserAgentEnhanced.ts');
      expect(fs.existsSync(closerAgentPath)).toBe(true);
      expect(fs.existsSync(enhancedPath)).toBe(true);

      const closerCode = fs.readFileSync(closerAgentPath, 'utf-8');
      expect(closerCode).toContain('CloserAgent');
      expect(closerCode).toContain('export');

      const enhancedCode = fs.readFileSync(enhancedPath, 'utf-8');
      expect(enhancedCode).toContain('CloserAgentEnhanced');
    });

    it('should contain proposal generator', () => {
      const propGenPath = path.join(closerDir, 'proposal-generator.ts');
      expect(fs.existsSync(propGenPath)).toBe(true);
      const code = fs.readFileSync(propGenPath, 'utf-8');
      expect(code).toContain('ProposalGenerator');
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
