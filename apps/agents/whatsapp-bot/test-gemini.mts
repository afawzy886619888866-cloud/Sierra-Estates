import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const apiKey = process.env.GOOGLE_AI_API_KEY;
console.log('Initializing Gemini test run...');

if (!apiKey) {
  console.error('❌ No API key found!');
  process.exit(1);
}

const { GoogleGenerativeAI } = await import('@google/generative-ai');
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

console.log('📡 Calling Gemini...');
const result = await model.generateContent('قل مرحبا فقط');
console.log('✅ Gemini response:', result.response.text().trim());
