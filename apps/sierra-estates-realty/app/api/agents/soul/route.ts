import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySharedSecret } from '@/lib/server/webhook-auth';
import { soulRemember, soulRecall, type SoulKind } from '@/lib/memory/broker-soul';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * AGENTS — Super Broker Memory access (the Soul's agent port).
 *
 * Every agent (OpenClaw terminal, harness, WhatsApp station, external
 * workers) reads and writes the ONE shared memory spine here:
 *   GET  ?q=&limit=          → recall relevant entries (ranked).
 *   POST {action:'remember', entry{agent, content, kind?, subject?,
 *          importance?, scope?, source?, metadata?}}  → write an observation.
 *   POST {action:'recall', query, limit?, kind?}       → programmatic recall.
 *
 * Auth: x-sbr-secret-key / SBR_SECRET_KEY shared secret (same as the
 * WhatsApp ingest webhook). Privacy lock ③: entries must not carry raw
 * phone numbers — the validator rejects obvious phone digits.
 */

const KINDS = ['observation', 'insight', 'fact', 'event', 'reflection'] as const;

const rememberSchema = z.object({
    action: z.literal('remember'),
    entry: z.object({
        agent: z.string().min(2).max(80),
        content: z.string().min(3).max(4000),
        kind: z.enum(KINDS).optional(),
        subject: z.string().max(200).nullable().optional(),
        importance: z.number().int().min(1).max(5).optional(),
        scope: z.enum(['global', 'client', 'unit', 'owner', 'broker', 'agent']).optional(),
        source: z.string().max(120).nullable().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
    }),
});

const recallSchema = z.object({
    action: z.literal('recall'),
    query: z.string().max(500),
    limit: z.number().int().min(1).max(25).optional(),
    kind: z.enum(KINDS).optional(),
    subject: z.string().max(200).optional(),
    sinceHours: z.number().int().min(1).max(24 * 90).optional(),
});

const bodySchema = z.discriminatedUnion('action', [rememberSchema, recallSchema]);

/** Privacy lock ③: reject content that embeds raw phone numbers. */
function looksLikePhone(text: string): boolean {
    return /(?:\+?\d[\d\s().-]{8,}\d)/.test(text);
}

export async function GET(req: NextRequest) {
    const denied = verifySharedSecret(req, {
        header: 'x-sbr-secret-key',
        secret: process.env.SBR_SECRET_KEY,
        name: 'agents-soul',
    });
    if (denied) return denied;
    try {
        const url = new URL(req.url);
        const q = url.searchParams.get('q') ?? '';
        const limit = Number(url.searchParams.get('limit') ?? 8);
        const entries = await soulRecall(q, {
            limit: Math.min(25, Math.max(1, limit)),
            kind: (url.searchParams.get('kind') as SoulKind) || undefined,
        });
        return NextResponse.json({ success: true, entries });
    } catch (err) {
        logger.error('[agents/soul] GET error:', (err as Error).message);
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const denied = verifySharedSecret(req, {
        header: 'x-sbr-secret-key',
        secret: process.env.SBR_SECRET_KEY,
        name: 'agents-soul',
    });
    if (denied) return denied;
    try {
        const parsed = bodySchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: 'Invalid payload', detail: parsed.error.flatten() }, { status: 400 });
        }
        const body = parsed.data;
        if (body.action === 'recall') {
            const entries = await soulRecall(body.query, {
                limit: body.limit,
                kind: body.kind,
                subject: body.subject,
                sinceHours: body.sinceHours,
            });
            return NextResponse.json({ success: true, entries });
        }
        if (looksLikePhone(body.entry.content)) {
            return NextResponse.json(
                { success: false, error: 'Privacy lock: raw phone numbers are not stored in the Soul — use the confidential line instead.' },
                { status: 422 }
            );
        }
        const result = await soulRemember({
            agent: body.entry.agent,
            kind: body.entry.kind,
            scope: body.entry.scope,
            subject: body.entry.subject ?? null,
            content: body.entry.content,
            importance: body.entry.importance,
            confidence: 0.8,
            source: body.entry.source ?? 'agent-api',
            metadata: body.entry.metadata,
        });
        return NextResponse.json({ success: result.ok, ...result });
    } catch (err) {
        logger.error('[agents/soul] POST error:', (err as Error).message);
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}
