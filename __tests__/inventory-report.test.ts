import { describe, expect, it } from 'vitest';
import { isRealInventoryListing } from '../packages/agents/tools/reportTools';

describe('Inventory report filtering', () => {
  it('rejects agent task records even when tagged as inventory listings', () => {
    expect(isRealInventoryListing({
      tags: ['inventory-listing', 'task-execution'],
      value: { id: 'agent-task-quality-inspector', output: 'completed' },
    })).toBe(false);
  });

  it('accepts listings with a supported source type', () => {
    expect(isRealInventoryListing({
      tags: ['inventory-listing', 'broker-listing'],
      value: { sourceType: 'broker', compound: 'Mivida' },
    })).toBe(true);
  });

  it('rejects generic memory records without listing fields', () => {
    expect(isRealInventoryListing({
      tags: ['inventory-listing'],
      value: { id: 'system-record', output: 'status' },
    })).toBe(false);
  });
});
