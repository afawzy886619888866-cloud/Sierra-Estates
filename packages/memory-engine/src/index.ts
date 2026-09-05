/**
 * Memory Engine - Public API
 */

export { MemoryEngine, memoryEngine, type MemoryEngineConfig } from './memory-engine'
export type { Agent, Context, ExecutionLog, Pattern, Skill, MessageHandler } from './types'
export { SharedMemoryBus, sharedMemory, getSharedMemory, type SharedMemoryEntry, type MemoryEvent, type MemoryWriteOptions, type AgentName } from './shared-memory-bus'
export { MemoryPalace, mempalace, type MemoryPalaceEntry, type MemoryPalaceQueryResult } from './mempalace'
export { OpenMemoryAdapter, openMemoryClient, type OpenMemoryConfig, type OpenMemoryStoreOptions, type OpenMemoryQueryResult } from './openmemory-adapter'

/* Durable persistence — the layer that makes learning survive a cold start. */
export type { MemoryStore, ExecutionLogQuery } from './stores/types'
export { InMemoryStore } from './stores/memory-store'
export { SupabaseMemoryStore, type SupabaseStoreConfig } from './stores/supabase-store'

/* Learning loop: measured skill selection. */
export {
  wilsonLowerBound,
  scoreSkills,
  rankSkills,
  chooseSkills,
  summarisePatterns,
  type SkillScore,
  type RankOptions
} from './learning'

/* Eval harness: makes "it improved" a falsifiable claim. */
export {
  runEval,
  compareRuns,
  scenariosFromHistory,
  type EvalScenario,
  type EvalCaseResult,
  type EvalRunResult,
  type RegressionVerdict,
  type ScenarioRunner
} from './eval-harness'

/* Agent instrumentation. */
export { instrument, recordRun, type InstrumentedResult } from './instrument'
