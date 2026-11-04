import { describe, it, expect, vi } from 'vitest';
import {
  MARKET_BASELINES_2026,
  seedUnifiedMemoryBaselines,
} from '../packages/db/src/unified-memory-seeds';

describe('Unified Memory 2026 Market Baselines & Seeder', () => {
  it('contains genuine 2026 baselines for Hyde Park, Mountain View Hyde Park, and New Cairo', () => {
    expect(MARKET_BASELINES_2026.length).toBeGreaterThanOrEqual(8);

    const hydePark = MARKET_BASELINES_2026.find(
      (b) => b.key === 'market.baseline.2026.hyde_park'
    );
    expect(hydePark).toBeDefined();
    expect(hydePark?.value.compound).toBe('Hyde Park');
    expect(hydePark?.value.year).toBe(2026);
    expect(hydePark?.value.resale.avgPriceSqmEgp).toBe(75000);
    expect(hydePark?.value.capRatePct).toBe(8.5);
    expect(hydePark?.value.rental.rangesByBedrooms['1br']?.avg).toBeGreaterThan(0);
    expect(hydePark?.value.rental.rangesByBedrooms['2br']?.avg).toBeGreaterThan(0);
    expect(hydePark?.value.rental.rangesByBedrooms['3br']?.avg).toBeGreaterThan(0);
    expect(hydePark?.value.historicalPriceTrendVectors.length).toBeGreaterThanOrEqual(4);

    const mvhp = MARKET_BASELINES_2026.find(
      (b) => b.key === 'market.baseline.2026.mountain_view_hyde_park'
    );
    expect(mvhp).toBeDefined();
    expect(mvhp?.value.resale.avgPriceSqmEgp).toBe(82000);
    expect(mvhp?.value.capRatePct).toBe(9.0);

    const mivida = MARKET_BASELINES_2026.find(
      (b) => b.key === 'market.baseline.2026.mivida'
    );
    expect(mivida).toBeDefined();
    expect(mivida?.value.resale.avgPriceSqmEgp).toBe(115000);
    expect(mivida?.value.capRatePct).toBe(8.0);
  });

  it('enforces schema contracts for every baseline record', () => {
    for (const record of MARKET_BASELINES_2026) {
      expect(record.agent_id).toBe('valuation-agent');
      expect(record.category).toBe('market-baseline');
      expect(record.source).toBe('verified-system');
      expect(record.key).toMatch(/^market\.baseline\.2026\./);

      const val = record.value;
      expect(val.year).toBe(2026);
      expect(val.resale.avgPriceSqmEgp).toBeGreaterThan(0);
      expect(val.resale.minPriceSqmEgp).toBeLessThanOrEqual(val.resale.avgPriceSqmEgp);
      expect(val.resale.maxPriceSqmEgp).toBeGreaterThanOrEqual(val.resale.avgPriceSqmEgp);
      expect(val.rental.avgRentMonthlyEgp).toBeGreaterThan(0);
      expect(val.capRatePct).toBeGreaterThan(5.0);
      expect(val.luxuryIndex).toBeGreaterThanOrEqual(1.0);
      expect(val.luxuryIndex).toBeLessThanOrEqual(10.0);
      expect(val.demandScore).toBeGreaterThanOrEqual(1);
      expect(val.demandScore).toBeLessThanOrEqual(100);
      expect(val.historicalPriceTrendVectors.length).toBeGreaterThan(0);
    }
  });

  it('idempotently seeds baselines into public.unified_memory with conflict resolution', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockClient = {
      from: vi.fn(() => ({
        upsert: upsertMock,
      })),
    };

    const res1 = await seedUnifiedMemoryBaselines(mockClient);
    expect(res1.success).toBe(true);
    expect(res1.count).toBe(MARKET_BASELINES_2026.length);
    expect(res1.keys).toContain('market.baseline.2026.hyde_park');
    expect(mockClient.from).toHaveBeenCalledWith('unified_memory');
    expect(upsertMock).toHaveBeenCalledWith(
      expect.any(Array),
      { onConflict: 'agent_id,key' }
    );

    // Second call to verify idempotency
    const res2 = await seedUnifiedMemoryBaselines(mockClient);
    expect(res2.success).toBe(true);
    expect(res2.count).toBe(res1.count);
    expect(res2.keys).toEqual(res1.keys);
  });

  it('handles database errors gracefully and returns error descriptor', async () => {
    const mockError = { message: 'connection refused' };
    const mockClient = {
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      })),
    };

    const res = await seedUnifiedMemoryBaselines(mockClient);
    expect(res.success).toBe(false);
    expect(res.count).toBe(0);
    expect(res.error).toEqual(mockError);
  });
});
