/**
 * Firestore-backed memory store.
 *
 * Firestore is the pragmatic backend here: the project already runs it
 * (`sierra-blu`), both Vercel projects already carry its credentials, and it
 * survives serverless cold starts — which the in-process maps do not.
 *
 * The Admin SDK is resolved lazily and defensively so this package stays
 * importable in environments without firebase-admin (tests, the browser
 * bundle, local scripts). If it cannot be resolved, the store reports
 * unhealthy and the engine falls back to memory-only rather than crashing.
 */
import type { MemoryStore, ExecutionLogQuery } from './types'
import type { ExecutionLog, Agent, Context } from '../types'

const EXECUTIONS = 'agent_executions'
const AGENTS = 'agent_profiles'
const CONTEXTS = 'agent_contexts'

type AnyDb = any

export interface FirestoreStoreConfig {
  /** Pass an already-initialised Firestore instance to skip auto-resolution. */
  db?: AnyDb
  /** Collection prefix, so staging and production can share a project. */
  namespace?: string
}

export class FirestoreMemoryStore implements MemoryStore {
  readonly name = 'firestore'
  private db: AnyDb | null = null
  private resolving: Promise<AnyDb | null> | null = null
  private readonly namespace: string

  constructor(private config: FirestoreStoreConfig = {}) {
    this.db = config.db ?? null
    this.namespace = config.namespace ? `${config.namespace}_` : ''
  }

  private col(name: string): string {
    return `${this.namespace}${name}`
  }

  /** Resolve firebase-admin at runtime; cache the promise so we try once. */
  private async getDb(): Promise<AnyDb | null> {
    if (this.db) return this.db
    if (this.resolving) return this.resolving

    this.resolving = (async () => {
      try {
        // Indirect require keeps bundlers from hard-linking firebase-admin.
        const req =
          typeof module !== 'undefined' && typeof module.require === 'function'
            ? module.require.bind(module)
            : eval('require')
        const admin = req('firebase-admin')

        if (!admin.apps?.length) {
          const raw =
            process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
            process.env.FIREBASE_SERVICE_ACCOUNT
          if (raw) {
            admin.initializeApp({
              credential: admin.credential.cert(JSON.parse(raw)),
            })
          } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            admin.initializeApp({ credential: admin.credential.applicationDefault() })
          } else {
            return null // No credentials — stay unhealthy, don't throw.
          }
        }

        this.db = admin.firestore()
        return this.db
      } catch {
        return null
      }
    })()

    return this.resolving
  }

  async appendExecution(log: ExecutionLog): Promise<void> {
    const db = await this.getDb()
    if (!db) return
    const ts = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp)
    await db.collection(this.col(EXECUTIONS)).add({
      agentId: log.agentId,
      action: log.action,
      success: Boolean(log.success),
      // Firestore rejects `undefined`; normalise the optional fields.
      result: log.result ?? null,
      error: log.error ?? null,
      skillsUsed: log.skillsUsed ?? [],
      context: log.context ?? {},
      timestamp: ts.toISOString(),
      ts: ts.getTime(),
    })
  }

  async queryExecutions(query: ExecutionLogQuery = {}): Promise<ExecutionLog[]> {
    const db = await this.getDb()
    if (!db) return []

    let ref: AnyDb = db.collection(this.col(EXECUTIONS))
    if (query.agentId) ref = ref.where('agentId', '==', query.agentId)
    if (query.action) ref = ref.where('action', '==', query.action)
    if (query.since) ref = ref.where('ts', '>=', new Date(query.since).getTime())

    ref = ref.orderBy('ts', 'desc').limit(Math.min(query.limit ?? 500, 2000))

    const snap = await ref.get()
    return snap.docs.map((d: AnyDb) => {
      const v = d.data()
      return {
        agentId: v.agentId,
        action: v.action,
        success: v.success,
        result: v.result ?? undefined,
        error: v.error ?? undefined,
        skillsUsed: v.skillsUsed ?? [],
        context: v.context ?? {},
        timestamp: new Date(v.timestamp ?? v.ts),
      } as ExecutionLog
    })
  }

  async saveAgent(agent: Agent): Promise<void> {
    const db = await this.getDb()
    if (!db) return
    await db
      .collection(this.col(AGENTS))
      .doc(agent.id)
      .set({ ...agent, updatedAt: Date.now() }, { merge: true })
  }

  async listAgents(): Promise<Agent[]> {
    const db = await this.getDb()
    if (!db) return []
    const snap = await db.collection(this.col(AGENTS)).get()
    return snap.docs.map((d: AnyDb) => d.data() as Agent)
  }

  async saveContext(agentId: string, context: Context): Promise<void> {
    const db = await this.getDb()
    if (!db) return
    await db
      .collection(this.col(CONTEXTS))
      .doc(agentId)
      .set({ context, updatedAt: Date.now() }, { merge: true })
  }

  async loadContext(agentId: string): Promise<Context | undefined> {
    const db = await this.getDb()
    if (!db) return undefined
    const doc = await db.collection(this.col(CONTEXTS)).doc(agentId).get()
    return doc.exists ? (doc.data()?.context as Context) : undefined
  }

  async healthy(): Promise<boolean> {
    return Boolean(await this.getDb())
  }
}
