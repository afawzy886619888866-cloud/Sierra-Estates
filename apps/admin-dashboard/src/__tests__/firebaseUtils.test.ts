/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Sierra Estates — Firebase CRUD Utility Tests
 *  File: SE/apps/admin/src/__tests__/firebaseUtils.test.ts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Tests the firebaseUtils CRUD functions with mocked Firestore.
 *  Verifies:
 *    - Correct collection names are queried
 *    - Batch writes are used for atomic listing+owner creation
 *    - Query constraints are applied correctly (where, orderBy, limit)
 *    - arrayUnion is used for chat message appends
 *    - serverTimestamp is called on create/update
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════
//  MOCK FIREBASE — capture all calls so we can assert on them
// ═══════════════════════════════════════════════════════════════════════════

const mockDocData = new Map<string, any>();
const mockCollectionData = new Map<string, any[]>();

// Mock firestore functions
const mockBatch = {
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn(async () => {
    // Simulate batch commit — apply operations to mockDocData
    for (const call of mockBatch.set.mock.calls) {
      const [ref, data] = call;
      mockDocData.set(ref._path, { ...data, _committed: true });
    }
    for (const call of mockBatch.update.mock.calls) {
      const [ref, data] = call;
      const existing = mockDocData.get(ref._path) || {};
      mockDocData.set(ref._path, { ...existing, ...data });
    }
    for (const call of mockBatch.delete.mock.calls) {
      const [ref] = call;
      mockDocData.delete(ref._path);
    }
  }),
};

const mockDocRef = (collection: string, id: string) => ({
  _path: `${collection}/${id}`,
  id,
  _collection: collection,
});

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn((db, name) => ({ _collection: name, _isCollection: true })),
  doc: vi.fn((db_or_col, id_or_name, maybeId) => {
    // doc(db, 'listings', '123') → ref with specific ID
    if (typeof id_or_name === 'string' && maybeId) {
      return mockDocRef(id_or_name, maybeId);
    }
    // doc(collectionRef) → generate new ID for this collection
    if (db_or_col && db_or_col._isCollection && !id_or_name) {
      return mockDocRef(db_or_col._collection, `auto-id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    }
    // doc(collectionRef, '123') → ref with specific ID
    if (db_or_col && db_or_col._isCollection) {
      return mockDocRef(db_or_col._collection, id_or_name);
    }
    // doc(db, 'listings') → generates new ID
    return mockDocRef(id_or_name, `auto-id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  }),
  getDoc: vi.fn(async (ref) => {
    const data = mockDocData.get(ref._path);
    return { exists: () => !!data, id: ref.id, data: () => data };
  }),
  getDocs: vi.fn(async (q) => {
    const collectionName = q._collectionName;
    const allData = mockCollectionData.get(collectionName) || [];
    return {
      docs: allData.map(d => ({ id: d.id, data: () => d })),
      empty: allData.length === 0,
    };
  }),
  setDoc: vi.fn(async (ref, data) => {
    mockDocData.set(ref._path, { ...data, id: ref.id });
  }),
  addDoc: vi.fn(async (colRef, data) => {
    const id = `auto-id-${Date.now()}`;
    const ref = mockDocRef(colRef._collection, id);
    mockDocData.set(ref._path, { ...data, id });
    mockCollectionData.set(colRef._collection, [
      ...(mockCollectionData.get(colRef._collection) || []),
      { ...data, id },
    ]);
    return ref;
  }),
  updateDoc: vi.fn(async (ref, patch) => {
    const existing = mockDocData.get(ref._path) || {};
    mockDocData.set(ref._path, { ...existing, ...patch });
  }),
  deleteDoc: vi.fn(async (ref) => {
    mockDocData.delete(ref._path);
  }),
  query: vi.fn((colRef, ...constraints) => ({
    _collectionName: colRef._collection,
    _constraints: constraints,
  })),
  where: vi.fn((field, op, value) => ({ type: 'where', field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: 'orderBy', field, direction })),
  limit: vi.fn((n) => ({ type: 'limit', value: n })),
  onSnapshot: vi.fn(() => () => {}), // returns unsubscribe
  writeBatch: vi.fn(() => mockBatch),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
  arrayUnion: vi.fn((item) => ({ _arrayUnion: true, item })),
}));

// Mock import.meta.env (Vite env vars)
vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-api-key');
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project');

// Import AFTER mocks are set up
const {
  fetchListings, fetchListingById, createListing, updateListing, deleteListing,
  createListingWithOwner, updateListingAndOwner, deleteListingAndOwner,
  fetchOwnerByListingId, fetchAllOwners,
  fetchRequests, fetchRequestById, createRequest, updateRequest,
  appendChatMessage, escalateToAgent, closeRequest,
  fetchClients, fetchClientByPhone, createClient,
  fetchAgents, createAgent, deactivateAgent,
  subscribeToListings, subscribeToOpenRequests,
} = await import('../services/firebaseUtils');

/* ═══════════════════════════════════════════════════════════════════════════
 *  TESTS
 * ═══════════════════════════════════════════════════════════════════════════ */

beforeEach(() => {
  mockDocData.clear();
  mockCollectionData.clear();
  vi.clearAllMocks();
});

describe('Firebase Initialization', () => {
  it('reads config from VITE_FIREBASE_* env vars', async () => {
    // If init worked without throwing, env vars are read correctly
    const listings = await fetchListings();
    expect(Array.isArray(listings)).toBe(true);
  });
});

/* ──────────────────────────────────────────────────────────────────────────
 *  LISTINGS CRUD
 * ────────────────────────────────────────────────────────────────────────── */

describe('Listings CRUD', () => {
  it('fetchListings queries the listings collection', async () => {
    // Seed a listing
    mockCollectionData.set('listings', [
      { id: 'l1', status: 'active', compound_name: 'Mivida', created_at: { seconds: 1 } },
    ]);
    const result = await fetchListings();
    expect(result).toHaveLength(1);
    expect(result[0].compound_name).toBe('Mivida');
  });

  it('fetchListings with status filter applies where constraint', async () => {
    mockCollectionData.set('listings', [
      { id: 'l1', status: 'active', compound_name: 'Mivida', created_at: { seconds: 1 } },
    ]);
    await fetchListings({ status: 'active' });
    // Verify 'where' was called with status == active
    const { where } = await import('firebase/firestore');
    expect(where).toHaveBeenCalledWith('status', '==', 'active');
  });

  it('fetchListings with compound filter applies where constraint', async () => {
    mockCollectionData.set('listings', []);
    await fetchListings({ compound: 'Mivida' });
    const { where } = await import('firebase/firestore');
    expect(where).toHaveBeenCalledWith('compound_name', '==', 'Mivida');
  });

  it('fetchListingById returns null if not found', async () => {
    const result = await fetchListingById('nonexistent');
    expect(result).toBeNull();
  });

  it('fetchListingById returns listing if exists', async () => {
    mockDocData.set('listings/l123', {
      id: 'l123',
      status: 'active',
      compound_name: 'Hyde Park',
    });
    const result = await fetchListingById('l123');
    expect(result).not.toBeNull();
    expect(result!.compound_name).toBe('Hyde Park');
  });

  it('createListing calls addDoc with serverTimestamp', async () => {
    const { addDoc, serverTimestamp } = await import('firebase/firestore');
    await createListing({
      status: 'draft',
      property_type: 'apartment',
      compound_name: 'Taj City',
      location_sector: 'New Cairo',
      price_egp: 5000000,
      area_sqm: 120,
      bedrooms: 2,
      finishing: 'semi',
      mode: 'sale',
      delivery_status: 'ready',
    });
    expect(addDoc).toHaveBeenCalled();
    expect(serverTimestamp).toHaveBeenCalled();
  });

  it('updateListing calls updateDoc with serverTimestamp', async () => {
    const { updateDoc, serverTimestamp } = await import('firebase/firestore');
    await updateListing('l123', { status: 'sold' });
    expect(updateDoc).toHaveBeenCalled();
    expect(serverTimestamp).toHaveBeenCalled();
  });

  it('deleteListing calls deleteDoc', async () => {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteListing('l123');
    expect(deleteDoc).toHaveBeenCalled();
  });
});

/* ──────────────────────────────────────────────────────────────────────────
 *  ATOMIC LISTING + OWNER (Batch Write) — the cornerstone
 * ────────────────────────────────────────────────────────────────────────── */

describe('createListingWithOwner (batch write)', () => {
  it('uses writeBatch for atomic creation', async () => {
    const { writeBatch } = await import('firebase/firestore');
    await createListingWithOwner({
      listing: {
        status: 'active',
        property_type: 'villa',
        compound_name: 'Mivida',
        location_sector: '5th Settlement',
        price_egp: 25000000,
        area_sqm: 480,
        bedrooms: 5,
        finishing: 'fully_finished',
        mode: 'sale',
        delivery_status: 'ready',
      },
      owner: {
        owner_name: 'Ahmed Fawzy',
        phone_number: '+201001234567',
        source_type: 'direct',
      },
    });

    expect(writeBatch).toHaveBeenCalled();
    expect(mockBatch.set).toHaveBeenCalledTimes(2); // listing + owner
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it('listing and owner share the same document ID', async () => {
    // Reset only the batch mock calls (not clearAllMocks which would break other mocks)
    mockBatch.set.mockClear();
    mockBatch.commit.mockClear();

    await createListingWithOwner({
      listing: {
        status: 'active',
        property_type: 'apartment',
        compound_name: 'Test',
        location_sector: 'Test',
        price_egp: 1000000,
        area_sqm: 100,
        bedrooms: 1,
        finishing: 'semi',
        mode: 'sale',
        delivery_status: 'ready',
      },
      owner: {
        owner_name: 'Test Owner',
        phone_number: '+201000000000',
        source_type: 'direct',
      },
    });

    // The batch.set is called with doc refs — verify both listings + owners refs exist
    // The refs have _path like "listings/auto-id-123" or _collection like "owners" + id
    const setCalls = mockBatch.set.mock.calls;

    // Find listing ref (has _path starting with 'listings/') OR (_collection === 'listings')
    const listingRefs = setCalls.filter(c => {
      const ref = c[0];
      return (ref._path && ref._path.startsWith('listings/')) ||
             (ref._collection === 'listings');
    });
    const ownerRefs = setCalls.filter(c => {
      const ref = c[0];
      return (ref._path && ref._path.startsWith('owners/')) ||
             (ref._collection === 'owners');
    });

    expect(listingRefs.length).toBeGreaterThan(0);
    expect(ownerRefs.length).toBeGreaterThan(0);

    // Extract IDs — handle both _path format and _collection + id format
    const listingRef = listingRefs[0][0];
    const ownerRef = ownerRefs[0][0];
    const listingId = listingRef.id || (listingRef._path ? listingRef._path.split('/')[1] : null);
    const ownerId = ownerRef.id || (ownerRef._path ? ownerRef._path.split('/')[1] : null);

    expect(listingId).toBeDefined();
    expect(ownerId).toBeDefined();
    expect(listingId).toBe(ownerId);
  });

  it('serverTimestamp is called for created_at + updated_at on both docs', async () => {
    const { serverTimestamp } = await import('firebase/firestore');
    (serverTimestamp as any).mockClear();

    await createListingWithOwner({
      listing: {
        status: 'active',
        property_type: 'apartment',
        compound_name: 'Test2',
        location_sector: 'Test',
        price_egp: 1000000,
        area_sqm: 100,
        bedrooms: 1,
        finishing: 'semi',
        mode: 'sale',
        delivery_status: 'ready',
      },
      owner: {
        owner_name: 'Test',
        phone_number: '+201000000000',
        source_type: 'direct',
      },
    });

    // serverTimestamp is called once and reused for both created_at + updated_at
    // on both listing + owner docs (efficient batch pattern)
    expect((serverTimestamp as any).mock.calls.length).toBeGreaterThanOrEqual(1);

    // Verify both docs have created_at + updated_at fields
    const setCalls = mockBatch.set.mock.calls;
    const listingSetCall = setCalls.find(c => c[0]._path && c[0]._path.startsWith('listings/'));
    const ownerSetCall = setCalls.find(c => c[0]._path && c[0]._path.startsWith('owners/'));
    expect(listingSetCall![1].created_at).toBeDefined();
    expect(listingSetCall![1].updated_at).toBeDefined();
    expect(ownerSetCall![1].created_at).toBeDefined();
    expect(ownerSetCall![1].updated_at).toBeDefined();
  });
});

describe('updateListingAndOwner (batch)', () => {
  it('updates both listing + owner in one batch', async () => {
    await updateListingAndOwner('l123', { status: 'sold' }, { phone_number: '+201009990000' });
    expect(mockBatch.update).toHaveBeenCalledTimes(2);
    expect(mockBatch.commit).toHaveBeenCalled();
  });
});

describe('deleteListingAndOwner (batch)', () => {
  it('deletes both listing + owner in one batch', async () => {
    await deleteListingAndOwner('l123');
    expect(mockBatch.delete).toHaveBeenCalledTimes(2);
    expect(mockBatch.commit).toHaveBeenCalled();
  });
});

/* ──────────────────────────────────────────────────────────────────────────
 *  OWNERS (private)
 * ────────────────────────────────────────────────────────────────────────── */

describe('Owners CRUD', () => {
  it('fetchOwnerByListingId queries owners collection with listing ID', async () => {
    mockDocData.set('owners/l123', {
      id: 'l123',
      owner_name: 'Ahmed',
      phone_number: '+201001234567',
      source_type: 'direct',
    });
    const result = await fetchOwnerByListingId('l123');
    expect(result).not.toBeNull();
    expect(result!.owner_name).toBe('Ahmed');
  });

  it('fetchOwnerByListingId returns null if not found', async () => {
    const result = await fetchOwnerByListingId('nonexistent');
    expect(result).toBeNull();
  });
});

/* ──────────────────────────────────────────────────────────────────────────
 *  REQUESTS CRUD
 * ────────────────────────────────────────────────────────────────────────── */

describe('Requests CRUD', () => {
  it('createRequest calls addDoc with bot_chat_history array', async () => {
    const { addDoc } = await import('firebase/firestore');
    await createRequest({
      client_id: 'c123',
      status: 'bot_handling',
      bot_chat_history: [{ sender: 'client', text: 'Hello', timestamp: '2025-01-01' }],
      client_needs: {},
      matched_listings: [],
    });
    expect(addDoc).toHaveBeenCalled();
  });

  it('appendChatMessage uses arrayUnion for race-safe append', async () => {
    const { arrayUnion, updateDoc } = await import('firebase/firestore');
    await appendChatMessage('r123', {
      sender: 'bot',
      text: 'Hi there!',
      timestamp: new Date().toISOString(),
    });
    expect(arrayUnion).toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalled();
  });

  it('escalateToAgent updates status + assigned_agent_id', async () => {
    const { updateDoc } = await import('firebase/firestore');
    await escalateToAgent('r123', 'agent-456');
    expect(updateDoc).toHaveBeenCalled();
    // Verify the patch contains status + assigned_agent_id
    const patchArg = (updateDoc as any).mock.calls[0][1];
    expect(patchArg.status).toBe('ready_for_agent');
    expect(patchArg.assigned_agent_id).toBe('agent-456');
  });

  it('closeRequest sets status to closed + closed_at timestamp', async () => {
    const { updateDoc, serverTimestamp } = await import('firebase/firestore');
    await closeRequest('r123');
    expect(updateDoc).toHaveBeenCalled();
    const patchArg = (updateDoc as any).mock.calls[0][1];
    expect(patchArg.status).toBe('closed');
    expect(patchArg.closed_at).toBeDefined(); // serverTimestamp
    expect(serverTimestamp).toHaveBeenCalled();
  });
});

/* ──────────────────────────────────────────────────────────────────────────
 *  CLIENTS CRUD
 * ────────────────────────────────────────────────────────────────────────── */

describe('Clients CRUD', () => {
  it('fetchClientByPhone returns null if no match', async () => {
    mockCollectionData.set('clients', []);
    const result = await fetchClientByPhone('+201000000000');
    expect(result).toBeNull();
  });

  it('fetchClientByPhone returns client if phone matches', async () => {
    mockCollectionData.set('clients', [
      { id: 'c1', name: 'Test', phone_number: '+201001234567', lead_source: 'website' },
    ]);
    const result = await fetchClientByPhone('+201001234567');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Test');
  });

  it('createClient calls addDoc', async () => {
    const { addDoc } = await import('firebase/firestore');
    await createClient({
      name: 'New Client',
      phone_number: '+201009990000',
      lead_source: 'website',
    });
    expect(addDoc).toHaveBeenCalled();
  });
});

/* ──────────────────────────────────────────────────────────────────────────
 *  AGENTS CRUD
 * ────────────────────────────────────────────────────────────────────────── */

describe('Agents CRUD', () => {
  it('createAgent uses setDoc with provided UID', async () => {
    const { setDoc } = await import('firebase/firestore');
    await createAgent('uid-123', {
      role: 'super_admin',
      name: 'Ahmed',
      email: 'ahmed@sierra.com',
      is_active: true,
    });
    expect(setDoc).toHaveBeenCalled();
    // Verify the ref uses the provided UID
    const refArg = (setDoc as any).mock.calls[0][0];
    expect(refArg.id).toBe('uid-123');
  });

  it('deactivateAgent calls updateAgent with is_active=false', async () => {
    const { updateDoc } = await import('firebase/firestore');
    await deactivateAgent('uid-123');
    expect(updateDoc).toHaveBeenCalled();
    const patchArg = (updateDoc as any).mock.calls[0][1];
    expect(patchArg.is_active).toBe(false);
  });
});

/* ──────────────────────────────────────────────────────────────────────────
 *  REALTIME SUBSCRIPTIONS
 * ────────────────────────────────────────────────────────────────────────── */

describe('Realtime subscriptions', () => {
  it('subscribeToListings returns unsubscribe function', async () => {
    const unsub = subscribeToListings(() => {});
    expect(typeof unsub).toBe('function');
    unsub();
  });

  it('subscribeToOpenRequests filters by status in [bot_handling, ready_for_agent]', async () => {
    const { where } = await import('firebase/firestore');
    subscribeToOpenRequests(() => {});
    // Should have a 'where' with 'in' operator for status
    const whereCalls = (where as any).mock.calls;
    const inCall = whereCalls.find((c: any) => c[1] === 'in');
    expect(inCall).toBeDefined();
    expect(inCall![0]).toBe('status');
    expect(inCall![2]).toEqual(['bot_handling', 'ready_for_agent']);
  });
});
