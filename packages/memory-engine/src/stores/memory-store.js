 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }







export class InMemoryStore  {
   __init() {this.name = 'memory'}
   __init2() {this.executions = []}
   __init3() {this.agents = new Map()}
   __init4() {this.contexts = new Map()}
  

  constructor(cap = 5000) {;InMemoryStore.prototype.__init.call(this);InMemoryStore.prototype.__init2.call(this);InMemoryStore.prototype.__init3.call(this);InMemoryStore.prototype.__init4.call(this);
    this.cap = cap
  }

  async appendExecution(log) {
    this.executions.push(log)
    // Bound the array so a long-lived process cannot leak unboundedly.
    if (this.executions.length > this.cap) {
      this.executions.splice(0, this.executions.length - this.cap)
    }
  }

  async queryExecutions(query = {}) {
    let out = [...this.executions]
    if (query.agentId) out = out.filter((l) => l.agentId === query.agentId)
    if (query.action) out = out.filter((l) => l.action === query.action)
    if (query.since) {
      const floor = new Date(query.since).getTime()
      out = out.filter((l) => new Date(l.timestamp).getTime() >= floor)
    }
    out.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return out.slice(0, _nullishCoalesce(query.limit, () => ( 500)))
  }

  async saveAgent(agent) {
    this.agents.set(agent.id, agent)
  }

  async listAgents() {
    return [...this.agents.values()]
  }

  async saveContext(agentId, context) {
    this.contexts.set(agentId, context)
  }

  async loadContext(agentId) {
    return this.contexts.get(agentId)
  }

  async healthy() {
    return true
  }
}
