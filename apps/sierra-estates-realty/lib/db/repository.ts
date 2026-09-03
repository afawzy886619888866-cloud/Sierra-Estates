/**
 * Repository Pattern — Abstract persistence layer
 *
 * Decouples services from the database implementation and lets them be unit
 * tested without live credentials. Backed by the Supabase record layer in
 * @sierra-estates/db, which converts camelCase <-> snake_case and throws on
 * database errors rather than returning them.
 */

import {
  listRecords,
  getRecord,
  insertRecord,
  updateRecord,
  deleteRecord,
  type WhereClause,
} from '@sierra-estates/db';

/**
 * A single filter. Previously an opaque Firebase constraint object; now the
 * record layer's clause shape, so callers state the column, operator and value
 * explicitly instead of building a driver-specific object.
 */
export type QueryConstraint = WhereClause;

export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(constraints?: QueryConstraint[]): Promise<T[]>;
  findOne(constraints: QueryConstraint[]): Promise<T | null>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export class SupabaseRepository<T> implements Repository<T> {
  constructor(private tableName: string) {}

  async findById(id: string): Promise<T | null> {
    try {
      return await getRecord<T>(this.tableName, id);
    } catch (error) {
      console.error(`[Repository] Error finding ${this.tableName}/${id}:`, error);
      throw error;
    }
  }

  async findAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    try {
      return await listRecords<T>(this.tableName, { where: constraints });
    } catch (error) {
      console.error(`[Repository] Error finding all in ${this.tableName}:`, error);
      throw error;
    }
  }

  async findOne(constraints: QueryConstraint[]): Promise<T | null> {
    try {
      const [row] = await listRecords<T>(this.tableName, {
        where: constraints,
        limit: 1,
      });
      return row ?? null;
    } catch (error) {
      console.error(`[Repository] Error finding one in ${this.tableName}:`, error);
      throw error;
    }
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    try {
      const now = new Date().toISOString();
      // insertRecord returns the stored row, so the created object reflects
      // database defaults rather than being reconstructed from the input.
      return await insertRecord<T>(this.tableName, {
        ...(data as Record<string, unknown>),
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      console.error(`[Repository] Error creating in ${this.tableName}:`, error);
      throw error;
    }
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    try {
      const updated = await updateRecord<T>(this.tableName, id, {
        ...(data as Record<string, unknown>),
        updatedAt: new Date().toISOString(),
      });
      if (!updated) throw new Error(`Document not found after update: ${id}`);
      return updated;
    } catch (error) {
      console.error(`[Repository] Error updating ${this.tableName}/${id}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await deleteRecord(this.tableName, id);
    } catch (error) {
      console.error(`[Repository] Error deleting ${this.tableName}/${id}:`, error);
      throw error;
    }
  }
}

/**
 * @deprecated Kept so existing imports keep working during the migration.
 * Prefer SupabaseRepository — this is the same class, not Firestore.
 */
export const FirestoreRepository = SupabaseRepository;
