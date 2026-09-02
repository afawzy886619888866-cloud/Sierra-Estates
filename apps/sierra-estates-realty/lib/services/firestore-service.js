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


  onSnapshot,

} from 'firebase/firestore';
import { COLLECTIONS, } from '../models/schema';

// ─── Generic CRUD ────────────────────────────────────────────────────

/**
 * Create a document in a collection.
 */
export async function createDocument(
  collectionName,
  data
) {
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
export async function getDocument(
  collectionName,
  docId
) {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } ;
}

/**
 * Update a document by ID (partial update).
 */
export async function updateDocument(
  collectionName,
  docId,
  data
) {
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
  collectionName,
  docId
) {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}

// ─── Query Helpers ───────────────────────────────────────────────────









/**
 * Query documents with filters, sorting, and pagination.
 */
export async function queryDocuments(
  collectionName,
  options = {}
) {
  const constraints = [];

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
  const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } ));
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  return { data, lastDoc };
}

/**
 * Subscribe to real-time updates on a collection.
 */
export function subscribeToCollection(
  collectionName,
  callback,
  options = {}
) {
  const constraints = [];

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
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } ));
    callback(data);
  });
}

// ─── Collection-Specific Shortcuts ──────────────────────────────────

export const Units = {
  create: (data) => createDocument(COLLECTIONS.units, data),
  get: (id) => getDocument(COLLECTIONS.units, id),
  update: (id, data) => updateDocument(COLLECTIONS.units, id, data),
  remove: (id) => deleteDocument(COLLECTIONS.units, id),
  query: (opts) => queryDocuments(COLLECTIONS.units, opts),
  subscribe: (cb, opts) =>
    subscribeToCollection(COLLECTIONS.units, cb, opts),
};

export const Projects = {
  create: (data) => createDocument(COLLECTIONS.projects, data),
  get: (id) => getDocument(COLLECTIONS.projects, id),
  update: (id, data) => updateDocument(COLLECTIONS.projects, id, data),
  remove: (id) => deleteDocument(COLLECTIONS.projects, id),
  query: (opts) => queryDocuments(COLLECTIONS.projects, opts),
  subscribe: (cb, opts) =>
    subscribeToCollection(COLLECTIONS.projects, cb, opts),
};

export const Developers = {
  create: (data) => createDocument(COLLECTIONS.developers, data),
  get: (id) => getDocument(COLLECTIONS.developers, id),
  update: (id, data) => updateDocument(COLLECTIONS.developers, id, data),
  remove: (id) => deleteDocument(COLLECTIONS.developers, id),
  query: (opts) => queryDocuments(COLLECTIONS.developers, opts),
  subscribe: (cb, opts) =>
    subscribeToCollection(COLLECTIONS.developers, cb, opts),
};

export const Leads = {
  create: (data) => createDocument(COLLECTIONS.stakeholders, data),
  get: (id) => getDocument(COLLECTIONS.stakeholders, id),
  update: (id, data) => updateDocument(COLLECTIONS.stakeholders, id, data),
  remove: (id) => deleteDocument(COLLECTIONS.stakeholders, id),
  query: (opts) => queryDocuments(COLLECTIONS.stakeholders, opts),
  subscribe: (cb, opts) =>
    subscribeToCollection(COLLECTIONS.stakeholders, cb, opts),
};
