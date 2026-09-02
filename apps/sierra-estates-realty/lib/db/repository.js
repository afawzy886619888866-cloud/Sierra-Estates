/**
 * Repository Pattern — Abstract persistence layer
 * Decouples services from Firebase implementation
 * Enables unit testing without Firebase credentials
 */

import { adminDb, isAdminInitialized } from '@/lib/server/firebase-admin';


// Type alias for Firebase Admin query constraints
 










export class FirestoreRepository {
  constructor( collectionName) {;this.collectionName = collectionName;}

   getCollection() {
    if (!isAdminInitialized) {
      throw new Error(`Firebase not initialized. Cannot access ${this.collectionName}`);
    }
    return adminDb.collection(this.collectionName) ;
  }

  async findById(id) {
    try {
      const doc = await this.getCollection().doc(id).get();
      return doc.exists ? ({ id: doc.id, ...doc.data() } ) : null;
    } catch (error) {
      console.error(`[Repository] Error finding ${this.collectionName}/${id}:`, error);
      throw error;
    }
  }

  async findAll(constraints = []) {
    try {
      let query = this.getCollection();
      for (const constraint of constraints) {
        query = query.where(constraint) ;
      }
      const snapshot = await query.get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } ));
    } catch (error) {
      console.error(`[Repository] Error finding all in ${this.collectionName}:`, error);
      throw error;
    }
  }

  async findOne(constraints) {
    try {
      let query = this.getCollection();
      for (const constraint of constraints) {
        query = query.where(constraint) ;
      }
      const snapshot = await query.limit(1).get();
      const doc = snapshot.docs[0];
      return doc ? ({ id: doc.id, ...doc.data() } ) : null;
    } catch (error) {
      console.error(`[Repository] Error finding one in ${this.collectionName}:`, error);
      throw error;
    }
  }

  async create(data) {
    try {
      const docRef = await this.getCollection().add({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      } );
      return { id: docRef.id, ...data, createdAt: new Date(), updatedAt: new Date() } ;
    } catch (error) {
      console.error(`[Repository] Error creating in ${this.collectionName}:`, error);
      throw error;
    }
  }

  async update(id, data) {
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

  async delete(id) {
    try {
      await this.getCollection().doc(id).delete();
    } catch (error) {
      console.error(`[Repository] Error deleting ${this.collectionName}/${id}:`, error);
      throw error;
    }
  }
}
