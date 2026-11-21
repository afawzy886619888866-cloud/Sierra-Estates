import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { updateRecord } from '@sierra-estates/db';
import {
    getRouterStats,
    listProviders,
    refreshCatalog,
    testProvider,
    AGENT_LLM_SEED,
} from '@/lib/llm/agent-router';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * ADMIN — LLM Router configuration (freellmapi integration).
 *
 * GET    → providers (models + health + key PRESENCE booleans), recent usage,
 *          seed reference (so the window can offer "add from registry").
 * POST   {action:'update',  slug, patch{baseUrl, priority, enabled,
 *          defaultModel, apiKeyEnv, models?}} — apiKeyEnv accepts ENV VAR
 *          NAMES only; any literal-looking secret is rejected outright.
 * POST   {action:'refresh'}            → refreshCatalog() on all enabled rows.
 * POST   {action:'test', slug}         → tiny live completion probe.
 * POST   {action:'reset', slug}        → restore that row's seed fields.
 *
 * SECURITY: no route accepts or returns key VALUES — only which env var
 * names to resolve at call time. Secrets live in Cloudflare worker env /
 * runner env, exactly like the rest of the stack.
 */

const patchSchema = z.object({
    baseUrl: z.string().max(300).optional(),
    priority: z.number().int().min(1).max(999).optional(),
    enabled: z.boolean().optional(),
    defaultModel: z.string().max(120).nullable().optional(),
    apiKeyEnv: z.string().max(200).nullable().optional(),
    models: z.array(z.object({ id: z.string().min(1), owned_by: z.string().optional() })).max(2000).optional(),
});

const actionSchema = z.object({
    action: z.enum(['update', 'refresh', 'test', 'reset']),
    slug: z.string().max(80).optional(),
    patch: patchSchema.optional(),
});

/** Guards against an operator pasting a secret VALUE into the env-name field. */
function looksLikeSecretValue(value: string): boolean {
    if (/\s/.test(value)) return true;
    if (/^(sk|rk|eyr|cf|ghp|gho)[-_]/i.test(value)) return true; // common key prefixes
    if (/[A-Za-z0-9]{32,}/.test(value) && !/^[A-Z0-9_]+$/.test(value)) return true;
    return false;
}

export async function GET(req: NextRequest) {
    const auth = await verifyAdminRequest(req);
    if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const stats = await getRouterStats();
        return NextResponse.json({ success: true, ...stats, seed: AGENT_LLM_SEED });
    } catch (err) {
        logger.error('[admin/llm-router] GET failed:', (err as Error).message);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = await verifyAdminRequest(req);
    if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = actionSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid payload', detail: parsed.error.flatten() }, { status: 400 });
    }
    const { action, slug, patch } = parsed.data;

    try {
        if (action === 'refresh') {
            const summary = await refreshCatalog();
            return NextResponse.json({ success: true, message: `Refreshed: ${summary.ok}/${summary.checked} ok, ${summary.totalModels} models.`, summary });
        }

        if (!slug) return NextResponse.json({ error: `action "${action}" requires slug` }, { status: 400 });
        const providers = await listProviders(true);
        const provider = providers.find((p) => p.slug === slug);
        if (!provider) return NextResponse.json({ error: `Unknown provider "${slug}"` }, { status: 404 });

        if (action === 'test') {
            const result = await testProvider(slug);
            return NextResponse.json({ success: result.ok, ...result });
        }

        if (action === 'reset') {
            const seed = AGENT_LLM_SEED.find((s) => s.slug === slug);
            if (!seed) return NextResponse.json({ error: `No seed row for "${slug}"` }, { status: 404 });
            await updateRecord('agent_llm_providers', String(provider.id), {
                baseUrl: seed.base_url,
                apiKeyEnv: seed.api_key_env,
                defaultModel: seed.default_model,
                priority: seed.priority,
                enabled: false,
                models: [],
                health: {},
            });
            return NextResponse.json({ success: true, message: `Row "${slug}" reset to seed (disabled).` });
        }

        // action === 'update'
        if (!patch) return NextResponse.json({ error: 'action "update" requires patch' }, { status: 400 });
        if (patch.apiKeyEnv && looksLikeSecretValue(patch.apiKeyEnv)) {
            return NextResponse.json(
                { error: 'apiKeyEnv must contain ENV VAR NAMES (comma-separated), never key values. Put the actual key in Cloudflare worker / runner env.' },
                { status: 400 },
            );
        }
        const values: Record<string, unknown> = {};
        if (patch.baseUrl !== undefined) values.baseUrl = patch.baseUrl.trim();
        if (patch.priority !== undefined) values.priority = patch.priority;
        if (patch.enabled !== undefined) values.enabled = patch.enabled;
        if (patch.defaultModel !== undefined) values.defaultModel = patch.defaultModel?.trim() || null;
        if (patch.apiKeyEnv !== undefined) values.apiKeyEnv = patch.apiKeyEnv?.split(',').map((s) => s.trim()).filter(Boolean).join(',') || null;
        if (patch.models !== undefined) values.models = patch.models;
        if (Object.keys(values).length === 0) return NextResponse.json({ error: 'Empty patch' }, { status: 400 });
        await updateRecord('agent_llm_providers', String(provider.id), values);
        const fresh = (await listProviders(true)).find((p) => p.slug === slug);
        return NextResponse.json({ success: true, message: `Provider "${slug}" updated.`, provider: fresh });
    } catch (err) {
        logger.error('[admin/llm-router] POST failed:', (err as Error).message);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
