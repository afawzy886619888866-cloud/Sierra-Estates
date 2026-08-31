import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ObsidianMemory } from '../packages/obsidian/src/index';
import { MemoryEngine } from '../packages/memory-engine/src/memory-engine';

describe('Memory Engine & Episodic Context Cache (ECC) Test Suite', () => {
  const TEST_STORE_PATH = path.resolve(__dirname, 'scratch-obsidian-test.json');

  beforeEach(() => {
    if (fs.existsSync(TEST_STORE_PATH)) {
      fs.unlinkSync(TEST_STORE_PATH);
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_STORE_PATH)) {
      fs.unlinkSync(TEST_STORE_PATH);
    }
  });

  describe('ObsidianMemory Store Operations', () => {
    it('should set, retrieve, and update memory entries with tags', async () => {
      const memory = new ObsidianMemory(TEST_STORE_PATH);

      const entry = await memory.set(
        'client.buyer.karim_mansour',
        {
          name: 'Karim Mansour',
          targetCompound: 'Mivida',
          budgetEgp: 40000000,
          currency: 'EGP',
        },
        ['buyer', 'vip', 'mivida']
      );

      expect(entry).toBeDefined();
      expect(entry.id).toBe('client.buyer.karim_mansour');
      expect(entry.tags).toContain('buyer');

      const retrieved = await memory.get('client.buyer.karim_mansour');
      expect(retrieved).toBeDefined();
      expect(retrieved?.value.budgetEgp).toBe(40000000);
    });

    it('should search entries by keyword and filter by tag', async () => {
      const memory = new ObsidianMemory(TEST_STORE_PATH);

      await memory.set('prop.hyde_park_101', { compound: 'Hyde Park', price: 25000000 }, ['listing', 'resale']);
      await memory.set('prop.mivida_202', { compound: 'Mivida', price: 38000000 }, ['listing', 'primary']);
      await memory.set('lead.ahmed', { name: 'Ahmed', interest: 'Hyde Park' }, ['lead', 'hot']);

      const hydeParkResults = await memory.search('Hyde Park');
      expect(hydeParkResults.length).toBe(2);

      const resaleResults = await memory.searchByTag('resale');
      expect(resaleResults.length).toBe(1);
      expect(resaleResults[0].id).toBe('prop.hyde_park_101');
    });

    it('should delete memory entries', async () => {
      const memory = new ObsidianMemory(TEST_STORE_PATH);
      await memory.set('temp.entry', { temp: true }, ['temporary']);

      const deleted = await memory.delete('temp.entry');
      expect(deleted).toBe(true);

      const check = await memory.get('temp.entry');
      expect(check).toBeNull();
    });
  });

  describe('MemoryEngine Central Intelligence Management', () => {
    it('should manage agent contexts and broadcast update events', () => {
      const engine = new MemoryEngine({ persistenceLayer: 'memory' });
      let eventPayload: any = null;

      engine.subscribe('context:updated', (payload) => {
        eventPayload = payload;
      });

      engine.updateContext('agent-closer', {
        activeLeadId: 'lead-991',
        negotiationStage: 'counter_offer',
        lastSpreadPercent: 4.5,
      });

      const context = engine.getContext('agent-closer');
      expect(context).toBeDefined();
      expect(context?.activeLeadId).toBe('lead-991');
      expect(eventPayload).toBeDefined();
      expect(eventPayload.agentId).toBe('agent-closer');
    });

    it('should register skills and maintain agent profiles', () => {
      const engine = new MemoryEngine({ persistenceLayer: 'memory' });

      engine.registerSkill({
        id: 'valuation-arbitrage-analyzer',
        name: 'Valuation Arbitrage Analyzer',
        description: 'Computes real estate cap rates and spread arbitrage in Cairo',
        applicableWhen: (ctx) => Boolean(ctx.propertyPrice),
      });

      const skill = engine.loadSkill('valuation-arbitrage-analyzer');
      expect(skill).toBeDefined();
      expect(skill?.id).toBe('valuation-arbitrage-analyzer');

      const applicable = engine.getApplicableSkills({ propertyPrice: 30000000 });
      expect(applicable.some((s) => s.id === 'valuation-arbitrage-analyzer')).toBe(true);
    });


    it('should merge multiple context dictionaries accurately', () => {
      const engine = new MemoryEngine();
      const ctxA = { leadName: 'Tarek', budget: 50000000 };
      const ctxB = { preferredLocation: 'Palm Hills', verified: true };

      const merged = engine.mergeContext(ctxA, ctxB);
      expect(merged.leadName).toBe('Tarek');
      expect(merged.preferredLocation).toBe('Palm Hills');
      expect(merged.verified).toBe(true);
    });
  });
});
