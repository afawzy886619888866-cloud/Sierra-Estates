 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }














const EXECUTIONS = 'agent_executions'
const AGENTS = 'agent_profiles'
const CONTEXTS = 'agent_contexts'










export class FirestoreMemoryStore  {
   __init() {this.name = 'firestore'}
   __init2() {this.db = null}
   __init3() {this.resolving = null}
  

  constructor( config = {}) {;this.config = config;FirestoreMemoryStore.prototype.__init.call(this);FirestoreMemoryStore.prototype.__init2.call(this);FirestoreMemoryStore.prototype.__init3.call(this);
    this.db = _nullishCoalesce(config.db, () => ( null))
    this.namespace = config.namespace ? `${config.namespace}_` : ''
  }

   col(name) {
    return `${this.namespace}${name}`
  }

  /** Resolve firebase-admin at runtime; cache the promise so we try once. */
   async getDb() {
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

        if (!_optionalChain([admin, 'access', _ => _.apps, 'optionalAccess', _2 => _2.length])) {
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
      } catch (e) {
        return null
      }
    })()

    return this.resolving
  }

  async appendExecution(log) {
    const db = await this.getDb()
    if (!db) return
    const ts = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp)
    await db.collection(this.col(EXECUTIONS)).add({
      agentId: log.agentId,
      action: log.action,
      success: Boolean(log.success),
      // Firestore rejects `undefined`; normalise the optional fields.
      result: _nullishCoalesce(log.result, () => ( null)),
      error: _nullishCoalesce(log.error, () => ( null)),
      skillsUsed: _nullishCoalesce(log.skillsUsed, () => ( [])),
      context: _nullishCoalesce(log.context, () => ( {})),
      timestamp: ts.toISOString(),
      ts: ts.getTime(),
    })
  }

  async queryExecutions(query = {}) {
    const db = await this.getDb()
    if (!db) return []

    let ref = db.collection(this.col(EXECUTIONS))
    if (query.agentId) ref = ref.where('agentId', '==', query.agentId)
    if (query.action) ref = ref.where('action', '==', query.action)
    if (query.since) ref = ref.where('ts', '>=', new Date(query.since).getTime())

    ref = ref.orderBy('ts', 'desc').limit(Math.min(_nullishCoalesce(query.limit, () => ( 500)), 2000))

    const snap = await ref.get()
    return snap.docs.map((d) => {
      const v = d.data()
      return {
        agentId: v.agentId,
        action: v.action,
        success: v.success,
        result: _nullishCoalesce(v.result, () => ( undefined)),
        error: _nullishCoalesce(v.error, () => ( undefined)),
        skillsUsed: _nullishCoalesce(v.skillsUsed, () => ( [])),
        context: _nullishCoalesce(v.context, () => ( {})),
        timestamp: new Date(_nullishCoalesce(v.timestamp, () => ( v.ts))),
      } 
    })
  }

  async saveAgent(agent) {
    const db = await this.getDb()
    if (!db) return
    await db
      .collection(this.col(AGENTS))
      .doc(agent.id)
      .set({ ...agent, updatedAt: Date.now() }, { merge: true })
  }

  async listAgents() {
    const db = await this.getDb()
    if (!db) return []
    const snap = await db.collection(this.col(AGENTS)).get()
    return snap.docs.map((d) => d.data() )
  }

  async saveContext(agentId, context) {
    const db = await this.getDb()
    if (!db) return
    await db
      .collection(this.col(CONTEXTS))
      .doc(agentId)
      .set({ context, updatedAt: Date.now() }, { merge: true })
  }

  async loadContext(agentId) {
    const db = await this.getDb()
    if (!db) return undefined
    const doc = await db.collection(this.col(CONTEXTS)).doc(agentId).get()
    return doc.exists ? (_optionalChain([doc, 'access', _3 => _3.data, 'call', _4 => _4(), 'optionalAccess', _5 => _5.context]) ) : undefined
  }

  async healthy() {
    return Boolean(await this.getDb())
  }
}
