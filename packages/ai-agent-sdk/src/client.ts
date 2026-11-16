import { MemoryClient } from './memory-client.js';
import { AgentExecutionRequest, AgentExecutionResponse, SDKConfig } from './types.js';

export class SierraAgentClient {
  public readonly memory: MemoryClient;
  private config: SDKConfig;

  constructor(config: SDKConfig = {}) {
    this.config = {
      defaultTimeoutMs: config.defaultTimeoutMs || 30000,
      ...config,
    };
    this.memory = new MemoryClient();
  }

  /**
   * Dispatch task to a Sierra Estates agent
   */
  public async runTask(request: AgentExecutionRequest): Promise<AgentExecutionResponse> {
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
