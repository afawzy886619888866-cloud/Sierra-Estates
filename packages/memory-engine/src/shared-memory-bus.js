 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * SharedMemoryBus - Unified Memory Layer for All Sierra Estates Agents
 * 
 * All agents (Sierra, Liela, Hermes, OpenClaw, CloserAgent) share this single
 * Memory bus. It wraps ObsidianMemory with agent-aware namespacing, pub/sub,
 * and structured memory categories.
 * 
 * Storage: obsidian-store.json (file-backed, persistent across restarts)
 */

import { ObsidianMemory, } from '../../obsidian/src/index.js'


// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

 




























const AGENT_NAMES = ['liela', 'sierra', 'hermes', 'openclaw', 'closer', 'super-broker', 'system', 'admin'] 

function isAgentName(value) {
  return typeof value === 'string' && AGENT_NAMES.includes(value )
}

// ─────────────────────────────────────────────────────────────────────────────
// SharedMemoryBus
// ─────────────────────────────────────────────────────────────────────────────

export class SharedMemoryBus {
  
   __init() {this.subscribers = new Map()}
   __init2() {this.expiryTimers = new Map()}

  constructor(storePath) {;SharedMemoryBus.prototype.__init.call(this);SharedMemoryBus.prototype.__init2.call(this);
    this.store = new ObsidianMemory(storePath)
    console.log('[SharedMemoryBus] Initialized. Shared memory is online.')
  }

  // ── Write ──────────────────────────────────────────────────────────────────

  async write(id, value, options) {
    const effectiveTtl = _nullishCoalesce(options.ttl, () => ( (options.ttlSeconds ? options.ttlSeconds * 1000 : undefined)))
    const allTags = ['shared', options.author, ...(_nullishCoalesce(options.tags, () => ( [])))]
    const entry = this.hydrateEntry(await this.store.set(id, {
      _meta: {
        author: options.author,
        expiresAt: effectiveTtl ? new Date(Date.now() + effectiveTtl).toISOString() : undefined,
      },
      data: value,
    }, allTags))

    // Handle TTL expiry
    if (effectiveTtl) {
      this.clearExpiryTimer(id)
      const timer = setTimeout(() => {
        void this.expire(id).catch((error) => {
          console.error(`[SharedMemoryBus] Failed to expire memory: ${id}`, error)
        })
      }, effectiveTtl)
      this.expiryTimers.set(id, timer)
    }

    this.emit('write', { type: 'write', id, author: options.author, entry })
    return entry
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async read(id) {
    const entry = await this.store.get(id)
    if (!entry) return null
    const payload = entry.value 
    // Check TTL
    if (_optionalChain([payload, 'optionalAccess', _ => _._meta, 'optionalAccess', _2 => _2.expiresAt])) {
      if (new Date(payload._meta.expiresAt ) < new Date()) {
        await this.expire(id)
        return null
      }
    }
    return _nullishCoalesce(_optionalChain([payload, 'optionalAccess', _3 => _3.data]), () => ( entry.value))
  }

  // ── Search by agent or tags ────────────────────────────────────────────────

  async search(query, tags) {
    return (await this.store.search(query, tags)).map((entry) => this.hydrateEntry(entry))
  }

  /** Get all memories written by a specific agent */
  async byAgent(agent) {
    return this.search('', [agent])
  }

  /** Get conversation history for a specific client phone number */
  async getClientHistory(phone) {
    const entries = await this.search('', ['conversation-history', `phone-${phone}`])
    return entries
      .map((e) => {
        const payload = e.value 
        return _optionalChain([payload, 'optionalAccess', _4 => _4.data])
      })
      .filter(Boolean)
  }

  /** Store a conversation turn */
  async recordConversationTurn(
    phone,
    agent,
    direction,
    message
  ) {
    const id = `conv-${phone}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    await this.write(id, { phone, agent, direction, message, at: new Date().toISOString() }, {
      author: agent,
      tags: ['conversation-history', `phone-${phone}`],
    })
  }


  /** Store a lead profile / client preferences */
  async saveLeadProfile(phone, profile, author) {
    await this.write(`lead-profile-${phone}`, profile, {
      author,
      tags: ['lead-profile', 'client-data', `phone-${phone}`],
    })
  }

  /** Get a lead profile */
  async getLeadProfile(phone) {
    return (await this.read(`lead-profile-${phone}`)) 
  }

  /** Store agent insight / learning */
  async saveInsight(key, insight, author, tags = []) {
    await this.write(`insight-${key}`, insight, {
      author,
      tags: ['agent-insight', ...tags],
    })
  }

  // ── Delete & Expiry ────────────────────────────────────────────────────────

  async delete(id) {
    this.clearExpiryTimer(id)
    await this.store.delete(id)
    this.emit('delete', { type: 'delete', id })
  }

   async expire(id) {
    await this.store.delete(id)
    this.clearExpiryTimer(id)
    this.emit('expire', { type: 'expire', id })
    console.log(`[SharedMemoryBus] Memory expired: ${id}`)
  }

   clearExpiryTimer(id) {
    const existing = this.expiryTimers.get(id)
    if (existing) {
      clearTimeout(existing)
      this.expiryTimers.delete(id)
    }
  }

   hydrateEntry(entry) {
    const payload = entry.value 
    const taggedAuthor = entry.tags.find((tag) => isAgentName(tag))
    const author = isAgentName(_optionalChain([payload, 'optionalAccess', _5 => _5._meta, 'optionalAccess', _6 => _6.author])) ? payload._meta.author : _nullishCoalesce(taggedAuthor, () => ( 'system'))
    const expiresAt = typeof _optionalChain([payload, 'optionalAccess', _7 => _7._meta, 'optionalAccess', _8 => _8.expiresAt]) === 'string' ? payload._meta.expiresAt : undefined

    return { ...entry, author, expiresAt }
  }

  // ── Pub/Sub ────────────────────────────────────────────────────────────────

  on(topic, handler) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set())
    }
    this.subscribers.get(topic).add(handler)
    return () => _optionalChain([this, 'access', _9 => _9.subscribers, 'access', _10 => _10.get, 'call', _11 => _11(topic), 'optionalAccess', _12 => _12.delete, 'call', _13 => _13(handler)])
  }

   emit(topic, event) {
    _optionalChain([this, 'access', _14 => _14.subscribers, 'access', _15 => _15.get, 'call', _16 => _16(topic), 'optionalAccess', _17 => _17.forEach, 'call', _18 => _18((fn) => {
      try { fn(event) } catch (err) {
        console.error(`[SharedMemoryBus] Subscriber error on '${topic}':`, err)
      }
    })])
    // Also emit to wildcard listeners
    _optionalChain([this, 'access', _19 => _19.subscribers, 'access', _20 => _20.get, 'call', _21 => _21('*'), 'optionalAccess', _22 => _22.forEach, 'call', _23 => _23((fn) => {
      try { fn(event) } catch (err) {
        console.error(`[SharedMemoryBus] Wildcard subscriber error:`, err)
      }
    })])
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  async stats() {
    const all = await this.store.list()
    const byAgent = {}
    all.forEach((e) => {
      const agent = e.tags.find((t) => isAgentName(t))
      if (agent) byAgent[agent] = (_nullishCoalesce(byAgent[agent], () => ( 0))) + 1
    })
    return { total: all.length, byAgent }
  }

}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton - imported by all agents
// ─────────────────────────────────────────────────────────────────────────────

let _instance = null

export function getSharedMemory(storePath) {
  if (!_instance) {
    _instance = new SharedMemoryBus(storePath)
  }
  return _instance
}

export const sharedMemory = getSharedMemory()
export default sharedMemory
