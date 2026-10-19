import { getRecord, upsertRecord, updateRecord } from '@sierra-estates/db';
import type { FirestoreLike } from './InventoryDomainService';
import { logger } from '@/lib/logger';

/**
 * Creates a database adapter that bridges InventoryDomainService
 * to Supabase PostgreSQL via @sierra-estates/db record functions.
 *
 * Error contract (2026-10-19 hardening): `getRecord` returns `null` ONLY on a
 * clean miss and THROWS on any real database failure (network, auth, RLS,
 * timeout). This adapter must preserve that distinction — swallowing a thrown
 * error and reporting `exists: false` would make every outage look like
 * "record not found", silently DISABLING deduplication and fabricating a new
 * record on the next write. Failures now propagate so ingestion paths fail
 * loudly (durable FAILED state, retryable) instead of inventing inventory.
 */
export function createSupabaseDbAdapter(): FirestoreLike {
  return {
    collection(tableName: string) {
      return {
        doc(id?: string) {
          const docId = id ?? '';
          return {
            id: docId,
            async get() {
              // A `null` return is the ONLY legitimate "not found" signal
              // (records.ts uses .maybeSingle() and raises on real errors).
              // Anything thrown is a genuine failure: re-throw, never mask it
              // as "record not found" (that would disable dedup on outage).
              const data = await getRecord<unknown>(tableName, docId);
              return {
                exists: data != null,
                id: docId,
                data: () => data,
              };
            },
            async set(data: any, _opts?: { merge?: boolean }) {
              // _opts kept for FirestoreLike signature compatibility: the
              // records-layer upsert is id-conflict based and the caller has
              // already spread existing+payload (merge semantics preserved).
              return await upsertRecord(tableName, { ...data, id: docId });
            },
            async update(data: any) {
              try {
                return await updateRecord(tableName, docId, data);
              } catch (err) {
                logger.error(`[db-adapter] update failed on ${tableName}/${docId}:`, err);
                throw err;
              }
            },
          };
        },
        where(field: string, op: string, value: unknown) {
          return { field, op, value };
        },
      };
    },
  };
}
