import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  EpisodicContextCache,
  HOT_DEAL_THRESHOLD_PCT,
  type Episode,
  type EntityProfile,
  type WorkingMemorySession,
} from '../../../packages/agents/tools/eccMemoryEngine';
import { ObsidianMemory, type MemoryEntry } from '@sierra-estates/obsidian';

export interface VaultNote {
  title: string;
  filename: string;
  path: string;
  content: string;
  tags: string[];
  lastModified: number;
}

export interface RAGMatch {
  source: 'obsidian_vault' | 'ecc_entity' | 'ecc_episode';
  title: string;
  score: number;
  content: string;
  metadata?: Record<string, any>;
}

export interface BrainRAGOptions {
  vaultDir?: string;
  storePath?: string;
  activeGoal?: string;
}

export interface GoalAlignedContextDirective {
  query: string;
  activeGoal: string;
  timestamp: string;
  vaultNotes: RAGMatch[];
  entityContext?: EntityProfile | null;
  recentEpisodes: Episode[];
  hotDeals: Episode[];
  formattedDirective: string;
}

/**
 * Unified Memory Brain Engine (Obsidian + ECC RAG)
 * 
 * Unifies:
 * 1. Obsidian Vault (Markdown domain knowledge, policies, scripts, compound data)
 * 2. Episodic Context Cache (ECC) (Working sessions, multi-turn episodes, entity profiles)
 * 3. RAG Retrieval & Prompt Directive Synthesis (Aligning all fleet agents towards the active goal)
 */
export class MemoryBrainEngine {
  public readonly ecc: EpisodicContextCache;
  public readonly obsidian: ObsidianMemory;
  private vaultDir: string;
  private activeGoal: string;
  private vaultCache: Map<string, VaultNote> = new Map();
  private lastVaultScan: number = 0;

  constructor(options: BrainRAGOptions = {}) {
    this.vaultDir =
      options.vaultDir ||
      process.env.OBSIDIAN_VAULT_DIR ||
      this.resolveVaultDir();

    const storePath =
      options.storePath ||
      process.env.ECC_MEMORY_STORAGE_PATH ||
      (process.env.NODE_ENV === 'test'
        ? path.join(os.tmpdir(), `sierra-brain-store-${process.pid}.json`)
        : path.resolve(process.cwd(), 'obsidian-store.json'));

    this.ecc = new EpisodicContextCache(storePath);
    this.obsidian = new ObsidianMemory(storePath);
    this.activeGoal = options.activeGoal || 'Deliver transparent, high-yield luxury real estate advisory with deterministic closure in New Cairo';

    this.scanVault();
  }

  private resolveVaultDir(): string {
    const cwdVault = path.resolve(process.cwd(), 'docs/obsidian-vault');
    if (fs.existsSync(cwdVault)) return cwdVault;

    const relativeVault = path.resolve(__dirname, '../../../docs/obsidian-vault');
    if (fs.existsSync(relativeVault)) return relativeVault;

    return cwdVault;
  }

  /**
   * Scans and indexes the Obsidian markdown vault.
   */
  public scanVault(force: boolean = false): void {
    const now = Date.now();
    if (!force && now - this.lastVaultScan < 60000 && this.vaultCache.size > 0) {
      return;
    }

    try {
      if (!fs.existsSync(this.vaultDir)) {
        return;
      }

      const files = fs.readdirSync(this.vaultDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;

        const filePath = path.join(this.vaultDir, file);
        const stat = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Extract inline or frontmatter tags (#tag or tags: [...])
        const tags: string[] = [];
        const tagMatches = content.match(/#([a-zA-Z0-9_\u0600-\u06FF-]+)/g);
        if (tagMatches) {
          tags.push(...tagMatches.map((t) => t.substring(1).toLowerCase()));
        }

        const title = file.replace('.md', '');
        this.vaultCache.set(file.toLowerCase(), {
          title,
          filename: file,
          path: filePath,
          content,
          tags: Array.from(new Set(tags)),
          lastModified: stat.mtimeMs,
        });
      }

      this.lastVaultScan = now;
    } catch (err) {
      console.warn('[MemoryBrainEngine] Error scanning Obsidian vault:', (err as Error).message);
    }
  }

  /**
   * Set or update the active strategic goal guiding the agent fleet.
   */
  public setActiveGoal(goal: string): void {
    this.activeGoal = goal;
  }

  public getActiveGoal(): string {
    return this.activeGoal;
  }

  /**
   * Query the Obsidian knowledge vault using lexical & keyword relevance scoring.
   */
  public searchVault(query: string, maxResults: number = 3): RAGMatch[] {
    this.scanVault();
    const qTokens = (query || '')
      .toLowerCase()
      .split(/[\s,./\\;:'"!@#$%^&*()_+=]+/)
      .filter((t) => t.length > 2);

    if (qTokens.length === 0) return [];

    const matches: RAGMatch[] = [];

    for (const note of this.vaultCache.values()) {
      let score = 0;
      const lowerTitle = note.title.toLowerCase();
      const lowerContent = note.content.toLowerCase();

      for (const token of qTokens) {
        // Title matches receive high weighting
        if (lowerTitle.includes(token)) score += 5;
        // Tag matches
        if (note.tags.some((t) => t.includes(token))) score += 4;
        // Body matches
        const count = (lowerContent.match(new RegExp(token, 'g')) || []).length;
        score += Math.min(count, 5);
      }

      if (score > 0) {
        // Find most relevant excerpt
        let snippet = note.content.substring(0, 450).trim();
        for (const token of qTokens) {
          const idx = lowerContent.indexOf(token);
          if (idx !== -1) {
            const start = Math.max(0, idx - 80);
            const end = Math.min(note.content.length, idx + 250);
            snippet = (start > 0 ? '...' : '') + note.content.substring(start, end).trim() + (end < note.content.length ? '...' : '');
            break;
          }
        }

        matches.push({
          source: 'obsidian_vault',
          title: note.title,
          score,
          content: snippet,
          metadata: { path: note.path, filename: note.filename },
        });
      }
    }

    return matches.sort((a, b) => b.score - a.score).slice(0, maxResults);
  }

  /**
   * Unified RAG Query across Obsidian Vault and ECC Entity/Episodic Memory.
   */
  public queryBrainRAG(
    query: string,
    options: {
      entityId?: string;
      compound?: string;
      maxVaultResults?: number;
      maxEpisodes?: number;
    } = {}
  ): GoalAlignedContextDirective {
    const { entityId, compound, maxVaultResults = 3, maxEpisodes = 4 } = options;
    const combinedQuery = `${query} ${compound || ''}`.trim();

    // 1. Retrieve knowledge from Obsidian Vault
    const vaultMatches = this.searchVault(combinedQuery, maxVaultResults);

    // 2. Retrieve Entity Profile from ECC
    let entityContext: EntityProfile | null = null;
    if (entityId) {
      entityContext = this.ecc.getEntity(entityId);
    }

    // 3. Retrieve relevant episodes (price reductions, offers, inspections)
    const recentEpisodes = this.ecc.getRecentEpisodes(maxEpisodes, entityId);
    const hotDeals = this.ecc.getHotDeals(maxEpisodes);

    // 4. Synthesize unified formatted directive
    const sections: string[] = [
      `=== [SIERRA MEMORY BRAIN RAG CONTEXT] ===`,
      `🎯 Active Strategic Goal: ${this.activeGoal}`,
      `⏰ Context Timestamp: ${new Date().toISOString()}`,
    ];

    if (vaultMatches.length > 0) {
      sections.push(`\n📚 Relevant Obsidian Knowledge Notes:`);
      vaultMatches.forEach((m, idx) => {
        sections.push(`  [${idx + 1}] [[${m.title}]] (Relevance Score: ${m.score})\n      ${m.content.replace(/\n+/g, ' ')}`);
      });
    }

    if (entityContext) {
      sections.push(`\n👤 Entity Profile Context (${entityContext.id}):`);
      sections.push(`  Type: ${entityContext.type} | Compound: ${entityContext.compound || 'N/A'}`);
      if (entityContext.historicalPrices && entityContext.historicalPrices.length > 0) {
        sections.push(`  Price History: ${entityContext.historicalPrices.map((h) => `${h.price.toLocaleString()} EGP (${h.timestamp.split('T')[0]})`).join(' -> ')}`);
      }
      if (entityContext.tags.length > 0) {
        sections.push(`  Tags: ${entityContext.tags.join(', ')}`);
      }
    }

    if (recentEpisodes.length > 0) {
      sections.push(`\n📜 Recent Episodic Memory Timeline:`);
      recentEpisodes.slice(0, 3).forEach((ep) => {
        sections.push(`  - [${ep.type}] ${ep.summary} (${ep.timestamp.split('T')[0]})`);
      });
    }

    if (hotDeals.length > 0) {
      sections.push(`\n⚡ Active Distressed / Hot Deals:`);
      hotDeals.slice(0, 2).forEach((hd) => {
        sections.push(`  - ${hd.entityId}: ${hd.summary}`);
      });
    }

    sections.push(`=========================================`);

    return {
      query,
      activeGoal: this.activeGoal,
      timestamp: new Date().toISOString(),
      vaultNotes: vaultMatches,
      entityContext,
      recentEpisodes,
      hotDeals,
      formattedDirective: sections.join('\n'),
    };
  }

  /**
   * Ingest a new Markdown note directly into the Obsidian Vault with frontmatter tags.
   */
  public createOrUpdateVaultNote(title: string, content: string, tags: string[] = []): string {
    const filename = `${title.replace(/[/\\?%*:|"<>]/g, '-').trim()}.md`;
    const filePath = path.join(this.vaultDir, filename);

    const tagHeader = tags.length > 0 ? `---\ntags:\n${tags.map((t) => `  - ${t}`).join('\n')}\n---\n\n` : '';
    const fullContent = `${tagHeader}# ${title}\n\n${content}`;

    fs.mkdirSync(this.vaultDir, { recursive: true });
    fs.writeFileSync(filePath, fullContent, 'utf-8');

    this.scanVault(true);
    return filePath;
  }
}

// Global shared singleton instance for the monorepo
let _brainInstance: MemoryBrainEngine | null = null;

export function getMemoryBrain(options?: BrainRAGOptions): MemoryBrainEngine {
  if (!_brainInstance) {
    _brainInstance = new MemoryBrainEngine(options);
  }
  return _brainInstance;
}

export const memoryBrain = getMemoryBrain();
export const brainRAG = memoryBrain;
export default memoryBrain;
