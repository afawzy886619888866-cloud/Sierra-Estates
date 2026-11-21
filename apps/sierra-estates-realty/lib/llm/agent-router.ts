import 'server-only';
/**
 * AGENT LLM ROUTER — freellmapi integration (2026-11-20)
 * ─────────────────────────────────────────────────────────────────────────
 * FreeLLMAPI (github.com/tashfeenahmed/freellmapi) stacks 87 free LLM
 * providers behind one OpenAI-compatible /v1 endpoint with wise routing:
 * pick the best available model, fall over on rate limits, track usage.
 *
 * This module gives the Sierra Estates worker the same capability natively
 * (no extra service to run):
 *   • SEED CATALOG — every upstream below has its base URL verified from the
 *     freellmapi provider registry (server/src/providers/*.ts @ 2026-11-20).
 *     Rows land disabled; the admin "LLM Router" window enables + orders them.
 *   • WISE ROUTING — candidates sorted by admin priority, then health
 *     (alive first, lowest latency first), failover on 4xx/5xx/timeout,
 *     every attempt written to agent_llm_usage_log.
 *   • AUTOMATION — refreshCatalog() probes GET /models on every enabled
 *     provider (dispatch target `llm-catalog-refresh`, hourly window) and
 *     stores the discovered model IDs — the same self-updating idea as the
 *     freellmapi signed feed, minus the signature infra. A configured
 *     freellmapi-upstream row imports its FULL live catalog (1,300+
 *     endpoints) the same way.
 *   • SECRETS — keys are referenced by ENV VAR NAME only (api_key_env,
 *     comma-separated candidates). Values never touch the database and are
 *     never returned by any admin route.
 */

import { insertRecord, listRecords, updateRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';

const TABLE = 'agent_llm_providers';
const USAGE_TABLE = 'agent_llm_usage_log';
const CACHE_TTL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 3;

export interface ProviderRow {
    id: number;
    slug: string;
    label: string;
    kind: 'openai-compat' | 'gemini-openai' | 'freellmapi-upstream' | 'cloudflare-ai';
    base_url: string;
    api_key_env: string | null;
    default_model: string | null;
    enabled: boolean;
    priority: number;
    models: Array<{ id: string; owned_by?: string }>;
    health: { status?: 'ok' | 'error'; latencyMs?: number; checkedAt?: string; lastError?: string };
    notes?: string;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | Array<Record<string, unknown>>;
}

export interface RouteRequest {
    agent: string;
    task?: string;
    messages: ChatMessage[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
}

export interface RouteResult {
    ok: boolean;
    content: string;
    provider: string;
    model: string;
    latencyMs: number;
    attempts: Array<{ provider: string; model: string; status: string; latencyMs: number; error?: string }>;
    error?: string;
}

export interface RefreshSummary {
    checked: number;
    ok: number;
    failed: number;
    totalModels: number;
    results: Array<{ slug: string; ok: boolean; modelCount: number; latencyMs: number; error?: string }>;
    refreshedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED CATALOG — base URLs verified from freellmapi server/src/providers/*.ts
// (registry @ 2026-11-20). All rows seed DISABLED; enabling is an admin act.
// ─────────────────────────────────────────────────────────────────────────────

export const AGENT_LLM_SEED: Array<Omit<ProviderRow, 'id' | 'models' | 'health'>> = [
    {
        slug: 'freellmapi-upstream',
        label: 'FreeLLMAPI (self-hosted gateway)',
        kind: 'freellmapi-upstream',
        base_url: '{FREELLMAPI_UPSTREAM_URL}',
        api_key_env: 'FREELLMAPI_UPSTREAM_KEY',
        default_model: null,
        enabled: false,
        priority: 5,
        notes: 'Docker self-host of freellmapi (docker-compose in that repo). Set FREELLMAPI_UPSTREAM_URL (e.g. http://<ec2>:3001/v1) + optional FREELLMAPI_UPSTREAM_KEY. Refresh imports its FULL live catalog via /models?available=true — 1,300+ free endpoints with its own failover.',
    },
    {
        slug: 'gemini-openai',
        label: 'Google Gemini (OpenAI-compat endpoint)',
        kind: 'gemini-openai',
        base_url: 'https://generativelanguage.googleapis.com/v1beta/openai',
        api_key_env: 'GEMINI_API_KEY,GOOGLE_AI_API_KEY,GOOGLE_GENAI_API_KEY',
        default_model: 'gemini-2.5-flash',
        enabled: false,
        priority: 10,
        notes: 'Gemini free tier via its OpenAI-compatible surface — already keyed in this stack.',
    },
    {
        slug: 'cloudflare-workers-ai',
        label: 'Cloudflare Workers AI',
        kind: 'cloudflare-ai',
        base_url: 'https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/v1',
        api_key_env: 'CLOUDFLARE_AI_API_TOKEN,CLOUDFLARE_API_TOKEN',
        default_model: null,
        enabled: false,
        priority: 20,
        notes: '{CLOUDFLARE_ACCOUNT_ID} is substituted from the account variable already wired in deploy-cloudflare.yml. Free allocation ~10K neurons/day on the current plan.',
    },
    {
        slug: 'zhipu-glm',
        label: 'Zhipu GLM (z.ai global endpoint)',
        kind: 'openai-compat',
        base_url: 'https://api.z.ai/api/paas/v4',
        api_key_env: 'ZHIPU_API_KEY,ZAI_API_KEY,Z_AI_API_KEY',
        default_model: null,
        enabled: false,
        priority: 30,
        notes: 'GLM coding-plan / open-platform key. Registry: zhipu.ts GLOBAL_BASE_URL.',
    },
    {
        slug: 'modelscope',
        label: 'ModelScope inference',
        kind: 'openai-compat',
        base_url: 'https://api-inference.modelscope.cn/v1',
        api_key_env: 'MODELSCOPE_API_KEY',
        default_model: null,
        enabled: false,
        priority: 60,
        notes: 'Free tier with frequent Qwen family models.',
    },
    {
        slug: 'pollinations',
        label: 'Pollinations (keyless tier)',
        kind: 'openai-compat',
        base_url: 'https://gen.pollinations.ai/v1',
        api_key_env: 'POLLINATIONS_API_KEY',
        default_model: null,
        enabled: false,
        priority: 80,
        notes: 'Works keyless (referral/referrer policies apply) — lowest-stakes fallback.',
    },
    // ── Long tail from the freellmapi registry: disabled, admin-curated ──────
    ...[
        ['aclide', 'Aclide', 'https://aclide.com/v1'],
        ['router9', 'Router9', 'https://api.router9.com/v1'],
        ['sail', 'Sail Research', 'https://api.sailresearch.com/v1'],
        ['moondream', 'Moondream', 'https://api.moondream.ai/v1'],
        ['llmtr', 'LLMTR', 'https://llmtr.com/v1'],
        ['freeinference', 'FreeInference', 'https://freeinference.org/v1'],
        ['freemodel', 'FreeModel', 'https://freemodel.in/v1'],
        ['inferbase', 'Inferbase', 'https://api.inferbase.ai/v1'],
        ['iteracompute', 'IteraCompute', 'https://api.iteracompute.com/v1'],
        ['simplellm', 'SimpleLLM', 'https://api.simplellm.eu/v1'],
        ['novai', 'NovAI', 'https://aiapi-pro.com/v1'],
        ['electronhub', 'ElectronHub', 'https://api.electronhub.ai/v1'],
        ['gizmo', 'Gizmo', 'https://api.gizmoplatforms.com/api/v1'],
        ['typhoon', 'Typhoon (OpenTyphoon)', 'https://api.opentyphoon.ai/v1'],
        ['jamai', 'JamAI', 'https://api.jamaibase.com/api/v1'],
        ['kiosapi', 'KiosAPI', 'https://api.kiosapi.id/v1'],
        ['kenari', 'Kenari', 'https://kenari.id/v1'],
        ['speka', 'Speka', 'https://speka.me/v1'],
        ['apinex', 'Apinex', 'https://api.apinex.bond/v1'],
        ['beatapi', 'BeatAPI', 'https://api.beatapi.io/v1'],
        ['blockrun', 'BlockRun', 'https://api.blockrun.ai/v1'],
        ['plugsky', 'Plugsky', 'https://plugsky.com/v1'],
        ['nabh', 'Nabh', 'https://api.nabh.cloud/v1'],
        ['keenable', 'Keenable', 'https://api.keenable.ai/v1'],
    ].map(([slug, label, url], i) => ({
        slug,
        label,
        kind: 'openai-compat' as const,
        base_url: url,
        api_key_env: null,
        default_model: null,
        enabled: false,
        priority: 100 + i,
        notes: 'From the freellmapi provider registry (base URL verified 2026-11-20). Enable + set an env key when a free tier is claimed; refresh discovers models.',
    })),
];

// ─────────────────────────────────────────────────────────────────────────────
// Provider store (60s cache; seed is insert-only — admin edits always win)
// ─────────────────────────────────────────────────────────────────────────────

let cache: { rows: ProviderRow[]; at: number } | null = null;

function bustCache(): void {
    cache = null;
}

const VALID_KINDS = new Set<ProviderRow['kind']>([
    'openai-compat',
    'gemini-openai',
    'freellmapi-upstream',
    'cloudflare-ai',
]);

/**
 * Normalizes rows returned by `@sierra-estates/db` (`toRecord` converts
 * snake_case Postgres columns to camelCase) back into the canonical
 * `ProviderRow` shape expected by the router, admin UI, and model endpoints.
 */
export function normalizeProviderRow(raw: Record<string, unknown>): ProviderRow {
    const rawKind = typeof raw.kind === 'string' ? raw.kind : 'openai-compat';
    const kind: ProviderRow['kind'] = VALID_KINDS.has(rawKind as ProviderRow['kind'])
        ? (rawKind as ProviderRow['kind'])
        : 'openai-compat';

    const baseUrlRaw = raw.base_url ?? raw.baseUrl;
    const apiKeyEnvRaw = raw.api_key_env ?? raw.apiKeyEnv;
    const defaultModelRaw = raw.default_model ?? raw.defaultModel;

    const rawModels = Array.isArray(raw.models) ? raw.models : [];
    const models: ProviderRow['models'] = rawModels
        .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === 'object'))
        .map((m) => {
            const ownedBy = m.owned_by ?? m.ownedBy;
            return {
                id: typeof m.id === 'string' ? m.id : String(m.id ?? ''),
                ...(typeof ownedBy === 'string' && ownedBy.length > 0 ? { owned_by: ownedBy } : {}),
            };
        })
        .filter((m) => m.id.length > 0);

    const rawHealth = raw.health && typeof raw.health === 'object' ? (raw.health as Record<string, unknown>) : {};
    const statusRaw = rawHealth.status;
    const latencyRaw = rawHealth.latencyMs ?? rawHealth.latency_ms;
    const checkedAtRaw = rawHealth.checkedAt ?? rawHealth.checked_at;
    const lastErrorRaw = rawHealth.lastError ?? rawHealth.last_error;

    const health: ProviderRow['health'] = {
        ...(statusRaw === 'ok' || statusRaw === 'error' ? { status: statusRaw } : {}),
        ...(typeof latencyRaw === 'number' ? { latencyMs: latencyRaw } : {}),
        ...(typeof checkedAtRaw === 'string' ? { checkedAt: checkedAtRaw } : {}),
        ...(typeof lastErrorRaw === 'string' ? { lastError: lastErrorRaw } : {}),
    };

    return {
        id: typeof raw.id === 'number' ? raw.id : Number(raw.id ?? 0),
        slug: typeof raw.slug === 'string' ? raw.slug : String(raw.slug ?? ''),
        label: typeof raw.label === 'string' ? raw.label : String(raw.label ?? raw.slug ?? ''),
        kind,
        base_url: typeof baseUrlRaw === 'string' ? baseUrlRaw : '',
        api_key_env: typeof apiKeyEnvRaw === 'string' && apiKeyEnvRaw.length > 0 ? apiKeyEnvRaw : null,
        default_model: typeof defaultModelRaw === 'string' && defaultModelRaw.length > 0 ? defaultModelRaw : null,
        enabled: Boolean(raw.enabled),
        priority: typeof raw.priority === 'number' ? raw.priority : Number(raw.priority ?? 100),
        models,
        health,
        ...(typeof raw.notes === 'string' ? { notes: raw.notes } : {}),
    };
}

export async function listProviders(force = false): Promise<ProviderRow[]> {
    if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.rows;
    let rows: ProviderRow[] = [];
    try {
        const rawRows = await listRecords<Record<string, unknown>>(TABLE, { orderBy: { column: 'priority', ascending: true } });
        rows = rawRows.map(normalizeProviderRow);
    } catch (err) {
        // Table missing (migration not applied yet) — fall through to seed so
        // routing can still work from static config.
        logger.warn(`[llm-router] list failed (${(err as Error).message}) — using seed catalog only`);
        rows = [];
    }
    const known = new Set(rows.map((r) => r.slug));
    for (const seed of AGENT_LLM_SEED) {
        if (known.has(seed.slug)) continue;
        try {
            const inserted = await insertRecord<Record<string, unknown>>(TABLE, {
                slug: seed.slug,
                label: seed.label,
                kind: seed.kind,
                baseUrl: seed.base_url,
                apiKeyEnv: seed.api_key_env,
                defaultModel: seed.default_model,
                enabled: seed.enabled,
                priority: seed.priority,
                models: [],
                health: {},
                notes: seed.notes,
            });
            rows.push(normalizeProviderRow(inserted));
        } catch (err) {
            logger.warn(`[llm-router] seed insert ${seed.slug} failed: ${(err as Error).message}`);
        }
    }
    rows.sort((a, b) => a.priority - b.priority || a.id - b.id);
    cache = { rows, at: Date.now() };
    return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Key + URL resolution (env-var NAMES only; values never stored)
// ─────────────────────────────────────────────────────────────────────────────

export function resolveApiKey(provider: ProviderRow): string | undefined {
    if (!provider.api_key_env) return undefined;
    for (const name of provider.api_key_env.split(',').map((s) => s.trim()).filter(Boolean)) {
        const value = process.env[name];
        if (value && value.trim().length > 0) return value.trim();
    }
    return undefined;
}

function resolveBaseUrl(provider: ProviderRow): string {
    return (provider.base_url || '')
        .replace('{FREELLMAPI_UPSTREAM_URL}', (process.env.FREELLMAPI_UPSTREAM_URL || '').replace(/\/$/, ''))
        .replace('{CLOUDFLARE_ACCOUNT_ID}', process.env.CLOUDFLARE_ACCOUNT_ID || '');
}

function placeholderMissing(provider: ProviderRow): boolean {
    const url = resolveBaseUrl(provider);
    return url.includes('{') || url.length < 8;
}

// ─────────────────────────────────────────────────────────────────────────────
// Health bookkeeping (fail-soft — routing outcome is the product)
// ─────────────────────────────────────────────────────────────────────────────

async function markHealth(provider: ProviderRow, ok: boolean, latencyMs: number, error?: string): Promise<void> {
    try {
        await updateRecord(TABLE, String(provider.id), {
            health: {
                status: ok ? 'ok' : 'error',
                latencyMs,
                checkedAt: new Date().toISOString(),
                ...(error ? { lastError: String(error).slice(0, 300) } : {}),
            },
        });
        bustCache();
    } catch (err) {
        logger.warn(`[llm-router] health write ${provider.slug} failed: ${(err as Error).message}`);
    }
}

async function logUsage(entry: {
    agent: string;
    task?: string;
    providerSlug: string;
    model?: string;
    status: 'ok' | 'error';
    latencyMs: number;
    promptTokens?: number;
    completionTokens?: number;
    error?: string;
}): Promise<void> {
    try {
        await insertRecord(USAGE_TABLE, {
            agent: entry.agent,
            task: entry.task ?? null,
            providerSlug: entry.providerSlug,
            model: entry.model ?? null,
            status: entry.status,
            latencyMs: entry.latencyMs,
            promptTokens: entry.promptTokens ?? null,
            completionTokens: entry.completionTokens ?? null,
            error: entry.error ? String(entry.error).slice(0, 500) : null,
        });
    } catch (err) {
        logger.warn(`[llm-router] usage log failed: ${(err as Error).message}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// WISE ROUTING
// ─────────────────────────────────────────────────────────────────────────────

/** Candidates in try-order: enabled → keyed → URL-resolvable → priority → health. */
export async function resolveCandidates(): Promise<Array<{ provider: ProviderRow; apiKey?: string; baseUrl: string }>> {
    const rows = await listProviders();
    const candidates = rows
        .filter((p) => p.enabled && !placeholderMissing(p))
        .map((p) => ({ provider: p, apiKey: resolveApiKey(p), baseUrl: resolveBaseUrl(p).replace(/\/$/, '') }))
        // Pollinations may run keyless; every other provider requires a key.
        .filter((c) => c.apiKey !== undefined || c.provider.slug === 'pollinations');
    candidates.sort((a, b) => {
        if (a.provider.priority !== b.provider.priority) return a.provider.priority - b.provider.priority;
        const ha = a.provider.health ?? {};
        const hb = b.provider.health ?? {};
        if ((ha.status ?? 'unknown') !== (hb.status ?? 'unknown')) {
            return (ha.status ?? 'unknown') === 'ok' ? -1 : 1;
        }
        return (ha.latencyMs ?? Infinity) - (hb.latencyMs ?? Infinity);
    });
    return candidates;
}

function pickModel(provider: ProviderRow, requested?: string): string {
    if (requested && requested !== 'auto') return requested;
    if (provider.default_model) return provider.default_model;
    const first = (provider.models ?? [])[0]?.id;
    return first || 'gpt-4o-mini';
}

/** One OpenAI-compatible chat completion with wise failover. NEVER fabricates:
 *  when every candidate fails the result is ok:false with the error chain. */
export async function routeChatCompletion(req: RouteRequest): Promise<RouteResult> {
    const startedAt = Date.now();
    const candidates = (await resolveCandidates()).slice(0, MAX_ATTEMPTS);
    const attempts: RouteResult['attempts'] = [];

    if (candidates.length === 0) {
        return {
            ok: false,
            content: '',
            provider: '',
            model: '',
            latencyMs: Date.now() - startedAt,
            attempts,
            error: 'No enabled LLM provider has a resolvable API key — configure one in Admin → LLM Router (or set its env key).',
        };
    }

    let lastError = '';
    for (const { provider, apiKey, baseUrl } of candidates) {
        const model = pickModel(provider, req.model);
        const attemptStart = Date.now();
        try {
            const body: Record<string, unknown> = {
                model,
                messages: req.messages,
                temperature: req.temperature,
                max_tokens: req.maxTokens,
            };
            if (req.jsonMode) body.response_format = { type: 'json_object' };

            const res = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });

            const latencyMs = Date.now() - attemptStart;
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                lastError = `HTTP ${res.status} ${text.slice(0, 200)}`;
                attempts.push({ provider: provider.slug, model, status: `http_${res.status}`, latencyMs, error: lastError });
                await logUsage({ agent: req.agent, task: req.task, providerSlug: provider.slug, model, status: 'error', latencyMs, error: lastError });
                await markHealth(provider, false, latencyMs, lastError);
                // 4xx (auth/shape) — this provider will not get better by retrying here,
                // but the next candidate may; continue the chain either way.
                continue;
            }

            const data = (await res.json()) as {
                choices?: Array<{ message?: { content?: string } }>;
                usage?: { prompt_tokens?: number; completion_tokens?: number };
            };
            const content = data.choices?.[0]?.message?.content ?? '';
            if (!content) {
                lastError = 'empty completion content';
                attempts.push({ provider: provider.slug, model, status: 'empty', latencyMs, error: lastError });
                await logUsage({ agent: req.agent, task: req.task, providerSlug: provider.slug, model, status: 'error', latencyMs, error: lastError });
                await markHealth(provider, false, latencyMs, lastError);
                continue;
            }

            attempts.push({ provider: provider.slug, model, status: 'ok', latencyMs });
            await logUsage({
                agent: req.agent,
                task: req.task,
                providerSlug: provider.slug,
                model,
                status: 'ok',
                latencyMs,
                promptTokens: data.usage?.prompt_tokens,
                completionTokens: data.usage?.completion_tokens,
            });
            await markHealth(provider, true, latencyMs);
            return { ok: true, content, provider: provider.slug, model, latencyMs, attempts };
        } catch (err) {
            const latencyMs = Date.now() - attemptStart;
            lastError = (err as Error).message;
            attempts.push({ provider: provider.slug, model, status: 'exception', latencyMs, error: lastError });
            await logUsage({ agent: req.agent, task: req.task, providerSlug: provider.slug, model, status: 'error', latencyMs, error: lastError });
            await markHealth(provider, false, latencyMs, lastError);
        }
    }

    return {
        ok: false,
        content: '',
        provider: '',
        model: '',
        latencyMs: Date.now() - startedAt,
        attempts,
        error: lastError || 'all candidates failed',
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATION — catalog refresh (cron target llm-catalog-refresh)
// ─────────────────────────────────────────────────────────────────────────────

/** Probe GET /models on every enabled provider, store discovered ids + health. */
export async function refreshCatalog(): Promise<RefreshSummary> {
    const rows = (await listProviders(true)).filter((p) => p.enabled && !placeholderMissing(p));
    const summary: RefreshSummary = { checked: 0, ok: 0, failed: 0, totalModels: 0, results: [], refreshedAt: new Date().toISOString() };

    for (const provider of rows) {
        summary.checked++;
        const apiKey = resolveApiKey(provider);
        const baseUrl = resolveBaseUrl(provider).replace(/\/$/, '');
        const startedAt = Date.now();
        try {
            const url =
                provider.kind === 'freellmapi-upstream'
                    ? `${baseUrl}/models?available=true` // import only models the upstream can serve NOW
                    : `${baseUrl}/models`;
            const res = await fetch(url, {
                headers: { ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
                signal: AbortSignal.timeout(20_000),
            });
            const latencyMs = Date.now() - startedAt;
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = (await res.json()) as { data?: Array<{ id?: string; owned_by?: string }> };
            const models = (data.data ?? [])
                .filter((m) => typeof m?.id === 'string' && m.id.length > 0)
                .map((m) => ({ id: m.id as string, ...(m.owned_by ? { owned_by: m.owned_by } : {}) }))
                .sort((a, b) => a.id.localeCompare(b.id));
            if (models.length === 0) throw new Error('models list empty (upstream may need a key)');
            await updateRecord(TABLE, String(provider.id), { models, health: { status: 'ok', latencyMs, checkedAt: summary.refreshedAt } });
            if (!provider.default_model && models.length > 0) {
                // Prefer a sensible default: first model containing 'flash'|'mini'|'fast', else the first.
                const preferred = models.find((m) => /flash|mini|fast|lite|small/i.test(m.id)) ?? models[0];
                await updateRecord(TABLE, String(provider.id), { defaultModel: preferred.id });
            }
            summary.ok++;
            summary.totalModels += models.length;
            summary.results.push({ slug: provider.slug, ok: true, modelCount: models.length, latencyMs });
        } catch (err) {
            const latencyMs = Date.now() - startedAt;
            summary.failed++;
            const error = (err as Error).message;
            await updateRecord(TABLE, String(provider.id), { health: { status: 'error', latencyMs, checkedAt: summary.refreshedAt, lastError: error.slice(0, 300) } });
            summary.results.push({ slug: provider.slug, ok: false, modelCount: 0, latencyMs, error });
        }
    }
    bustCache();
    return summary;
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin read model
// ─────────────────────────────────────────────────────────────────────────────

export interface RouterStats {
    providers: ProviderRow[];
    keyPresence: Record<string, boolean>; // slug → does any named env var hold a value NOW
    recentUsage: Array<{ agent: string; providerSlug: string; model: string | null; status: string; latencyMs: number; createdAt: string; error: string | null }>;
    totals: { attempts: number; ok: number; failed: number };
}

export async function getRouterStats(): Promise<RouterStats> {
    const providers = await listProviders(true);
    const keyPresence: Record<string, boolean> = {};
    for (const p of providers) keyPresence[p.slug] = Boolean(resolveApiKey(p)) || p.slug === 'pollinations';

    let recentUsage: RouterStats['recentUsage'] = [];
    try {
        recentUsage = (await listRecords(USAGE_TABLE, { orderBy: { column: 'created_at', ascending: false }, limit: 25 })) as RouterStats['recentUsage'];
    } catch (err) {
        logger.warn(`[llm-router] usage read failed: ${(err as Error).message}`);
    }
    const totals = recentUsage.reduce(
        (acc, r) => {
            acc.attempts++;
            if (r.status === 'ok') acc.ok++;
            else acc.failed++;
            return acc;
        },
        { attempts: 0, ok: 0, failed: 0 },
    );
    return { providers, keyPresence, recentUsage, totals };
}

/** Tiny live probe used by the admin window "Test" button. */
export async function testProvider(slug: string): Promise<{ ok: boolean; latencyMs: number; reply?: string; error?: string; model?: string }> {
    const rows = await listProviders(true);
    const provider = rows.find((p) => p.slug === slug);
    if (!provider) return { ok: false, latencyMs: 0, error: `unknown provider "${slug}"` };
    const result = await routeChatCompletion({
        agent: 'llm-router-test',
        task: 'admin-connectivity-test',
        messages: [
            { role: 'system', content: 'You are a connectivity probe. Reply with exactly: OK' },
            { role: 'user', content: 'Reply with exactly: OK' },
        ],
        maxTokens: 16,
    });
    return {
        ok: result.ok && result.provider === slug,
        latencyMs: result.latencyMs,
        reply: result.ok ? result.content.slice(0, 120) : undefined,
        error: result.ok && result.provider !== slug ? `primary failed; fallback ${result.provider} answered` : result.error,
        model: result.ok ? result.model : undefined,
    };
}
