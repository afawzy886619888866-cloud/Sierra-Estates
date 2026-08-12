/**
 * DataPipeline tests — collectData & processDataForApp
 * Uses manual mocks for firebase-admin and firebase-functions so no real
 * Firebase project is needed to run these tests.
 */

// --------------------------------------------------------------------------
// Shared Firestore mock state
// --------------------------------------------------------------------------
let rawScrapeData = {};
let processedDataStore = {};

const mockDocRef = (id = 'doc123') => ({
  id,
  update: jest.fn().mockResolvedValue(true),
});

const mockServerTimestamp = jest.fn(() => '__TIMESTAMP__');

const mockDb = {
  collection: jest.fn((_name) => ({
    add: jest.fn(async (data) => {
      const id = `mock-id-${Date.now()}`;
      rawScrapeData[id] = data;
      return { id };
    }),
    doc: jest.fn((docId) => ({
      set: jest.fn(async (data) => {
        processedDataStore[docId] = data;
      }),
    })),
  })),
};

// --------------------------------------------------------------------------
// Mock firebase-admin
// --------------------------------------------------------------------------
jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  firestore: jest.fn(() => mockDb),
}));
// The function sources are CommonJS modules, so these test imports must use require().
 
const admin = require('firebase-admin');
admin.firestore.FieldValue = { serverTimestamp: mockServerTimestamp };

// --------------------------------------------------------------------------
// Mock firebase-functions
// --------------------------------------------------------------------------
jest.mock('firebase-functions', () => ({
  https: {
    onRequest: jest.fn((handler) => handler),
  },
  firestore: {
    document: jest.fn(() => ({
      onCreate: jest.fn((handler) => handler),
    })),
  },
}), { virtual: true });

// --------------------------------------------------------------------------
// Import the functions under test
// --------------------------------------------------------------------------
 
const { collectData } = require('../../../functions/collectData');

const { processDataForApp } = require('../../../functions/processData');

// --------------------------------------------------------------------------
// Helper: build a minimal Express-like req/res pair
// --------------------------------------------------------------------------
function mockReqRes(method = 'POST', body = {}) {
  const res = {
    _status: 200,
    _body: null,
    status(code) { this._status = code; return this; },
    send(body) { this._body = body; return this; },
    json(body) { this._body = body; return this; },
  };
  return [{ method, body }, res];
}

// --------------------------------------------------------------------------
// collectData tests
// --------------------------------------------------------------------------
describe('collectData (HTTP function)', () => {
  beforeEach(() => {
    rawScrapeData = {};
    jest.clearAllMocks();
    admin.apps.length = 0;
  });

  test('rejects non-POST requests with 405', async () => {
    const [req, res] = mockReqRes('GET');
    await collectData(req, res);
    expect(res._status).toBe(405);
    expect(res._body).toBe('Method Not Allowed');
  });

  test('rejects null body with 400', async () => {
    const [req, res] = mockReqRes('POST', null);
    await collectData(req, res);
    expect(res._status).toBe(400);
    expect(res._body).toBe('Invalid payload');
  });

  test('rejects non-object body with 400', async () => {
    const [req, res] = mockReqRes('POST', 'string-payload');
    await collectData(req, res);
    expect(res._status).toBe(400);
  });

  test('accepts valid payload and returns 200 with doc id', async () => {
    const payload = { title: 'Villa A', price: '5000000', location: 'New Cairo' };
    const [req, res] = mockReqRes('POST', payload);
    await collectData(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({ success: true, id: expect.any(String) });
  });

  test('written document includes status: raw_unprocessed', async () => {
    const payload = { title: 'Penthouse B' };
    const [req, res] = mockReqRes('POST', payload);
    await collectData(req, res);
    const stored = Object.values(rawScrapeData)[0];
    expect(stored.status).toBe('raw_unprocessed');
    expect(stored.title).toBe('Penthouse B');
  });
});

// --------------------------------------------------------------------------
// processDataForApp tests
// --------------------------------------------------------------------------
describe('processDataForApp (Firestore trigger)', () => {
  beforeEach(() => {
    processedDataStore = {};
    jest.clearAllMocks();
  });

  function makeSnap(data, docId = 'snap-doc-1') {
    const ref = mockDocRef(docId);
    return {
      data: () => data,
      ref,
      _ref: ref,
    };
  }

  const context = { params: { docId: 'snap-doc-1' } };

  test('writes normalized document to processedData', async () => {
    const snap = makeSnap({ title: 'Apartment', price: '2500000', location: 'Mivida', source: 'Bot' });
    await processDataForApp(snap, context);

    const written = processedDataStore['snap-doc-1'];
    expect(written).toBeDefined();
    expect(written.title).toBe('Apartment');
    expect(written.price).toBe(2500000);
    expect(written.location).toBe('Mivida');
    expect(written.isAvailable).toBe(true);
  });

  test('falls back to defaults for missing fields', async () => {
    const snap = makeSnap({});
    await processDataForApp(snap, context);

    const written = processedDataStore['snap-doc-1'];
    expect(written.title).toBe('Untitled Property');
    expect(written.price).toBe(0);
    expect(written.location).toBe('Unknown');
    expect(written.source).toBe('Scraper Bot');
  });

  test('marks source document processed_success after writing', async () => {
    const snap = makeSnap({ title: 'Villa', price: '3000000' });
    await processDataForApp(snap, context);
    expect(snap.ref.update).toHaveBeenCalledWith({ status: 'processed_success' });
  });

  test('marks processed_error and does not throw when write fails', async () => {
    // Make processedData write fail
    mockDb.collection.mockImplementationOnce((name) => {
      if (name === 'processedData') {
        return { doc: jest.fn(() => ({ set: jest.fn().mockRejectedValue(new Error('Firestore write failed')) })) };
      }
      return mockDb.collection(name);
    });

    const snap = makeSnap({ title: 'Failing Unit' });
    await processDataForApp(snap, context);
    expect(snap.ref.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'processed_error', error: expect.any(String) })
    );
  });
});
