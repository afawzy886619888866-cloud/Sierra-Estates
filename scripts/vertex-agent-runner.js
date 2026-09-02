 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { VertexAgent } from '../packages/agents-core/src/vertex-agent.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/sierra-estates-realty/.env.local') });

async function main() {
  const prompt = process.argv.slice(2).join(' ') || 'Analyze luxury real estate trends for penthouses in New Cairo.';

  console.log('🤖 [Vertex AI Agent Runner] Initializing Titan...');
  console.log(`📌 Project: ${process.env.GOOGLE_CLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'sierra-estates-core'}`);
  console.log(`📍 Location: ${process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'}`);
  console.log(`💬 Prompt: "${prompt}"\n`);

  const agent = new VertexAgent({
    name: 'titan-runner',
    description: 'CLI runner for Titan Vertex AI Agent',
  });

  const result = await agent.executeTask(prompt);

  if (result.success) {
    console.log('==================================================');
    console.log('✅ VERTEX AI AGENT RESPONSE:');
    console.log('==================================================');
    console.log(_optionalChain([(result.data ), 'optionalAccess', _ => _.text]) || JSON.stringify(result.data, null, 2));
    console.log('==================================================');
  } else {
    console.error('❌ Vertex AI Agent execution failed:', result.error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error running Vertex AI Agent:', err);
  process.exit(1);
});
