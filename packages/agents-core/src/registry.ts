import * as fs from 'fs';
import * as path from 'path';

export interface AgentProfile {
  name: string;
  domain: string;
  description: string;
  systemPrompt: string;
  ruleRef?: string;
  dnaRef?: string;
  isSkill?: boolean;
}

export class AgentRegistry {
  private srcDir: string;
  private rootDir: string;
  private profiles: Record<string, AgentProfile> = {};

  constructor(customSrcDir?: string) {
    this.srcDir = customSrcDir || __dirname;
    this.rootDir = path.resolve(this.srcDir, '../../..');
    this.loadAllProfiles();
    this.loadAgentSkills();
  }

  private loadAllProfiles() {
    try {
      if (!this.srcDir || !fs.existsSync(this.srcDir)) {
        return;
      }
      const files = fs.readdirSync(this.srcDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const name = path.basename(file, '.md');
          const filePath = path.join(this.srcDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const profile = this.parseMarkdownProfile(name, content, false);
          this.profiles[name] = profile;
        }
      }
    } catch (err) {
      console.error('[AgentRegistry] Error loading profiles:', err);
    }
  }

  /**
   * Scans and auto-registers all .agents/skills directory skills into the unified registry
   */
  private loadAgentSkills() {
    try {
      const skillsDir = path.join(this.rootDir, '.agents', 'skills');
      if (!fs.existsSync(skillsDir)) {
        return;
      }

      const skillFolders = fs.readdirSync(skillsDir, { withFileTypes: true });
      for (const dirent of skillFolders) {
        if (dirent.isDirectory()) {
          const skillFile = path.join(skillsDir, dirent.name, 'SKILL.md');
          if (fs.existsSync(skillFile)) {
            const content = fs.readFileSync(skillFile, 'utf-8');
            const profile = this.parseMarkdownProfile(dirent.name, content, true);
            this.profiles[dirent.name] = profile;
          }
        }
      }
    } catch (err) {
      console.warn('[AgentRegistry] Notice: Could not load .agents/skills:', err);
    }
  }

  private parseMarkdownProfile(name: string, content: string, isSkill: boolean): AgentProfile {
    const frontmatterRegex = /^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    let domain = isSkill ? 'Custom Skill' : 'General Development';
    let description = '';
    let ruleRef = '';
    let dnaRef = '';
    let systemPrompt = content;

    if (match) {
      const frontmatter = match[1];
      systemPrompt = match[2];

      const lines = frontmatter.split('\n');
      for (const line of lines) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim().toLowerCase();
          const val = parts.slice(1).join(':').trim();
          if (key === 'domain') domain = val;
          else if (key === 'description') description = val;
          else if (key === 'rule_ref') ruleRef = val;
          else if (key === 'dna_ref') dnaRef = val;
          else if (key === 'name' && val) name = val;
        }
      }
    }

    return {
      name,
      domain,
      description,
      systemPrompt: systemPrompt.trim(),
      ruleRef,
      dnaRef,
      isSkill,
    };
  }

  getAgent(name: string): AgentProfile | null {
    return this.profiles[name] || null;
  }

  listAgents(): AgentProfile[] {
    return Object.values(this.profiles).filter(p => !p.isSkill);
  }

  listSkills(): AgentProfile[] {
    return Object.values(this.profiles).filter(p => p.isSkill);
  }

  listAll(): AgentProfile[] {
    return Object.values(this.profiles);
  }

  /**
   * Generates a concise summary of all registered skills to inject into agent system prompts
   */
  getSkillsCatalogSummary(): string {
    const all = this.listAll();
    if (all.length === 0) return 'No external skills registered.';

    return all
      .map(p => `• [${p.name}] (${p.domain}): ${p.description || 'Specialized domain intelligence & execution module'}`)
      .join('\n');
  }
}

export const registry = new AgentRegistry();
