import { describe, it, expect, vi } from 'vitest';
import { filterByTimeRange, filterByPrice, scanRoute, scanAllRoutes } from '../../src/scanner/scanner.js';
import type { FlightOffer } from '../../src/providers/types.js';
import type { RouteConfig } from '../../src/config.js';

const makeOffer = (overrides: Partial<FlightOffer> = {}): FlightOffer => ({
  source: 'amadeus',
  origin: 'TPE',
  destination: 'NRT',
  departureDate: '2026-04-01',
  departureTime: '09:00',
  arrivalTime: '13:00',
  airline: 'IT',
  flightNumber: 'IT201',
  stops: 0,
  totalPriceTWD: 20000,
  currency: 'TWD',
  bookingUrl: 'https://example.com',
  ...overrides,
});

const baseRoute: RouteConfig = {
  origin: 'TPE',
  destination: 'NRT',
  enabled: true,
  priceThreshold: 25000,
  dateRange: { start: '2026-04-01', end: '2026-06-30' },
};

describe('Story 2.3: Scanner - filterByTimeRange', () => {
  it('未設定 timeRange 時，全部通過', () => {
    const offers = [makeOffer({ departureTime: '03:00' })];
    expect(filterByTimeRange(offers, baseRoute)).toHaveLength(1);
  });

  it('出發時間在 departureTimeRange 內 → 通過', () => {
    const route = { ...baseRoute, departureTimeRange: { earliest: '06:00', latest: '22:00' } };
    const offers = [makeOffer({ departureTime: '09:00' }), makeOffer({ departureTime: '14:30' })];
    expect(filterByTimeRange(offers, route)).toHaveLength(2);
  });

  it('出發時間不在 departureTimeRange 內 → 排除', () => {
    const route = { ...baseRoute, departureTimeRange: { earliest: '06:00', latest: '22:00' } };
    const offers = [makeOffer({ departureTime: '02:00' }), makeOffer({ departureTime: '23:30' })];
    expect(filterByTimeRange(offers, route)).toHaveLength(0);
  });

  it('到達時間不在 arrivalTimeRange 內 → 排除', () => {
    const route = { ...baseRoute, arrivalTimeRange: { earliest: '10:00', latest: '20:00' } };
    const offers = [makeOffer({ arrivalTime: '08:00' }), makeOffer({ arrivalTime: '21:30' })];
    expect(filterByTimeRange(offers, route)).toHaveLength(0);
  });

  it('departureTimeRange 和 arrivalTimeRange 都符合 → 通過', () => {
    const route = {
      ...baseRoute,
      departureTimeRange: { earliest: '06:00', latest: '22:00' },
      arrivalTimeRange: { earliest: '10:00', latest: '20:00' },
    };
    const offers = [makeOffer({ departureTime: '09:00', arrivalTime: '13:00' })];
    expect(filterByTimeRange(offers, route)).toHaveLength(1);
  });
});

describe('Story 2.3: Scanner - filterByPrice', () => {
  it('低於門檻的航班通過', () => {
    const offers = [makeOffer({ totalPriceTWD: 20000 })];
    expect(filterByPrice(offers, 25000)).toHaveLength(1);
  });

  it('等於門檻的航班通過', () => {
    const offers = [makeOffer({ totalPriceTWD: 25000 })];
    expect(filterByPrice(offers, 25000)).toHaveLength(1);
  });

  it('高於門檻的航班排除', () => {
    const offers = [makeOffer({ totalPriceTWD: 26000 })];
    expect(filterByPrice(offers, 25000)).toHaveLength(0);
  });

  it('混合多筆時正確過濾', () => {
    const offers = [
      makeOffer({ totalPriceTWD: 20000 }),
      makeOffer({ totalPriceTWD: 25000 }),
      makeOffer({ totalPriceTWD: 30000 }),
    ];
    expect(filterByPrice(offers, 25000)).toHaveLength(2);
  });
});

describe('Story 2.3: Scanner - scanRoute', () => {
  it('回傳 cheapOffers 和 lowestPrice', async () => {
    const mockProvider = {
      search: vi.fn().mockResolvedValue([
        makeOffer({ totalPriceTWD: 20000 }),
        makeOffer({ totalPriceTWD: 30000 }),
      ]),
    };

    const result = await scanRoute(baseRoute, [mockProvider], { adults: 2, children: 1 });

    expect(result.cheapOffers).toHaveLength(1);
    expect(result.cheapOffers[0]!.totalPriceTWD).toBe(20000);
    expect(result.lowestPrice).toBe(20000);
  });

  it('Provider 失敗不 throw，回傳空結果', async () => {
    const failingProvider = {
      search: vi.fn().mockRejectedValue(new Error('network error')),
    };
    const result = await scanRoute(baseRoute, [failingProvider], { adults: 2, children: 1 });
    expect(result.cheapOffers).toHaveLength(0);
    expect(result.lowestPrice).toBeNull();
  });

  it('route key 格式為 origin-destination', async () => {
    const mockProvider = { search: vi.fn().mockResolvedValue([]) };
    const result = await scanRoute(baseRoute, [mockProvider], { adults: 2, children: 1 });
    expect(result.route).toBe('TPE-NRT');
  });
});

describe('Story 2.3: Scanner - scanAllRoutes', () => {
  it('只掃描 enabled: true 的航線', async () => {
    const searchMock = vi.fn().mockResolvedValue([]);
    const mockProvider = { search: searchMock };
    const routes: RouteConfig[] = [
      { ...baseRoute, destination: 'NRT', enabled: true },
      { ...baseRoute, destination: 'KIX', enabled: false },
      { ...baseRoute, destination: 'FUK', enabled: true },
    ];

    const results = await scanAllRoutes(routes, [mockProvider], { adults: 2, children: 1 });
    expect(results).toHaveLength(2);
    expect(results[0]!.route).toBe('TPE-NRT');
    expect(results[1]!.route).toBe('TPE-FUK');
  });

  it('一條航線 Provider 失敗，該航線回傳空結果，其他航線正常完成', async () => {
    const searchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('route 1 fail'))
      .mockResolvedValueOnce([makeOffer({ destination: 'KIX', totalPriceTWD: 18000 })]);

    const mockProvider = { search: searchMock };
    const routes: RouteConfig[] = [
      { ...baseRoute, destination: 'NRT', priceThreshold: 25000 },
      { ...baseRoute, destination: 'KIX', priceThreshold: 22000 },
    ];

    const results = await scanAllRoutes(routes, [mockProvider], { adults: 2, children: 1 });
    // 兩條航線都完成（失敗的回傳空結果，不中斷流程）
    expect(results).toHaveLength(2);
    const nrt = results.find((r) => r.route === 'TPE-NRT');
    const kix = results.find((r) => r.route === 'TPE-KIX');
    expect(nrt!.cheapOffers).toHaveLength(0);  // 失敗 → 空
    expect(kix!.cheapOffers).toHaveLength(1);  // 成功 → 有資料
  });

  it('API 呼叫數等於啟用航線數', async () => {
    const searchMock = vi.fn().mockResolvedValue([]);
    const mockProvider = { search: searchMock };
    const routes: RouteConfig[] = [
      { ...baseRoute, destination: 'NRT', enabled: true },
      { ...baseRoute, destination: 'KIX', enabled: true },
      { ...baseRoute, destination: 'FUK', enabled: false },
    ];

    await scanAllRoutes(routes, [mockProvider], { adults: 2, children: 1 });
    expect(searchMock).toHaveBeenCalledTimes(2);
  });
});
