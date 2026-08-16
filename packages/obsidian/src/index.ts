import * as fs from 'fs';
import * as path from 'path';

export interface MemoryEntry {
  id: string;
  value: any;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export class ObsidianMemory {
  private filePath: string;

  constructor(customPath?: string) {
    // Write to root workspace by default, fallback to current dir
    this.filePath = customPath || path.resolve(process.cwd(), 'obsidian-store.json');
  }

  private readStore(): Record<string, MemoryEntry> {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (err) {
      console.error('[ObsidianMemory] Error reading memory store:', err);
    }
    return {};
  }

  private writeStore(data: Record<string, MemoryEntry>): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ObsidianMemory] Error writing to memory store:', err);
    }
  }

  /**
   * Retrieves a memory entry by ID.
   */
  async get(id: string): Promise<MemoryEntry | null> {
    const store = this.readStore();
    return store[id] || null;
  }

  /**
   * Sets or updates a memory entry.
   */
  async set(id: string, value: any, tags: string[] = []): Promise<MemoryEntry> {
    const store = this.readStore();
    const now = new Date().toISOString();

    const entry: MemoryEntry = {
      id,
      value,
      tags: Array.from(new Set(tags)),
      createdAt: store[id]?.createdAt || now,
      updatedAt: now,
    };

    store[id] = entry;
    this.writeStore(store);
    return entry;
  }

  /**
   * Searches memories by query string and/or tags.
   */
  async search(queryText: string, tags: string[] = []): Promise<MemoryEntry[]> {
    const store = this.readStore();
    let entries = Object.values(store);

    // Filter by tags if provided
    if (tags.length > 0) {
      entries = entries.filter((entry) =>
        tags.every((t) => (entry.tags || []).includes(t))
      );
    }

    // Filter by queryText if provided
    if (queryText.trim()) {
      const q = queryText.toLowerCase();
      entries = entries.filter((entry) => {
        const valStr = typeof entry.value === 'string' 
          ? entry.value 
          : JSON.stringify(entry.value);
        return (
          entry.id.toLowerCase().includes(q) ||
          valStr.toLowerCase().includes(q) ||
          (entry.tags || []).some((t) => t.toLowerCase().includes(q))
        );
      });
    }

    return entries;
  }

  /**
   * Deletes a memory entry by ID.
   */
  async delete(id: string): Promise<boolean> {
    const store = this.readStore();
    if (store[id]) {
      delete store[id];
      this.writeStore(store);
      return true;
    }
    return false;
  }

  /**
   * Lists all memories in the store.
   */
  async list(): Promise<MemoryEntry[]> {
    const store = this.readStore();
    return Object.values(store);
  }

  /**
   * Clears all memories.
   */
  async clear(): Promise<void> {
    this.writeStore({});
  }
}

// Export default shared instances and backward-compatible aliases
export const obsidian = new ObsidianMemory();
