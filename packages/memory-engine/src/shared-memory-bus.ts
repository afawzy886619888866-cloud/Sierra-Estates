/**
 * SharedMemoryBus - Unified Memory Layer for All Sierra Estates Agents
 * 
 * All agents (Sierra, Liela, Hermes, OpenClaw, CloserAgent) share this single
 * Memory bus. It wraps ObsidianMemory with agent-aware namespacing, pub/sub,
 * and structured memory categories.
 * 
 * Storage: obsidian-store.json (file-backed, persistent across restarts)
 */

import { ObsidianMemory, MemoryEntry } from '@sierra-estates/obsidian'


// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AgentName = 'liela' | 'sierra' | 'hermes' | 'openclaw' | 'closer' | 'super-broker' | 'system' | 'admin'

export interface MemoryWriteOptions {
  /** Agent writing this memory */
  author: AgentName
  /** Arbitrary tags for filtering */
  tags?: string[]
  /** TTL in milliseconds. If set, memory auto-expires. */
  ttl?: number
  /** TTL in seconds (convenience alias). */
  ttlSeconds?: number
}

export interface SharedMemoryEntry extends MemoryEntry {
  author: AgentName
  expiresAt?: string
}

export type MemoryEventType = 'write' | 'delete' | 'expire'

export interface MemoryEvent {
  type: MemoryEventType
  id: string
  author?: AgentName
  entry?: SharedMemoryEntry
}

export type MemorySubscriber = (event: MemoryEvent) => void

const AGENT_NAMES = ['liela', 'sierra', 'hermes', 'openclaw', 'closer', 'super-broker', 'system'] as const

function isAgentName(value: unknown): value is AgentName {
  return typeof value === 'string' && AGENT_NAMES.includes(value as AgentName)
}

// ─────────────────────────────────────────────────────────────────────────────
// SharedMemoryBus
// ─────────────────────────────────────────────────────────────────────────────

export class SharedMemoryBus {
  private store: ObsidianMemory
  private subscribers: Map<string, Set<MemorySubscriber>> = new Map()
  private expiryTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()

  constructor(storePath?: string) {
    this.store = new ObsidianMemory(storePath)
    console.log('[SharedMemoryBus] Initialized. Shared memory is online.')
  }

  // ── Write ──────────────────────────────────────────────────────────────────

  async write(id: string, value: unknown, options: MemoryWriteOptions): Promise<SharedMemoryEntry> {
    const allTags = ['shared', options.author, ...(options.tags ?? [])]
    const entry = this.hydrateEntry(await this.store.set(id, {
      _meta: {
        author: options.author,
        expiresAt: options.ttl ? new Date(Date.now() + options.ttl).toISOString() : undefined,
      },
      data: value,
    }, allTags))

    // Handle TTL expiry
    if (options.ttl) {
      this.clearExpiryTimer(id)
      const timer = setTimeout(() => {
        void this.expire(id).catch((error) => {
          console.error(`[SharedMemoryBus] Failed to expire memory: ${id}`, error)
        })
      }, options.ttl)
      this.expiryTimers.set(id, timer)
    }

    this.emit('write', { type: 'write', id, author: options.author, entry })
    return entry
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async read(id: string): Promise<unknown | null> {
    const entry = await this.store.get(id)
    if (!entry) return null
    const payload = entry.value as { _meta: Record<string, unknown>; data: unknown }
    // Check TTL
    if (payload?._meta?.expiresAt) {
      if (new Date(payload._meta.expiresAt as string) < new Date()) {
        await this.expire(id)
        return null
      }
    }
    return payload?.data ?? entry.value
  }

  // ── Search by agent or tags ────────────────────────────────────────────────

  async search(query: string, tags?: string[]): Promise<SharedMemoryEntry[]> {
    return (await this.store.search(query, tags)).map((entry) => this.hydrateEntry(entry))
  }

  /** Get all memories written by a specific agent */
  async byAgent(agent: AgentName): Promise<SharedMemoryEntry[]> {
    return this.search('', [agent])
  }

  /** Get conversation history for a specific client phone number */
  async getClientHistory(phone: string): Promise<unknown[]> {
    const entries = await this.search('', ['conversation-history', `phone-${phone}`])
    return entries
      .map((e) => {
        const payload = e.value as { data: unknown }
        return payload?.data
      })
      .filter(Boolean)
  }

  /** Store a conversation turn */
  async recordConversationTurn(
    phone: string,
    agent: AgentName,
    direction: 'inbound' | 'outbound',
    message: string
  ): Promise<void> {
    const id = `conv-${phone}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    await this.write(id, { phone, agent, direction, message, at: new Date().toISOString() }, {
      author: agent,
      tags: ['conversation-history', `phone-${phone}`],
    })
  }


  /** Store a lead profile / client preferences */
  async saveLeadProfile(phone: string, profile: Record<string, unknown>, author: AgentName): Promise<void> {
    await this.write(`lead-profile-${phone}`, profile, {
      author,
      tags: ['lead-profile', 'client-data', `phone-${phone}`],
    })
  }

  /** Get a lead profile */
  async getLeadProfile(phone: string): Promise<Record<string, unknown> | null> {
    return (await this.read(`lead-profile-${phone}`)) as Record<string, unknown> | null
  }

  /** Store agent insight / learning */
  async saveInsight(key: string, insight: unknown, author: AgentName, tags: string[] = []): Promise<void> {
    await this.write(`insight-${key}`, insight, {
      author,
      tags: ['agent-insight', ...tags],
    })
  }

  // ── Delete & Expiry ────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    this.clearExpiryTimer(id)
    await this.store.delete(id)
    this.emit('delete', { type: 'delete', id })
  }

  private async expire(id: string): Promise<void> {
    await this.store.delete(id)
    this.clearExpiryTimer(id)
    this.emit('expire', { type: 'expire', id })
    console.log(`[SharedMemoryBus] Memory expired: ${id}`)
  }

  private clearExpiryTimer(id: string): void {
    const existing = this.expiryTimers.get(id)
    if (existing) {
      clearTimeout(existing)
      this.expiryTimers.delete(id)
    }
  }

  private hydrateEntry(entry: MemoryEntry): SharedMemoryEntry {
    const payload = entry.value as { _meta?: { author?: unknown; expiresAt?: unknown } } | undefined
    const taggedAuthor = entry.tags.find((tag) => isAgentName(tag))
    const author = isAgentName(payload?._meta?.author) ? payload._meta.author : taggedAuthor ?? 'system'
    const expiresAt = typeof payload?._meta?.expiresAt === 'string' ? payload._meta.expiresAt : undefined

    return { ...entry, author, expiresAt }
  }

  // ── Pub/Sub ────────────────────────────────────────────────────────────────

  on(topic: string, handler: MemorySubscriber): () => void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set())
    }
    this.subscribers.get(topic)!.add(handler)
    return () => this.subscribers.get(topic)?.delete(handler)
  }

  private emit(topic: string, event: MemoryEvent): void {
    this.subscribers.get(topic)?.forEach((fn) => {
      try { fn(event) } catch (err) {
        console.error(`[SharedMemoryBus] Subscriber error on '${topic}':`, err)
      }
    })
    // Also emit to wildcard listeners
    this.subscribers.get('*')?.forEach((fn) => {
      try { fn(event) } catch (err) {
        console.error(`[SharedMemoryBus] Wildcard subscriber error:`, err)
      }
    })
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  async stats(): Promise<{ total: number; byAgent: Record<string, number> }> {
    const all = await this.store.list()
    const byAgent: Record<string, number> = {}
    all.forEach((e: MemoryEntry) => {
      const agent = e.tags.find((t: string) => isAgentName(t))
      if (agent) byAgent[agent] = (byAgent[agent] ?? 0) + 1
    })
    return { total: all.length, byAgent }
  }

}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton - imported by all agents
// ─────────────────────────────────────────────────────────────────────────────

let _instance: SharedMemoryBus | null = null

export function getSharedMemory(storePath?: string): SharedMemoryBus {
  if (!_instance) {
    _instance = new SharedMemoryBus(storePath)
  }
  return _instance
}

export const sharedMemory = getSharedMemory()
export default sharedMemory
