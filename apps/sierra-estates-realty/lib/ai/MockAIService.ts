import { AIService, AIPrompt, AIOptions } from './AIServiceInterface';

/**
 * Mock AI Service for testing.
 * Returns deterministic responses; agents can now be tested without API calls.
 */
export class MockAIService implements AIService {
  private callLog: Array<{ agent: string; task: string; timestamp: Date }> = [];

  async generateContent(
    agent: string,
    task: string,
    _prompt: AIPrompt,
    _options?: AIOptions
  ): Promise<string> {
    this.callLog.push({ agent, task, timestamp: new Date() });

    // Deterministic responses for known tasks
    if (agent === 'scribe' && task === 'S2-Normalization') {
      return JSON.stringify({
        building: 'Test Building',
        floor: '5',
        unitNumber: '501',
        finishingGrade: 'Ultra-lux',
        furnishingStatus: 'F',
        rooms: 3,
        bathrooms: 2,
      });
    }

    if (agent === 'curator' && task === 'S3-Branding') {
      return JSON.stringify({
        descriptionEn: 'A stunning luxury property with exceptional views.',
        descriptionAr: 'عقار فاخر مذهل مع مناظر استثنائية.',
        tagline: 'Luxury Redefined',
      });
    }

    if (agent === 'curator' && task === 'S4-Distribution') {
      return JSON.stringify({
        whatsapp: '🏡 Amazing property available! Contact us for details.',
        facebook: 'Discover luxury living at its finest.',
        pf: 'Premium property listing with excellent amenities.',
      });
    }

    // Generic fallback
    return JSON.stringify({
      _mockResponse: true,
      agent,
      task,
      message: `Mock response for ${agent}/${task}`,
    });
  }

  async generateJSON<T = Record<string, any>>(
    agent: string,
    task: string,
    prompt: AIPrompt,
    options?: AIOptions
  ): Promise<T> {
    const result = await this.generateContent(agent, task, prompt, options);
    return JSON.parse(result);
  }

  async analyzeImage(
    imageUrl: string,
    prompt: string,
    _options?: AIOptions
  ): Promise<string> {
    this.callLog.push({
      agent: 'image-analyzer',
      task: 'analyze',
      timestamp: new Date(),
    });

    return JSON.stringify({
      mockImageAnalysis: true,
      imageUrl,
      prompt,
      quality: 'High',
      colors: ['Navy', 'Gold', 'Ivory'],
    });
  }

  async isHealthy(): Promise<boolean> {
    return true; // Mock always healthy
  }

  /**
   * Test utility: retrieve call history.
   */
  getCallLog() {
    return [...this.callLog];
  }

  /**
   * Test utility: clear call history.
   */
  clearCallLog() {
    this.callLog = [];
  }
}

export const mockAIService = new MockAIService();
