import { describe, it, expect, vi } from 'vitest';
import {
  filterByTimeRange, filterByPrice, filterByDirectFlight,
  filterByBudgetAirline, BUDGET_AIRLINES, scanRoute, scanAllRoutes,
} from '../../src/scanner/scanner.js';
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

describe('filterByDirectFlight', () => {
  it('stops=0 的航班通過', () => {
    const offers = [makeOffer({ stops: 0 }), makeOffer({ stops: 0 })];
    expect(filterByDirectFlight(offers)).toHaveLength(2);
  });

  it('stops>0 的航班排除', () => {
    const offers = [makeOffer({ stops: 1 }), makeOffer({ stops: 2 })];
    expect(filterByDirectFlight(offers)).toHaveLength(0);
  });

  it('混合直飛與轉機時只留直飛', () => {
    const offers = [makeOffer({ stops: 0 }), makeOffer({ stops: 1 }), makeOffer({ stops: 0 })];
    expect(filterByDirectFlight(offers)).toHaveLength(2);
  });
});

describe('filterByBudgetAirline', () => {
  it('廉價航空（IT=虎航）通過', () => {
    expect(filterByBudgetAirline([makeOffer({ airline: 'IT' })])).toHaveLength(1);
  });

  it('全服務航空（CI=華航）排除', () => {
    expect(filterByBudgetAirline([makeOffer({ airline: 'CI' })])).toHaveLength(0);
  });

  it('混合時只留廉價航空', () => {
    const offers = [
      makeOffer({ airline: 'IT' }), // 虎航 LCC
      makeOffer({ airline: 'CI' }), // 華航 FSC
      makeOffer({ airline: 'MM' }), // 樂桃 LCC
      makeOffer({ airline: 'BR' }), // 長榮 FSC
    ];
    const result = filterByBudgetAirline(offers);
    expect(result).toHaveLength(2);
    expect(result.map((o) => o.airline)).toEqual(['IT', 'MM']);
  });

  it('BUDGET_AIRLINES 包含虎航(IT)、樂桃(MM)、酷航(TR)、捷星日本(GK)', () => {
    expect(BUDGET_AIRLINES.has('IT')).toBe(true);
    expect(BUDGET_AIRLINES.has('MM')).toBe(true);
    expect(BUDGET_AIRLINES.has('TR')).toBe(true);
    expect(BUDGET_AIRLINES.has('GK')).toBe(true);
  });

  it('BUDGET_AIRLINES 不包含全服務航空(CI、BR、JL、NH)', () => {
    expect(BUDGET_AIRLINES.has('CI')).toBe(false);
    expect(BUDGET_AIRLINES.has('BR')).toBe(false);
    expect(BUDGET_AIRLINES.has('JL')).toBe(false);
    expect(BUDGET_AIRLINES.has('NH')).toBe(false);
  });
});

describe('budgetAirlineOnly 在 scanRoute 整合', () => {
  it('budgetAirlineOnly:true 時排除全服務航空', async () => {
    const mockProvider = {
      search: vi.fn().mockResolvedValue([
        makeOffer({ airline: 'IT', totalPriceTWD: 20000 }), // LCC
        makeOffer({ airline: 'CI', totalPriceTWD: 18000 }), // FSC，雖便宜但被排除
      ]),
    };
    const route = { ...baseRoute, budgetAirlineOnly: true };
    const result = await scanRoute(route, [mockProvider], { adults: 2, children: 1 });
    expect(result.cheapOffers).toHaveLength(1);
    expect(result.cheapOffers[0]!.airline).toBe('IT');
    expect(result.lowestPrice).toBe(20000); // CI 18000 被過濾，IT 20000 才是最低
  });

  it('budgetAirlineOnly:false 時全服務航空保留', async () => {
    const mockProvider = {
      search: vi.fn().mockResolvedValue([
        makeOffer({ airline: 'IT', totalPriceTWD: 20000 }),
        makeOffer({ airline: 'CI', totalPriceTWD: 18000 }),
      ]),
    };
    const result = await scanRoute(baseRoute, [mockProvider], { adults: 2, children: 1 });
    expect(result.cheapOffers).toHaveLength(2);
    expect(result.lowestPrice).toBe(18000);
  });
});

describe('directFlightOnly 在 scanRoute 整合', () => {
  it('directFlightOnly:true 時排除轉機航班', async () => {
    const mockProvider = {
      search: vi.fn().mockResolvedValue([
        makeOffer({ stops: 0, totalPriceTWD: 20000 }),
        makeOffer({ stops: 1, totalPriceTWD: 15000 }),
      ]),
    };
    const route = { ...baseRoute, directFlightOnly: true };
    const result = await scanRoute(route, [mockProvider], { adults: 2, children: 1 });
    expect(result.cheapOffers).toHaveLength(1);
    expect(result.cheapOffers[0]!.stops).toBe(0);
    expect(result.lowestPrice).toBe(20000); // 轉機15000被排除，直飛20000才是最低
  });

  it('directFlightOnly:false 時轉機航班保留', async () => {
    const mockProvider = {
      search: vi.fn().mockResolvedValue([
        makeOffer({ stops: 0, totalPriceTWD: 20000 }),
        makeOffer({ stops: 1, totalPriceTWD: 15000 }),
      ]),
    };
    const result = await scanRoute(baseRoute, [mockProvider], { adults: 2, children: 1 });
    expect(result.cheapOffers).toHaveLength(2);
    expect(result.lowestPrice).toBe(15000);
  });

  it('per-route passengers 覆蓋全域設定', async () => {
    const mockProvider = { search: vi.fn().mockResolvedValue([]) };
    const route = { ...baseRoute, passengers: { adults: 1, children: 0 } };
    await scanRoute(route, [mockProvider], { adults: 2, children: 1 });
    expect(mockProvider.search).toHaveBeenCalledWith(route, { adults: 1, children: 0 });
  });

  it('未設 per-route passengers 時使用全域', async () => {
    const mockProvider = { search: vi.fn().mockResolvedValue([]) };
    await scanRoute(baseRoute, [mockProvider], { adults: 3, children: 2 });
    expect(mockProvider.search).toHaveBeenCalledWith(baseRoute, { adults: 3, children: 2 });
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
