 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }/**
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

} from '@sierra-estates/db';

/**
 * A single filter. Previously an opaque Firebase constraint object; now the
 * record layer's clause shape, so callers state the column, operator and value
 * explicitly instead of building a driver-specific object.
 */
 










export class SupabaseRepository {
  constructor( tableName) {;this.tableName = tableName;}

  async findById(id) {
    try {
      return await getRecord(this.tableName, id);
    } catch (error) {
      console.error(`[Repository] Error finding ${this.tableName}/${id}:`, error);
      throw error;
    }
  }

  async findAll(constraints = []) {
    try {
      return await listRecords(this.tableName, { where: constraints });
    } catch (error) {
      console.error(`[Repository] Error finding all in ${this.tableName}:`, error);
      throw error;
    }
  }

  async findOne(constraints) {
    try {
      const [row] = await listRecords(this.tableName, {
        where: constraints,
        limit: 1,
      });
      return _nullishCoalesce(row, () => ( null));
    } catch (error) {
      console.error(`[Repository] Error finding one in ${this.tableName}:`, error);
      throw error;
    }
  }

  async create(data) {
    try {
      const now = new Date().toISOString();
      // insertRecord returns the stored row, so the created object reflects
      // database defaults rather than being reconstructed from the input.
      return await insertRecord(this.tableName, {
        ...(data ),
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      console.error(`[Repository] Error creating in ${this.tableName}:`, error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      const updated = await updateRecord(this.tableName, id, {
        ...(data ),
        updatedAt: new Date().toISOString(),
      });
      if (!updated) throw new Error(`Document not found after update: ${id}`);
      return updated;
    } catch (error) {
      console.error(`[Repository] Error updating ${this.tableName}/${id}:`, error);
      throw error;
    }
  }

  async delete(id) {
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
