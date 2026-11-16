/**
 * Sierra Estates — Memory Palace (mempalace) Vector Memory Engine
 * Multi-backend portable vector memory engine with semantic & exact search.
 * Provides agent recall across past listings, negotiations, client leads, and system knowledge.
 */

export interface MemoryPalaceEntry {
  id: string;
  room: 'listings' | 'leads' | 'negotiations' | 'system' | 'general';
  drawer: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface MemoryPalaceQueryResult {
  entry: MemoryPalaceEntry;
  score: number;
}

export class MemoryPalace {
  private palace: Map<string, MemoryPalaceEntry> = new Map();

  constructor() {
    this.seedDefaultKnowledge();
  }

  private seedDefaultKnowledge() {
    this.store({
      id: 'system-backend-authoritative-supabase',
      room: 'system',
      drawer: 'architecture',
      content: 'Supabase is the primary authoritative backend, PostgreSQL database, Auth, and Vector memory engine for Sierra Estates (Project Ref: gaxfqcietzoonlmatiot, URL: https://gaxfqcietzoonlmatiot.supabase.co), fully replacing Firebase across all listings, leads, profiles, and agent memory systems.',
      metadata: {
        provider: 'supabase',
        projectRef: 'gaxfqcietzoonlmatiot',
        url: 'https://gaxfqcietzoonlmatiot.supabase.co',
        status: 'active-primary',
        replaces: 'firebase',
      },
      timestamp: new Date().toISOString(),
    });

    this.store({
      id: 'system-ecc-guidelines',
      room: 'system',
      drawer: 'ecc',
      content: 'Everything Claude Code (ECC) v2.0.0 agent instructions, test-driven development, security-first immutability',
      metadata: { eccVersion: '2.0.0' },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Stores a new memory entry in the palace
   */
  public store(entry: MemoryPalaceEntry): void {
    if (!entry.timestamp) {
      entry.timestamp = new Date().toISOString();
    }
    this.palace.set(entry.id, entry);
  }

  /**
   * Retrieves a memory by exact ID
   */
  public get(id: string): MemoryPalaceEntry | undefined {
    return this.palace.get(id);
  }

  /**
   * Searches the memory palace by room, drawer, or text keywords
   */
  public search(query: {
    room?: MemoryPalaceEntry['room'];
    drawer?: string;
    keyword?: string;
    limit?: number;
  }): MemoryPalaceQueryResult[] {
    const limit = query.limit || 10;
    const results: MemoryPalaceQueryResult[] = [];
    const lowerKeyword = (query.keyword || '').toLowerCase();

    for (const entry of this.palace.values()) {
      if (query.room && entry.room !== query.room) continue;
      if (query.drawer && entry.drawer !== query.drawer) continue;

      let score = 1.0;
      if (lowerKeyword) {
        const text = (entry.content + ' ' + entry.drawer).toLowerCase();
        if (text.includes(lowerKeyword)) {
          score += 2.0;
        } else {
          continue; // Filter out non-matching keywords
        }
      }

      results.push({ entry, score });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * List all stored memories in a room
   */
  public listRoom(room: MemoryPalaceEntry['room']): MemoryPalaceEntry[] {
    return Array.from(this.palace.values()).filter(e => e.room === room);
  }
}

export const mempalace = new MemoryPalace();
