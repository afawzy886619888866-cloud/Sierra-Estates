import * as fs from 'fs';
import * as path from 'path';

export interface AgentProfile {
  name: string;
  domain: string;
  description: string;
  systemPrompt: string;
  ruleRef?: string;
  dnaRef?: string;
}

export class AgentRegistry {
  private srcDir: string;
  private profiles: Record<string, AgentProfile> = {};

  constructor(customSrcDir?: string) {
    this.srcDir = customSrcDir || __dirname;
    this.loadAllProfiles();
  }

  private loadAllProfiles() {
    try {
      const files = fs.readdirSync(this.srcDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const name = path.basename(file, '.md');
          const filePath = path.join(this.srcDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const profile = this.parseMarkdownProfile(name, content);
          this.profiles[name] = profile;
        }
      }
    } catch (err) {
      console.error('[AgentRegistry] Error loading profiles:', err);
    }
  }

  private parseMarkdownProfile(name: string, content: string): AgentProfile {
    // Basic Frontmatter Parser
    const frontmatterRegex = /^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    let domain = 'General Development';
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
    };
  }

  getAgent(name: string): AgentProfile | null {
    return this.profiles[name] || null;
  }

  listAgents(): AgentProfile[] {
    return Object.values(this.profiles);
  }
}

export const registry = new AgentRegistry();
