import { pubsub } from '../packages/ai-orchestrator/src/pubsub-broker.js';
import pino from 'pino';

const logger = pino({ name: 'publish-recommendation-script' });

async function main() {
  logger.info('Publishing test property recommendation to Pub/Sub bus...');

  const recId = `rec-${Date.now()}`;
  const messageId = await pubsub.publishRecommendation({
    recommendationId: recId,
    clientId: 'lead-sara-mohamed-0041',
    listingCodes: ['SE-MVD-APT-0041-2026'],
    matchScore: 0.96,
    rationale: 'Client searching for 3-bedroom luxury apartment in Mivida under 45k EGP/mo rental budget.',
    suggestedAction: 'send_whatsapp',
    metadata: {
      sourceAgent: 'ai-orchestrator',
      targetPhone: '+201012223344',
    },
  });

  console.log(`\n[✓] Recommendation successfully published!`);
  console.log(`    Message ID:         ${messageId}`);
  console.log(`    Recommendation ID:  ${recId}`);
  console.log(`    Topic:              ai.recommendations\n`);
}

main();
