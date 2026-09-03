 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * OpenMemory Adapter
 * Bridges Sierra Estates Memory Engine with OpenMemory (HSG) backend / REST API.
 */


























export class OpenMemoryAdapter {
  
   __init() {this.localFallbackStore = new Map()}

  constructor(config = {}) {;OpenMemoryAdapter.prototype.__init.call(this);
    this.config = {
      baseUrl: config.baseUrl || process.env.OPENMEMORY_URL || process.env.OM_URL || 'http://localhost:8080',
      apiKey: config.apiKey || process.env.OPENMEMORY_API_KEY || process.env.OM_API_KEY || '',
      defaultUserId: config.defaultUserId || process.env.OM_USER_ID || 'sierra-agent',
      defaultProjectId: config.defaultProjectId || process.env.OM_PROJECT_ID || 'sierra-estates',
      timeoutMs: config.timeoutMs || 5000,
    };
  }

   getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      headers['x-api-key'] = this.config.apiKey;
    }
    return headers;
  }

  /**
   * Stores content in OpenMemory Hybrid Sector Graph (HSG).
   */
  async add(content, options = {}) {
    const userId = options.userId || this.config.defaultUserId;
    const projectId = options.projectId || this.config.defaultProjectId;
    const tags = options.tags || ['agent-memory'];
    const metadata = options.metadata || {};

    const url = `${this.config.baseUrl.replace(/\/$/, '')}/api/memory`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          content,
          user_id: userId,
          project_id: projectId,
          tags,
          ...metadata,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.ok) {
        const data = (await response.json()) ;
        return {
          id: _optionalChain([data, 'optionalAccess', _ => _.id]) || _optionalChain([data, 'optionalAccess', _2 => _2.memory_id]) || `om-${Date.now()}`,
          success: true,
          fallback: false,
        };
      }
    } catch (_err) {
      // Fall through to local fallback storage
    }

    // Local fallback when OpenMemory server is not reachable
    const fallbackId = `mem-fallback-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.localFallbackStore.set(fallbackId, {
      id: fallbackId,
      content,
      options: { userId, projectId, tags, metadata },
      createdAt: new Date().toISOString(),
    });

    return { id: fallbackId, success: true, fallback: true };
  }

  /**
   * Queries memories using hybrid semantic search.
   */
  async query(queryString, options = {}) {
    const userId = options.userId || this.config.defaultUserId;
    const projectId = options.projectId || this.config.defaultProjectId;
    const limit = options.limit || 5;

    const url = `${this.config.baseUrl.replace(/\/$/, '')}/api/query`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          query: queryString,
          user_id: userId,
          project_id: projectId,
          limit,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.ok) {
        const data = (await response.json()) 

;
        const results = Array.isArray(data) ? data : data.results || data.memories || [];
        return results.map((item) => ({
          id: item.id || item.memory_id || 'unknown',
          content: item.content || item.text || '',
          similarity: item.similarity || item.score || 0.85,
          score: item.score || item.similarity || 0.85,
          tags: item.tags || [],
          metadata: item.metadata || item.meta || {},
          createdAt: item.created_at || new Date().toISOString(),
        }));
      }
    } catch (_err) {
      // Fallback to local match
    }

    // Basic substring search on local fallback store
    const localMatches = [];
    const queryLower = queryString.toLowerCase();

    for (const [id, entry] of this.localFallbackStore.entries()) {
      if (entry.content.toLowerCase().includes(queryLower) || _optionalChain([entry, 'access', _3 => _3.options, 'access', _4 => _4.tags, 'optionalAccess', _5 => _5.some, 'call', _6 => _6(t => t.toLowerCase().includes(queryLower))])) {
        localMatches.push({
          id,
          content: entry.content,
          similarity: 0.8,
          score: 0.8,
          tags: entry.options.tags,
          metadata: entry.options.metadata,
          createdAt: entry.createdAt,
        });
      }
      if (localMatches.length >= limit) break;
    }

    return localMatches;
  }

  /**
   * Health check for OpenMemory connection.
   */
  async health() {
    try {
      const response = await fetch(`${this.config.baseUrl.replace(/\/$/, '')}/api/health`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) {
        return { status: 'healthy', url: this.config.baseUrl };
      }
    } catch (e) {
      // Unreachable
    }
    return { status: 'fallback', url: this.config.baseUrl };
  }
}

export const openMemoryClient = new OpenMemoryAdapter();
export default openMemoryClient;
