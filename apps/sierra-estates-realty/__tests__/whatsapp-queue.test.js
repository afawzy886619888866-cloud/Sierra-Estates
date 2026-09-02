 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Tests for the WhatsApp outreach queue: per-number load balancing
 * (claimEligibleNumber) and the 12pm-8pm operating-hours gate.
 */

jest.mock('firebase-admin/firestore', () => ({
  Timestamp: {
    now: jest.fn(() => ({ toMillis: () => Date.now() })),
    fromMillis: jest.fn((ms) => ({ toMillis: () => ms })),
  },
  FieldValue: {
    arrayUnion: jest.fn((entry) => ({ __arrayUnion: entry })),
  },
}));

/** Minimal in-memory fake Firestore covering exactly what whatsapp-queue.ts calls. */
function makeFakeAdminDb(initial) {
  const store = { ...initial };

  const docRef = (id) => ({ id });

  const queryApi = {
    where: jest.fn(() => queryApi),
    orderBy: jest.fn(() => queryApi),
    limit: jest.fn(() => queryApi),
    get: jest.fn(async () => ({
      empty: Object.keys(store).length === 0,
      docs: Object.entries(store).map(([id, data]) => ({ id, data: () => data })),
    })),
  };

  const collectionApi = {
    ...queryApi,
    doc: jest.fn((id) => docRef(id)),
    add: jest.fn(async (data) => {
      const id = `gen-${Object.keys(store).length}`;
      store[id] = data;
      return { id };
    }),
  };

  const adminDb = {
    collection: jest.fn(() => collectionApi),
    runTransaction: jest.fn(async (cb) => {
      const tx = {
        get: async (ref) => {
          const data = store[ref.id];
          return { exists: data !== undefined, data: () => data };
        },
        update: (ref, patch) => {
          store[ref.id] = { ...store[ref.id], ...patch };
        },
      };
      return cb(tx);
    }),
  };

  return { adminDb, store };
}

describe('claimEligibleNumber load balancing', () => {
  const config = {
    operatingHourStart: 12,
    operatingHourEnd: 20,
    timezone: 'Africa/Cairo',
    batchSizePerNumber: 30,
    windowMinutes: 120,
    dailyCapPerNumber: 120,
    dailyCapTotal: 480,
  };

  function setup(numbers) {
    const { adminDb, store } = makeFakeAdminDb(numbers);
    jest.doMock('@/lib/server/firebase-admin', () => ({ adminDb }));
    let mod;
    jest.isolateModules(() => {
      mod = require('@/lib/server/whatsapp-queue');
    });
    return { claimEligibleNumber: mod.claimEligibleNumber, store };
  }

  const future = Date.now() + 60 * 60 * 1000; // 1hr from now — window/day not elapsed

  test('prefers the least-loaded number, not document order', async () => {
    const { claimEligibleNumber } = setup({
      numA: { e164Phone: '+201032206443', status: 'active', windowSentCount: 10, dailySentCount: 50, windowResetAt: { toMillis: () => future }, dailyResetAt: { toMillis: () => future } },
      numB: { e164Phone: '+201092048333', status: 'active', windowSentCount: 5, dailySentCount: 20, windowResetAt: { toMillis: () => future }, dailyResetAt: { toMillis: () => future } },
      numC: { e164Phone: '+201061399688', status: 'active', windowSentCount: 29, dailySentCount: 100, windowResetAt: { toMillis: () => future }, dailyResetAt: { toMillis: () => future } },
      numD: { e164Phone: '+201031622700', status: 'active', windowSentCount: 0, dailySentCount: 0, windowResetAt: { toMillis: () => future }, dailyResetAt: { toMillis: () => future } },
    });

    const claimed = await claimEligibleNumber(config );
    expect(_optionalChain([claimed, 'optionalAccess', _ => _.e164Phone])).toBe('+201031622700'); // numD: lowest windowSentCount
  });

  test('distributes successive claims round-robin-style across all 4 senders', async () => {
    const { claimEligibleNumber, store } = setup({
      numA: { e164Phone: '+1A', status: 'active', windowSentCount: 0, dailySentCount: 0, windowResetAt: { toMillis: () => future }, dailyResetAt: { toMillis: () => future } },
      numB: { e164Phone: '+1B', status: 'active', windowSentCount: 0, dailySentCount: 0, windowResetAt: { toMillis: () => future }, dailyResetAt: { toMillis: () => future } },
      numC: { e164Phone: '+1C', status: 'active', windowSentCount: 0, dailySentCount: 0, windowResetAt: { toMillis: () => future }, dailyResetAt: { toMillis: () => future } },
      numD: { e164Phone: '+1D', status: 'active', windowSentCount: 0, dailySentCount: 0, windowResetAt: { toMillis: () => future }, dailyResetAt: { toMillis: () => future } },
    });

    const claimedPhones = new Set();
    for (let i = 0; i < 4; i++) {
      const claimed = await claimEligibleNumber(config );
      expect(claimed).not.toBeNull();
      claimedPhones.add(claimed.e164Phone);
    }
    // All 4 distinct senders got used exactly once each — even distribution.
    expect(claimedPhones.size).toBe(4);
    expect(Object.values(store).map((d) => d.windowSentCount)).toEqual([1, 1, 1, 1]);
  });

  test('skips a number that hit its daily cap even if its window count looks lowest', async () => {
    const { claimEligibleNumber } = setup({
      numA: { e164Phone: '+1A-daily-capped', status: 'active', windowSentCount: 0, dailySentCount: 120, windowResetAt: { toMillis: () => future }, dailyResetAt: { toMillis: () => future } },
      numB: { e164Phone: '+1B-eligible', status: 'active', windowSentCount: 5, dailySentCount: 10, windowResetAt: { toMillis: () => future }, dailyResetAt: { toMillis: () => future } },
    });

    const claimed = await claimEligibleNumber(config );
    expect(_optionalChain([claimed, 'optionalAccess', _2 => _2.e164Phone])).toBe('+1B-eligible');
  });

  test('resets an elapsed window before checking eligibility', async () => {
    const past = Date.now() - 1000; // window already expired
    const { claimEligibleNumber } = setup({
      numA: { e164Phone: '+1A-stale-window', status: 'active', windowSentCount: 30, dailySentCount: 30, windowResetAt: { toMillis: () => past }, dailyResetAt: { toMillis: () => future } },
    });

    const claimed = await claimEligibleNumber(config );
    expect(_optionalChain([claimed, 'optionalAccess', _3 => _3.e164Phone])).toBe('+1A-stale-window');
  });

  test('returns null when every number is exhausted', async () => {
    const { claimEligibleNumber } = setup({
      numA: { e164Phone: '+1A', status: 'active', windowSentCount: 30, dailySentCount: 120, windowResetAt: { toMillis: () => future }, dailyResetAt: { toMillis: () => future } },
    });

    const claimed = await claimEligibleNumber(config );
    expect(claimed).toBeNull();
  });
});

describe('isWithinOperatingHours (12pm-8pm Africa/Cairo)', () => {
  let isWithinOperatingHours;

  beforeAll(() => {
    jest.doMock('@/lib/server/firebase-admin', () => ({ adminDb: {} }));
    jest.isolateModules(() => {
      isWithinOperatingHours = require('@/lib/server/whatsapp-queue').isWithinOperatingHours;
    });
  });

  const config = {
    operatingHourStart: 12,
    operatingHourEnd: 20,
    timezone: 'Africa/Cairo',
    batchSizePerNumber: 30,
    windowMinutes: 120,
    dailyCapPerNumber: 120,
    dailyCapTotal: 480,
  };

  // January — outside Egypt's Apr-Oct DST window, so Cairo is a stable UTC+2.
  test('just before noon Cairo (11:59) is outside operating hours', () => {
    expect(isWithinOperatingHours(config , new Date('2026-01-15T09:59:00Z'))).toBe(false);
  });

  test('exactly noon Cairo (12:00) is within operating hours', () => {
    expect(isWithinOperatingHours(config , new Date('2026-01-15T10:00:00Z'))).toBe(true);
  });

  test('just before 8pm Cairo (19:59) is within operating hours', () => {
    expect(isWithinOperatingHours(config , new Date('2026-01-15T17:59:00Z'))).toBe(true);
  });

  test('exactly 8pm Cairo (20:00) is outside operating hours (end exclusive)', () => {
    expect(isWithinOperatingHours(config , new Date('2026-01-15T18:00:00Z'))).toBe(false);
  });
});
