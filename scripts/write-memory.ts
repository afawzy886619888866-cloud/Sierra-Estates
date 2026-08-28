import { obsidian } from '../packages/obsidian/src/index.js';
import pino from 'pino';

const logger = pino({ name: 'write-memory-script' });

async function main() {
  const memoryId = `mem-test-${Date.now()}`;
  const payload = {
    event: 'manual_operator_memory_sync',
    agent: 'openclaw',
    compoundPreferences: ['Mivida', 'Hyde Park', 'Mountain View iCity'],
    note: 'System-wide unified memory checkpoint created successfully.',
    recordedAt: new Date().toISOString(),
  };

  logger.info({ msg: `Writing memory entry: ${memoryId}` });
  await obsidian.set(memoryId, payload, ['system-checkpoint', 'harness-coordinator']);

  console.log(`\n[✓] Memory entry written to Obsidian store.`);
  console.log(`    Memory ID: ${memoryId}`);
  console.log(`    Tags:      system-checkpoint, harness-coordinator\n`);
}

main();
