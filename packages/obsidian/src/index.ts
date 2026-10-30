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
        const content = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(content);
        const store: Record<string, MemoryEntry> = Object.create(null);
        if (parsed && typeof parsed === 'object') {
          for (const [k, v] of Object.entries(parsed)) {
            if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') {
              store[k] = v as MemoryEntry;
            }
          }
        }
        return store;
      } catch (err: any) {
        if (err && err.code === 'ENOENT') {
          return Object.create(null);
        }
        if (attempt === 4) {
          console.error('[ObsidianMemory] Error reading memory store:', err);
          return Object.create(null);
        }
        // Small synchronous backoff on lock contention
        const end = Date.now() + 10 * (attempt + 1);
        while (Date.now() < end) {}
      }
    }
    return Object.create(null);
  }

  private writeStore(data: Record<string, MemoryEntry>): void {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 });
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
    if (id === '__proto__' || id === 'constructor' || id === 'prototype') return null;
    const store = this.readStore();
    return store[id] || null;
  }

  async set(id: string, value: any, tags: string[] = []): Promise<MemoryEntry> {
    if (id === '__proto__' || id === 'constructor' || id === 'prototype') {
      throw new Error(`Invalid entry id: ${id}`);
    }
    const store = this.readStore();
    const now = new Date().toISOString();

    const entry: MemoryEntry = {
      id,
      value,
      tags: Array.from(new Set(tags)),
      createdAt: store[id]?.createdAt || now,
      updatedAt: now,
    };

    Object.defineProperty(store, id, {
      value: entry,
      writable: true,
      enumerable: true,
      configurable: true,
    });
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
    if (id === '__proto__' || id === 'constructor' || id === 'prototype') return false;
    const store = this.readStore();
    if (Object.prototype.hasOwnProperty.call(store, id)) {
      Reflect.deleteProperty(store, id);
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
