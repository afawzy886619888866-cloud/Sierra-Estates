import { AgentCoordinator } from './coordinator.js';
import { WorkflowRunner } from './workflow-runner.js';
import { PubSubBroker, pubsub } from './pubsub-broker.js';
import { WorkflowInstance, WorkflowResult } from './types.js';

export class AIOrchestrator {
  public readonly coordinator: AgentCoordinator;
  public readonly runner: WorkflowRunner;
  public readonly broker: PubSubBroker;

  constructor() {
    this.coordinator = new AgentCoordinator();
    this.runner = new WorkflowRunner();
    this.broker = pubsub;
  }

  /**
   * Orchestrate a full listing ingestion & valuation workflow
   */
  public async orchestrateListingPipeline(rawListingData: Record<string, any>): Promise<WorkflowResult> {
    const workflow: WorkflowInstance = {
      id: `wf-listing-${Date.now()}`,
      name: 'Listing Ingestion, Normalization & AVM Valuation Pipeline',
      triggerEvent: 'raw_listing_received',
      status: 'pending',
      context: rawListingData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: [
        {
          id: 'step-1-parse',
          name: 'Parse raw property text',
          assignedAgent: 'scribe',
          inputs: rawListingData,
          status: 'pending',
          retryCount: 0,
        },
        {
          id: 'step-2-curate',
          name: 'Deduplicate and normalize specs',
          assignedAgent: 'curator',
          inputs: {},
          status: 'pending',
          retryCount: 0,
        },
        {
          id: 'step-3-avm',
          name: 'Run Vertex AI Valuation & Pricing Score',
          assignedAgent: 'vertex_omni',
          inputs: {},
          status: 'pending',
          retryCount: 0,
        },
      ],
    };

    const result = await this.runner.executeWorkflow(workflow);

    // If successful, dispatch recommendation event
    if (result.status === 'completed') {
      await this.broker.publishRecommendation({
        recommendationId: `rec-${Date.now()}`,
        clientId: rawListingData.clientId || 'broadcast',
        listingCodes: [rawListingData.listingCode || 'NEW-LISTING-2026'],
        matchScore: 0.92,
        rationale: 'High-yield residential opportunity in 5th Settlement matching active buyer criteria.',
        suggestedAction: 'send_whatsapp',
      });
    }

    return result;
  }

  /**
   * Orchestrate a full DeepSeek multi-step reasoning, plan synthesis, and verification cycle
   */
  public async orchestrateDeepSeekReasoningCycle(
    task: string,
    context: Record<string, any> = {}
  ): Promise<WorkflowResult> {
    const workflow: WorkflowInstance = {
      id: `wf-deepseek-${Date.now()}`,
      name: `DeepSeek Reasoning Cycle: ${task.slice(0, 40)}`,
      triggerEvent: 'autonomous_reasoning_requested',
      status: 'pending',
      context,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: [
        {
          id: 'step-1-deepseek-reason',
          name: 'Multi-step Chain-of-Thought Reasoning',
          assignedAgent: 'deepseek_reasoner',
          inputs: { task, mode: 'reason' },
          status: 'pending',
          retryCount: 0,
        },
        {
          id: 'step-2-program-synthesis',
          name: 'Program Synthesis & Architectural Planning',
          assignedAgent: 'deepseek_reasoner',
          inputs: { task, mode: 'develop' },
          status: 'pending',
          retryCount: 0,
        },
        {
          id: 'step-3-invariant-evaluation',
          name: 'Evaluation Suite & Safety Verification',
          assignedAgent: 'deepseek_reasoner',
          inputs: { task, mode: 'eval' },
          status: 'pending',
          retryCount: 0,
        },
      ],
    };

    return await this.runner.executeWorkflow(workflow);
  }
}
