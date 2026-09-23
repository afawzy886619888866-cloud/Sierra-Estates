#!/usr/bin/env tsx
/**
 * Sierra Estates — Master Unified Engine Activator & Harness Wakeup
 * 
 * Unifies:
 *  1. DeepSeek Reasoning & Evaluation Harness (@sierra-estates/deepseek-harness)
 *  2. Episodic Context Cache & Obsidian Memory Engine (@sierra-estates/memory-engine, @sierra-estates/obsidian)
 *  3. Dify Multi-Agent Orchestrator Adapter (@sierra-estates/ai-orchestrator)
 *  4. Agent Personas (Scribe, Curator, Matchmaker, Closer, Evaluator)
 */

import { DeepSeekHarness } from '../packages/deepseek-harness/src/harness.js';
import { ObsidianMemory } from '../packages/obsidian/src/index.js';
import { DifyAgentAdapter } from '../packages/ai-orchestrator/src/dify-adapter.js';

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   ⚡ SIERRA ESTATES — UNIFIED AUTONOMOUS ENGINE & HARNESS WAKEUP   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  // 1. Memory Engine Wakeup
  console.log('🧠 [1/4] Waking up Memory Engine (Obsidian + Episodic Cache)...');
  const memory = new ObsidianMemory();
  const testEntry = await memory.set(
    'engine-wakeup-check',
    { status: 'active', initializedAt: new Date().toISOString() },
    ['system', 'health-check', 'engine']
  );
  const totalMemories = (await memory.list()).length;
  console.log(`   ✅ Memory Engine operational. Persistent entry verified: ${testEntry.id} (Total entries: ${totalMemories})\n`);

  // 2. DeepSeek Reasoning & Evaluation Harness Wakeup
  console.log('🔬 [2/4] Waking up DeepSeek Evaluation Harness & Benchmarks...');
  const harness = new DeepSeekHarness();
  const suiteReport = await harness.runFullSuite();
  console.log(`   ✅ DeepSeek Harness Benchmark Suite Completed:`);
  console.log(`      - Scenarios Evaluated : ${suiteReport.totalScenarios}`);
  console.log(`      - Passed Scenarios    : ${suiteReport.passedCount}/${suiteReport.totalScenarios}`);
  console.log(`      - Overall Accuracy    : ${(suiteReport.overallScore * 100).toFixed(1)}%`);
  console.log(`      - Avg Latency         : ${suiteReport.averageLatencyMs.toFixed(1)}ms\n`);

  // 3. Dify Multi-Agent Adapter & Orchestrator Wakeup
  console.log('🌐 [3/4] Initializing Dify Multi-Agent Bridge & Orchestrator...');
  const difyAdapter = new DifyAgentAdapter();
  const workflowRes = await difyAdapter.executeWorkflowWithMemory({
    workflowId: 'sierra-master-pipeline-v1',
    inputs: {
      query: 'Madinaty 3-bedroom luxury apartment with golf view',
      compound: 'Madinaty',
      budgetEgp: 12000000,
    },
    user: 'system-warmup',
  });
  console.log(`   ✅ Dify Workflow Dispatched & Hydrated from Memory:`);
  console.log(`      - Workflow Run ID     : ${workflowRes.workflowRunId}`);
  console.log(`      - Status              : ${workflowRes.status.toUpperCase()}\n`);

  // 4. Autonomous Agent Team Task Assignment & Execution
  console.log('🤖 [4/4] Assigning and Activating Specialized Agent Personas...');
  const personas: Array<'scribe' | 'curator' | 'matchmaker' | 'closer' | 'evaluator'> = [
    'scribe',
    'curator',
    'matchmaker',
    'closer',
    'evaluator',
  ];

  for (const persona of personas) {
    const assignment = await difyAdapter.dispatchToPersona({
      taskId: `task-${persona}-${Date.now().toString().slice(-6)}`,
      persona,
      payload: {
        targetMarket: 'New Cairo & 5th Settlement',
        network: '500+ Partner Agencies & 1,500+ Certified Brokers',
      },
    });
    console.log(`   🎯 [${persona.toUpperCase().padEnd(10)}] -> Status: ${String(assignment.outcome.status).toUpperCase()} | Role: ${assignment.outcome.result}`);
  }

  const durationMs = Date.now() - startTime;
  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log(`🎉 UNIFIED ENGINE ONLINE — All agents wired, synchronized & operational in ${durationMs}ms.`);
  console.log('══════════════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('❌ Engine Wakeup Failed:', err);
  process.exit(1);
});
