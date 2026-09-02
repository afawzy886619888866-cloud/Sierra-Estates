import { MemoryClient } from './memory-client.js';


export  class BaseAgent {
  
  
  

  constructor(agentId, name) {
    this.agentId = agentId;
    this.name = name;
    this.memory = new MemoryClient();
  }

  

   async execute(request) {
    const startedAt = Date.now();
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    try {
      const data = await this.handleTask(request);
      const durationMs = Date.now() - startedAt;

      let saved = 0;
      if (request.memoryTags && request.memoryTags.length > 0) {
        await this.memory.save(`task-${executionId}`, {
          prompt: request.prompt,
          result: data,
        }, request.memoryTags);
        saved = 1;
      }

      return {
        executionId,
        agentId: this.agentId,
        success: true,
        data,
        memoryEntriesSaved: saved,
        durationMs,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      return {
        executionId,
        agentId: this.agentId,
        success: false,
        data: null,
        memoryEntriesSaved: 0,
        durationMs,
        error: err.message || 'Execution error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
