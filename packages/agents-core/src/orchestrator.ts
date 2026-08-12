import { registry } from './registry';
import { obsidian } from '@sierra-estates/obsidian';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface OrchestratorConfig {
  apiKey?: string;
  defaultModel?: string;
  runCompletion?: (agentName: string, stage: string, systemPrompt: string, userPrompt: string) => Promise<string>;
}

export interface TaskResult {
  agentName: string;
  status: 'success' | 'failed';
  output: string;
  error?: string;
}

export class AgentOrchestrator {
  private genAI: GoogleGenerativeAI | null = null;
  private defaultModel: string;
  private runCompletionCustom?: OrchestratorConfig['runCompletion'];

  constructor(config: OrchestratorConfig = {}) {
    const apiKey = config.apiKey || process.env.GOOGLE_AI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    this.defaultModel = config.defaultModel || 'gemini-flash-latest';
    this.runCompletionCustom = config.runCompletion;
  }

  /**
   * Helper to execute completions, using custom callback or direct SDK
   */
  private async executeCompletion(
    agentName: string,
    stage: string,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    if (this.runCompletionCustom) {
      return this.runCompletionCustom(agentName, stage, systemPrompt, userPrompt);
    }

    if (!this.genAI) {
      throw new Error(
        `[AgentOrchestrator] Direct execution failed: GOOGLE_AI_API_KEY is not configured.`
      );
    }

    const model = this.genAI.getGenerativeModel({
      model: this.defaultModel,
      generationConfig: { temperature: 0.2 },
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(userPrompt);
    return result.response.text();
  }

  /**
   * Query all shared knowledge stored in Obsidian Memory
   */
  async getSharedKnowledge(): Promise<string> {
    const memories = await obsidian.search('', ['shared-knowledge']);
    if (memories.length === 0) {
      return 'No prior shared knowledge found.';
    }

    return memories
      .map(
        (m: any) =>
          `[Source: ${m.id} | Date: ${m.updatedAt}]\nTags: ${m.tags.join(', ')}\nContent: ${
            typeof m.value === 'string' ? m.value : JSON.stringify(m.value, null, 2)
          }`
      )
      .join('\n\n---\n\n');
  }

  /**
   * Add new knowledge to the shared memory pool
   */
  async addSharedKnowledge(id: string, value: any, tags: string[] = []): Promise<void> {
    const allTags = ['shared-knowledge', ...tags];
    await obsidian.set(id, value, allTags);
  }

  /**
   * Executes a single agent task. The system prompt is automatically enriched
   * with the shared knowledge of all other agents from Obsidian memory.
   */
  async runAgentTask(
    agentName: string,
    taskDescription: string,
    additionalContext?: string
  ): Promise<TaskResult> {
    console.log(`[Orchestrator] Starting task for agent: ${agentName}`);

    const agent = registry.getAgent(agentName);
    if (!agent) {
      return {
        agentName,
        status: 'failed',
        output: '',
        error: `Agent "${agentName}" not found in registry.`,
      };
    }

    try {
      // 1. Fetch Shared Knowledge from Obsidian Memory
      const sharedIntel = await this.getSharedKnowledge();

      // 2. Synthesize System Prompt containing the Agent's profile + Shared Knowledge
      const enrichedSystemPrompt = `
${agent.systemPrompt}

=========================================
🧠 SHARED COGNITIVE MEMORY (OBSIDIAN STORE)
=========================================
All agents share the knowledge below. You must use this context to inform your decision-making and ensure alignment with other specialists' progress and findings:

${sharedIntel}
=========================================
`;

      // 3. Synthesize User Prompt
      const userPrompt = `
TASK DESCRIPTION:
${taskDescription}

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}` : ''}

Please execute this task and return your final response/results. Ensure your response is detailed, professional, and directly addresses the goal.
`;

      // 4. Execute Completion
      const output = await this.executeCompletion(
        agent.name,
        'execute-task',
        enrichedSystemPrompt.trim(),
        userPrompt.trim()
      );

      // 5. Save the output to Shared Memory so other agents learn from this execution
      await this.addSharedKnowledge(
        `agent-task-${agentName}-${Date.now()}`,
        {
          taskDescription,
          output,
        },
        [agentName, 'task-execution']
      );

      return {
        agentName,
        status: 'success',
        output,
      };
    } catch (err: any) {
      console.error(`[Orchestrator] Failed task execution for ${agentName}:`, err);
      return {
        agentName,
        status: 'failed',
        output: '',
        error: err.message || String(err),
      };
    }
  }

  /**
   * Coordinated pipeline execution. Orchestrates multiple agents in sequence.
   */
  async orchestratePipeline(
    pipelineName: string,
    steps: Array<{ agentName: string; taskDescription: string }>,
    initialContext?: string
  ): Promise<TaskResult[]> {
    console.log(`🚀 [Orchestrator] Running coordinated pipeline: ${pipelineName}`);
    
    // Save initial context to shared memory
    if (initialContext) {
      await this.addSharedKnowledge(`${pipelineName}-initial-context`, initialContext, ['pipeline-context']);
    }

    const results: TaskResult[] = [];

    for (const step of steps) {
      const result = await this.runAgentTask(
        step.agentName,
        step.taskDescription,
        `Pipeline Step Context: Running pipeline "${pipelineName}"`
      );
      results.push(result);
      if (result.status === 'failed') {
        console.warn(`⚠️ [Orchestrator] Step failed for ${step.agentName}. Continuing pipeline...`);
      }
    }

    return results;
  }
}
