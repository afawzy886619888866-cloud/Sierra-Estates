import 'server-only';
import { AIService, AIPrompt, AIOptions, AIModel } from './AIServiceInterface';
import { GoogleAIService } from '../server/google-ai';

/**
 * Production implementation of AIService using Google Gemini.
 */
export class GoogleAIServiceImpl implements AIService {
  async generateContent(
    agent: string,
    task: string,
    prompt: AIPrompt,
    options?: AIOptions
  ): Promise<string> {
    const model = this.selectModel(options?.model || 'standard', prompt.user);

    return GoogleAIService.generateContent(
      agent,
      task,
      prompt,
      {
        model,
        jsonMode: options?.jsonMode || false,
      }
    );
  }

  async generateJSON<T = Record<string, any>>(
    agent: string,
    task: string,
    prompt: AIPrompt,
    options?: AIOptions
  ): Promise<T> {
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
    imageUrl: string,
    prompt: string,
    options?: AIOptions
  ): Promise<string> {
    // Fetch and encode image
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const modelType = this.selectModel(options?.model || 'vision', 'image');

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
      { model: modelType, jsonMode: options?.jsonMode || false }
    );
  }

  async isHealthy(): Promise<boolean> {
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
    } catch {
      return false;
    }
  }

  private selectModel(
    requested: AIModel,
    content: string | any
  ): 'gemini-1.5-flash' | 'gemini-1.5-pro' {
    // Use pro for vision tasks or complex requests
    if (requested === 'vision' || Array.isArray(content)) {
      return 'gemini-1.5-pro';
    }
    // Use fast for simple text tasks
    return requested === 'fast' ? 'gemini-1.5-flash' : 'gemini-1.5-flash';
  }
}

export const aiService = new GoogleAIServiceImpl();
