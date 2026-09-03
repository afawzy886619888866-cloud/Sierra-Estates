import { config } from 'dotenv';
// Load environment variables (e.g. Firebase API Keys from .env.local if present)
config({ path: '../../.env.local' });

import { Orchestrator } from './orchestrator';
import { PropertyMatcherAgent } from './personas/property-matcher';
import { writeExchange } from '@sierra-estates/exchange/exchange-client';

async function main() {
  console.log('Starting local dev runner for Sierra Estates Agents...');

  // Initialize agents
  const propertyMatcher = new PropertyMatcherAgent();

  // Spin up the orchestrator
  const orchestrator = new Orchestrator([propertyMatcher]);
  orchestrator.start();

  console.log('Orchestrator running. Press Ctrl+C to exit.');

  // Let's create a test dummy task in 2 seconds to simulate a web request triggering an agent
  setTimeout(async () => {
    try {
      console.log('--- Triggering a dummy test task for property-matcher ---');
      const taskId = await writeExchange({
        type: 'agent_task',
        source: 'system',
        status: 'pending',
        agentId: 'property-matcher',
        payload: {
          criteria: {
            budget: 1000000,
            location: 'Downtown',
          }
        }
      });
      console.log(`Dummy task created with ID: ${taskId}`);
    } catch (e) {
      console.error('Failed to create dummy task. Are Firebase credentials set?', e);
    }
  }, 2000);
}

main().catch(console.error);
