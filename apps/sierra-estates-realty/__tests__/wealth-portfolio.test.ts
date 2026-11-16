jest.mock('@/lib/services/WealthService', () => ({
  WealthService: {
    getCuratedPortfolio: jest.fn(),
  },
}));

import { WealthService } from '@/lib/services/WealthService';
import { GET } from '@/app/api/wealth/portfolio/route';

describe('GET /api/wealth/portfolio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns curated portfolio with default count and undefined market', async () => {
    const portfolio = [{ id: 'unit-1' }];
    (WealthService.getCuratedPortfolio as jest.Mock).mockResolvedValue(portfolio);

    const res = await GET(new Request('http://localhost:3000/api/wealth/portfolio'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(portfolio);
    expect(WealthService.getCuratedPortfolio).toHaveBeenCalledWith(6, null);
  });

  test('passes through query parameters for count and market', async () => {
    (WealthService.getCuratedPortfolio as jest.Mock).mockResolvedValue([]);

    const res = await GET(new Request('http://localhost:3000/api/wealth/portfolio?count=3&market=egypt'));

    expect(res.status).toBe(200);
    expect(WealthService.getCuratedPortfolio).toHaveBeenCalledWith(3, 'egypt');
  });

  test('returns 500 when service throws', async () => {
    (WealthService.getCuratedPortfolio as jest.Mock).mockRejectedValue(new Error('portfolio failure'));

    const res = await GET(new Request('http://localhost:3000/api/wealth/portfolio?count=5'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: 'portfolio failure' });
  });
});
