/**
 * Repository Pattern — Abstract persistence layer
 * Decouples services from Firebase implementation
 * Enables unit testing without Firebase credentials
 */

import { adminDb, isAdminInitialized } from '@/lib/server/firebase-admin';
import { CollectionReference, DocumentData, Query } from 'firebase-admin/firestore';

// Type alias for Firebase Admin query constraints
export type QueryConstraint = any;

export interface Repository<T extends DocumentData> {
  findById(id: string): Promise<T | null>;
  findAll(constraints?: QueryConstraint[]): Promise<T[]>;
  findOne(constraints: QueryConstraint[]): Promise<T | null>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export class FirestoreRepository<T extends DocumentData> implements Repository<T> {
  constructor(private collectionName: string) {}

  private getCollection(): CollectionReference<T> {
    if (!isAdminInitialized) {
      throw new Error(`Firebase not initialized. Cannot access ${this.collectionName}`);
    }
    return adminDb.collection(this.collectionName) as CollectionReference<T>;
  }

  async findById(id: string): Promise<T | null> {
    try {
      const doc = await this.getCollection().doc(id).get();
      return doc.exists ? ({ id: doc.id, ...doc.data() } as unknown as T) : null;
    } catch (error) {
      console.error(`[Repository] Error finding ${this.collectionName}/${id}:`, error);
      throw error;
    }
  }

  async findAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    try {
      let query: Query<T> = this.getCollection();
      for (const constraint of constraints) {
        query = query.where(constraint) as Query<T>;
      }
      const snapshot = await query.get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
      console.error(`[Repository] Error finding all in ${this.collectionName}:`, error);
      throw error;
    }
  }

  async findOne(constraints: QueryConstraint[]): Promise<T | null> {
    try {
      let query: Query<T> = this.getCollection();
      for (const constraint of constraints) {
        query = query.where(constraint) as Query<T>;
      }
      const snapshot = await query.limit(1).get();
      const doc = snapshot.docs[0];
      return doc ? ({ id: doc.id, ...doc.data() } as T) : null;
    } catch (error) {
      console.error(`[Repository] Error finding one in ${this.collectionName}:`, error);
      throw error;
    }
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    try {
      const docRef = await this.getCollection().add({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      return { id: docRef.id, ...data, createdAt: new Date(), updatedAt: new Date() } as unknown as T;
    } catch (error) {
      console.error(`[Repository] Error creating in ${this.collectionName}:`, error);
      throw error;
    }
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    try {
      await this.getCollection().doc(id).update({
        ...data,
        updatedAt: new Date(),
      });
      const updated = await this.findById(id);
      if (!updated) throw new Error(`Document not found after update: ${id}`);
      return updated;
    } catch (error) {
      console.error(`[Repository] Error updating ${this.collectionName}/${id}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.getCollection().doc(id).delete();
    } catch (error) {
      console.error(`[Repository] Error deleting ${this.collectionName}/${id}:`, error);
      throw error;
    }
  }
}
