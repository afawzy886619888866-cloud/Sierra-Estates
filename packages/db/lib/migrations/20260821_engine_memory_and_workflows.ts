/**
 * Firestore Migration & Schema Definitions:
 * - engine_memory: Vector & episodic memory embeddings, tags, context payloads.
 * - engine_memory_audit: Immutable audit log for memory writes, updates, and accesses.
 * - ai_workflow_results: Multi-agent execution DAG results, metrics, error traces.
 * - propertyfinder_sync: Sync checkpoints, delta timestamps, raw vs transformed counts.
 */

export interface EngineMemoryDoc {
  id: string;
  key: string;
  value: any;
  tags: string[];
  embeddingVector?: number[];
  importanceScore: number; // 0.0 - 1.0
  sourceAgent: string;
  ttlSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EngineMemoryAuditDoc {
  id: string;
  memoryId: string;
  action: 'create' | 'update' | 'delete' | 'read';
  actorId: string;
  actorType: 'agent' | 'user' | 'system';
  previousValue?: any;
  newValue?: any;
  reason?: string;
  timestamp: string;
}

export interface AIWorkflowResultDoc {
  id: string;
  workflowId: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  triggerSource: string;
  stepsCount: number;
  durationMs: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  results: Record<string, any>;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PropertyFinderSyncDoc {
  id: string;
  syncId: string;
  status: 'in_progress' | 'completed' | 'failed' | 'partial';
  startedAt: string;
  completedAt?: string;
  cursorTimestamp?: string;
  itemsFetched: number;
  itemsIngested: number;
  itemsSkipped: number;
  errors: Array<{ listingId: string; error: string }>;
  triggeredBy: string;
}

export const FIRESTORE_COLLECTIONS = {
  ENGINE_MEMORY: 'engine_memory',
  ENGINE_MEMORY_AUDIT: 'engine_memory_audit',
  AI_WORKFLOW_RESULTS: 'ai_workflow_results',
  PROPERTYFINDER_SYNC: 'propertyfinder_sync',
} as const;
