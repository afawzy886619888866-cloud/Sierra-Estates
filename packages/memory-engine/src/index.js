/**
 * Memory Engine - Public API
 */

export { MemoryEngine, memoryEngine, } from './memory-engine'

export { SharedMemoryBus, sharedMemory, getSharedMemory, } from './shared-memory-bus'
export { MemoryPalace, mempalace, } from './mempalace'
export { OpenMemoryAdapter, openMemoryClient, } from './openmemory-adapter'

/* Durable persistence — the layer that makes learning survive a cold start. */

export { InMemoryStore } from './stores/memory-store'
export { FirestoreMemoryStore, } from './stores/firestore-store'
export { SupabaseMemoryStore, } from './stores/supabase-store'

/* Learning loop: measured skill selection. */
export {
  wilsonLowerBound,
  scoreSkills,
  rankSkills,
  chooseSkills,
  summarisePatterns,


} from './learning'

/* Eval harness: makes "it improved" a falsifiable claim. */
export {
  runEval,
  compareRuns,
  scenariosFromHistory,





} from './eval-harness'

/* Agent instrumentation. */
export { instrument, recordRun, } from './instrument'
