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

  async search(query: string): Promise<MemoryEntry[]> {
    const store = this.readStore();
    const q = (query || '').toLowerCase();
    return Object.values(store).filter(
      (entry) =>
        (typeof entry.id === 'string' && entry.id.toLowerCase().includes(q)) ||
        (entry.value && JSON.stringify(entry.value).toLowerCase().includes(q)) ||
        (Array.isArray(entry.tags) && entry.tags.some((t) => typeof t === 'string' && t.toLowerCase().includes(q)))
    );
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
