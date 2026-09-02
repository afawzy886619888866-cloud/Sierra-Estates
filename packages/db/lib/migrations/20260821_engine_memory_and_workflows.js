/**
 * Firestore Migration & Schema Definitions:
 * - engine_memory: Vector & episodic memory embeddings, tags, context payloads.
 * - engine_memory_audit: Immutable audit log for memory writes, updates, and accesses.
 * - ai_workflow_results: Multi-agent execution DAG results, metrics, error traces.
 * - propertyfinder_sync: Sync checkpoints, delta timestamps, raw vs transformed counts.
 */



























































export const FIRESTORE_COLLECTIONS = {
  ENGINE_MEMORY: 'engine_memory',
  ENGINE_MEMORY_AUDIT: 'engine_memory_audit',
  AI_WORKFLOW_RESULTS: 'ai_workflow_results',
  PROPERTYFINDER_SYNC: 'propertyfinder_sync',
} ;
