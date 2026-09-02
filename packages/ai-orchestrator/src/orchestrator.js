import { AgentCoordinator } from './coordinator.js';
import { WorkflowRunner } from './workflow-runner.js';
import { pubsub } from './pubsub-broker.js';


export class AIOrchestrator {
  
  
  

  constructor() {
    this.coordinator = new AgentCoordinator();
    this.runner = new WorkflowRunner();
    this.broker = pubsub;
  }

  /**
   * Orchestrate a full listing ingestion & valuation workflow
   */
   async orchestrateListingPipeline(rawListingData) {
    const workflow = {
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
}
