/**
 * Partner scope — server-side scoping model (lib/server/partner-scope.ts).
 * Each partner (merged-in property account) sees only their own portfolio:
 * listings by developer/compound, leads by target compound. An empty scope is
 * valid and means the partner sees NOTHING (fail closed on data).
 */
import {
  normalizeScope,
  isEmptyScope,
  listingInScope,
  leadInScope,
  parsePartnerAccounts,
  findPartnerAccount,
  scopeFromProfile,
} from '../lib/server/partner-scope';

describe('lib/server/partner-scope', () => {
  describe('normalizeScope', () => {
    it('normalizes, trims, lowercases and dedupes name lists', () => {
      const scope = normalizeScope({
        developers: [' Mountain View ', 'mountain view', 'Emaar'],
        compounds: ['iCity', null, 42, ''],
      });
      expect(scope).toEqual({ developers: ['mountain view', 'emaar'], compounds: ['icity'] });
    });

    it('fail-closes unknown shapes to the empty scope', () => {
      expect(normalizeScope(null)).toEqual({ developers: [], compounds: [] });
      expect(normalizeScope(undefined)).toEqual({ developers: [], compounds: [] });
      expect(normalizeScope('mountain view')).toEqual({ developers: [], compounds: [] });
      expect(normalizeScope({ partners: ['X'] })).toEqual({ developers: [], compounds: [] });
    });
  });

  describe('isEmptyScope', () => {
    it('treats null, empty and missing lists as empty', () => {
      expect(isEmptyScope(null)).toBe(true);
      expect(isEmptyScope({ developers: [], compounds: [] })).toBe(true);
      expect(isEmptyScope({ developers: ['emaar'], compounds: [] })).toBe(false);
    });
  });

  describe('listingInScope', () => {
    const scope = { developers: ['mountain view'], compounds: ['icity', 'al rehab'] };

    it('matches by developer (raw table row)', () => {
      expect(listingInScope({ developer: 'Mountain View', compound: 'Elsewhere' }, scope)).toBe(true);
      expect(listingInScope({ developer: 'Emaar', compound: 'Elsewhere' }, scope)).toBe(false);
    });

    it('matches by developer name (v_inventory_os row)', () => {
      expect(listingInScope({ developerName: 'Mountain View Developments', compound: 'X' }, scope)).toBe(true);
    });

    it('matches by compound (raw table row)', () => {
      expect(listingInScope({ compound: 'Al Rehab' }, scope)).toBe(true);
      expect(listingInScope({ compound: 'Rehab' }, scope)).toBe(true); // variant direction
      expect(listingInScope({ compound: 'Mivida' }, scope)).toBe(false);
    });

    it('matches by project name (view row)', () => {
      expect(listingInScope({ projectName: 'iCity New Cairo' }, scope)).toBe(true);
    });

    it('never matches with an empty scope — fail closed on data', () => {
      expect(listingInScope({ developer: 'Mountain View', compound: 'iCity' }, { developers: [], compounds: [] })).toBe(false);
      expect(listingInScope({ developer: 'Mountain View' }, null)).toBe(false);
      expect(listingInScope(null, scope)).toBe(false);
    });
  });

  describe('leadInScope', () => {
    const scope = { developers: ['mountain view'], compounds: ['icity'] };

    it('matches by target compound (camelCase row from toRecord)', () => {
      expect(leadInScope({ targetCompound: 'iCity' }, scope)).toBe(true);
      expect(leadInScope({ targetCompound: 'Mivida' }, scope)).toBe(false);
    });

    it('matches by target_compound (raw row shape)', () => {
      expect(leadInScope({ target_compound: 'icity' }, scope)).toBe(true);
    });

    it('does not match by developer — leads have no developer dimension', () => {
      expect(leadInScope({ targetCompound: 'Anything', developer: 'Mountain View' }, scope)).toBe(false);
    });

    it('fail-closes on empty scope', () => {
      expect(leadInScope({ targetCompound: 'iCity' }, { developers: [], compounds: [] })).toBe(false);
    });
  });

  describe('parsePartnerAccounts (PARTNER_ACCOUNTS env)', () => {
    afterEach(() => {
      delete process.env.PARTNER_ACCOUNTS;
    });

    it('parses a JSON array with scopes', () => {
      process.env.PARTNER_ACCOUNTS = JSON.stringify([
        { email: 'Partner1@Example.com', password: 'pw1', name: 'Partner One', developers: ['Mountain View'], compounds: ['iCity'] },
        { email: 'p2@example.com', password: 'pw2' }, // no scope → empty (sees nothing)
      ]);
      const accounts = parsePartnerAccounts(process.env.PARTNER_ACCOUNTS);
      expect(accounts).toHaveLength(2);
      expect(accounts[0].email).toBe('partner1@example.com'); // lowercased
      expect(accounts[0].scope).toEqual({ developers: ['mountain view'], compounds: ['icity'] });
      expect(accounts[1].name).toBe('p2'); // email prefix fallback
      expect(isEmptyScope(accounts[1].scope)).toBe(true);
    });

    it('accepts a single JSON object', () => {
      process.env.PARTNER_ACCOUNTS = JSON.stringify({ email: 'p@example.com', password: 'pw', scope: { compounds: ['Mivida'] } });
      expect(parsePartnerAccounts(process.env.PARTNER_ACCOUNTS)).toHaveLength(1);
    });

    it('returns [] for unset, empty, malformed JSON, and entries missing credentials', () => {
      expect(parsePartnerAccounts(undefined)).toEqual([]);
      expect(parsePartnerAccounts('')).toEqual([]);
      expect(parsePartnerAccounts('not json at all')).toEqual([]);
      expect(parsePartnerAccounts(JSON.stringify([{ email: 'no-password@example.com' }]))).toEqual([]);
      expect(parsePartnerAccounts(JSON.stringify([{ password: 'no-email' }]))).toEqual([]);
    });
  });

  describe('findPartnerAccount', () => {
    afterEach(() => {
      delete process.env.PARTNER_ACCOUNTS;
    });

    it('authenticates a provisioned account with the exact password', () => {
      process.env.PARTNER_ACCOUNTS = JSON.stringify([
        { email: 'partner1@example.com', password: 's3cret-pw', name: 'Partner One', developers: ['Mountain View'] },
      ]);
      const account = findPartnerAccount('PARTNER1@example.com', 's3cret-pw');
      expect(account?.name).toBe('Partner One');
      expect(account?.scope.developers).toEqual(['mountain view']);
    });

    it('rejects a wrong password and unknown email', () => {
      process.env.PARTNER_ACCOUNTS = JSON.stringify([
        { email: 'partner1@example.com', password: 's3cret-pw' },
      ]);
      expect(findPartnerAccount('partner1@example.com', 'wrong')).toBeNull();
      expect(findPartnerAccount('unknown@example.com', 's3cret-pw')).toBeNull();
      expect(findPartnerAccount('', '')).toBeNull();
    });

    it('provisions zero accounts when the env is unset — path closed', () => {
      delete process.env.PARTNER_ACCOUNTS;
      expect(findPartnerAccount('anyone@example.com', 'anything')).toBeNull();
    });
  });

  describe('scopeFromProfile', () => {
    it('reads partner_scope out of profiles.metadata (snake or camel key)', () => {
      expect(scopeFromProfile({ metadata: { partner_scope: { developers: ['Mountain View'] } } })).toEqual({
        developers: ['mountain view'],
        compounds: [],
      });
      expect(scopeFromProfile({ metadata: { partnerScope: { compounds: ['iCity'] } } })).toEqual({
        developers: [],
        compounds: ['icity'],
      });
    });

    it('fail-closes on missing metadata/profile', () => {
      expect(scopeFromProfile(null)).toEqual({ developers: [], compounds: [] });
      expect(scopeFromProfile({})).toEqual({ developers: [], compounds: [] });
      expect(scopeFromProfile({ metadata: {} })).toEqual({ developers: [], compounds: [] });
    });
  });
});
