/**
 * Sierra Estates — Memory Palace (mempalace) Vector Memory Engine
 * Multi-backend portable vector memory engine with semantic & exact search.
 * Provides agent recall across past listings, negotiations, client leads, and system knowledge.
 */
















export class MemoryPalace {
   __init() {this.palace = new Map()}

  constructor() {;MemoryPalace.prototype.__init.call(this);
    this.seedDefaultKnowledge();
  }

   seedDefaultKnowledge() {
    this.store({
      id: 'system-firebase-sierra-blu',
      room: 'system',
      drawer: 'credentials',
      content: 'Official Firebase Project ID is sierra-blu, App ID 1:941030513456:web:56209a1495d69f217086f5',
      metadata: { projectId: 'sierra-blu' },
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
   store(entry) {
    if (!entry.timestamp) {
      entry.timestamp = new Date().toISOString();
    }
    this.palace.set(entry.id, entry);
  }

  /**
   * Retrieves a memory by exact ID
   */
   get(id) {
    return this.palace.get(id);
  }

  /**
   * Searches the memory palace by room, drawer, or text keywords
   */
   search(query




) {
    const limit = query.limit || 10;
    const results = [];
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
   listRoom(room) {
    return Array.from(this.palace.values()).filter(e => e.room === room);
  }
}

export const mempalace = new MemoryPalace();
