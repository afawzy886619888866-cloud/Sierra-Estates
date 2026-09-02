import { z } from 'zod';

export const AgentExecutionRequestSchema = z.object({
  agentId: z.string(),
  prompt: z.string(),
  sessionId: z.string().optional(),
  context: z.record(z.string(), z.any()).optional(),
  memoryTags: z.array(z.string()).default([]),
  timeoutMs: z.number().default(30000),
});

 

















