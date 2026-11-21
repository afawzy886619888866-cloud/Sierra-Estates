import { NextRequest, NextResponse } from 'next/server';
import { verifyBearerSecret } from '@/lib/server/agent-bearer';
import { listProviders } from '@/lib/llm/agent-router';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * OPENCLAW GATEWAY — OpenAI-compatible model list.
 * GET /api/agents/openclaw/v1/models
 * Auth: `Authorization: Bearer $SBR_SECRET_KEY`.
 *
 * `soul-auto` is always present: it means "let the admin-ordered free-provider
 * router pick" (priority + health + failover). Additionally, the default model
 * of every ENABLED router provider is exposed so the OpenClaw agent can pin a
 * specific upstream when needed. Model ids are logical names — nothing here
 * exposes keys (env-var NAMES only inside the router).
 */
export async function GET(req: NextRequest) {
    const denied = verifyBearerSecret(req, 'openclaw-gateway');
    if (denied) return denied;

    const data: Array<{ id: string; object: string; owned_by: string }> = [
        { id: 'soul-auto', object: 'model', owned_by: 'sierra-soul' },
        { id: 'soul-fast', object: 'model', owned_by: 'sierra-soul' },
    ];
    try {
        const providers = await listProviders();
        for (const p of providers) {
            if (!p.enabled) continue;
            if (p.default_model) {
                data.push({ id: p.default_model, object: 'model', owned_by: `router:${p.slug}` });
            }
        }
    } catch (err) {
        logger.warn('[openclaw-gateway] models list degraded to logical names:', (err as Error).message);
    }

    return NextResponse.json({ object: 'list', data });
}
