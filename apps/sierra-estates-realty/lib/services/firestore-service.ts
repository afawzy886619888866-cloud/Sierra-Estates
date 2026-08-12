/**
 * SIERRA ESTATES — FIRESTORE SERVICE LAYER
 * Generic CRUD operations for all collections.
 * Type-safe wrappers around Firestore SDK.
 */

import { db } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  DocumentSnapshot,
  QueryConstraint,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { COLLECTIONS, type BaseDocument } from '../models/schema';

// ─── Generic CRUD ────────────────────────────────────────────────────

/**
 * Create a document in a collection.
 */
export async function createDocument<T extends BaseDocument>(
  collectionName: string,
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get a single document by ID.
 */
export async function getDocument<T extends BaseDocument>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as T;
}

/**
 * Update a document by ID (partial update).
 */
export async function updateDocument<T extends BaseDocument>(
  collectionName: string,
  docId: string,
  data: Partial<Omit<T, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a document by ID.
 */
export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}

// ─── Query Helpers ───────────────────────────────────────────────────

export interface QueryOptions {
  filters?: Array<{ field: string; op: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'array-contains'; value: unknown }>;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  pageSize?: number;
  startAfterDoc?: DocumentSnapshot;
}

/**
 * Query documents with filters, sorting, and pagination.
 */
export async function queryDocuments<T extends BaseDocument>(
  collectionName: string,
  options: QueryOptions = {}
): Promise<{ data: T[]; lastDoc: DocumentSnapshot | null }> {
  const constraints: QueryConstraint[] = [];

  // Add filters
  if (options.filters) {
    for (const f of options.filters) {
      constraints.push(where(f.field, f.op, f.value));
    }
  }

  // Add sorting
  if (options.sortBy) {
    constraints.push(orderBy(options.sortBy, options.sortDirection || 'desc'));
  }

  // Add pagination
  if (options.pageSize) {
    constraints.push(limit(options.pageSize));
  }

  if (options.startAfterDoc) {
    constraints.push(startAfter(options.startAfterDoc));
  }

  const q = query(collection(db, collectionName), ...constraints);
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as T));
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  return { data, lastDoc };
}

/**
 * Subscribe to real-time updates on a collection.
 */
export function subscribeToCollection<T extends BaseDocument>(
  collectionName: string,
  callback: (data: T[]) => void,
  options: Omit<QueryOptions, 'startAfterDoc'> = {}
): Unsubscribe {
  const constraints: QueryConstraint[] = [];

  if (options.filters) {
    for (const f of options.filters) {
      constraints.push(where(f.field, f.op, f.value));
    }
  }

  if (options.sortBy) {
    constraints.push(orderBy(options.sortBy, options.sortDirection || 'desc'));
  }

  if (options.pageSize) {
    constraints.push(limit(options.pageSize));
  }

  const q = query(collection(db, collectionName), ...constraints);

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as T));
    callback(data);
  });
}

// ─── Collection-Specific Shortcuts ──────────────────────────────────

export const Units = {
  create: (data: Parameters<typeof createDocument>[1]) => createDocument(COLLECTIONS.units, data),
  get: (id: string) => getDocument(COLLECTIONS.units, id),
  update: (id: string, data: Parameters<typeof updateDocument>[2]) => updateDocument(COLLECTIONS.units, id, data),
  remove: (id: string) => deleteDocument(COLLECTIONS.units, id),
  query: (opts?: QueryOptions) => queryDocuments(COLLECTIONS.units, opts),
  subscribe: (cb: Parameters<typeof subscribeToCollection>[1], opts?: Parameters<typeof subscribeToCollection>[2]) =>
    subscribeToCollection(COLLECTIONS.units, cb, opts),
};

export const Projects = {
  create: (data: Parameters<typeof createDocument>[1]) => createDocument(COLLECTIONS.projects, data),
  get: (id: string) => getDocument(COLLECTIONS.projects, id),
  update: (id: string, data: Parameters<typeof updateDocument>[2]) => updateDocument(COLLECTIONS.projects, id, data),
  remove: (id: string) => deleteDocument(COLLECTIONS.projects, id),
  query: (opts?: QueryOptions) => queryDocuments(COLLECTIONS.projects, opts),
  subscribe: (cb: Parameters<typeof subscribeToCollection>[1], opts?: Parameters<typeof subscribeToCollection>[2]) =>
    subscribeToCollection(COLLECTIONS.projects, cb, opts),
};

export const Developers = {
  create: (data: Parameters<typeof createDocument>[1]) => createDocument(COLLECTIONS.developers, data),
  get: (id: string) => getDocument(COLLECTIONS.developers, id),
  update: (id: string, data: Parameters<typeof updateDocument>[2]) => updateDocument(COLLECTIONS.developers, id, data),
  remove: (id: string) => deleteDocument(COLLECTIONS.developers, id),
  query: (opts?: QueryOptions) => queryDocuments(COLLECTIONS.developers, opts),
  subscribe: (cb: Parameters<typeof subscribeToCollection>[1], opts?: Parameters<typeof subscribeToCollection>[2]) =>
    subscribeToCollection(COLLECTIONS.developers, cb, opts),
};

export const Leads = {
  create: (data: Parameters<typeof createDocument>[1]) => createDocument(COLLECTIONS.stakeholders, data),
  get: (id: string) => getDocument(COLLECTIONS.stakeholders, id),
  update: (id: string, data: Parameters<typeof updateDocument>[2]) => updateDocument(COLLECTIONS.stakeholders, id, data),
  remove: (id: string) => deleteDocument(COLLECTIONS.stakeholders, id),
  query: (opts?: QueryOptions) => queryDocuments(COLLECTIONS.stakeholders, opts),
  subscribe: (cb: Parameters<typeof subscribeToCollection>[1], opts?: Parameters<typeof subscribeToCollection>[2]) =>
    subscribeToCollection(COLLECTIONS.stakeholders, cb, opts),
};
