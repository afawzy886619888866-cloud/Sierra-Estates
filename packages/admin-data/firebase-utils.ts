/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Sierra Estates — Firebase CRUD Utilities (Admin data layer)
 *  Ported from SE's apps/admin Vite SPA (services/firebaseUtils.ts) into a
 *  shared workspace package so both the Vite admin and the Next.js admin
 *  can consume the same typed Firestore access instead of duplicating it.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Modular Firestore CRUD functions for the Admin surface.
 *
 *  🏗️ Low-Cost Firebase Strategy:
 *    - NO Cloud Functions. All logic runs client-side.
 *    - Firestore rules enforce RBAC (super_admin vs agent).
 *    - Queries are structured for efficiency: compound indexes created
 *      only where needed (status+mode, status+compound_name).
 *    - Batch writes used for atomic multi-document operations.
 *    - Realtime listeners (onSnapshot) used sparingly — only on the
 *      Admin dashboard, not on every page.
 *
 *  🔒 PII Policy:
 *    - `owners` collection is NEVER written to from the client portal.
 *    - `createListingWithOwner()` uses a batch write so listing + owner
 *      are created atomically with the same ID.
 *    - Admin SPA reads owners via a separate function that's only
 *      called from the authenticated admin UI.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  type Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type QueryConstraint,
  writeBatch,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import {
  COLLECTIONS,
  type Listing,
  type ListingInput,
  type Owner,
  type OwnerInput,
  type Client,
  type ClientInput,
  type Request,
  type RequestInput,
  type Agent,
  type AgentInput,
  type CreateListingWithOwnerPayload,
  type ListingStatus,
  type RequestStatus,
} from './types';

/* ──────────────────────────────────────────────────────────────────────────
 *  FIREBASE INITIALIZATION (singleton)
 *  Reads config from NEXT_PUBLIC_FIREBASE_* (falls back to VITE_FIREBASE_*
 *  so the same package still works unmodified inside the Vite admin).
 *  Reuses any already-initialized default app instead of re-initializing —
 *  the host app (Next.js realty app, or the Vite admin) typically already
 *  called initializeApp() once for its own client SDK usage.
 * ────────────────────────────────────────────────────────────────────────── */

let db: Firestore | null = null;

function envVar(name: string): string | undefined {
  const env = process.env as Record<string, string | undefined>;
  return env[`NEXT_PUBLIC_${name}`] ?? env[`VITE_${name}`];
}

function getDb(): Firestore {
  if (db) return db;

  let app: FirebaseApp;
  if (getApps().length > 0) {
    app = getApp();
  } else {
    const firebaseConfig = {
      apiKey: envVar('FIREBASE_API_KEY'),
      authDomain: envVar('FIREBASE_AUTH_DOMAIN'),
      projectId: envVar('FIREBASE_PROJECT_ID'),
      storageBucket: envVar('FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: envVar('FIREBASE_MESSAGING_SENDER_ID'),
      appId: envVar('FIREBASE_APP_ID'),
    };

    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error(
        'Firebase config missing. Set NEXT_PUBLIC_FIREBASE_* (or VITE_FIREBASE_*) env vars.'
      );
    }

    app = initializeApp(firebaseConfig);
  }

  db = getFirestore(app);
  return db;
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  LISTINGS CRUD (public collection — admin writes, public reads active)
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Fetch all listings, optionally filtered by status.
 * Default: only "active" listings (most common admin view).
 *
 * @example
 *   const active = await fetchListings({ status: 'active' });
 *   const all    = await fetchListings({ status: undefined }); // all statuses
 */
export async function fetchListings(opts?: {
  status?: ListingStatus;
  mode?: 'sale' | 'rent';
  compound?: string;
  limitCount?: number;
}): Promise<Listing[]> {
  const db = getDb();
  const constraints: QueryConstraint[] = [];

  if (opts?.status) constraints.push(where('status', '==', opts.status));
  if (opts?.mode) constraints.push(where('mode', '==', opts.mode));
  if (opts?.compound) constraints.push(where('compound_name', '==', opts.compound));
  constraints.push(orderBy('created_at', 'desc'));
  if (opts?.limitCount) constraints.push(limit(opts.limitCount));

  const q = query(collection(db, COLLECTIONS.LISTINGS), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Listing);
}

/**
 * Fetch a single listing by ID.
 * Returns null if not found.
 */
export async function fetchListingById(id: string): Promise<Listing | null> {
  const db = getDb();
  const ref = doc(db, COLLECTIONS.LISTINGS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Listing;
}

/**
 * Create a new listing. Auto-generates an ID.
 * Returns the created listing with the new ID + server timestamps.
 *
 * Note: For listings with owner PII, use `createListingWithOwner()` instead
 * to ensure atomic creation.
 */
export async function createListing(data: ListingInput): Promise<Listing> {
  const db = getDb();
  const ref = await addDoc(collection(db, COLLECTIONS.LISTINGS), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return (await fetchListingById(ref.id))!;
}

/**
 * Update an existing listing. Sets updated_at automatically.
 * Partial updates supported — only provided fields are written.
 */
export async function updateListing(
  id: string,
  patch: Partial<ListingInput>
): Promise<void> {
  const db = getDb();
  const ref = doc(db, COLLECTIONS.LISTINGS, id);
  await updateDoc(ref, {
    ...patch,
    updated_at: serverTimestamp(),
  });
}

/**
 * Soft-delete a listing by setting status to "sold" (or "draft").
 * Hard delete only for super_admin (enforced by Firestore rules).
 */
export async function deleteListing(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, COLLECTIONS.LISTINGS, id));
}

/**
 * Change listing status (draft → active → sold).
 * Common admin action — exposed as a dedicated function for clarity.
 */
export async function setListingStatus(
  id: string,
  status: ListingStatus
): Promise<void> {
  await updateListing(id, { status });
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  ⭐ ATOMIC LISTING + OWNER CREATION (batch write)
 *  This is the cornerstone of the Zero-Trust PII policy.
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Create a listing AND its owner document atomically using a Firestore batch.
 *
 * Both documents share the SAME Firestore document ID, so admins can look
 * up an owner by querying `owners/{listingId}`. The batch write ensures
 * either both succeed or both fail — no orphan listings without owners,
 * no orphan owners without listings.
 *
 * 🔒 Security:
 *   - The `listing` document is public (if status="active").
 *   - The `owner` document is strictly private (Firestore rules block public read).
 *   - Even if the Admin SPA crashes mid-write, the batch is atomic.
 */
export async function createListingWithOwner(
  payload: CreateListingWithOwnerPayload
): Promise<{ listingId: string; ownerId: string }> {
  const db = getDb();
  const batch = writeBatch(db);

  // Generate a single ID — used for BOTH documents.
  const listingRef = doc(collection(db, COLLECTIONS.LISTINGS));
  const listingId = listingRef.id;
  const ownerRef = doc(db, COLLECTIONS.OWNERS, listingId); // same ID

  const now = serverTimestamp();

  // Listing (public) — includes all marketing data, NO PII.
  batch.set(listingRef, {
    ...payload.listing,
    created_at: now,
    updated_at: now,
  });

  // Owner (private PII) — linked by ID, separate collection.
  batch.set(ownerRef, {
    ...payload.owner,
    created_at: now,
    updated_at: now,
  });

  // Atomic commit — both or neither.
  await batch.commit();

  return { listingId, ownerId: listingId };
}

/**
 * Update a listing AND its owner in a single batch.
 * Useful when reassigning a listing (agent change + owner contact update).
 */
export async function updateListingAndOwner(
  listingId: string,
  listingPatch: Partial<ListingInput>,
  ownerPatch: Partial<OwnerInput>
): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  const now = serverTimestamp();

  batch.update(doc(db, COLLECTIONS.LISTINGS, listingId), {
    ...listingPatch,
    updated_at: now,
  });
  batch.update(doc(db, COLLECTIONS.OWNERS, listingId), {
    ...ownerPatch,
    updated_at: now,
  });

  await batch.commit();
}

/**
 * Delete a listing AND its owner atomically.
 * Prevents orphan owner documents with PII but no listing.
 */
export async function deleteListingAndOwner(listingId: string): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);

  batch.delete(doc(db, COLLECTIONS.LISTINGS, listingId));
  batch.delete(doc(db, COLLECTIONS.OWNERS, listingId));

  await batch.commit();
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  OWNERS CRUD (STRICTLY PRIVATE — admin-only)
 *  🔒 These functions must NEVER be imported by the client portal.
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Fetch the owner of a specific listing.
 * The owner doc ID == listing doc ID.
 */
export async function fetchOwnerByListingId(
  listingId: string
): Promise<Owner | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, COLLECTIONS.OWNERS, listingId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Owner;
}

/**
 * Fetch all owners (admin dashboard view).
 * Paginated via limitCount (default 100).
 */
export async function fetchAllOwners(limitCount = 100): Promise<Owner[]> {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.OWNERS),
    orderBy('created_at', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Owner);
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  REQUESTS CRUD (Workflow Tickets — admin-only)
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Fetch requests, optionally filtered by status or assigned agent.
 * Default: all open requests (bot_handling + ready_for_agent).
 */
export async function fetchRequests(opts?: {
  status?: RequestStatus;
  assignedAgentId?: string;
  clientId?: string;
  limitCount?: number;
}): Promise<Request[]> {
  const db = getDb();
  const constraints: QueryConstraint[] = [];

  if (opts?.status) constraints.push(where('status', '==', opts.status));
  if (opts?.assignedAgentId)
    constraints.push(where('assigned_agent_id', '==', opts.assignedAgentId));
  if (opts?.clientId)
    constraints.push(where('client_id', '==', opts.clientId));
  constraints.push(orderBy('created_at', 'desc'));
  if (opts?.limitCount) constraints.push(limit(opts.limitCount));

  const q = query(collection(db, COLLECTIONS.REQUESTS), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Request);
}

/**
 * Fetch a single request by ID (full ticket with chat history).
 */
export async function fetchRequestById(id: string): Promise<Request | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, COLLECTIONS.REQUESTS, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Request;
}

/**
 * Create a new request ticket.
 * Usually called by the WhatsApp bot (via n8n webhook → admin API).
 */
export async function createRequest(data: RequestInput): Promise<Request> {
  const db = getDb();
  const ref = await addDoc(collection(db, COLLECTIONS.REQUESTS), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() } as Request;
}

/**
 * Update a request (e.g. add chat message, change status, assign agent).
 */
export async function updateRequest(
  id: string,
  patch: Partial<RequestInput>
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTIONS.REQUESTS, id), {
    ...patch,
    updated_at: serverTimestamp(),
  });
}

/**
 * Append a chat message to a request's bot_chat_history array.
 * Uses arrayUnion to avoid race conditions when bot + agent both write.
 */
export async function appendChatMessage(
  requestId: string,
  message: { sender: 'client' | 'bot' | 'agent'; text: string; timestamp: string }
): Promise<void> {
  const db = getDb();
  const ref = doc(db, COLLECTIONS.REQUESTS, requestId);
  await updateDoc(ref, {
    bot_chat_history: arrayUnion(message),
    updated_at: serverTimestamp(),
  });
}

/**
 * Escalate a request from bot to human agent.
 * Sets status="ready_for_agent" + assigns agent.
 */
export async function escalateToAgent(
  requestId: string,
  agentId: string
): Promise<void> {
  await updateRequest(requestId, {
    status: 'ready_for_agent',
    assigned_agent_id: agentId,
  });
}

/**
 * Close a request. Sets status="closed" + closed_at timestamp.
 */
export async function closeRequest(requestId: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTIONS.REQUESTS, requestId), {
    status: 'closed',
    closed_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

/**
 * Delete a request (soft delete recommended — use closeRequest instead).
 */
export async function deleteRequest(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, COLLECTIONS.REQUESTS, id));
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  CLIENTS CRUD (CRM — admin-only)
 * ═══════════════════════════════════════════════════════════════════════════ */

export async function fetchClients(limitCount = 100): Promise<Client[]> {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.CLIENTS),
    orderBy('created_at', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Client);
}

export async function fetchClientById(id: string): Promise<Client | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, COLLECTIONS.CLIENTS, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Client;
}

/**
 * Find a client by phone number (for dedup before creating new).
 * Returns null if no existing client has this number.
 */
export async function fetchClientByPhone(
  phoneNumber: string
): Promise<Client | null> {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.CLIENTS),
    where('phone_number', '==', phoneNumber),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Client;
}

export async function createClient(data: ClientInput): Promise<Client> {
  const db = getDb();
  const ref = await addDoc(collection(db, COLLECTIONS.CLIENTS), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() } as Client;
}

export async function updateClient(
  id: string,
  patch: Partial<ClientInput>
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTIONS.CLIENTS, id), {
    ...patch,
    updated_at: serverTimestamp(),
  });
}

export async function deleteClient(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, COLLECTIONS.CLIENTS, id));
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  AGENTS CRUD (RBAC Directory)
 * ═══════════════════════════════════════════════════════════════════════════ */

export async function fetchAgents(): Promise<Agent[]> {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.AGENTS),
    where('is_active', '==', true),
    orderBy('name', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Agent);
}

export async function fetchAgentById(id: string): Promise<Agent | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, COLLECTIONS.AGENTS, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Agent;
}

/**
 * Create an agent. The ID must match the Firebase Auth UID
 * (caller is responsible for creating the Auth user first).
 */
export async function createAgent(
  uid: string,
  data: AgentInput
): Promise<Agent> {
  const db = getDb();
  await setDoc(doc(db, COLLECTIONS.AGENTS, uid), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return (await fetchAgentById(uid))!;
}

export async function updateAgent(
  id: string,
  patch: Partial<AgentInput>
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTIONS.AGENTS, id), {
    ...patch,
    updated_at: serverTimestamp(),
  });
}

/** Soft-delete: mark agent as inactive (preserve historical references). */
export async function deactivateAgent(id: string): Promise<void> {
  await updateAgent(id, { is_active: false });
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  REALTIME LISTENERS (used sparingly — Admin dashboard only)
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Subscribe to realtime updates on active listings.
 * Returns an unsubscribe function.
 */
export function subscribeToListings(
  callback: (listings: Listing[]) => void,
  statusFilter: ListingStatus = 'active'
): () => void {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.LISTINGS),
    where('status', '==', statusFilter),
    orderBy('created_at', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Listing));
  });
}

/**
 * Subscribe to realtime updates on open requests (dashboard widget).
 */
export function subscribeToOpenRequests(
  callback: (requests: Request[]) => void
): () => void {
  const db = getDb();
  const q = query(
    collection(db, COLLECTIONS.REQUESTS),
    where('status', 'in', ['bot_handling', 'ready_for_agent']),
    orderBy('created_at', 'desc'),
    limit(20)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Request));
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  EXPORT
 * ═══════════════════════════════════════════════════════════════════════════ */

export const FirebaseService = {
  // Listings
  fetchListings,
  fetchListingById,
  createListing,
  updateListing,
  deleteListing,
  setListingStatus,
  // Atomic listing+owner
  createListingWithOwner,
  updateListingAndOwner,
  deleteListingAndOwner,
  // Owners (private)
  fetchOwnerByListingId,
  fetchAllOwners,
  // Requests
  fetchRequests,
  fetchRequestById,
  createRequest,
  updateRequest,
  appendChatMessage,
  escalateToAgent,
  closeRequest,
  deleteRequest,
  // Clients
  fetchClients,
  fetchClientById,
  fetchClientByPhone,
  createClient,
  updateClient,
  deleteClient,
  // Agents
  fetchAgents,
  fetchAgentById,
  createAgent,
  updateAgent,
  deactivateAgent,
  // Realtime
  subscribeToListings,
  subscribeToOpenRequests,
};

export default FirebaseService;
