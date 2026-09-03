 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import 'server-only';

import { GoogleAIService } from '../server/google-ai';

/**
 * Production implementation of AIService using Google Gemini.
 */
export class GoogleAIServiceImpl  {
  async generateContent(
    agent,
    task,
    prompt,
    options
  ) {
    const model = this.selectModel(_optionalChain([options, 'optionalAccess', _ => _.model]) || 'standard', prompt.user);

    return GoogleAIService.generateContent(
      agent,
      task,
      prompt,
      {
        model,
        jsonMode: _optionalChain([options, 'optionalAccess', _2 => _2.jsonMode]) || false,
      }
    );
  }

  async generateJSON(
    agent,
    task,
    prompt,
    options
  ) {
    const result = await this.generateContent(agent, task, prompt, {
      ...options,
      jsonMode: true,
    });

    try {
      return JSON.parse(result);
    } catch (error) {
      console.error(`[AIService] JSON parse failed for ${agent}/${task}:`, error);
      throw new Error(`Invalid JSON response from ${agent}/${task}`);
    }
  }

  async analyzeImage(
    imageUrl,
    prompt,
    options
  ) {
    // Fetch and encode image
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const modelType = this.selectModel(_optionalChain([options, 'optionalAccess', _3 => _3.model]) || 'vision', 'image');

    return GoogleAIService.generateContent(
      'image-analyzer',
      'image-analysis',
      {
        system: 'You are an expert image analyst. Provide detailed, structured insights.',
        user: [
          {
            inlineData: {
              data: base64,
              mimeType: 'image/jpeg',
            },
          },
          prompt,
        ],
      },
      { model: modelType, jsonMode: _optionalChain([options, 'optionalAccess', _4 => _4.jsonMode]) || false }
    );
  }

  async isHealthy() {
    try {
      await this.generateContent(
        'health-check',
        'ping',
        {
          system: 'You are a helpful assistant.',
          user: 'Respond with "OK".',
        },
        { model: 'fast' }
      );
      return true;
    } catch (e) {
      return false;
    }
  }

   selectModel(
    requested,
    content
  ) {
    if (requested === 'vision' || Array.isArray(content)) {
      return 'gemini-3.1-pro-preview';
    }
    return 'gemini-3.6-flash';
  }
}

export const aiService = new GoogleAIServiceImpl();
