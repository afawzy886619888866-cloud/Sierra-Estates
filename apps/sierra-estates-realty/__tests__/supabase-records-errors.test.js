/**
 * The record layer must throw on a supabase-js error.
 *
 * supabase-js resolves with `{ data: null, error }` rather than rejecting.
 * Every route being migrated was written against Firestore, which throws into
 * an existing try/catch — so if this layer ignored `error`, a failed insert
 * would return 200 with a null body and the caller would believe it saved.
 */
const state = {
  error: null,
  data: { id: 'row-1', visitor_name: 'Test' },
};

/** Minimal stand-in for the supabase-js query builder: every method chains. */
function makeQuery() {
  const q = {};
  const chain = () => q;
  for (const method of ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'in', 'order', 'range']) {
    q[method] = chain;
  }
  q.maybeSingle = () => Promise.resolve({ data: state.data, error: state.error });
  q.single = () => Promise.resolve({ data: state.data, error: state.error });
  q.then = (resolve) =>
    Promise.resolve({ data: state.data, error: state.error }).then(resolve);
  return q;
}

// Mock the driver rather than the package: records.ts imports the client from
// its own module, so stubbing the package index would not intercept it.
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: () => makeQuery() }),
}));

// The admin client refuses to build without a service-role key, by design.
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

import {
  listRecords,
  getRecord,
  insertRecord,
  updateRecord,
  deleteRecord,
} from '@sierra-estates/db';

describe('record layer error handling', () => {
  beforeEach(() => {
    state.error = null;
    state.data = { id: 'row-1', visitor_name: 'Test' };
  });

  it('throws when a read fails instead of returning an empty list', async () => {
    state.error = { message: 'permission denied for table leads' };
    await expect(listRecords('leads')).rejects.toThrow(/permission denied/);
  });

  it('throws when a write fails instead of resolving', async () => {
    state.error = { message: 'null value violates not-null constraint' };
    await expect(insertRecord('leads', { fullName: 'X' })).rejects.toThrow(/not-null/);
  });

  it('names the table and operation in the error', async () => {
    state.error = { message: 'boom' };
    await expect(updateRecord('followups', 'id-1', { status: 'done' })).rejects.toThrow(
      /supabase:update followups/
    );
  });

  it('throws on a failed delete', async () => {
    state.error = { message: 'row not found' };
    await expect(deleteRecord('followups', 'id-1')).rejects.toThrow(/supabase:delete followups/);
  });

  it('returns null rather than throwing when a row is simply absent', async () => {
    state.data = null;
    await expect(getRecord('leads', 'missing')).resolves.toBeNull();
  });

  it('camelCases a successful read', async () => {
    await expect(getRecord('viewing_requests', 'row-1')).resolves.toEqual({
      id: 'row-1',
      visitorName: 'Test',
    });
  });
});
