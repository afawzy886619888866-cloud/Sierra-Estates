/**
 * Abstract AI Service Interface
 * Agents call this; implementation swaps for testing
 */

export type AIModel = 'fast' | 'standard' | 'vision';

export interface AIPrompt {
  system: string;
  user: string | any[]; // string or multimodal array
}

export interface AIOptions {
  model?: AIModel;
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface AIService {
  /**
   * Generate text response from AI model.
   * Handles both text-only and multimodal (image+text) prompts.
   */
  generateContent(
    agent: string,
    task: string,
    prompt: AIPrompt,
    options?: AIOptions
  ): Promise<string>;

  /**
   * Generate and parse JSON response.
   * Automatically validates JSON structure.
   */
  generateJSON<T = Record<string, any>>(
    agent: string,
    task: string,
    prompt: AIPrompt,
    options?: AIOptions
  ): Promise<T>;

  /**
   * Analyze image and return structured data or insights.
   */
  analyzeImage(
    imageUrl: string,
    prompt: string,
    options?: AIOptions
  ): Promise<string>;

  /**
   * Health check — verify service connectivity.
   */
  isHealthy(): Promise<boolean>;
}
