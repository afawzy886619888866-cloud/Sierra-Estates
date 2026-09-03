import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from './supabase';

/**
 * Table-agnostic record access for the Firebase → Supabase migration.
 *
 * Two things this layer exists to absorb, so that migrating a route is a small
 * diff rather than a rewrite:
 *
 * 1. **Naming.** Routes, their Zod schemas and the frontend all speak
 *    camelCase; Postgres columns are snake_case. Converting at this boundary
 *    keeps every API response byte-identical to the Firestore era, so no
 *    client change is needed.
 * 2. **Errors.** supabase-js returns `{ data, error }` rather than throwing.
 *    Routes previously relied on Firestore throwing into their try/catch, so
 *    silently ignoring `error` would turn a failed write into a 200. These
 *    helpers throw, preserving the existing control flow.
 *
 * Callers are server-side routes that have already authorised the request
 * (verifyAdminRequest and friends), so they use the service-role client. RLS
 * remains the protection for anything talking to Supabase directly.
 */

export type RecordData = Record<string, unknown>;

const CAMEL_BOUNDARY = /[A-Z]/g;
const SNAKE_BOUNDARY = /_([a-z0-9])/g;

export function snakeCaseKey(key: string): string {
    return key.replace(CAMEL_BOUNDARY, (c) => `_${c.toLowerCase()}`);
}

export function camelCaseKey(key: string): string {
    return key.replace(SNAKE_BOUNDARY, (_, c: string) => c.toUpperCase());
}

/** Deep key conversion. Arrays are mapped; Date becomes an ISO string. */
function convertKeys<T>(value: unknown, convert: (key: string) => string): T {
    if (Array.isArray(value)) {
        return value.map((item) => convertKeys(item, convert)) as unknown as T;
    }
    if (value instanceof Date) {
        return value.toISOString() as unknown as T;
    }
    // Plain objects only: leave class instances and null alone.
    if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
        const out: RecordData = {};
        for (const [key, item] of Object.entries(value as RecordData)) {
            out[convert(key)] = convertKeys(item, convert);
        }
        return out as unknown as T;
    }
    return value as T;
}

export function toColumns<T = RecordData>(value: unknown): T {
    return convertKeys<T>(value, snakeCaseKey);
}

export function toRecord<T = RecordData>(value: unknown): T {
    return convertKeys<T>(value, camelCaseKey);
}

export interface WhereClause {
    column: string;
    /** Defaults to equality, matching the Firestore `where(x, '==', y)` usage. */
    op?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in';
    value: unknown;
}

export interface ListOptions {
    where?: WhereClause[];
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
    /** Column list; defaults to everything. */
    select?: string;
}

function client(): SupabaseClient {
    return getSupabaseAdmin();
}

/** Throw on a supabase-js error so callers' existing try/catch still fires. */
function raise(context: string, error: { message: string } | null): void {
    if (error) {
        throw new Error(`[supabase:${context}] ${error.message}`);
    }
}

/**
 * Apply one filter. Written as a switch rather than `query[op](...)` because
 * the builder's methods have distinct signatures, so an indexed call is not
 * type-safe and TypeScript rejects it.
 */
function applyWhere<Q extends PostgrestFilter<Q>>(query: Q, clause: WhereClause): Q {
    const column = snakeCaseKey(clause.column);
    const value = clause.value;
    switch (clause.op ?? 'eq') {
        case 'neq':
            return query.neq(column, value);
        case 'gt':
            return query.gt(column, value);
        case 'gte':
            return query.gte(column, value);
        case 'lt':
            return query.lt(column, value);
        case 'lte':
            return query.lte(column, value);
        case 'like':
            return query.like(column, String(value));
        case 'ilike':
            return query.ilike(column, String(value));
        case 'in':
            return query.in(column, value as readonly unknown[]);
        case 'eq':
        default:
            return query.eq(column, value);
    }
}

/** The subset of the PostgREST builder applyWhere needs. */
interface PostgrestFilter<Q> {
    eq(column: string, value: unknown): Q;
    neq(column: string, value: unknown): Q;
    gt(column: string, value: unknown): Q;
    gte(column: string, value: unknown): Q;
    lt(column: string, value: unknown): Q;
    lte(column: string, value: unknown): Q;
    like(column: string, value: string): Q;
    ilike(column: string, value: string): Q;
    in(column: string, values: readonly unknown[]): Q;
}

export async function listRecords<T = RecordData>(
    table: string,
    options: ListOptions = {}
): Promise<T[]> {
    let query = client().from(table).select(options.select ?? '*');

    for (const clause of options.where ?? []) {
        query = applyWhere(query, clause);
    }

    if (options.orderBy) {
        query = query.order(snakeCaseKey(options.orderBy.column), {
            ascending: options.orderBy.ascending ?? true,
        });
    }
    if (options.limit != null) {
        const from = options.offset ?? 0;
        query = query.range(from, from + options.limit - 1);
    }

    const { data, error } = await query;
    raise(`list ${table}`, error);
    return toRecord<T[]>(data ?? []);
}

export async function getRecord<T = RecordData>(
    table: string,
    id: string,
    idColumn = 'id'
): Promise<T | null> {
    const { data, error } = await client()
        .from(table)
        .select('*')
        .eq(idColumn, id)
        .maybeSingle();

    raise(`get ${table}`, error);
    return data ? toRecord<T>(data) : null;
}

export async function insertRecord<T = RecordData>(
    table: string,
    values: RecordData
): Promise<T> {
    const { data, error } = await client()
        .from(table)
        .insert(toColumns(values))
        .select()
        .single();

    raise(`insert ${table}`, error);
    return toRecord<T>(data);
}

export async function updateRecord<T = RecordData>(
    table: string,
    id: string,
    values: RecordData,
    idColumn = 'id'
): Promise<T | null> {
    const { data, error } = await client()
        .from(table)
        .update(toColumns(values))
        .eq(idColumn, id)
        .select()
        .maybeSingle();

    raise(`update ${table}`, error);
    return data ? toRecord<T>(data) : null;
}

/** Insert or update on conflict — the Firestore `set(..., { merge: true })` shape. */
export async function upsertRecord<T = RecordData>(
    table: string,
    values: RecordData,
    onConflict = 'id'
): Promise<T> {
    const { data, error } = await client()
        .from(table)
        .upsert(toColumns(values), { onConflict })
        .select()
        .single();

    raise(`upsert ${table}`, error);
    return toRecord<T>(data);
}

/**
 * Upsert many rows in one round trip.
 *
 * Firestore callers chunked these into batches because a WriteBatch caps at 500
 * operations. Postgres has no such cap, but a very large payload still has to
 * fit in one request body, so the rows are sent in chunks — larger than the
 * Firestore limit, and each chunk is a single atomic statement.
 */
export async function upsertRecords<T = RecordData>(
    table: string,
    rows: RecordData[],
    onConflict = 'id',
    chunkSize = 500
): Promise<T[]> {
    const out: T[] = [];
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize).map((row) => toColumns(row));
        const { data, error } = await client()
            .from(table)
            .upsert(chunk, { onConflict })
            .select();

        raise(`upsert ${table} [${i}..${i + chunk.length})`, error);
        for (const row of data ?? []) out.push(toRecord<T>(row));
    }
    return out;
}

export async function deleteRecord(
    table: string,
    id: string,
    idColumn = 'id'
): Promise<void> {
    const { error } = await client().from(table).delete().eq(idColumn, id);
    raise(`delete ${table}`, error);
}

export async function countRecords(
    table: string,
    where: WhereClause[] = []
): Promise<number> {
    let query = client().from(table).select('*', { count: 'exact', head: true });
    for (const clause of where) {
        query = applyWhere(query, clause);
    }
    const { count, error } = await query;
    raise(`count ${table}`, error);
    return count ?? 0;
}
