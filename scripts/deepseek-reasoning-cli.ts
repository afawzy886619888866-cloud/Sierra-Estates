import { deepseekReasoningEngine } from '../packages/deepseek-harness/src/index.js';
import pino from 'pino';

const logger = pino({ name: 'deepseek-reasoning-cli' });

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'reason';
  const task = args[1] || 'Analyze program state, evaluate memory integration, and recommend next development cycle';

  console.log('\n======================================================');
  console.log('   SIERRA ESTATES · DEEPSEEK REASONING & EVAL ENGINE  ');
  console.log('======================================================');
  console.log(`Command:  ${command}`);
  console.log(`Task:     ${task}`);
  console.log('------------------------------------------------------');

  if (command === 'eval') {
    logger.info('Executing benchmark evaluation suite...');
    const report = await deepseekReasoningEngine.runEvaluationSuite();
    console.log(`Suite ID:         ${report.suiteId}`);
    console.log(`Total Scenarios:  ${report.totalScenarios}`);
    console.log(`Passed:           ${report.passedCount}`);
    console.log(`Score:            ${(report.overallScore * 100).toFixed(1)}%`);
    console.log('------------------------------------------------------');
  } else if (command === 'develop') {
    logger.info('Generating program development plan...');
    const plan = await deepseekReasoningEngine.developProgram(task);
    console.log(`Objective:        ${plan.objective}`);
    console.log(`Reasoning:        ${plan.architecturalReasoning}`);
    console.log(`Safety Score:     ${(plan.safetyAuditScore * 100).toFixed(1)}%`);
    console.log('Steps:');
    plan.implementationSteps.forEach((s) => console.log(`  - ${s}`));
  } else {
    logger.info('Running deep reasoning chain...');
    const res = await deepseekReasoningEngine.reason(task, {
      internalContext: { activeAgent: 'DeepSeek-Reasoner', memoryBus: 'online' },
      eccContext: { framework: 'Episodic Context Cache (ECC)', entityGraph: 'connected' },
    });
    console.log(`Reasoning ID:     ${res.id}`);
    console.log(`Conclusion:       ${res.conclusion}`);
    console.log(`Confidence:       ${(res.confidence * 100).toFixed(1)}%`);
    console.log(`Memory Impact:    Internal Events: ${res.memoryImpact.internalEventsPublished}, ECC Episodes: ${res.memoryImpact.eccEpisodesRecorded}`);
    console.log('Thought Chain:');
    res.thoughtChain.forEach((t) => console.log(`  [Step ${t.step}] ${t.thought}`));
    console.log('Suggested Actions:');
    res.suggestedActions.forEach((a) => console.log(`  - ${a}`));
  }
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('DeepSeek Reasoning Engine execution error:', err);
  process.exit(1);
});
