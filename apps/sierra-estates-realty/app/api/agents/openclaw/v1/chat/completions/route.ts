import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyBearerSecret } from '@/lib/server/agent-bearer';
import { routeChatCompletion, type RouteResult } from '@/lib/llm/agent-router';
import { soulContext, soulRemember } from '@/lib/memory/broker-soul';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * OPENCLAW GATEWAY — OpenAI-compatible chat completions for the user's
 * OpenClaw agent (2026-11-21).
 *
 * POST /api/agents/openclaw/v1/chat/completions
 *   Auth: `Authorization: Bearer $SBR_SECRET_KEY` (the shared agent secret —
 *   never a real LLM key; keys stay env-var NAMES inside the router).
 *   Request/response follow the OpenAI chat-completions shape (non-streaming).
 *
 * What it does beyond a plain proxy:
 *   1. SOUL INJECTION — recalls relevant Super Broker Memory on the latest
 *      user message and prepends it as a system message, so OpenClaw speaks
 *      with the whole brokerage's accumulated knowledge.
 *   2. WISE ROUTING — the completion is served by the free-provider LLM
 *      router (admin → LLM Router): priority + health + failover, usage
 *      logged, zero paid inference required.
 *   3. SOUL REMEMBERING — the exchange is remembered on the spine (dedupe
 *      keyed) so the Soul grows from every OpenClaw conversation.
 *   4. PRIVACY LOCK ③ — phone-number-looking user content is refused; the
 *      confidential line stays out of memory and logs.
 *
 * Configure in OpenClaw (models.providers): baseUrl
 * `https://sierra-estates.net/api/agents/openclaw/v1`, apiKey $SBR_SECRET_KEY,
 * model `soul-auto`, streaming OFF (non-streaming gateway).
 */

const messageSchema = z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.union([z.string().max(32_000), z.array(z.object({ type: z.string(), text: z.string().max(16_000).optional() }).passthrough())]).transform((c) =>
        typeof c === 'string' ? c : c.map((part) => part.text || '').filter(Boolean).join('\n')
    ),
});

const bodySchema = z.object({
    model: z.string().max(120).optional(),
    messages: z.array(messageSchema).min(1).max(40),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().min(16).max(8_000).optional(),
    stream: z.boolean().optional(),
});

/** Privacy lock ③: refuse content that embeds raw phone numbers. */
function looksLikePhone(text: string): boolean {
    return /(?:\+?\d[\d\s().-]{8,}\d)/.test(text);
}

function truncate(text: string, max: number): string {
    return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export async function POST(req: NextRequest) {
    const denied = verifyBearerSecret(req, 'openclaw-gateway');
    if (denied) return denied;

    let parsed;
    try {
        parsed = bodySchema.safeParse(await req.json());
    } catch {
        return NextResponse.json(
            { error: { message: 'Invalid JSON body.', type: 'invalid_request_error' } },
            { status: 400 }
        );
    }
    if (!parsed.success) {
        return NextResponse.json(
            { error: { message: 'Invalid request payload.', type: 'invalid_request_error', detail: parsed.error.flatten() } },
            { status: 400 }
        );
    }
    const body = parsed.data;

    if (body.stream) {
        return NextResponse.json(
            {
                error: {
                    message: 'This gateway is non-streaming only — set stream:false in your OpenClaw provider config.',
                    type: 'invalid_request_error',
                },
            },
            { status: 400 }
        );
    }

    const messages = body.messages;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || '';

    // Privacy lock ③ — refuse raw phone digits before anything touches memory or routing.
    if (looksLikePhone(lastUser) || messages.some((m) => looksLikePhone(m.content))) {
        return NextResponse.json(
            {
                error: {
                    message:
                        'Privacy lock: raw phone numbers are not accepted here — use the confidential line (01092048333) and refer to contacts abstractly.',
                    type: 'privacy_lock',
                },
            },
            { status: 422 }
        );
    }

    // 1) Soul injection — memory context ahead of the conversation.
    let memoryBlock = '';
    let memoryCount = 0;
    try {
        memoryBlock = await soulContext(lastUser, { limit: 6 });
        memoryCount = memoryBlock ? memoryBlock.split('\n').length - 1 : 0;
    } catch (err) {
        logger.warn('[openclaw-gateway] soul recall skipped:', (err as Error).message);
    }
    const routedMessages = memoryBlock
        ? [...messages, { role: 'system' as const, content: memoryBlock }]
        : messages;

    // 2) Wise routing through the free-provider fleet.
    let result: RouteResult;
    try {
        result = await routeChatCompletion({
            agent: 'openclaw',
            task: 'openclaw-gateway',
            messages: routedMessages,
            model: body.model === 'soul-auto' || body.model === 'soul-fast' ? undefined : body.model,
            temperature: body.temperature,
            maxTokens: body.max_tokens,
        });
    } catch (err) {
        logger.error('[openclaw-gateway] router threw:', (err as Error).message);
        return NextResponse.json(
            { error: { message: `Router failure: ${(err as Error).message}`, type: 'upstream_error' } },
            { status: 502 }
        );
    }

    if (!result.ok) {
        return NextResponse.json(
            {
                error: {
                    message: `No free provider could serve this completion: ${result.error || 'all attempts failed'}`,
                    type: 'upstream_error',
                    attempts: result.attempts,
                },
            },
            { status: 502 }
        );
    }

    // 3) Soul remembering — the exchange feeds the spine (dedupe keyed).
    try {
        await soulRemember({
            agent: 'openclaw',
            kind: 'observation',
            scope: 'agent',
            subject: 'openclaw-session',
            content: truncate(`OpenClaw asked: ${truncate(lastUser || '(no user text)', 400)} | Answered via ${result.provider}/${result.model}.`, 1200),
            importance: 2,
            confidence: 0.7,
            source: 'openclaw-gateway',
        });
    } catch (err) {
        logger.warn('[openclaw-gateway] soul remember skipped:', (err as Error).message);
    }

    // 4) OpenAI-compatible response (usage is honest zeros — the router does
    //    not expose token counts; the `sierra` extension object carries the
    //    real routing + memory telemetry).
    return NextResponse.json({
        id: `chatcmpl-sierra-${Date.now().toString(36)}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: result.model,
        choices: [
            {
                index: 0,
                message: { role: 'assistant', content: result.content },
                finish_reason: 'stop',
            },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        sierra: {
            provider: result.provider,
            latencyMs: result.latencyMs,
            attempts: result.attempts,
            memoryInjected: memoryCount,
            soulRemembered: true,
        },
    });
}
