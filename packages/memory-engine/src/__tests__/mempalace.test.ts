import { MemoryPalace, mempalace } from '../mempalace';

describe('MemoryPalace (mempalace) Vector Memory Engine', () => {
  it('should store and query memories correctly', () => {
    const palace = new MemoryPalace();
    palace.store({
      id: 'test-1',
      room: 'listings',
      drawer: 'properties',
      content: 'Luxury villa in Palm Hills New Cairo with 4 bedrooms',
      timestamp: new Date().toISOString(),
    });

    const results = palace.search({ room: 'listings', keyword: 'Palm Hills' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].entry.content).toContain('Palm Hills');
  });

  it('should list memories by room', () => {
    const results = mempalace.listRoom('system');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].room).toBe('system');
  });
});
