import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';
import { router } from './router';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

// Verify that the Gemini API Key is present
const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  console.error('\n❌ ERROR: GOOGLE_AI_API_KEY is not defined in your environment.');
  console.error('Please configure it in H:\\Sierra-Estates-Final\\.env.local and try again.');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const testPhone = '201012345678@c.us';

console.log('\n============================================================');
console.log('💬 Welcome to Sierra Estates Hermes CLI Chat');
console.log('This script allows you to chat directly with the multi-agent');
console.log('pipeline (Liela -> Sierra -> OpenClaw -> Hermes).');
console.log('Type your message and press Enter. Type "exit" or "quit" to stop.');
console.log('============================================================\n');

function askQuestion() {
  rl.question('👤 You: ', async (input) => {
    const text = input.trim();
    if (text.toLowerCase() === 'exit' || text.toLowerCase() === 'quit') {
      rl.close();
      return;
    }

    if (!text) {
      askQuestion();
      return;
    }

    console.log('🤖 Hermes is thinking...');
    try {
      const incomingMsg = {
        from: testPhone,
        body: text,
        groupName: 'Direct Message',
        timestamp: Math.floor(Date.now() / 1000),
        messageId: 'cli-test-' + Date.now()
      };

      const reply = await router.handle(incomingMsg);
      console.log(`\n🤖 Hermes: ${reply}\n`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ Error: ${errMsg}\n`);
    }

    askQuestion();
  });
}

askQuestion();
