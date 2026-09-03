 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
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

 

const CAMEL_BOUNDARY = /[A-Z]/g;
const SNAKE_BOUNDARY = /_([a-z0-9])/g;

export function snakeCaseKey(key) {
    return key.replace(CAMEL_BOUNDARY, (c) => `_${c.toLowerCase()}`);
}

export function camelCaseKey(key) {
    return key.replace(SNAKE_BOUNDARY, (_, c) => c.toUpperCase());
}

/** Deep key conversion. Arrays are mapped; Date becomes an ISO string. */
function convertKeys(value, convert) {
    if (Array.isArray(value)) {
        return value.map((item) => convertKeys(item, convert)) ;
    }
    if (value instanceof Date) {
        return value.toISOString() ;
    }
    // Plain objects only: leave class instances and null alone.
    if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
        const out = {};
        for (const [key, item] of Object.entries(value )) {
            out[convert(key)] = convertKeys(item, convert);
        }
        return out ;
    }
    return value ;
}

export function toColumns(value) {
    return convertKeys(value, snakeCaseKey);
}

export function toRecord(value) {
    return convertKeys(value, camelCaseKey);
}

















function client() {
    return getSupabaseAdmin();
}

/** Throw on a supabase-js error so callers' existing try/catch still fires. */
function raise(context, error) {
    if (error) {
        throw new Error(`[supabase:${context}] ${error.message}`);
    }
}

/**
 * Apply one filter. Written as a switch rather than `query[op](...)` because
 * the builder's methods have distinct signatures, so an indexed call is not
 * type-safe and TypeScript rejects it.
 */
function applyWhere(query, clause) {
    const column = snakeCaseKey(clause.column);
    const value = clause.value;
    switch (_nullishCoalesce(clause.op, () => ( 'eq'))) {
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
            return query.in(column, value );
        case 'eq':
        default:
            return query.eq(column, value);
    }
}

/** The subset of the PostgREST builder applyWhere needs. */












export async function listRecords(
    table,
    options = {}
) {
    let query = client().from(table).select(_nullishCoalesce(options.select, () => ( '*')));

    for (const clause of _nullishCoalesce(options.where, () => ( []))) {
        query = applyWhere(query, clause);
    }

    if (options.orderBy) {
        query = query.order(snakeCaseKey(options.orderBy.column), {
            ascending: _nullishCoalesce(options.orderBy.ascending, () => ( true)),
        });
    }
    if (options.limit != null) {
        const from = _nullishCoalesce(options.offset, () => ( 0));
        query = query.range(from, from + options.limit - 1);
    }

    const { data, error } = await query;
    raise(`list ${table}`, error);
    return toRecord(_nullishCoalesce(data, () => ( [])));
}

export async function getRecord(
    table,
    id,
    idColumn = 'id'
) {
    const { data, error } = await client()
        .from(table)
        .select('*')
        .eq(idColumn, id)
        .maybeSingle();

    raise(`get ${table}`, error);
    return data ? toRecord(data) : null;
}

export async function insertRecord(
    table,
    values
) {
    const { data, error } = await client()
        .from(table)
        .insert(toColumns(values))
        .select()
        .single();

    raise(`insert ${table}`, error);
    return toRecord(data);
}

export async function updateRecord(
    table,
    id,
    values,
    idColumn = 'id'
) {
    const { data, error } = await client()
        .from(table)
        .update(toColumns(values))
        .eq(idColumn, id)
        .select()
        .maybeSingle();

    raise(`update ${table}`, error);
    return data ? toRecord(data) : null;
}

/** Insert or update on conflict — the Firestore `set(..., { merge: true })` shape. */
export async function upsertRecord(
    table,
    values,
    onConflict = 'id'
) {
    const { data, error } = await client()
        .from(table)
        .upsert(toColumns(values), { onConflict })
        .select()
        .single();

    raise(`upsert ${table}`, error);
    return toRecord(data);
}

/** Insert many rows in one round trip, chunked to keep the request body sane. */
export async function insertRecords(
    table,
    rows,
    chunkSize = 500
) {
    const out = [];
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize).map((row) => toColumns(row));
        const { data, error } = await client().from(table).insert(chunk).select();

        raise(`insert ${table} [${i}..${i + chunk.length})`, error);
        for (const row of _nullishCoalesce(data, () => ( []))) out.push(toRecord(row));
    }
    return out;
}

/**
 * Upsert many rows in one round trip.
 *
 * Firestore callers chunked these into batches because a WriteBatch caps at 500
 * operations. Postgres has no such cap, but a very large payload still has to
 * fit in one request body, so the rows are sent in chunks — larger than the
 * Firestore limit, and each chunk is a single atomic statement.
 */
export async function upsertRecords(
    table,
    rows,
    onConflict = 'id',
    chunkSize = 500
) {
    const out = [];
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize).map((row) => toColumns(row));
        const { data, error } = await client()
            .from(table)
            .upsert(chunk, { onConflict })
            .select();

        raise(`upsert ${table} [${i}..${i + chunk.length})`, error);
        for (const row of _nullishCoalesce(data, () => ( []))) out.push(toRecord(row));
    }
    return out;
}

export async function deleteRecord(
    table,
    id,
    idColumn = 'id'
) {
    const { error } = await client().from(table).delete().eq(idColumn, id);
    raise(`delete ${table}`, error);
}

export async function countRecords(
    table,
    where = []
) {
    let query = client().from(table).select('*', { count: 'exact', head: true });
    for (const clause of where) {
        query = applyWhere(query, clause);
    }
    const { count, error } = await query;
    raise(`count ${table}`, error);
    return _nullishCoalesce(count, () => ( 0));
}
