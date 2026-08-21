import { z } from 'zod';

export const AgentExecutionRequestSchema = z.object({
  agentId: z.string(),
  prompt: z.string(),
  sessionId: z.string().optional(),
  context: z.record(z.any()).optional(),
  memoryTags: z.array(z.string()).default([]),
  timeoutMs: z.number().default(30000),
});

export type AgentExecutionRequest = z.infer<typeof AgentExecutionRequestSchema>;

export interface AgentExecutionResponse<T = any> {
  executionId: string;
  agentId: string;
  success: boolean;
  data: T;
  memoryEntriesSaved: number;
  durationMs: number;
  error?: string;
  timestamp: string;
}

export interface SDKConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultTimeoutMs?: number;
}
