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

  describe('4. Extended Episode Types & AI Deal Lifecycle', () => {
    it('records AI counter-offer and tags entity with ACTIVE_NEGOTIATION', () => {
      const res = ecc.trackAiCounterOffer(
        'buyer-01032206443',
        30000000,
        32500000,
        'Market comps in Mivida show 33M minimum for this layout',
        'Sierra Closer Agent'
      );

      expect(res.episode.type).toBe('ai_counter_offer');
      expect(res.concessionPct).toBeCloseTo(8.33, 1);
      expect(res.episode.data.counterOffer).toBe(32500000);

      const entity = ecc.getEntity('buyer-01032206443');
      expect(entity?.tags).toContain('ACTIVE_NEGOTIATION');
    });

    it('tracks deal stage transitions and closes deal', () => {
      const epContract = ecc.trackDealStage('deal-9901', 'contract', 'Drafted bilingual sales contract');
      expect(epContract.type).toBe('contract_stage');
      expect(epContract.data.stage).toBe('contract');

      const epClosed = ecc.trackDealStage('deal-9901', 'closed', 'Funds settled in escrow and keys handed over');
      expect(epClosed.type).toBe('deal_closed');

      const entity = ecc.getEntity('deal-9901');
      expect(entity?.tags).toContain('DEAL_CLOSED');
    });

    it('scores leads and updates VIP tags', () => {
      const ep = ecc.recordLeadScoring('buyer-01099998888', 92, 'vip', {
        budgetConfirmed: true,
        urgencyDays: 7,
      });

      expect(ep.type).toBe('lead_scored');
      expect(ep.data.score).toBe(92);
      expect(ep.data.category).toBe('vip');

      const entity = ecc.getEntity('buyer-01099998888');
      expect(entity?.tags).toContain('LEAD_VIP');
    });
  });

  describe('5. Supabase Authoritative Cloud Sync', () => {
    it('syncs episode and entity to Supabase with mock client', async () => {
      const upsertedRows: any[] = [];
      const mockClient = {
        from: (table: string) => ({
          upsert: async (row: any) => {
            upsertedRows.push({ table, ...row });
            return { data: row, error: null };
          },
        }),
      };

      const ep = ecc.recordEpisode({
        type: 'price_drop',
        entityId: 'SE-TEST-001',
        actor: 'Broker Test',
        summary: 'Test drop',
        data: { dropAmount: 500000 },
      });

      const epOk = await ecc.syncEpisodeToSupabase(ep, mockClient);
      expect(epOk).toBe(true);
      expect(upsertedRows.some((r) => r.key === `ecc:episode:${ep.id}`)).toBe(true);

      const ent = ecc.upsertEntity({
        id: 'owner-test-1',
        type: 'owner',
        tags: ['VERIFIED_OWNER'],
        lastUpdated: new Date().toISOString(),
      });

      const entOk = await ecc.syncEntityToSupabase(ent, mockClient);
      expect(entOk).toBe(true);
      expect(upsertedRows.some((r) => r.key === 'ecc:entity:owner-test-1')).toBe(true);
    });

    it('batches sync to Supabase and reports statistics', async () => {
      let upsertCount = 0;
      const mockClient = {
        from: () => ({
          upsert: async () => {
            upsertCount++;
            return { data: {}, error: null };
          },
        }),
      };

      const res = await ecc.syncToSupabase({ client: mockClient });
      expect(res.success).toBe(true);
      expect(res.syncedEpisodes).toBeGreaterThanOrEqual(1);
      expect(res.syncedEntities).toBeGreaterThanOrEqual(1);
      expect(upsertCount).toBeGreaterThanOrEqual(2);
    });

    it('hydrates episodes and entities from Supabase', async () => {
      const mockClient = {
        from: (table: string) => ({
          select: () => ({
            eq: (col: string, val: string) => {
              if (val === 'ecc-memory-engine') {
                return {
                  order: () => ({
                    limit: async () => ({
                      data: [
                        {
                          value: {
                            id: 'cloud-ep-1',
                            type: 'price_drop',
                            entityId: 'SE-CLOUD-101',
                            actor: 'Cloud Bot',
                            timestamp: new Date().toISOString(),
                            summary: 'Cloud synced drop',
                            data: { dropAmount: 1000000 },
                          },
                        },
                      ],
                      error: null,
                    }),
                  }),
                };
              }
              // ecc-entity-graph
              return {
                limit: async () => ({
                  data: [
                    {
                      value: {
                        id: 'cloud-buyer-99',
                        type: 'buyer',
                        name: 'Cloud Investor',
                        tags: ['INSTITUTIONAL'],
                        lastUpdated: new Date().toISOString(),
                      },
                    },
                  ],
                  error: null,
                }),
              };
            },
          }),
        }),
      };

      const freshEcc = new EpisodicContextCache();
      const loadRes = await freshEcc.loadFromSupabase({ client: mockClient });
      expect(loadRes.success).toBe(true);
      expect(freshEcc.getEpisodesForEntity('SE-CLOUD-101').length).toBe(1);
      expect(freshEcc.getEntity('cloud-buyer-99')?.name).toBe('Cloud Investor');
    });

    it('fails closed gracefully when Supabase is not configured', async () => {
      const freshEcc = new EpisodicContextCache();
      // No client passed and in test environment without admin key
      const syncRes = await freshEcc.syncToSupabase();
      expect(syncRes.success).toBe(false);

      const loadRes = await freshEcc.loadFromSupabase();
      expect(loadRes.success).toBe(false);
    });
  });
});
