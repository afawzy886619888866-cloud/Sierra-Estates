import { z } from 'zod';

export type AgentRole =
  | 'openclaw'
  | 'vertex_omni'
  | 'concierge'
  | 'closer'
  | 'curator'
  | 'scribe'
  | 'scraper';

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

export interface WorkflowStep {
  id: string;
  name: string;
  assignedAgent: AgentRole;
  inputs: Record<string, any>;
  status: WorkflowStatus;
  output?: Record<string, any>;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
}

export interface WorkflowInstance {
  id: string;
  name: string;
  triggerEvent: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  context: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export const WorkflowResultSchema = z.object({
  workflowId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'paused']),
  results: z.record(z.any()),
  metrics: z.object({
    durationMs: z.number(),
    stepsTotal: z.number(),
    stepsCompleted: z.number(),
    tokensUsed: z.number().optional(),
  }),
  timestamp: z.string(),
});

export type WorkflowResult = z.infer<typeof WorkflowResultSchema>;

export interface AgentDescriptor {
  role: AgentRole;
  name: string;
  version: string;
  status: 'online' | 'busy' | 'offline' | 'idle';
  capabilities: string[];
  maxConcurrentTasks: number;
  currentTasksCount: number;
}
