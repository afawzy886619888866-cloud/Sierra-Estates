import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import {
    getSoulStats,
    listSoulDigests,
    soulRecall,
    soulRemember,
    soulConsolidate,
    soulArchive,
    soulDelete,
    type SoulKind,
} from '@/lib/memory/broker-soul';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * ADMIN — Super Broker Memory (the Soul).
 *
 * GET  ?q=&kind=&limit=&digests=1 → recall entries (ranked), stats, digests.
 * POST {action:'remember', entry}  → manual admin note (kind 'fact').
 * POST {action:'consolidate', period?} → run the consolidation distillation
 *        (routes through the free-provider LLM router when enabled).
 * POST {action:'archive', id} | {action:'delete', id} → curate the spine.
 *
 * Same posture as /api/admin/llm-router: admin-guarded, nothing sensitive is
 * stored or returned — entries never carry phone numbers (privacy lock ③).
 */

const rememberSchema = z.object({
    action: z.literal('remember'),
    entry: z.object({
        subject: z.string().max(200).nullable().optional(),
        content: z.string().min(3).max(4000),
        importance: z.number().int().min(1).max(5).optional(),
        scope: z.enum(['global', 'client', 'unit', 'owner', 'broker', 'agent']).optional(),
        source: z.string().max(200).nullable().optional(),
    }),
});

const consolidateSchema = z.object({
    action: z.literal('consolidate'),
    period: z.enum(['day', 'week']).optional(),
});

const idSchema = z.object({
    action: z.enum(['archive', 'delete']),
    id: z.number().int().positive(),
});

const bodySchema = z.discriminatedUnion('action', [rememberSchema, consolidateSchema, idSchema]);

export async function GET(req: NextRequest) {
    const auth = await verifyAdminRequest(req);
    if (!auth.authenticated) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const url = new URL(req.url);
        const q = url.searchParams.get('q') ?? '';
        const kindParam = url.searchParams.get('kind');
        const limitParam = Number(url.searchParams.get('limit') ?? 30);
        const wantDigests = url.searchParams.get('digests') === '1';
        const stats = await getSoulStats();
        const entries = q || kindParam
            ? await soulRecall(q, {
                  limit: Math.min(100, Math.max(1, limitParam)),
                  kind: (kindParam as SoulKind) || undefined,
              })
            : [];
        const digests = wantDigests ? await listSoulDigests(10) : undefined;
        return NextResponse.json({ success: true, stats, entries, digests });
    } catch (err) {
        logger.error('[admin/soul] GET error:', (err as Error).message);
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = await verifyAdminRequest(req);
    if (!auth.authenticated) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const parsed = bodySchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: 'Invalid payload', detail: parsed.error.flatten() }, { status: 400 });
        }
        const body = parsed.data;
        if (body.action === 'remember') {
            const result = await soulRemember({
                agent: 'admin',
                kind: 'fact',
                scope: body.entry.scope || 'global',
                subject: body.entry.subject ?? null,
                content: body.entry.content,
                importance: body.entry.importance ?? 4,
                confidence: 1,
                source: body.entry.source ?? 'admin',
            });
            return NextResponse.json({ success: result.ok, ...result });
        }
        if (body.action === 'consolidate') {
            const result = await soulConsolidate(body.period ?? 'day');
            return NextResponse.json({ success: result.ok, ...result });
        }
        const ok = body.action === 'archive' ? await soulArchive(body.id) : await soulDelete(body.id);
        return NextResponse.json({ success: ok, action: body.action, id: body.id });
    } catch (err) {
        logger.error('[admin/soul] POST error:', (err as Error).message);
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}
