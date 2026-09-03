 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import {
  EpisodicContextCache,
} from '../../../packages/agents/tools/eccMemoryEngine';

describe('Episodic Context Cache (ECC) Memory Engine', () => {
  let ecc;

  beforeEach(() => {
    ecc = new EpisodicContextCache();
  });

  describe('1. Working Memory (Hot Session Cache)', () => {
    it('stores and retrieves an active working session', () => {
      ecc.setWorkingSession({
        sessionId: 'session-wa-101',
        userId: 'buyer-tarek',
        activeCompoundFilter: 'Mivida',
        activeBudgetMax: 35000000,
        lastInteraction: Date.now(),
        ephemeralData: { lastQuestion: 'Is delivery immediate?' },
      });

      const session = ecc.getWorkingSession('session-wa-101');
      expect(session).not.toBeNull();
      expect(_optionalChain([session, 'optionalAccess', _ => _.activeCompoundFilter])).toBe('Mivida');
      expect(_optionalChain([session, 'optionalAccess', _2 => _2.activeBudgetMax])).toBe(35000000);
    });

    it('returns null for expired sessions exceeding TTL', () => {
      ecc.setWorkingSession({
        sessionId: 'session-expired',
        userId: 'buyer-expired',
        lastInteraction: Date.now() - 60000, // 1 minute ago
        ephemeralData: {},
      });

      const session = ecc.getWorkingSession('session-expired', 1000); // 1s TTL
      expect(session).toBeNull();
    });
  });

  describe('2. Episodic Memory Journal & Price Drop Tracking', () => {
    it('records an episodic event and attaches it to the entity timeline', () => {
      const ep = ecc.recordEpisode({
        type: 'negotiation_offer',
        entityId: 'SE-MV-401',
        actor: 'Buyer Karim',
        summary: 'Offered 32M cash with 10% down payment',
        data: { offeredAmount: 32000000, paymentTerms: 'cash' },
      });

      expect(ep.id).toBeDefined();
      expect(ep.type).toBe('negotiation_offer');

      const episodes = ecc.getEpisodesForEntity('SE-MV-401');
      expect(episodes.length).toBeGreaterThanOrEqual(1);
      expect(episodes[0].actor).toBe('Buyer Karim');
    });

    it('tracks price reduction and triggers hot deal alert when drop >= 8%', () => {
      const result = ecc.trackPriceReduction(
        'SE-MV-401',
        40000000,
        36000000, // 4M drop = 10%
        'WhatsApp Group #4 (Owners Direct)',
        'Owner Ahmed'
      );

      expect(result.dropPct).toBe(10);
      expect(result.isHotDeal).toBe(true);
      expect(result.episode.data.isHotDeal).toBe(true);

      const entity = ecc.getEntity('SE-MV-401');
      expect(_optionalChain([entity, 'optionalAccess', _3 => _3.tags])).toContain('HOT_DISTRESSED_DEAL');
      expect(_optionalChain([entity, 'optionalAccess', _4 => _4.historicalPrices, 'optionalAccess', _5 => _5.length])).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. Semantic Entity Graph & Matchmaking', () => {
    it('upserts buyer entity profile and matches against new property drop', () => {
      ecc.upsertEntity({
        id: 'buyer-01032206443',
        type: 'buyer',
        name: 'Tarek Al-Sayed',
        compound: 'Mivida',
        targetPropertyType: 'Villa',
        budgetRange: { min: 25000000, max: 40000000 },
        tags: ['VIP_CASH_BUYER'],
        lastUpdated: new Date().toISOString(),
      });

      const matchingBuyers = ecc.findMatchingBuyers({
        compound: 'Mivida',
        propertyType: 'Villa',
        price: 37000000,
      });

      expect(matchingBuyers.length).toBeGreaterThanOrEqual(1);
      expect(matchingBuyers[0].name).toBe('Tarek Al-Sayed');
    });
  });
});
