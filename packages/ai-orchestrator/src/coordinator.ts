import pino from 'pino';
import { AgentRole, AgentDescriptor } from './types.js';

const logger = pino({ name: 'ai-agent-coordinator' });

export class AgentCoordinator {
  private registeredAgents: Map<AgentRole, AgentDescriptor> = new Map();

  constructor() {
    this.initDefaultFleet();
  }

  private initDefaultFleet(): void {
    const defaultAgents: AgentDescriptor[] = [
      {
        role: 'openclaw',
        name: 'OpenClaw Architect',
        version: '3.2.0',
        status: 'online',
        capabilities: ['codebase_architecture', 'memory_retrieval', 'terminal_execution'],
        maxConcurrentTasks: 5,
        currentTasksCount: 0,
      },
      {
        role: 'vertex_omni',
        name: 'Vertex Omni Valuator',
        version: '2.5.0',
        status: 'online',
        capabilities: ['avm_valuation', 'vector_search', 'multimodal_reasoning'],
        maxConcurrentTasks: 10,
        currentTasksCount: 0,
      },
      {
        role: 'concierge',
        name: 'WhatsApp Concierge (Laila)',
        version: '2.1.0',
        status: 'online',
        capabilities: ['bilingual_chat', 'lead_qualification', 'viewing_booking'],
        maxConcurrentTasks: 20,
        currentTasksCount: 0,
      },
      {
        role: 'closer',
        name: 'Stage-9 Deal Closer',
        version: '1.9.0',
        status: 'online',
        capabilities: ['contract_generation', 'deposit_escrow', 'kyc_verification'],
        maxConcurrentTasks: 3,
        currentTasksCount: 0,
      },
      {
        role: 'curator',
        name: 'The Curator (S3-S5)',
        version: '2.0.0',
        status: 'online',
        capabilities: ['inventory_dedup', 'quality_scoring', 'avm_refresh'],
        maxConcurrentTasks: 8,
        currentTasksCount: 0,
      },
      {
        role: 'scribe',
        name: 'The Scribe (S1-S2)',
        version: '2.0.0',
        status: 'online',
        capabilities: ['raw_parser', 'schema_normalization', 'media_extraction'],
        maxConcurrentTasks: 15,
        currentTasksCount: 0,
      },
    ];

    for (const a of defaultAgents) {
      this.registeredAgents.set(a.role, a);
    }
  }

  public getAgent(role: AgentRole): AgentDescriptor | undefined {
    return this.registeredAgents.get(role);
  }

  public listAgents(): AgentDescriptor[] {
    return Array.from(this.registeredAgents.values());
  }

  public updateAgentStatus(role: AgentRole, status: 'online' | 'busy' | 'offline' | 'idle'): void {
    const agent = this.registeredAgents.get(role);
    if (agent) {
      agent.status = status;
      logger.info({ msg: `Agent [${role}] status updated to [${status}]` });
    }
  }
}
