import { DeepSeekHarness } from '../packages/deepseek-harness/src/index.js';
import pino from 'pino';

const logger = pino({ name: 'run-harness-script' });

async function main() {
  logger.info('Starting DeepSeek reasoning benchmark evaluation suite...');
  const start = Date.now();

  const harness = new DeepSeekHarness();
  const report = await harness.runFullSuite();

  console.log('\n======================================================');
  console.log('       SIERRA ESTATES · DEEPSEEK HARNESS REPORT       ');
  console.log('======================================================');
  console.log(`Suite ID:           ${report.suiteId}`);
  console.log(`Total Scenarios:    ${report.totalScenarios}`);
  console.log(`Passed Scenarios:   ${report.passedCount}`);
  console.log(`Failed Scenarios:   ${report.failedCount}`);
  console.log(`Overall Score:      ${(report.overallScore * 100).toFixed(1)}%`);
  console.log(`Average Latency:    ${report.averageLatencyMs}ms`);
  console.log(`Execution Time:     ${Date.now() - start}ms`);
  console.log('------------------------------------------------------');

  for (const r of report.results) {
    const icon = r.success ? '✓ PASS' : '✗ FAIL';
    console.log(`[${icon}] ${r.scenarioId.padEnd(24)} Score: ${(r.accuracyScore * 100).toFixed(0)}%  Latency: ${r.latencyMs}ms`);
    if (r.validationErrors && r.validationErrors.length > 0) {
      console.log(`       Errors: ${r.validationErrors.join(', ')}`);
    }
  }
  console.log('======================================================\n');

  if (report.overallScore < 0.75) {
    logger.error('Harness evaluation score fell below acceptance threshold (75%)');
    process.exit(1);
  }
}

main();
