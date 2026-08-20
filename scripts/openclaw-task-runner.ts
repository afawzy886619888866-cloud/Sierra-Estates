import * as dotenv from 'dotenv';
import * as path from 'path';
import { OpenClawAgent } from '../packages/agents/openclaw';
import { obsidian } from '../packages/obsidian/src/index';

// Load environment variables from available locations
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/sierra-estates-realty/.env.local') });

const aiKey =
  process.env.GOOGLE_GENAI_API_KEY ||
  process.env.GOOGLE_AI_API_KEY ||
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  process.env.ANTIGRAVITY_API_KEY ||
  '';

async function runTask() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    console.log('⚡ [OpenClaw Task Runner] Performing diagnostic test...');
    console.log(`🔑 AI Token Configured: ${aiKey ? 'YES (' + aiKey.slice(0, 6) + '...)' : 'NO (Check .env.local)'}`);
    console.log(`💾 Project Memory Store: obsidian-store.json`);
    
    // Test memory lookup
    const memories = await obsidian.search('', []);
    console.log(`📚 Total Indexed Memories: ${memories?.length || 0}`);
    console.log('✅ OpenClaw diagnostic test passed!');
    return;
  }

  const prompt = args.join(' ').trim() || 'Provide a summary of Sierra Estates architecture and agent capabilities.';

  console.log('====================================================');
  console.log('🚀 [OpenClaw Task Executor]');
  console.log('====================================================');
  console.log(`💬 Task Prompt: "${prompt}"`);
  console.log(`🔑 Using Token: ${aiKey ? 'Configured (' + aiKey.slice(0, 6) + '...)' : 'Default / Fallback'}`);
  console.log('----------------------------------------------------');

  const agent = new OpenClawAgent({
    aiApiKey: aiKey,
    airtableApiKey: process.env.AIRTABLE_API_KEY || '',
    airtableBaseId: process.env.AIRTABLE_BASE_ID || '',
    airtableTableName: process.env.AIRTABLE_TABLE_NAME || 'Listings',
  });

  try {
    console.log('⏳ Executing task with project memory grounding...');
    const result = await agent.queryVertexAgent(prompt);

    console.log('\n====================================================');
    console.log('✨ OPENCLAW TASK RESULT:');
    console.log('====================================================');
    if (result.success) {
      const outputText = (result.data as any)?.text || JSON.stringify(result.data, null, 2);
      console.log(outputText);
      
      // Save result to shared memory
      await obsidian.set(`task-${Date.now()}`, {
        prompt,
        output: outputText,
        timestamp: new Date().toISOString(),
      }, ['openclaw-task', 'execution-log']);
      
      console.log('----------------------------------------------------');
      console.log('💾 Task execution recorded to shared project memory.');
    } else {
      console.error('❌ Task execution failed:', result.error);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('❌ OpenClaw encountered an error:', err.message || err);
    process.exit(1);
  }
}

runTask().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
