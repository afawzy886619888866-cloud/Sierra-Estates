import 'server-only';

/**
 * SUPER BROKER MEMORY — the Soul (2026-11-20).
 *
 * One united memory spine for the whole brokerage. Every engine and agent
 * (OpenClaw terminal, harness/aiService consumers, WhatsApp station ingest,
 * availability engine, price-index, LLM router health, admin operators)
 * writes what it learns through soulRemember() and recalls through
 * soulRecall()/soulContext() before acting — one broker's brain, not many
 * disconnected tools.
 *
 * Storage: broker_memory_entries / broker_memory_digests (migration 054),
 * service-role access, dedupe-key idempotent writes, graceful no-op when the
 * migration is not applied yet (same posture as SupabaseMemoryStore).
 * Rows are camelCased by @sierra-estates/db (toRecord) — read both casings
 * defensively so the lib works with or without that mapping.
 *
 * Growth: the memory-consolidation automation (cron target
 * memory-consolidation, dedupe 12h) distills the day's entries into a digest
 * + insights and remembers them back — routed through the free-provider LLM
 * router (lib/llm/agent-router.ts) so the Soul grows without paid inference.
 *
 * PRIVACY LOCK (system boundary ③): never store owner/broker phone numbers
 * or other confidential contact details in content/metadata — call-side
 * contact goes through the confidential line, subject keys stay abstract
 * (e.g. 'owner:INV-123').
 */

import crypto from 'node:crypto';
import {
    insertRecord,
    listRecords,
    updateRecord,
    countRecords,
    getSupabaseAdmin,
    type WhereClause,
} from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { routeChatCompletion, type RouteResult } from '@/lib/llm/agent-router';

const ENTRIES_TABLE = 'broker_memory_entries';
const DIGESTS_TABLE = 'broker_memory_digests';
const MAX_CONTENT = 4_000;
const SCAN_LIMIT = 400; // recall scans the recent tail, then ranks in JS

export type SoulKind = 'observation' | 'insight' | 'fact' | 'event' | 'reflection' | 'digest';
export type SoulScope = 'global' | 'client' | 'unit' | 'owner' | 'broker' | 'agent';

export interface SoulRememberInput {
    kind?: SoulKind;
    scope?: SoulScope;
    agent: string;
    subject?: string | null;
    content: string;
    importance?: number; // 1..5
    confidence?: number; // 0..1
    source?: string | null;
    metadata?: Record<string, unknown>;
    expiresAt?: string | null;
}

export interface SoulEntry {
    id: number;
    createdAt: string;
    kind: string;
    scope: string;
    agent: string;
    subject: string | null;
    content: string;
    importance: number;
    confidence: number;
    source: string | null;
}

export interface SoulRecallOptions {
    limit?: number;
    kind?: SoulKind | SoulKind[];
    scope?: SoulScope;
    subject?: string;
    sinceHours?: number;
    minImportance?: number;
}

export interface SoulRememberResult {
    ok: boolean;
    id?: number;
    deduped?: boolean;
    error?: string;
}

export interface SoulDigestResult {
    ok: boolean;
    digestId?: number;
    entryCount: number;
    provider?: string;
    model?: string;
    llmSummarized: boolean;
    error?: string;
}

interface RawEntry extends Record<string, unknown> {
    id: number;
    kind: string;
    scope: string;
    agent: string;
    content: string;
    importance?: number;
}

function pickStr(row: Record<string, unknown>, ...keys: string[]): string | null {
    for (const k of keys) {
        const v = row[k];
        if (v != null) return String(v);
    }
    return null;
}

function pickNum(row: Record<string, unknown>, key: string, fallback: number): number {
    const v = row[key];
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function normalizeEntry(row: RawEntry): SoulEntry {
    return {
        id: Number(row.id),
        createdAt: pickStr(row, 'createdAt', 'created_at') || new Date().toISOString(),
        kind: row.kind,
        scope: row.scope,
        agent: row.agent,
        subject: pickStr(row, 'subject'),
        content: row.content,
        importance: pickNum(row, 'importance', 3),
        confidence: pickNum(row, 'confidence', 0.8),
        source: pickStr(row, 'source'),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// WRITE — remember (idempotent via dedupe key)
// ─────────────────────────────────────────────────────────────────────────────

export function soulDedupeKey(input: Pick<SoulRememberInput, 'agent' | 'kind' | 'subject' | 'content'>): string {
    const norm = (input.content || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return crypto
        .createHash('sha1')
        .update(`${input.agent}::${input.kind || 'observation'}::${input.subject || ''}::${norm}`)
        .digest('hex');
}

const SOUL_NOT_MIGRATED = /relation .* does not exist|schema cache|could not find the table/i;

export async function soulRemember(input: SoulRememberInput): Promise<SoulRememberResult> {
    const content = (input.content || '').slice(0, MAX_CONTENT).trim();
    if (!input.agent || !content) {
        return { ok: false, error: 'agent and content are required' };
    }
    const importance = Math.min(5, Math.max(1, Math.round(input.importance ?? 3)));
    const confidence = Math.min(1, Math.max(0, input.confidence ?? 0.8));
    try {
        const inserted = (await insertRecord<{ id?: number }>(ENTRIES_TABLE, {
            kind: input.kind || 'observation',
            scope: input.scope || 'global',
            agent: input.agent,
            subject: input.subject || null,
            content,
            metadata: input.metadata || {},
            importance,
            confidence,
            source: input.source || null,
            dedupeKey: soulDedupeKey({ agent: input.agent, kind: input.kind, subject: input.subject, content }),
            expiresAt: input.expiresAt || null,
        })) as { id?: number };
        return { ok: true, id: inserted?.id };
    } catch (err) {
        const msg = (err as Error).message || '';
        if (/duplicate key|dedupe/i.test(msg)) return { ok: true, deduped: true };
        if (SOUL_NOT_MIGRATED.test(msg)) {
            logger.warn('[soul] broker_memory_entries missing (migration 054 not applied) — write skipped');
            return { ok: false, error: 'soul-not-migrated' };
        }
        logger.warn(`[soul] remember failed: ${msg}`);
        return { ok: false, error: msg };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// READ — recall (term overlap × importance × recency, ranked app-side)
// ─────────────────────────────────────────────────────────────────────────────

function scoreEntry(row: RawEntry, tokens: string[], now: number): number {
    const createdAt = pickStr(row as Record<string, unknown>, 'createdAt', 'created_at');
    const subject = pickStr(row as Record<string, unknown>, 'subject') || '';
    const hay = `${subject} ${row.content}`.toLowerCase();
    let overlap = 0;
    for (const t of tokens) if (hay.includes(t)) overlap += 1;
    const overlapScore = tokens.length ? overlap / tokens.length : 0.5;
    const ageHours = createdAt ? Math.max(0, (now - new Date(createdAt).getTime()) / 3_600_000) : 0;
    const recency = Math.exp(-ageHours / (24 * 14)); // ~2-week decay horizon
    const importance = (row.importance || 3) / 5;
    return overlapScore * 0.55 + recency * 0.2 + importance * 0.25;
}

export async function soulRecall(query: string, opts: SoulRecallOptions = {}): Promise<SoulEntry[]> {
    const limit = Math.min(25, Math.max(1, opts.limit ?? 8));
    try {
        const where: WhereClause[] = [{ column: 'status', value: 'active' }];
        if (opts.scope) where.push({ column: 'scope', value: opts.scope });
        if (opts.subject) where.push({ column: 'subject', value: opts.subject });
        if (opts.kind) {
            const kinds = Array.isArray(opts.kind) ? opts.kind : [opts.kind];
            if (kinds.length === 1) where.push({ column: 'kind', value: kinds[0] });
        }
        if (opts.minImportance) where.push({ column: 'importance', op: 'gte', value: opts.minImportance });
        if (opts.sinceHours) {
            where.push({
                column: 'created_at',
                op: 'gte',
                value: new Date(Date.now() - opts.sinceHours * 3_600_000).toISOString(),
            });
        }
        const rows = (await listRecords<RawEntry>(ENTRIES_TABLE, {
            where,
            limit: SCAN_LIMIT,
            orderBy: { column: 'created_at', ascending: false },
        })) as RawEntry[];
        const tokens = (query || '')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .split(/\s+/)
            .filter((t) => t.length > 2);
        const now = Date.now();
        const ranked = rows
            .map((row) => ({ row, score: scoreEntry(row, tokens, now) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        // recall bookkeeping — best-effort, never blocks the answer
        for (const { row } of ranked) {
            try {
                await updateRecord(ENTRIES_TABLE, String(row.id), {
                    recallCount: pickNum(row as Record<string, unknown>, 'recallCount', 0) + 1,
                    lastRecalledAt: new Date().toISOString(),
                });
            } catch { /* bookkeeping is optional */ }
        }
        return ranked.map(({ row }) => normalizeEntry(row));
    } catch (err) {
        const msg = (err as Error).message || '';
        if (!SOUL_NOT_MIGRATED.test(msg)) {
            logger.warn(`[soul] recall failed: ${msg}`);
        }
        return [];
    }
}

/**
 * Formatted memory context for prompts — engines prepend this so every LLM
 * call carries the broker's accumulated knowledge.
 */
export async function soulContext(query: string, opts: SoulRecallOptions = {}): Promise<string> {
    const entries = await soulRecall(query, opts);
    if (!entries.length) return '';
    const lines = entries.map(
        (e) => `- [${e.kind}×${e.importance}★] (${e.agent}${e.subject ? `, ${e.subject}` : ''}) ${e.content}`
    );
    return `SUPER BROKER MEMORY — relevant accumulated knowledge:\n${lines.join('\n')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSOLIDATION — the Soul grows: distill the day into durable insights
// ─────────────────────────────────────────────────────────────────────────────

export async function soulConsolidate(period: 'day' | 'week' = 'day'): Promise<SoulDigestResult> {
    const periodStart = new Date();
    if (period === 'week') periodStart.setUTCDate(periodStart.getUTCDate() - 7);
    else periodStart.setUTCHours(0, 0, 0, 0);
    const sinceIso = periodStart.toISOString();

    let entries: RawEntry[] = [];
    try {
        entries = (await listRecords<RawEntry>(ENTRIES_TABLE, {
            where: [
                { column: 'status', value: 'active' },
                { column: 'created_at', op: 'gte', value: sinceIso },
                { column: 'kind', op: 'neq', value: 'digest' },
            ],
            limit: 300,
            orderBy: { column: 'created_at', ascending: false },
        })) as RawEntry[];
    } catch (err) {
        return { ok: false, entryCount: 0, llmSummarized: false, error: (err as Error).message };
    }

    if (!entries.length) {
        return { ok: true, entryCount: 0, llmSummarized: false };
    }

    const stats = {
        entries: entries.length,
        byKind: entries.reduce<Record<string, number>>((acc, e) => {
            acc[e.kind] = (acc[e.kind] || 0) + 1;
            return acc;
        }, {}),
        byAgent: entries.reduce<Record<string, number>>((acc, e) => {
            acc[e.agent] = (acc[e.agent] || 0) + 1;
            return acc;
        }, {}),
        periodStart: sinceIso,
    };

    // Grow through the free-provider router when any provider is enabled.
    let digestText = '';
    let insights: Array<{ text: string; tag?: string }> = [];
    let provider: string | null = null;
    let model: string | null = null;
    let llmSummarized = false;

    const transcript = entries
        .slice(0, 120)
        .map((e, i) => {
            const subject = pickStr(e as Record<string, unknown>, 'subject');
            return `${i + 1}. (${e.kind}/${e.agent}${subject ? ` @ ${subject}` : ''}) ${e.content}`;
        })
        .join('\n');
    try {
        const result: RouteResult = await routeChatCompletion({
            agent: 'soul-consolidator',
            task: 'memory-consolidation',
            temperature: 0.2,
            maxTokens: 900,
            messages: [
                {
                    role: 'system',
                    content:
                        'You are the Super Broker memory consolidator for Sierra Estates (New Cairo real estate brokerage). ' +
                        "Distill the period's operational memory into: (1) a tight digest paragraph, then (2) 3-7 durable insights " +
                        'as lines starting with "INSIGHT:". Insights must be reusable broker knowledge (pricing signals, client ' +
                        'preferences, inventory patterns, engine health, outreach timing). Never invent facts; only use the given entries. ' +
                        'Never include phone numbers or personal contact details — refer to them as the confidential line.',
                },
                { role: 'user', content: `Period: ${sinceIso} → now\nEntries:\n${transcript}` },
            ],
        });
        if (result.ok && result.content) {
            llmSummarized = true;
            provider = result.provider;
            model = result.model;
            const parts = result.content.split(/INSIGHT:/i);
            digestText = parts[0].trim().slice(0, MAX_CONTENT) || 'Digest.';
            insights = parts
                .slice(1)
                .map((chunk) => ({ text: chunk.trim().split('\n')[0].slice(0, 400) }))
                .filter((i) => i.text.length > 8)
                .slice(0, 7);
        }
    } catch (err) {
        logger.warn(`[soul] consolidation LLM pass failed: ${(err as Error).message}`);
    }

    if (!llmSummarized) {
        // Honest no-LLM fallback: stats-only digest (nothing fabricated).
        digestText =
            `Stats-only digest (no free-LLM provider enabled / router unreachable): ${entries.length} entries recorded ` +
            `(${Object.entries(stats.byKind).map(([k, v]) => `${k}:${v}`).join(', ') || 'none'}); ` +
            `agents: ${Object.entries(stats.byAgent).map(([k, v]) => `${k}:${v}`).join(', ') || 'none'}.`;
        provider = 'none';
        model = 'none';
    }

    try {
        const digest = (await insertRecord<{ id?: number }>(DIGESTS_TABLE, {
            period,
            periodStart: sinceIso.slice(0, 10),
            digest: digestText,
            insights,
            stats,
            provider,
            model,
            entryCount: entries.length,
        })) as { id?: number };
        // Insights feed back into the spine as durable knowledge.
        for (const insight of insights) {
            await soulRemember({
                kind: 'insight',
                agent: 'soul-consolidator',
                scope: 'global',
                content: insight.text,
                importance: 4,
                confidence: 0.85,
                source: `digest:${digest?.id ?? 'n/a'}`,
            });
        }
        return {
            ok: true,
            digestId: digest?.id,
            entryCount: entries.length,
            provider: provider || undefined,
            model: model || undefined,
            llmSummarized,
        };
    } catch (err) {
        return { ok: false, entryCount: entries.length, llmSummarized, error: (err as Error).message };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS + ADMIN HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export interface SoulDigestRow {
    id: number;
    createdAt: string;
    period: string;
    periodStart: string;
    digest: string;
    insights: Array<{ text: string; tag?: string }>;
    provider: string | null;
    model: string | null;
    entryCount: number;
}

export interface SoulStats {
    total: number;
    active: number;
    last24h: number;
    byKind: Record<string, number>;
    byAgent: Record<string, number>;
    lastDigest: SoulDigestRow | null;
    tableReady: boolean;
}

export async function listSoulDigests(limit = 10): Promise<SoulDigestRow[]> {
    try {
        const rows = (await listRecords<Record<string, unknown>>(DIGESTS_TABLE, {
            limit,
            orderBy: { column: 'created_at', ascending: false },
        })) as Array<Record<string, unknown>>;
        return rows.map((r) => ({
            id: Number(r.id),
            createdAt: pickStr(r, 'createdAt', 'created_at') || '',
            period: String(r.period ?? 'day'),
            periodStart: String(r.periodStart ?? r.period_start ?? ''),
            digest: String(r.digest ?? ''),
            insights: Array.isArray(r.insights) ? (r.insights as SoulDigestRow['insights']) : [],
            provider: pickStr(r, 'provider'),
            model: pickStr(r, 'model'),
            entryCount: pickNum(r, 'entryCount', 0),
        }));
    } catch (err) {
        logger.warn(`[soul] digests degraded: ${(err as Error).message}`);
        return [];
    }
}

export async function getSoulStats(): Promise<SoulStats> {
    try {
        const sinceIso = new Date(Date.now() - 24 * 3_600_000).toISOString();
        const [total, active, last24h] = await Promise.all([
            countRecords(ENTRIES_TABLE, []),
            countRecords(ENTRIES_TABLE, [{ column: 'status', value: 'active' }]),
            countRecords(ENTRIES_TABLE, [{ column: 'created_at', op: 'gte', value: sinceIso }]),
        ]);
        const recent = (await listRecords<RawEntry>(ENTRIES_TABLE, {
            limit: 500,
            orderBy: { column: 'created_at', ascending: false },
        })) as RawEntry[];
        const digests = await listSoulDigests(1);
        const d0 = digests[0];
        return {
            total: Number(total) || 0,
            active: Number(active) || 0,
            last24h: Number(last24h) || 0,
            byKind: recent.reduce<Record<string, number>>((acc, e) => {
                acc[e.kind] = (acc[e.kind] || 0) + 1;
                return acc;
            }, {}),
            byAgent: recent.reduce<Record<string, number>>((acc, e) => {
                acc[e.agent] = (acc[e.agent] || 0) + 1;
                return acc;
            }, {}),
            lastDigest: d0
                ? {
                      id: d0.id,
                      createdAt: d0.createdAt,
                      period: d0.period,
                      periodStart: d0.periodStart,
                      digest: d0.digest,
                      insights: d0.insights,
                      provider: d0.provider,
                      model: d0.model,
                      entryCount: d0.entryCount,
                  }
                : null,
            tableReady: true,
        };
    } catch (err) {
        logger.warn(`[soul] stats degraded: ${(err as Error).message}`);
        return { total: 0, active: 0, last24h: 0, byKind: {}, byAgent: {}, lastDigest: null, tableReady: false };
    }
}

export async function soulArchive(id: number): Promise<boolean> {
    try {
        await updateRecord(ENTRIES_TABLE, String(id), { status: 'archived' });
        return true;
    } catch (err) {
        logger.warn(`[soul] archive ${id} failed: ${(err as Error).message}`);
        return false;
    }
}

export async function soulDelete(id: number): Promise<boolean> {
    try {
        const admin = getSupabaseAdmin();
        const { error } = await admin.from(ENTRIES_TABLE).delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (err) {
        logger.warn(`[soul] delete ${id} failed: ${(err as Error).message}`);
        return false;
    }
}

/**
 * Recall-then-act wrapper — the standard engine integration: engines run
 * their work inside the callback which receives the relevant memory context
 * string ('' when the Soul has nothing yet), then remember the outcome with
 * soulRemember() so the next run is smarter.
 */
export async function withSoul<T>(
    args: { agent: string; subject?: string | null; query?: string; limit?: number },
    fn: (context: string) => Promise<T>
): Promise<T> {
    const context = await soulContext(args.query || args.subject || '', {
        subject: args.subject || undefined,
        limit: args.limit ?? 6,
    });
    return fn(context);
}
