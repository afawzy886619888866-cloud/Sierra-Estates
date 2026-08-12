/**
 * Tests for the Firebase Cloud Functions backend (functions/).
 *
 * The functions/ directory has TWO implementations of the data-collection
 * pipeline:
 *
 *   1. JS implementation (collectData.js, processData.js, transform.js, index.js)
 *      — uses firebase-functions v1 API and is what's currently deployed.
 *   2. TypeScript implementation (src/index.ts) — uses firebase-functions v2 API
 *      and is the next-gen version.
 *
 * The pure transform logic is already covered by transform.test.js. This file
 * covers the HTTP / Firestore-trigger handlers themselves, which need mocked
 * firebase-admin + firebase-functions modules to be testable in isolation.
 *
 * Run with:
 *     cd functions && npx jest
 */

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A tiny in-memory Firestore substitute. We only model the calls the functions
 * actually make: collection().add(), collection().doc().set(),
 * doc().update(), and FieldValue.serverTimestamp().
 */
function createMockDb() {
  const collections = {};

  function collection(name) {
    if (!collections[name]) collections[name] = {};
    return {
      add: async (data) => {
        const id = `auto-id-${Object.keys(collections[name]).length + 1}`;
        collections[name][id] = { ...data };
        return { id };
      },
      doc: (id) => ({
        set: async (data) => {
          collections[name][id] = { ...data };
          return undefined;
        },
        get: async () => ({ exists: true, data: () => collections[name][id] || {} }),
        update: async (patch) => {
          collections[name][id] = { ...(collections[name][id] || {}), ...patch };
          return undefined;
        },
      }),
    };
  }

  return {
    collection,
    _collections: collections,
    FieldValue: {
      serverTimestamp: () => ({ _type: 'serverTimestamp' }),
    },
  };
}

/**
 * Tracks the last handler registered via onRequest / onSchedule / etc.,
 * so tests can invoke it directly.
 */
const handlerRegistry = {
  httpsOnRequest: [],
  schedule: [],
  pubsub: [],
  firestoreOnCreate: [],
};

const mockDb = createMockDb();

// Mock firebase-admin BEFORE requiring the modules under test.
jest.mock('firebase-admin', () => {
  const admin = {
    apps: [],
    initializeApp: jest.fn(() => {
      admin.apps.push({});
      return {};
    }),
    firestore: jest.fn(() => mockDb),
  };
  // Expose FieldValue as a getter so `admin.firestore.FieldValue` works.
  Object.defineProperty(admin.firestore, 'FieldValue', {
    get: () => mockDb.FieldValue,
  });
  return admin;
});

jest.mock('firebase-admin/app', () => ({
  getApps: jest.fn(() => [{}]),
  initializeApp: jest.fn(() => ({})),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => mockDb),
  FieldValue: {
    serverTimestamp: () => ({ _type: 'serverTimestamp' }),
  },
}));

// Mock firebase-functions v1 (used by collectData.js, processData.js).
jest.mock('firebase-functions', () => {
  return {
    https: {
      onRequest: (handler) => {
        handlerRegistry.httpsOnRequest.push({ name: null, handler });
        return handler;
      },
    },
    firestore: {
      document: (path) => ({
        onCreate: (handler) => {
          handlerRegistry.firestoreOnCreate.push({ path, handler });
          return handler;
        },
      }),
    },
  };
});

// Reset registry + db between tests so they don't bleed into each other.
beforeEach(() => {
  handlerRegistry.httpsOnRequest.length = 0;
  handlerRegistry.firestoreOnCreate.length = 0;
  for (const k of Object.keys(mockDb._collections)) delete mockDb._collections[k];
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: minimal mock express req/res
// ─────────────────────────────────────────────────────────────────────────────
function mockReq({ method = 'GET', body = {}, headers = {} } = {}) {
  return { method, body, headers };
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.headers['content-type'] = 'application/json';
      return this;
    },
    end() {
      return this;
    },
  };
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests for collectData.js (HTTP handler — data ingestion from scrapers)
// ─────────────────────────────────────────────────────────────────────────────
describe('collectData HTTP handler (collectData.js)', () => {
  let collectDataHandler;

  beforeAll(() => {
    // Requiring the module triggers https.onRequest() which records the handler.
    jest.resetModules();
    // Re-mock firebase-admin / firebase-functions because resetModules clears the registry.
    jest.doMock('firebase-admin', () => {
      const admin = {
        apps: [],
        initializeApp: jest.fn(() => { admin.apps.push({}); return {}; }),
        firestore: jest.fn(() => mockDb),
      };
      Object.defineProperty(admin.firestore, 'FieldValue', {
        get: () => mockDb.FieldValue,
      });
      return admin;
    });
    jest.doMock('firebase-functions', () => ({
      https: { onRequest: (h) => { handlerRegistry.httpsOnRequest.push({ handler: h }); return h; } },
      firestore: { document: () => ({ onCreate: (h) => { handlerRegistry.firestoreOnCreate.push({ handler: h }); return h; } }) },
    }));
    require('../collectData');
    collectDataHandler = handlerRegistry.httpsOnRequest.at(-1).handler;
  });

  test('rejects non-POST with 405 Method Not Allowed', async () => {
    const res = mockRes();
    await collectDataHandler(mockReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(405);
  });

  test('rejects PUT with 405', async () => {
    const res = mockRes();
    await collectDataHandler(mockReq({ method: 'PUT' }), res);
    expect(res.statusCode).toBe(405);
  });

  test('rejects empty body with 400', async () => {
    const res = mockRes();
    await collectDataHandler(mockReq({ method: 'POST', body: null }), res);
    expect(res.statusCode).toBe(400);
  });

  test('rejects non-object body (string) with 400', async () => {
    const res = mockRes();
    await collectDataHandler(mockReq({ method: 'POST', body: 'just a string' }), res);
    expect(res.statusCode).toBe(400);
  });

  // NOTE: arrays in JS satisfy `typeof === 'object'`, so the current
  // `if (!payload || typeof payload !== 'object')` guard in collectData.js
  // accepts them. This is a known limitation — arrays will be ingested as
  // raw documents. Fix would be `!payload || typeof payload !== 'object' ||
  // Array.isArray(payload)`.
  test('currently ACCEPTS arrays (typeof === "object") — known limitation', async () => {
    const res = mockRes();
    await collectDataHandler(mockReq({ method: 'POST', body: [1, 2, 3] }), res);
    expect(res.statusCode).toBe(200);
    // Array was spread into the doc, so it becomes { '0': 1, '1': 2, '2': 3 }
    const rawDocs = mockDb._collections['rawScrapeData'] || {};
    expect(Object.keys(rawDocs).length).toBe(1);
  });

  test('accepts valid payload and writes to rawScrapeData', async () => {
    const res = mockRes();
    await collectDataHandler(
      mockReq({
        method: 'POST',
        body: { title: 'Villa', price: '5,000,000', location: 'Cairo' },
      }),
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('id');
    // Verify the doc was actually written
    const rawDocs = mockDb._collections['rawScrapeData'] || {};
    expect(Object.keys(rawDocs).length).toBe(1);
    const written = Object.values(rawDocs)[0];
    expect(written.title).toBe('Villa');
    expect(written.status).toBe('raw_unprocessed');
    expect(written.collectedAt).toEqual({ _type: 'serverTimestamp' });
  });

  test('propagates downstream errors as 500', async () => {
    // Force db.collection().add() to throw
    const original = mockDb.collection;
    mockDb.collection = (name) => {
      if (name === 'rawScrapeData') {
        return { add: async () => { throw new Error('Firestore down'); } };
      }
      return original.call(mockDb, name);
    };
    const res = mockRes();
    await collectDataHandler(
      mockReq({ method: 'POST', body: { foo: 'bar' } }),
      res,
    );
    expect(res.statusCode).toBe(500);
    // Restore
    mockDb.collection = original;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests for processData.js (Firestore trigger — normalizes raw → processed)
// ─────────────────────────────────────────────────────────────────────────────
describe('processDataForApp Firestore trigger (processData.js)', () => {
  let processDataHandler;

  beforeAll(() => {
    jest.resetModules();
    jest.doMock('firebase-admin', () => {
      const admin = {
        apps: [],
        initializeApp: jest.fn(() => { admin.apps.push({}); return {}; }),
        firestore: jest.fn(() => mockDb),
      };
      Object.defineProperty(admin.firestore, 'FieldValue', {
        get: () => mockDb.FieldValue,
      });
      return admin;
    });
    jest.doMock('firebase-functions', () => ({
      https: { onRequest: (h) => { handlerRegistry.httpsOnRequest.push({ handler: h }); return h; } },
      firestore: { document: () => ({ onCreate: (h) => { handlerRegistry.firestoreOnCreate.push({ handler: h }); return h; } }) },
    }));
    require('../processData');
    processDataHandler = handlerRegistry.firestoreOnCreate.at(-1).handler;
  });

  function mockSnap(data) {
    return {
      data: () => data,
      ref: {
        update: jest.fn(async (patch) => patch),
      },
    };
  }

  test('normalizes a complete raw payload into processedData', async () => {
    const snap = mockSnap({
      title: 'Sea View Villa',
      price: '4,500,000',
      location: 'New Cairo',
      source: 'PropertyFinder',
    });
    await processDataHandler(snap, { params: { docId: 'doc-1' } });

    const processed = mockDb._collections['processedData']?.['doc-1'];
    expect(processed).toBeDefined();
    expect(processed.title).toBe('Sea View Villa');
    expect(processed.price).toBe(4500000); // string with commas parsed to number
    expect(processed.location).toBe('New Cairo');
    expect(processed.source).toBe('PropertyFinder');
    expect(processed.isAvailable).toBe(true);
    expect(processed.processedAt).toEqual({ _type: 'serverTimestamp' });

    // Raw doc should be marked as processed_success
    expect(snap.ref.update).toHaveBeenCalledWith({ status: 'processed_success' });
  });

  test('applies safe defaults for empty raw document', async () => {
    const snap = mockSnap({});
    await processDataHandler(snap, { params: { docId: 'doc-empty' } });

    const processed = mockDb._collections['processedData']?.['doc-empty'];
    expect(processed).toBeDefined();
    expect(processed.title).toBe('Untitled Property');
    expect(processed.price).toBe(0);
    expect(processed.location).toBe('Unknown');
    expect(processed.source).toBe('Scraper Bot');
    expect(processed.isAvailable).toBe(true);
  });

  test('parses formatted price strings (regression: parseFloat alone truncates at first separator)', async () => {
    const snap = mockSnap({ price: 'EGP 2,500,000' });
    await processDataHandler(snap, { params: { docId: 'price-test' } });

    const processed = mockDb._collections['processedData']?.['price-test'];
    expect(processed.price).toBe(2500000);
  });

  test('marks raw doc as processed_error when Firestore write throws', async () => {
    const snap = mockSnap({ title: 'X' });
    // Force processedData write to throw
    const original = mockDb.collection;
    mockDb.collection = (name) => {
      if (name === 'processedData') {
        return { doc: () => ({ set: async () => { throw new Error('write failed'); } }) };
      }
      return original.call(mockDb, name);
    };
    await processDataHandler(snap, { params: { docId: 'err-doc' } });
    expect(snap.ref.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'processed_error' }),
    );
    mockDb.collection = original;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests for the TS v2 implementation (src/index.ts) — compiled to lib/index.js
// ─────────────────────────────────────────────────────────────────────────────
//
// Mocks for the v2 subpaths must be set up BEFORE requiring lib/index.js, and
// `maybeDescribe` must be evaluated at module load (jest registers describe
// blocks synchronously, before beforeAll runs). So we set up the mocks at
// module scope here.
jest.doMock('firebase-functions/v2/https', () => ({
  onRequest: (handler) => {
    handlerRegistry.httpsOnRequest.push({ name: 'ts-v2', handler });
    return handler;
  },
}));
jest.doMock('firebase-functions/v2/scheduler', () => ({
  onSchedule: (_spec, handler) => {
    handlerRegistry.schedule.push({ handler });
    return handler;
  },
}));
jest.doMock('firebase-functions/v2/pubsub', () => ({
  onMessagePublished: (_topic, handler) => {
    handlerRegistry.pubsub.push({ handler });
    return handler;
  },
}));
jest.doMock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: (_doc, handler) => {
    handlerRegistry.firestoreOnCreate.push({ name: 'ts-v2', handler });
    return handler;
  },
}));

let tsHandlers = null;
try {
  // eslint-disable-next-line global-require
  require('../lib/index.js');
  const httpsV2 = handlerRegistry.httpsOnRequest.filter((h) => h.name === 'ts-v2');
  // The TS file registers `api` first (line ~14), then `collectData` later.
  // So httpsV2[0] is api, httpsV2[1] is collectData.
  tsHandlers = {
    api: httpsV2[0]?.handler,
    collectData: httpsV2[1]?.handler,
    processDataForApp: handlerRegistry.firestoreOnCreate.filter((h) => h.name === 'ts-v2').at(-1)?.handler,
  };
} catch (e) {
  // lib/index.js may not exist if TS hasn't been compiled yet.
  // eslint-disable-next-line no-console
  console.warn('TS v2 suite skipped — could not require ../lib/index.js:', e.message);
  tsHandlers = null;
}

const maybeDescribe = tsHandlers ? describe : describe.skip;

maybeDescribe('TypeScript v2 implementation (src/index.ts → lib/index.js)', () => {
  beforeEach(() => {
    // Clear any data left by previous tests
    for (const k of Object.keys(mockDb._collections)) delete mockDb._collections[k];
  });

  describe('api health-check (onRequest)', () => {
    test('returns a JSON health-check message', async () => {
      const res = mockRes();
      await tsHandlers.api(mockReq({ method: 'GET' }), res);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/Sierra Estates API/i);
    });
  });

  describe('collectData (onRequest, v2)', () => {
    test('rejects non-POST with 405', async () => {
      const res = mockRes();
      await tsHandlers.collectData(mockReq({ method: 'GET' }), res);
      expect(res.statusCode).toBe(405);
    });

    test('rejects invalid payload with 400', async () => {
      const res = mockRes();
      await tsHandlers.collectData(mockReq({ method: 'POST', body: null }), res);
      expect(res.statusCode).toBe(400);
    });

    test('accepts valid payload, returns id, writes to rawScrapeData', async () => {
      const res = mockRes();
      await tsHandlers.collectData(
        mockReq({ method: 'POST', body: { title: 'Test', price: 100 } }),
        res,
      );
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(expect.objectContaining({ success: true, id: expect.any(String) }));
      expect(mockDb._collections['rawScrapeData']).toBeDefined();
      expect(Object.keys(mockDb._collections['rawScrapeData']).length).toBeGreaterThan(0);
    });
  });

  describe('processDataForApp (onDocumentCreated, v2)', () => {
    test('normalizes raw document into processedData (numeric price)', async () => {
      const snap = {
        data: () => ({ title: 'Test', price: 1000, location: 'Cairo', source: 'Bot' }),
        ref: { update: jest.fn(async (patch) => patch) },
      };
      const event = { data: snap, params: { docId: 'ts-doc-1' } };
      await tsHandlers.processDataForApp(event);
      const processed = mockDb._collections['processedData']?.['ts-doc-1'];
      expect(processed).toBeDefined();
      expect(processed.title).toBe('Test');
      expect(processed.price).toBe(1000);
      expect(processed.isAvailable).toBe(true);
    });

    // KNOWN REGRESSION: the TS v2 index.ts uses `parseFloat(rawData['price'])`
    // directly, which truncates any formatted price string at the first
    // non-numeric character. So `'1,000'` becomes `1`, and `'EGP 2,500,000'`
    // becomes `NaN` → 0. The JS pipeline (processData.js + transform.js)
    // exists precisely to fix this — its `parsePrice` strips separators and
    // currency symbols before parsing. When the TS version is deployed, it
    // should re-use `parsePrice` from transform.js (or @/functions/transform)
    // instead of `parseFloat`.
    test('REGRESSION: bare parseFloat truncates formatted price strings', async () => {
      const snap = {
        data: () => ({ price: '1,000' }),
        ref: { update: jest.fn(async (patch) => patch) },
      };
      const event = { data: snap, params: { docId: 'ts-regression' } };
      await tsHandlers.processDataForApp(event);
      const processed = mockDb._collections['processedData']?.['ts-regression'];
      // BUG: '1,000' → 1, not 1000. This test PINS the buggy behavior so we
      // notice if it ever changes (e.g., when someone wires up parsePrice).
      expect(processed.price).toBe(1);
    });

    test('marks raw doc as processed_error on failure', async () => {
      const snap = {
        data: () => ({ title: 'Boom' }),
        ref: { update: jest.fn(async (patch) => patch) },
      };
      const event = { data: snap, params: { docId: 'ts-doc-err' } };
      // Force processedData write to throw
      const original = mockDb.collection;
      mockDb.collection = (name) => {
        if (name === 'processedData') {
          return { doc: () => ({ set: async () => { throw new Error('nope'); } }) };
        }
        return original.call(mockDb, name);
      };
      await tsHandlers.processDataForApp(event);
      expect(snap.ref.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'processed_error' }),
      );
      mockDb.collection = original;
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests for the legacy JS index.js barrel (functions/index.js)
// ─────────────────────────────────────────────────────────────────────────────
describe('legacy JS barrel (index.js)', () => {
  test('re-exports collectData and processDataForApp', () => {
    jest.resetModules();
    jest.doMock('firebase-admin', () => {
      const admin = {
        apps: [],
        initializeApp: jest.fn(() => { admin.apps.push({}); return {}; }),
        firestore: jest.fn(() => mockDb),
      };
      Object.defineProperty(admin.firestore, 'FieldValue', {
        get: () => mockDb.FieldValue,
      });
      return admin;
    });
    jest.doMock('firebase-functions', () => ({
      https: { onRequest: (h) => h },
      firestore: { document: () => ({ onCreate: (h) => h }) },
    }));
    // eslint-disable-next-line global-require
    const mod = require('../index.js');
    expect(mod.collectData).toBeDefined();
    expect(mod.processDataForApp).toBeDefined();
    expect(typeof mod.collectData).toBe('function');
    expect(typeof mod.processDataForApp).toBe('function');
  });
});
