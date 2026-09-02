 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import * as fs from 'fs';
import * as path from 'path';









export class ObsidianMemory {
  

  constructor(customPath) {
    // Write to root workspace by default, fallback to current dir
    this.filePath = customPath || path.resolve(process.cwd(), 'obsidian-store.json');
  }

   readStore() {
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

   writeStore(data) {
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

  async get(id) {
    const store = this.readStore();
    return store[id] || null;
  }

  async set(id, value, tags = []) {
    const store = this.readStore();
    const now = new Date().toISOString();

    const entry = {
      id,
      value,
      tags: Array.from(new Set(tags)),
      createdAt: _optionalChain([store, 'access', _ => _[id], 'optionalAccess', _2 => _2.createdAt]) || now,
      updatedAt: now,
    };

    store[id] = entry;
    this.writeStore(store);
    return entry;
  }

  async search(query, tags) {
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

  async searchByTag(tag) {
    const store = this.readStore();
    const t = (tag || '').toLowerCase();
    return Object.values(store).filter((entry) =>
      Array.isArray(entry.tags) && entry.tags.some((entryTag) => typeof entryTag === 'string' && entryTag.toLowerCase() === t)
    );
  }

  async delete(id) {
    const store = this.readStore();
    if (store[id]) {
      delete store[id];
      this.writeStore(store);
      return true;
    }
    return false;
  }

  async list() {
    const store = this.readStore();
    return Object.values(store);
  }

  async clear() {
    this.writeStore({});
  }
}

export const obsidian = new ObsidianMemory();
export default obsidian;
