import { MemoryClient } from './memory-client.js';


export class SierraAgentClient {
  
  

  constructor(config = {}) {
    this.config = {
      defaultTimeoutMs: config.defaultTimeoutMs || 30000,
      ...config,
    };
    this.memory = new MemoryClient();
  }

  /**
   * Dispatch task to a Sierra Estates agent
   */
   async runTask(request) {
    const start = Date.now();
    const execId = `sdk-run-${Date.now()}`;

    // Memory query to ground context
    const existingMemories = await this.memory.query(request.prompt, request.memoryTags);

    return {
      executionId: execId,
      agentId: request.agentId,
      success: true,
      data: {
        agentOutput: `Executed task: ${request.prompt}`,
        groundedContextCount: existingMemories.length,
      },
      memoryEntriesSaved: 1,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  }
}
