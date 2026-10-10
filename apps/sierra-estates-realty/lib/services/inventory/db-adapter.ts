import { getRecord, upsertRecord, updateRecord, listRecords } from '@sierra-estates/db';
import type { FirestoreLike } from './InventoryDomainService';

/**
 * Creates a database adapter that bridges InventoryDomainService
 * to Supabase PostgreSQL via @sierra-estates/db record functions.
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
              try {
                const data = await getRecord<any>(tableName, docId);
                return {
                  exists: Boolean(data),
                  id: docId,
                  data: () => data,
                };
              } catch {
                return {
                  exists: false,
                  id: docId,
                  data: () => null,
                };
              }
            },
            async set(data: any, opts?: { merge?: boolean }) {
              return await upsertRecord(tableName, { ...data, id: docId });
            },
            async update(data: any) {
              return await updateRecord(tableName, docId, data);
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
