import { registry } from './registry';
import { obsidian } from '@sierra-estates/obsidian';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  brainRAG,
  mempalace,
  memoryEngine,
  type GoalAlignedContextDirective,
} from '@sierra-estates/memory-engine';

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
   * Get direct access to the Unified Memory Brain (Obsidian + ECC RAG)
   */
  getMemoryBrain() {
    return brainRAG;
  }

  /**
   * Get direct access to the Memory Palace
   */
  getMemoryPalace() {
    return mempalace;
  }

  /**
   * Get direct access to the ECC Memory Engine
   */
  getMemoryEngine() {
    return memoryEngine;
  }

  /**
   * Track an owner price drop into ECC and mirror to Memory Palace
   */
  trackPriceReduction(
    entityId: string,
    oldPrice: number,
    newPrice: number,
    sourceChannel = 'Agent Network',
    actor = 'Owner Direct'
  ) {
    const result = brainRAG.ecc.trackPriceReduction(entityId, oldPrice, newPrice, sourceChannel, actor);
    mempalace.store({
      id: `price-drop-${entityId}-${Date.now()}`,
      room: 'listings',
      drawer: 'distressed-deals',
      content: `Unit ${entityId} dropped from ${oldPrice.toLocaleString()} EGP to ${newPrice.toLocaleString()} EGP (${result.dropPct.toFixed(1)}% drop). Hot Deal: ${result.isHotDeal}`,
      timestamp: new Date().toISOString(),
    });
    return result;
  }

  /**
   * Get all active distressed deals (price drop >= 8%) from ECC
   */
  getDistressedDeals(limit = 10) {
    return brainRAG.ecc.getHotDeals(limit);
  }

  /**
   * Record buyer preferences into ECC and mirror to Memory Palace
   */
  recordBuyerPreference(
    buyerPhone: string,
    preferredCompound: string,
    maxBudgetEGP: number,
    bedrooms?: number,
    propertyType?: string
  ) {
    const result = brainRAG.ecc.upsertEntity({
      id: buyerPhone,
      type: 'buyer',
      contact: buyerPhone,
      compound: preferredCompound,
      budgetRange: { min: 0, max: maxBudgetEGP },
      targetPropertyType: propertyType,
      tags: ['buyer', preferredCompound],
      lastUpdated: new Date().toISOString(),
    });
    mempalace.store({
      id: `buyer-pref-${buyerPhone}-${Date.now()}`,
      room: 'leads',
      drawer: 'buyer-profiles',
      content: `Buyer ${buyerPhone}: compound=${preferredCompound}, maxBudget=${maxBudgetEGP.toLocaleString()} EGP, beds=${bedrooms || 'any'}, type=${propertyType || 'any'}`,
      timestamp: new Date().toISOString(),
    });
    return result;
  }

  /**
   * Executes a single agent task. The system prompt is automatically enriched
   * with Obsidian shared memory, Memory Palace vector context, and ECC Episodic RAG.
   */
  async runAgentTask(
    agentName: string,
    taskDescription: string,
    additionalContext?: string,
    options: {
      entityId?: string;
      compound?: string;
    } = {}
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

    const t0 = Date.now();
    try {
      // 1. Fetch Shared Knowledge from Obsidian Memory & Unified Skills Catalog
      const sharedIntel = await this.getSharedKnowledge();
      const skillsCatalog = registry.getSkillsCatalogSummary();

      // 2. Fetch Goal-Aligned RAG Directive (Obsidian Vault + ECC Episodic/Entity Memory)
      const brainContext: GoalAlignedContextDirective = brainRAG.queryBrainRAG(
        taskDescription,
        {
          entityId: options.entityId,
          compound: options.compound,
          maxVaultResults: 3,
          maxEpisodes: 3,
        }
      );

      // 3. Query Memory Palace for relevant listings/leads/negotiations
      const palaceResults = mempalace.search({
        keyword: taskDescription,
        limit: 3,
      });
      const palaceIntel = palaceResults.length > 0
        ? palaceResults.map(p => `[Room: ${p.entry.room} / ${p.entry.drawer}] ${p.entry.content}`).join('\n')
        : 'No specific memory palace items matched.';

      // 4. Synthesize System Prompt containing the Agent's profile + Shared Knowledge + Skills + RAG & Palace
      const enrichedSystemPrompt = `
${agent.systemPrompt}

=========================================
🛠️ UNIFIED SKILLS & CAPABILITIES CATALOG
=========================================
You have direct access and awareness of all specialized skills in Sierra Estates:
${skillsCatalog}

=========================================
🧠 SHARED COGNITIVE MEMORY (OBSIDIAN STORE)
=========================================
All agents share the knowledge below:
${sharedIntel}

=========================================
🏛️ MEMORY PALACE (MULTI-ROOM VECTOR CONTEXT)
=========================================
${palaceIntel}

=========================================
⚡ EPISODIC CONTEXT & GOAL DIRECTIVE (ECC + RAG)
=========================================
${brainContext.formattedDirective}
=========================================
`;

      // 5. Synthesize User Prompt
      const userPrompt = `
TASK DESCRIPTION:
${taskDescription}

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}` : ''}

Please execute this task and return your final response/results. Ensure your response is detailed, professional, and directly addresses the goal.
`;

      // 6. Execute Completion
      const output = await this.executeCompletion(
        agent.name,
        'execute-task',
        enrichedSystemPrompt.trim(),
        userPrompt.trim()
      );

      const durationMs = Date.now() - t0;

      // 7. Save the output to Obsidian Shared Memory
      await this.addSharedKnowledge(
        `agent-task-${agentName}-${Date.now()}`,
        {
          taskDescription,
          output,
        },
        [agentName, 'task-execution']
      );

      // 8. Store in Memory Palace
      mempalace.store({
        id: `agent-out-${agentName}-${Date.now()}`,
        room: 'general',
        drawer: agentName,
        content: `Agent ${agentName} executed task: ${taskDescription}\nResult: ${output.slice(0, 300)}...`,
        timestamp: new Date().toISOString(),
      });

      // 9. Record execution in MemoryEngine Learning Loop
      memoryEngine.logExecution({
        agentId: agentName,
        action: 'execute-task',
        timestamp: new Date(),
        success: true,
        skillsUsed: [agentName],
        context: {
          taskDescription,
          durationMs,
        },
      });

      return {
        agentName,
        status: 'success',
        output,
      };
    } catch (err: any) {
      const durationMs = Date.now() - t0;
      console.error(`[Orchestrator] Failed task execution for ${agentName}:`, err);

      memoryEngine.logExecution({
        agentId: agentName,
        action: 'execute-task',
        timestamp: new Date(),
        success: false,
        error: err.message || String(err),
        skillsUsed: [agentName],
        context: {
          taskDescription,
          durationMs,
        },
      });

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
