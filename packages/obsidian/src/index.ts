import * as fs from 'fs';
import * as os from 'os';
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
    // Under test, write to a per-process temp file rather than the committed
    // store at the repo root. Every suite that exercises an agent persists
    // through here, so pointing at the real file left the working tree dirty
    // after any test run — for every developer and every concurrent agent.
    // Mirrors the resolution order already used by
    // packages/agents/tools/eccMemoryEngine.ts.
    this.filePath =
      customPath ||
      process.env.OBSIDIAN_STORE_PATH ||
      (process.env.NODE_ENV === 'test'
        ? path.join(os.tmpdir(), `sierra-estates-obsidian-${process.pid}.json`)
        : path.resolve(process.cwd(), 'obsidian-store.json'));
  }

  private readStore(): Record<string, MemoryEntry> {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        if (fs.existsSync(this.filePath)) {
          const content = fs.readFileSync(this.filePath, 'utf-8');
          return JSON.parse(content);
        }
        return {};
      } catch (err) {
        if (attempt === 4) {
          console.error('[ObsidianMemory] Error reading memory store:', err);
          return {};
        }
        // Small synchronous backoff on lock contention
        const end = Date.now() + 10 * (attempt + 1);
        while (Date.now() < end) {}
      }
    }
    return {};
  }

  private writeStore(data: Record<string, MemoryEntry>): void {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
        return;
      } catch (err) {
        if (attempt === 4) {
          console.error('[ObsidianMemory] Error writing to memory store:', err);
          return;
        }
        const end = Date.now() + 10 * (attempt + 1);
        while (Date.now() < end) {}
      }
    }
  }

  async get(id: string): Promise<MemoryEntry | null> {
    const store = this.readStore();
    return store[id] || null;
  }

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

  async search(query: string, tags?: string[]): Promise<MemoryEntry[]> {
    const store = this.readStore();
    const q = (query || '').toLowerCase();
    const targetTags = Array.isArray(tags) ? tags.map((t) => t.toLowerCase()) : [];

    return Object.values(store).filter((entry) => {
      const matchesQuery =
        (typeof entry.id === 'string' && entry.id.toLowerCase().includes(q)) ||
        (entry.value && JSON.stringify(entry.value).toLowerCase().includes(q)) ||
        (Array.isArray(entry.tags) && entry.tags.some((t) => typeof t === 'string' && t.toLowerCase().includes(q)));

      if (targetTags.length === 0) return matchesQuery;

      const hasTag =
        Array.isArray(entry.tags) &&
        entry.tags.some((t) => typeof t === 'string' && targetTags.includes(t.toLowerCase()));
      return matchesQuery || hasTag;
    });
  }

  async searchByTag(tag: string): Promise<MemoryEntry[]> {
    const store = this.readStore();
    const t = (tag || '').toLowerCase();
    return Object.values(store).filter((entry) =>
      Array.isArray(entry.tags) && entry.tags.some((entryTag) => typeof entryTag === 'string' && entryTag.toLowerCase() === t)
    );
  }

  async delete(id: string): Promise<boolean> {
    const store = this.readStore();
    if (store[id]) {
      delete store[id];
      this.writeStore(store);
      return true;
    }
    return false;
  }

  async list(): Promise<MemoryEntry[]> {
    const store = this.readStore();
    return Object.values(store);
  }

  async clear(): Promise<void> {
    this.writeStore({});
  }
}

export const obsidian = new ObsidianMemory();
export default obsidian;
