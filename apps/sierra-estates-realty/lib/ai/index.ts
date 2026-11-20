/**
 * AI Service Factory
 *
 * Selects the AI implementation at runtime based on environment:
 *   - AI_PROVIDER=mock             → MockAIService (deterministic, for tests)
 *   - AI_PROVIDER=google           → GoogleAIServiceImpl (real Gemini calls)
 *   - AI_PROVIDER=freellm-router   → FreeLLMRouterServiceImpl (admin-configured
 *                                    free providers — freellmapi integration)
 *   - AI_PROVIDER=auto (default)   → RouterFirstAIService: free-provider
 *                                    router when Admin → LLM Router has
 *                                    enabled+keyed providers, Google Gemini
 *                                    otherwise — agents gain free-tier
 *                                    capacity without losing their Gemini
 *                                    baseline.
 *
 * If the configured service has no usable key, the factory automatically
 * falls back to MockAIService so local dev and CI builds don't crash on
 * import. A warning is logged on first use.
 */

import 'server-only';
import { AIService, AIPrompt, AIOptions } from './AIServiceInterface';
import { GoogleAIServiceImpl } from './GoogleAIServiceImpl';
import { MockAIService } from './MockAIService';
import { FreeLLMRouterServiceImpl } from './FreeLLMRouterServiceImpl';
import { logger } from '@/lib/logger';

let cached: AIService | null = null;
let warnedAboutFallback = false;

/**
 * Default AI_PROVIDER since the freellmapi integration (2026-11-20):
 * try the free-provider router first; on ANY router failure (not enabled,
 * no keys, all upstreams down) fall through to the Gemini implementation —
 * so enabling the router can only ADD capacity, never remove it.
 */
class RouterFirstAIService implements AIService {
  private readonly router = new FreeLLMRouterServiceImpl();
  private readonly google = new GoogleAIServiceImpl();

  async generateContent(agent: string, task: string, prompt: AIPrompt, options?: AIOptions): Promise<string> {
    try {
      return await this.router.generateContent(agent, task, prompt, options);
    } catch (routerErr) {
      logger.warn(`[ai-factory] router failed for ${agent}/${task} — falling back to Gemini: ${(routerErr as Error).message}`);
      return this.google.generateContent(agent, task, prompt, options);
    }
  }

  async generateJSON<T = Record<string, any>>(agent: string, task: string, prompt: AIPrompt, options?: AIOptions): Promise<T> {
    try {
      return await this.router.generateJSON<T>(agent, task, prompt, options);
    } catch (routerErr) {
      logger.warn(`[ai-factory] router JSON failed for ${agent}/${task} — falling back to Gemini: ${(routerErr as Error).message}`);
      return this.google.generateJSON<T>(agent, task, prompt, options);
    }
  }

  async analyzeImage(imageUrl: string, prompt: string, options?: AIOptions): Promise<string> {
    // The router is text-only; vision goes straight to Gemini.
    return this.google.analyzeImage(imageUrl, prompt, options);
  }

  async isHealthy(): Promise<boolean> {
    if (await this.router.isHealthy()) return true;
    return this.google.isHealthy();
  }
}

function pickService(): AIService {
  const provider = (process.env.AI_PROVIDER ?? 'auto').toLowerCase();
  const hasGoogleKey = Boolean(process.env.GOOGLE_AI_API_KEY);

  if (provider === 'mock') {
    return new MockAIService();
  }

  if (provider === 'freellm-router') {
    return new FreeLLMRouterServiceImpl();
  }

  if (provider === 'auto') {
    return new RouterFirstAIService();
  }

  if (provider === 'google') {
    if (!hasGoogleKey) {
      if (!warnedAboutFallback) {
        logger.warn(
          '[ai-factory] GOOGLE_AI_API_KEY is not set — falling back to MockAIService. ' +
          'Set AI_PROVIDER=mock to silence this warning, or provide GOOGLE_AI_API_KEY for real LLM calls.'
        );
        warnedAboutFallback = true;
      }
      return new MockAIService();
    }
    return new GoogleAIServiceImpl();
  }

  logger.warn(`[ai-factory] Unknown AI_PROVIDER="${provider}" — falling back to MockAIService.`);
  return new MockAIService();
}

export function getAIService(): AIService {
  if (!cached) {
    cached = pickService();
  }
  return cached;
}

/**
 * Reset the cache — useful for tests that swap providers on the fly.
 */
export function _resetAIServiceCacheForTests(): void {
  cached = null;
  warnedAboutFallback = false;
}

/**
 * Default export — preserves backwards compatibility with existing call sites
 * that did `import { aiService } from '@/lib/ai/GoogleAIServiceImpl'`.
 */
export const aiService: AIService = new Proxy({} as AIService, {
  get(_target, prop) {
    const service = getAIService();
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  },
});
