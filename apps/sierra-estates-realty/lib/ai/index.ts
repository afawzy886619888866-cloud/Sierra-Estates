/**
 * AI Service Factory
 *
 * Selects the AI implementation at runtime based on environment:
 *   - AI_PROVIDER=mock             → MockAIService (deterministic, for tests)
 *   - AI_PROVIDER=google (default) → GoogleAIServiceImpl (real Gemini calls)
 *
 * If AI_PROVIDER=google but GOOGLE_AI_API_KEY is not set, the factory
 * automatically falls back to MockAIService so local dev and CI builds
 * don't crash on import. A warning is logged on first use.
 */

import 'server-only';
import { AIService } from './AIServiceInterface';
import { GoogleAIServiceImpl } from './GoogleAIServiceImpl';
import { MockAIService } from './MockAIService';
import { logger } from '@/lib/logger';

let cached: AIService | null = null;
let warnedAboutFallback = false;

function pickService(): AIService {
  const provider = (process.env.AI_PROVIDER ?? 'google').toLowerCase();
  const hasGoogleKey = Boolean(process.env.GOOGLE_AI_API_KEY);

  if (provider === 'mock') {
    return new MockAIService();
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
