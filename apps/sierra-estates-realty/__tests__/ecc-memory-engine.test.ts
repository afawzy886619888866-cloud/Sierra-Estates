import {
  EpisodicContextCache,
} from '../../../packages/agents/tools/eccMemoryEngine';

describe('Episodic Context Cache (ECC) Memory Engine', () => {
  let ecc: EpisodicContextCache;

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
      expect(session?.activeCompoundFilter).toBe('Mivida');
      expect(session?.activeBudgetMax).toBe(35000000);
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
      expect(entity?.tags).toContain('HOT_DISTRESSED_DEAL');
      expect(entity?.historicalPrices?.length).toBeGreaterThanOrEqual(1);
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
