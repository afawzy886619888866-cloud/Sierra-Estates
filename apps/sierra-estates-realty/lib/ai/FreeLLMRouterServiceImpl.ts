import 'server-only';
import { AIService, AIPrompt, AIOptions, AIModel } from './AIServiceInterface';
import { routeChatCompletion, type ChatMessage } from '@/lib/llm/agent-router';
import { logger } from '@/lib/logger';

/**
 * Free-LLM router implementation of AIService (freellmapi integration).
 *
 * Routes agent calls through the admin-configured free-provider table
 * (agent_llm_providers) with wise failover + usage logging. Falls back to
 * the Gemini path when no router provider is enabled+keyed — so wiring this
 * in front of agents can never take them down; it only ADDS capacity.
 */
export class FreeLLMRouterServiceImpl implements AIService {
  async generateContent(
    agent: string,
    task: string,
    prompt: AIPrompt,
    options?: AIOptions
  ): Promise<string> {
    const messages = this.toMessages(prompt, options?.jsonMode);
    const result = await routeChatCompletion({
      agent,
      task,
      messages,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      jsonMode: options?.jsonMode,
    });
    if (!result.ok) {
      throw new Error(`[llm-router] all providers failed for ${agent}/${task}: ${result.error ?? 'unknown'}`);
    }
    return result.content;
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
      return JSON.parse(result) as T;
    } catch (error) {
      logger.error(`[llm-router] JSON parse failed for ${agent}/${task}:`, error);
      throw new Error(`Invalid JSON response from router for ${agent}/${task}`);
    }
  }

  async analyzeImage(
    _imageUrl: string,
    _prompt: string,
    _options?: AIOptions
  ): Promise<string> {
    // Vision models exist in the catalog but image bytes are not routed here:
    // the router speaks text-only chat. Vision stays on the Gemini impl —
    // honest degradation instead of a silently broken path.
    throw new Error('[llm-router] analyzeImage is not supported — route vision work through the Google AI implementation.');
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.generateContent(
        'health-check',
        'ping',
        { system: 'You are a connectivity probe.', user: 'Reply with exactly: OK' },
        { model: 'fast', maxTokens: 16 }
      );
      return true;
    } catch {
      return false;
    }
  }

  private toMessages(prompt: AIPrompt, jsonMode?: boolean): ChatMessage[] {
    const system = jsonMode
      ? `${prompt.system}\nRespond with valid JSON only.`
      : prompt.system;
    const messages: ChatMessage[] = [];
    if (system) messages.push({ role: 'system', content: system });
    if (Array.isArray(prompt.user)) {
      // Multimodal prompt arrays arrive in Gemini part shape; flatten text
      // parts and describe the rest so providers still get context.
      const text = prompt.user
        .map((part) =>
          typeof part === 'string'
            ? part
            : typeof (part as { text?: string })?.text === 'string'
              ? (part as { text: string }).text
              : `[non-text content: ${(part as { mimeType?: string })?.mimeType ?? 'unknown'}]`
        )
        .join('\n');
      messages.push({ role: 'user', content: text });
    } else {
      messages.push({ role: 'user', content: prompt.user });
    }
    return messages;
  }
}

/** True when at least one enabled router provider has a resolvable key. */
export async function routerHasCapacity(): Promise<boolean> {
  const { resolveCandidates } = await import('@/lib/llm/agent-router');
  return (await resolveCandidates()).length > 0;
}
